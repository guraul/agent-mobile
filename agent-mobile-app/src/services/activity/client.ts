import { getBaseUrl } from "../../config/opencode";
import { tokenHeader, handleUnauthorized } from "../auth";

// Agent activity client（只读）：`GET /api/product/agent-activity` ——
// 「她最近替你做了什么」的事实清单（PM §14 自主性的可见化第一步）。
// 服务端只回白名单字段（id/title/at/outcome + 计数）；App 侧不做二次推导，
// 这里只负责取数与展示格式化（摘要行 / 相对时间 / outcome 标签）。

export type AgentActivityOutcome = "matched" | "evaluated" | "failed";

export interface AgentActivityExecution {
  id: string;
  title: string;
  at: number;
  outcome: AgentActivityOutcome;
}

export interface AgentActivityCounts {
  executions: number;
  matched: number;
  failed: number;
  attentionCreated: number;
  attentionHandled: number;
}

export interface AgentActivity {
  windowDays: number;
  counts: AgentActivityCounts;
  executions: AgentActivityExecution[];
}

export const DEFAULT_ACTIVITY_DAYS = 7;

function authHeaders(): Record<string, string> {
  return { ...tokenHeader(), Accept: "application/json" };
}

/** 只读取数：401 走统一登出处理，其余失败上抛（sheet 显示「暂时读不到记录」+ 重试）。 */
export async function fetchAgentActivity(
  days: number = DEFAULT_ACTIVITY_DAYS,
  limit?: number,
): Promise<AgentActivity> {
  const limitParam = limit === undefined ? "" : `&limit=${encodeURIComponent(String(limit))}`;
  const res = await fetch(`${getBaseUrl()}/api/product/agent-activity?days=${encodeURIComponent(String(days))}${limitParam}`, {
    headers: authHeaders(),
  });
  if (res.status === 401) {
    await handleUnauthorized();
    throw new Error("unauthorized");
  }
  if (!res.ok) throw new Error(`agent activity failed: ${res.status}`);
  return (await res.json()) as AgentActivity;
}

// ── 展示纯函数（可测；不含颜色/字号，样式仍在组件里走 theme）──

/**
 * 顶部摘要一行：`近 7 天：执行 12 次 · 提醒 3 次 · 失败 1 次`。
 * 「提醒」取 `matched`（评估命中 = 真的提醒到了你）；`attentionCreated` 是卡片口径，
 * 含未命中/凭据到期等非执行产生的条目，不在这一行混算。失败为 0 时不占位。
 */
export function buildActivitySummary(activity: AgentActivity, label?: string): string {
  const { windowDays, counts } = activity;
  const parts = [`执行 ${counts.executions} 次`, `提醒 ${counts.matched} 次`];
  if (counts.failed > 0) parts.push(`失败 ${counts.failed} 次`);
  return `${label ?? `近 ${windowDays} 天`}：${parts.join(" · ")}`;
}

/** 空态一句话（不插画）：窗口内她确实没动过手。 */
export function buildActivityEmptyText(windowDays: number = DEFAULT_ACTIVITY_DAYS): string {
  return `这 ${windowDays} 天她没有需要动手的事`;
}

const OUTCOME_LABELS: Record<AgentActivityOutcome, string> = {
  matched: "已命中",
  evaluated: "已检视",
  failed: "失败",
};

export function activityOutcomeLabel(outcome: AgentActivityOutcome): string {
  return OUTCOME_LABELS[outcome] ?? OUTCOME_LABELS.evaluated;
}

/** 列表相对时间（过去向）：刚刚 / N 分钟前 / N 小时前 / MM-DD HH:mm。 */
export function formatActivityTime(epoch: number, now: number = Date.now()): string {
  const diff = now - epoch;
  if (!Number.isFinite(diff)) return "";
  if (diff < 60_000) return "刚刚";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3600_000)} 小时前`;
  const d = new Date(epoch);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
