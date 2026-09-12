import { describe, it, expect } from "vitest";
import { toMarketEstimate, type L1Statement } from "./l1";

const statement = (over: Partial<L1Statement>): L1Statement => ({
  id: "l1.market.estimate:000001:trade:2026-09-07",
  kind: "market-estimate",
  text: "基金000001 估净 1.5000 昨 1.0000 +0.50%",
  occurredAt: Date.now(),
  sourceRef: "fund:000001",
  expiresAt: Date.now() + 3600000,
  sourceKind: "deterministic",
  ...over,
});

describe("toMarketEstimate projection", () => {
  it("market-estimate statement → 跑马灯明细", () => {
    const item = statement({
      data: { code: "000001", name: "基金000001", estimatedNav: 1.5, prevNav: 1.0, changePct: 0.5 },
    });
    const est = toMarketEstimate(item);
    expect(est).not.toBeNull();
    expect(est!.code).toBe("000001");
    expect(est!.changePct).toBe(0.5);
  });

  it("无 data / 数据不完整 → null（不渲染坏数据）", () => {
    expect(toMarketEstimate(statement({ data: undefined }))).toBeNull();
    expect(toMarketEstimate(statement({ data: { code: "000001" } as never }))).toBeNull();
    expect(toMarketEstimate(statement({ data: { code: "x", name: "y", estimatedNav: "bad", prevNav: 0, changePct: 0 } as never }))).toBeNull();
  });

  it("非 market-estimate kind → null", () => {
    expect(toMarketEstimate(statement({ kind: "other" as never }))).toBeNull();
  });
});
