import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getLocale,
  setLocale,
  t,
  translate,
  type Locale,
  type MessageKey,
} from "./index";

describe("i18n 引擎", () => {
  it("按 {name} 占位符插值", () => {
    const dict = { greeting: "Hi {name}, {count} new" };
    expect(translate(dict, "greeting", { name: "Ada", count: 3 })).toBe("Hi Ada, 3 new");
    // 未提供的占位符原样保留
    expect(translate(dict, "greeting", { name: "Ada" })).toBe("Hi Ada, {count} new");
  });

  it("count 为 1 取 _one，其余取 _other", () => {
    const dict = { "chat.files_one": "1 file", "chat.files_other": "{count} files" };
    expect(translate(dict, "chat.files", { count: 1 })).toBe("1 file");
    expect(translate(dict, "chat.files", { count: 0 })).toBe("0 files");
    expect(translate(dict, "chat.files", { count: 7 })).toBe("7 files");
  });

  it("没有复数变体时回落到 key 本身", () => {
    const dict = { "chat.files": "{count} files" };
    expect(translate(dict, "chat.files", { count: 2 })).toBe("2 files");
  });

  it("缺 key 返回 key 本身并只 warn 一次，不抛异常", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const key = "chat.missing.sample" as MessageKey;

    expect(() => t(key)).not.toThrow();
    expect(t(key)).toBe(key);
    expect(t(key)).toBe(key);

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain(key);
    warn.mockRestore();
  });
});

describe("语言切换", () => {
  afterEach(() => {
    setLocale("en");
  });

  it("默认 en，setLocale 后 t() 切换语言", () => {
    expect(getLocale()).toBe("en");
    expect(t("pulse.activity.title")).toBe("Lately");

    setLocale("zh");
    expect(getLocale()).toBe("zh");
    expect(t("pulse.activity.title")).toBe("最近");

    setLocale("en");
    expect(t("pulse.digest.allClear")).toBe("Nothing needs you right now.");
  });

  it("zh 必须实现 en 的全部 key（编译期保证）", () => {
    // @ts-expect-error - 故意漏掉 pulse.activity.title；satisfies 必须在编译期拒绝
    const incompleteZh = { "pulse.digest.allClear": "x", "pulse.header.settings": "y" } satisfies Record<
      MessageKey,
      string
    >;
    // 运行期只是普通对象；约束在 tsc 阶段生效（该指令若不再报错，tsc 会反过来报 unused directive）
    expect(incompleteZh).toBeTypeOf("object");
  });

  it("Locale 是封闭联合", () => {
    const locales: Locale[] = ["en", "zh"];
    expect(locales).toHaveLength(2);
  });
});

describe("market 同类合并组文案（#140）", () => {
  afterEach(() => {
    setLocale("en");
  });

  it("计数写在标题里，且不出现 'I merged'（描述结果，不描述管道）", () => {
    expect(t("pulse.marketGroup.title", { count: 3 })).toBe(
      "3 funds crossed the targets you set.",
    );
    expect(t("pulse.marketGroup.title", { count: 2 })).not.toMatch(/merged/i);
    expect(t("pulse.marketGroup.subtitle")).toBe("Today's check — kept together.");
  });

  it("zh 同样带计数（组标题永不出现 'one/1'）", () => {
    setLocale("zh");
    expect(t("pulse.marketGroup.title", { count: 3 })).toBe("3 只基金越过了你设定的目标。");
    expect(t("pulse.marketGroup.a11y", { count: 3 })).toContain("3");
  });
});
