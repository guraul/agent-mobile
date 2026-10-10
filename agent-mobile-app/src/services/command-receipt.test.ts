import { describe, expect, it } from "vitest";
import {
  appendReceipt,
  makeReceiptId,
  makeReceiptStep,
  RECEIPT_KEEP,
} from "./command-receipt";
import type { ReceiptStep } from "./message-merging";

// executeAssignmentCommand 的真实返回形态（多行！单行截断回归的两个受害场景）
const LIST_FEEDBACK =
  "生效中的 Assignment（2）：\n· asg_7QW3K2M [market/ongoing] 每个交易日 14:50 监控基金 000001 估净是否达到目标净值\n· asg_9ZX1B4C [personal/one-shot] 09:00 提醒我：开会";
const PROPOSAL_FEEDBACK =
  "已创建提案（等待你的确认——市场监控是持续责任）\nProposal: prp_4KQ8Z2T\n每个交易日 14:50 监控基金 000002 是否高于 1.5\n\n回复 /confirm prp_4KQ8Z2T 激活，或 /reject prp_4KQ8Z2T 放弃。";

/** 造 n 条回执步（id 可预测，便于断言裁剪后的顺序） */
const steps = (n: number): ReceiptStep[] =>
  Array.from({ length: n }, (_, i) => makeReceiptStep(`m${i}`, 1000 + i));

describe("makeReceiptStep", () => {
  it("kind=receipt，createdAt 取注入的 now", () => {
    const s = makeReceiptStep("已撤销：asg_7QW3K2M", 4242);
    expect(s.kind).toBe("receipt");
    expect(s.createdAt).toBe(4242);
    expect(s.text).toBe("已撤销：asg_7QW3K2M");
  });

  it("剥离前导可读勾 ✓（chip 自带图标，避免渲染成 \"✓ ✓\"）", () => {
    expect(makeReceiptStep("✓ 已撤销：asg_7QW3K2M\n未来触发已停止", 1).text)
      .toBe("已撤销：asg_7QW3K2M\n未来触发已停止");
    // 只剥首段（一个 ✓ + 其后空白）：真实反馈都是 "✓ xxx"，不会出现连续勾
    expect(makeReceiptStep("✓✓  重试成功", 1).text).toBe("✓  重试成功");
    // 行中间的 ✓ 不动
    expect(makeReceiptStep("第一行\n✓ 第二行", 1).text).toBe("第一行\n✓ 第二行");
  });

  it("无 ✓ 前缀时文本原样返回", () => {
    const s = makeReceiptStep(LIST_FEEDBACK, 1);
    expect(s.text).toBe(LIST_FEEDBACK);
  });

  it("⛔ 回归保护：多行反馈一字不改（曾因 numberOfLines={1} 丢条目行与 confirm id）", () => {
    const list = makeReceiptStep(LIST_FEEDBACK, 1).text;
    expect(list.split("\n")).toHaveLength(3);
    expect(list).toContain("asg_7QW3K2M");
    expect(list).toContain("asg_9ZX1B4C");
    // /assignments 列表的价值 = 条目行，标题行在而条目行丢 = 回归
    expect(list).toContain("· asg_7QW3K2M");

    const proposal = makeReceiptStep(PROPOSAL_FEEDBACK, 1).text;
    expect(proposal).toContain("Proposal: prp_4KQ8Z2T");
    expect(proposal).toContain("/confirm prp_4KQ8Z2T");
  });

  it("id 带 cmd- 前缀且每次不同", () => {
    const a = makeReceiptStep("x", 1000);
    const b = makeReceiptStep("x", 1000);
    expect(a.id.startsWith("cmd-")).toBe(true);
    expect(a.id).not.toBe(b.id);
  });

  it("剥离后文本为空时仍是合法步（不抛、text 为空串）", () => {
    expect(makeReceiptStep("✓", 1)).toMatchObject({ kind: "receipt", text: "" });
  });
});

describe("makeReceiptId", () => {
  it("now 转 36 进制进 id，默认取当前时间", () => {
    expect(makeReceiptId(1000).startsWith("cmd-")).toBe(true);
    expect(makeReceiptId(1000).split("-")[1]).toBe((1000).toString(36));
  });
});

describe("appendReceipt", () => {
  it("追加到尾部，不修改原数组", () => {
    const prev = steps(2);
    const step = makeReceiptStep("new", 9999);
    const next = appendReceipt(prev, step);
    expect(next.map((s) => s.id)).toEqual([...prev.map((s) => s.id), step.id]);
    expect(prev).toHaveLength(2);
  });

  it("超过 keep 时只留最近 keep 条，且顺序不反转", () => {
    const prev = steps(RECEIPT_KEEP);        // m0 … m19
    const fresh = makeReceiptStep("m20", 9999); // 第 21 条
    const next = appendReceipt(prev, fresh);
    expect(next).toHaveLength(RECEIPT_KEEP);
    // 最旧的 m0 被裁掉，其余按原序前移，最新一条在尾部（不排序/不反转）
    expect(next.map((s) => (s as ReceiptStep).text)).toEqual([
      ...Array.from({ length: RECEIPT_KEEP - 1 }, (_, i) => `m${i + 1}`),
      "m20",
    ]);
  });

  it("恰好 keep 条时不裁剪", () => {
    const prev = steps(RECEIPT_KEEP - 1);
    const next = appendReceipt(prev, makeReceiptStep("tail", 9999));
    expect(next).toHaveLength(RECEIPT_KEEP);
    expect((next[next.length - 1] as ReceiptStep).text).toBe("tail");
  });

  it("少于 keep 条时全部保留", () => {
    const next = appendReceipt(steps(3), makeReceiptStep("tail", 9999));
    expect(next).toHaveLength(4);
    expect((next[0] as ReceiptStep).text).toBe("m0");
  });

  it("keep 边界：显式 keep=2 时只留最近 2 条", () => {
    const next = appendReceipt(steps(5), makeReceiptStep("newest", 9999), 2);
    expect(next.map((s) => (s as ReceiptStep).text)).toEqual(["m4", "newest"]);
  });

  it("keep=0 返回空数组（[].slice(-0) 会把整个数组返回的坑）", () => {
    expect(appendReceipt(steps(5), makeReceiptStep("x", 1), 0)).toEqual([]);
  });

  it("空数组直接得到单条", () => {
    const step = makeReceiptStep("only", 1);
    expect(appendReceipt([], step).map((s) => s.id)).toEqual([step.id]);
  });
});
