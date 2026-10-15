// Attention store —— Pulse 的 authoritative actionable 数据源（PM §16/§17）。
// 纯函数 + 视图模型转换：不重新发明 lifecycle 概念，state 原样保留，
// Pulse 只渲染 state==='open' 的条目（HANDLED/DISMISSED/EXPIRED 自动消失）。

export type AttentionState = "open" | "handled" | "dismissed" | "expired";
export type AttentionDomain = "coding" | "market" | "personal";

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
  creationReasonRef: string;
  sessionId: string | null;
  createdAt: number;
  state: AttentionState;
}

/** 传入 Talk 的 Attention 引用（ChatPanelZ 据此渲染上下文卡 + Mark handled） */
export interface EngagedAttentionRef {
  id: string;
  title: string;
  summary: string;
  subjectId: string;
  state: AttentionState;
  /** 创建时已知的 session（permission 类）；market 类为新建 session */
  sessionId: string | null;
}

export function toPulseAttentionItem(item: AttentionItem): PulseAttentionItem {
  return {
    id: item.id,
    domain: item.domain,
    title: item.title,
    summary: item.summary,
    subjectKind: item.subjectKind,
    subjectId: item.subjectId,
    creationReasonRef: item.creationReasonRef,
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

// ── 动作可见性判据（纯函数，便于单测；#96 / ref agent-mobile#91）──
// 凭据到期事项：subjectKind === "credential"（domain=personal、sessionId=null，
// 由 homebase ttskill-login-guard 管道创建）。其唯一动作是「重发二维码」；
// Open Talk 必须隐藏——sessionId=null 且非 market 会走 talk.ts 抛「该事项的会话已不可用」。

/** 凭据到期类事项 */
export function isCredentialItem(item: { subjectKind: string }): boolean {
  return item.subjectKind === "credential";
}

/** Attention 详情屏动作可见性：凭据事项 = 重发二维码 ON / Open Talk OFF */
export function attentionActionFlags(item: { subjectKind: string }): {
  renew: boolean;
  openTalk: boolean;
} {
  const credential = isCredentialItem(item);
  return { renew: credential, openTalk: !credential };
}
