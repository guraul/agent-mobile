import { getBaseUrl } from "../../config/opencode";
import { tokenHeader, handleUnauthorized } from "../auth";
import type { AttentionChange, AttentionItem } from "./store";

// Attention client：REST snapshot + product SSE 增量（Phase 3 起 Pulse 的
// authoritative actionable 通道）。旧 /api/events/stream 不再被本模块使用。

function authHeaders(): Record<string, string> {
  return { ...tokenHeader(), Accept: "application/json" };
}

/** REST snapshot：初始加载 / SSE 重连后 reconcile */
export async function fetchAttentions(): Promise<AttentionItem[]> {
  const res = await fetch(`${getBaseUrl()}/api/product/attention`, {
    headers: authHeaders(),
  });
  if (res.status === 401) {
    await handleUnauthorized();
    throw new Error("unauthorized");
  }
  if (!res.ok) throw new Error(`attention list failed: ${res.status}`);
  const body = (await res.json()) as { items: AttentionItem[] };
  return body.items ?? [];
}

export async function dismissAttention(id: string): Promise<void> {
  const res = await fetch(`${getBaseUrl()}/api/product/attention/${id}/dismiss`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (res.status === 401) {
    await handleUnauthorized();
    throw new Error("unauthorized");
  }
  if (!res.ok) throw new Error(`dismiss failed: ${res.status}`);
}

export interface AttentionSubscription {
  unsubscribe: () => void;
}

/**
 * product SSE 增量订阅（attention.created / attention.updated）。
 * - 未登录：300ms 短轮询等 token（与 fund-events 同模式，避免首包延迟）
 * - 断线：指数退避重连；每次重连成功先回调 onReconnect（由 hook 触发 snapshot 对账）
 */
export function subscribeToAttentionEvents(opts: {
  onChange: (change: AttentionChange) => void;
  onStatus?: (connected: boolean) => void;
  onReconnect?: () => void;
}): AttentionSubscription {
  let cancelled = false;
  let controller: AbortController | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let attempt = 0;
  let hadConnection = false;

  async function connect() {
    if (cancelled) return;
    controller = new AbortController();
    if (!tokenHeader().Authorization) {
      retryTimer = setTimeout(connect, 300); // token 未就绪（loadToken 异步写入内存）
      return;
    }
    attempt++;
    try {
      const res = await fetch(`${getBaseUrl()}/api/product/stream`, {
        headers: { ...tokenHeader(), Accept: "text/event-stream" },
        signal: controller.signal,
      });
      if (res.status === 401) {
        await handleUnauthorized();
        return; // 停止重连，等登录
      }
      if (!res.ok || !res.body) throw new Error(`product stream ${res.status}`);
      attempt = 0;
      opts.onStatus?.(true);
      // 重连成功 → 对账快照（首次连接也对账，双保险）
      if (hadConnection) opts.onReconnect?.();
      hadConnection = true;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (!cancelled) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n\n")) !== -1) {
          const chunk = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          for (const line of chunk.split("\n")) {
            if (!line.startsWith("data:")) continue;
            try {
              const change = JSON.parse(line.slice(5).trim()) as AttentionChange;
              if (change?.kind && change.item) opts.onChange(change);
            } catch { /* heartbeat 等非 JSON 行 */ }
          }
        }
      }
      if (!cancelled) throw new Error("stream closed");
    } catch (err) {
      if (cancelled) return;
      opts.onStatus?.(false);
      const delay = Math.min(250 * 2 ** attempt, 30000);
      retryTimer = setTimeout(connect, delay);
      void err;
    }
  }

  connect();

  return {
    unsubscribe: () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      controller?.abort();
    },
  };
}
