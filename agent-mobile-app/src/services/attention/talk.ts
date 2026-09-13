import { opencodeClient } from "../opencode-client";
import { engageAttention } from "./client";
import { classifyRuntimeFailure } from "../runtime-presence";
import type { PulseAttentionItem } from "./store";

// Attention → Talk 会话解析（v0.1.1）：从 index.tsx onAttentionPress 抽出的共享路径，
// Pulse 卡与 Attention 详情屏共用同一 Resume/Create 语义（PM §8.2/§16.4）：
//   有 session → 精确 Resume（engage 记录交互，不改 state）
//   无 session + market → Create（market 工作区）+ engage 回填
//   其余 → 抛错（Reconstruct 属 PM §4.2，MVP 不自动做）
// Runtime offline 原样上抛（由调用方按 runtime-presence 呈现 offline 态）。

export const MARKET_TALK_DIRECTORY = "/root/project/family-finance";

export interface ResolvedConversation {
  sessionId: string;
  projectPath: string;
  created: boolean;
}

type AttentionRef = Pick<PulseAttentionItem, "id" | "title" | "summary" | "subjectId" | "state" | "sessionId" | "domain">;

export async function resolveAttentionConversation(a: AttentionRef): Promise<ResolvedConversation> {
  if (a.sessionId) {
    try {
      const session = await opencodeClient.getSession(a.sessionId);
      const dir = session.directory || MARKET_TALK_DIRECTORY;
      // Resume 也是显式 engage（记录交互 + 回填引用），与既有 Pulse 行为一致
      try { await engageAttention(a.id, a.sessionId); } catch { /* engage 失败不阻塞进入 Talk */ }
      return { sessionId: a.sessionId, projectPath: dir, created: false };
    } catch (e) {
      if (classifyRuntimeFailure(e) === "opencode-offline" || classifyRuntimeFailure(e) === "bff-offline") throw e;
      // session 已删 → market 域走 Create；其余抛错走既有安全提示
      if (a.domain !== "market") throw e;
    }
  }
  if (a.domain === "market") {
    const created = await opencodeClient.createSession({
      directory: MARKET_TALK_DIRECTORY,
      title: `处理：${a.title}`.slice(0, 80),
    });
    try { await engageAttention(a.id, created.id); } catch { /* engage 失败不阻塞进入 Talk */ }
    return { sessionId: created.id, projectPath: MARKET_TALK_DIRECTORY, created: true };
  }
  throw new Error("该事项的会话已不可用");
}
