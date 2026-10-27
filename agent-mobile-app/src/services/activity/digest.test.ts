import { describe, expect, it } from "vitest";
import type { AgentActivity, AgentActivityExecution } from "./client";
import {
  ACTIVITY_PAGE_LIMIT,
  buildTodayDigest,
  buildTodayDigestText,
  filterActivityToToday,
  startOfLocalDay,
  summarizeToday,
} from "./digest";

function execution(
  at: number,
  outcome: AgentActivityExecution["outcome"],
  id = `e-${at}-${outcome}`,
): AgentActivityExecution {
  return { id, title: "晨间检查", at, outcome };
}

function activity(executions: AgentActivityExecution[]): AgentActivity {
  return {
    windowDays: 1,
    counts: {
      executions: executions.length,
      matched: executions.filter((e) => e.outcome === "matched").length,
      failed: executions.filter((e) => e.outcome === "failed").length,
      attentionCreated: 0,
      attentionHandled: 0,
    },
    executions,
  };
}

describe("buildTodayDigestText", () => {
  it("prefers failed over matched and evaluated", () => {
    expect(buildTodayDigestText({ total: 5, matched: 2, failed: 1 })).toBe(
      "今天替你看了 5 件事，有 1 件没跑成",
    );
  });

  it("reports matched when nothing failed", () => {
    expect(buildTodayDigestText({ total: 4, matched: 2, failed: 0 })).toBe(
      "今天替你看了 4 件事，其中 2 件触发了提醒",
    );
  });

  it("says all normal when everything was only evaluated", () => {
    expect(buildTodayDigestText({ total: 3, matched: 0, failed: 0 })).toBe(
      "今天替你看了 3 件事，都正常",
    );
  });
});

describe("today boundary", () => {
  // 固定时间戳 + 显式 dayStart：断言不依赖运行环境时区（CI 是 UTC）。
  const dayStart = Date.UTC(2026, 9, 27);
  const now = dayStart + 12 * 3600_000;

  it("counts today and excludes the millisecond before local midnight", () => {
    const counts = summarizeToday(
      [
        execution(dayStart - 1, "evaluated"),
        execution(dayStart, "evaluated"),
        execution(now, "matched"),
      ],
      { dayStart, now },
    );
    expect(counts).toEqual({ total: 2, matched: 1, failed: 0 });
  });

  it("excludes timestamps after now", () => {
    expect(
      summarizeToday([execution(now + 1, "evaluated")], { dayStart, now }),
    ).toBeNull();
  });

  it("startOfLocalDay resolves local midnight regardless of runtime TZ", () => {
    const localNow = new Date(2026, 9, 27, 15, 30, 0, 0).getTime();
    expect(startOfLocalDay(localNow)).toBe(new Date(2026, 9, 27, 0, 0, 0, 0).getTime());
    expect(startOfLocalDay(new Date(2026, 9, 27, 23, 59, 59, 999).getTime())).toBe(
      new Date(2026, 9, 27, 0, 0, 0, 0).getTime(),
    );
  });

  it("buildTodayDigest applies the local day boundary end-to-end", () => {
    const localNow = new Date(2026, 9, 27, 12, 0, 0, 0).getTime();
    const yesterday = new Date(2026, 9, 26, 23, 59, 59, 999).getTime();
    expect(
      buildTodayDigest(activity([execution(yesterday, "failed"), execution(localNow - 1000, "evaluated")]), localNow),
    ).toBe("今天替你看了 1 件事，都正常");
  });
});

describe("truncation and empty", () => {
  const dayStart = Date.UTC(2026, 9, 27);
  const now = dayStart + 12 * 3600_000;

  it("returns null when the page is full (may have been truncated)", () => {
    const full = Array.from({ length: ACTIVITY_PAGE_LIMIT }, (_, i) =>
      execution(dayStart + i, "evaluated"),
    );
    expect(summarizeToday(full, { dayStart, now })).toBeNull();
    expect(buildTodayDigest(activity(full), now)).toBeNull();
  });

  it("keeps reporting just below the limit", () => {
    const almost = Array.from({ length: ACTIVITY_PAGE_LIMIT - 1 }, (_, i) =>
      execution(dayStart + i, "evaluated"),
    );
    expect(summarizeToday(almost, { dayStart, now })).toEqual({
      total: ACTIVITY_PAGE_LIMIT - 1,
      matched: 0,
      failed: 0,
    });
  });

  it("returns null for an empty page", () => {
    expect(summarizeToday([], { dayStart, now })).toBeNull();
    expect(buildTodayDigest(activity([]), now)).toBeNull();
  });

  it("returns null when today has zero executions even if yesterday has some", () => {
    const localNow = new Date(2026, 9, 27, 12, 0, 0, 0).getTime();
    const digest = buildTodayDigest(
      activity([
        execution(new Date(2026, 9, 25, 12, 0, 0, 0).getTime(), "failed"),
        execution(new Date(2026, 9, 26, 23, 0, 0, 0).getTime(), "matched"),
      ]),
      localNow,
    );
    expect(digest).toBeNull();
  });
});

describe("filterActivityToToday", () => {
  const localNow = new Date(2026, 9, 27, 12, 0, 0, 0).getTime();
  const yesterday = new Date(2026, 9, 26, 23, 59, 59, 999).getTime();
  const todayEarly = new Date(2026, 9, 27, 0, 0, 0, 1).getTime();

  it("keeps only today's rows and recomputes summary counts", () => {
    const filtered = filterActivityToToday(
      activity([
        execution(yesterday, "failed", "yesterday"),
        execution(todayEarly, "matched", "today-matched"),
        execution(todayEarly + 1, "evaluated", "today-evaluated"),
      ]),
      localNow,
    );
    expect(filtered.executions.map((e) => e.id)).toEqual(["today-matched", "today-evaluated"]);
    expect(filtered.counts.executions).toBe(2);
    expect(filtered.counts.matched).toBe(1);
    expect(filtered.counts.failed).toBe(0);
  });
});
