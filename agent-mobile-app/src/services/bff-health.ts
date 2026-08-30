// 第三个参数 fetchImpl 仅供测试注入;生产用全局 fetch
export async function probeBffHealth(
  url: string,
  timeoutMs = 3000,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetchImpl(`${url.replace(/\/$/, "")}/api/auth/login`, {
      method: "HEAD",
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    return res.ok || (res.status >= 200 && res.status < 500);
  } catch {
    return false;
  }
}
