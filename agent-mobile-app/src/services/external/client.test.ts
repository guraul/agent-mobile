import { afterEach, describe, expect, it, vi } from "vitest";

const { unauthorized } = vi.hoisted(() => ({ unauthorized: vi.fn() }));
vi.mock("../auth", () => ({
  tokenHeader: () => ({ Authorization: "Bearer t" }),
  handleUnauthorized: unauthorized,
}));

import {
  checkIcsUrl,
  createIcsSource,
  deleteIcsSource,
  fetchIcsSources,
  type IcsSourceItem,
} from "./client";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const item: IcsSourceItem = {
  id: "ics_1",
  url: "https://calendar.example.com/…c123.ics",
  label: "Personal",
  enabled: true,
  lastFetchedAt: null,
  lastError: null,
  createdAt: 1,
};

afterEach(() => {
  vi.unstubAllGlobals();
  unauthorized.mockReset();
});

describe("checkIcsUrl", () => {
  it("https + .ics 通过", () => {
    expect(checkIcsUrl("https://calendar.example.com/private/a.ics")).toEqual({ ok: true });
  });

  it("https + ical 路径通过", () => {
    expect(checkIcsUrl("https://calendar.example.com/ical/feed")).toEqual({ ok: true });
  });

  it("http / 非法 URL / 非 https 协议 → https", () => {
    expect(checkIcsUrl("http://calendar.example.com/a.ics")).toEqual({ ok: false, reason: "https" });
    expect(checkIcsUrl("not-a-url")).toEqual({ ok: false, reason: "https" });
    expect(checkIcsUrl("ftp://calendar.example.com/a.ics")).toEqual({ ok: false, reason: "https" });
  });

  it("不像订阅地址 → ics", () => {
    expect(checkIcsUrl("https://calendar.example.com/index.html")).toEqual({
      ok: false,
      reason: "ics",
    });
  });
});

describe("fetchIcsSources", () => {
  it("GET 返回 items", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ items: [item] }));
    vi.stubGlobal("fetch", fetchMock);

    expect(await fetchIcsSources()).toEqual([item]);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://106.13.181.13:19234/api/product/external/ics-sources",
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer t" }) }),
    );
  });

  it("空表 → []", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ items: [] })));
    expect(await fetchIcsSources()).toEqual([]);
  });

  it("401 → 触发登出并抛错", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ error: "未登录或登录已过期" }, 401)));
    await expect(fetchIcsSources()).rejects.toThrow("unauthorized");
    expect(unauthorized).toHaveBeenCalledTimes(1);
  });
});

describe("createIcsSource", () => {
  it("POST {url,label} → 返回 item", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ item }, 201));
    vi.stubGlobal("fetch", fetchMock);

    expect(await createIcsSource({ url: "https://calendar.example.com/a.ics", label: "Personal" })).toEqual(item);
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({
      url: "https://calendar.example.com/a.ics",
      label: "Personal",
    });
  });

  it("400 → 抛服务端错误文案（一行）", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ error: "url must use https" }, 400)));
    await expect(createIcsSource({ url: "http://x/a.ics" })).rejects.toThrow("url must use https");
  });
});

describe("deleteIcsSource", () => {
  it("200 → 正常返回", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ ok: true, deleted: "ics_1", events: 0 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(deleteIcsSource("ics_1")).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[0][0]).toBe(
      "http://106.13.181.13:19234/api/product/external/ics-sources/ics_1",
    );
  });

  it("404 → 抛 not_found", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ error: "not_found" }, 404)));
    await expect(deleteIcsSource("ics_missing")).rejects.toThrow("not_found");
  });
});
