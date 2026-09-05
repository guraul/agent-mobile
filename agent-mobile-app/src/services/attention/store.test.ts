import { describe, it, expect } from "vitest";
import {
  applyAttentionChange,
  openPulseItems,
  reconcileFromSnapshot,
  toPulseAttentionItem,
  type AttentionChange,
  type AttentionItem,
  type AttentionState,
} from "./store";

function row(over: Partial<AttentionItem> & { id: string; state: AttentionState }): AttentionItem {
  return {
    dedupKey: `dk-${over.id}`,
    subjectKind: "permission",
    subjectId: `req-${over.id}`,
    domain: "coding",
    creationReasonKind: "named-rule",
    creationReasonRef: "opencode.permission.blocking",
    sessionId: "sess-1",
    createdAt: 1000,
    expiresAt: null,
    handledAt: null,
    dismissedAt: null,
    expiredAt: null,
    handlingRef: null,
    title: `权限请求 ${over.id}`,
    summary: "bash 等待授权",
    provenance: {},
    ...over,
  };
}

function change(id: string, state: AttentionState, createdAt = 1000): AttentionChange {
  return { kind: state === "open" ? "attention.created" : "attention.updated", at: Date.now(), item: row({ id, state, createdAt }) };
}

describe("Attention store（Phase 3 Pulse 数据层）", () => {
  it("OPEN → visible in openPulseItems", () => {
    const items = applyAttentionChange([], change("a1", "open"));
    expect(openPulseItems(items).map((i) => i.id)).toEqual(["a1"]);
  });

  it.each(["handled", "dismissed", "expired"] as AttentionState[])(
    "updated %s → 不再出现在 openPulseItems（Pulse item 消失）",
    (state) => {
      let items = applyAttentionChange([], change("a1", "open"));
      items = applyAttentionChange(items, change("a1", state));
      expect(items.find((i) => i.id === "a1")?.state).toBe(state); // store 保留行
      expect(openPulseItems(items)).toHaveLength(0);               // 但不再 actionable
    },
  );

  it("toPulseAttentionItem：视图模型转换（不透传 backend 全字段）", () => {
    const vm = toPulseAttentionItem(row({ id: "a2", state: "open", domain: "market" }));
    expect(vm).toEqual({
      id: "a2", domain: "market", title: "权限请求 a2", summary: "bash 等待授权",
      subjectKind: "permission", subjectId: "req-a2", creationReasonRef: "opencode.permission.blocking",
      sessionId: "sess-1", createdAt: 1000, state: "open",
    });
    expect((vm as unknown as Record<string, unknown>).dedupKey).toBeUndefined();
    expect((vm as unknown as Record<string, unknown>).provenance).toBeUndefined();
  });

  it("openPulseItems 按 createdAt desc 排序", () => {
    let items = applyAttentionChange([], change("old", "open", 1000));
    items = applyAttentionChange(items, change("new", "open", 2000));
    expect(openPulseItems(items).map((i) => i.id)).toEqual(["new", "old"]);
  });

  it("reconnect reconcile：snapshot 权威（补建错过的 item、应用错过的终态）", () => {
    // 断线期间：本地只有 old(open)；实际 old 已 handled，且新增了 fresh(open)
    let items = applyAttentionChange([], change("old", "open", 1000));
    const snapshot: AttentionItem[] = [
      row({ id: "old", state: "handled" }),
      row({ id: "fresh", state: "open", createdAt: 3000 }),
    ];
    items = reconcileFromSnapshot(snapshot);
    expect(items.map((i) => i.id).sort()).toEqual(["fresh", "old"]);
    expect(openPulseItems(items).map((i) => i.id)).toEqual(["fresh"]);
  });

  it("market 与 coding 域都在 open 列表（Pulse 不区分 authority 来源）", () => {
    const snapshot: AttentionItem[] = [
      row({ id: "perm", state: "open" }),
      { ...row({ id: "mkt", state: "open" }), domain: "market" as const, subjectKind: "fund", subjectId: "000001", creationReasonRef: "market.target-nav-threshold", sessionId: null, title: "基金命中", summary: "估净超目标" },
    ];
    const items = reconcileFromSnapshot(snapshot);
    expect(openPulseItems(items)).toHaveLength(2);
  });
});
