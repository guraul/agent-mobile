import { describe, it, expect, vi, afterEach } from "vitest";
import { createHandoff, type CreateHandoffBody } from "./client";

// #61 移交卡 BFF 客户端：响应投影是 `{item, duplicate}`（homebase handoff 端点），
// id 在 item.id 里——曾经按顶层 payload.id 读，恒 undefined 导致移交必失败。

vi.mock("../../config/opencode", () => ({ getBaseUrl: () => "http://test" }));
vi.mock("../auth", () => ({
  tokenHeader: () => ({ Authorization: "Bearer test" }),
  handleUnauthorized: vi.fn(),
}));

const BODY: CreateHandoffBody = {
  body: "把 Pulse 首页的分组逻辑交接给新会话",
  title: "Pulse 分组交接",
  targetKind: "new",
  targetDirectory: "/Users/gubin/workspace/agent-mobile",
  sourceSessionId: "ses_source_1",
};

function stubFetch(payload: unknown, status = 201) {
  const fn = vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  }));
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe("createHandoff（POST /api/product/handoffs）", () => {
  it("{item:{id}, duplicate:false} → 返回 item.id", async () => {
    const fn = stubFetch({ item: { id: "hof_01ABC" }, duplicate: false });
    await expect(createHandoff(BODY)).resolves.toEqual({ id: "hof_01ABC" });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("空响应 {} → 抛错（不返回 undefined id）", async () => {
    stubFetch({});
    await expect(createHandoff(BODY)).rejects.toThrow("handoff failed: 响应缺少 item.id");
  });

  it("{item:{}, duplicate:true} → 抛错（id 缺失不静默）", async () => {
    stubFetch({ item: {}, duplicate: true });
    await expect(createHandoff(BODY)).rejects.toThrow("handoff failed: 响应缺少 item.id");
  });
});
