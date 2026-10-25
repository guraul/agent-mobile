// #61（S3+S2）：移交卡的 BFF 客户端（用户 JWT）。
//
// 端点由 homebase 侧另一 PR 提供；**上线晚于本 PR**——调用只在用户点「移交到工作台」
// 时发生，端点不存在时 fetch 失败 → 卡片转 error 态（不静默、不假数据兜底）。
//
// 顺序由 ChatPanelZ 编排：建 handoff → 建工程会话 → 投首条消息 → consume → 跳 /talk。
import { getBaseUrl } from "../../config/opencode";
import { tokenHeader, handleUnauthorized } from "../auth";

export type HandoffTargetKind = "new" | "existing";

/** 卡上「移交到工作台」要提交的东西（sourceSessionId 由 ChatPanelZ 补） */
export interface HandoffRequest {
  title?: string;
  body: string;
  targetKind: HandoffTargetKind;
  targetDirectory: string;
  /** 仅新建项目：只作会话标题 */
  targetName?: string;
}

export interface CreateHandoffBody extends HandoffRequest {
  sourceSessionId: string;
}

function authHeaders(): Record<string, string> {
  return { ...tokenHeader(), Accept: "application/json" };
}

async function throwIfUnauth(res: Response): Promise<void> {
  if (res.status === 401) {
    await handleUnauthorized();
    throw new Error("unauthorized");
  }
}

/** `POST /api/product/handoffs` → `{item:{id}, duplicate}`（失败抛错，调用方转卡片 error 态） */
export async function createHandoff(body: CreateHandoffBody): Promise<{ id: string }> {
  const res = await fetch(`${getBaseUrl()}/api/product/handoffs`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  await throwIfUnauth(res);
  const payload = (await res.json().catch(() => ({}))) as {
    item?: { id?: unknown };
    duplicate?: boolean;
    error?: string;
  };
  if (!res.ok) throw new Error(payload.error ?? `handoff failed: ${res.status}`);
  const id = payload.item?.id;
  if (typeof id !== "string" || !id.startsWith("hof_")) {
    throw new Error("handoff failed: 响应缺少 item.id");
  }
  return { id };
}

/** `POST /api/product/handoffs/{id}/consume` → 绑定工程会话（失败抛错，调用方只记日志） */
export async function consumeHandoff(id: string, sessionId: string): Promise<void> {
  const res = await fetch(`${getBaseUrl()}/api/product/handoffs/${encodeURIComponent(id)}/consume`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
  });
  await throwIfUnauth(res);
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? `handoff consume failed: ${res.status}`);
  }
}
