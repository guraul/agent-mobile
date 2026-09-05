import { getBaseUrl } from "../config/opencode";
import { tokenHeader, handleUnauthorized } from "./auth";

// 基金事件订阅（BFF /api/events/stream）。
// Phase 3 起本模块只消费 fund.estimate（L1 行情数据面，跑马灯呈现）——
// fund.trade-alert 已迁移为 Attention（/api/product/stream + useAttentions），
// 旧 ackTradeAlert（/api/events/ack）退役。/api/events/stream 本身由 BFF
// 保留为过渡 shim，待确认无外部 consumer 后退役（Phase 3 cleanup 记录）。

export interface FundEstimateItem {
  code: string;
  name: string;
  estimatedNav: number;
  prevNav: number;
  changePct: number;
}

export type FundStreamEvent =
  | { type: "fund.estimate"; data: { funds: FundEstimateItem[] } }
  | { type: string; data: unknown };

export interface FundEstimateEvent {
  type: "fund.estimate";
  ts: number;
  data: { funds: FundEstimateItem[] };
}

type Listener = (event: FundEstimateEvent) => void;
type ErrorListener = (err: unknown) => void;

function backoffDelay(attempt: number, baseMs = 250, maxMs = 30000): number {
  return Math.min(baseMs * 2 ** attempt, maxMs);
}

/**
 * 订阅 BFF /api/events/stream（SSE）。
 * - 未登录：300ms 短轮询等 token（与 attention client 同模式）
 * - 断线：指数退避重连
 */
export function subscribeToFundEvents(
  onEvent: Listener,
  onError?: ErrorListener,
): () => void {
  let cancelled = false;
  let controller: AbortController | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let attempt = 0;

  async function connect() {
    if (cancelled) return;
    controller = new AbortController();
    const auth = tokenHeader();
    if (!auth.Authorization) {
      reconnectTimer = setTimeout(connect, 300);
      return;
    }
    attempt++;
    try {
      const res = await fetch(`${getBaseUrl()}/api/events/stream`, {
        headers: { ...auth, Accept: "text/event-stream" },
        signal: controller.signal,
      });
      if (res.status === 401) {
        await handleUnauthorized();
        return;
      }
      if (!res.ok || !res.body) throw new Error(`event stream ${res.status}`);
      attempt = 0;
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
          const dataLine = chunk.split("\n").find((l) => l.startsWith("data:"));
          if (!dataLine) continue;
          try {
            const event = JSON.parse(dataLine.slice(5).trim()) as FundStreamEvent & { ts?: number };
            if (event.type === "fund.estimate") {
              onEvent({
                type: "fund.estimate",
                ts: event.ts ?? Date.now(),
                data: event.data as { funds: FundEstimateItem[] },
              });
            }
            // 其他类型（legacy trade-alert 等）不再消费——actionable 由 Attention 承载
          } catch { /* 非 JSON 行 */ }
        }
      }
      if (!cancelled) throw new Error("stream closed");
    } catch (err) {
      if (cancelled) return;
      onError?.(err);
      const delay = backoffDelay(attempt);
      reconnectTimer = setTimeout(connect, delay);
    } finally {
      controller = null;
    }
  }

  connect();

  return () => {
    cancelled = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    controller?.abort();
  };
}
