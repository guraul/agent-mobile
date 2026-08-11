# Plan: Pulse 事件内集成 opencode 对话开发

> 创建：2026-08-10
> 状态：进行中（阶段 1 起）
> 关联需求：事件详情内实现 opencode session CRUD + 完整对话（流式+工具）

## 目标

Pulse Web 应用中，**每个事件对应一个真实项目**，在事件详情里可对该项目的 opencode session 做 **CRUD** 并**完整对话**（流式回复 + 工具调用展示）。

## 已确认的需求决策

| 项 | 决策 |
|---|---|
| 平台 | Web 浏览器优先（复用 9928 dev server） |
| 事件↔session | 一个事件对应一个项目；项目下可 CRUD session |
| 交互级别 | 完整对话 + 流式 + 工具调用展示 |
| server 位置 | 本机/服务器跑 `opencode serve` |
| 客户端 | 安装最新 `@opencode-ai/sdk` |
| 项目来源 | 事件硬编码 `projectPath` 映射真实项目（`/root/project/*`） |
| BFF | 第一版不加，前端直连 opencode server |
| 认证 | `OPENCODE_SERVER_PASSWORD` + Basic auth |

## 架构

```
浏览器 (9928, RN Web)
   │  HTTP + SSE, Basic auth (OPENCODE_SERVER_PASSWORD)
   ▼
opencode serve (:4096, systemd 托管)
   │
   ▼
provider (deepseek / volcengine / agnes)
```

opencode server 原生能力（已调研确认）：
- `GET /project` — 项目列表
- `POST /session` — 创建 session（body: `{parentID?, title?}`）
- `GET /session` / `GET /session/:id` — 列表 / 详情
- `DELETE /session/:id` — 删除，`PATCH /session/:id` — 改标题（重命名）
- `POST /session/:id/message` — 发消息等回复
- `POST /session/:id/prompt_async` — 异步发消息（适合流式 UI）
- `GET /event` — SSE 事件流（消息/工具调用/会话状态）
- `POST /session/:id/abort` — 中止

## 阶段划分

### 阶段 1：服务端 —— 启动 opencode serve
- 新建 systemd 单元 `opencode-server.service`：
  `OPENCODE_SERVER_PASSWORD=<强密码> opencode serve --port 4096 --cors http://localhost:9928`
- 参照现有 `pulse-expo.service` 的托管方式
- 验证：`curl /global/health`、`/doc`、`/project`
- server 密码存前端配置（非提交）

### 阶段 2：前端基础层
- 安装依赖：
  - `@opencode-ai/sdk`（最新）
  - markdown 渲染：`react-native-markdown-display`
  - SSE：浏览器原生 `EventSource`（RN Web 可用）
- `src/services/opencode.ts` — 封装 `OpencodeClient`（baseURL 4096 + Basic auth）
- `src/services/opencode-sse.ts` — 封装 `GET /event`（EventSource）

### 阶段 3：事件↔项目映射
- `src/screens/events.ts` — `PulseEvent` 加 `projectPath` 字段
  - 例：`migration` → `/root/project/agent-mobile`，`subscription` → `/root/project/family-finance`
- `src/app/(tabs)/pulse.tsx` — 打开详情时按 `projectPath` 加载 sessions

### 阶段 4：session 管理 UI（事件详情内）
- `src/components/session/SessionList.tsx` — 列出项目 sessions
- `src/components/session/SessionActions.tsx` — 创建/删除/重命名
- 集成进事件详情 sheet，替换纯 `alert()` 演示桩

### 阶段 5：完整对话 UI
- `src/components/chat/ChatPanel.tsx` — 消息列表 + 输入框
- `src/components/chat/MessageBubble.tsx` — markdown 渲染
- `src/components/chat/ToolCall.tsx` — 工具调用展示
- 流式：`prompt_async` + SSE 订阅
- 中止/重试：`abort` + 重新发送
- 事件详情 sheet 内：session 列表 → 点进 session → 对话面板

## 涉及文件

| 文件 | 改动 |
|---|---|
| `docs/plans/opencode-integration.md`（本文件） | 计划 |
| systemd 单元（新） | `opencode-server.service` |
| `package.json` | 装 SDK + markdown |
| `src/services/opencode.ts`（新） | server 客户端 |
| `src/services/opencode-sse.ts`（新） | SSE 封装 |
| `src/screens/events.ts` | 加 `projectPath` |
| `src/app/(tabs)/pulse.tsx` | 集成 session/chat |
| `src/components/session/*`（新） | session CRUD UI |
| `src/components/chat/*`（新） | 对话 UI |

## 知识库更新（事后）
- `modules/pulse-stream.md` — 事件绑定项目、session 集成
- `API.md` — 对接 opencode server 接口
- `OPERATIONS.md` — `opencode serve` 托管方式
