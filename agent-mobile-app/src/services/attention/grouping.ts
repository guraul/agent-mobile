// Market 告警「同类合并」——Pulse 呈现层（#140 / docs/pipeline/MARKET_ALERT_GROUPING_CARD.md）。
//
// 这是**视图**，不是新的产品对象：不新建 Attention、不写 Event、不改创建路径。
// 合并键 = domain=market ∧ creationReasonRef ∧ expiresAt
//   · creationReasonRef 相同 ⇒ 同一创建授权（assignment / rule 各自独立，不跨授权合并）
//   · expiresAt 相同 ⇒ 同一有效窗（不跨窗合并；成员过期，组随之消失）
// 基金集合是**被合并的内容**，不是键。
import type { PulseAttentionItem } from "./store";

/** 单条 Attention（未成组，或该组只有 1 条） */
export interface PulseAttentionUnit {
  kind: "attention";
  /** React key：attention:<id> */
  key: string;
  item: PulseAttentionItem;
}

/** 同域 / 同授权 / 同有效窗的 N≥2 条 market Attention */
export interface PulseMarketGroupUnit {
  kind: "market-group";
  /** React key，等于 groupKey */
  key: string;
  /** market:<creationReasonRef>:<expiresAt>，确定性派生，可随时从条目复算 */
  groupKey: string;
  /** 成员按时间序（新在前，与 Pulse 列表一致）；成员始终是独立 Attention */
  members: PulseAttentionItem[];
  count: number;
}

export type PulseUnit = PulseAttentionUnit | PulseMarketGroupUnit;

/** 合并键；不可合并（非 market / 无授权 / 无有效窗）返回 null */
export function marketGroupKey(item: PulseAttentionItem): string | null {
  if (item.domain !== "market") return null;
  if (!item.creationReasonRef) return null;
  if (item.expiresAt === null) return null;
  return `market:${item.creationReasonRef}:${item.expiresAt}`;
}

export function attentionUnit(item: PulseAttentionItem): PulseAttentionUnit {
  return { kind: "attention", key: `attention:${item.id}`, item };
}

/**
 * 把 Pulse 条目折成渲染单元。
 *
 * - 组占**最新成员**的位置（不把它顶到最前，也不改其余条目顺序）
 * - N=1 不套壳：退化为普通条目，位置不变
 * - 成员顺序 = createdAt 降序（与 openPulseItems 一致）
 */
export function buildPulseUnits(items: PulseAttentionItem[]): PulseUnit[] {
  const groups = new Map<string, PulseMarketGroupUnit>();
  const slots: PulseUnit[] = [];

  for (const item of items) {
    const groupKey = marketGroupKey(item);
    if (groupKey === null) {
      slots.push(attentionUnit(item));
      continue;
    }
    const existing = groups.get(groupKey);
    if (existing) {
      existing.members.push(item);
      continue;
    }
    const group: PulseMarketGroupUnit = {
      kind: "market-group",
      key: groupKey,
      groupKey,
      members: [item],
      count: 1,
    };
    groups.set(groupKey, group);
    slots.push(group);
  }

  return slots.map((slot) => {
    if (slot.kind !== "market-group") return slot;
    if (slot.members.length < 2) return attentionUnit(slot.members[0]);
    const members = [...slot.members].sort((a, b) => b.createdAt - a.createdAt);
    return { ...slot, members, count: members.length };
  });
}
