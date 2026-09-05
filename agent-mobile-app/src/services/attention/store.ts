// Attention store —— Pulse 的 authoritative actionable 数据源（PM §16/§17）。
// 纯函数 + 视图模型转换：不重新发明 lifecycle 概念，state 原样保留，
// Pulse 只渲染 state==='open' 的条目（HANDLED/DISMISSED/EXPIRED 自动消失）。

export type AttentionState = "open" | "handled" | "dismissed" | "expired";
export type AttentionDomain = "coding" | "market";

/** BFF /api/product/attention 返回的 item 形状（camelCase） */
export interface AttentionItem {
  id: string;
  dedupKey: string;
  subjectKind: string;
  subjectId: string;
  domain: AttentionDomain;
  creationReasonKind: string;
  creationReasonRef: string;
  sessionId: string | null;
  state: AttentionState;
  createdAt: number;
  expiresAt: number | null;
  handledAt: number | null;
  dismissedAt: number | null;
  expiredAt: number | null;
  handlingRef: string | null;
  title: string;
  summary: string;
  provenance: Record<string, unknown>;
}

/** product SSE 变更事件 */
export interface AttentionChange {
  kind: "attention.created" | "attention.updated";
  at: number;
  item: AttentionItem;
}

/** Pulse 视图模型（§9：转换层，不把 backend object 原样塞 UI） */
export interface PulseAttentionItem {
  id: string;
  domain: AttentionDomain;
  title: string;
  summary: string;
  subjectKind: string;
  subjectId: string;
  sessionId: string | null;
  createdAt: number;
  state: AttentionState;
}

export function toPulseAttentionItem(item: AttentionItem): PulseAttentionItem {
  return {
    id: item.id,
    domain: item.domain,
    title: item.title,
    summary: item.summary,
    subjectKind: item.subjectKind,
    subjectId: item.subjectId,
    sessionId: item.sessionId,
    createdAt: item.createdAt,
    state: item.state,
  };
}

/** Pulse actionable = state==='open'（终态不再作为待处理条目出现） */
export function openPulseItems(items: PulseAttentionItem[]): PulseAttentionItem[] {
  return items
    .filter((i) => i.state === "open")
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** SSE 增量应用：created/updated 都 upsert（终态行保留在 store，由 openItems 过滤渲染） */
export function applyAttentionChange(
  items: PulseAttentionItem[],
  change: AttentionChange,
): PulseAttentionItem[] {
  const next = items.filter((i) => i.id !== change.item.id);
  next.push(toPulseAttentionItem(change.item));
  return next.sort((a, b) => b.createdAt - a.createdAt);
}

/** SSE 重连后对账：以 REST snapshot 为准（补上断线期间错过的创建/迁移） */
export function reconcileFromSnapshot(
  snapshot: AttentionItem[],
): PulseAttentionItem[] {
  return snapshot
    .map(toPulseAttentionItem)
    .sort((a, b) => b.createdAt - a.createdAt);
}
