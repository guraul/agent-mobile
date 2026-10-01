import { describe, it, expect } from "vitest";
import { resolveAlertButtons, formatAlertLog } from "./alert-core";

describe("resolveAlertButtons", () => {
  it("无按钮时给一个「知道了」（原生 Alert 无按钮时点确定即关闭，语义一致）", () => {
    expect(resolveAlertButtons(undefined)).toEqual([{ text: "知道了", style: "default" }]);
  });

  it("空数组同样兜底", () => {
    expect(resolveAlertButtons([])).toEqual([{ text: "知道了", style: "default" }]);
  });

  it("有按钮时原样返回（含 cancel / destructive 与回调）", () => {
    const btns = [
      { text: "取消", style: "cancel" as const },
      { text: "去 Talk", style: "default" as const, onPress: () => {} },
    ];
    expect(resolveAlertButtons(btns)).toBe(btns);
  });

  it("保留 destructive 样式", () => {
    const btns = [{ text: "删除", style: "destructive" as const }];
    expect(resolveAlertButtons(btns)[0].style).toBe("destructive");
  });
});

describe("formatAlertLog", () => {
  it("无 message 时只输出标题", () => {
    expect(formatAlertLog({ title: "标记失败" })).toBe("[alert] 标记失败");
  });

  it("有 message 时拼成单行", () => {
    expect(formatAlertLog({ title: "操作失败", message: "network down" })).toBe(
      "[alert] 操作失败 — network down",
    );
  });

  it("空 message 不产生多余分隔符", () => {
    expect(formatAlertLog({ title: "标题", message: "" })).toBe("[alert] 标题");
  });
});