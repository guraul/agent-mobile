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
    expect(buildActivitySummary(activity())).toBe("近 7 天：执行 12 次 · 提醒 3 次 · 失败 1 次");
  });

  it("omits the failed segment when nothing failed", () => {
    const a = activity({
      windowDays: 3,
      counts: { executions: 2, matched: 0, failed: 0, attentionCreated: 0, attentionHandled: 0 },
    });
    expect(buildActivitySummary(a)).toBe("近 3 天：执行 2 次 · 提醒 0 次");
  });
});

describe("buildActivityEmptyText", () => {
  it("is one sentence, no illustration copy", () => {
    expect(buildActivityEmptyText()).toBe("这 7 天她没有需要动手的事");
    expect(buildActivityEmptyText(30)).toBe("这 30 天她没有需要动手的事");
  });
});

describe("activityOutcomeLabel", () => {
  it("maps every outcome to a chip label", () => {
    expect(activityOutcomeLabel("matched")).toBe("已命中");
    expect(activityOutcomeLabel("evaluated")).toBe("已检视");
    expect(activityOutcomeLabel("failed")).toBe("失败");
  });
});

describe("formatActivityTime", () => {
  const now = Date.parse("2026-10-27T12:00:00+08:00");

  it("uses relative wording inside a day", () => {
    expect(formatActivityTime(now - 30_000, now)).toBe("刚刚");
    expect(formatActivityTime(now - 5 * 60_000, now)).toBe("5 分钟前");
    expect(formatActivityTime(now - 3 * 3600_000, now)).toBe("3 小时前");
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
