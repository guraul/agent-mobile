import { describe, it, expect } from "vitest";
import { stripHtmlComments } from "./text-sanitize";

describe("stripHtmlComments（#71）", () => {
  it("剥离单行 HTML 注释", () => {
    expect(stripHtmlComments("回复\n<!-- STYLE_SIGNAL: {...} -->")).toBe("回复");
  });

  it("剥离跨行注释块（前文保留）", () => {
    const src = "一、二、三。\n\n<!-- STYLE_SIGNAL:\n{\"category\":\"communication\"}\n-->";
    expect(stripHtmlComments(src)).toBe("一、二、三。");
  });

  it("围栏代码块内的注释不剥离", () => {
    const src = "看这个：\n```html\n<!-- 真注释示例 -->\n```";
    expect(stripHtmlComments(src)).toBe(src);
  });

  it("无注释文本原样返回", () => {
    expect(stripHtmlComments("普通回复 **加粗**")).toBe("普通回复 **加粗**");
  });
});
