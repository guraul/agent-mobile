import { describe, it, expect } from "vitest";
import { buildAttentionContext } from "./context";
import type { PulseAttentionItem } from "./store";

const item: PulseAttentionItem = {
  id: "att_1",
  domain: "market",
  title: "华宝医疗ETF联接C 估净 0.5832 高于目标 0.5745（+0.0087）",
  summary: "华宝医疗ETF联接C 估算净值 0.5832 已高于目标净值 0.5745，差 +0.0087。",
  subjectKind: "fund",
  subjectId: "012323",
  creationReasonRef: "market.target-nav-threshold",
  sessionId: null,
  createdAt: 1000,
  state: "open",
};

describe("buildAttentionContext（Phase 4：Attention → Talk 上下文）", () => {
  it("生成给 Agent 的最小上下文消息（subject/title/summary/domain/reason）", () => {
    const ctx = buildAttentionContext(item);
    expect(ctx.messageText).toContain("【来自 Pulse Attention】");
    expect(ctx.messageText).toContain(item.title);
    expect(ctx.messageText).toContain(item.summary);
    expect(ctx.messageText).toContain("fund:012323");
    expect(ctx.messageText).toContain("market.target-nav-threshold");
  });

  it("不泄露审计字段（dedup/provenance/时间戳不进对话）", () => {
    const ctx = buildAttentionContext(item);
    expect(ctx.messageText).not.toContain("dedup");
    expect(ctx.messageText).not.toContain("provenance");
    expect(ctx.messageText).not.toContain("att_1");
    expect(ctx.messageText).not.toContain("1000");
  });

  it("banner 提供会话内上下文卡内容", () => {
    const ctx = buildAttentionContext(item);
    expect(ctx.banner.title).toBe(item.title);
    expect(ctx.banner.summary).toBe(item.summary);
  });
});
