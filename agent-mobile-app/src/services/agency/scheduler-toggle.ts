import { getBaseUrl } from "../../config/opencode";
import { tokenHeader, handleUnauthorized } from "../auth";

/**
 * 边界 sheet 里唯一可调项：夜间补跑（nightly-retry）的开关。
 *
 * 后端（homebase BFF）：
 * - `GET  /api/scheduler/jobs`        读全部 job，取 name=nightly-retry 的 enabled
 * - `POST /api/scheduler/<name>/start` 启用
 * - `POST /api/scheduler/<name>/stop`  停用
 *
 * 只碰 nightly-retry 这一个 job；其它边界条目没有写接口（Asks first / Never 保持只读）。
 */

export const NIGHTLY_RETRY_JOB = "nightly-retry";

export interface SchedulerJob {
  name: string;
  handler: string;
  schedule: string;
  timezone: string;
  enabled: boolean;
  running?: boolean;
}

function authHeaders(): Record<string, string> {
  return { ...tokenHeader(), Accept: "application/json" };
}

async function ensureAuth(res: Response): Promise<void> {
  if (res.status === 401) {
    await handleUnauthorized();
    throw new Error("unauthorized");
  }
}

/** 读当前状态。job 不存在也按失败处理——UI 据此禁用开关。 */
export async function fetchNightlyRetryEnabled(): Promise<boolean> {
  const res = await fetch(`${getBaseUrl()}/api/scheduler/jobs`, {
    headers: authHeaders(),
  });
  await ensureAuth(res);
  if (!res.ok) throw new Error(`scheduler jobs failed: ${res.status}`);
  const body = (await res.json()) as { jobs?: SchedulerJob[] };
  const job = body.jobs?.find((j) => j.name === NIGHTLY_RETRY_JOB);
  if (!job) throw new Error(`${NIGHTLY_RETRY_JOB} not found`);
  return job.enabled;
}

/** 切换开关。返回服务端确认后的状态（以 job.enabled 为准）。 */
export async function setNightlyRetryEnabled(enabled: boolean): Promise<boolean> {
  const action = enabled ? "start" : "stop";
  const res = await fetch(`${getBaseUrl()}/api/scheduler/${NIGHTLY_RETRY_JOB}/${action}`, {
    method: "POST",
    headers: authHeaders(),
  });
  await ensureAuth(res);
  if (!res.ok) throw new Error(`scheduler ${action} failed: ${res.status}`);
  const body = (await res.json()) as { job?: SchedulerJob };
  return body.job?.enabled ?? enabled;
}

/**
 * 乐观更新：先按 next 更新 UI，成功则用服务端返回值校准；
 * 失败回滚到 previous 并抛出（提示由调用方负责）。
 */
export async function toggleNightlyRetry(
  previous: boolean,
  next: boolean,
  apply: (enabled: boolean) => void,
  request: (enabled: boolean) => Promise<boolean> = setNightlyRetryEnabled,
): Promise<boolean> {
  apply(next);
  try {
    const confirmed = await request(next);
    apply(confirmed);
    return confirmed;
  } catch (err) {
    apply(previous);
    throw err;
  }
}
