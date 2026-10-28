import { describe, expect, it } from "vitest";
import { buildResponsibilities, lastRunOf } from "./responsibilities";
import type { AssignmentHistoryItem, AssignmentRecord, ProposalRow } from "./client";

const asg = (over: Partial<AssignmentRecord>): AssignmentRecord => ({
  id: "asg_active1",
  mode: "ongoing",
  responsibility: "每个交易日 14:50 监控基金 000001",
  domain: "market",
  state: "active",
  createdAt: 1750000000000,
  activatedAt: 1750000000000,
  completedAt: null,
  revokedAt: null,
  authorizationRef: "confirmation:prp_x",
  triggerDefinition: {
    kind: "schedule-rule",
    schedule: "50 14 * * 1-5",
    timezone: "Asia/Shanghai",
    condition: { kind: "always" },
    enabled: true,
  },
  provenance: { createdBy: "assignment-service" },
  ...over,
});

const prp = (over: Partial<ProposalRow>): ProposalRow => ({
  id: "prp_new1",
  mode: "ongoing",
  responsibility: "Watch fund 000002",
  domain: "market",
  status: "proposed",
  resolution: null,
  triggerDefinition: {
    kind: "schedule-rule",
    schedule: "0 9 * * 1-5",
    timezone: "Asia/Shanghai",
    condition: { kind: "always" },
    enabled: true,
  },
  actionScope: null,
  createdAt: 1760000000000,
  resolvedAt: null,
  sessionId: null,
  instructionRef: null,
  expiresAt: null,
  provenance: { createdBy: "talk" },
  ...over,
});

const fired = (over: Partial<AssignmentHistoryItem>): AssignmentHistoryItem => ({
  id: "evt_1",
  type: "assignment.trigger.fired",
  occurredAt: 1750000000000,
  label: "Matched",
  status: "success",
  ...over,
});

describe("lastRunOf", () => {
  it("取最近一次 trigger.fired", () => {
    expect(lastRunOf([fired({ occurredAt: 10 }), fired({ occurredAt: 99 })])).toBe(99);
  });

  it("activated/revoked 不算执行", () => {
    expect(lastRunOf([fired({ type: "assignment.activated", occurredAt: 50 })])).toBeNull();
    expect(lastRunOf([fired({ type: "assignment.revoked", occurredAt: 50 })])).toBeNull();
  });

  it("空历史 → null", () => {
    expect(lastRunOf([])).toBeNull();
  });
});

describe("buildResponsibilities", () => {
  it("revoked / completed 与已决议提案都不出现", () => {
    const rows = buildResponsibilities(
      [
        asg({ id: "asg_a", state: "revoked" }),
        asg({ id: "asg_c", state: "completed" }),
        asg({ id: "asg_keep" }),
      ],
      [prp({ id: "prp_keep" }), prp({ id: "prp_done", status: "confirmed" })],
    );
    expect(rows.map((r) => r.id)).toEqual(["asg_keep", "prp_keep"]);
  });

  it("active→success、proposed→warning", () => {
    const rows = buildResponsibilities([asg({ id: "asg_a" })], [prp({ id: "prp_a" })]);
    expect(rows[0]?.tone).toBe("success");
    expect(rows[1]?.tone).toBe("warning");
    expect(rows[0]?.kind).toBe("assignment");
    expect(rows[1]?.kind).toBe("proposal");
  });

  it("responsibility 原样透传（中英混排不翻译）", () => {
    const text = "每个交易日 14:50 监控 fund 000001 估净";
    const rows = buildResponsibilities([asg({ responsibility: text })], []);
    expect(rows[0]?.responsibility).toBe(text);
  });

  it("生效中的排在待确认之前，组内新的在上", () => {
    const rows = buildResponsibilities(
      [asg({ id: "asg_old", activatedAt: 1 }), asg({ id: "asg_new", activatedAt: 9 })],
      [prp({ id: "prp_old", createdAt: 1 }), prp({ id: "prp_new", createdAt: 9 })],
    );
    expect(rows.map((r) => r.id)).toEqual(["asg_new", "asg_old", "prp_new", "prp_old"]);
  });

  it("lastRunAt 来自传入的执行时刻表；提案恒为 null", () => {
    const rows = buildResponsibilities(
      [asg({ id: "asg_a" }), asg({ id: "asg_b" })],
      [prp({ id: "prp_a" })],
      { asg_a: 1760000000000, asg_b: null },
    );
    expect(rows[0]?.lastRunAt).toBe(1760000000000);
    expect(rows[1]?.lastRunAt).toBeNull();
    expect(rows[2]?.lastRunAt).toBeNull();
  });

  it("全空 → 空数组（空态由组件给一句话）", () => {
    expect(buildResponsibilities([], [])).toEqual([]);
  });
});
