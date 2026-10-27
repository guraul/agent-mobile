// #98（切片 2 / 跨仓 #60 出口②「定时任务」）：确认卡的隐藏块提取 / 校验 / 剥离 + 卡片判据纯函数。
//
// 通道：模型在回复末尾输出 HTML 注释形式的隐藏结构化块（客户端解析后渲染「气泡内白卡」，
// 展示文本里把它剥掉）：
//   <!--assignment-card:{"mode":"one-shot","domain":"personal","responsibility":"…","schedule":"0 18 * * *","condition":{"kind":"always"}}-->
// 沿用本仓既有的「HTML 注释隐藏标记 + 前端剥离」先例：#71 的 STYLE_SIGNAL、memx 面包屑。
//
// 优雅降级红线：解析 / 校验失败一律 **原样返回文本、不出卡、不报错**——结构化块是增强，不是协议，
// 模型偶发格式漂移不该把整条回复搞坏。
//
// 红线：纯函数、零 RN 依赖、可单测。
import { t } from "../../i18n";
import type { FromCardResponse } from "./client";

/** 隐藏块标记名（模型侧 prompt 与本模块必须一致） */
export const ASSIGNMENT_CARD_MARKER = "assignment-card";

/** 时区固定 Asia/Shanghai（用户拍板；块里不带 timezone 字段，组装 trigger 时写死） */
export const ASSIGNMENT_CARD_TIMEZONE = "Asia/Shanghai";

/** cron 段数（本项目只用 `min hour * * dow` 五段） */
export const CRON_FIELD_COUNT = 5;

export type AssignmentCardMode = "one-shot" | "ongoing";
export type AssignmentCardDomain = "market" | "personal";
export type AssignmentCardConditionKind =
  | "always"
  | "fund-nav-above-target"
  | "fund-nav-above"
  | "fund-nav-below";

/** 条件 payload（type alias 而非 interface：需可赋给 TriggerDefinitionLike.condition 的 Record<string, unknown>） */
export type AssignmentCardCondition = {
  kind: AssignmentCardConditionKind;
  fundCode?: string;
  value?: number;
};

/** 隐藏块字段（与 BFF `from-card` 契约对齐） */
export type AssignmentCardPayload = {
  mode: AssignmentCardMode;
  domain: AssignmentCardDomain;
  responsibility: string;
  /** cron 五段，时区固定 Asia/Shanghai */
  schedule: string;
  condition: AssignmentCardCondition;
};

/** 组装出的 trigger（形状同 client.ts 的 TriggerDefinitionLike） */
export type AssignmentCardTrigger = {
  kind: "schedule-rule";
  schedule: string;
  timezone: string;
  condition: AssignmentCardCondition;
  enabled: boolean;
};

const MODES: readonly AssignmentCardMode[] = ["one-shot", "ongoing"];
const DOMAINS: readonly AssignmentCardDomain[] = ["market", "personal"];
const CONDITION_KINDS: readonly AssignmentCardConditionKind[] = [
  "always",
  "fund-nav-above-target",
  "fund-nav-above",
  "fund-nav-below",
];

/**
 * 块正则：`<!--assignment-card:<payload>-->`。捕获组**非贪婪**匹配到第一个 `-->`，
 * 于是 `condition` 里的嵌套 `{}` 原样落进捕获组交给 JSON.parse（不能用 `\{.*?\}`——
 * 非贪婪会在 condition 的第一个 `}` 断掉，合法块被误判为非法）。
 */
const CARD_BLOCK_RE = /<!--\s*assignment-card\s*:\s*([\s\S]*?)\s*-->/;

/** cron 是否合法：正好五段，且每段只含 cron 常见字符 */
export function isValidCron(schedule: unknown): schedule is string {
  if (typeof schedule !== "string") return false;
  const fields = schedule.trim().split(/\s+/);
  if (fields.length !== CRON_FIELD_COUNT) return false;
  return fields.every((f) => /^[\d*?,/\-A-Za-z]+$/.test(f));
}

function validateCondition(input: unknown): AssignmentCardCondition | null {
  if (!input || typeof input !== "object") return null;
  const c = input as Record<string, unknown>;
  const kind = c.kind;
  if (typeof kind !== "string" || !CONDITION_KINDS.includes(kind as AssignmentCardConditionKind)) return null;
  if (kind === "always") return { kind: "always" };
  const fundCode = c.fundCode;
  if (typeof fundCode !== "string" || !fundCode.trim()) return null;
  if (kind === "fund-nav-above-target") return { kind: "fund-nav-above-target", fundCode: fundCode.trim() };
  const value = c.value;
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return { kind: kind as "fund-nav-above" | "fund-nav-below", fundCode: fundCode.trim(), value };
}

/** 校验隐藏块 payload（枚举内取值 + 必填齐全 + cron 五段）；不合法返回 null */
export function validateCardPayload(input: unknown): AssignmentCardPayload | null {
  if (!input || typeof input !== "object") return null;
  const o = input as Record<string, unknown>;
  if (typeof o.mode !== "string" || !MODES.includes(o.mode as AssignmentCardMode)) return null;
  if (typeof o.domain !== "string" || !DOMAINS.includes(o.domain as AssignmentCardDomain)) return null;
  if (typeof o.responsibility !== "string" || !o.responsibility.trim()) return null;
  if (!isValidCron(o.schedule)) return null;
  const condition = validateCondition(o.condition);
  if (!condition) return null;
  return {
    mode: o.mode as AssignmentCardMode,
    domain: o.domain as AssignmentCardDomain,
    responsibility: o.responsibility.trim(),
    schedule: o.schedule.trim(),
    condition,
  };
}

/**
 * 从模型回复文本提取隐藏块：
 * - 有块且合法 → `{ payload, cleanedText }`（cleanedText 已剥离该块）
 * - 无块 / JSON 破损 / 校验失败 → `{ payload: null, cleanedText: 原文 }`（优雅降级，不报错）
 */
export function extractAssignmentCard(text: string): { payload: AssignmentCardPayload | null; cleanedText: string } {
  const m = CARD_BLOCK_RE.exec(text);
  if (!m) return { payload: null, cleanedText: text };
  let raw: unknown;
  try {
    raw = JSON.parse(m[1].trim());
  } catch {
    return { payload: null, cleanedText: text };
  }
  const payload = validateCardPayload(raw);
  if (!payload) return { payload: null, cleanedText: text };
  const start = m.index;
  const cleanedText = (text.slice(0, start) + text.slice(start + m[0].length)).trim();
  return { payload, cleanedText };
}

/** payload → trigger（时区写死 Asia/Shanghai，enabled 恒 true） */
export function toCardTrigger(payload: AssignmentCardPayload): AssignmentCardTrigger {
  return {
    kind: "schedule-rule",
    schedule: payload.schedule,
    timezone: ASSIGNMENT_CARD_TIMEZONE,
    condition: payload.condition,
    enabled: true,
  };
}

// ── 展示派生（纯函数；卡片内容区用）──

/** cron → 人话时间（`min hour * * dow` 五段；无法解析时原样回显） */
export function describeCardSchedule(schedule: string): string {
  const parts = schedule.trim().split(/\s+/);
  if (parts.length !== CRON_FIELD_COUNT) return schedule;
  const min = Number(parts[0]);
  const hour = Number(parts[1]);
  if (!Number.isInteger(min) || !Number.isInteger(hour)) return schedule;
  const time = `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  const dow = parts[4];
  if (dow === "*" || dow === "?" || dow === "0-6") return t("assignment.card.schedule.daily", { time });
  if (dow === "1-5") return t("assignment.card.schedule.tradingDay", { time });
  if (dow === "6,0" || dow === "0,6" || dow === "6-7") return t("assignment.card.schedule.weekend", { time });
  return `${dow} ${time}`;
}

export function describeCardMode(mode: AssignmentCardMode): string {
  return mode === "one-shot" ? t("assignment.card.mode.oneShot") : t("assignment.card.mode.ongoing");
}

export function describeCardDomain(domain: AssignmentCardDomain): string {
  return domain === "market" ? t("assignment.card.domain.market") : t("assignment.card.domain.personal");
}

/** 条件 → 人话；`always`（纯时间触发）无附加条件 → null */
export function describeCardCondition(condition: AssignmentCardCondition): string | null {
  // 校验层（validateCardPayload）已保证 fund 条件带 fundCode / value；此处兜底只为类型收窄
  const fundCode = condition.fundCode ?? "";
  switch (condition.kind) {
    case "always":
      return null;
    case "fund-nav-above-target":
      return t("assignment.card.condition.target", { fundCode });
    case "fund-nav-above":
      return t("assignment.card.condition.above", { fundCode, value: condition.value ?? "" });
    case "fund-nav-below":
      return t("assignment.card.condition.below", { fundCode, value: condition.value ?? "" });
  }
}

// ── 卡片相位 / 判据（纯函数；卡片组件按此渲染，可单测）──

export type AssignmentCardPhase =
  | { kind: "ready" }
  | { kind: "submitting" }
  | { kind: "created"; activated: boolean; assignmentId: string | null; proposalId: string }
  | { kind: "duplicate"; duplicateOf: string }
  | { kind: "failed"; message: string }
  /** [补充] 已提交 → 旧卡失效（模型会重新出一张卡） */
  | { kind: "superseded" };

export interface AssignmentCardControls {
  /** [确认] 可点（含重试前的首次确认） */
  confirm: boolean;
  /** [补充] 可点 */
  supplement: boolean;
  /** 失败后可重试 */
  retry: boolean;
  /** 请求在途（按钮显示「创建中…」） */
  busy: boolean;
}

export function cardControls(phase: AssignmentCardPhase): AssignmentCardControls {
  switch (phase.kind) {
    case "ready":
      return { confirm: true, supplement: true, retry: false, busy: false };
    case "submitting":
      return { confirm: false, supplement: false, retry: false, busy: true };
    case "failed":
      return { confirm: false, supplement: false, retry: true, busy: false };
    default:
      return { confirm: false, supplement: false, retry: false, busy: false };
  }
}

/** from-card 响应 → 相位（duplicateOf 优先：已有相同规则 → 不激活） */
export function phaseFromCardResponse(res: FromCardResponse): AssignmentCardPhase {
  if (res.duplicateOf) return { kind: "duplicate", duplicateOf: res.duplicateOf };
  return {
    kind: "created",
    activated: res.activated,
    assignmentId: res.assignmentId ?? null,
    proposalId: res.proposalId,
  };
}

/** 异常 → 失败相位（不得静默：卡片转错误态 + 重试按钮） */
export function phaseFromCardError(err: unknown): AssignmentCardPhase {
  const message = err instanceof Error ? err.message : String(err);
  return { kind: "failed", message: message || t("assignment.card.createFailed") };
}

/** 相位 → 卡上的一行注（无注返回 null） */
export function cardNote(phase: AssignmentCardPhase): string | null {
  switch (phase.kind) {
    case "created":
      return phase.activated
        ? phase.assignmentId
          ? t("assignment.card.note.createdWithId", { id: phase.assignmentId })
          : t("assignment.card.note.created")
        : t("assignment.card.proposalPending", { proposalId: phase.proposalId });
    case "duplicate":
      return t("assignment.card.note.duplicate");
    case "superseded":
      return t("assignment.card.note.superseded");
    default:
      return null;
  }
}

/**
 * 确认成功的留痕回执（复用 #59 回执 chip）。`duplicateOf` → null（卡上已提示，不重复留痕）。
 */
export function assignmentCardReceipt(payload: AssignmentCardPayload, res: FromCardResponse): string | null {
  if (res.duplicateOf) return null;
  if (res.activated) {
    return res.assignmentId
      ? t("assignment.card.receipt.createdWithId", { name: payload.responsibility, id: res.assignmentId })
      : t("assignment.card.receipt.created", { name: payload.responsibility });
  }
  return t("assignment.card.proposalPending", { proposalId: res.proposalId });
}
