import { getBaseUrl } from "../../config/opencode";
import { tokenHeader, handleUnauthorized } from "../auth";
import type { ProposalChange } from "./store";

// Proposal client（Phase 13）：proposal presentation SSE 订阅（PHASE13_DESIGN §9）。
// 连接现有 /api/product/stream（Attention 同一通道），只认 proposal.* kind——
// attention kind 由 attention/client.ts 的连接消费，两种 authority 互不转换。

export interface ProposalSubscription {
  unsubscribe: () => void;
}

/**
 * product SSE 增量订阅（proposal.created / proposal.updated）。
 * - 未登录：300ms 短轮询等 token（与 attention client 同模式）
 * - 断线：指数退避重连；每次重连成功先回调 onReconnect（由 hook 触发 snapshot 对账）
 */
export function subscribeProposalEvents(opts: {
  onChange: (change: ProposalChange) => void;
  onStatus?: (connected: boolean) => void;
  onReconnect?: () => void;
}): ProposalSubscription {
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
              const change = JSON.parse(line.slice(5).trim()) as ProposalChange;
              // 只认 proposal.* kind（attention kind 忽略；risk-4：SSE kind 自描述，按 kind 过滤）
              if (change?.kind?.startsWith("proposal.") && change.item) opts.onChange(change);
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
