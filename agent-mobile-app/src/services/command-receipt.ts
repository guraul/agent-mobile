// 命令族回执步（#59）：Assignment 斜杠命令反馈的本地步纯函数。
// 触发路径见 ChatPanelZ.send()：parseAssignmentCommand → executeAssignmentCommand
// 的可读反馈 → 回执 chip 追加在消息流尾部（localSteps → listData）。
// 红线：纯函数、零 RN 依赖、可单测；UI/样式留在 MessageBubbleZ，不进来。
// ⛔⛔ 文本绝不截断：反馈是多行的（/assignments 列表条目行、proposal 分支的
// `Proposal: prp_xxx` + `回复 /confirm prp_xxx 激活`），截断会丢命令链必需的 id
// ——首版为了"一行"观感用了 numberOfLines={1}，已作为回归修掉，本模块的
// 单测负责守住"文本一字不改"。

import { t } from "../i18n";
import type { DisplayStep, ReceiptStep } from "./message-merging";
import { classifyRuntimeFailure, runtimeFailureMessage } from "./runtime-presence";

/**
 * localSteps 保留条数上界（回执只增不减，长会话必须封顶）。
 *
 * 为什么是 20（#65-③ 拍板：**回执不落盘**）：回执是"我刚做过什么"的**滚动窗口**——命令族
 * 反馈（/assign /confirm …）的回看场景是短时的（确认 prp_/asg_ id、看激活结果），越过 20 条
 * 已经超不出任何真实回看需求。需要**长期**留痕的东西走出口① 的记忆（memory_write → /memory
 * 可查、写盘持久），而不是把 localSteps 做成第二个持久化面（多一处状态要迁移、要清、要防冲突）。
 */
export const RECEIPT_KEEP = 20;

/** 回执 id 前缀（本地步与 opencode step id 区分；调试/e2e 可按前缀识别） */
const RECEIPT_ID_PREFIX = "cmd";

/** 生成回执 id（now 注入便于测试；随机后缀防同一毫秒内多条碰撞） */
export function makeReceiptId(now: number = Date.now()): string {
  return `${RECEIPT_ID_PREFIX}-${now.toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/**
 * 构造回执步：剥离反馈文本前导的可读勾（✓）——chip 自带 ✓ 图标，
 * 不剥会渲染成 "✓ ✓"。**除该前缀外不改任何字符**（\n、asg_/prp_ id 全保留）。
 */
/**
 * 剥掉反馈文本前导的可读勾（chip 自带 ✓ 图标，不剥会渲染成 "✓ ✓"）。
 * 覆盖两类来源：命令族反馈的 `✓`，以及 memory_write 工具回执的 `✅`（出口①）。
 * **除该前缀外不改任何字符**（\n、asg_/prp_ id 全保留）。
 */
export function stripLeadingCheck(text: string): string {
  return text.replace(/^[✓✅]\s*/, "");
}

/** 构造回执步（剥离前导勾，其余原样） */
export function makeReceiptStep(text: string, now: number = Date.now()): ReceiptStep {
  return { kind: "receipt", id: makeReceiptId(now), createdAt: now, text: stripLeadingCheck(text) };
}

/**
 * #65-2：命令失败的反馈通道（与成功路径同一原则：**结果必须留痕**）。
 * - **离线 / 鉴权失败**：用户什么都做不了，必须打断 → `alert`（弹窗，沿用 runtime-presence 的文案）
 * - **其余失败**：进消息流的 `error` 步（语义色、全文不截断、与成功回执同处一屏）——比
 *   `showAlert` 好在切会话前一直可见，也消掉"成功走 chip、失败弹窗"的通道分裂（#65-②）
 */
export function commandFailureStep(
  err: unknown,
  now: number = Date.now(),
): { kind: "alert"; title: string; body: string } | { kind: "error"; id: string; text: string; createdAt: number } {
  const kind = classifyRuntimeFailure(err);
  if (kind === "opencode-offline" || kind === "bff-offline" || kind === "auth") {
    const { title, body } = runtimeFailureMessage(kind);
    return { kind: "alert", title, body };
  }
  const raw = err instanceof Error ? err.message : String(err);
  return { kind: "error", id: makeReceiptId(now), text: t("command.failed", { raw }), createdAt: now };
}

/**
 * 追加回执步并封顶：只保留最近 keep 条。**顺序不变**（旧在前、新在后，
 * 与"追加到消息流尾部"的规定语义一致）——不排序、不反转。
 * keep <= 0 返回空数组（`[].slice(-0)` 会退化成 slice(0) 把整个数组返回的坑）。
 */
export function appendReceipt(
  prev: DisplayStep[],
  step: DisplayStep,
  keep: number = RECEIPT_KEEP,
): DisplayStep[] {
  if (keep <= 0) return [];
  return [...prev, step].slice(-keep);
}
