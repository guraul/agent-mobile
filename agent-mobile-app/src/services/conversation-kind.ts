// 双 chat 页分流判据（epic #35 / #29，用户 2026-09-28 拍板 C1）：
// /talk 单路由进页后按会话 directory 运行时分流——directory 是 session 属性，
// 进页才知道，所以判据在运行时而非跳转前。
//   绑项目（真实代码仓库）→ chatcode 工作台；market 工作区 / 无项目 → chat 伴侣页。
// 判据一句话：对话的 subject 是不是需要真实操作的代码仓库？
// MARKET_TALK_DIRECTORY 原声明在 attention/talk.ts（market 会话统一挂该目录），
// 为保持本文件零依赖可单测，常量收编到这里，attention/talk.ts 转为 re-export。

export const MARKET_TALK_DIRECTORY = "/root/project/homebase";

// #57/#53：chat 伴侣页的 agent/model 在建会话时写死（v2 契约：agent/model 建会话定，
// 逐消息指定已废除）。
// #74（2026-10-11 护栏降级拍板）：免费档网关对工具列表指纹的校验波动收紧（issue #53
// 修正评论）——companion 的 permissions 白名单撤除（软护栏=system prompt+客户端写死），
// model 回归与 chatcode 同款 mimo（过网关确定性）。真护栏恢复见 #74 backlog 段。
export const CHAT_AGENT_ID = "companion";
export const CHAT_MODEL = { providerID: "opencode", modelID: "mimo-v2.6-flash-free" } as const;

export type ConversationKind = "chat" | "chatcode";

export function resolveConversationKind(directory?: string | null): ConversationKind {
  const dir = (directory ?? "").trim();
  // 无 directory / 根目录（裸进入 & Direct Talk 默认）→ chat
  if (!dir || dir === "/") return "chat";
  // market 工作区是伴侣聊天的大本营（Attention market 域 / Suggested 会话都在此）
  if (dir === MARKET_TALK_DIRECTORY) return "chat";
  return "chatcode";
}

/**
 * 裸进入 /talk（Dock Start New Chat / Sources ASK）的会话挑选（#50）：
 * 裸进入语义 = Direct Talk 伴侣聊天（拍板映射 Dock→chat），所以只在 **chat 侧**
 * 会话里挑最近的——不过滤的话，全局最近是 coding 会话就会把 Dock 带进 chatcode。
 * 挑不到（无 chat 侧会话）返回 null，调用方落 createSession("/")（Direct Talk 原语义）。
 */
export function pickBareEntrySession<T extends { directory?: string | null }>(
  sessions: T[],
): T | null {
  const chatSide = sessions.filter((s) => resolveConversationKind(s.directory) === "chat");
  return chatSide.length ? chatSide[0] : null;
}
