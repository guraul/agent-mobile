import { vi, describe, it, expect, afterEach } from "vitest";
import { probeBffHealth } from "./bff-health";

const ok = vi.fn();
afterEach(() => ok.mockReset());

describe("probeBffHealth", () => {
  it("2xx 返回 true", async () => {
    ok.mockResolvedValue({ ok: true, status: 200 });
    expect(await probeBffHealth("http://x", 1000, ok)).toBe(true);
  });

  it("非 2xx 返回 false", async () => {
    ok.mockResolvedValue({ ok: false, status: 500 });
    expect(await probeBffHealth("http://x", 1000, ok)).toBe(false);
  });

  it("抛错返回 false", async () => {
    ok.mockRejectedValue(new Error("net"));
    expect(await probeBffHealth("http://x", 1000, ok)).toBe(false);
  });
});
