import { getBaseUrl } from "../../config/opencode";
import { tokenHeader, handleUnauthorized } from "../auth";

// 外部域 · ICS 只读订阅源（跨仓 issue guraul/agent-mobile#153 切片 3b）。
// BFF 契约（homebase `app/api/product/external/ics-sources`）：
// - GET  → `{items: IcsSourceItem[]}`，**`url` 已打码**（原始 URL 永不出服务端）；
// - POST → 201 `{item}`，body `{url, label?}`；
// - DELETE /:id → 200 `{ok, deleted, events}`，404 `{error:"not_found"}`。
// 前端不持有原始 URL：新增只提交一次，之后列表只显示打码值。

export interface IcsSourceItem {
  id: string;
  /** 打码后的地址（`https://host/…c123.ics`）；不是可再次提交的原值。 */
  url: string;
  label: string | null;
  enabled: boolean;
  lastFetchedAt: number | null;
  lastError: string | null;
  createdAt: number;
}

export type IcsUrlProblem = "https" | "ics";

/**
 * 前端基本校验（服务端仍会复核）：必须 https + 路径/query 含 `.ics` / `ical`。
 * 只用于"点 Add 之前的一句提示"，不替代服务端校验。
 */
export function checkIcsUrl(
  raw: string,
): { ok: true } | { ok: false; reason: IcsUrlProblem } {
  const url = raw.trim();
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, reason: "https" };
  }
  if (parsed.protocol !== "https:") return { ok: false, reason: "https" };
  if (!/(\.ics|ical)/i.test(`${parsed.pathname}${parsed.search}`)) {
    return { ok: false, reason: "ics" };
  }
  return { ok: true };
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

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  return body.error ?? `${fallback}: ${res.status}`;
}

export async function fetchIcsSources(): Promise<IcsSourceItem[]> {
  const res = await fetch(`${getBaseUrl()}/api/product/external/ics-sources`, {
    headers: authHeaders(),
  });
  await ensureAuth(res);
  if (!res.ok) throw new Error(await errorMessage(res, "calendar list failed"));
  const body = (await res.json()) as { items?: IcsSourceItem[] };
  return body.items ?? [];
}

export async function createIcsSource(input: {
  url: string;
  label?: string;
}): Promise<IcsSourceItem> {
  const res = await fetch(`${getBaseUrl()}/api/product/external/ics-sources`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  await ensureAuth(res);
  if (!res.ok) throw new Error(await errorMessage(res, "calendar add failed"));
  const body = (await res.json()) as { item: IcsSourceItem };
  return body.item;
}

export async function deleteIcsSource(id: string): Promise<void> {
  const res = await fetch(`${getBaseUrl()}/api/product/external/ics-sources/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  await ensureAuth(res);
  if (!res.ok) throw new Error(await errorMessage(res, "calendar remove failed"));
}
