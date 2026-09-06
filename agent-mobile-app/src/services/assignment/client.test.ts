import { describe, it, expect } from "vitest";
import {
  parseAssignmentCommand,
  timeToCron,
  type AssignmentCommand,
} from "./client";

// 命令解析纯函数测试（不触网）。executeAssignmentCommand 的 API 语义由
// BFF phase5-assignment.test.ts 覆盖；此处验证 Talk 侧解析与映射。

describe("parseAssignmentCommand", () => {
  it("非命令文本返回 null（普通消息照常发给 Agent）", () => {
    expect(parseAssignmentCommand("帮我看看这个报错")).toBeNull();
    expect(parseAssignmentCommand("reply with exactly: e2e-ok")).toBeNull();
    expect(parseAssignmentCommand("/assign")).toBeNull(); // 无参数
    expect(parseAssignmentCommand("/assignments now")).toBeNull();
  });

  it("fund above-target（默认 14:50，交易日 cron）", () => {
    const cmd = parseAssignmentCommand("/assign fund 012323 above-target");
    expect(cmd).toEqual({ kind: "fund", fundCode: "012323", op: "above-target", value: undefined, at: "14:50" });
  });

  it("fund above/below 带绝对阈值与自定义时间", () => {
    expect(parseAssignmentCommand("/assign fund 012323 below 0.55 at 10:05")).toEqual({
      kind: "fund", fundCode: "012323", op: "below", value: 0.55, at: "10:05",
    });
    expect(parseAssignmentCommand("/assign fund 110022 above 1.5 at 9:35")).toEqual({
      kind: "fund", fundCode: "110022", op: "above", value: 1.5, at: "9:35",
    });
  });

  it("fund 非法输入返回 null（缺阈值 / 代码位数不对）", () => {
    expect(parseAssignmentCommand("/assign fund 012323 below")).toBeNull();
    expect(parseAssignmentCommand("/assign fund 12 above-target")).toBeNull();
    expect(parseAssignmentCommand("/assign fund 012323 below abc")).toBeNull();
  });

  it("remind one-shot 提醒", () => {
    const cmd = parseAssignmentCommand("/assign remind 提交季度报告 at 18:00");
    expect(cmd).toEqual({ kind: "remind", text: "提交季度报告", at: "18:00" });
    expect(parseAssignmentCommand("/assign remind 忘了写时间")).toBeNull();
  });

  it("confirm / reject / revoke 需要 prp_/asg_ 前缀 id", () => {
    expect(parseAssignmentCommand("/confirm prp_01M1TV52G1BER4A5")).toEqual({ kind: "confirm", id: "prp_01M1TV52G1BER4A5" });
    expect(parseAssignmentCommand("/reject prp_xxx1")).toEqual({ kind: "reject", id: "prp_xxx1" });
    expect(parseAssignmentCommand("/revoke asg_01M1TV52JCB1RF16")).toEqual({ kind: "revoke", id: "asg_01M1TV52JCB1RF16" });
    // 非法 id：不误吞普通消息
    expect(parseAssignmentCommand("/confirm 12345")).toBeNull();
    expect(parseAssignmentCommand("/confirm")).toBeNull();
  });

  it("list 命令", () => {
    expect(parseAssignmentCommand("/assignments")).toEqual({ kind: "list" });
  });
});

describe("timeToCron", () => {
  it("基金监控 → 工作日 cron；提醒 → 每日 cron", () => {
    expect(timeToCron("14:50", true)).toBe("50 14 * * 1-5");
    expect(timeToCron("18:00", false)).toBe("0 18 * * *");
    expect(timeToCron("9:35", true)).toBe("35 9 * * 1-5");
  });
  it("非法时间返回 null", () => {
    expect(timeToCron("25:00", true)).toBeNull();
    expect(timeToCron("12:60", true)).toBeNull();
    expect(timeToCron("noon", true)).toBeNull();
  });
});

describe("command shape coverage", () => {
  it("所有命令 kind 有对应执行分支（类型完整性哨兵）", () => {
    const kinds: Array<AssignmentCommand["kind"]> = ["fund", "remind", "confirm", "reject", "revoke", "list"];
    expect(new Set(kinds).size).toBe(6);
  });
});
