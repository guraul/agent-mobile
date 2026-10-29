import { describe, it, expect } from "vitest";
import type { OpenCodeMessage, OpenCodePart } from "./opencode-client";
import { needsMessageRefetch } from "./message-refetch";

function assistant(finish: string | undefined, parts: OpenCodePart[]): OpenCodeMessage {
  return {
    info: {
      id: "msg_1",
      role: "assistant",
      sessionID: "ses_1",
      time: { created: 1 },
      ...(finish ? { finish } : {}),
    },
    parts,
  };
}

const toolPart: OpenCodePart = { id: "p1", type: "tool", tool: "bash" };

describe("needsMessageRefetch", () => {
  it("tool-calls 且无 text part → true", () => {
    expect(needsMessageRefetch(assistant("tool-calls", [toolPart]))).toBe(true);
  });

  it("tool-calls 且 content 为空 → true", () => {
    expect(needsMessageRefetch(assistant("tool-calls", []))).toBe(true);
  });

  it("tool-calls 且只有空白 text → true（渲染等同无 text）", () => {
    expect(needsMessageRefetch(assistant("tool-calls", [{ id: "p2", type: "text", text: "  \n" }]))).toBe(true);
  });

  it("tool-calls 且有 text → false", () => {
    expect(
      needsMessageRefetch(assistant("tool-calls", [toolPart, { id: "p2", type: "text", text: "done" }])),
    ).toBe(false);
  });

  it("stop → false", () => {
    expect(needsMessageRefetch(assistant("stop", [toolPart]))).toBe(false);
  });

  it("空 / undefined → false", () => {
    expect(needsMessageRefetch(undefined)).toBe(false);
    expect(needsMessageRefetch(null)).toBe(false);
  });

  it("最后一条是 user 消息 → false", () => {
    const user: OpenCodeMessage = {
      info: { id: "msg_2", role: "user", sessionID: "ses_1", time: { created: 2 } },
      parts: [{ id: "p3", type: "text", text: "hi" }],
    };
    expect(needsMessageRefetch(user)).toBe(false);
  });

  it("assistant 没有 finish 字段 → false", () => {
    expect(needsMessageRefetch(assistant(undefined, [toolPart]))).toBe(false);
  });
});
