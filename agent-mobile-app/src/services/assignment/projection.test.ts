import { describe, it, expect } from "vitest";
import {
  describeTrigger,
  authorizationLabel,
  nextExecutionOf,
  buildAssignmentGroups,
  formatRelative,
} from "./projection";
import type { AssignmentRecord } from "./client";
import type { AttentionItem } from "../attention/store";

const baseAssignment = (over: Partial<AssignmentRecord>): AssignmentRecord => ({
  id: "asg_0000000000000000000000000000",
  mode: "ongoing",
  responsibility: "Fund NAV monitoring",
  domain: "market",
  state: "active",
  createdAt: 1750000000000,
  activatedAt: 1750000000000,
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
  createdAt: Date.now(),
  expiresAt: null,
  handledAt: null,
  dismissedAt: null,
  expiredAt: null,
  handlingRef: null,
  title: "Execution failed",
  summary: "reason",
  provenance: { createdBy: "assignment-runtime", repairRequest: true, attempt: 1, error: "net down" },
  ...over,
});

describe("describeTrigger", () => {
  it("weekday 14:50 → Every weekday", () => {
    expect(describeTrigger("50 14 * * 1-5")).toBe("Every weekday 14:50");
  });
  it("daily 18:00 → Every day", () => {
    expect(describeTrigger("0 18 * * *")).toBe("Every day 18:00");
  });
  it("unknown dow → raw fallback", () => {
    expect(describeTrigger("0 9 * * 1,3,5")).toBe("Monday, Wednesday, Friday 09:00");
  });
});

describe("authorizationLabel", () => {
  it("confirmation → User confirmed", () => {
    expect(authorizationLabel(baseAssignment({}))).toBe("User confirmed");
  });
  it("direct activation", () => {
    expect(authorizationLabel(baseAssignment({ authorizationRef: "direct-activation:explicit-instruction" }))).toBe(
      "Direct activation (explicit instruction)",
    );
  });
  it("legacy migration", () => {
    expect(authorizationLabel(baseAssignment({
      authorizationRef: "legacy-seed:fund-estimation",
      provenance: { createdBy: "legacy-migration", migratedFrom: "scheduler-job:fund-estimation" },
    }))).toBe("Legacy migration");
  });
});

describe("nextExecutionOf", () => {
  it("returns next weekday occurrence after now", () => {
    const now = Date.parse("2026-09-07T10:00:00+08:00"); // Monday 10:00
    const next = nextExecutionOf("50 14 * * 1-5", now)!;
    expect(new Date(next + 8 * 3600 * 1000).getUTCHours()).toBe(14);
    expect(new Date(next + 8 * 3600 * 1000).getUTCMinutes()).toBe(50);
  });
  it("daily schedule picks today if later", () => {
    const now = Date.parse("2026-09-07T10:00:00+08:00");
    const next = nextExecutionOf("0 18 * * *", now)!;
    // 今天 18:00 仍在未来 → 下一个就是今天
    const d = new Date(next + 8 * 3600 * 1000);
    expect(d.getUTCHours()).toBe(18);
    expect(d.getUTCDate()).toBe(7);
  });
  it("past time today rolls to tomorrow", () => {
    const now = Date.parse("2026-09-07T20:00:00+08:00");
    const next = nextExecutionOf("0 18 * * *", now)!;
    expect(new Date(next + 8 * 3600 * 1000).getUTCDate()).toBe(8);
  });
});

describe("buildAssignmentGroups", () => {
  const active = baseAssignment({});
  const oneShotDone = baseAssignment({ id: "asg_done", state: "completed", completedAt: Date.now(), mode: "one-shot" });
  const revoked = baseAssignment({ id: "asg_rev", state: "revoked", revokedAt: Date.now() });
  const failed = baseAssignment({ id: "asg_fail" });

  it("groups needs-attention / active / completed / revoked", () => {
    const groups = buildAssignmentGroups([active, oneShotDone, revoked, failed], [baseAttention({ subjectId: "asg_fail" })]);
    const keys = groups.map((g) => g.key);
    expect(keys).toEqual(["needs-attention", "active", "completed", "revoked"]);
    expect(groups[0]!.items[0]!.attention!.id).toBe("att_xxx");
    expect(groups[0]!.items[0]!.statusPill).toBe("FAILED");
    expect(groups[1]!.items[0]!.assignment.id).toBe("asg_0000000000000000000000000000");
  });

  it("open attention moves assignment into needs-attention even if active", () => {
    const groups = buildAssignmentGroups([active], [baseAttention({})]);
    expect(groups[0]!.key).toBe("needs-attention");
    expect(groups).toHaveLength(1);
  });

  it("non-open attention does not surface", () => {
    const groups = buildAssignmentGroups([active], [baseAttention({ state: "expired" })]);
    expect(groups[0]!.key).toBe("active");
    expect(groups[0]!.items[0]!.attention).toBeUndefined();
  });
});

describe("formatRelative", () => {
  const now = Date.parse("2026-09-07T10:00:00+08:00");
  it("today", () => {
    expect(formatRelative(Date.parse("2026-09-07T14:50:00+08:00"), now)).toBe("today 14:50");
  });
  it("tomorrow", () => {
    expect(formatRelative(Date.parse("2026-09-08T14:50:00+08:00"), now)).toBe("tomorrow 14:50");
  });
});
