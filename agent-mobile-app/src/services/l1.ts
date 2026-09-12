import { getBaseUrl } from "../config/opencode";
import { tokenHeader, handleUnauthorized } from "./auth";

// L1 client（Phase 10）：订阅 BFF /api/product/l1（snapshot）+ /api/product/l1/stream（SSE）。
// L1 = authorized informational presentation（PM §22）：无 lifecycle、无 obligation、不产生 Attention。
// 不再使用 legacy /api/events/stream。
//
// SSE 语义：每帧全量替换当前生效 statements（无逐条 add/remove protocol）。
// snapshot：首屏/重连对账。

export type L1Kind = "market-estimate" | "observation";

export interface L1Statement {
  id: string;
  kind: L1Kind;
  text: string;
  occurredAt: number;
  sourceRef: string;
  expiresAt: number | null;
  sourceKind: "deterministic" | "observation";
  data?: Record<string, unknown>;
}

/** L1 行情明细（来自 statement.data 投影；非原始 payload） */
export interface L1MarketEstimateData {
  code: string;
  name: string;
  estimatedNav: number;
  prevNav: number;
  changePct: number;
}

export interface L1Update {
  kind: "l1.updated";
  at: number;
  items: L1Statement[];
}

type Listener = (items: L1Statement[]) => void;
type ErrorListener = (err: unknown) => void;

function authHeaders(): Record<string, string> {
  return { ...tokenHeader(), Accept: "application/json" };
}

/** snapshot：当前全部生效 L1 statements（只读）。 */
export async function fetchL1(): Promise<L1Statement[]> {
  const res = await fetch(`${getBaseUrl()}/api/product/l1`, { headers: authHeaders() });
  if (res.status === 401) {
    await handleUnauthorized();
    throw new Error("unauthorized");
  }
  if (!res.ok) throw new Error(`l1 snapshot failed: ${res.status}`);
  const body = (await res.json()) as { items: L1Statement[] };
  return body.items ?? [];
}

function backoffDelay(attempt: number, baseMs = 250, maxMs = 30000): number {
  return Math.min(baseMs * 2 ** attempt, maxMs);
}

/**
 * 订阅 /api/product/l1/stream（SSE）。每帧全量替换。
 * - 未登录：300ms 短轮询等 token
 * - 断线：指数退避重连；重连成功先 fetchL1 snapshot 对账再订阅
 */
export function subscribeL1(
  onItems: Listener,
  onError?: ErrorListener,
): () => void {
  let cancelled = false;
  let controller: AbortController | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let attempt = 0;
  let hadConnection = false;

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
      const res = await fetch(`${getBaseUrl()}/api/product/l1/stream`, {
        headers: { ...auth, Accept: "text/event-stream" },
        signal: controller.signal,
      });
      if (res.status === 401) {
        await handleUnauthorized();
        return;
      }
      if (!res.ok || !res.body) throw new Error(`l1 stream ${res.status}`);
      attempt = 0;
      // 重连（非首连）→ 先 snapshot 对账
      if (hadConnection) {
        try { onItems(await fetchL1()); } catch { /* snapshot 失败由 stream 覆盖 */ }
      }
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
          const dataLine = chunk.split("\n").find((l) => l.startsWith("data:"));
          if (!dataLine) continue;
          try {
            const update = JSON.parse(dataLine.slice(5).trim()) as L1Update;
            if (update?.kind === "l1.updated" && Array.isArray(update.items)) {
              onItems(update.items);
            }
          } catch { /* heartbeat 等非 JSON 行 */ }
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

/** L1 statement → 跑马灯所需行情明细（projection；非法数据返回 null）。 */
export function toMarketEstimate(item: L1Statement): L1MarketEstimateData | null {
  const d = item.data as L1MarketEstimateData | undefined;
  if (!d || typeof d.code !== "string" || typeof d.estimatedNav !== "number") return null;
  return { code: d.code, name: d.name, estimatedNav: d.estimatedNav, prevNav: d.prevNav, changePct: d.changePct };
}
