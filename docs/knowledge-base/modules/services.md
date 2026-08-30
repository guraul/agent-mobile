# modules/services.md —— opencode 对接服务层

> 最后更新：2026-08-30 · commit：`Me 页落地`（bff-config/model-prefs/bff-health/getBaseUrl 运行时覆盖）

## 模块职责

OpenCode Server 对接：**经 family-finance BFF（JWT 认证）访问 REST/SSE**、消息增量 reducer、显示合并、项目状态机。**无 UI 依赖**，全部可单测。

## 架构（阶段 2 起）

```
手机端 (agent-mobile-app)                family-finance BFF                 OpenCode Server
config/opencode.ts ──baseUrl──► /api/auth/login ──JWT──► ──Basic──► http://127.0.0.1:4096
opencode-client.ts ──────────► /api/opencode/rest/** ──────► REST 转发
opencode-events.ts ──────────► /api/opencode/stream ───────► /global/event（SSE）
auth.ts ──Bearer JWT──► 认证（family-finance 用户）       opencode 凭证在 BFF 侧（不再进 APK）
```

- 手机端只持有 **JWT**（AsyncStorage，key `pulse_opencode_token`），BFF 强制覆盖 Authorization 为 opencode Basic（不透传客户端 JWT）。
- BFF 将 opencode 的 `message.part.updated` 合并为 `message.part.delta` 增量事件，驱动打字机。
- opencode serve 已收窄为 `--hostname 127.0.0.1`（仅 BFF 本机可达）。

## 关键文件清单

| 文件路径 | 职责 |
|---|---|
| `agent-mobile-app/src/config/opencode.ts` | BFF baseUrl + token + runtimeBaseUrl（`getBaseUrl()` = runtime 覆盖优先回退 env） |
| `agent-mobile-app/src/services/auth.ts` | JWT 登录/登出/username/存取/401 联动（AsyncStorage） |
| `agent-mobile-app/src/services/bff-config.ts` | BFF 地址运行时覆盖（AsyncStorage key `pulse_bff_url`，方案 C 重启生效） |
| `agent-mobile-app/src/services/bff-health.ts` | `probeBffHealth(url)`：OPTIONS `/api/auth/login` 探测 BFF 在线（2xx-4xx 在线，超时默认 3s） |
| `agent-mobile-app/src/services/model-prefs.ts` | 按 agent 持久化默认 model（AsyncStorage key `pulse_model_pref_<agent>`） |
| `agent-mobile-app/src/services/filter-models.ts` | `filterModels(list, query)`：modelID/providerID 子串不分大小写过滤；`ModelPref` 类型 |
| `agent-mobile-app/src/services/opencode-client.ts` | REST 封装（BFF 前缀 + Bearer + 401 → handleUnauthorized） |
| `agent-mobile-app/src/services/opencode-events.ts` | BFF stream 订阅（delta 事件 + sessionID 过滤 + 退避重连） |
| `agent-mobile-app/src/services/message-reducer.ts` | `applyMessageUpdated/applyPartUpdated/applyMessageRemoved/applyPartDelta` 增量 patch |
| `agent-mobile-app/src/services/message-merging.ts` | `mergeMessages`：step 级消息 → 对话气泡 |
| `agent-mobile-app/src/services/project-status.ts` | `determineProjectStatus`：项目状态判定 |

## 对外暴露接口

### opencodeClient（opencode-client.ts）

所有端点走 `{baseUrl}/api/opencode/rest{path}`，请求带 `Authorization: Bearer <JWT>`（`tokenHeader()`）。

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
| `login(username,password)` | `POST /api/auth/login`（BFF） | 登录拿 JWT（委托 auth.ts） |
| `listProviders()` | `GET /config/providers` | 动态模型列表 `{providers, default}` |
| `listAgents()` | `GET /agent` | agent 列表（ChatPanel 用来动态加载 primary agent 的 model，替代硬编码） |
| `listQuestions()` | `GET /question` | 待处理 question 请求（agent 用 `question` 工具提问后等待回答） |
| `replyQuestion(requestID, answers)` | `POST /question/{id}/reply` | 回答 question（`answers: string[][]`，每问一答） |
| `rejectQuestion(requestID)` | `POST /question/{id}/reject` | 拒绝 question（避免 agent 永久等待） |
| `listPermissions()` | `GET /permission` | 待处理权限请求（bash/edit/外部目录访问等） |
| `replyPermission(requestID, reply)` | `POST /permission/{id}/reply` | 回复权限（`once`/`always`/`reject`） |
| `listPermissions()` | `GET /permission` | 待处理权限请求（bash/edit/external_directory 等） |
| `replyPermission(requestID, reply, message?)` | `POST /permission/{id}/reply` | 回复权限（`once`/`always`/`reject`，可带 message） |

**401 处理**：任何 REST 调用返回 401 → `handleUnauthorized()`（清 token + 触发 `onUnauthorized` 回调，pulse 顶部显示登录横幅）。

### auth.ts

| 导出 | 说明 |
|---|---|
| `getToken()` | 读 AsyncStorage 的 JWT |
| `setToken(token\|null)` | 写/清 token（同步更新 `opencodeConfig.token`） |
| `loadToken()` | 启动时恢复 token 到内存 |
| `login(username,password)` | POST BFF `/api/auth/login`（走 `getBaseUrl()`），成功存 token **和 username**（key `pulse_username`）返回 |
| `getUsername()/setUsername()/clearUsername()` | 用户名持久化（Me 页展示，不做 BFF `/api/auth/me`） |
| `logout()` | POST BFF `/api/auth/logout`（失败仍清本地）+ 清 token/username |
| `tokenHeader()` | `{ Authorization: Bearer <token> }`（无 token 时 `{}`） |
| `onUnauthorized(cb)` | 注册 401 回调，返回解绑函数 |
| `handleUnauthorized()` | 清 token + 清 username + 触发回调 |

### bff-config.ts + getBaseUrl（2026-08-30，Me 页）

- **方案 C（重启生效）**：Me 页改地址只写 AsyncStorage（`pulse_bff_url`），**Pulse 启动 useEffect 先 `getRuntimeBaseUrl()` 设 `opencodeConfig.runtimeBaseUrl` 再 `loadToken()`**，运行中不热切。
- **所有 fetch 一律走 `getBaseUrl()`**（runtime 覆盖优先，回退 env `EXPO_PUBLIC_OPENCODE_URL`）：`opencode-client.ts` / `opencode-events.ts` / `fund-events.ts`（2 处）/ `auth.ts`（login/logout）。**新增请求点勿直接读 `opencodeConfig.baseUrl`**。

### model-prefs.ts（Me 页 model 偏好）

| 导出 | 说明 |
|---|---|
| `getModelPref(agent)` / `setModelPref(agent, pref)` | 单 agent 读写（`{providerID, modelID}`，JSON 存 `pulse_model_pref_<agent>`） |
| `loadModelPrefs()` | 扫 AsyncStorage 全量 key 返回 `Record<agent, ModelPref>` |

- **消费方 ChatPanel**：`listAgents` 后 `loadModelPrefs()` 覆盖 agent 默认 model；初始 pill 优先级 **Me 偏好 > server `agent.model` > FALLBACK_AGENTS**。手选 model 不持久化。

### opencode-events.ts

| 导出 | 说明 |
|---|---|
| `OpenCodeEvent` | 事件联合类型（含 `delta`、`stream.error`） |
| `subscribeToOpenCodeEvents(onEvent, onError?, sessionID?)` | 订阅 BFF `/api/opencode/stream`（SSE），`?sessionID=` 过滤，指数退避重连 |
| `BatchedDispatcher` | 16ms 批量分发（打字机增量合并） |

- **`delta` 事件**：`properties = { sessionID, messageID, partID, field, text }`，BFF 将 opencode 原始 `message.part.updated` 按 32ms 缓冲合并后推送（打字机）。
- **`stream.error` 事件**：BFF 与 opencode 上游断开时推送。
- **question 事件类型（2026-08-25）**：opencode server 实际发 **`question.asked`/`question.replied`/`question.rejected`**（v1 兼容名），`OpenCodeEvent` 类型里与 schema 名 `question.v2.*` 同时保留，消费端（ChatPanel）两端都监听。

### message-reducer.ts（纯函数）

- `applyMessageUpdated(messages, info)`：消息存在则更新 info；不存在则**按 time.created 插入**（chronological 语义）。**2026-08-25 起透传 `info.error`**（模型调用失败对象），不再丢弃——否则 SSE 实时更新的错误在 UI 上不显示，要全量 reload 才见。
- `applyPartUpdated(messages, part)`：按 part id upsert 到目标消息。
- `applyMessageRemoved(messages, id)`：删除消息。
- **`applyPartDelta(messages, {messageID, partID, field, text})`**：增量追加文本——消息缺失返回原数组；part 缺失创建 text part；已有 part 的 `text` 字段 += delta.text（打字机核心）。

### message-merging.ts（纯函数）

- `mergeMessages(raw)`：把 opencode 消息**展开为独立 `DisplayStep`**（不做跨 step 合并；2026-08-12 起废弃合并逻辑与 `mergeGapMs` 阈值）。user 消息 → 一个 `user` step；assistant 每个 part → 独立 `text`/`tool`/`reasoning` step；**assistant 带 `info.error` → `error` step（2026-08-25）**。过滤 `step-start`/`step-finish`/`file`/`snapshot`/`agent`/空文本。返回 `DisplayStep[]`（ChatPanel 的 FlatList 直接渲染，text/user/error 为气泡，tool/reasoning 为 StepChip 旁白）。
- **`errorText(err)`（2026-08-25）**：把 `info.error`（运行时是 NamedError 对象 `{name, data:{message}}`）安全转字符串（`name: data.message`，兜底 JSON）——**直接渲染对象会 React error #31 → 白屏**。

### project-status.ts（纯函数）

- `determineProjectStatus(project, sessions, input, now)`：判定优先级 pending 权限 → busy/retry → 已知 idle → 兜底 idle。返回 `ProjectEvent`。

## 依赖关系

- 依赖：`config/opencode.ts`、`auth.ts`（client/events）；类型定义内聚于 `opencode-client.ts`。
- 被依赖：`hooks/useProjectEvents.ts`、`app/(tabs)/index.tsx`（登录横幅）、`components/chat/*`。

## 修改本模块的注意事项

- **`probeBffHealth` 必须用 OPTIONS**：BFF 只对 OPTIONS 预检回 CORS 头（`corsOptionsResponse`），HEAD 会 405 且无 CORS 头——web 静态版（9928）浏览器里 fetch 被拦 → 永远误判离线（2026-08-30 踩坑）。且 BFF `lib/cors.ts` 允许列表只含 9928 三个 origin。
- **除 Pulse 外的页面直开/刷新必须自行 `loadToken()`**：token 恢复逻辑只在 Pulse（index.tsx）启动 effect 里，`opencodeConfig.token` 是内存态——Me 页（me.tsx reload 开头）已修，今后新增直开路由照做，否则 authed 请求裸奔 401。
- **消息数组必须保持 chronological**（`listMessages` 真实顺序），任何排序/插入逻辑以 `time.created` 为准。
- **SSE 事件属性是 `Record<string, unknown>`**：事件处理处需自行 cast（如 `props.info`、`props.part`、delta 的 `properties`），有拼写风险。
- **BFF 强制覆盖 Authorization 为 opencode Basic**：手机端 JWT 不传 upstream（BFF `lib/opencode.ts` `proxyRequest`）。
- **`/session/status` 只含活跃会话**：补 idle 是调用方职责（useProjectEvents 中处理）。
- **`/session/status` 可能有幽灵条目**：opencode 会残留**已删除 session** 的 busy/retry 状态（`GET /session/{id}` 返回 NotFound）。useProjectEvents 目前直接采信 statusMap，**未做**交叉校验——是已知缺口，可能导致误判某项目 running。修复方向：仅当 session id 在 `listSessions` 结果中才采信其 busy 状态。
- **所有纯函数改动必须同步单测**：`*.test.ts` 与源码同目录（vitest `include` 匹配 `src`）。
- **手机端不再持有 opencode 凭证**：只有 BFF 侧 `.env.local` 有 `OPENCODE_USERNAME/PASSWORD`。
- 端点新增/修改后更新 `docs/knowledge-base/API.md`。
