import { vi, describe, it, expect, beforeEach } from "vitest";
const { store } = vi.hoisted(() => ({ store: new Map<string, string>() }));
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: (k: string) => Promise.resolve(store.get(k) ?? null),
    setItem: (k: string, v: string) => { store.set(k, v); return Promise.resolve(); },
    removeItem: (k: string) => { store.delete(k); return Promise.resolve(); },
  },
}));
beforeEach(() => store.clear());

import { getRuntimeBaseUrl, setRuntimeBaseUrl, clearRuntimeBaseUrl } from "./bff-config";
import { opencodeConfig, getBaseUrl } from "../config/opencode";

describe("bff-config", () => {
  it("setRuntimeBaseUrl 持久化且 getRuntimeBaseUrl 读回", async () => {
    await setRuntimeBaseUrl("http://1.2.3.4:5678");
    expect(await getRuntimeBaseUrl()).toBe("http://1.2.3.4:5678");
  });

  it("clearRuntimeBaseUrl 清除", async () => {
    await setRuntimeBaseUrl("http://x:1");
    await clearRuntimeBaseUrl();
    expect(await getRuntimeBaseUrl()).toBeNull();
  });
});

describe("getBaseUrl", () => {
  beforeEach(() => { opencodeConfig.runtimeBaseUrl = null; });

  it("无覆盖时回退 env baseUrl", () => {
    expect(getBaseUrl()).toBe(opencodeConfig.baseUrl);
  });

  it("有覆盖时优先 runtimeBaseUrl", () => {
    opencodeConfig.runtimeBaseUrl = "http://override:9";
    expect(getBaseUrl()).toBe("http://override:9");
  });
});
