// 双 chat 页分流判据（epic #35 / #29，用户 2026-09-28 拍板 C1）：
// /talk 单路由进页后按会话 directory 运行时分流——directory 是 session 属性，
// 进页才知道，所以判据在运行时而非跳转前。
//   绑项目（真实代码仓库）→ chatcode 工作台；market 工作区 / 无项目 → chat 伴侣页。
// 判据一句话：对话的 subject 是不是需要真实操作的代码仓库？
// MARKET_TALK_DIRECTORY 原声明在 attention/talk.ts（market 会话统一挂该目录），
// 为保持本文件零依赖可单测，常量收编到这里，attention/talk.ts 转为 re-export。

export const MARKET_TALK_DIRECTORY = "/root/project/family-finance";

export type ConversationKind = "chat" | "chatcode";

export function resolveConversationKind(directory?: string | null): ConversationKind {
  const dir = (directory ?? "").trim();
  // 无 directory / 根目录（裸进入 & Direct Talk 默认）→ chat
  if (!dir || dir === "/") return "chat";
  // market 工作区是伴侣聊天的大本营（Attention market 域 / Suggested 会话都在此）
  if (dir === MARKET_TALK_DIRECTORY) return "chat";
  return "chatcode";
}
