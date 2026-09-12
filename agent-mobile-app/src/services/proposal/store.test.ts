import { describe, it, expect } from "vitest";
import {
  toPulseSuggestion,
  proposedSuggestions,
  applyProposalChange,
  reconcileSuggestionsFromSnapshot,
  type PulseSuggestion,
} from "./store";
import type { ProposalRow } from "../assignment/client";

// Phase 13：Suggestion projection 纯函数测试（PHASE13_DESIGN §4.2 / §10 mobile 层用例）。

function proposalRow(overrides: Partial<ProposalRow> = {}): ProposalRow {
  return {
    id: "prp_TEST_0001",
    mode: "ongoing",
    responsibility: "持续监控基金 012414，达到目标净值时提醒",
    domain: "market",
    triggerDefinition: {
      kind: "schedule-rule",
      schedule: "50 14 * * 1-5",
      timezone: "Asia/Shanghai",
      condition: { kind: "fund-nav-above-target", fundCode: "012414" },
      enabled: true,
    },
    actionScope: null,
    status: "proposed",
    createdAt: 1700000000000,
    resolvedAt: null,
    resolution: null,
    sessionId: null,
    instructionRef: "observation:observation.market.repeated-decline:evt_obs_TEST",
    expiresAt: 1700000000000 + 7 * 24 * 3600 * 1000,
    provenance: { createdBy: "observation:observation.market.repeated-decline" },
    ...overrides,
  };
}

describe("toPulseSuggestion", () => {
  it("proposal row → Suggestion 视图模型（triggerLabel / effectLabel 派生）", () => {
    const s = toPulseSuggestion(proposalRow());
    expect(s.id).toBe("prp_TEST_0001");
    expect(s.status).toBe("proposed");
    expect(s.triggerLabel).toBe("Every weekday 14:50");
    expect(s.effectLabel).toContain("Every weekday 14:50");
    expect(s.effectLabel).toContain("撤销");
    expect(s.reasonLabel).toBe("基于近期行情观察（连续 3 个评估点净值走低）");
    expect(s.expiresAt).toBe(proposalRow().expiresAt);
  });

  it("talk/api 来源 → reasonLabel 为 null（用户自己发起的提案无需 why）", () => {
    expect(toPulseSuggestion(proposalRow({ provenance: { createdBy: "talk" } })).reasonLabel).toBeNull();
    expect(toPulseSuggestion(proposalRow({ provenance: { createdBy: "api" } })).reasonLabel).toBeNull();
  });

  it("always 条件 → 效果句为'到点提醒'；观察类条件 → '命中条件时提醒'", () => {
    const always = toPulseSuggestion(proposalRow({
      domain: "personal",
      triggerDefinition: {
        kind: "schedule-rule", schedule: "0 18 * * *", timezone: "Asia/Shanghai",
        condition: { kind: "always" }, enabled: true,
      },
    }));
    expect(always.effectLabel).toContain("到点提醒你");
    expect(always.effectLabel).toContain("Every day 18:00");
  });

  it("expiresAt null 保留 null（不做客户端倒计时的第二状态源）", () => {
    expect(toPulseSuggestion(proposalRow({ expiresAt: null })).expiresAt).toBeNull();
  });
});

describe("proposedSuggestions", () => {
  const items: PulseSuggestion[] = [
    toPulseSuggestion(proposalRow({ id: "prp_A", createdAt: 1000 })),
    toPulseSuggestion(proposalRow({ id: "prp_B", createdAt: 3000 })),
    toPulseSuggestion(proposalRow({ id: "prp_C", createdAt: 2000, status: "rejected" })),
    toPulseSuggestion(proposalRow({ id: "prp_D", createdAt: 4000, status: "confirmed" })),
    toPulseSuggestion(proposalRow({ id: "prp_E", createdAt: 5000, status: "expired" })),
  ];

  it("只保留 proposed，createdAt DESC", () => {
    expect(proposedSuggestions(items).map((s) => s.id)).toEqual(["prp_B", "prp_A"]);
  });
});

describe("applyProposalChange", () => {
  it("created/updated 都 upsert；终态行保留在 store（由过滤渲染消失）", () => {
    let items: PulseSuggestion[] = [];
    const created = proposalRow({ id: "prp_X" });
    items = applyProposalChange(items, { kind: "proposal.created", at: 1, item: created });
    expect(items).toHaveLength(1);

    const confirmed = proposalRow({ id: "prp_X", status: "confirmed", resolvedAt: 2, resolution: { assignmentId: "asg_1", via: "confirmation" } });
    items = applyProposalChange(items, { kind: "proposal.updated", at: 2, item: confirmed });
    expect(items).toHaveLength(1);
    expect(items[0].status).toBe("confirmed");
    expect(proposedSuggestions(items)).toHaveLength(0); // Pulse 上消失
  });

  it("upsert 同 id 不产生重复行", () => {
    const row = proposalRow({ id: "prp_Y" });
    let items = applyProposalChange([], { kind: "proposal.created", at: 1, item: row });
    items = applyProposalChange(items, { kind: "proposal.updated", at: 2, item: row });
    expect(items).toHaveLength(1);
  });
});

describe("reconcileSuggestionsFromSnapshot", () => {
  it("以 snapshot 为准整体替换（重连对账）", () => {
    const stale: PulseSuggestion[] = [toPulseSuggestion(proposalRow({ id: "prp_OLD" }))];
    const snapshot = [proposalRow({ id: "prp_N1", createdAt: 200 }), proposalRow({ id: "prp_N2", createdAt: 100 })];
    const items = reconcileSuggestionsFromSnapshot(snapshot);
    expect(stale).toHaveLength(1); // 旧 store 与 snapshot 无关
    expect(items.map((s) => s.id)).toEqual(["prp_N1", "prp_N2"]);
  });

  it("snapshot 含终态行也原样投影（过滤交给 proposedSuggestions）", () => {
    const snapshot = [proposalRow({ id: "prp_N1" }), proposalRow({ id: "prp_DONE", status: "expired" })];
    const items = reconcileSuggestionsFromSnapshot(snapshot);
    expect(items).toHaveLength(2);
    expect(proposedSuggestions(items).map((s) => s.id)).toEqual(["prp_N1"]);
  });
});
