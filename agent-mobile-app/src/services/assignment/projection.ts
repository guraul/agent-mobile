// Assignment projection（Phase 9，Part 1）：Assignment/Attention canonical → 用户友好视图模型的纯函数层。
// 不做任何 state 变更、不触网、不复制 canonical 存储。只做分组/描述/授权标签/下一执行等派生。
import type { AssignmentRecord } from "./client";
import type { AttentionItem } from "../attention/store";

export type AssignmentGroupKey = "needs-attention" | "active" | "completed" | "revoked";

export interface AssignmentGroupItem {
  assignment: AssignmentRecord;
  /** needs-attention：该 assignment 对应的 open Attention（repair/compensation 类） */
  attention?: AttentionItem;
  triggerLabel: string;
  authorizationLabel: string;
  nextExecutionLabel: string | null;
  statusPill: string;
  statusTone: "error" | "warning" | "success" | "idle";
}

export interface AssignmentGroup {
  key: AssignmentGroupKey;
  label: string;
  items: AssignmentGroupItem[];
}

// ── cron → 人话（无外部依赖；仅支持本项目使用的 5 段 cron `min hour * * dow`）──

const WEEKDAYS: Record<string, string> = {
  "1": "Monday", "2": "Tuesday", "3": "Wednesday", "4": "Thursday",
  "5": "Friday", "6": "Saturday", "7": "Sunday", "0": "Sunday",
};

export function describeTrigger(schedule: string): string {
  const parts = schedule.trim().split(/\s+/);
  if (parts.length < 5) return schedule;
  const [, hour, , , dow] = parts;
  const min = Number(parts[0]);
  const hh = hour.padStart(2, "0");
  const mm = String(min).padStart(2, "0");
  const time = `${hh}:${mm}`;
  if (dow === "*" || dow === "?" || dow === "0-6") return `Every day ${time}`;
  if (dow === "1-5") return `Every weekday ${time}`;
  if (dow === "6,0" || dow === "0,6" || dow === "6-7" || dow === "SAT,SUN") return `Every weekend ${time}`;
  const days = dow.split(",").map((d) => WEEKDAYS[d.trim()] ?? d).filter(Boolean);
  if (days.length > 0) return `${days.join(", ")} ${time}`;
  return schedule;
}

// ── 授权标签（读 authorizationRef + provenance，不复制数据）──

export function authorizationLabel(a: AssignmentRecord): string {
  const ref = a.authorizationRef ?? "";
  const prov = a.provenance ?? {};
  if (prov.migratedFrom || ref.startsWith("legacy-seed:")) return "Legacy migration";
  if (ref.startsWith("confirmation:")) return "User confirmed";
  if (ref.startsWith("direct-activation")) return "Direct activation (explicit instruction)";
  if (prov.createdBy === "assignment-service" || ref) return "User instruction";
  return "Authorization on record";
}

// ── Phase 13：Proposal → Suggestion 的确定性文案（纯展示；PHASE13_DESIGN §4.2/§8.2）──

/** "为什么建议"：observation 来源 → 与相邻 Noticed 卡同族的确定性模板；talk/api 来源 → null（无需 why） */
export function observationReasonLabel(createdBy: unknown): string | null {
  if (typeof createdBy === "string" && createdBy.startsWith("observation:")) {
    return "基于近期行情观察（连续 3 个评估点净值走低）";
  }
  return null;
}

/** "确认后会发生什么"：triggerLabel 派生的效果句 + 撤销出口提示（PM §11：Revocation 永远可用） */
export function describeProposalEffect(td: { schedule: string; condition: Record<string, unknown> }): string {
  const trigger = describeTrigger(td.schedule);
  const action = td.condition?.kind === "always" ? "到点提醒你" : "命中条件时提醒你";
  return `确认后：${trigger} 自动评估，${action}；可随时在 Responsibilities 中撤销。`;
}

// ── 下一执行时刻（next cron occurrence；无外部依赖的简单滚动计算）──

/**
 * 计算 cron 的下一次 occurrence（仅支持 `min hour * * dow` 5 段；dow 支持 * / 1-5 / 0-7）。
 * 在 now 之后的下一个匹配分钟。用于显示 "Next execution"（纯展示，不参与调度）。
 */
export function nextExecutionOf(schedule: string, from: number = Date.now()): number | null {
  const parts = schedule.trim().split(/\s+/);
  if (parts.length < 5) return null;
  const min = Number(parts[0]);
  const hour = Number(parts[1]);
  if (!Number.isFinite(min) || !Number.isFinite(hour)) return null;
  const dowSpec = parts[4];
  const fromDate = new Date(from + 8 * 3600 * 1000); // Asia/Shanghai naive
  for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
    const d = new Date(fromDate);
    d.setDate(fromDate.getDate() + dayOffset);
    const dow = d.getUTCDay(); // 用 UTC 读（d 已带 +8，getUTCDay 即上海周几）
    if (!dowMatches(dow, dowSpec)) continue;
    const candidate = new Date(d);
    candidate.setUTCHours(hour, min, 0, 0);
    if (candidate.getTime() > fromDate.getTime()) {
      return candidate.getTime() - 8 * 3600 * 1000; // 回退到真实 epoch
    }
  }
  return null;
}

function dowMatches(dow: number, spec: string): boolean {
  if (spec === "*" || spec === "?") return true;
  if (spec.includes(",")) return spec.split(",").some((s) => dowMatches(dow, s.trim()));
  if (spec.includes("-")) {
    const [a, b] = spec.split("-").map((n) => Number(n));
    const lo = Math.min(a, b); const hi = Math.max(a, b);
    return dow >= lo && dow <= hi;
  }
  return Number(spec) === dow;
}

// ── 分组 ──

export function buildAssignmentGroups(
  assignments: AssignmentRecord[],
  attentions: AttentionItem[],
): AssignmentGroup[] {
  const attentionByAssignment = new Map<string, AttentionItem>();
  for (const att of attentions) {
    if (att.state !== "open") continue;
    if (att.subjectKind === "assignment") attentionByAssignment.set(att.subjectId, att);
  }

  const needsAttention: AssignmentGroupItem[] = [];
  const active: AssignmentGroupItem[] = [];
  const completed: AssignmentGroupItem[] = [];
  const revoked: AssignmentGroupItem[] = [];

  for (const a of assignments) {
    const triggerLabel = describeTrigger(a.triggerDefinition.schedule);
    const nextExec = a.state === "active" ? nextExecutionOf(a.triggerDefinition.schedule) : null;
    const attention = attentionByAssignment.get(a.id);
    const item: AssignmentGroupItem = {
      assignment: a,
      attention,
      triggerLabel,
      authorizationLabel: authorizationLabel(a),
      nextExecutionLabel: nextExec ? formatRelative(nextExec) : null,
      statusPill: statusPill(a, attention),
      statusTone: statusTone(a, attention),
    };
    if (attention) {
      needsAttention.push(item);
      continue;
    }
    if (a.state === "active") active.push(item);
    else if (a.state === "completed") completed.push(item);
    else revoked.push(item);
  }

  const byTime = (x: AssignmentGroupItem, y: AssignmentGroupItem) => y.assignment.activatedAt - x.assignment.activatedAt;
  const groups: AssignmentGroup[] = [];
  if (needsAttention.length) groups.push({ key: "needs-attention", label: "Needs attention", items: needsAttention.sort(byTime) });
  if (active.length) groups.push({ key: "active", label: "Active", items: active.sort(byTime) });
  if (completed.length) groups.push({ key: "completed", label: "Completed", items: completed.sort(byTime) });
  if (revoked.length) groups.push({ key: "revoked", label: "Revoked", items: revoked.sort(byTime) });
  return groups;
}

function statusPill(a: AssignmentRecord, attention?: AttentionItem): string {
  if (attention) {
    if (attention.provenance?.repairRequest === true) return "FAILED";
    return "NEEDS ATTENTION";
  }
  return a.state.toUpperCase();
}

function statusTone(a: AssignmentRecord, attention?: AttentionItem): "error" | "warning" | "success" | "idle" {
  if (attention) return attention.provenance?.repairRequest === true ? "error" : "warning";
  if (a.state === "active") return "success";
  return "idle";
}

/** "Next execution" 相对时间（纯展示；~24h 内）。 */
export function formatRelative(epoch: number, now: number = Date.now()): string {
  const diff = epoch - now;
  const abs = Math.abs(diff);
  const hours = Math.round(abs / 3600_000);
  const mins = Math.round(abs / 60_000);
  if (abs < 60_000) return diff >= 0 ? "less than a minute" : "just now";
  if (hours < 1) return diff >= 0 ? `in ~${mins} min` : `~${mins} min ago`;
  const d = new Date(epoch);
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const today = new Date(now);
  if (d.toDateString() === today.toDateString()) return `today ${time}`;
  const tomorrow = new Date(now + 86400_000);
  if (d.toDateString() === tomorrow.toDateString()) return `tomorrow ${time}`;
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${time}`;
}
