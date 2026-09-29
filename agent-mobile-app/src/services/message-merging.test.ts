import { describe, it, expect } from "vitest";
import { mergeMessages,
  groupToolSteps,
} from "./message-merging";
import type { OpenCodeMessage } from "./opencode-client";

function msg(id: string, role: "user" | "assistant", parts: unknown[], created = 1000): OpenCodeMessage {
  return {
    info: { id, role, sessionID: "ses_x", time: { created } },
    parts: parts as OpenCodeMessage["parts"],
  };
}

describe("mergeMessages", () => {
  it("keeps a single user message as one step", () => {
    const out = mergeMessages([msg("u1", "user", [{ type: "text", text: "hi" }])]);
    expect(out).toEqual([{ kind: "user", id: "u1", text: "hi", createdAt: 1000 }]);
  });

  it("expands assistant parts into independent steps", () => {
    const out = mergeMessages([
      msg("a1", "assistant", [
        { type: "step-start", id: "p0" },
        { type: "reasoning", text: "thinking…", id: "p1" },
        { type: "tool", tool: "bash", state: { status: "completed" }, id: "p2" },
        { type: "text", text: "Done.", id: "p3" },
        { type: "step-finish", id: "p4" },
      ]),
    ]);
    expect(out.map((s) => s.kind)).toEqual([
      "reasoning", "tool", "text",
    ]);
    expect(out[1]).toMatchObject({ kind: "tool", tool: "bash" });
    expect(out[2]).toMatchObject({ kind: "text", text: "Done." });
  });

  it("keeps part order across multiple assistant messages in a turn", () => {
    const out = mergeMessages([
      msg("a1", "assistant", [{ type: "tool", tool: "read", state: { status: "completed" }, id: "p1" }]),
      msg("a2", "assistant", [{ type: "text", text: "Step 2", id: "p2" }]),
    ]);
    expect(out.map((s) => s.kind)).toEqual(["tool", "text"]);
  });

  it("drops empty text and ignored part types", () => {
    const out = mergeMessages([
      msg("u1", "user", [{ type: "text", text: "hi" }]),
      msg("a1", "assistant", [{ type: "text", text: "", id: "p1" }, { type: "snapshot", isSnapshot: true, id: "p2" }]),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe("user");
  });

  it("surfaces an assistant message error as an error step", () => {
    const errMsg = msg("a1", "assistant", [], 2000);
    (errMsg.info as { error?: string }).error = "Invalid API key";
    const out = mergeMessages([msg("u1", "user", [{ type: "text", text: "hi" }]), errMsg]);
    expect(out).toEqual([
      { kind: "user", id: "u1", text: "hi", createdAt: 1000 },
      { kind: "error", id: "a1", text: "Invalid API key", createdAt: 2000 },
    ]);
  });

  it("coerces an object error (NamedError) into a readable string", () => {
    const errMsg = msg("a1", "assistant", [], 2000);
    (errMsg.info as { error?: unknown }).error = {
      name: "ProviderAuthError",
      data: { providerID: "volcengine-plan", message: "Invalid API key" },
    };
    const out = mergeMessages([errMsg]);
    expect(out).toEqual([
      { kind: "error", id: "a1", text: "ProviderAuthError: Invalid API key", createdAt: 2000 },
    ]);
  });

  it("carries reasoning part text onto the reasoning step", () => {
    const out = mergeMessages([
      msg("a1", "assistant", [{ type: "reasoning", text: "let me check the docs", id: "p1" }]),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ kind: "reasoning", id: "p1", text: "let me check the docs" });
  });

  it("summarizes tool input string into inputSummary", () => {
    const out = mergeMessages([
      msg("a1", "assistant", [{ type: "tool", tool: "bash", input: "ls -la /root", state: { status: "completed" }, id: "p2" }]),
    ]);
    expect(out[0]).toMatchObject({ kind: "tool", tool: "bash", inputSummary: "ls -la /root" });
  });

  it("summarizes tool input object as collapsed json, truncated at 200 chars", () => {
    const long = "x".repeat(300);
    const out = mergeMessages([
      msg("a1", "assistant", [
        { type: "tool", tool: "read", input: { path: "/a" }, state: { status: "completed" }, id: "p1" },
        { type: "tool", tool: "write", input: { content: long }, state: { status: "completed" }, id: "p2" },
      ]),
    ]);
    expect(out[0]).toMatchObject({ inputSummary: '{"path":"/a"}' });
    expect((out[1] as { inputSummary?: string }).inputSummary?.length).toBe(201);
    expect((out[1] as { inputSummary?: string }).inputSummary?.endsWith("…")).toBe(true);
  });

  it("omits inputSummary when tool input is missing", () => {
    const out = mergeMessages([
      msg("a1", "assistant", [{ type: "tool", tool: "bash", state: { status: "completed" }, id: "p1" }]),
    ]);
    expect(out[0]).toMatchObject({ kind: "tool", tool: "bash" });
    expect((out[0] as { inputSummary?: string }).inputSummary).toBeUndefined();
  });
});

describe("groupToolSteps（#32 工具折叠组）", () => {
  it("连续 tool step 合并为一个 toolGroup，tools 原样透传", () => {
    const steps = mergeMessages([
      msg("a1", "assistant", [
        { type: "tool", tool: "read", input: { filePath: "/a.ts" }, state: { status: "completed", title: "a.ts", output: "content" }, id: "p1" },
        { type: "tool", tool: "bash", input: "ls", state: { status: "completed" }, id: "p2" },
        { type: "text", text: "done", id: "p3" },
        { type: "tool", tool: "bash", input: "pwd", state: { status: "completed" }, id: "p4" },
      ]),
    ]);
    const grouped = groupToolSteps(steps);
    expect(grouped.map((s) => s.kind)).toEqual(["toolGroup", "text", "toolGroup"]);
    const g0 = grouped[0] as Extract<typeof grouped[number], { kind: "toolGroup" }>;
    expect(g0.tools.map((t) => t.id)).toEqual(["p1", "p2"]);
    expect(g0.tools[0]).toMatchObject({ tool: "read", title: "a.ts", output: "content" });
    expect(g0.id).toBe("p1");
  });

  it("tool title/output/diffText 字段透传（#32 信息层）", () => {
    const diff = "--- a/x.ts\n+++ b/x.ts\n@@ -1 +1 @@\n-a\n+b\n";
    const out = mergeMessages([
      msg("a1", "assistant", [
        { type: "tool", tool: "edit", state: { status: "completed", title: "x.ts", output: "ok", metadata: { diff } }, id: "p1" },
      ]),
    ]);
    expect(out[0]).toMatchObject({ kind: "tool", title: "x.ts", output: "ok", diffText: diff });
  });

  it("无 state.title/output 时字段为 undefined（旧数据兼容）", () => {
    const out = mergeMessages([
      msg("a1", "assistant", [{ type: "tool", tool: "bash", input: "ls", state: { status: "completed" }, id: "p1" }]),
    ]);
    expect(out[0]).toMatchObject({ title: undefined, output: undefined, diffText: undefined });
  });
});
