import { getBaseUrl } from "../../config/opencode";
import { tokenHeader, handleUnauthorized } from "../auth";

// Memory / KB client（Phase 6）：Memory tab 的 canonical 投影只读 + forget；
// KB search 入口（canonical = llm-wiki vault）。Memory ≠ Chat History（PM §6）：
// 这里展示的是 memx 提炼的 durable understanding，不是会话记录。

export interface UserMemoryItem {
  id: string;
  scope: "user";
  category: string;
  text: string;
  date: string;
  deprecated: boolean;
  updatedAt: string;
  source: string;
  sourceRef: string;
}

export interface ProjectMemoryItem {
  id: string;
  scope: "project";
  project: string;
  title: string;
  hook: string;
  sourceRef: string;
  updatedAt: number;
  content?: string;
}

export interface MemoryProjection {
  user: UserMemoryItem[];
  projects: Array<{ slug: string; entries: ProjectMemoryItem[] }>;
  source: string;
}

export interface KbHit {
  ref: string;
  title: string;
  snippet: string;
  updatedAt: number;
  scope: string;
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

export async function fetchMemories(): Promise<MemoryProjection> {
  const res = await fetch(`${getBaseUrl()}/api/product/memory`, { headers: authHeaders() });
  await ensureAuth(res);
  if (!res.ok) throw new Error(`memory list failed: ${res.status}`);
  return (await res.json()) as MemoryProjection;
}

/** Forget：project → memx .trash + index 移除；user → USER.md 弃用标记。作用于 canonical。 */
export async function forgetMemory(id: string, reason = "forgotten from Memory surface"): Promise<{ kind: "user" | "project" }> {
  const res = await fetch(`${getBaseUrl()}/api/product/memory/${id}`, {
    method: "DELETE",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  await ensureAuth(res);
  const body = (await res.json()) as { kind?: string; error?: string };
  if (!res.ok) throw new Error(body.error ?? `forget failed: ${res.status}`);
  return { kind: body.kind === "project" ? "project" : "user" };
}

export async function searchKb(query: string): Promise<{ configured: boolean; hits: KbHit[] }> {
  const res = await fetch(`${getBaseUrl()}/api/product/kb/search?q=${encodeURIComponent(query)}`, {
    headers: authHeaders(),
  });
  await ensureAuth(res);
  if (!res.ok) throw new Error(`kb search failed: ${res.status}`);
  return (await res.json()) as { configured: boolean; hits: KbHit[] };
}

// ── 分组/展示纯函数（可测）──

export interface MemoryGroup {
  key: string;
  label: string;
  items: Array<{ id: string; title: string; detail: string; updatedAtLabel: string; source: string }>;
}

export function buildMemoryGroups(projection: MemoryProjection): MemoryGroup[] {
  const groups: MemoryGroup[] = [];
  if (projection.user.length > 0) {
    groups.push({
      key: "user",
      label: "User",
      items: projection.user.map((u) => ({
        id: u.id,
        title: u.category,
        detail: u.text,
        updatedAtLabel: u.date,
        source: u.sourceRef,
      })),
    });
  }
  for (const p of projection.projects) {
    groups.push({
      key: p.slug,
      label: p.slug,
      items: p.entries.map((e) => ({
        id: e.id,
        title: e.title,
        detail: e.hook,
        updatedAtLabel: new Date(e.updatedAt).toISOString().slice(0, 10),
        source: e.sourceRef.split("/").slice(-2).join("/"),
      })),
    });
  }
  return groups;
}
