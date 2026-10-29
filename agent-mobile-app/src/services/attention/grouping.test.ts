import { describe, it, expect } from "vitest";
import {
  attentionUnit,
  buildPulseUnits,
  marketGroupKey,
  type PulseMarketGroupUnit,
} from "./grouping";
import type { PulseAttentionItem } from "./store";

const WINDOW = 1_791_000_000_000; // 同一交易日的 15:00（值本身不重要，相等才重要）
const REASON = "asg_0123456789abcdef";

function item(over: Partial<PulseAttentionItem> & { id: string }): PulseAttentionItem {
  return {
    domain: "market",
    title: `fund ${over.id} crossed target`,
    summary: `fund ${over.id} estimate above target`,
    subjectKind: "fund",
    subjectId: `fund-${over.id}`,
    creationReasonRef: REASON,
    sessionId: null,
    createdAt: 1000,
    expiresAt: WINDOW,
    state: "open",
    ...over,
  };
}

const groupsOf = (units: ReturnType<typeof buildPulseUnits>) =>
  units.filter((u): u is PulseMarketGroupUnit => u.kind === "market-group");

describe("marketGroupKey（合并键 = domain ∧ creationReasonRef ∧ expiresAt）", () => {
  it("同域同授权同窗口 → 同键", () => {
    expect(marketGroupKey(item({ id: "a" }))).toBe(`market:${REASON}:${WINDOW}`);
  });

  it("非 market 域 / 无授权 / 无有效窗 → 不可合并", () => {
    expect(marketGroupKey(item({ id: "a", domain: "coding" }))).toBeNull();
    expect(marketGroupKey(item({ id: "a", creationReasonRef: "" }))).toBeNull();
    expect(marketGroupKey(item({ id: "a", expiresAt: null }))).toBeNull();
  });
});

describe("buildPulseUnits", () => {
  it("≥2 条同类 → 合成一组，成员一条不丢、计数正确", () => {
    const units = buildPulseUnits([item({ id: "a" }), item({ id: "b" }), item({ id: "c" })]);
    expect(units).toHaveLength(1);
    const [group] = groupsOf(units);
    expect(group.count).toBe(3);
    expect(group.members.map((m) => m.id)).toEqual(["a", "b", "c"]);
    // 合并是视图：成员仍是独立 Attention（原对象，未被改写）
    expect(group.members[0].title).toBe("fund a crossed target");
    expect(group.key).toBe(group.groupKey);
  });

  it("单条不套壳：退化为普通条目且位置不变", () => {
    const before = item({ id: "solo" });
    const units = buildPulseUnits([item({ id: "other", domain: "coding" }), before]);
    expect(units.map((u) => u.kind)).toEqual(["attention", "attention"]);
    expect(units[1]).toEqual(attentionUnit(before));
    expect(groupsOf(units)).toHaveLength(0);
  });

  it("同组只剩 1 条时不合并（另一条被跨窗/跨授权排除）", () => {
    const units = buildPulseUnits([
      item({ id: "a" }),
      item({ id: "b", expiresAt: WINDOW + 86_400_000 }),
    ]);
    expect(units.map((u) => u.kind)).toEqual(["attention", "attention"]);
  });

  it("跨 creationReasonRef 不合并（不跨创建授权）", () => {
    const units = buildPulseUnits([
      item({ id: "a" }),
      item({ id: "b", creationReasonRef: "market.target-nav-threshold" }),
    ]);
    expect(units.map((u) => u.kind)).toEqual(["attention", "attention"]);
  });

  it("跨 expiresAt 不合并（不跨有效窗）", () => {
    const units = buildPulseUnits([
      item({ id: "a" }),
      item({ id: "b", expiresAt: WINDOW + 1 }),
    ]);
    expect(units.map((u) => u.kind)).toEqual(["attention", "attention"]);
  });

  it("跨域不合并（market 只与 market 合并）", () => {
    const units = buildPulseUnits([
      item({ id: "a" }),
      item({ id: "b", domain: "coding" }),
      item({ id: "c", domain: "personal" }),
    ]);
    expect(units.map((u) => u.kind)).toEqual(["attention", "attention", "attention"]);
    expect(groupsOf(units)).toHaveLength(0);
  });

  it("同名窗但无 expiresAt 的条目永不合并（无窗无法判定同一窗口）", () => {
    const units = buildPulseUnits([
      item({ id: "a", expiresAt: null }),
      item({ id: "b", expiresAt: null }),
    ]);
    expect(units.map((u) => u.kind)).toEqual(["attention", "attention"]);
  });

  it("两组不同键并存，各自计数独立", () => {
    const units = buildPulseUnits([
      item({ id: "a" }),
      item({ id: "x", creationReasonRef: "rule-b" }),
      item({ id: "b" }),
      item({ id: "y", creationReasonRef: "rule-b" }),
      item({ id: "z", creationReasonRef: "rule-b" }),
    ]);
    expect(units).toHaveLength(2);
    expect(groupsOf(units).map((g) => g.count)).toEqual([2, 3]);
  });

  it("组占最新成员的位置，其余条目顺序不变（不把组顶到最前）", () => {
    const units = buildPulseUnits([
      item({ id: "ny-1", domain: "coding" }),
      item({ id: "m-new", createdAt: 3000 }),
      item({ id: "ny-2", domain: "personal" }),
      item({ id: "m-old", createdAt: 2000 }),
    ]);
    expect(units.map((u) => (u.kind === "attention" ? u.item.id : `group:${u.count}`))).toEqual([
      "ny-1",
      "group:2",
      "ny-2",
    ]);
  });

  it("成员按时间序（createdAt 降序，与 Pulse 列表一致）", () => {
    const units = buildPulseUnits([
      item({ id: "old", createdAt: 1000 }),
      item({ id: "new", createdAt: 3000 }),
      item({ id: "mid", createdAt: 2000 }),
    ]);
    const [group] = groupsOf(units);
    expect(group.members.map((m) => m.id)).toEqual(["new", "mid", "old"]);
    expect(group.count).toBe(3);
  });

  it("不做基金集合匹配：subjectId 不同不影响成组，相同也不会跨键合并", () => {
    const units = buildPulseUnits([
      item({ id: "a", subjectId: "same-fund" }),
      item({ id: "b", subjectId: "same-fund" }),
    ]);
    expect(groupsOf(units)).toHaveLength(1);
    expect(groupsOf(units)[0].count).toBe(2);
  });

  it("单元 key 唯一（React key 可直接用）", () => {
    const units = buildPulseUnits([
      item({ id: "a" }),
      item({ id: "b" }),
      item({ id: "c", domain: "coding" }),
    ]);
    expect(new Set(units.map((u) => u.key)).size).toBe(units.length);
  });

  it("空列表 → 空单元列表", () => {
    expect(buildPulseUnits([])).toEqual([]);
  });
});
