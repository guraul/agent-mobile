import { describe, it, expect } from "vitest";
import { filterModels } from "./filter-models";

const list = [
  { providerID: "deepseek", modelID: "deepseek-v4-pro" },
  { providerID: "deepseek", modelID: "deepseek-v4-flash" },
  { providerID: "deepseek", modelID: "deepseek-v4-lite" },
];

describe("filterModels", () => {
  it("空 query 返回全量", () => {
    expect(filterModels(list, "")).toHaveLength(3);
  });

  it("子串过滤不分大小写", () => {
    const r = filterModels(list, "PRO");
    expect(r).toEqual([{ providerID: "deepseek", modelID: "deepseek-v4-pro" }]);
  });

  it("按 modelID 或 provider 匹配", () => {
    expect(filterModels(list, "flash")).toHaveLength(1);
    expect(filterModels(list, "deepseek")).toHaveLength(3);
  });

  it("无匹配返回空", () => {
    expect(filterModels(list, "xyz")).toHaveLength(0);
  });
});
