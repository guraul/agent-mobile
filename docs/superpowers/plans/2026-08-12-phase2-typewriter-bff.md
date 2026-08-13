# 阶段 2：打字机 + family-finance BFF 中间层 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 引入 family-finance BFF 中间层，手机端不再直连 opencode；BFF 缓冲合并 `message.part.delta` 推送增量事件，实现真流式打字机。

**Architecture:** BFF 落在 family-finance Next.js web（`packages/web/app/api/opencode/*`）。REST 用 catch-all `[...path]` 单路由转发到 opencode（凭证在服务端 env）；SSE 用 `/api/opencode/stream` 订阅 opencode `/global/event`，`message.part.delta` 缓冲合并后推 `delta` 事件。手机端 `opencode-client.ts` 拼 BFF 路径 + Bearer JWT，`message-reducer.ts` 新增 `applyPartDelta` 实现打字机。JWT 复用家庭理财账号体系，新增 Bearer header 支持。

**Tech Stack:** Next.js 14 (App Router) / jose / vitest / React Native (Expo 57) / AsyncStorage / Playwright

## Global Constraints

- **两个仓库**：BFF 改 `family-finance/`（Next.js），手机端改 `agent-mobile/agent-mobile-app/`（Expo）。两个仓库各自独立 git。
- **包管理器**：`pnpm`。BFF 构建：`pnpm build`（family-finance 根）。手机端单测：`pnpm test`（agent-mobile-app，vitest）。类型检查：`pnpm exec tsc --noEmit`。
- **opencode 端点**：REST 直连 `http://127.0.0.1:4096`；模型列表端点是 `GET /config/providers`（**不是** `/provider`），返回 `{ providers, default }`，需 Basic auth。
- **opencode SSE 事件**：`message.part.delta` 的 `properties` 含 `sessionID/messageID/partID/field/delta`；`message.part.updated` 的 `properties` 含 `sessionID/part/time`；`message.updated` 含 `sessionID/info`；`message.removed` 含 `sessionID/messageID`。
- **BFF stream 对手机端的事件格式**：沿用 `{ type, properties }`（手机端 `decodeSSEPayload` 无需改）。`delta` 事件 properties 用 `text` 字段（非 opencode 的 `delta` 字段）。
- **认证**：`/api/opencode/*` 全部强制 JWT（cookie 或 Bearer）。新增 `requireAuthHeader`。**登录复用现有 `POST /api/auth/login`**（JSON 响应新增返回 `token`，JWT 有效期 1 天）。
- **CORS**：所有 `/api/opencode/*` 响应带 CORS 头（允许 9928 预览 origins + `authorization`/`content-type` 头），OPTIONS 204。共享 `packages/web/lib/cors.ts`。
- **凭证**：opencode Basic auth 只存 family-finance `packages/web/.env.local` 的 `OPENCODE_*`，不入 git。手机端 `.env.local` 的 `EXPO_PUBLIC_OPENCODE_*` 密码删除。
- **安全收窄**：opencode serve 改 `--hostname 127.0.0.1`（Task 12）。
- **无新增注释**（除非必要），遵循各仓库现有代码风格。
- 本阶段不做 family-finance Mobile 客户端、不做权限分层、不做 BFF 缓存（provider 除外）。

---

### Task 1: BFF 认证扩展（`requireAuthHeader` + login 返回 token）

**Files:**
- Modify: `packages/web/lib/auth-shared.ts`
- Modify: `packages/web/app/api/auth/login/route.ts`
- Test: `packages/web/lib/auth-shared.test.ts`（新增）

**Interfaces:**
- Consumes: `verifyToken(token): Promise<{ username } | null>`（已存在）
- Produces: `requireAuthHeader(request: NextRequest): Promise<{ username: string } | null>`（从 `Authorization: Bearer` 读 token，兼容 cookie）
- Produces: login JSON 响应新增 `{ success: true, token }`

- [ ] **Step 1: 给 family-finance 引入 vitest**

  在 `family-finance/` 根：
  ```bash
  pnpm add -D vitest -w
  ```
  创建 `family-finance/vitest.config.ts`：
  ```ts
  import { defineConfig } from "vitest/config";
  import { fileURLToPath } from "node:url";

  export default defineConfig({
    test: {
      environment: "node",
      include: ["packages/**/*.test.{ts,tsx}"],
      globals: true,
    },
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./packages/web", import.meta.url)),
      },
    },
  });
  ```
  根 `package.json` 加脚本：`"test": "vitest run"`。

- [ ] **Step 2: 写失败测试**

  创建 `family-finance/packages/web/lib/auth-shared.test.ts`：
  ```ts
  import { describe, it, expect, beforeAll, afterAll } from "vitest";
  import { signToken, verifyToken } from "./auth-shared";

  describe("signToken/verifyToken", () => {
    it("round-trips a token", async () => {
      const token = await signToken({ username: "guraul" });
      const payload = await verifyToken(token);
      expect(payload?.username).toBe("guraul");
    });

    it("rejects a garbage token", async () => {
      expect(await verifyToken("nonsense")).toBeNull();
    });
  });
  ```
  运行 `pnpm test packages/web/lib/auth-shared.test.ts`，预期失败（无 JWT_SECRET env 或文件未创建）。

  创建 `family-finance/packages/web/.env.local`（若不存在）加入：
  ```
  JWT_SECRET=stage2-test-secret-change-in-prod
  ```

- [ ] **Step 3: 实现 `requireAuthHeader`**

  在 `auth-shared.ts` 末尾追加：
  ```ts
  // 从请求 Authorization: Bearer header 或 auth_token cookie 验证 token
  // （RN App 用 Bearer，浏览器用 cookie），失败返回 null
  export async function requireAuthHeader(request: NextRequest): Promise<{ username: string } | null> {
    const header = request.headers.get('authorization');
    if (header?.startsWith('Bearer ')) {
      const token = header.slice('Bearer '.length).trim();
      if (token) return verifyToken(token);
    }
    return requireAuth(request);
  }
  ```

- [ ] **Step 4: login JSON 响应加 token**

  在 `login/route.ts` 的 `signToken` 之后，非 form 分支返回：
  ```ts
  const response = isForm
    ? NextResponse.redirect(new URL('/trades', request.url))
    : NextResponse.json({ success: true, token });
  ```

- [ ] **Step 5: 测试通过**

  运行：`pnpm test packages/web/lib/auth-shared.test.ts`
  预期：PASS。

- [ ] **Step 6: 提交**

  ```bash
  git add -A
  git commit -m "feat: support Bearer auth header + login returns token"
  ```

---

### Task 2: opencode 服务端代理客户端（`lib/opencode.ts`）

**Files:**
- Create: `packages/web/lib/opencode.ts`
- Test: `packages/web/lib/opencode.test.ts`（新增）

**Interfaces:**
- Consumes: `process.env.OPENCODE_BASE_URL/OPENCODE_USERNAME/OPENCODE_PASSWORD`
- Produces:
  ```ts
  export function opencodeBaseUrl(): string;                       // env 或默认 http://127.0.0.1:4096
  export async function proxyRequest(path: string, init?: RequestInit): Promise<Response>;
  // 转发到 ${base}${path}，注入 Basic auth，保持方法/body/query；非 2xx 时返回携带 opencode 状态码的 Response
  ```

- [ ] **Step 1: 写失败测试**

  创建 `packages/web/lib/opencode.test.ts`：
  ```ts
  import { describe, it, expect } from "vitest";
  import { opencodeBaseUrl, proxyRequest } from "./opencode";

  describe("opencodeBaseUrl", () => {
    it("defaults to localhost:4096", () => {
      delete process.env.OPENCODE_BASE_URL;
      expect(opencodeBaseUrl()).toBe("http://127.0.0.1:4096");
    });
  });

  describe("proxyRequest", () => {
    it("injects Basic auth header and returns upstream response", async () => {
      const called: { url?: string; headers?: Headers } = {};
      const originalFetch = globalThis.fetch;
      globalThis.fetch = (async (url: any, init: any) => {
        called.url = String(url);
        called.headers = new Headers(init?.headers);
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
      }) as typeof fetch;
      try {
        process.env.OPENCODE_USERNAME = "opencode";
        process.env.OPENCODE_PASSWORD = "secret";
        const res = await proxyRequest("/session", { method: "GET" });
        expect(called.url).toBe("http://127.0.0.1:4096/session");
        expect(called.headers?.get("Authorization")).toBe("Basic " + btoa("opencode:secret"));
        expect(res.status).toBe(200);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("overwrites any incoming Authorization with opencode Basic auth", async () => {
      const called: { headers?: Headers } = {};
      const originalFetch = globalThis.fetch;
      globalThis.fetch = (async (_url: any, init: any) => {
        called.headers = new Headers(init?.headers);
        return new Response("ok", { status: 200 });
      }) as typeof fetch;
      try {
        process.env.OPENCODE_USERNAME = "opencode";
        process.env.OPENCODE_PASSWORD = "secret";
        await proxyRequest("/session", {
          method: "GET",
          headers: { Authorization: "Bearer client-jwt" },
        });
        expect(called.headers?.get("Authorization")).toBe("Basic " + btoa("opencode:secret"));
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("propagates upstream error status", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = (async () => new Response("nope", { status: 502 })) as typeof fetch;
      try {
        const res = await proxyRequest("/session/status");
        expect(res.status).toBe(502);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
  ```

- [ ] **Step 2: 运行测试确认失败**

  运行：`pnpm test packages/web/lib/opencode.test.ts`
  预期：FAIL（模块不存在）。

- [ ] **Step 3: 实现 `opencode.ts`**

  ```ts
  import { NextResponse } from "next/server";

  export function opencodeBaseUrl(): string {
    return process.env.OPENCODE_BASE_URL ?? "http://127.0.0.1:4096";
  }

  function authHeader(): string {
    const username = process.env.OPENCODE_USERNAME ?? "opencode";
    const password = process.env.OPENCODE_PASSWORD ?? "";
    return "Basic " + Buffer.from(`${username}:${password}`).toString("base64");
  }

  /** 转发请求到 opencode server，注入 Basic auth。上游错误状态原样返回。 */
  export async function proxyRequest(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    // 强制覆盖为 opencode 的 Basic auth：客户端传入的 Bearer JWT 是给 BFF 的，
    // 不能透传给 opencode（否则上游 401）。
    headers.delete("Authorization");
    headers.set("Authorization", authHeader());
    const url = `${opencodeBaseUrl()}${path}`;
    try {
      const res = await fetch(url, { ...init, headers });
      // 原样透传状态码与 body（JSON 或错误文本）
      const text = await res.text();
      const body = text
        ? { contentType: res.headers.get("content-type"), text }
        : null;
      return new NextResponse(body?.text ?? "", {
        status: res.status,
        headers: {
          "Content-Type": body?.contentType ?? "application/json",
        },
      });
    } catch (err) {
      return NextResponse.json(
        { error: `opencode server unreachable at ${url}` },
        { status: 502 },
      );
    }
  }
  ```

- [ ] **Step 4: 运行测试确认通过**

  运行：`pnpm test packages/web/lib/opencode.test.ts`
  预期：PASS。

- [ ] **Step 5: 提交**

  ```bash
  git add packages/web/lib/opencode.ts packages/web/lib/opencode.test.ts
  git commit -m "feat: add opencode proxy client with Basic auth"
  ```

---

### Task 3: REST 转发路由 `/api/opencode/rest/[...path]/route.ts`

**Files:**
- Create: `packages/web/app/api/opencode/rest/[...path]/route.ts`
- Create: `packages/web/lib/cors.ts`

**Interfaces:**
- Consumes: `requireAuthHeader`（Task 1）、`proxyRequest`（Task 2）
- Produces: 完整 REST 代理，方法签名与 opencode server 一致（`opencode-client.ts` 不改签名直接换 baseUrl 即可）；全部响应带 CORS 头
- Produces（cors.ts）：
  ```ts
  export const CORS_ORIGINS = ["http://106.13.181.13:9928", "http://127.0.0.1:9928", "http://localhost:9928"];
  export function corsHeaders(request: NextRequest): Record<string, string>;
  export function corsOptionsResponse(request: NextRequest): Response | null;
  // 非允许 origin 不返回 CORS 头；OPTIONS 请求返回 204 + 头（preflight）
  ```
- Routes 映射（`path.join('/')` 拼接，catch-all 内无静态段冲突）：
  - `session` → `/session`（GET，带 directory query）
  - `session/{id}` → `/session/{id}`（GET/PATCH/DELETE）
  - `session/status` → `/session/status`（GET）
  - `session/{id}/message` → `/session/{id}/message`（GET）
  - `session/{id}/prompt_async` → `/session/{id}/prompt_async`（POST）
  - `session/{id}/abort` → `/session/{id}/abort`（POST）
  - `config/providers` → `/config/providers`（GET）

- [ ] **Step 1: 实现 CORS helper**

  创建 `packages/web/lib/cors.ts`：
  ```ts
  import { NextRequest } from "next/server";

  // web 预览（9928）跨域 fetch BFF 的允许来源；RN 原生无 CORS 约束
  export const CORS_ORIGINS = [
    "http://106.13.181.13:9928",
    "http://127.0.0.1:9928",
    "http://localhost:9928",
  ];

  export function corsHeaders(request: NextRequest): Record<string, string> {
    const origin = request.headers.get("origin");
    if (!origin || !CORS_ORIGINS.includes(origin)) return {};
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "authorization, content-type",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    };
  }

  /** 处理 CORS preflight；非 OPTIONS 返回 null（继续正常流程）。 */
  export function corsOptionsResponse(request: NextRequest): Response | null {
    if (request.method !== "OPTIONS") return null;
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }
  ```

- [ ] **Step 2: 实现路由**

  创建 `packages/web/app/api/opencode/rest/[...path]/route.ts`：
  ```ts
  import { NextRequest } from "next/server";
  import { requireAuthHeader } from "@/lib/auth-shared";
  import { proxyRequest } from "@/lib/opencode";
  import { corsHeaders, corsOptionsResponse } from "@/lib/cors";

  export const dynamic = "force-dynamic";

  function json401(): Response {
    return new Response(JSON.stringify({ error: "未登录或登录已过期" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  function withCors(res: Response, request: NextRequest): Response {
    const headers = new Headers(res.headers);
    for (const [k, v] of Object.entries(corsHeaders(request))) headers.set(k, v);
    return new Response(res.body, { status: res.status, headers });
  }

  // 把请求转成对 opencode 的 path。path 数组 join 成原始路径，仅保留 query。
  function upstreamPath(path: string[], search: string): string {
    const base = path.join("/");
    return `${base}${search}`;
  }

  export async function OPTIONS(request: NextRequest) {
    return corsOptionsResponse(request) ?? new Response(null, { status: 204 });
  }

  export async function GET(request: NextRequest, ctx: { params: { path?: string[] } }) {
    if (!(await requireAuthHeader(request))) return json401();
    const path = ctx.params.path ?? [];
    const q = request.nextUrl.search;
    return withCors(await proxyRequest(upstreamPath(path, q), { method: "GET", headers: request.headers }), request);
  }

  export async function POST(request: NextRequest, ctx: { params: { path?: string[] } }) {
    if (!(await requireAuthHeader(request))) return json401();
    const path = ctx.params.path ?? [];
    const q = request.nextUrl.search;
    const body = await request.text();
    return withCors(await proxyRequest(upstreamPath(path, q), {
      method: "POST",
      headers: request.headers,
      body,
    }), request);
  }

  export async function PATCH(request: NextRequest, ctx: { params: { path?: string[] } }) {
    if (!(await requireAuthHeader(request))) return json401();
    const path = ctx.params.path ?? [];
    const body = await request.text();
    return withCors(await proxyRequest(path.join("/") + request.nextUrl.search, { method: "PATCH", headers: request.headers, body }), request);
  }

  export async function DELETE(request: NextRequest, ctx: { params: { path?: string[] } }) {
    if (!(await requireAuthHeader(request))) return json401();
    const path = ctx.params.path ?? [];
    return withCors(await proxyRequest(path.join("/") + request.nextUrl.search, { method: "DELETE", headers: request.headers }), request);
  }
  ```
  > 注：`ctx.params` 在 Next.js 14 为同步对象；若 15+ 异步，用 `await ctx.params`。以仓库实际版本（^14.0.4）为准。

- [ ] **Step 3: 类型检查**

  运行：`pnpm --filter web exec tsc --noEmit`（或 `cd packages/web && npx tsc --noEmit`）
  预期：通过（若报 auth-shared 导出缺失，回到 Task 1 检查）。

- [ ] **Step 4: 手动验证（本机 opencode 在 4096）**

  配置 `packages/web/.env.local` 追加：
  ```
  OPENCODE_BASE_URL=http://127.0.0.1:4096
  OPENCODE_USERNAME=opencode
  OPENCODE_PASSWORD=<4096 实际密码>
  ```
  重启 dev（`pnpm dev`，端口 19234），然后：
  ```bash
  TOKEN=$(curl -s -X POST http://127.0.0.1:19234/api/auth/login -H "Content-Type: application/json" -d '{"username":"<admin>","password":"<pw>"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
  curl -s http://127.0.0.1:19234/api/opencode/rest/project -H "Authorization: Bearer $TOKEN"
  curl -s -i -X OPTIONS http://127.0.0.1:19234/api/opencode/rest/project -H "Origin: http://106.13.181.13:9928" -H "Access-Control-Request-Method: GET" | head -10
  ```
  预期：第一个返回 opencode 项目列表 JSON；无 token 时返回 401；OPTIONS 返回 204 + `Access-Control-Allow-Origin` 头。

- [ ] **Step 5: 提交**

  ```bash
  git add packages/web/app/api/opencode packages/web/lib/cors.ts
  git commit -m "feat: add BFF REST proxy /api/opencode/rest/* with CORS"
  ```

---

### Task 4: SSE stream 纯逻辑（`lib/opencode-stream.ts`）+ 单测

**Files:**
- Create: `packages/web/lib/opencode-stream.ts`
- Test: `packages/web/lib/opencode-stream.test.ts`

**Interfaces:**
- Consumes: 无（纯函数）
- Produces:
  ```ts
  export interface BFFEvent { type: string; properties: Record<string, unknown> }
  export function parseOpencodeEvent(raw: string): BFFEvent | null;
  // 解析 opencode /global/event 的 SSE data（{ id, type, properties } 或 { payload: {...} }）；跳过 sync/server.heartbeat/step-start/step-finish
  export interface DeltaBuffer {
    push(ev: { sessionID: string; messageID: string; partID: string; field: string; delta: string }): void;
    flush(): BFFEvent[];        // 返回并清空自上次 flush 以来所有 delta 事件（每条 part 一条合并后）
    reset(): void;
  }
  export function createDeltaBuffer(): DeltaBuffer;
  // 纯累加，无内部定时器；由调用方（路由）周期性 flush
  ```

- [ ] **Step 1: 写失败测试**

  创建 `packages/web/lib/opencode-stream.test.ts`：
  ```ts
  import { describe, it, expect } from "vitest";
  import { parseOpencodeEvent, createDeltaBuffer } from "./opencode-stream";

  describe("parseOpencodeEvent", () => {
    it("parses a delta event", () => {
      const ev = parseOpencodeEvent(JSON.stringify({ id: "x", type: "message.part.delta", properties: { sessionID: "s", messageID: "m", partID: "p", field: "text", delta: "hi" } }));
      expect(ev?.type).toBe("message.part.delta");
    });

    it("skips sync frames and step narration", () => {
      expect(parseOpencodeEvent(JSON.stringify({ type: "sync", properties: {} }))).toBeNull();
      expect(parseOpencodeEvent(JSON.stringify({ type: "message.updated", properties: { sessionID: "s", info: { id: "m", role: "assistant" } } }))).not.toBeNull();
    });
  });

  describe("createDeltaBuffer", () => {
    it("aggregates deltas per part and flushes as delta events", () => {
      const buf = createDeltaBuffer();
      buf.push({ sessionID: "s", messageID: "m", partID: "p", field: "text", delta: "he" });
      buf.push({ sessionID: "s", messageID: "m", partID: "p", field: "text", delta: "llo" });
      const out = buf.flush();
      expect(out).toEqual([
        { type: "delta", properties: { sessionID: "s", messageID: "m", partID: "p", field: "text", text: "hello" } },
      ]);
    });

    it("keeps different parts separate", () => {
      const buf = createDeltaBuffer();
      buf.push({ sessionID: "s", messageID: "m", partID: "p1", field: "text", delta: "a" });
      buf.push({ sessionID: "s", messageID: "m", partID: "p2", field: "text", delta: "b" });
      expect(buf.flush()).toHaveLength(2);
    });

    it("flush drains the queue", () => {
      const buf = createDeltaBuffer();
      buf.push({ sessionID: "s", messageID: "m", partID: "p", field: "text", delta: "x" });
      buf.flush();
      expect(buf.flush()).toEqual([]);
    });
  });
  ```

- [ ] **Step 2: 运行测试确认失败**

  运行：`pnpm test packages/web/lib/opencode-stream.test.ts`
  预期：FAIL。

- [ ] **Step 3: 实现 `opencode-stream.ts`**

  ```ts
  export interface BFFEvent {
    type: string;
    properties: Record<string, unknown>;
  }

  const SKIP_TYPES = new Set(["sync", "server.heartbeat", "step-start", "step-finish"]);

  /** 解析 opencode /global/event 的 SSE data，过滤冗余事件。 */
  export function parseOpencodeEvent(raw: string): BFFEvent | null {
    try {
      const parsed = JSON.parse(raw);
      const payload = parsed.payload ?? parsed;
      if (!payload || typeof payload.type !== "string") return null;
      if (SKIP_TYPES.has(payload.type)) return null;
      return { type: payload.type, properties: payload.properties ?? {} };
    } catch {
      return null;
    }
  }

  export interface DeltaBuffer {
    push(d: { sessionID: string; messageID: string; partID: string; field: string; delta: string }): void;
    flush(): BFFEvent[];
    reset(): void;
  }

  /** 累积 text delta，flush 时按 part 合并为单条 delta 事件。无内部定时器，由调用方周期 flush。 */
  export function createDeltaBuffer(): DeltaBuffer {
    const pending = new Map<string, { sessionID: string; messageID: string; partID: string; field: string; text: string }>();

    const flush = (): BFFEvent[] => {
      if (pending.size === 0) return [];
      const out: BFFEvent[] = [];
      for (const item of pending.values()) {
        out.push({ type: "delta", properties: { sessionID: item.sessionID, messageID: item.messageID, partID: item.partID, field: item.field, text: item.text } });
      }
      pending.clear();
      return out;
    };

    const push = (d: { sessionID: string; messageID: string; partID: string; field: string; delta: string }) => {
      const key = `${d.sessionID}:${d.messageID}:${d.partID}:${d.field}`;
      const existing = pending.get(key);
      if (existing) existing.text += d.delta;
      else pending.set(key, { sessionID: d.sessionID, messageID: d.messageID, partID: d.partID, field: d.field, text: d.delta });
    };

    const reset = () => { pending.clear(); };

    return { push, flush, reset };
  }
  ```

- [ ] **Step 4: 运行测试确认通过**

  运行：`pnpm test packages/web/lib/opencode-stream.test.ts`
  预期：PASS。

- [ ] **Step 5: 提交**

  ```bash
  git add packages/web/lib/opencode-stream.ts packages/web/lib/opencode-stream.test.ts
  git commit -m "feat: add opencode SSE stream parser + delta buffer"
  ```

---

### Task 5: SSE 转发路由 `/api/opencode/stream/route.ts`

**Files:**
- Create: `packages/web/app/api/opencode/stream/route.ts`

**Interfaces:**
- Consumes: `requireAuthHeader`（Task 1）、`parseOpencodeEvent` / `createDeltaBuffer`（Task 4）
- Produces: SSE 响应，事件格式 `event: message\ndata: {type, properties}\n\n`；`?sessionID=` 过滤；长连接 + 心跳

- [ ] **Step 1: 实现路由**

  创建 `packages/web/app/api/opencode/stream/route.ts`：
  ```ts
  import { NextRequest } from "next/server";
  import { requireAuthHeader } from "@/lib/auth-shared";
  import { parseOpencodeEvent, createDeltaBuffer } from "@/lib/opencode-stream";
  import { opencodeBaseUrl } from "@/lib/opencode";
  import { corsHeaders, corsOptionsResponse } from "@/lib/cors";

  export const dynamic = "force-dynamic";
  export const runtime = "nodejs";

  function encode(ev: { type: string; properties: Record<string, unknown> }): string {
    return `event: message\ndata: ${JSON.stringify(ev)}\n\n`;
  }

  function authHeader(): string {
    const username = process.env.OPENCODE_USERNAME ?? "opencode";
    const password = process.env.OPENCODE_PASSWORD ?? "";
    return "Basic " + Buffer.from(`${username}:${password}`).toString("base64");
  }

  export async function OPTIONS(request: NextRequest) {
    return corsOptionsResponse(request) ?? new Response(null, { status: 204 });
  }

  export async function GET(request: NextRequest) {
    const preflight = corsOptionsResponse(request);
    if (preflight) return preflight;
    if (!(await requireAuthHeader(request))) {
      return new Response(JSON.stringify({ error: "未登录或登录已过期" }), { status: 401, headers: { "Content-Type": "application/json" } });
    }

    const sessionFilter = request.nextUrl.searchParams.get("sessionID");
    const buffer = createDeltaBuffer();

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (ev: { type: string; properties: Record<string, unknown> }) => {
          try { controller.enqueue(encoder.encode(encode(ev))); } catch { /* closed */ }
        };
        const flushTimer = setInterval(() => { for (const ev of buffer.flush()) send(ev); }, 32);
        const heartbeat = setInterval(() => send({ type: "server.heartbeat", properties: {} }), 10000);

        let closed = false;
        try {
          const res = await fetch(`${opencodeBaseUrl()}/global/event`, {
            headers: { Authorization: authHeader(), Accept: "text/event-stream" },
            signal: request.signal as AbortSignal,
          });
          if (!res.ok || !res.body) throw new Error(`upstream event stream ${res.status}`);
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buf = "";
          while (!closed) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            let idx;
            while ((idx = buf.indexOf("\n\n")) !== -1) {
              const chunk = buf.slice(0, idx);
              buf = buf.slice(idx + 2);
              const dataLine = chunk.split("\n").find((l) => l.startsWith("data:"));
              if (!dataLine) continue;
              const ev = parseOpencodeEvent(dataLine.slice(5).trim());
              if (!ev) continue;
              if (sessionFilter && ev.properties.sessionID !== sessionFilter) continue;
              if (ev.type === "message.part.delta") {
                const p = ev.properties as { sessionID: string; messageID: string; partID: string; field: string; delta: string };
                if (p.field === "text") buffer.push(p);
                continue;
              }
              send(ev);
            }
          }
        } catch (err) {
          if (!closed) send({ type: "stream.error", properties: { error: String(err) } });
        } finally {
          closed = true;
          clearInterval(flushTimer);
          clearInterval(heartbeat);
          buffer.reset();
          controller.close();
        }
      },
    });

    const cors = corsHeaders(request);
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
        Connection: "keep-alive",
        ...cors,
      },
    });
  }
  ```
  > 说明：`createDeltaBuffer` 无内部定时器，flush 由 `flushTimer`（32ms）驱动，事件经 `send` 入队。`message.part.delta` 只进 buffer（field=text），其余事件直接转发。SSE 响应同样带 CORS 头（web 预览 EventSource/fetch 跨域需要）。

- [ ] **Step 2: 类型检查**

  运行：`cd packages/web && npx tsc --noEmit`
  预期：通过。

- [ ] **Step 3: 手动验证**

  dev server 下（opencode 有真实对话时）：
  ```bash
  TOKEN=$(curl -s -X POST http://127.0.0.1:19234/api/auth/login -H "Content-Type: application/json" -d '{"username":"<admin>","password":"<pw>"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
  timeout 5 curl -s -N http://127.0.0.1:19234/api/opencode/stream -H "Authorization: Bearer $TOKEN" | head -5
  ```
  预期：输出 `event: message` + `data:` 行（server.connected / message.* 事件）。

- [ ] **Step 4: 提交**

  ```bash
  git add packages/web/app/api/opencode/stream/route.ts
  git commit -m "feat: add BFF SSE stream with delta buffering"
  ```

---

### Task 6: BFF 集成测试（node 脚本，`test/`）

**Files:**
- Create: `family-finance/test/bff-integration.mjs`

**Interfaces:**
- Consumes: dev server（19234）+ 真实 opencode（4096）
- Produces: 验证脚本，无产物

- [ ] **Step 1: 写脚本**

  ```js
  // 用法：node test/bff-integration.mjs <adminUser> <adminPw>
  // 前置：family-finance dev 在 19234，opencode 在 4096，.env.local 配好 OPENCODE_*
  const BASE = process.env.BFF_BASE ?? "http://127.0.0.1:19234";
  const [user, pw] = process.argv.slice(2);

  const assert = (cond, msg) => { if (!cond) { console.error("FAIL:", msg); process.exit(1); } console.log("PASS:", msg); };

  const login = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: user, password: pw }),
  });
  assert(login.status === 200, "login returns 200");
  const { token } = await login.json();
  assert(!!token, "login returns token");

  // 401 without token
  const noAuth = await fetch(`${BASE}/api/opencode/rest/project`);
  assert(noAuth.status === 401, "rest requires auth (401)");

  // REST proxy works
  const projects = await fetch(`${BASE}/api/opencode/rest/project`, { headers: { Authorization: `Bearer ${token}` } });
  assert(projects.status === 200, "rest/project returns 200");
  const list = await projects.json();
  assert(Array.isArray(list), "project list is array");

  // providers endpoint
  const providers = await fetch(`${BASE}/api/opencode/rest/config/providers`, { headers: { Authorization: `Bearer ${token}` } });
  assert(providers.status === 200, "config/providers returns 200");
  const pdata = await providers.json();
  assert(pdata && Array.isArray(pdata.providers), "providers shape has providers array");

  // stream requires auth
  const streamNoAuth = await fetch(`${BASE}/api/opencode/stream`);
  assert(streamNoAuth.status === 401, "stream requires auth (401)");

  console.log("ALL PASS");
  ```

- [ ] **Step 2: 运行**

  ```bash
  node family-finance/test/bff-integration.mjs <adminUser> <adminPw>
  ```
  预期：ALL PASS。

- [ ] **Step 3: 提交**

  ```bash
  git add family-finance/test/bff-integration.mjs
  git commit -m "chore: add BFF integration test script"
  ```

---

### Task 7: 手机端 auth 基础设施（token 存取 + login）

**Files:**
- Modify: `agent-mobile-app/package.json`
- Modify: `agent-mobile-app/src/config/opencode.ts`
- Create: `agent-mobile-app/src/services/auth.ts`

**Interfaces:**
- Consumes: `opencodeConfig.baseUrl`（指向 BFF）
- Produces:
  ```ts
  export async function getToken(): Promise<string | null>;
  export async function setToken(token: string | null): Promise<void>;
  export async function loadToken(): Promise<string | null>;
  // 启动时把 storage 中的 token 载入 opencodeConfig.token（tokenHeader 依赖内存值）
  export async function login(username: string, password: string): Promise<string>;
  // login 调用 POST /api/auth/login（复用家庭理财登录，JSON 响应带 token）
  export function tokenHeader(): Record<string, string>;
  export function onUnauthorized(cb: () => void): () => void;
  // 401 时触发订阅回调（登录横幅联动）；返回退订函数
  ```

- [ ] **Step 1: 安装 AsyncStorage**

  ```bash
  cd agent-mobile-app
  pnpm exec expo install @react-native-async-storage/async-storage
  ```

- [ ] **Step 2: 改 `config/opencode.ts`**

  ```ts
  export const opencodeConfig = {
    baseUrl:
      process.env.EXPO_PUBLIC_OPENCODE_URL ??
      "http://110.40.136.33:19234",
    // 登录后写入的 JWT；opencode Basic auth 凭证不再进客户端
    token: "",
  };
  ```
  > 说明：baseUrl 默认指向 BFF（:19234）。BFF 地址按实际部署填写（本地预览可临时用 127.0.0.1:19234）。**删除 username/password 字段**（凭证不再进 APK）。

- [ ] **Step 3: 实现 `services/auth.ts`**

  ```ts
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
    } catch { /* storage failure — keep in-memory */ }
  }

  /** 启动时调用：把持久化 token 载入内存（tokenHeader 依赖 opencodeConfig.token）。 */
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

  /** 订阅 401 事件（登录横幅联动）。 */
  export function onUnauthorized(cb: () => void): () => void {
    unauthorizedCb = cb;
    return () => { unauthorizedCb = null; };
  }

  /** 由请求层在收到 401 时调用：清 token + 通知横幅。 */
  export async function handleUnauthorized(): Promise<void> {
    await setToken(null);
    unauthorizedCb?.();
  }
  ```

- [ ] **Step 4: 类型检查**

  运行：`cd agent-mobile-app && pnpm exec tsc --noEmit`
  预期：通过。

- [ ] **Step 5: 提交**

  ```bash
  git add agent-mobile-app/src/config/opencode.ts agent-mobile-app/src/services/auth.ts agent-mobile-app/package.json agent-mobile-app/pnpm-lock.yaml
  git commit -m "feat: add BFF auth (AsyncStorage token + login)"
  ```

---

### Task 8: `opencode-client.ts` 接 BFF（Bearer + login + listProviders）

**Files:**
- Modify: `agent-mobile-app/src/services/opencode-client.ts`

**Interfaces:**
- Consumes: `tokenHeader` / `handleUnauthorized` / `login`（Task 7）
- Produces: 方法签名不变；内部拼 `/api/opencode/rest/`；新增 `login()` / `listProviders()`；401 时自动清 token 并通知横幅
  ```ts
  login(username: string, password: string): Promise<string>
  listProviders(): Promise<{ providers: unknown[]; default: unknown }>
  ```

- [ ] **Step 1: 修改 client**

  - `request` 的 URL 改为 `${opencodeConfig.baseUrl}/api/opencode/rest${path}`（若 path 已是 `/api/...` 则直接拼 baseUrl）
  - `request` 头合并 `tokenHeader()`（删除 Basic auth——BFF 用 JWT，凭证不进客户端）
  - `request` 收到 401 时调用 `handleUnauthorized()` 再抛错
  - 新增：
  ```ts
  login(username: string, password: string): Promise<string> {
    return loginToBff(username, password);
  },
  listProviders(): Promise<{ providers: { id: string; name?: string; models: Record<string, unknown> }[]; default: Record<string, string> }> {
    return request<...>(`/config/providers`);
  },
  ```
  将 `auth.ts` 的 `login`/`tokenHeader`/`handleUnauthorized` 导入并在此调用。

- [ ] **Step 2: 类型检查**

  运行：`cd agent-mobile-app && pnpm exec tsc --noEmit`
  预期：通过。

- [ ] **Step 3: 提交**

  ```bash
  git add agent-mobile-app/src/services/opencode-client.ts
  git commit -m "feat: point opencode-client at BFF with JWT + providers"
  ```

---

### Task 9: `message-reducer.ts` 新增 `applyPartDelta`

**Files:**
- Modify: `agent-mobile-app/src/services/message-reducer.ts`
- Test: `agent-mobile-app/src/services/message-reducer.test.ts`

**Interfaces:**
- Consumes: `OpenCodeMessage`, `OpenCodePart`
- Produces:
  ```ts
  export function applyPartDelta(
    messages: OpenCodeMessage[],
    delta: { messageID: string; partID: string; field: string; text: string },
  ): OpenCodeMessage[];
  // 定位 messageID → partID，把 text 追加到该 part 的 text 字段；找不到则原样返回
  ```

- [ ] **Step 1: 写失败测试**

  在 `message-reducer.test.ts` 追加：
  ```ts
  import { applyPartDelta } from "./message-reducer";

  describe("applyPartDelta", () => {
    const base = (text: string, partId = "p1", messageId = "m1") => ([
      { info: { id: messageId, role: "assistant" as const, sessionID: "s1", time: { created: 1 } },
        parts: [{ type: "text" as const, text, id: partId }] },
    ]);

    it("appends delta text to the target part", () => {
      const out = applyPartDelta(base("Hello"), { messageID: "m1", partID: "p1", field: "text", text: " world" });
      expect((out[0].parts[0] as { text: string }).text).toBe("Hello world");
    });

    it("leaves list unchanged when part/message missing", () => {
      const src = base("Hello");
      expect(applyPartDelta(src, { messageID: "nope", partID: "p1", field: "text", text: "x" })).toBe(src);
      expect(applyPartDelta(src, { messageID: "m1", partID: "nope", field: "text", text: "x" })).toBe(src);
    });

    it("creates a text part when absent and message exists", () => {
      const src = [{ info: { id: "m1", role: "assistant" as const, sessionID: "s1", time: { created: 1 } }, parts: [] }];
      const out = applyPartDelta(src, { messageID: "m1", partID: "p9", field: "text", text: "first" });
      expect(out[0].parts).toHaveLength(1);
      expect((out[0].parts[0] as { text: string }).text).toBe("first");
    });
  });
  ```

- [ ] **Step 2: 运行测试确认失败**

  运行：`cd agent-mobile-app && pnpm exec vitest run src/services/message-reducer.test.ts`
  预期：FAIL（applyPartDelta 不存在）。

- [ ] **Step 3: 实现**

  在 `message-reducer.ts` 追加：
  ```ts
  /** 追加 delta 文本到目标 part；message 或 part 不存在时原样返回。 */
  export function applyPartDelta(
    messages: OpenCodeMessage[],
    delta: { messageID: string; partID: string; field: string; text: string },
  ): OpenCodeMessage[] {
    const idx = findIndex(messages, delta.messageID);
    if (idx === -1) return messages;
    const parts = messages[idx].parts;
    const pIdx = parts.findIndex((p) => (p as PartWithIds).id === delta.partID);
    const next = [...messages];
    if (pIdx === -1) {
      next[idx] = { ...next[idx], parts: [...parts, { type: "text", text: delta.text, id: delta.partID } as unknown as OpenCodePart] };
      return next;
    }
    const part = parts[pIdx];
    if (delta.field === "text") {
      const text = (part as { text?: string }).text ?? "";
      next[idx] = { ...next[idx], parts: parts.map((p, i) => i === pIdx ? { ...p, text: text + delta.text } : p) };
      return next;
    }
    return messages;
  }
  ```

- [ ] **Step 4: 运行测试确认通过**

  运行：`pnpm exec vitest run src/services/message-reducer.test.ts`
  预期：PASS。

- [ ] **Step 5: 全量单测**

  运行：`pnpm test`
  预期：全部通过。

- [ ] **Step 6: 提交**

  ```bash
  git add agent-mobile-app/src/services/message-reducer.ts agent-mobile-app/src/services/message-reducer.test.ts
  git commit -m "feat: add applyPartDelta for typewriter increments"
  ```

---

### Task 10: `opencode-events.ts` 接 BFF stream + delta 事件类型 + sessionID 过滤

**Files:**
- Modify: `agent-mobile-app/src/services/opencode-events.ts`
- Test: `agent-mobile-app/src/services/opencode-events.test.ts`

**Interfaces:**
- Consumes: `opencodeConfig`, `tokenHeader`（Task 7）
- Produces: `OpenCodeEvent` 增加 delta 变体；`subscribeToOpenCodeEvents(onEvent, onError?, sessionID?)` 改连 `/api/opencode/stream`（带 `?sessionID=` 时 BFF 端过滤）
  ```ts
  export function subscribeToOpenCodeEvents(
    onEvent: (event: OpenCodeEvent) => void,
    onError?: (err: unknown) => void,
    sessionID?: string,
  ): () => void;
  ```

- [ ] **Step 1: 写失败测试（类型）**

  在 `opencode-events.test.ts` 追加：
  ```ts
  import { parseSSE } from "./opencode-events";
  it("parses BFF delta event data", () => {
    const out = parseSSE('event: message\ndata: {"type":"delta","properties":{"sessionID":"s","messageID":"m","partID":"p","field":"text","text":"hi"}}\n');
    expect(out?.event).toBe("message");
    expect(JSON.parse(out!.data).type).toBe("delta");
  });
  ```

- [ ] **Step 2: 修改类型与订阅**

  - `OpenCodeEvent` 联合类型新增：
  ```ts
  | { type: "delta"; properties: { sessionID: string; messageID: string; partID: string; field: string; text: string } }
  | { type: "stream.error"; properties: { error?: string } }
  ```
  - `subscribeToOpenCodeEvents` 加第三参数 `sessionID?: string`；URL 改为 `${opencodeConfig.baseUrl}/api/opencode/stream` + （`sessionID` 时 `?sessionID=${encodeURIComponent(sessionID)}`），头合并 `tokenHeader()`。

- [ ] **Step 3: 单测通过 + 全量**

  运行：`pnpm test`
  预期：全部通过。

- [ ] **Step 4: 提交**

  ```bash
  git add agent-mobile-app/src/services/opencode-events.ts agent-mobile-app/src/services/opencode-events.test.ts
  git commit -m "feat: subscribe to BFF stream with delta events"
  ```

---

### Task 11: ChatPanel 消费 delta + 动态模型列表 + pulse 登录横幅

**Files:**
- Modify: `agent-mobile-app/src/components/chat/ChatPanel.tsx`
- Modify: `agent-mobile-app/src/app/(tabs)/pulse.tsx`

**Interfaces:**
- Consumes: `applyPartDelta`（Task 9）、`loadToken`/`login`/`onUnauthorized`（Task 7）、`listProviders`（Task 8）、`delta` 事件 + `subscribeToOpenCodeEvents(onEvent, onError, sessionID)`（Task 10）
- Produces: 打字机渲染 + 动态模型 BottomSheet + pulse 顶部"未登录"横幅（点击弹窗登录）

- [ ] **Step 1: SSE 分支加 delta + 传 sessionID**

  在 `ChatPanel.tsx`：
  - 订阅改为 `subscribeToOpenCodeEvents((event) => {...}, undefined, sessionID)`（BFF 端过滤，省带宽）
  - 回调加：
  ```tsx
  } else if (event.type === "delta") {
    const d = event.properties;
    if (d.sessionID === sessionID) {
      setMessages((prev) => {
        const next = applyPartDelta(prev, { messageID: d.messageID, partID: d.partID, field: d.field, text: d.text });
        recomputeDisplay(next);
        return next.length > MAX_MESSAGES ? next.slice(next.length - MAX_MESSAGES) : next;
      });
    }
  }
  ```

- [ ] **Step 2: 动态模型列表**

  替换 `AGENT_MODELS` 常量逻辑：mount 时 `listProviders()`，把 `providers` 平铺成 `{ providerID, modelID }[]` 存入 state（失败时回退 `PRIMARY_AGENTS` 的 model）；BottomSheet 渲染该列表；退出 sheet 刷新。保留 `PRIMARY_AGENTS` 用于 agent 切换与默认 model。

- [ ] **Step 3: pulse.tsx 登录横幅**

  在 `pulse.tsx` 顶部（列表上方）加横幅：
  ```tsx
  const [needLogin, setNeedLogin] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    loadToken().then((tok) => setNeedLogin(!tok));
    return onUnauthorized(() => setNeedLogin(true));
  }, []);

  const doLogin = async () => {
    try {
      setLoginError(null);
      await login(loginUser, loginPass);
      setNeedLogin(false);
      setLoginOpen(false);
    } catch (e) {
      setLoginError(e instanceof Error ? e.message : String(e));
    }
  };
  ```
  渲染（用现有 theme 组件，勿硬编码颜色）：
  ```tsx
  {needLogin ? (
    <Pressable onPress={() => setLoginOpen(true)} accessibilityRole="button">
      <Box padding="sm" backgroundColor="surface.1" rounded="md" margin="sm">
        <Text variant="caption" color="accent">未登录 — 点击登录</Text>
      </Box>
    </Pressable>
  ) : null}
  <BottomSheet visible={loginOpen} onClose={() => setLoginOpen(false)}>
    <TextInput placeholder="账号" value={loginUser} onChangeText={setLoginUser} autoCapitalize="none" />
    <TextInput placeholder="密码" value={loginPass} onChangeText={setLoginPass} secureTextEntry />
    {loginError ? <Text variant="caption" color="error">{loginError}</Text> : null}
    <Button variant="primary" label="登录" onPress={doLogin} />
  </BottomSheet>
  ```
  > 注：登录弹窗与横幅不拦截浏览（页面照常渲染，请求失败显示现有错误）。`BottomSheet` 从 `@/components/navigation/BottomSheet` 导入（ChatPanel 已使用同款）。

- [ ] **Step 4: 类型检查 + 全量单测**

  运行：`cd agent-mobile-app && pnpm exec tsc --noEmit && pnpm test`
  预期：通过。

- [ ] **Step 5: 提交**

  ```bash
  git add agent-mobile-app/src/components/chat/ChatPanel.tsx agent-mobile-app/src/app/\(tabs\)/pulse.tsx
  git commit -m "feat: consume delta for typewriter + dynamic model list + login banner"
  ```

---

### Task 12: E2E 验证 + 安全收窄 + 知识库更新

**Files:**
- Create: `agent-mobile/test/bff-e2e.mjs`（Playwright）
- Modify: `docs/knowledge-base/modules/chat.md`
- Modify: `docs/knowledge-base/API.md`
- Modify: `docs/knowledge-base/OPERATIONS.md`

**Interfaces:**
- Consumes: 阶段 2 全部改动 + dev 环境（BFF 19234、opencode 4096）

- [ ] **Step 1: 写 Playwright 脚本**

  参考现有 `test/agent-pill-verify.mjs` 模式，流程：登录（page.evaluate fetch POST /api/auth/login → token 写 localStorage 键 `pulse_opencode_token`）→ reload → 打开项目 → 发消息 → 捕获增量事件（断言出现 `delta` type）→ 断言最终文本完整 + step 顺序正确。

- [ ] **Step 2: 运行验证**

  前置：`pnpm exec expo export --platform web` 构建 + 9928 静态服务 + BFF dev（19234）+ opencode（4096）。
  预期：打字机增量出现、step 顺序正确、动态模型列表可见、登录横幅消失。

- [ ] **Step 3: 安全收窄 opencode serve**

  - 重启 opencode serve 为 `--hostname 127.0.0.1`（移除 `--hostname 0.0.0.0`），仅 BFF 本机可访问
  - 删除 `agent-mobile-app/.env.local` 中 `EXPO_PUBLIC_OPENCODE_USERNAME` / `EXPO_PUBLIC_OPENCODE_PASSWORD`（凭证不再进 APK）
  - 验证：`curl http://<公网IP>:4096/global/health` 超时（不可达），`curl http://127.0.0.1:4096/global/health` 正常

- [ ] **Step 4: 更新知识库**

  - `modules/chat.md`：数据流加 BFF；`message.part.delta`/打字机说明；动态模型列表；登录横幅。
  - `API.md`：新增 `/api/opencode/*` 接口表（含 stream 协议、config/providers、CORS）。
  - `OPERATIONS.md`：新增 `OPENCODE_*` 环境变量（family-finance 侧）、BFF 部署说明、集成测试命令；opencode serve 收窄为 127.0.0.1；手机端 env 清理。
  - 顺带修正知识库遗留旧描述：`services.md` 的 `mergeMessages` 旧签名（已删 `mergeGapMs`）、`ARCHITECTURE.md` 聊天数据流图中"合并 assistant step + 2min 阈值"旧文案。

- [ ] **Step 5: 提交**

  ```bash
  git add agent-mobile/test/bff-e2e.mjs
  git -C agent-mobile/docs commit -m "docs: stage-2 BFF + typewriter knowledge-base update"
  git -C agent-mobile-app commit -m "chore: stage-2 E2E verification"
  ```

---

## Self-Review 记录

**1. Spec 覆盖：**
- BFF 认证（requireAuthHeader + login 复用 /api/auth/login 返回 token）→ Task 1 ✓
- opencode 服务端代理 + Basic auth（强制覆盖，不透传客户端 JWT）→ Task 2 ✓
- REST 转发路由（catch-all + CORS + OPTIONS preflight）→ Task 3 ✓
- SSE delta 缓冲 + 过滤 + sessionID 过滤 → Task 4/5 ✓
- 模型列表聚合（config/providers）→ Task 3/8 ✓
- 手机端 baseUrl/Bearer/login（AsyncStorage）+ 401 联动 → Task 7/8 ✓
- applyPartDelta 打字机 → Task 9 ✓
- SSE 消费 delta + stream sessionID 过滤 → Task 10/11 ✓
- 动态模型列表 → Task 11 ✓
- 登录横幅 + 登录弹窗（pulse 顶部）→ Task 11 ✓
- 错误处理（401 清 token 显横幅 / 502）→ Task 8/11 + BFF 502 在 Task 2 ✓
- 安全收窄（opencode 127.0.0.1 + 手机端凭证清理）→ Task 12 ✓
- 测试（单测/集成/E2E/知识库）→ Task 6/12 ✓

**2. 占位符扫描：** 无 TBD/TODO。`<admin>`/`<pw>`/`<实际密码>` 为运行命令所需的真实值，标注了来源。

**3. 类型一致性：**
- `requireAuthHeader(request): Promise<{username}|null>` 在 Task 1 定义，Task 3/5 使用一致。
- `proxyRequest(path, init): Promise<Response>` Task 2 定义，Task 3 使用一致；**强制覆盖 Authorization 为 Basic**（已修 bug）。
- `parseOpencodeEvent(raw): BFFEvent | null`、`createDeltaBuffer(): DeltaBuffer` Task 4 定义，Task 5 使用一致。
- `corsHeaders(request)` / `corsOptionsResponse(request)` Task 3 定义，Task 5 复用一致。
- `applyPartDelta(messages, {messageID, partID, field, text}): OpenCodeMessage[]` Task 9 定义，Task 11 使用一致。
- BFF delta 事件 properties 字段统一 `text`（非 `delta`），Task 4/5/9/10/11 一致。
- `subscribeToOpenCodeEvents(onEvent, onError?, sessionID?)` Task 10 定义，Task 11 使用一致。
- `login(username, password)` 统一调 `/api/auth/login`（非 `/api/opencode/auth/login`），Task 1/6/7/12 一致。
- `listProviders(): {providers, default}` Task 8 定义，Task 11 使用一致。
- opencode 端点为 `/config/providers`，Task 3/6/8 一致。

**4. 已知实现风险（已在任务内说明）：**
- 打字机渲染性能：delta 32ms 一条，全量 markdown 重渲染可能卡顿；缓解见 spec 风险节（16ms dispatcher 批量 + memo），本计划不改（Task 12 E2E 观察）。
- reasoning delta 会一并推送（field=text），前端追加无害，已知行为。
- Task 12 安全收窄依赖 opencode serve 重启（systemd），执行时需确认服务可用。
