import type { AttentionItem } from "./store";

// Attention 冷启动快照加载（agent-mobile#167）：
// 挂载 effect 早于父组件的 loadToken()，token 尚未写入内存 → 旧实现直接跳过请求，
// 之后再不重试 → 刷新后 Pulse "Needs you" 可能整块空白（SSE 首次连接也会因无 token 空转）。
// 修法同 useL1（#148）：先 loadToken（幂等）再拉；拉取失败重试一次；不引入轮询。

/** 首次 + 失败重试一次（固定上限，避免无限循环） */
export const ATTENTION_LOAD_ATTEMPTS = 2;

/** 无 token 不发请求：401 会触发登出流程，空快照也会污染 store */
export function shouldFetchAttentions(token: string | null | undefined): boolean {
  return typeof token === "string" && token.length > 0;
}

export interface AttentionLoadDeps {
  /** 当前内存里的 Authorization 值（缺省 = 未就绪） */
  readToken: () => string | null | undefined;
  /** 补一次凭据加载（幂等；等价 auth.loadToken） */
  ensureToken: () => Promise<unknown>;
  /** REST snapshot */
  fetchSnapshot: () => Promise<AttentionItem[]>;
}

/**
 * 加载 Attention snapshot。
 * - token 未就绪 → await ensureToken() 后再判定一次；仍为空则返回 null（不拉、不报错）
 * - 拉取失败 → 重试一次；两次都失败则抛出最后一次错误（交由 caller 展示）
 */
export async function loadAttentionSnapshot(
  deps: AttentionLoadDeps,
): Promise<AttentionItem[] | null> {
  if (!shouldFetchAttentions(deps.readToken())) {
    await deps.ensureToken();
    if (!shouldFetchAttentions(deps.readToken())) return null;
  }

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= ATTENTION_LOAD_ATTEMPTS; attempt++) {
    try {
      return await deps.fetchSnapshot();
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}
