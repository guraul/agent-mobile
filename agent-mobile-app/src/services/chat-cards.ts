// 聊天内卡片数据构建（epic #35 / #30，chat-widgets.html Duties/Projects 卡）：
// 触发 = 斜杠命令（/assignments → Duties 卡；/projects → Projects 卡，客户端拦截，
// 不进 agent）。本模块只做「数据 → 卡片行」的纯映射，抓取在 ChatPanelZ 做。
// 红线：纯函数、零 RN 依赖、可单测；状态语义复用 assignment/projection 的分组投影
//（Active / Failed(repairRequest) / Missed(pendingCompensation→attention)），不自造口径。

import type { AssignmentRecord } from "./assignment/client";
import {
  buildAssignmentGroups,
  formatRelative,
} from "./assignment/projection";
import type { AttentionItem } from "./attention/store";
import { MARKET_TALK_DIRECTORY } from "./conversation-kind";

export type DutyPill = "Active" | "Failed" | "Missed";
export type DutyAction = "revoke" | "retry" | "run-now" | "skip";

export interface DutyRow {
  id: string;
  name: string;
  meta: string | null;
  pill: DutyPill;
  /** 该行可用的动作（由 pill 语义决定，渲染层按此出按钮） */
  actions: DutyAction[];
  /** 动作进行中（渲染层禁用按钮） */
  busy?: boolean;
}

export interface ProjectRow {
  path: string;
  name: string;
  running: boolean;
  meta: string | null;
}

/**
 * Duties 卡行：active assignments（含 needs-attention 投影）。
 * - attention + repairRequest → Failed（Retry = repair）
 * - attention（其余，即 missed one-shot 待补偿）→ Missed（Run now / Skip = compensate）
 * - 其余 active → Active（Revoke）
 */
export function buildDutyRows(
  assignments: AssignmentRecord[],
  attentions: AttentionItem[],
  now: number = Date.now(),
): DutyRow[] {
  const groups = buildAssignmentGroups(assignments, attentions);
  const rows: DutyRow[] = [];
  for (const group of groups) {
    for (const item of group.items) {
      const a = item.assignment;
      if (group.key === "needs-attention") {
        const repair = item.attention?.provenance?.repairRequest === true;
        if (repair) {
          rows.push({ id: a.id, name: a.responsibility, meta: item.triggerLabel, pill: "Failed", actions: ["retry"] });
        } else {
          const pending = a.provenance.pendingCompensation;
          const meta = pending?.occurrenceAt ? `missed ${formatRelative(pending.occurrenceAt, now)}` : item.triggerLabel;
          rows.push({ id: a.id, name: a.responsibility, meta, pill: "Missed", actions: ["run-now", "skip"] });
        }
        continue;
      }
      if (group.key === "active") {
        const meta = item.nextExecutionLabel
          ? `${item.triggerLabel} · next ${item.nextExecutionLabel}`
          : item.triggerLabel;
        rows.push({ id: a.id, name: a.responsibility, meta, pill: "Active", actions: ["revoke"] });
      }
      // completed / revoked 不进 Duties 卡（卡片回答"正在帮我看了哪些"）
    }
  }
  return rows;
}

/**
 * Projects 卡行：全量 session 目录去重（market 工作区与根目录除外——market 属伴侣聊天，
 * 不进工作台导航），running（busy/retry）在前，其余按最近活动排序。
 */
export function buildProjectRows(
  sessions: { directory?: string; time?: { updated?: number } }[],
  status: Record<string, "busy" | "retry" | "idle">,
  now: number = Date.now(),
): ProjectRow[] {
  const byDir = new Map<string, number>();
  for (const s of sessions) {
    const dir = (s.directory ?? "").trim();
    if (!dir || dir === "/" || dir === MARKET_TALK_DIRECTORY) continue;
    const updated = s.time?.updated ?? 0;
    byDir.set(dir, Math.max(byDir.get(dir) ?? 0, updated));
  }
  const rows: ProjectRow[] = [];
  for (const [dir, updated] of byDir) {
    const running = status[dir] === "busy" || status[dir] === "retry";
    const name = dir.split("/").filter(Boolean).pop() ?? dir;
    const meta = updated
      ? `${running ? "Running" : "Idle"} · last activity ${formatRelative(updated, now)}`
      : running
        ? "Running"
        : "Idle";
    rows.push({ path: dir, name, running, meta });
  }
  rows.sort((x, y) => {
    if (x.running !== y.running) return x.running ? -1 : 1;
    return (byDir.get(y.path) ?? 0) - (byDir.get(x.path) ?? 0);
  });
  return rows;
}
