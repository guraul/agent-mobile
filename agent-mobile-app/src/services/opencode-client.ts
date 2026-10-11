import { getBaseUrl } from "../config/opencode";
import { tokenHeader, handleUnauthorized, login as loginToBff } from "./auth";

export interface OpenCodeProject {
  id: string;
  worktree: string;
  vcs?: string;
}

export interface QuestionOption {
  label: string;
  description?: string;
}

export interface QuestionInfo {
  question: string;
  header?: string;
  options?: QuestionOption[];
  multiple?: boolean;
  custom?: boolean;
}

export interface QuestionRequest {
  id: string;
  sessionID: string;
  questions: QuestionInfo[];
  tool?: { messageID?: string; callID?: string };
}

export interface PermissionRequest {
  id: string;
  sessionID: string;
  // #53（E1 v2）：字段名 permission/patterns → action/resources（旧名保留可选兼容）
  permission?: string;
  action?: string;
  patterns?: string[];
  resources?: string[];
  metadata?: Record<string, unknown>;
  tool?: { messageID?: string; callID?: string };
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
    // Model-call failure carried on the message envelope. At runtime this is
    // a NamedError object ({ name, data }), not a string.
    error?: unknown;
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

  const res = await fetch(`${getBaseUrl()}/api/opencode/rest${path}`, {
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
  const json = await res.json();
  // #53（E1 v2）：所有 REST 响应带 {data:...} 信封（/api/provider 还带 location）——统一解包
  if (json && typeof json === "object" && !Array.isArray(json) && "data" in (json as Record<string, unknown>)) {
    return (json as { data: T }).data;
  }
  return json as T;
}

// #53（E1 v2）：form（question 机制的 v2 形态）。fields 为多字段定义；
// answer 为 {fieldKey: value}（multiselect → string[]）。
export interface FormRequest {
  id: string;
  sessionID: string;
  title?: string;
  metadata?: Record<string, unknown>;
  fields?: {
    key: string;
    title?: string;
    description?: string;
    type?: string;
    required?: boolean;
    hidden?: boolean;
    options?: (string | { label?: string })[];
  }[];
}

// #53（E1 v2）：扁平消息（元数据 + content）→ App 的 {info, parts} 模型。
// content 项无全局 id 的用 `${messageID}:c${index}` 合成（占位/事件流用块类型+ordinal，
// 两者不同空间——占位 part 只活在流式期间，refetch 后被真 parts 替换）。
interface V2Message {
  id: string;
  type: string;
  sessionID?: string;
  time?: { created?: number };
  content?: {
    type: string;
    text?: string;
    id?: string;
    name?: string;
    state?: { status?: string; input?: unknown; output?: unknown; title?: string; metadata?: Record<string, unknown> };
  }[];
  // prompt 响应里的用户消息用 payload 携带文本（无 content 数组）
  payload?: { text?: string };
  error?: unknown;
}

function mapV2Message(m: V2Message): OpenCodeMessage {
  const role: "user" | "assistant" = m.type === "user" ? "user" : "assistant";
  const content = m.content ?? (m.payload?.text ? [{ type: "text", text: m.payload.text }] : []);
  const parts = (content as NonNullable<V2Message["content"]>).map((c, i): OpenCodePart => {
    const id = c.id ?? `${m.id}:c${i}`;
    if (c.type === "tool") {
      return { id, type: "tool", tool: c.name, state: c.state } as OpenCodePart;
    }
    return { id, type: c.type, text: c.text } as OpenCodePart;
  });
  return {
    info: { id: m.id, role, sessionID: m.sessionID ?? "", time: { created: m.time?.created ?? 0 } },
    parts,
  };
}

export const opencodeClient = {
  login(username: string, password: string): Promise<string> {
    return loginToBff(username, password);
  },

  // #53（E1 v2）：/config/providers → /api/model 扁平表，聚合成 v1 形状（selectModels 零改动）
  async listProviders(): Promise<{ providers: { id: string; name?: string; models: Record<string, unknown> }[]; default: Record<string, string> }> {
    const flat = await request<{ id: string; providerID: string; modelID: string; name?: string }[]>("/model");
    const byProvider = new Map<string, { id: string; name?: string; models: Record<string, unknown> }>();
    for (const m of flat ?? []) {
      let p = byProvider.get(m.providerID);
      if (!p) {
        p = { id: m.providerID, name: m.providerID, models: {} };
        byProvider.set(m.providerID, p);
      }
      p.models[m.modelID] = { name: m.name ?? m.modelID };
    }
    return { providers: Array.from(byProvider.values()), default: {} };
  },

  listAgents(): Promise<{ name: string; mode?: string; model?: { providerID: string; modelID: string } }[]> {
    return request(`/agent`);
  },

  // #53（E1 v2）：project 形状 {id, canonical} → App 的 {id, worktree=projectPath 语义}
  async getProject(): Promise<OpenCodeProject[]> {
    const list = await request<{ id: string; canonical?: string; worktree?: string }[]>("/project");
    return (list ?? []).map((p) => ({ id: p.id, worktree: p.worktree ?? p.canonical ?? "" }));
  },

  listSessions(directory?: string): Promise<OpenCodeSession[]> {
    const q = directory ? `?directory=${encodeURIComponent(directory)}` : "";
    return request<OpenCodeSession[]>(`/session${q}`);
  },

  getSession(id: string): Promise<OpenCodeSession> {
    return request<OpenCodeSession>(`/session/${id}`);
  },

  createSession(body: {
    directory?: string;
    title?: string;
    // #53（E1 v2）：agent/model 建会话时定（逐消息指定已废除）
    agent?: string;
    model?: { providerID: string; modelID: string };
  }): Promise<OpenCodeSession> {
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

  // #53（E1 v2）：消息列表只含元数据（无 content），content 在单条端点；分页改 cursor/order。
  // 这里拉一页元数据（desc 取最近）→ 并行拉 content → 映射回 App 的 {info, parts} 模型
  // （chronological 语义不变：返回前按 time.created 排序）。
  async listMessages(id: string, options?: { limit?: number; offset?: number }): Promise<OpenCodeMessage[]> {
    const limit = options?.limit ?? 50;
    const raw = await request<V2Message[]>(`/session/${id}/message?limit=${limit}&order=desc`);
    const detailed = await Promise.all(
      raw.map(async (m) => {
        try {
          return await request<V2Message>(`/session/${id}/message/${m.id}`);
        } catch {
          return m; // 单条失败降级用元数据（无 content，渲染层跳过空 part）
        }
      }),
    );
    return detailed
      .map(mapV2Message)
      .sort((a, b) => (a.info.time?.created ?? 0) - (b.info.time?.created ?? 0));
    // 语义红线：chronological（旧在前）不变——排序以 time.created 为准
  },

  getSessionStatus(directory?: string): Promise<Record<string, "busy" | "retry" | "idle">> {
    const q = directory ? `?directory=${encodeURIComponent(directory)}` : "";
    return request<Record<string, "busy" | "retry" | "idle">>(`/session/status${q}`);
  },

  // Reply to a permission request (bash/edit/external-directory access etc).
  // `reply` is once/always/reject; an optional message accompanies a reject.
  replyPermission(
    sessionID: string,
    requestID: string,
    reply: "once" | "always" | "reject",
    message?: string,
  ): Promise<boolean> {
    return request<boolean>(`/session/${sessionID}/permissions/${requestID}/reply`, {
      method: "POST",
      body: JSON.stringify({ reply, ...(message ? { message } : {}) }),
    });
  },

  // List pending permission requests (the agent is blocked waiting). Used to
  // recover a permission asked before this chat opened (SSE won't replay it).
  listPermissions(): Promise<PermissionRequest[]> {
    return request<PermissionRequest[]>(`/permission`);
  },

  // Reply to a `question` tool request (the agent asks a clarifying question and
  // blocks until answered). `answers` is one entry per question in the request;
  // each entry is the array of selected option labels (empty = unanswered).
  // #53（E1 v2）：question 机制改为 form（form.created/replied/cancelled + session.form.* 端点）。
  // reply 的 answer 是 {字段名: 值} 记录（form Answer）。
  replyForm(sessionID: string, formID: string, answer: Record<string, string | string[]>): Promise<boolean> {
    return request<boolean>(`/session/${sessionID}/form/${formID}/reply`, {
      method: "POST",
      body: JSON.stringify({ answer }),
    });
  },

  cancelForm(sessionID: string, formID: string): Promise<boolean> {
    return request<boolean>(`/session/${sessionID}/form/${formID}`, { method: "DELETE" });
  },

  // 恢复聊天打开前已 pending 的 form（SSE 不重放 form.created）
  listForms(sessionID: string): Promise<FormRequest[]> {
    return request<FormRequest[]>(`/session/${sessionID}/form`);
  },

  // 运行中切换 agent/model（chatcode 选择器用；chat 侧建会话已定 companion+space-bunny）
  switchAgent(id: string, agent: string): Promise<boolean> {
    return request<boolean>(`/session/${id}/agent`, { method: "POST", body: JSON.stringify({ agent }) });
  },

  switchModel(id: string, model: { providerID: string; modelID: string }): Promise<boolean> {
    return request<boolean>(`/session/${id}/model`, { method: "POST", body: JSON.stringify({ providerID: model.providerID, id: model.modelID }) });
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

  // #69：v2 prompt 响应即用户消息（v1 靠 message.updated 回传，v2 无此事件）——
  // 返回映射后的 OpenCodeMessage 供调用方立即渲染用户气泡
  async sendMessageAsync(
    id: string,
    body: {
      parts?: { type: "text"; text: string }[];
      agent?: string;
      model?: { providerID: string; modelID: string };
    },
  ): Promise<OpenCodeMessage | undefined> {
    const raw = await request<V2Message | undefined>(`/session/${id}/prompt_async`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return raw ? mapV2Message(raw) : undefined;
  },

  abort(id: string): Promise<boolean> {
    return request<boolean>(`/session/${id}/abort`, { method: "POST" });
  },
};
