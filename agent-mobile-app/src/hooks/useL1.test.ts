import { describe, it, expect } from "vitest";
import { carryPersistents, projectNoticed } from "./useL1";
import type { L1Statement } from "../services/l1";

const statement = (over: Partial<L1Statement>): L1Statement => ({
  id: "agent_reports.deploy-failed:deploy-web:2026-11-08",
  kind: "deploy-failed",
  text: "部署失败：deploy-web workflow #123 未通过",
  occurredAt: Date.now(),
  sourceRef: "agent_report:deploy-failed",
  expiresAt: null,
  sourceKind: "deterministic",
  ...over,
});

describe("deploy-failed（homebase #183/#184，agent_reports 持久报告）", () => {
  it("进 Noticed 投影", () => {
    const noticed = projectNoticed([
      statement({}),
      statement({ id: "l1.market.estimate:000001", kind: "market-estimate" }),
    ]);
    expect(noticed.map((s) => s.kind)).toContain("deploy-failed");
    expect(noticed).toHaveLength(1);
  });

  it("SSE 帧全量替换后仍被 carried 保留（防「闪一下就没」）", () => {
    // 首帧/snapshot 含该 statement
    const prev = [statement({})];
    // 下一帧全量替换：/stream 不含 agent_reports，帧里没有它
    const nextFrame: L1Statement[] = [
      statement({ id: "observation:2026-11-08", kind: "observation" }),
    ];
    const merged = carryPersistents(prev, nextFrame);
    expect(merged.some((s) => s.kind === "deploy-failed")).toBe(true);
    expect(merged).toHaveLength(nextFrame.length + 1);
  });

  it("帧里已含同一条时不重复并回", () => {
    const merged = carryPersistents([statement({})], [statement({})]);
    expect(merged).toHaveLength(1);
  });

  it("过期的 deploy-failed 不再 carried", () => {
    const expired = [statement({ expiresAt: Date.now() - 1000 })];
    expect(carryPersistents(expired, [], Date.now())).toEqual([]);
  });
});

describe("kind 集合派生（新增 kind 只改 services/l1.ts 一处）", () => {
  it("非持久 kind（observation / calendar / market-estimate）不被 carried", () => {
    const prev: L1Statement[] = [
      statement({ id: "o1", kind: "observation", expiresAt: null }),
      statement({ id: "c1", kind: "calendar", expiresAt: null }),
      statement({ id: "m1", kind: "market-estimate", expiresAt: null }),
    ];
    const nextFrame: L1Statement[] = [];
    const merged = carryPersistents(prev, nextFrame);
    expect(merged).toHaveLength(0);
  });

  it("expiresAt === null 的持久报告必须被 carried", () => {
    const merged = carryPersistents([statement({ expiresAt: null })], []);
    expect(merged).toHaveLength(1);
    expect(merged[0].kind).toBe("deploy-failed");
  });

  it("已过期的持久报告不被 carried", () => {
    const merged = carryPersistents([statement({ expiresAt: Date.now() - 1000 })], []);
    expect(merged).toHaveLength(0);
  });

  it("projectNoticed 正反断言（deploy-failed/observation/calendar 进，market-estimate 不进）", () => {
    const got = projectNoticed([
      statement({ id: "d1", kind: "deploy-failed" }),
      statement({ id: "o1", kind: "observation" }),
      statement({ id: "c1", kind: "calendar" }),
      statement({ id: "m1", kind: "market-estimate" }),
    ]);
    expect(got.map((s) => s.kind).sort()).toEqual(["calendar", "deploy-failed", "observation"]);
  });
});
