import { describe, it, expect } from "vitest";
import { selectModels, DEFAULT_MODEL } from "./model-registry";

// 线上真实 provider 快照（2026-09-29 实测，仅保留与过滤决策相关的条目）
const providers = [
  {
    id: "deepseek",
    models: { "deepseek-flash": {}, "deepseek-v4-pro": {} },
  },
  {
    id: "siliconflow-cn",
    models: { "deepseek-ai/DeepSeek-V4-Flash": {}, "Pro/moonshotai/Kimi-K2.6": {} },
  },
  {
    id: "opencode",
    models: {
      "space-bunny-free": {},
      "mimo-v2.6-flash-free": {},
      "big-pickle": {},
    },
  },
  {
    id: "sensenova",
    models: { "kimi-k3": {}, "deepseek-v4-pro": {}, "deepseek-v4-flash": {} },
  },
];

describe("DEFAULT_MODEL", () => {
  it("是 opencode/mimo-v2.6-flash-free（实测可跑通）", () => {
    expect(DEFAULT_MODEL).toEqual({
      providerID: "opencode",
      modelID: "mimo-v2.6-flash-free",
    });
  });

  it("不是已下线的 deepseek-v4-flash", () => {
    expect(DEFAULT_MODEL.providerID).not.toBe("deepseek");
  });
});

describe("selectModels", () => {
  it("只保留 mimo 系列", () => {
    const r = selectModels(providers);
    expect(r.every((m) => m.modelID.toLowerCase().includes("mimo"))).toBe(true);
  });

  it("包含 opencode/mimo-v2.6-flash-free", () => {
    const r = selectModels(providers);
    expect(r).toContainEqual({
      providerID: "opencode",
      modelID: "mimo-v2.6-flash-free",
    });
  });

  it("排除整 provider siliconflow-cn", () => {
    const r = selectModels(providers);
    expect(r.some((m) => m.providerID === "siliconflow-cn")).toBe(false);
  });

  it("排除 deepseek provider 的 Pro 系", () => {
    const r = selectModels(providers);
    expect(r.some((m) => m.modelID.includes("pro"))).toBe(false);
  });

  it("排除 sensenova 的 deepseek-v4-pro（跨 provider 一并排除）", () => {
    const r = selectModels(providers);
    expect(
      r.some((m) => m.providerID === "sensenova" && m.modelID === "deepseek-v4-pro"),
    ).toBe(false);
  });

  it("排除 siliconflow 的 Pro/ 前缀 deepseek 系", () => {
    const r = selectModels([
      {
        id: "siliconflow-cn",
        models: { "Pro/deepseek-ai/DeepSeek-V3.2": {} },
      },
    ]);
    expect(r).toEqual([]);
  });

  it("非白名单模型（space-bunny / big-pickle / kimi）不出现", () => {
    const r = selectModels(providers);
    const ids = r.map((m) => m.modelID);
    expect(ids).not.toContain("space-bunny-free");
    expect(ids).not.toContain("big-pickle");
    expect(ids).not.toContain("kimi-k3");
  });

  it("providers 为空或无 models 时返回空数组", () => {
    expect(selectModels([])).toEqual([]);
    expect(selectModels([{ id: "opencode" }])).toEqual([]);
  });
});
