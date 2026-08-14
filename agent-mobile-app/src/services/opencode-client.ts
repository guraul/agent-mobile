import { opencodeConfig } from "../config/opencode";
import { tokenHeader, handleUnauthorized, login as loginToBff } from "./auth";

export interface OpenCodeProject {
  id: string;
  worktree: string;
  vcs?: string;
}

export interface OpenCodeSession {
  id: string;
  title?: string;
  directory?: string;
  agent?: string;
  model?: { id: string; providerID: string; variant?: string };
  time?: { created: number; updated: number };
  summary?: { additions: number; deletions: number; files: number };
  cost?: number;
  tokens?: Record<string, unknown>;
}

export interface OpenCodeMessage {
  info: {
    id: string;
    role: "user" | "assistant";
    sessionID: string;
    time?: { created: number };
    error?: string;
  };
  parts: OpenCodePart[];
}

export type OpenCodePart =
  | { type: "text"; text?: string; id?: string }
  | { type: "step-start"; title?: string; id?: string }
  | { type: "step-finish"; stepType?: string; id?: string }
  | { type: "tool"; tool?: string; state?: { status?: string }; input?: unknown; output?: unknown; id?: string }
  | { type: "reasoning"; text?: string; id?: string }
  | { type: "file"; file?: { path?: string; content?: string }; id?: string }
  | { type: "snapshot"; isSnapshot?: boolean; id?: string }
  | { type: "agent"; name?: string; id?: string };

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const auth = tokenHeader();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...auth,
    ...(options.headers as Record<string, string> | undefined),
  };

  const res = await fetch(`${opencodeConfig.baseUrl}/api/opencode/rest${path}`, {
    ...options,
    headers,
  });
  if (res.status === 401) {
    // Only treat 401 as an expired session when this request actually sent a
    // token. Requests fired before login (no Authorization header) hitting 401
    // must not wipe a freshly stored login token — otherwise logging in then
    // reloading loses the session and the SSE stream never authenticates.
    if (auth.Authorization) await handleUnauthorized();
    throw new Error(`opencode ${path} unauthorized`);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`opencode ${path} failed: ${res.status} ${res.statusText} ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const opencodeClient = {
  login(username: string, password: string): Promise<string> {
    return loginToBff(username, password);
  },

  listProviders(): Promise<{ providers: { id: string; name?: string; models: Record<string, unknown> }[]; default: Record<string, string> }> {
    return request(`/config/providers`);
  },

  listAgents(): Promise<{ name: string; mode?: string; model?: { providerID: string; modelID: string } }[]> {
    return request(`/agent`);
  },

  getProject(): Promise<OpenCodeProject[]> {
    return request<OpenCodeProject[]>("/project");
  },

  listSessions(directory?: string): Promise<OpenCodeSession[]> {
    const q = directory ? `?directory=${encodeURIComponent(directory)}` : "";
    return request<OpenCodeSession[]>(`/session${q}`);
  },

  getSession(id: string): Promise<OpenCodeSession> {
    return request<OpenCodeSession>(`/session/${id}`);
  },

  createSession(body: { directory?: string; title?: string }): Promise<OpenCodeSession> {
    return request<OpenCodeSession>("/session", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  deleteSession(id: string): Promise<boolean> {
    return request<boolean>(`/session/${id}`, { method: "DELETE" });
  },

  renameSession(id: string, title: string): Promise<OpenCodeSession> {
    return request<OpenCodeSession>(`/session/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    });
  },

  listMessages(id: string, options?: { limit?: number; offset?: number }): Promise<OpenCodeMessage[]> {
    const qs: string[] = [];
    if (options?.limit != null) qs.push(`limit=${options.limit}`);
    if (options?.offset != null) qs.push(`offset=${options.offset}`);
    const q = qs.length ? `?${qs.join("&")}` : "";
    return request<OpenCodeMessage[]>(`/session/${id}/message${q}`);
  },

  getSessionStatus(directory?: string): Promise<Record<string, "busy" | "retry" | "idle">> {
    const q = directory ? `?directory=${encodeURIComponent(directory)}` : "";
    return request<Record<string, "busy" | "retry" | "idle">>(`/session/status${q}`);
  },

  replyPermission(
    id: string,
    permissionID: string,
    response: "once" | "always" | "reject",
  ): Promise<boolean> {
    return request<boolean>(`/session/${id}/permissions/${permissionID}`, {
      method: "POST",
      body: JSON.stringify({ response }),
    });
  },

  sendMessage(
    id: string,
    body: {
      parts?: { type: "text"; text: string }[];
      agent?: string;
      model?: { providerID: string; modelID: string };
    },
  ): Promise<OpenCodeMessage> {
    return request<OpenCodeMessage>(`/session/${id}/message`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  sendMessageAsync(
    id: string,
    body: {
      parts?: { type: "text"; text: string }[];
      agent?: string;
      model?: { providerID: string; modelID: string };
    },
  ): Promise<void> {
    return request<void>(`/session/${id}/prompt_async`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  abort(id: string): Promise<boolean> {
    return request<boolean>(`/session/${id}/abort`, { method: "POST" });
  },
};
