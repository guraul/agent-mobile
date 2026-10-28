import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchNightlyRetryEnabled,
  setNightlyRetryEnabled,
  toggleNightlyRetry,
} from "./scheduler-toggle";

vi.mock("../../config/opencode", () => ({ getBaseUrl: () => "http://test" }));
vi.mock("../auth", () => ({
  tokenHeader: () => ({ Authorization: "Bearer test" }),
  handleUnauthorized: vi.fn(),
}));

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

const job = (enabled: boolean) => ({
  name: "nightly-retry",
  handler: "nightly-retry",
  schedule: "0 6 * * *",
  timezone: "Asia/Shanghai",
  enabled,
  running: true,
});

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("nightly-retry 状态读取", () => {
  it("从 /api/scheduler/jobs 里取 nightly-retry 的 enabled", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ jobs: [job(false), { ...job(true), name: "other" }] }),
    );

    await expect(fetchNightlyRetryEnabled()).resolves.toBe(false);
    expect(vi.mocked(fetch).mock.calls[0]![0]).toBe("http://test/api/scheduler/jobs");
  });

  it("job 不存在或接口失败 → 抛错（UI 禁用开关）", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ jobs: [] }));
    await expect(fetchNightlyRetryEnabled()).rejects.toThrow("nightly-retry not found");

    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}, 500));
    await expect(fetchNightlyRetryEnabled()).rejects.toThrow("scheduler jobs failed: 500");
  });
});

describe("nightly-retry 切换", () => {
  it("开启走 start、关闭走 stop，返回服务端确认值", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ job: job(true) }));
    await expect(setNightlyRetryEnabled(true)).resolves.toBe(true);
    expect(vi.mocked(fetch).mock.calls[0]![0]).toBe(
      "http://test/api/scheduler/nightly-retry/start",
    );

    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ job: job(false) }));
    await expect(setNightlyRetryEnabled(false)).resolves.toBe(false);
    expect(vi.mocked(fetch).mock.calls[1]![0]).toBe(
      "http://test/api/scheduler/nightly-retry/stop",
    );
  });

  it("成功：先乐观置新值，再用服务端结果校准", async () => {
    const apply = vi.fn();
    const request = vi.fn().mockResolvedValue(true);

    await expect(toggleNightlyRetry(false, true, apply, request)).resolves.toBe(true);
    expect(apply.mock.calls.map((c) => c[0])).toEqual([true, true]);
    expect(request).toHaveBeenCalledWith(true);
  });

  it("失败：回滚到切换前的值并抛出（调用方负责提示）", async () => {
    const apply = vi.fn();
    const request = vi.fn().mockRejectedValue(new Error("boom"));

    await expect(toggleNightlyRetry(false, true, apply, request)).rejects.toThrow("boom");
    expect(apply.mock.calls.map((c) => c[0])).toEqual([true, false]);
  });
});
