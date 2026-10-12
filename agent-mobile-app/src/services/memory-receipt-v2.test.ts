// 出口① 端到端映射链（2026-10-12）：用**真机抄下来的真实 v2 part 形状**跑通
//   服务端 assistant content → mapV2Message → mergeMessages/groupToolSteps → 回执 chip
// 数据来源：本机 opencode v2.0.26 真机跑 memory_write 后从 session_message.content 逐字抄出。
// 为什么需要它：单测分别覆盖了 mapV2Message 与 mergeMessages，但"真实 v2 载荷"这条链没被串起来
// （#83 那个 bug 就是链条两端对字段名假设不一致才漏掉的）。
import { describe, it, expect } from "vitest";
import { mapV2Message, type V2Message } from "./opencode-client";
import { mergeMessages, groupToolSteps } from "./message-merging";

/** 真机原样（只截断 reasoning 文本）：memory_write 直调后的 assistant 消息 */
const REAL_V2_ASSISTANT: V2Message = {
  id: "msg_1303946ff001XkQ2mVJb1nOBo",
  type: "assistant",
  sessionID: "ses_go_p0b",
  time: { created: 1791810905124 },
  content: [
    { type: "reasoning", text: "\n用户明确要求调用后只回复 DONE。" },
    {
      type: "tool",
      id: "call_abc1cb4ab3a144239128e208",
      name: "memory_write",
      state: {
        status: "completed",
        input: { text: "验证 codemode:false 后可直接调用", type: "reference", name: "direct-call-check" },
        content: [
          {
            type: "text",
            text: "✅ 已记住（reference · 新增）：direct-call-check\n   → /Users/gubin/.opencode/projects/private-tmp-memx-e2e-proj/.mem/reference_direct_call_check.md",
          },
        ],
        metadata: {},
      },
    },
    { type: "text", text: "DONE" },
  ],
};

describe("出口① 真机载荷 → 回执 chip（映射链集成）", () => {
  it("真实 v2 工具 part（结果在 state.content）最终产出 receipt 步", () => {
    const mapped = mapV2Message(REAL_V2_ASSISTANT);
    const steps = groupToolSteps(mergeMessages([mapped]));

    const receipt = steps.find((s) => s.kind === "receipt");
    expect(receipt).toBeDefined();
    const text = (receipt as { text: string }).text;
    // chip 自带 ✓ 图标 → 前导 ✅ 必须剥掉
    expect(text.startsWith("✅")).toBe(false);
    expect(text.startsWith("已记住（reference · 新增）：direct-call-check")).toBe(true);
    // 多行 + 路径一字不改（回执红线）
    expect(text).toContain("\n   → /Users/gubin/.opencode/projects/private-tmp-memx-e2e-proj/.mem/reference_direct_call_check.md");
    // 不进工具折叠组：没有 toolGroup，且 memory_write 不再是 tool 步
    expect(steps.some((s) => s.kind === "toolGroup")).toBe(false);
    expect(steps.filter((s) => s.kind === "tool")).toHaveLength(0);
    // 真机消息里的 reasoning / text 正常保留（顺序不被打乱）
    expect(steps.map((s) => s.kind)).toEqual(["reasoning", "receipt", "text"]);
  });

  it("真机 reasoning part 不被当成正文气泡（type=reasoning 落 reasoning 步）", () => {
    const steps = mergeMessages([mapV2Message(REAL_V2_ASSISTANT)]);
    const kinds = steps.map((s) => s.kind);
    expect(kinds).not.toContain("error");
    expect(steps[0]).toMatchObject({ kind: "reasoning" });
  });
});
