import { describe, it, expect, vi } from "vitest";
import {
  parseSSE,
  decodeSSEPayload,
  backoffDelay,
  createBatchedDispatcher,
} from "./opencode-events";

describe("parseSSE", () => {
  it("parses event + data lines", () => {
    const out = parseSSE("event: message\ndata: {\"a\":1}\n");
    expect(out).toEqual({ event: "message", data: '{"a":1}' });
  });

  it("parses BFF delta event data", () => {
    const out = parseSSE('event: message\ndata: {"type":"delta","properties":{"sessionID":"s","messageID":"m","partID":"p","field":"text","text":"hi"}}\n');
    expect(out?.event).toBe("message");
    expect(JSON.parse(out!.data).type).toBe("delta");
  });

  it("returns null when no data line", () => {
    expect(parseSSE("event: message\n")).toBeNull();
  });

  it("joins multiple data lines", () => {
    const out = parseSSE("data: line1\ndata: line2\n");
    expect(out?.data).toBe("line1\nline2");
  });
});

describe("decodeSSEPayload", () => {
  it("decodes payload wrapper", () => {
    const raw = JSON.stringify({ payload: { type: "message.updated", properties: { sessionID: "s1" } } });
    const ev = decodeSSEPayload(raw);
    expect(ev?.type).toBe("message.updated");
    expect(ev?.properties).toEqual({ sessionID: "s1" });
  });

  it("decodes bare event", () => {
    const ev = decodeSSEPayload(JSON.stringify({ type: "session.idle", properties: { sessionID: "s1" } }));
    expect(ev?.type).toBe("session.idle");
  });

  it("skips internal sync frames", () => {
    expect(decodeSSEPayload(JSON.stringify({ payload: { type: "sync", properties: {} } }))).toBeNull();
  });

  it("returns null on malformed json", () => {
    expect(decodeSSEPayload("not json")).toBeNull();
  });
});

describe("backoffDelay", () => {
  it("doubles and caps at max", () => {
    expect(backoffDelay(1)).toBe(250);
    expect(backoffDelay(2)).toBe(500);
    expect(backoffDelay(3)).toBe(1000);
    expect(backoffDelay(10)).toBe(30000);
  });
});

describe("createBatchedDispatcher", () => {
  it("coalesces many events into one flush per frame", () => {
    const onEvent = vi.fn();
    const dispatcher = createBatchedDispatcher(onEvent, (cb) => cb());
    dispatcher.push({ type: "message.updated", properties: { sessionID: "s" } } as never);
    dispatcher.push({ type: "message.updated", properties: { sessionID: "s" } } as never);
    dispatcher.push({ type: "message.updated", properties: { sessionID: "s" } } as never);
    expect(onEvent).toHaveBeenCalledTimes(3);
  });

  it("flushNow dispatches pending queue and drains it", () => {
    const onEvent = vi.fn();
    const dispatcher = createBatchedDispatcher(onEvent, () => {});
    dispatcher.push({ type: "server.connected", properties: {} } as never);
    expect(onEvent).not.toHaveBeenCalled();
    dispatcher.flushNow();
    expect(onEvent).toHaveBeenCalledTimes(1);
    dispatcher.flushNow();
    expect(onEvent).toHaveBeenCalledTimes(1);
  });

  it("dispose stops delivery", () => {
    const onEvent = vi.fn();
    const dispatcher = createBatchedDispatcher(onEvent, () => {});
    dispatcher.push({ type: "server.connected", properties: {} } as never);
    dispatcher.dispose();
    dispatcher.flushNow();
    expect(onEvent).not.toHaveBeenCalled();
  });
});
