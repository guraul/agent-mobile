// Proposal store（Phase 13）—— assignment_proposals 的 user-facing projection（PHASE13_DESIGN §4）。
// Suggestion ≠ Proposal：本层只是 proposal 的只读视图模型，不复制 lifecycle——
// status 原样保留，渲染过滤 status==='proposed'（与 attention store 过滤 state==='open' 同构）。
// 终态（confirmed/rejected/cancelled/expired）行随 SSE/对账进入 store 后自然从 Pulse 消失。
import type { ProposalRow } from "../assignment/client";
import { describeTrigger, describeProposalEffect, observationReasonLabel } from "../assignment/projection";

export type ProposalStatus = ProposalRow["status"];

/** product SSE 变更事件（presentation 通道，与 attention.created/updated 同族；非 product_event） */
export interface ProposalChange {
  kind: "proposal.created" | "proposal.updated";
  at: number;
  item: ProposalRow;
}

/** Pulse Suggestion 视图模型（L2：Agent 建议承担一个责任；Confirm/Reject 是唯一推进路径） */
export interface PulseSuggestion {
  id: string;                 // = proposal.id（prp_*），稳定引用（key/testID/动作目标）
  responsibility: string;     // proposal.responsibility 原文（"建议承担什么责任"）
  domain: "market" | "personal";
  mode: "one-shot" | "ongoing";
  status: ProposalStatus;     // 原样保留，不翻译成第二套状态
  triggerLabel: string;       // describeTrigger(schedule)
  effectLabel: string;        // describeProposalEffect（"确认后会发生什么"）
  reasonLabel: string | null; // "为什么建议"（observation 来源才有；talk/api 为 null）
  createdAt: number;
  expiresAt: number | null;   // proposal TTL（7 天）→ 仅作"有效至"展示提示，不做客户端倒计时
}

export function toPulseSuggestion(p: ProposalRow): PulseSuggestion {
  return {
    id: p.id,
    responsibility: p.responsibility,
    domain: p.domain,
    mode: p.mode,
    status: p.status,
    triggerLabel: describeTrigger(p.triggerDefinition.schedule),
    effectLabel: describeProposalEffect(p.triggerDefinition),
    reasonLabel: observationReasonLabel(p.provenance?.createdBy),
    createdAt: p.createdAt,
    expiresAt: p.expiresAt ?? null,
  };
}

/** Pulse Suggested = status==='proposed'（终态不再作为待决事项出现），createdAt DESC */
export function proposedSuggestions(items: PulseSuggestion[]): PulseSuggestion[] {
  return items
    .filter((s) => s.status === "proposed")
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** SSE 增量应用：created/updated 都 upsert（终态行保留在 store，由 proposedSuggestions 过滤渲染） */
export function applyProposalChange(
  items: PulseSuggestion[],
  change: ProposalChange,
): PulseSuggestion[] {
  const next = items.filter((s) => s.id !== change.item.id);
  next.push(toPulseSuggestion(change.item));
  return next.sort((a, b) => b.createdAt - a.createdAt);
}

/** SSE 重连后对账：以 REST snapshot 为准（补上断线期间错过的创建/迁移） */
export function reconcileSuggestionsFromSnapshot(snapshot: ProposalRow[]): PulseSuggestion[] {
  return snapshot
    .map(toPulseSuggestion)
    .sort((a, b) => b.createdAt - a.createdAt);
}
