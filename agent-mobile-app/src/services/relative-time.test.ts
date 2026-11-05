import { afterEach, describe, expect, it } from "vitest";
import { relativeDay } from "./relative-time";
import { setLocale, t } from "../i18n";

// 用本地日历构造时间，避免写死时区：跨零点 = 昨天，不是 24 小时差。
const at = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min).getTime();

afterEach(() => {
  setLocale("en");
});

describe("relativeDay", () => {
  it("同一天（哪怕差 14 小时）→ 今天", () => {
    const now = at(2026, 11, 5, 23, 0);
    expect(relativeDay(at(2026, 11, 5, 9, 0), now)).toEqual({ key: "pulse.continue.when.today", count: 0 });
  });

  it("时钟偏移（创建时间在未来）按今天处理，不出现负数", () => {
    const now = at(2026, 11, 5, 9, 0);
    expect(relativeDay(at(2026, 11, 5, 10, 0), now).key).toBe("pulse.continue.when.today");
  });

  it("跨零点 40 分钟 → 昨天（不是按 24 小时算）", () => {
    const now = at(2026, 11, 5, 0, 10);
    expect(relativeDay(at(2026, 11, 4, 23, 30), now)).toEqual({
      key: "pulse.continue.when.yesterday",
      count: 1,
    });
  });

  it("3 天前 / 7 天前仍按天", () => {
    const now = at(2026, 11, 5);
    expect(relativeDay(at(2026, 11, 2), now)).toEqual({ key: "pulse.continue.when.days", count: 3 });
    expect(relativeDay(at(2026, 10, 29), now)).toEqual({ key: "pulse.continue.when.days", count: 7 });
  });

  it("超过 7 天 → 周（四舍五入到最近的周，最小 1 周）", () => {
    const now = at(2026, 11, 5);
    expect(relativeDay(at(2026, 10, 28), now)).toEqual({ key: "pulse.continue.when.weeks", count: 1 }); // 8 天
    expect(relativeDay(at(2026, 10, 26), now)).toEqual({ key: "pulse.continue.when.weeks", count: 1 }); // 10 天
    expect(relativeDay(at(2026, 10, 22), now)).toEqual({ key: "pulse.continue.when.weeks", count: 2 }); // 14 天
  });

  it("key 在 en / zh 字典里都存在且渲染成文案", () => {
    const now = at(2026, 11, 5);
    const three = relativeDay(at(2026, 11, 2), now);
    expect(t(three.key, { count: three.count })).toBe("3 days ago");
    const two = relativeDay(at(2026, 10, 22), now);
    expect(t(two.key, { count: two.count })).toBe("2 weeks ago");

    setLocale("zh");
    expect(t(three.key, { count: three.count })).toBe("3 天前");
    expect(t(two.key, { count: two.count })).toBe("2 周前");
    expect(t("pulse.continue.when.today")).toBe("今天");
    expect(t("pulse.continue.when.yesterday")).toBe("昨天");
  });
});
