import { describe, expect, it } from "vitest";
import { buildHandoffMessage } from "./handoff-message";

describe("#61 移交首条消息模板", () => {
  it("含正文与目标目录，并要求先给执行计划", () => {
    const msg = buildHandoffMessage({
      body: "目标：修掉首页缓存\n边界：只动 pulse\n落点：agent-mobile",
      directory: "/root/project/agent-mobile",
      sourceSessionId: "ses_abc",
    });
    expect(msg).toContain("以下是伴侣聊天里交接过来的一个任务。");
    expect(msg).toContain("目标：修掉首页缓存\n边界：只动 pulse\n落点：agent-mobile");
    expect(msg).toContain("/root/project/agent-mobile");
    expect(msg).toContain("来源会话 ses_abc");
    expect(msg).toContain("请先说明你的执行计划，再开始动手。");
  });

  it("正文两端空白被裁掉（不留多余空行）", () => {
    const msg = buildHandoffMessage({ body: "  \n  正文\n\n", directory: "/root/project/x" });
    expect(msg).toContain("\n正文\n");
    expect(msg).not.toContain("\n\n\n");
  });

  it("sourceSessionId 缺失 → 「交接信息」整行省略，且绝不出现 undefined", () => {
    for (const sourceSessionId of [undefined, null, "", "   "]) {
      const msg = buildHandoffMessage({ body: "正文", directory: "/root/project/x", sourceSessionId });
      expect(msg).not.toContain("交接信息");
      expect(msg).not.toContain("undefined");
      expect(msg).toContain("请先说明你的执行计划，再开始动手。");
    }
  });
});
