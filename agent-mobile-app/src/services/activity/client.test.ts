import { describe, it, expect } from "vitest";
import {
  buildActivitySummary,
  buildActivityEmptyText,
  activityOutcomeLabel,
  formatActivityTime,
  type AgentActivity,
} from "./client";

function activity(overrides: Partial<AgentActivity> = {}): AgentActivity {
  return {
    windowDays: 7,
    counts: { executions: 12, matched: 3, failed: 1, attentionCreated: 5, attentionHandled: 2 },
    executions: [],
    ...overrides,
  };
}

describe("buildActivitySummary", () => {
  it("renders the one-line summary from counts", () => {
    expect(buildActivitySummary(activity())).toBe(
      "Last 7 days · 12 ran · 3 raised a flag · 1 didn't run",
    );
  });

  it("omits the failed segment when nothing failed", () => {
    const a = activity({
      windowDays: 3,
      counts: { executions: 2, matched: 0, failed: 0, attentionCreated: 0, attentionHandled: 0 },
    });
    expect(buildActivitySummary(a)).toBe("Last 3 days · 2 ran · 0 raised a flag");
  });
});

describe("buildActivityEmptyText", () => {
  it("is one sentence, no illustration copy", () => {
    expect(buildActivityEmptyText()).toBe("Nothing needed doing in the last 7 days");
    expect(buildActivityEmptyText(30)).toBe("Nothing needed doing in the last 30 days");
  });
});

describe("activityOutcomeLabel", () => {
  it("maps every outcome to a chip label", () => {
    expect(activityOutcomeLabel("matched")).toBe("Raised a flag");
    expect(activityOutcomeLabel("evaluated")).toBe("Ran");
    expect(activityOutcomeLabel("failed")).toBe("Didn't run");
  });
});

describe("formatActivityTime", () => {
  const now = Date.parse("2026-10-27T12:00:00+08:00");

  it("uses relative wording inside a day", () => {
    expect(formatActivityTime(now - 30_000, now)).toBe("Just now");
    expect(formatActivityTime(now - 5 * 60_000, now)).toBe("5m ago");
    expect(formatActivityTime(now - 3 * 3600_000, now)).toBe("3h ago");
  });

  it("falls back to date + time beyond a day", () => {
    // 期望值按本地时区取分量，CI(UTC) 与开发机(+08) 都成立
    const at = new Date("2026-10-20T08:05:00+08:00");
    const pad = (n: number) => String(n).padStart(2, "0");
    const expected = `${pad(at.getMonth() + 1)}-${pad(at.getDate())} ${pad(at.getHours())}:${pad(at.getMinutes())}`;
    expect(formatActivityTime(at.getTime(), now)).toBe(expected);
    expect(formatActivityTime(at.getTime(), now)).toMatch(/^\d{2}-\d{2} \d{2}:\d{2}$/);
  });
});
