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

import { setUsername, getUsername, clearUsername } from "./auth";

describe("username 持久化", () => {
  it("setUsername 存 getUsername 读回", async () => {
    await setUsername("admin");
    expect(await getUsername()).toBe("admin");
  });

  it("clearUsername 清除", async () => {
    await setUsername("admin");
    await clearUsername();
    expect(await getUsername()).toBeNull();
  });
});
