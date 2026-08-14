import { opencodeConfig } from "../config/opencode";
import { tokenHeader, handleUnauthorized } from "./auth";
import type { QuestionInfo, QuestionRequest } from "./opencode-client";

export type OpenCodeEvent =
  | { type: "message.updated"; properties: { info: { id: string; sessionID: string }; sessionID: string } }
  | { type: "message.part.updated"; properties: { sessionID: string; messageID: string; part: Record<string, unknown> } }
  | { type: "message.removed"; properties: { sessionID: string; messageID: string } }
  | { type: "session.updated"; properties: { sessionID: string; info: Record<string, unknown> } }
  | { type: "session.idle"; properties: { sessionID: string } }
  | { type: "session.error"; properties: { sessionID: string; error: string } }
  | { type: "permission.updated"; properties: Record<string, unknown> }
  | { type: "server.connected"; properties: Record<string, unknown> }
  | { type: "delta"; properties: { sessionID: string; messageID: string; partID: string; field: string; text: string } }
  | { type: "stream.error"; properties: { error?: string } }
  // question tool: agent asks a clarifying question and blocks until answered
  | { type: "question.v2.asked"; properties: QuestionRequest }
  | { type: "question.v2.replied"; properties: { sessionID: string; requestID: string; answers?: string[][] } }
  | { type: "question.v2.rejected"; properties: { sessionID: string; requestID: string } }
  | { type: string; properties: Record<string, unknown> };

export interface ParsedSSE {
  event: string;
  data: string;
}

export function parseSSE(data: string): ParsedSSE | null {
  const lines = data.split("\n");
  let event = "message";
  const dataLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
    else if (line === "data") dataLines.push("");
  }
  if (dataLines.length === 0) return null;
  return { event, data: dataLines.join("\n") };
}

/** Parse a JSON SSE event payload into an OpenCodeEvent, skipping internal `sync` frames. */
export function decodeSSEPayload(raw: string): OpenCodeEvent | null {
  try {
    const parsed = JSON.parse(raw);
    const payload = parsed.payload ?? parsed;
    if (payload.type === "sync") return null;
    return { type: payload.type, properties: payload.properties } as OpenCodeEvent;
  } catch {
    return null;
  }
}

/** Exponential backoff delays for SSE reconnect (matches official opencode server SDK). */
export function backoffDelay(attempt: number, baseMs = 250, maxMs = 30_000): number {
  return Math.min(baseMs * 2 ** (attempt - 1), maxMs);
}

export interface BatchedDispatcher {
  push: (event: OpenCodeEvent) => void;
  flushNow: () => void;
  dispose: () => void;
}

const FLUSH_FRAME_MS = 16;

/**
 * Coalesce streamed events into a single dispatch per animation frame, matching the
 * official opencode web client's 16ms flush window. Falls back to setTimeout off the main
 * thread (e.g. Node) for testability.
 */
export function createBatchedDispatcher(
  onEvent: (event: OpenCodeEvent) => void,
  scheduleFrame: (cb: () => void) => unknown = typeof requestAnimationFrame === "function"
    ? (cb) => requestAnimationFrame(() => cb())
    : (cb) => setTimeout(cb, FLUSH_FRAME_MS),
): BatchedDispatcher {
  let queue: OpenCodeEvent[] = [];
  let scheduled = false;
  let disposed = false;

  const flush = () => {
    scheduled = false;
    if (disposed) return;
    if (queue.length === 0) return;
    const batch = queue;
    queue = [];
    for (const event of batch) onEvent(event);
  };

  const push = (event: OpenCodeEvent) => {
    if (disposed) return;
    queue.push(event);
    if (!scheduled) {
      scheduled = true;
      scheduleFrame(flush);
    }
  };

  return {
    push,
    flushNow: flush,
    dispose: () => {
      disposed = true;
      queue = [];
    },
  };
}

/**
 * Subscribe to the opencode server SSE event stream via fetch (v1 `/global/event`).
 * Events are coalesced into a per-frame batch. Reconnects with exponential backoff.
 * Returns an unsubscribe function.
 */
export function subscribeToOpenCodeEvents(
  onEvent: (event: OpenCodeEvent) => void,
  onError?: (err: unknown) => void,
  sessionID?: string,
): () => void {
  let cancelled = false;
  let controller: AbortController | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let attempt = 0;

  const dispatcher = createBatchedDispatcher(onEvent);
  const emit = (event: OpenCodeEvent) => dispatcher.push(event);

  async function connect() {
    if (cancelled) return;
    controller = new AbortController();
    const auth = tokenHeader();
    if (!auth.Authorization) {
      // not logged in yet — poll quietly for a token instead of hammering
      // the BFF with 401 requests every few seconds
      reconnectTimer = setTimeout(connect, 3000);
      return;
    }
    attempt++;
    try {
      const qs = sessionID ? `?sessionID=${encodeURIComponent(sessionID)}` : "";
      const res = await fetch(`${opencodeConfig.baseUrl}/api/opencode/stream${qs}`, {
        headers: { ...auth, Accept: "text/event-stream" },
        signal: controller.signal,
      });
      if (res.status === 401) {
        // token rejected — clear the session and stop reconnecting; the app
        // shows the login sheet, and connect() resumes once login stores a token
        await handleUnauthorized();
        return;
      }
      if (!res.ok || !res.body) {
        throw new Error(`event stream ${res.status}`);
      }
      attempt = 0; // connected — reset backoff
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
          const parsed = parseSSE(chunk);
          if (parsed && parsed.data) {
            const event = decodeSSEPayload(parsed.data);
            if (event) emit(event);
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
    dispatcher.dispose();
    controller?.abort();
    if (reconnectTimer) clearTimeout(reconnectTimer);
  };
}
