import { describe, it, expect } from "vitest";
import {
  applyMessageUpdated,
  applyPartUpdated,
  applyMessageRemoved,
} from "./message-reducer";
import type { OpenCodeMessage } from "./opencode-client";

const base: OpenCodeMessage[] = [
  {
    info: { id: "msg1", role: "user", sessionID: "s1", time: { created: 1 } },
    parts: [{ type: "text", text: "hello" }],
  },
];

describe("applyMessageUpdated", () => {
  it("updates existing message info", () => {
    const out = applyMessageUpdated(base, { id: "msg1", role: "user", sessionID: "s1", time: { created: 2 } });
    expect(out[0].info.time?.created).toBe(2);
    expect(out[0].parts).toEqual(base[0].parts);
  });

  it("inserts placeholder for a new message at the end (chronological)", () => {
    const out = applyMessageUpdated(base, { id: "msg9", role: "assistant", sessionID: "s1" });
    expect(out).toHaveLength(2);
    expect(out[1].info.id).toBe("msg9");
    expect(out[1].parts).toEqual([]);
  });

  it("inserts by creation time when an explicit timestamp is given", () => {
    const msgs: OpenCodeMessage[] = [
      { info: { id: "a", role: "assistant", sessionID: "s1", time: { created: 100 } }, parts: [] },
      { info: { id: "b", role: "assistant", sessionID: "s1", time: { created: 300 } }, parts: [] },
    ];
    const out = applyMessageUpdated(msgs, {
      id: "new",
      role: "assistant",
      sessionID: "s1",
      time: { created: 200 },
    });
    expect(out.map((m) => m.info.id)).toEqual(["a", "new", "b"]);
  });
});

describe("applyPartUpdated", () => {
  it("adds a new part to the target message", () => {
    const p = { id: "p1", messageID: "msg1", type: "text", text: "Hello " } as never;
    const out = applyPartUpdated(base, p);
    expect(out[0].parts).toHaveLength(2);
    expect(out[0].parts[1]).toEqual(p);
  });

  it("replaces an existing part by id", () => {
    const out = applyPartUpdated(base, { type: "text", text: "hi" } as never);
    // no id -> no-op
    expect(out[0].parts).toEqual(base[0].parts);

    const out2 = applyPartUpdated(base, {
      id: "p1",
      messageID: "msg1",
      type: "text",
      text: "replaced",
    } as never);
    expect(out2[0].parts).toEqual([
      { type: "text", text: "hello" },
      { id: "p1", messageID: "msg1", type: "text", text: "replaced" },
    ]);
  });

  it("ignores parts whose message is not present", () => {
    const out = applyPartUpdated(base, { id: "p1", messageID: "msg-x", type: "text" } as never);
    expect(out).toEqual(base);
  });
});

describe("applyMessageRemoved", () => {
  it("removes the message by id", () => {
    const out = applyMessageRemoved(base, "msg1");
    expect(out).toHaveLength(0);
  });

  it("leaves list intact when id absent", () => {
    const out = applyMessageRemoved(base, "nope");
    expect(out).toHaveLength(1);
  });
});
