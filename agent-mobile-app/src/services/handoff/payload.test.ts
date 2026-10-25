import { describe, expect, it } from "vitest";
import {
  extractHandoffBlock,
  validateHandoffPayload,
  HANDOFF_BODY_MAX,
  HANDOFF_TITLE_MAX,
  type HandoffPayload,
} from "./payload";

const VALID: HandoffPayload = { title: "把首页缓存修掉", body: "目标：修掉首页缓存\n边界：只动 pulse 模块\n落点：agent-mobile" };

function block(payload: unknown): string {
  return `好，这个思路可以。\n<!--handoff:${JSON.stringify(payload)}-->`;
}

describe("#61 移交卡隐藏块：提取 / 校验 / 剥离", () => {
  it("合法块 → payload + 正文已剥离隐藏块", () => {
    const { payload, cleanedText } = extractHandoffBlock(block(VALID));
    expect(payload).toEqual(VALID);
    expect(cleanedText).toBe("好，这个思路可以。");
    expect(cleanedText).not.toContain("handoff");
  });

  it("块在文本中间 → 前后保留并拼接（非末尾也不丢正文）", () => {
    const { payload, cleanedText } = extractHandoffBlock(`前文<!--handoff:${JSON.stringify(VALID)}-->后文`);
    expect(payload).not.toBeNull();
    expect(cleanedText).toBe("前文后文");
  });

  it("title 可省略；只有 body 也合法", () => {
    expect(validateHandoffPayload({ body: "只给正文" })).toEqual({ body: "只给正文" });
    expect(extractHandoffBlock(block({ body: "只给正文" })).payload).toEqual({ body: "只给正文" });
  });

  it("body 为空 / 只有空白 → 不出卡、文本原样", () => {
    for (const body of ["", "   \n  "]) {
      const raw = block({ body });
      const out = extractHandoffBlock(raw);
      expect(out.payload).toBeNull();
      expect(out.cleanedText).toBe(raw);
    }
  });

  it("body 超长（>4000）→ 不出卡、文本原样", () => {
    const raw = block({ body: "x".repeat(HANDOFF_BODY_MAX + 1) });
    const out = extractHandoffBlock(raw);
    expect(out.payload).toBeNull();
    expect(out.cleanedText).toBe(raw);
  });

  it("body 恰好 4000 → 合法（边界内）", () => {
    expect(validateHandoffPayload({ body: "x".repeat(HANDOFF_BODY_MAX) })).not.toBeNull();
  });

  it("非 JSON / 非对象 / body 非字符串 → 优雅降级（不出卡、不报错）", () => {
    for (const bad of ["<!--handoff:{不是 json}-->", "<!--handoff:[1,2]-->", "<!--handoff:\"x\"-->"]) {
      expect(() => extractHandoffBlock(bad)).not.toThrow();
      const out = extractHandoffBlock(`正文${bad}`);
      expect(out.payload).toBeNull();
      expect(out.cleanedText).toBe(`正文${bad}`);
    }
    expect(validateHandoffPayload({ body: 42 })).toBeNull();
    expect(validateHandoffPayload(null)).toBeNull();
    expect(validateHandoffPayload(undefined)).toBeNull();
  });

  it("title 超长 → 截断到 100（正文仍可用，不整块丢弃）", () => {
    const payload = validateHandoffPayload({ title: "标".repeat(150), body: "正文" });
    expect(payload?.title).toHaveLength(HANDOFF_TITLE_MAX);
    expect(payload?.body).toBe("正文");
  });

  it("没有块 → 原样返回", () => {
    const raw = "这只是普通回复。";
    expect(extractHandoffBlock(raw)).toEqual({ payload: null, cleanedText: raw });
  });

  it("残缺块（没有 -->）→ 提取器不出卡（展示层 stripHtmlComments 兜底剥离）", () => {
    const raw = "正文\n<!--handoff:{\"body\":\"x\"}";
    const out = extractHandoffBlock(raw);
    expect(out.payload).toBeNull();
    expect(out.cleanedText).toBe(raw);
  });

  it("其他隐藏标记（assignment-card / handoff-card）不被误认成移交块", () => {
    const raw = '<!--assignment-card:{"mode":"one-shot"}--><!--handoff-card:{"body":"x"}-->';
    expect(extractHandoffBlock(raw).payload).toBeNull();
  });
});
