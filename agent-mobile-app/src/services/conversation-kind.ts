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
// #74（2026-10-11 护栏降级）：免费档网关对请求工具列表的指纹校验波动收紧 → companion
// permissions 白名单撤除（改软护栏 = system prompt + 客户端写死）。#75/#76 起
// **CHAT_MODEL 只在本文件定义**（ChatPanelZ.tsx 的历史本地副本已删）——改它只需改这里 +
// 全仓 grep 确认。
// 2026-10-24 用户拍板：**聊天模型用 `opencode/deepseek-v4.1-flash-free`**——生产 companion 上
// `mimo-v2.6-flash-free` **调不动插件新工具 `project_sessions`**（同插件的 `session_status`
// 正常），deepseek 实测一次调通。⚠️ **providerID 仍必须是 `opencode`**：App 唯一的真实目标是
// 生产 opencode，而生产的模型目录里没有 `opencode-go`（见 OPERATIONS 上线窗口预检）——
// 写死 Go 档会让手机端直接 Model unavailable（Go 档只用于 DSH 子代理 + 本机 memx 提炼）。
export const CHAT_AGENT_ID = "companion";
export const CHAT_MODEL = { providerID: "opencode", modelID: "deepseek-v4.1-flash-free" } as const;

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
