// Responsibilities 区块投影（Settings sheet「看得见她在替我盯哪些事」）：纯函数，
// 不改 state、不触网、不复制 canonical 存储。只做筛选/排序/状态着色派生。
import type { AssignmentHistoryItem, AssignmentRecord, ProposalRow } from "./client";

/** 区块状态色：active → success；proposed → warning。
 * revoked 在数据层就被排除（历史去详情页看），故不出现 idle 分支。 */
export type ResponsibilityTone = "success" | "warning";

export interface ResponsibilityRow {
  /** 稳定 key（asg_ / prp_ 前缀本身已唯一，可直接用作 React key） */
  id: string;
  kind: "assignment" | "proposal";
  /** 责任原文，**原样透传不翻译**（可能中英混排） */
  responsibility: string;
  tone: ResponsibilityTone;
  /** 上次「真的执行过」的时刻（epoch ms）；没有执行记录时 null */
  lastRunAt: number | null;
}

/** 最近一次执行时刻：只认 `assignment.trigger.fired`（activated/revoked 不是执行）。 */
export function lastRunOf(history: AssignmentHistoryItem[]): number | null {
  let latest: number | null = null;
  for (const item of history) {
    if (item.type !== "assignment.trigger.fired") continue;
    if (latest === null || item.occurredAt > latest) latest = item.occurredAt;
  }
  return latest;
}

type TimedRow = { row: ResponsibilityRow; at: number };

const newestFirst = (rows: TimedRow[]): ResponsibilityRow[] =>
  [...rows].sort((x, y) => y.at - x.at).map((r) => r.row);

/**
 * 只保留 active assignment + proposed proposal（revoked/completed/已决议提案不进本区块）。
 * 顺序：生效中的在前（activatedAt 新的在上），待确认的在后（createdAt 新的在上）。
 */
export function buildResponsibilities(
  assignments: AssignmentRecord[],
  proposals: ProposalRow[],
  lastRunByAssignment: Record<string, number | null> = {},
): ResponsibilityRow[] {
  const active: TimedRow[] = assignments
    .filter((a) => a.state === "active")
    .map((a) => ({
      at: a.activatedAt,
      row: {
        id: a.id,
        kind: "assignment" as const,
        responsibility: a.responsibility,
        tone: "success" as const,
        lastRunAt: lastRunByAssignment[a.id] ?? null,
      },
    }));

  const proposed: TimedRow[] = proposals
    .filter((p) => p.status === "proposed")
    .map((p) => ({
      at: p.createdAt,
      row: {
        id: p.id,
        kind: "proposal" as const,
        responsibility: p.responsibility,
        tone: "warning" as const,
        lastRunAt: null,
      },
    }));

  return [...newestFirst(active), ...newestFirst(proposed)];
}
