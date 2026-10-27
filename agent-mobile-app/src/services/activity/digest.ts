import type { AgentActivity, AgentActivityExecution, AgentActivityOutcome } from "./client";

// 「她今天替你做了什么」——Tier1「先做后报」的最小实验（PM §14）。
// 纯只读：数据来自既有 agent-activity 端点，App 侧只做本地日界过滤与一句话格式化。
// 这里全部是纯函数（不读 Date.now、不碰 fetch），便于在任意时区下断言。

/** 与 BFF 的 AGENT_ACTIVITY_MAX_LIMIT 一致；取满即视为可能被截断。 */
export const ACTIVITY_PAGE_LIMIT = 50;

const COUNTED_OUTCOMES: ReadonlySet<AgentActivityOutcome> = new Set([
  "evaluated",
  "matched",
  "failed",
]);

export interface TodayDigestCounts {
  total: number;
  matched: number;
  failed: number;
}

/** 本地时区当天 00:00 的时间戳（客户端判「今天」，服务端窗口是滚动 24h）。 */
export function startOfLocalDay(now: number): number {
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * 从一页 executions 里汇总「今天」。返回 null 表示这一句不该出现：
 * - 页被取满（`length >= limit`）→ 窗口内可能还有被截掉的执行，少算不如不报；
 * - 今天没有计入 outcome 的执行 → 没有可陈述的事实。
 * `dayStart` 由调用方传入（而非函数内取本地时区），让跨零点测试不依赖运行环境时区。
 */
export function summarizeToday(
  executions: AgentActivityExecution[],
  opts: { dayStart: number; now: number; limit?: number },
): TodayDigestCounts | null {
  const limit = opts.limit ?? ACTIVITY_PAGE_LIMIT;
  if (executions.length >= limit) return null;

  let total = 0;
  let matched = 0;
  let failed = 0;
  for (const item of executions) {
    if (!COUNTED_OUTCOMES.has(item.outcome)) continue;
    if (item.at < opts.dayStart || item.at > opts.now) continue;
    total += 1;
    if (item.outcome === "matched") matched += 1;
    else if (item.outcome === "failed") failed += 1;
  }

  if (total === 0) return null;
  return { total, matched, failed };
}

/** 文案：失败优先于命中；只有全部 evaluated 才说 all clear。无感叹号 / emoji。 */
export function buildTodayDigestText(counts: TodayDigestCounts): string {
  const head = `I checked ${counts.total} ${counts.total === 1 ? "thing" : "things"} for you today`;
  if (counts.failed > 0) return `${head} — ${counts.failed} didn't run`;
  if (counts.matched > 0) return `${head} — ${counts.matched} raised a flag`;
  return `${head} — all clear`;
}

/** 端到端入口：本地日界过滤 + 截断检查 + 文案；null = 不渲染。 */
export function buildTodayDigest(
  activity: AgentActivity,
  now: number = Date.now(),
  limit: number = ACTIVITY_PAGE_LIMIT,
): string | null {
  const counts = summarizeToday(activity.executions, {
    dayStart: startOfLocalDay(now),
    now,
    limit,
  });
  return counts ? buildTodayDigestText(counts) : null;
}

/**
 * Sheet 的「今天」模式：只保留本地当天、且 outcome 计入的执行，并按同一口径重算
 * summary 用到的计数；行内容原样展示，不做二次加工。
 */
export function filterActivityToToday(activity: AgentActivity, now: number): AgentActivity {
  const dayStart = startOfLocalDay(now);
  const executions = activity.executions.filter(
    (item) =>
      COUNTED_OUTCOMES.has(item.outcome) && item.at >= dayStart && item.at <= now,
  );
  return {
    ...activity,
    counts: {
      ...activity.counts,
      executions: executions.length,
      matched: executions.filter((item) => item.outcome === "matched").length,
      failed: executions.filter((item) => item.outcome === "failed").length,
    },
    executions,
  };
}
