# API.md —— 接口清单

> 最后更新：2026-08-11 · commit：`1e83c92`（opencode 集成）

## 结论

**项目已接入 OpenCode Server（v1 协议）作为外部 AI 编码 agent 后端。**

- 网络层：HTTP + Basic auth，SSE 事件流（`/global/event`）。
- 客户端：`src/services/opencode-client.ts` 封装 REST 端点，`src/services/opencode-events.ts` 处理 SSE 流式订阅。
- 数据来源：Pulse 事件详情内可对真实项目（`projectPath`）进行 opencode session CRUD + 完整对话（流式回复 + 工具调用展示）。
- 原有演示桩（`alert()`）在 Pulse 事件详情内已被替换为 opencode session 面板。

## OpenCode Server 接口（v1）

| 端点 | 方法 | 用途 | 客户端封装 |
|---|---|---|---|
| `/global/health` | GET | 健康检查（协议探测） | — |
| `/global/event` | GET | SSE 事件流（`message.updated`、`message.part.updated`、`session.*`） | `subscribeToOpenCodeEvents` |
| `/project` | GET | 项目列表（含 `agent-mobile`） | `opencodeClient.getProject` |
| `/session` | GET | 会话列表（可过滤 `?directory=…`） | `opencodeClient.listSessions` |
| `/session` | POST | 创建会话 | `opencodeClient.createSession` |
| `/session/{id}` | GET | 会话详情 | `opencodeClient.getSession` |
| `/session/{id}` | PATCH | 重命名会话 | `opencodeClient.renameSession` |
| `/session/{id}` | DELETE | 删除会话 | `opencodeClient.deleteSession` |
| `/session/{id}/message` | GET | 消息列表 | `opencodeClient.listMessages` |
| `/session/{id}/message` | POST | 发送消息（同步） | `opencodeClient.sendMessage` |
| `/session/{id}/prompt_async` | POST | 异步发送消息（流式） | `opencodeClient.sendMessageAsync` |
| `/session/{id}/abort` | POST | 中止执行 | `opencodeClient.abort` |

**认证**：Basic auth（`OPENCODE_SERVER_PASSWORD` 环境变量）。  
**CORS**：`opencode serve --cors http://localhost:9928 --cors http://127.0.0.1:9928`。  
**事件流优化**：客户端对 SSE 事件做 16ms rAF 批量合并 + 指数退避重连（250ms → ×2 → 上限 30s）。  
**增量更新**：`message.updated` / `message.part.updated` 事件触发纯函数 reducer（`src/services/message-reducer.ts`）增量 patch 消息列表，避免全量 reload。

## 应用内可扩展接口点（现状）

| 位置 | 现状 | 未来接入点 |
|---|---|---|
| `src/screens/events.ts` `PulseEvent.actions[].alert` | alert 演示文案 | 替换为真实路由/调用 |
| pulse.tsx `TextInput` + Send/Mic `onPress` | alert 演示 | 接入 Talk 会话发送 |
| `BottomSheet.onClose` | 本地 state | 保持本地即可 |
| Pulse 事件详情 sheet（`projectPath` 事件） | opencode session 面板 | 已实现完整对话流 |

## Web 静态服务（serve-static.mjs）

| 路径 | 方法 | 行为 |
|---|---|---|
| `/` | GET | 302 → `/pulse` |
| `/pulse` `/talk` `/memory` `/me` 等 | GET | 返回对应 `.html`（自动补扩展名） |
| `/_expo/static/**` | GET | 静态资源（JS/CSS，gzip 压缩） |
| 其他 | GET | 404 |

鉴权：无（内网/公网直开）。端口 9928。