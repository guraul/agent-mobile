import { describe, it, expect } from "vitest";
import { mergeMessages } from "./message-merging";
import type { OpenCodeMessage } from "./opencode-client";

function msg(id: string, role: "user" | "assistant", parts: unknown[]): OpenCodeMessage {
  return {
    info: { id, role, sessionID: "ses_x", time: { created: 1000 } },
    parts: parts as OpenCodeMessage["parts"],
  };
}

describe("mergeMessages", () => {
  it("keeps a single user message as one bubble", () => {
    const out = mergeMessages([msg("u1", "user", [{ type: "text", text: "hi" }])]);
    expect(out).toEqual([
      { id: "u1", role: "user", text: "hi", tools: [], createdAt: 1000 },
    ]);
  });

  it("merges consecutive assistant steps into one bubble", () => {
    const raw = [
      msg("a1", "assistant", [
        { type: "tool", tool: "bash", state: { status: "completed" } },
      ]),
      msg("a2", "assistant", [{ type: "text", text: "Done." }]),
    ];
    const out = mergeMessages(raw);
    expect(out).toHaveLength(1);
    expect(out[0].role).toBe("assistant");
    expect(out[0].text).toBe("Done.");
    expect(out[0].tools).toEqual([
      { tool: "bash", status: "completed", input: undefined },
    ]);
  });

  it("splits bubbles at user message boundaries", () => {
    const raw = [
      msg("u1", "user", [{ type: "text", text: "Q1" }]),
      msg("a1", "assistant", [{ type: "text", text: "A1" }]),
      msg("a2", "assistant", [{ type: "text", text: "A2" }]),
      msg("u2", "user", [{ type: "text", text: "Q2" }]),
      msg("a3", "assistant", [{ type: "text", text: "A3" }]),
    ];
    const out = mergeMessages(raw);
    expect(out.map((m) => [m.role, m.text])).toEqual([
      ["user", "Q1"],
      ["assistant", "A1\n\nA2"],
      ["user", "Q2"],
      ["assistant", "A3"],
    ]);
  });

  it("concatenates text across assistant steps and collects tools", () => {
    const raw = [
      msg("a1", "assistant", [
        { type: "tool", tool: "read", state: { status: "completed" } },
        { type: "text", text: "Step 1" },
      ]),
      msg("a2", "assistant", [
        { type: "tool", tool: "bash", state: { status: "completed" } },
        { type: "text", text: "Step 2" },
      ]),
    ];
    const out = mergeMessages(raw);
    expect(out[0].text).toBe("Step 1\n\nStep 2");
    expect(out[0].tools.map((t) => t.tool)).toEqual(["read", "bash"]);
  });

  it("drops assistant bubbles with no text and no tools", () => {
    const raw = [
      msg("u1", "user", [{ type: "text", text: "hi" }]),
      msg("a1", "assistant", [{ type: "step-start" }]),
    ];
    const out = mergeMessages(raw);
    expect(out).toHaveLength(1);
    expect(out[0].role).toBe("user");
  });

  it("does not include reasoning / step / compaction parts as text", () => {
    const raw = [
      msg("a1", "assistant", [
        { type: "reasoning", text: "thinking…" },
        { type: "text", text: "real answer" },
      ]),
    ];
    const out = mergeMessages(raw);
    expect(out[0].text).toBe("real answer");
  });
});
