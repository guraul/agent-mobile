import { describe, it, expect } from "vitest";
import {
  assignmentCardReceipt,
  cardControls,
  cardNote,
  describeCardCondition,
  describeCardSchedule,
  extractAssignmentCard,
  isValidCron,
  phaseFromCardError,
  phaseFromCardResponse,
  toCardTrigger,
  validateCardPayload,
} from "./card-payload";
import type { FromCardResponse } from "./client";
import type { AssignmentCardPayload } from "./card-payload";

const VALID: AssignmentCardPayload = {
  mode: "one-shot",
  domain: "personal",
  responsibility: "18:00 提醒我吃药",
  schedule: "0 18 * * *",
  condition: { kind: "always" },
};

function block(payload: unknown): string {
  return `好，帮你定这个。\n<!--assignment-card:${JSON.stringify(payload)}-->`;
}

describe("extractAssignmentCard", () => {
  it("提取合法块并把块从显示文本里剥掉", () => {
    const { payload, cleanedText } = extractAssignmentCard(block(VALID));
    expect(payload).toEqual(VALID);
    expect(cleanedText).toBe("好，帮你定这个。");
    expect(cleanedText).not.toContain("assignment-card");
  });

  it("嵌套 condition（fund 条件）不会被非贪婪正则截断", () => {
    const p = { ...VALID, mode: "ongoing", domain: "market", schedule: "50 14 * * 1-5", condition: { kind: "fund-nav-above", fundCode: "PZ0526", value: 1.31 } };
    const { payload } = extractAssignmentCard(block(p));
    expect(payload?.condition).toEqual({ kind: "fund-nav-above", fundCode: "PZ0526", value: 1.31 });
  });

  it("支持多行 JSON", () => {
    const raw = `正文\n<!--assignment-card:\n${JSON.stringify(VALID, null, 2)}\n-->`;
    expect(extractAssignmentCard(raw).payload?.schedule).toBe("0 18 * * *");
  });

  it("无块 → 原样返回、不出卡", () => {
    expect(extractAssignmentCard("就是一句普通回复")).toEqual({ payload: null, cleanedText: "就是一句普通回复" });
  });

  it("JSON 破损 → 原样返回、不报错", () => {
    const raw = "正文\n<!--assignment-card:{不是 json}-->";
    expect(extractAssignmentCard(raw)).toEqual({ payload: null, cleanedText: raw });
  });

  it("cron 非法（段数不对）→ 原样返回", () => {
    for (const schedule of ["0 18 * *", "0 18 * * * *", ""]) {
      const raw = block({ ...VALID, schedule });
      expect(extractAssignmentCard(raw)).toEqual({ payload: null, cleanedText: raw });
    }
  });

  it("枚举外取值 → 原样返回", () => {
    for (const bad of [
      { ...VALID, mode: "weekly" },
      { ...VALID, domain: "finance" },
      { ...VALID, condition: { kind: "cron-x" } },
    ]) {
      const raw = block(bad);
      expect(extractAssignmentCard(raw)).toEqual({ payload: null, cleanedText: raw });
    }
  });

  it("缺字段 → 原样返回", () => {
    const { responsibility, ...noResp } = VALID;
    const { schedule, ...noSchedule } = VALID;
    const { condition, ...noCondition } = VALID;
    for (const bad of [noResp, noSchedule, noCondition, { kind: "always" }, null]) {
      const raw = block(bad);
      expect(extractAssignmentCard(raw)).toEqual({ payload: null, cleanedText: raw });
    }
  });

  it("fund 条件缺 fundCode / 缺 value → 原样返回", () => {
    for (const bad of [
      { ...VALID, condition: { kind: "fund-nav-above", value: 1.3 } },
      { ...VALID, condition: { kind: "fund-nav-below", fundCode: "PZ0526" } },
      { ...VALID, condition: { kind: "fund-nav-above", fundCode: "PZ0526", value: "1.3" } },
    ]) {
      const raw = block(bad);
      expect(extractAssignmentCard(raw)).toEqual({ payload: null, cleanedText: raw });
    }
  });

  it("块在正文中间也能剥掉", () => {
    const p = JSON.stringify(VALID);
    expect(extractAssignmentCard(`前<!--assignment-card:${p}-->后`).cleanedText).toBe("前后");
  });
});

describe("isValidCron / validateCardPayload", () => {
  it("五段合法 cron", () => {
    expect(isValidCron("0 18 * * *")).toBe(true);
    expect(isValidCron("50 14 * * 1-5")).toBe(true);
    expect(isValidCron(18)).toBe(false);
  });

  it("trim 后写入 payload", () => {
    const p = validateCardPayload({ ...VALID, responsibility: "  吃药  " });
    expect(p?.responsibility).toBe("吃药");
  });
});

describe("展示派生", () => {
  it("cron → 人话", () => {
    expect(describeCardSchedule("0 18 * * *")).toBe("每天 18:00");
    expect(describeCardSchedule("50 14 * * 1-5")).toBe("每个交易日 14:50");
    expect(describeCardSchedule("乱七八糟")).toBe("乱七八糟");
  });

  it("条件 → 人话（always 无附加条件）", () => {
    expect(describeCardCondition({ kind: "always" })).toBeNull();
    expect(describeCardCondition({ kind: "fund-nav-above", fundCode: "PZ0526", value: 1.31 })).toBe("基金 PZ0526 高于 1.31");
  });

  it("payload → trigger 时区固定 Asia/Shanghai、enabled", () => {
    const t = toCardTrigger(validateCardPayload(VALID)!);
    expect(t).toMatchObject({ kind: "schedule-rule", timezone: "Asia/Shanghai", enabled: true, schedule: "0 18 * * *" });
  });
});

describe("卡片判据", () => {
  const res = (over: Partial<FromCardResponse>): FromCardResponse => ({
    activated: true,
    assignmentId: "asg_1",
    proposalId: "prp_1",
    ...over,
  });

  it("ready：确认与补充都可点", () => {
    expect(cardControls({ kind: "ready" })).toEqual({ confirm: true, supplement: true, retry: false, busy: false });
  });

  it("submitting：全部禁用且 busy", () => {
    expect(cardControls({ kind: "submitting" })).toEqual({ confirm: false, supplement: false, retry: false, busy: true });
  });

  it("duplicateOf → duplicate 分支：不激活、按钮全禁、卡上提示", () => {
    const phase = phaseFromCardResponse(res({ activated: false, duplicateOf: "asg_old" }));
    expect(phase).toEqual({ kind: "duplicate", duplicateOf: "asg_old" });
    expect(cardControls(phase)).toEqual({ confirm: false, supplement: false, retry: false, busy: false });
    expect(cardNote(phase)).toBe("已有相同规则");
    expect(assignmentCardReceipt(VALID, res({ duplicateOf: "asg_old" }))).toBeNull();
  });

  it("activated → created；未激活 → 保留 proposalId", () => {
    expect(phaseFromCardResponse(res({}))).toMatchObject({ kind: "created", activated: true, assignmentId: "asg_1" });
    expect(phaseFromCardResponse(res({ activated: false, assignmentId: null }))).toMatchObject({ kind: "created", activated: false, proposalId: "prp_1" });
  });

  it("错误态可重试（confirm 关、retry 开）", () => {
    const phase = phaseFromCardError(new Error("from-card failed: 500"));
    expect(phase).toEqual({ kind: "failed", message: "from-card failed: 500" });
    expect(cardControls(phase)).toEqual({ confirm: false, supplement: false, retry: true, busy: false });
    expect(phaseFromCardError("boom")).toEqual({ kind: "failed", message: "boom" });
  });

  it("superseded（[补充] 后旧卡）按钮全禁", () => {
    expect(cardControls({ kind: "superseded" })).toEqual({ confirm: false, supplement: false, retry: false, busy: false });
  });

  it("成功回执带 assignment id；未激活回执带 proposalId", () => {
    expect(assignmentCardReceipt(VALID, res({}))).toContain("asg_1");
    expect(assignmentCardReceipt(VALID, res({ activated: false, assignmentId: null }))).toContain("prp_1");
  });
});
