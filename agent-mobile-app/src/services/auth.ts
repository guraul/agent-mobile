import AsyncStorage from "@react-native-async-storage/async-storage";
import { opencodeConfig } from "../config/opencode";

const TOKEN_KEY = "pulse_opencode_token";

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

export async function login(username: string, password: string): Promise<string> {
  const res = await fetch(`${opencodeConfig.baseUrl}/api/auth/login`, {
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
  unauthorizedCb?.();
}
