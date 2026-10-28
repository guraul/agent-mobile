import { afterEach, describe, expect, it } from "vitest";
import { BOUNDARY_TIERS } from "./boundaries";
import { setLocale, t } from "../../i18n";

const allKeys = BOUNDARY_TIERS.flatMap((tier) => [
  tier.labelKey,
  tier.captionKey,
  ...tier.items.flatMap((item) => [item.titleKey, item.detailKey]),
]);

describe("agency boundaries（How we work together 的数据源）", () => {
  afterEach(() => setLocale("en"));

  it("三层按授权从宽到严排列：先做后报 → 先问再做 → 绝不做", () => {
    expect(BOUNDARY_TIERS.map((tier) => tier.id)).toEqual([
      "actsThenTells",
      "asksFirst",
      "never",
    ]);
    expect(BOUNDARY_TIERS.every((tier) => tier.items.length > 0)).toBe(true);
  });

  it("每条边界的 id 全局唯一（testID 与对账都靠它）", () => {
    const ids = BOUNDARY_TIERS.flatMap((tier) => tier.items.map((item) => item.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("en / zh 都有文案，不会把 key 漏到界面上", () => {
    for (const locale of ["en", "zh"] as const) {
      setLocale(locale);
      for (const key of allKeys) {
        expect(t(key), `${locale} missing ${key}`).not.toBe(key);
        expect(t(key).trim()).not.toBe("");
      }
    }
  });
});
