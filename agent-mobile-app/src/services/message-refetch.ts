import type { OpenCodeMessage, OpenCodePart } from "./opencode-client";

/**
 * #167：一次性兜底重拉的判据（纯函数）。
 *
 * 会话 idle / 本轮结束后，若**最后一条 assistant 消息** `finish === "tool-calls"`
 * 且 content 里没有 text part，说明结束状态与内容自相矛盾（工具调完却没有收尾文本），
 * 值得再拉一次 `GET /session/{id}/message` 自愈。重拉只允许发生一次（调用方按
 * message id 记已重拉），避免在同一状态上循环。
 *
 * 空白 text（仅空格/换行）视同没有 text——它渲染出来是空气泡，与"没有 text"同效。
 */
export function needsMessageRefetch(last: OpenCodeMessage | undefined | null): boolean {
  if (!last) return false;
  if (last.info.role !== "assistant") return false;
  if (last.info.finish !== "tool-calls") return false;
  return !hasVisibleText(last.parts);
}

function hasVisibleText(parts: OpenCodePart[] | undefined): boolean {
  if (!Array.isArray(parts)) return false;
  return parts.some((p) => p.type === "text" && typeof p.text === "string" && p.text.trim() !== "");
}
