# API.md —— 接口清单

> 最后更新：2026-08-14 · commit：`108bd36`（补 /agent 端点）

## 结论

**手机端经 family-finance BFF 访问 OpenCode Server（v1 协议）。** BFF 负责 JWT 认证、REST 转发、SSE 缓冲合并（打字机）、CORS。

- 网络层：手机端 → BFF（HTTP + JWT Bearer）；BFF → opencode（HTTP + Basic auth，强制覆盖）。
- 客户端：`src/services/opencode-client.ts` 封装 REST（BFF 前缀），`src/services/opencode-events.ts` 订阅 BFF stream。
- 数据来源：Pulse 首页展示真实项目状态（分组导航），点击项目进入真实对话（流式回复 + 打字机 + 工具调用折叠）。

## BFF 接口（family-finance，手机端访问）

| 端点 | 方法 | 用途 | 认证 |
|---|---|---|---|
| `/api/auth/login` | POST | 登录，返回 `{success, token}`（JWT，1 天） | 无（用户名/密码） |
| `/api/opencode/rest/[...path]` | GET/POST/PATCH/DELETE | 转发到 opencode REST（`/project`、`/session`、`/config/providers` 等） | Bearer JWT |
| `/api/opencode/stream` | GET | SSE 事件流（`message.*`、`delta`、`session.*`、`permission.*`、`server.connected`、`stream.error`） | Bearer JWT |

**认证**：`Authorization: Bearer <JWT>`（`/api/auth/login` 签发）。401 → 手机端清 token + 显示登录横幅。
**CORS**：允许 `http://106.13.181.13:9928`、`http://127.0.0.1:9928`、`http://localhost:9928`（`lib/cors.ts` `CORS_ORIGINS`）。OPTIONS 预检返回 204 + CORS 头。
**BFF 环境变量**：`JWT_SECRET`、`ADMIN_USERNAME`、`ADMIN_PASSWORD`、`OPENCODE_USERNAME`、`OPENCODE_PASSWORD`、`OPENCODE_BASE_URL`（默认 `http://127.0.0.1:4096`）。

### stream 协议（打字机）

- 事件格式：`event: <type>\ndata: <JSON>\n\n`。
- **`delta` 事件**：`data = { type: "delta", properties: { sessionID, messageID, partID, field, text } }`——BFF 将 opencode 的 `message.part.updated` 按 **32ms 缓冲**合并后推送（`field` 恒为 `text`，`text` 为增量片段）。
- 心跳：每 10s 推送 `event: heartbeat`（防代理断连）。
- `?sessionID=` 查询参数：BFF 服务端过滤，只推送指定 session 的事件。
- 手机端 `subscribeToOpenCodeEvents(onEvent, onError?, sessionID?)` 消费；`applyPartDelta` 追加文本实现打字机。

## OpenCode Server 接口（v1，经 BFF 转发）

| 端点 | 方法 | 用途 | 客户端封装 |
|---|---|---|---|
| `/global/health` | GET | 健康检查（协议探测） | — |
| `/global/event` | GET | SSE 事件流（BFF 缓冲合并后转发） | `subscribeToOpenCodeEvents` |
| `/project` | GET | 项目列表（含 `agent-mobile`） | `opencodeClient.getProject` |
| `/session` | GET | 会话列表（可过滤 `?directory=…`） | `opencodeClient.listSessions` |
| `/session` | POST | 创建会话 | `opencodeClient.createSession` |
| `/session/{id}` | GET | 会话详情 | `opencodeClient.getSession` |
| `/session/{id}` | PATCH | 重命名会话 | `opencodeClient.renameSession` |
| `/session/{id}` | DELETE | 删除会话 | `opencodeClient.deleteSession` |
| `/session/status` | GET | 活跃会话状态表 `{sessionID: busy\|retry}`（只含活跃；可 `?directory=` 过滤） | `opencodeClient.getSessionStatus` |
| `/session/{id}/message` | GET | 消息列表（**chronological，旧在前**） | `opencodeClient.listMessages` |
| `/session/{id}/message` | POST | 发送消息（同步） | `opencodeClient.sendMessage` |
| `/session/{id}/prompt_async` | POST | 异步发送消息（流式） | `opencodeClient.sendMessageAsync` |
| `/session/{id}/permissions/{permissionID}` | POST | 回复权限请求（once/always/reject） | `opencodeClient.replyPermission` |
| `/session/{id}/abort` | POST | 中止执行 | `opencodeClient.abort` |
| `/config/providers` | GET | 模型/提供商列表（动态模型下拉） | `opencodeClient.listProviders` |
| `/agent` | GET | agent 列表（ChatPanel 加载 primary agent 的 model） | `opencodeClient.listAgents` |
| `/question` | GET | 待处理 question 请求列表（`{id, sessionID, questions[]}`，agent 等待回答） | `opencodeClient.listQuestions` |
| `/question/{requestID}/reply` | POST | 回答 question（body `{answers: string[][]}`，每问一答，answer 为选中 label 数组） | `opencodeClient.replyQuestion` |
| `/question/{requestID}/reject` | POST | 拒绝/跳过 question（避免 agent 永久等待） | `opencodeClient.rejectQuestion` |

**opencode 认证**：Basic auth（`OPENCODE_USERNAME`/`OPENCODE_PASSWORD`，BFF 侧环境变量）。**手机端不持有**。
**opencode 监听**：`--hostname 127.0.0.1`（仅 BFF 本机可达，公网不可直连）。
**事件流优化**：BFF 32ms 缓冲合并 delta；手机端 16ms rAF 批量分发 + 指数退避重连（250ms → ×2 → 上限 30s）。
**增量更新**：`message.updated` / `message.part.updated`（→ delta）事件触发纯函数 reducer（`src/services/message-reducer.ts`）增量 patch 消息列表，避免全量 reload。新消息按 `time.created` 插入（chronological 语义）。

## 应用内可扩展接口点（现状）

| 位置 | 现状 | 未来接入点 |
|---|---|---|
| ChatPanel Mic 按钮 | `alert("Voice input")` 占位 | 接入真实语音输入 |
| Pulse ScreenHeader Bell | `alert("Notifications")` 占位 | 通知列表 |
| `getGreeting()` 问候 | 按小时静态文案 | 个性化问候 |
| ProjectChat "New session" 空态 | createSession 后进聊天 | 会话管理（重命名/删除） |

## Web 静态服务（serve-static.mjs）

| 路径 | 方法 | 行为 |
|---|---|---|
| `/` | GET | 302 → `/pulse` |
| `/pulse` `/talk` `/memory` `/me` 等 | GET | 返回对应 `.html`（自动补扩展名） |
| `/_expo/static/**` | GET | 静态资源（JS/CSS，gzip 压缩） |
| 其他 | GET | 404 |

鉴权：无（内网/公网直开）。端口 9928。**登录态由 BFF JWT 管理**（`pulse_opencode_token` localStorage）。