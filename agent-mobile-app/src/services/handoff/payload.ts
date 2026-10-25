// #61（S3+S2 / 跨仓 #61 出口③）：移交卡的隐藏块提取 / 校验 / 剥离。
//
// 通道与 #98 定时任务确认卡同构：模型在回复**末尾**输出 HTML 注释隐藏块，
// 客户端解析成「气泡内白卡」，展示文本里把它剥掉：
//   <!--handoff:{"title":"可选，≤100","body":"目标 / 边界 / 落点，三件事，≤4000"}-->
//
// 优雅降级红线：解析 / 校验失败（非 JSON / body 空 / 超长）一律 **原样返回文本、
// 不出卡、不报错**——结构化块是增强，不是协议。
// 残缺 `<!--handoff:…`（模型没写完 `-->`）交给展示层的 stripHtmlComments 兜底。
//
// 红线：纯函数、零 RN 依赖、可单测。
export const HANDOFF_CARD_MARKER = "handoff";

export const HANDOFF_TITLE_MAX = 100;
export const HANDOFF_BODY_MAX = 4000;

/** 隐藏块字段（title 可选，仅作卡片标题补充；body 必填） */
export type HandoffPayload = {
  title?: string;
  body: string;
};

/**
 * 块正则：`<!--handoff:<payload>-->`。捕获组非贪婪到第一个 `-->`，嵌套 `{}` 交给 JSON.parse。
 * `\s*handoff\s*:` 不会误伤 `handoff-card:` 之类的其他标记（`-` 不是空白也不是冒号）。
 */
const HANDOFF_BLOCK_RE = /<!--\s*handoff\s*:\s*([\s\S]*?)\s*-->/;

/** 校验隐藏块 payload：body 必填非空且 ≤4000，title 可选（超长截断到 100）；不合法返回 null */
export function validateHandoffPayload(input: unknown): HandoffPayload | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const o = input as Record<string, unknown>;
  if (typeof o.body !== "string") return null;
  const body = o.body.trim();
  if (!body || body.length > HANDOFF_BODY_MAX) return null;
  const title = typeof o.title === "string" ? o.title.trim().slice(0, HANDOFF_TITLE_MAX) : "";
  return title ? { title, body } : { body };
}

/**
 * 从模型回复文本提取隐藏块：
 * - 有块且合法 → `{ payload, cleanedText }`（cleanedText 已剥离该块）
 * - 无块 / JSON 破损 / 校验失败 → `{ payload: null, cleanedText: 原文 }`（优雅降级，不报错）
 */
export function extractHandoffBlock(text: string): { payload: HandoffPayload | null; cleanedText: string } {
  const m = HANDOFF_BLOCK_RE.exec(text);
  if (!m) return { payload: null, cleanedText: text };
  let raw: unknown;
  try {
    raw = JSON.parse(m[1].trim());
  } catch {
    return { payload: null, cleanedText: text };
  }
  const payload = validateHandoffPayload(raw);
  if (!payload) return { payload: null, cleanedText: text };
  const start = m.index;
  const cleanedText = (text.slice(0, start) + text.slice(start + m[0].length)).trim();
  return { payload, cleanedText };
}
