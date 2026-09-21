// Runtime presence（v0.1.1）：把「AI 是否在线」从原始报错中识别出来。
// 原则（Product Reality Review）：companion 在离线时要诚实说"我离线了"，而不是让 502/ECONNREFUSED 替它说话。
// 严格分类：只有能确认「BFF 在、opencode runtime 不可达」的错误才算 AI offline；
// BFF 自身不可达 / 网络失败 / 认证问题必须区分，不得把一切错误都归为 offline。

export type RuntimeFailureKind = "opencode-offline" | "bff-offline" | "auth" | "other";

export function classifyRuntimeFailure(err: unknown): RuntimeFailureKind {
  const msg = err instanceof Error ? err.message : String(err);
  if (/\bunauthorized\b|\b401\b/.test(msg)) return "auth";
  // BFF opencode 代理的错误形状（client: `opencode <path> failed: 502 …`；BFF body: "opencode server unreachable"）
  if (/opencode server unreachable|opencode \S+ failed: 50[234]\b|ECONNREFUSED 127\.0\.0\.1:4096/i.test(msg)) {
    return "opencode-offline";
  }
  // fetch 层失败（BFF 不可达 / 网络断开）
  if (/Failed to fetch|Network request failed|fetch failed|TypeError: Network/.test(msg)) return "bff-offline";
  return "other";
}

/** offline 态的用户文案（companion 的声音，不是系统报错） */
export function runtimeFailureMessage(kind: RuntimeFailureKind): { title: string; body: string } {
  switch (kind) {
    case "opencode-offline":
      return {
        title: "AI is offline",
        body: "The agent runtime is currently unavailable. Your memories and saved information are still available.",
      };
    case "bff-offline":
      return {
        title: "Connection unavailable",
        body: "Cannot reach the service right now. Check your network or the BFF address in Settings.",
      };
    case "auth":
      return { title: "请先登录", body: "登录已过期，请重新登录后再试。" };
    default:
      return { title: "出了点问题", body: "请求没有成功，请稍后重试。" };
  }
}
