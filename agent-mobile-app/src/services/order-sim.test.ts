import { describe, it, expect } from "vitest";
import { mergeMessages } from "./message-merging";
import type { OpenCodeMessage } from "./opencode-client";

function msg(id: string, role: "user" | "assistant", text: string, created: number): OpenCodeMessage {
  return {
    info: { id, role, sessionID: "s1", time: { created } },
    parts: text ? [{ type: "text", text }] : [],
  };
}

// 模拟 ChatPanel 完整链路（chronological 语义，与真实 API 一致）：
// 1. loadMessages 拿到 chronological 列表（旧在前）
// 2. SSE 新消息到达 → applyMessageUpdated 按时间插入
// 3. recomputeDisplay: 按 created 排序 + mergeMessages（不 reverse）
describe("ChatPanel SSE 完整链路", () => {
  it("新 assistant 消息到达后显示在底部", () => {
    const now = Date.now();
    // 初始加载 (chronological): [旧回复, 用户提问, 回复A(初始最新)]
    let messages = [
      msg("m1", "assistant", "旧回复", now - 5 * 60 * 1000),
      msg("m2", "user", "用户提问", now - 4 * 60 * 1000),
      msg("m3", "assistant", "回复A(初始最新)", now - 3 * 60 * 1000),
    ];

    // SSE: 新的 assistant 消息到达（最终回复，时间最新）
    messages = [
      ...messages.map((m) => ({ ...m })),
      msg("m4", "assistant", "最终回复", now),
    ];

    // recomputeDisplay
    const display = mergeMessages([...messages].sort((a, b) => (a.info.time?.created ?? 0) - (b.info.time?.created ?? 0)));
    const last = display[display.length - 1];
    expect(last.kind).toBe("text");
    expect(last.text).toBe("最终回复");
  });

  it("新 user 消息到达后显示在底部", () => {
    const now = Date.now();
    let messages = [
      msg("m1", "assistant", "旧回复", now - 5 * 60 * 1000),
      msg("m2", "user", "用户提问", now - 4 * 60 * 1000),
    ];
    messages = [...messages, msg("m3", "user", "e2e-order-test", now)];

    const display = mergeMessages([...messages].sort((a, b) => (a.info.time?.created ?? 0) - (b.info.time?.created ?? 0)));
    const last = display[display.length - 1];
    expect(last.kind).toBe("user");
    expect(last.text).toBe("e2e-order-test");
  });
});
