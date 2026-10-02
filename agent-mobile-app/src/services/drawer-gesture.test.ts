import { describe, expect, it } from "vitest";
import {
  clampDrawerTranslate,
  decideDrawerSnap,
  isHorizontalDrag,
} from "./drawer-gesture";

const W = 306;

describe("clampDrawerTranslate", () => {
  it("从关闭位右滑：跟手且夹在 [-W, 0]", () => {
    expect(clampDrawerTranslate(-W, 100, W)).toBe(-W + 100);
    expect(clampDrawerTranslate(-W, W * 2, W)).toBe(0); // 拖过头夹到全开
    expect(clampDrawerTranslate(-W, -50, W)).toBe(-W); // 反向不动
  });

  it("从打开位左滑：跟手且夹在 [-W, 0]", () => {
    expect(clampDrawerTranslate(0, -120, W)).toBe(-120);
    expect(clampDrawerTranslate(0, 40, W)).toBe(0);
    expect(clampDrawerTranslate(0, -W * 3, W)).toBe(-W);
  });

  it("width<=0 时不动作", () => {
    expect(clampDrawerTranslate(-W, 100, 0)).toBe(-W);
  });
});

describe("decideDrawerSnap", () => {
  it("快甩优先：向右甩开、向左甩关（不论位移）", () => {
    expect(decideDrawerSnap(10, W, 1.2)).toBe("open");
    expect(decideDrawerSnap(-10, W, -0.8)).toBe("close");
  });

  it("慢拖看 35% 宽度阈值", () => {
    expect(decideDrawerSnap(W * 0.36, W, 0)).toBe("open");
    expect(decideDrawerSnap(W * 0.34, W, 0)).toBe("close");
    expect(decideDrawerSnap(0, W, 0)).toBe("close");
  });

  it("宽度异常时退化为 80px 阈值", () => {
    expect(decideDrawerSnap(81, 0, 0)).toBe("open");
    expect(decideDrawerSnap(79, 0, 0)).toBe("close");
  });
});

describe("isHorizontalDrag", () => {
  it("水平意图判定：位移够且强于垂直", () => {
    expect(isHorizontalDrag(12, 2)).toBe(true);
    expect(isHorizontalDrag(12, 10)).toBe(false); // 垂直成分太强 → 让给列表滚动
    expect(isHorizontalDrag(5, 0)).toBe(false); // 位移不足
  });
});
