// 模型白名单与 agent 默认模型（2026-09-29 用户拍板）。
//
// 背景：opencode 侧 deepseek provider 已下线 `deepseek-v4-flash`，而服务器 opencode.json
// 里 primary agent（build/plan/design）仍配着 `deepseek/deepseek-v4-flash`——直接沿用
// server 的 agent.model 会让每条消息在 loop 层抛 ProviderModelNotFoundError，
// assistant 消息根本不生成（用户无任何回复、无 error 气泡）。故手机端不采纳
// server 的 agent.model，统一用这里的默认模型覆盖。
//
// 决策（用户 2026-09-29）：全量切 `opencode/mimo-v2.6-flash-free`（实测可跑通）；
// DeepSeek Pro 一律不用，且从模型选择器中排除。
//
// 纯函数 + 零 RN 依赖，可单测。红线：勿把已下线模型写回本文件。

/** agent 默认模型（覆盖 server 端 agent.model） */
export const DEFAULT_MODEL = {
  providerID: "opencode",
  modelID: "mimo-v2.6-flash-free",
} as const;

/** 参与模型选择器的 modelID 关键字（小写比较） */
const ALLOWED_KEYWORDS = ["mimo"];

/** 整 provider 排除（第三方中转，模型列表噪音大） */
const EXCLUDED_PROVIDERS = ["siliconflow-cn"];

/** modelID 排除规则（小写子串命中即排除）——DeepSeek Pro 全家 */
const EXCLUDED_MODEL_PATTERNS = [
  "deepseek-v4-pro",
  "deepseek-v3.2",
  "deepseek-v3.1-terminus",
  "deepseek-v3",
  "deepseek-r1",
  "pro/deepseek",
];

export interface ModelRef {
  providerID: string;
  modelID: string;
}

/**
 * 过滤 config/providers 的模型列表，供 model 选择器使用。
 * - 排除整 provider（siliconflow-cn）
 * - 只保留白名单关键字（mimo）
 * - 排除 DeepSeek Pro 系（无论 provider，含 sensenova/deepseek-v4-pro）
 */
export function selectModels(
  providers: { id: string; models?: Record<string, unknown> }[],
): ModelRef[] {
  const out: ModelRef[] = [];
  for (const p of providers) {
    if (EXCLUDED_PROVIDERS.includes(p.id)) continue;
    for (const modelID of Object.keys(p.models ?? {})) {
      const id = modelID.toLowerCase();
      if (EXCLUDED_MODEL_PATTERNS.some((bad) => id.includes(bad))) continue;
      if (!ALLOWED_KEYWORDS.some((kw) => id.includes(kw))) continue;
      out.push({ providerID: p.id, modelID });
    }
  }
  return out;
}
