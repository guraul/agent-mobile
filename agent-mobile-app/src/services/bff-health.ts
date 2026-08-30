// 第三个参数 fetchImpl 仅供测试注入;生产用全局 fetch
export async function probeBffHealth(
  url: string,
  timeoutMs = 3000,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    // OPTIONS(预检):BFF 返回 204 且带 CORS 头。HEAD 会 405 且无 CORS 头,
    // web 静态版(9928)里 fetch 被 CORS 拦截 → 永远误判离线。
    const res = await fetchImpl(`${url.replace(/\/$/, "")}/api/auth/login`, {
      method: "OPTIONS",
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    return res.ok || (res.status >= 200 && res.status < 500);
  } catch {
    return false;
  }
}
