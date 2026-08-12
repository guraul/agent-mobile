import { opencodeConfig } from "../config/opencode";

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
  | { type: "text"; text?: string }
  | { type: "step-start"; title?: string }
  | { type: "step-finish"; stepType?: string }
  | { type: "tool"; tool?: string; state?: { status?: string }; input?: unknown; output?: unknown }
  | { type: "reasoning"; text?: string }
  | { type: "file"; file?: { path?: string; content?: string } }
  | { type: "snapshot"; isSnapshot?: boolean }
  | { type: "agent"; name?: string };

function authHeader(): string {
  const { username, password } = opencodeConfig;
  if (!password) return "";
  return "Basic " + btoa(`${username}:${password}`);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  const auth = authHeader();
  if (auth) headers["Authorization"] = auth;

  const res = await fetch(`${opencodeConfig.baseUrl}${path}`, {
    ...options,
    headers,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`opencode ${path} failed: ${res.status} ${res.statusText} ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const opencodeClient = {
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
