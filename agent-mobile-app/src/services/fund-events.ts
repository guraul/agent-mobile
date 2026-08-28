import { opencodeConfig } from "../config/opencode";
import { tokenHeader } from "./auth";

export interface FundEstimateItem {
  code: string;
  name: string;
  estimatedNav: number;
  prevNav: number;
  changePct: number;
}

export interface FundTradeAlertItem {
  code: string;
  name: string;
  estimatedNav: number;
  targetNav: number;
  diff: number;
}

export interface FundEventMap {
  "fund.estimate": { funds: FundEstimateItem[] };
  "fund.trade-alert": { funds: FundTradeAlertItem[] };
  "server.heartbeat": Record<string, never>;
}

export type FundEventType = keyof FundEventMap;

export interface FundEvent<T extends FundEventType = FundEventType> {
  type: T;
  ts: number;
  data: FundEventMap[T];
}

/** 指数退避延迟（与 opencode-events 一致） */
function backoffDelay(attempt: number, baseMs = 250, maxMs = 30000): number {
  return Math.min(baseMs * 2 ** (attempt - 1), maxMs);
}

/**
 * 订阅 family-finance BFF 的通用事件流 `/api/events/stream`。
 * 复用 JWT（tokenHeader），断线指数退避重连。返回解绑函数。
 */
export function subscribeToFundEvents(
  onEvent: (event: FundEvent) => void,
  onError?: (err: unknown) => void,
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
      // 未登录——短间隔轮询 token 就绪（loadToken 异步写入内存），
      // 避免固定 3s 等待导致首包延迟（Pulse 跑马灯 vs 项目列表晚 3s）。
      reconnectTimer = setTimeout(connect, 300);
      return;
    }
    attempt++;
    try {
      const res = await fetch(`${opencodeConfig.baseUrl}/api/events/stream`, {
        headers: { ...auth, Accept: "text/event-stream" },
        signal: controller.signal,
      });
      if (res.status === 401) {
        // token 失效——停止重连，等待登录（Pulse 顶部横幅）
        return;
      }
      if (!res.ok || !res.body) {
        throw new Error(`events stream ${res.status}`);
      }
      attempt = 0;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (!cancelled) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const chunk = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          const dataLine = chunk.split("\n").find((l) => l.startsWith("data:"));
          if (!dataLine) continue;
          try {
            const payload = JSON.parse(dataLine.slice(5).trim());
            const type = payload?.type;
            if (type === "fund.estimate" || type === "fund.trade-alert") {
              onEvent(payload as FundEvent);
            }
          } catch {
            // 跳过无法解析的事件
          }
        }
      }
    } catch (err) {
      if (!cancelled && onError) onError(err);
    } finally {
      if (!cancelled) {
        reconnectTimer = setTimeout(connect, backoffDelay(attempt));
      }
    }
  }

  connect();
  return () => {
    cancelled = true;
    if (controller) controller.abort();
    if (reconnectTimer) clearTimeout(reconnectTimer);
  };
}
