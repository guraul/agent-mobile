# modules/services.md —— opencode 对接服务层

> 最后更新：2026-08-11 · commit：`072537f`（opencode 集成 + 消息顺序修复）

## 模块职责

OpenCode Server 对接：REST 客户端、SSE 订阅、消息增量 reducer、显示合并、项目状态机。**无 UI 依赖**，全部可单测。

## 关键文件清单

| 文件路径 | 职责 |
|---|---|
| `agent-mobile-app/src/config/opencode.ts` | 连接配置（env：URL/账号/密码） |
| `agent-mobile-app/src/services/opencode-client.ts` | REST 封装（全部端点 + Basic auth + 类型） |
| `agent-mobile-app/src/services/opencode-events.ts` | SSE 解析/订阅（rAF 批量合并 + 指数退避） |
| `agent-mobile-app/src/services/message-reducer.ts` | `applyMessageUpdated/applyPartUpdated/applyMessageRemoved` 增量 patch |
| `agent-mobile-app/src/services/message-merging.ts` | `mergeMessages`：step 级消息 → 对话气泡 |
| `agent-mobile-app/src/services/project-status.ts` | `determineProjectStatus`：项目状态判定 |

## 对外暴露接口

### opencodeClient（opencode-client.ts）

| 方法 | 端点 | 说明 |
|---|---|---|
| `getProject()` | `GET /project` | 项目列表 |
| `listSessions(directory?)` | `GET /session?directory=` | 会话列表（按项目过滤） |
| `getSession(id)` | `GET /session/{id}` | 会话详情 |
| `createSession({directory,title})` | `POST /session` | 创建会话 |
| `deleteSession(id)` | `DELETE /session/{id}` | 删除会话 |
| `renameSession(id,title)` | `PATCH /session/{id}` | 重命名 |
| `listMessages(id,{limit,offset})` | `GET /session/{id}/message` | 消息列表（**chronological**） |
| `getSessionStatus(directory?)` | `GET /session/status?directory=` | busy/retry 状态表 |
| `replyPermission(id,permissionID,response)` | `POST /session/{id}/permissions/{pid}` | 回复权限（once/always/reject） |
| `sendMessage(id,body)` | `POST /session/{id}/message` | 同步发送 |
| `sendMessageAsync(id,body)` | `POST /session/{id}/prompt_async` | 异步发送（流式） |
| `abort(id)` | `POST /session/{id}/abort` | 中止 |

### opencode-events.ts

| 导出 | 说明 |
|---|---|
| `OpenCodeEvent` | 事件联合类型（message.*/session.*/permission.*/server.connected） |
| `parseSSE(data)` | SSE 帧解析（event:/data:） |
| `decodeSSEPayload(raw)` | JSON 解码（跳过 `sync` 内部帧） |
| `backoffDelay(attempt)` | 指数退避 250ms×2^(n-1)，上限 30s |
| `BatchedDispatcher` / `subscribeToOpenCodeEvents` | rAF 16ms 批量分发 + 自动重连 |

### message-reducer.ts（纯函数）

- `applyMessageUpdated(messages, info)`：消息存在则更新 info；不存在则**按 time.created 插入**（chronological 语义）。
- `applyPartUpdated(messages, part)`：按 part id upsert 到目标消息。
- `applyMessageRemoved(messages, id)`：删除消息。

### message-merging.ts（纯函数）

- `mergeMessages(raw, mergeGapMs=120_000)`：user 独立气泡；连续 assistant step 合并；时间差 > 阈值不合并；过滤空气泡。返回 `DisplayMessage[]`（含折叠后的 `tools`）。

### project-status.ts（纯函数）

- `determineProjectStatus(project, sessions, input, now)`：判定优先级 pending 权限 → busy/retry → 已知 idle → 兜底 idle。返回 `ProjectEvent`。

## 依赖关系

- 依赖：`config/opencode.ts`（client/events）；类型定义内聚于 `opencode-client.ts`。
- 被依赖：`hooks/useProjectEvents.ts`、`components/chat/*`（经 index 或直接路径）。

## 修改本模块的注意事项

- **消息数组必须保持 chronological**（`listMessages` 真实顺序），任何排序/插入逻辑以 `time.created` 为准。
- **SSE 事件属性是 `Record<string, unknown>`**：事件处理处需自行 cast（如 `props.info`、`props.part`），有拼写风险。
- **`/session/status` 只含活跃会话**：补 idle 是调用方职责（useProjectEvents 中处理）。
- **所有纯函数改动必须同步单测**：`*.test.ts` 与源码同目录（vitest `include` 匹配 `src`）。
- 端点新增/修改后更新 `docs/knowledge-base/API.md`。
