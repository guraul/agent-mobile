import { describe, expect, it } from "vitest";
import { buildDutyRows, buildProjectRows } from "./chat-cards";
import type { AssignmentRecord } from "./assignment/client";
import type { AttentionItem } from "./attention/store";
import { MARKET_TALK_DIRECTORY } from "./conversation-kind";

const NOW = 1_760_000_000_000;

const baseAssignment = (over: Partial<AssignmentRecord>): AssignmentRecord => ({
  id: "asg_0000000000000000000000000000",
  mode: "ongoing",
  responsibility: "Fund NAV monitoring",
  domain: "market",
  state: "active",
  createdAt: NOW - 86400_000,
  activatedAt: NOW - 86400_000,
  completedAt: null,
  revokedAt: null,
  authorizationRef: "confirmation:prp_xxx",
  triggerDefinition: {
    kind: "schedule-rule",
    schedule: "50 14 * * 1-5",
    timezone: "Asia/Shanghai",
    condition: { kind: "fund-nav-above-target", fundCode: "000001" },
    enabled: true,
  },
  provenance: { createdBy: "assignment-service" },
  ...over,
});

const baseAttention = (over: Partial<AttentionItem>): AttentionItem => ({
  id: "att_xxx",
  dedupKey: "k",
  subjectKind: "assignment",
  subjectId: "asg_0000000000000000000000000000",
  domain: "market",
  creationReasonKind: "assignment-authorization",
  creationReasonRef: "asg_0000000000000000000000000000",
  sessionId: null,
  state: "open",
  createdAt: NOW - 600_000,
  expiresAt: null,
  handledAt: null,
  dismissedAt: null,
  expiredAt: null,
  handlingRef: null,
  title: "Execution failed",
  summary: "reason",
  provenance: { createdBy: "assignment-runtime", repairRequest: true, attempt: 1 },
  ...over,
});

describe("buildDutyRows", () => {
  it("纯 active → Active 行（Revoke）+ trigger/next meta", () => {
    const rows = buildDutyRows([baseAssignment({})], [], NOW);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: "asg_0000000000000000000000000000",
      name: "Fund NAV monitoring",
      pill: "Active",
      actions: ["revoke"],
    });
    expect(rows[0].meta).toContain("Every weekday 14:50");
  });

  it("attention + repairRequest → Failed 行（Retry = repair）", () => {
    const a = baseAssignment({});
    const rows = buildDutyRows([a], [baseAttention({ subjectId: a.id, provenance: { repairRequest: true } })], NOW);
    expect(rows[0].pill).toBe("Failed");
    expect(rows[0].actions).toEqual(["retry"]);
  });

  it("attention 无 repairRequest（missed 待补偿）→ Missed 行（Run now + Skip）", () => {
    const a = baseAssignment({
      provenance: { pendingCompensation: { occurrenceAt: NOW - 3600_000, detectedAt: NOW - 3000_000 } },
    });
    const rows = buildDutyRows(
      [a],
      [baseAttention({ subjectId: a.id, provenance: {} })],
      NOW,
    );
    expect(rows[0].pill).toBe("Missed");
    expect(rows[0].actions).toEqual(["run-now", "skip"]);
    expect(rows[0].meta).toContain("missed");
  });

  it("completed / revoked 不进卡", () => {
    const rows = buildDutyRows(
      [baseAssignment({ state: "completed" }), baseAssignment({ state: "revoked" })],
      [],
      NOW,
    );
    expect(rows).toEqual([]);
  });
});

describe("buildProjectRows", () => {
  const sessions = [
    { directory: "/root/project/agent-mobile", time: { updated: NOW - 300_000 } },
    { directory: MARKET_TALK_DIRECTORY, time: { updated: NOW - 60_000 } },
    { directory: "/", time: { updated: NOW - 1000 } },
    { directory: "/root/project/openchamber", time: { updated: NOW - 7200_000 } },
  ];

  it("去重目录；market 工作区与根目录不进卡；running 在前", () => {
    const rows = buildProjectRows(
      sessions,
      { "/root/project/openchamber": "busy", "/root/project/agent-mobile": "idle" },
      NOW,
    );
    expect(rows.map((r) => r.name)).toEqual(["openchamber", "agent-mobile"]);
    expect(rows[0]).toMatchObject({ running: true, meta: expect.stringContaining("Running") });
    expect(rows[1]).toMatchObject({ running: false, meta: expect.stringContaining("Idle") });
  });

  it("同目录多 session 取最近 updated", () => {
    const rows = buildProjectRows(
      [
        { directory: "/root/project/agent-mobile", time: { updated: NOW - 900_000 } },
        { directory: "/root/project/agent-mobile", time: { updated: NOW - 60_000 } },
      ],
      {},
      NOW,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].meta).toContain("last activity");
  });

  it("空输入 → 空行", () => {
    expect(buildProjectRows([], {}, NOW)).toEqual([]);
  });
});
