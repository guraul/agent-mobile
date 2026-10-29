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
 * 把 `groupMarketAttentions` 的结果落成 Pulse 渲染单元。
 *
 * - 组占**最新成员**的位置（不把它顶到最前，也不改其余条目顺序）
 * - singles 原样、按输入顺序
 * - 成员顺序 = createdAt 降序（与 openPulseItems 一致）
 *
 * `order` 是分组前的原始列表（即 `groupMarketAttentions` 的输入）：只用来定位
 * 组该落在哪一行，成员本身仍取自分组结果。
 */
export function unitsFromGrouping(
  grouping: MarketAttentionGrouping,
  order: PulseAttentionItem[],
): PulseUnit[] {
  const byKey = new Map(grouping.groups.map((group) => [group.key, group]));
  const placed = new Set<string>();
  const units: PulseUnit[] = [];

  for (const item of order) {
    const groupKey = marketGroupKey(item);
    const group = groupKey === null ? undefined : byKey.get(groupKey);
    if (group === undefined) {
      units.push(attentionUnit(item));
      continue;
    }
    if (placed.has(group.key)) continue;
    placed.add(group.key);
    const members = [...group.items].sort((a, b) => b.createdAt - a.createdAt);
    units.push({
      kind: "market-group",
      key: group.key,
      groupKey: group.key,
      members,
      count: members.length,
    });
  }

  return units;
}

/** 一组被合并的 market Attention（纯数据；不含渲染字段） */
export interface MarketAttentionGroup {
  /** 合并键，market:<creationReasonRef>:<expiresAt> */
  key: string;
  reasonRef: string;
  expiresAt: number;
  /** 成员按时间升序（旧在前） */
  items: PulseAttentionItem[];
}

export interface MarketAttentionGrouping {
  /** 仅 N≥2 的组合；按合并键首次出现的顺序 */
  groups: MarketAttentionGroup[];
  /** 未成组条目（非 market / 无授权 / 无有效窗 / 组内只有 1 条），保持输入顺序 */
  singles: PulseAttentionItem[];
}

/**
 * 按「域 ∧ 创建授权 ∧ 有效窗」把 market Attention 分组合并。
 *
 * - 只合并 `domain === "market"` 且 `creationReasonRef`、`expiresAt` 均有效的条目
 * - 跨 creationReasonRef / 跨 expiresAt / 跨 domain 一律不合并
 * - N=1 不合并，原样进 singles
 * - 组内按 createdAt 升序；不修改输入数组与条目
 */
export function groupMarketAttentions(items: PulseAttentionItem[]): MarketAttentionGrouping {
  const buckets = new Map<string, PulseAttentionItem[]>();
  const meta = new Map<string, { reasonRef: string; expiresAt: number }>();

  for (const item of items) {
    const key = marketGroupKey(item);
    if (key === null || item.expiresAt === null) continue;
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.push(item);
      continue;
    }
    buckets.set(key, [item]);
    meta.set(key, { reasonRef: item.creationReasonRef, expiresAt: item.expiresAt });
  }

  const groups: MarketAttentionGroup[] = [];
  for (const [key, members] of buckets) {
    if (members.length < 2) continue;
    const info = meta.get(key)!;
    groups.push({
      key,
      reasonRef: info.reasonRef,
      expiresAt: info.expiresAt,
      items: [...members].sort((a, b) => a.createdAt - b.createdAt),
    });
  }

  const singles = items.filter((item) => {
    const key = marketGroupKey(item);
    return key === null || (buckets.get(key)?.length ?? 0) < 2;
  });

  return { groups, singles };
}
