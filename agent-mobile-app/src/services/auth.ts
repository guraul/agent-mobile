import AsyncStorage from "@react-native-async-storage/async-storage";
import { opencodeConfig, getBaseUrl } from "../config/opencode";

const TOKEN_KEY = "pulse_opencode_token";
const USERNAME_KEY = "pulse_username";

let unauthorizedCb: (() => void) | null = null;

export async function getToken(): Promise<string | null> {
  try { return await AsyncStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export async function setToken(token: string | null): Promise<void> {
  try {
    if (token) { opencodeConfig.token = token; await AsyncStorage.setItem(TOKEN_KEY, token); }
    else { opencodeConfig.token = ""; await AsyncStorage.removeItem(TOKEN_KEY); }
  } catch { }
}

export async function loadToken(): Promise<string | null> {
  const tok = await getToken();
  opencodeConfig.token = tok ?? "";
  return tok;
}

export async function getUsername(): Promise<string | null> {
  try { return await AsyncStorage.getItem(USERNAME_KEY); } catch { return null; }
}

export async function setUsername(username: string): Promise<void> {
  try { await AsyncStorage.setItem(USERNAME_KEY, username); } catch {}
}

export async function clearUsername(): Promise<void> {
  try { await AsyncStorage.removeItem(USERNAME_KEY); } catch {}
}

export async function login(username: string, password: string): Promise<string> {
  const res = await fetch(`${getBaseUrl()}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? `login failed: ${res.status}`);
  }
  const { token } = await res.json();
  if (!token) throw new Error("login returned no token");
  await setToken(token);
  await setUsername(username);
  return token;
}

export function tokenHeader(): Record<string, string> {
  return opencodeConfig.token ? { Authorization: `Bearer ${opencodeConfig.token}` } : {};
}

export function onUnauthorized(cb: () => void): () => void {
  unauthorizedCb = cb;
  return () => { unauthorizedCb = null; };
}

export async function handleUnauthorized(): Promise<void> {
  await setToken(null);
  await clearUsername();
  unauthorizedCb?.();
}

// 登出:通知 BFF + 清本地 token/username(失败仍清本地,保证本地登出)
export async function logout(): Promise<void> {
  try {
    await fetch(`${getBaseUrl()}/api/auth/logout`, {
      method: "POST",
      headers: tokenHeader(),
    });
  } catch {
    // 网络失败——仍清本地,Me 页提示"服务端登出失败,已本地登出"
  }
  await setToken(null);
  await clearUsername();
}
