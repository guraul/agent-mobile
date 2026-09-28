import { describe, expect, it } from "vitest";
import {
  light,
  lightColors,
  lightTypography,
  lightSpacing,
  lightRadius,
  lightSizes,
  lightGradient,
} from "./light";

/** 7-token 基础字阶键（D1 红线：缺一不可） */
const SEVEN_TOKENS = [
  "display",
  "pageTitle",
  "title",
  "body",
  "bodyStrong",
  "caption",
  "label",
] as const;

/** In motion 绿卡偏移字阶（D1：有意偏离，照抄 pulse.html schedule） */
const SCHEDULE_TOKENS = ["scheduleLabel", "scheduleTitle", "scheduleMeta"] as const;

const isPositiveInt = (n: number) => Number.isInteger(n) && n > 0;

describe("lightTypography", () => {
  it("7-token 字阶齐全", () => {
    for (const key of SEVEN_TOKENS) {
      expect(lightTypography, `缺 token: ${key}`).toHaveProperty(key);
    }
  });

  it("绿卡偏移字阶齐全（D1 偏离项）", () => {
    for (const key of SCHEDULE_TOKENS) {
      expect(lightTypography, `缺 token: ${key}`).toHaveProperty(key);
    }
  });

  it("所有 token 显式 lineHeight 且为正整数（RN 显式行高要求）", () => {
    for (const [key, style] of Object.entries(lightTypography)) {
      expect(
        isPositiveInt(style.lineHeight),
        `${key}.lineHeight = ${style.lineHeight} 应为正整数`
      ).toBe(true);
    }
  });

  it("lineHeight 遵循快照规则：display 照抄 mock 1.24，其余 round(fontSize × 1.45)", () => {
    // display 26 × 1.24 = 32.24 → 32（mock .greeting lh 1.24）
    expect(lightTypography.display.lineHeight).toBe(32);
    expect(lightTypography.display.fontSize).toBe(26);
    expect(lightTypography.display.fontWeight).toBe("400");

    // body 15，mock lh 1.5 → 22.5，统一落 22（round(15 × 1.45) 同值）
    expect(lightTypography.body.lineHeight).toBe(22);
    expect(lightTypography.bodyStrong.lineHeight).toBe(22);

    // 无 mock 行高的 token：round(fontSize × 1.45)
    expect(lightTypography.pageTitle.lineHeight).toBe(Math.round(24 * 1.45));
    expect(lightTypography.title.lineHeight).toBe(Math.round(17 * 1.45));
    expect(lightTypography.caption.lineHeight).toBe(Math.round(12 * 1.45));
    expect(lightTypography.label.lineHeight).toBe(Math.round(12 * 1.45));
  });

  it("7-token 无大写变换、无字距（D1：无 uppercase、letterSpacing 0）", () => {
    for (const key of SEVEN_TOKENS) {
      const style = lightTypography[key];
      expect(style.letterSpacing, `${key} 应无字距`).toBe(0);
    }
  });

  it("字重映射：display/caption/body=400，pageTitle/title/label/bodyStrong=600/700", () => {
    expect(lightTypography.display.fontWeight).toBe("400");
    expect(lightTypography.body.fontWeight).toBe("400");
    expect(lightTypography.caption.fontWeight).toBe("400");
    expect(lightTypography.pageTitle.fontWeight).toBe("700");
    expect(lightTypography.title.fontWeight).toBe("700");
    expect(lightTypography.bodyStrong.fontWeight).toBe("600");
    expect(lightTypography.label.fontWeight).toBe("600");
  });
});

describe("lightColors", () => {
  it("pulseB :root 核心色值正确（mock 快照）", () => {
    expect(lightColors.cream).toBe("#F7F5DC");
    expect(lightColors.greenCard).toBe("#B2D7B5");
    expect(lightColors.greenInner).toBe("#C8EBCB");
    expect(lightColors.ink).toBe("#0D0D0D");
    expect(lightColors.grayText).toBe("#9C9C9C");
    expect(lightColors.rowGray).toBe("#F0F0F0");
    expect(lightColors.accent).toBe("#8B5CF6");
    expect(lightColors.accentDeep).toBe("#6D4FD8");
    expect(lightColors.green).toBe("#5CBB63");
    expect(lightColors.upRed).toBe("#E5484D");
    expect(lightColors.peach).toBe("#F3BA8F");
  });

  it("review 页区分色与 rgba 结构色齐全", () => {
    expect(lightColors.amberDeep).toBe("#D97706"); // 详情页铃铛
    expect(lightColors.amber).toBe("#E5A13A"); // 首页 dot
    expect(lightColors.greenDeep).toBe("#2E7D32");
    expect(lightColors.scrim).toBe("rgba(10,10,10,.45)");
    expect(lightColors.handle).toBe("rgba(0,0,0,.18)");
    expect(lightColors.accentSubtle).toBe("rgba(139,92,246,.10)");
    expect(lightColors.accentBorder).toBe("rgba(139,92,246,.38)");
    expect(lightColors.peachHalo).toBe("rgba(243,186,143,.3)");
  });

  it("绿卡内文字色（11.5/14 偏移字阶专用）", () => {
    expect(lightColors.scheduleInk).toBe("#233323");
    expect(lightColors.rowInk).toBe("#101710");
    expect(lightColors.scheduleMeta).toBe("#4A5D4A");
  });
});

describe("lightSpacing / lightRadius / lightSizes", () => {
  it("页面与卡片布局刻度照抄 mock", () => {
    expect(lightSpacing.pageX).toBe(25); // .screen padding 0 25px
    expect(lightSpacing.cardPad).toBe(13); // .card padding
    expect(lightSpacing.cardGap).toBe(14); // .stack gap
    expect(lightSpacing.contentBottom).toBe(128); // dock 让位
  });

  it("圆角刻度照抄 mock", () => {
    expect(lightRadius.card).toBe(24);
    expect(lightRadius.inner).toBe(15);
    expect(lightRadius.row).toBe(14);
    expect(lightRadius.sheetTop).toBe(28);
    expect(lightRadius.pill).toBe(999);
  });

  it("组件尺寸刻度齐全", () => {
    expect(lightSizes.dot).toBe(6);
    expect(lightSizes.presenceDot).toBe(14);
    expect(lightSizes.chipHeight).toBe(30);
    expect(lightSizes.buttonHeight).toBe(42);
    expect(lightSizes.fieldHeight).toBe(44);
    expect(lightSizes.dockHeight).toBe(62);
    expect(lightSizes.fabSize).toBe(50);
  });
});

describe("lightGradient / light 聚合", () => {
  it("主行动作紫渐变三段（135deg #A78BFA → #8B5CF6 55% → #6D4FD8）", () => {
    expect(lightGradient.primary).toEqual(["#A78BFA", "#8B5CF6", "#6D4FD8"]);
  });

  it("light 聚合导出六段完整", () => {
    expect(Object.keys(light).sort()).toEqual(
      ["colors", "gradient", "radius", "sizes", "spacing", "typography"].sort()
    );
  });
});
