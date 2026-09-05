import type { PulseAttentionItem } from "./store";

// AttentionContext builder（PM §8.2/§3）：Attention → AttentionContext → Talk。
// 只提供解决该 Attention 所需的最小上下文；绝不把整个 DB record 原样注入 Agent
//（dedup/provenance/timestamps 等审计字段不进对话）。

export interface AttentionContext {
  /** 给 Agent 的第一人称上下文文本（作为会话首条消息注入） */
  messageText: string;
  /** 给用户的会话内上下文卡片 */
  banner: { title: string; summary: string };
}

const DOMAIN_LABEL: Record<string, string> = {
  coding: "编码",
  market: "市场",
};

export function buildAttentionContext(item: PulseAttentionItem): AttentionContext {
  const domainLabel = DOMAIN_LABEL[item.domain] ?? item.domain;
  const messageText = [
    `【来自 Pulse Attention】${item.title}`,
    item.summary,
    `（处理对象：${item.subjectKind}:${item.subjectId}；域：${domainLabel}；创建依据：${item.creationReasonRef ?? "user-instruction"}）`,
    "请结合以上情况，帮我评估这个事项该怎么处理。",
  ].join("\n");
  return {
    messageText,
    banner: { title: item.title, summary: item.summary },
  };
}
