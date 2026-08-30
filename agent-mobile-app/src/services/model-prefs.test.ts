import { vi, describe, it, expect, beforeEach } from "vitest";
const { store } = vi.hoisted(() => ({ store: new Map<string, string>() }));
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: (k: string) => Promise.resolve(store.get(k) ?? null),
    setItem: (k: string, v: string) => { store.set(k, v); return Promise.resolve(); },
    removeItem: (k: string) => { store.delete(k); return Promise.resolve(); },
    getAllKeys: () => Promise.resolve([...store.keys()]),
  },
}));
beforeEach(() => store.clear());

import { getModelPref, setModelPref, loadModelPrefs } from "./model-prefs";

describe("model-prefs", () => {
  it("set/get 单 agent", async () => {
    await setModelPref("build", { providerID: "deepseek", modelID: "deepseek-v4-pro" });
    expect(await getModelPref("build")).toEqual({ providerID: "deepseek", modelID: "deepseek-v4-pro" });
  });

  it("覆盖单 agent 不影响其他", async () => {
    await setModelPref("build", { providerID: "deepseek", modelID: "a" });
    await setModelPref("plan", { providerID: "deepseek", modelID: "b" });
    expect(await getModelPref("build")).toEqual({ providerID: "deepseek", modelID: "a" });
    expect(await getModelPref("plan")).toEqual({ providerID: "deepseek", modelID: "b" });
  });

  it("loadModelPrefs 返回 map", async () => {
    await setModelPref("build", { providerID: "deepseek", modelID: "a" });
    const all = await loadModelPrefs();
    expect(all.build).toEqual({ providerID: "deepseek", modelID: "a" });
  });

  it("未配返回 null", async () => {
    expect(await getModelPref("design")).toBeNull();
  });
});
