import { getBaseUrl } from "../../config/opencode";
import { tokenHeader, handleUnauthorized } from "../auth";

/**
 * 边界 sheet 里的第二个可调项：积压提醒的触发阈值。
 *
 * 后端（homebase BFF）：
 * - `GET /api/product/backlog-nudge` → `{ threshold, allowed }`
 * - `PUT /api/product/backlog-nudge` `{ threshold }` → `{ threshold }`
 *
 * 只碰「几条算积压」这一个旋钮；冷却（3 天）与投递通道不可调。
 */

export const BACKLOG_THRESHOLD_OPTIONS = [3, 5, 10] as const;
export type BacklogThreshold = (typeof BACKLOG_THRESHOLD_OPTIONS)[number];
export const BACKLOG_THRESHOLD_DEFAULT: BacklogThreshold = 5;

function authHeaders(): Record<string, string> {
  return { ...tokenHeader(), Accept: "application/json" };
}

async function ensureAuth(res: Response): Promise<void> {
  if (res.status === 401) {
    await handleUnauthorized();
    throw new Error("unauthorized");
  }
}

function normalize(value: unknown): BacklogThreshold {
  return (BACKLOG_THRESHOLD_OPTIONS as readonly number[]).includes(value as number)
    ? (value as BacklogThreshold)
    : BACKLOG_THRESHOLD_DEFAULT;
}

/** 读当前阈值；接口不可用时回落到默认值（UI 仍可显示，不阻塞整页）。 */
export async function fetchBacklogThreshold(): Promise<BacklogThreshold> {
  const res = await fetch(`${getBaseUrl()}/api/product/backlog-nudge`, {
    headers: authHeaders(),
  });
  await ensureAuth(res);
  if (!res.ok) throw new Error(`backlog threshold failed: ${res.status}`);
  const body = (await res.json()) as { threshold?: unknown };
  return normalize(body.threshold);
}

/** 写阈值；返回服务端确认后的值。 */
export async function setBacklogThreshold(value: BacklogThreshold): Promise<BacklogThreshold> {
  const res = await fetch(`${getBaseUrl()}/api/product/backlog-nudge`, {
    method: "PUT",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ threshold: value }),
  });
  await ensureAuth(res);
  if (!res.ok) throw new Error(`backlog threshold update failed: ${res.status}`);
  const body = (await res.json()) as { threshold?: unknown };
  return normalize(body.threshold);
}
