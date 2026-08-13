# modules/chat.md —— 聊天（项目对话）

> 最后更新：2026-08-13 · commit：`b4d9361`（阶段 2：BFF 中间层 + 打字机 + 动态模型 + 登录）

## 模块职责

项目对话：选择/新建 session → 实时聊天（**BFF 中间层** + SSE 增量 + 打字机 + 轮询兜底、step 独立展示、下拉刷新、滚动保持）。

## 入口文件

`agent-mobile-app/src/components/chat/ProjectChat.tsx`

## 关键文件清单

| 文件路径 | 职责 |
|---|---|
| `agent-mobile-app/src/components/chat/ProjectChat.tsx` | 解析最近 session（按 `time.updated` 降序），无则展示"New session"入口 |
| `agent-mobile-app/src/components/chat/ChatPanel.tsx` | 对话面板：分页加载、SSE 订阅（delta 打字机）、5s 轮询兜底、输入框、下拉刷新、自动滚底、agent/model 切换 |
| `agent-mobile-app/src/components/chat/MessageBubble.tsx` | 渲染单个 DisplayStep：user/text 气泡（markdown）、process step 委托 StepChip |
| `agent-mobile-app/src/components/chat/StepChip.tsx` | 过程旁白：思考中… / 工具(x)调用中…（小字号 caption + 图标） |
| `agent-mobile-app/src/services/message-merging.ts` | `mergeMessages`：OpenCodeMessage[] → DisplayStep[]（step 展开 + 过滤） |
| `agent-mobile-app/src/services/message-reducer.ts` | SSE 增量 patch + `applyPartDelta`（打字机）+ `mergeRecentMessages`（轮询合并纯函数） |
| `agent-mobile-app/src/services/opencode-events.ts` | BFF stream 订阅（message.* / delta 事件），rAF 批量分发 + 指数退避重连 |
| `agent-mobile-app/src/services/opencode-client.ts` | listMessages / sendMessageAsync / abort / createSession / listProviders |
| `agent-mobile-app/src/services/auth.ts` | JWT 登录/存取/401 联动（登录横幅） |

## 数据流（阶段 2：经 BFF）

```
ProjectChat: listSessions(projectPath) → 最近 session（无 → 空态 + New session）
  ↓ ChatPanel(sessionID)
loadMessages: listMessages(limit=50) → chronological（旧在前）→ mergeMessages → DisplayStep[]
SSE: BFF /api/opencode/stream（Bearer JWT + ?sessionID= 过滤）
  → message.updated / message.part.updated（BFF 32ms 缓冲合并为 delta）/ message.removed
  → message-reducer 增量 patch → applyPartDelta 追加文本（打字机）→ mergeMessages → display
轮询兜底: 每 5s listMessages(limit=10) → mergeRecentMessages（新消息插入 + parts 追平）
发送: sendMessageAsync → 之后 loadMessages 全量刷新
下拉刷新: 重新 listMessages(limit=50)（上滑浏览不触发加载）
```

## 关键设计决策（重要）

### 打字机（阶段 2，2026-08-13）

- **BFF 缓冲合并**：opencode 原始 `message.part.updated` 事件被 BFF 按 **32ms 缓冲**合并为 `delta` 事件（`properties = { sessionID, messageID, partID, field, text }`，`text` 为增量片段），避免高频事件压垮手机端。
- **`applyPartDelta`**（message-reducer.ts 纯函数）：消息缺失返回原数组；part 缺失创建 text part；已有 part 的 `text` 字段 += delta.text。
- ChatPanel SSE 回调收到 `delta` 且 `sessionID` 匹配时调用 `applyPartDelta`，实现逐字/逐段打字机效果。
- 订阅带 sessionID：`subscribeToOpenCodeEvents(cb, undefined, sessionID)`（BFF 服务端过滤，只推本 session 事件）。
- reasoning delta 一并推送（field=text），前端追加无害（已知行为）。

### 登录（阶段 2，2026-08-13）

- **JWT 认证**：手机端经 BFF `/api/auth/login` 登录拿 JWT，存 AsyncStorage（key `pulse_opencode_token`）。
- **登录横幅**：pulse.tsx 顶部——`loadToken()` 无 token 或收到 `onUnauthorized` 时显示"未登录 — 点击登录"，点击打开 BottomSheet 登录弹窗（账号/密码 + 登录按钮）。
- **401 联动**：任何 REST/stream 调用返回 401 → `handleUnauthorized()` 清 token + 触发横幅。

### 动态模型列表（阶段 2，2026-08-13）

- **来源**：mount 时 `listProviders()`（BFF 转发 `/config/providers`）拉取全量模型，平铺为 `{providerID, modelID}` 列表；失败回退 `PRIMARY_AGENTS` 的默认模型。
- **model pill**：点击打开 BottomSheet 弹出框选择模型（打开时刷新列表）；选中后 `setModel` 用于后续发送。

### DisplayStep 结构（不合并 step）

- `mergeMessages` 输出 `DisplayStep[]`，**不再合并**同轮 assistant step 为单个气泡；每条有意义的 part 独立成 step。
- step 类型：`user`（用户气泡）/ `text`（assistant 主气泡，markdown）/ `reasoning`（思考中…）/ `tool`（工具(x)调用中…）。
- **step-start / step-finish 被过滤**（opencode 每次工具调用循环都产生一对，噪音大；2026-08-12 起不再展示）。
- 空 text part、snapshot/agent/file/compaction 等 part 也被过滤。
- 单测：`message-merging.test.ts` 覆盖 step 展开/过滤/顺序。

### 消息顺序：chronological

- `listMessages` 返回 **chronological（旧在前）**；`recomputeDisplay` 按 `time.created` 升序排序后 merge，**不做 reverse**。
- `applyMessageUpdated` 新消息按 `time.created` 插入正确位置（**不是 unshift/push 到固定端**）。
- ⚠️ 历史 bug：曾误认为 newest-first 并 reverse + unshift，导致新消息显示在顶部。见 CONVENTIONS.md。

### SSE 增量 + 轮询兜底（跨实例同步）

- **根因**：本地 TUI（`opencode -s` 独立实例）与 4096 server 是**两个进程**，共享 SQLite DB 但 **SSE 事件流不互通**——TUI 写的消息不会出现在 4096 的 `/global/event` 推送里。
- 修复：ChatPanel 每 5s `listMessages(limit=10)` → `mergeRecentMessages(local, recent)` 合并：未见过的新消息按时间戳插入；已有消息 parts 变化则整条替换追平（catch up 流式中的回复）。
- 纯函数 `mergeRecentMessages` 在 `message-reducer.ts`（可单测），ChatPanel 只调用。
- 单测：`message-reducer.test.ts` 覆盖插入/追平/无变化四路径。
- **若 TUI 用 `opencode attach http://127.0.0.1:4096` 启动**，事件流统一，SSE 即可双向实时，轮询成为冗余兜底（无害保留）。

### 滚动行为

- 初次加载后自动滚动到底部：`loadMessages` 完成后 150/400/800/1500ms 多次 `scrollToEnd`（BottomSheet 展开动画使列表从 0 高度增长，单次滚动会失效）。
- **`ignoreScrollUntil`（加载后 2s）**：初次定位期间忽略 `onScroll` 的 stickToBottom 覆盖——否则程序化滚动落点未到最终底部时，onScroll 会把 stickToBottom 关掉，列表冻结在中间（2026-08-12 修复）。
- 之后 `stickToBottom`：距底部 < 80px 自动吸底；上滑浏览暂停。
- **上滑不加载历史**（需求：无新输入不加载，下拉刷新拉新消息）。

### 输入区

- Mic（语音，`alert("Voice input")` 占位）+ TextInput + Send/Stop 三件套。
- **三元素垂直中心对齐**：`alignItems: "center"`（不是 flex-end）+ 输入框 `boxSizing: "border-box"`（web 上 RN TextInput 默认 content-box 会使实际高度超过 minHeight 44，破坏对齐）+ `textAlignVertical: "center"`。
- 输入框缩小为 40px（`minHeight: 40`），占位文字水平垂直居中（`textAlign: "center"` + `textAlignVertical: "center"`，2026-08-12）。

### agent / model 切换（2026-08-12）

- **机制**：opencode **不支持修改已存在 session 的 agent/model**（`PATCH /session/{id}/update` 只有 title/metadata/permission）；agent/model 只能**按消息指定**（`POST /session/{id}/prompt_async` body 的 `agent` / `model:{providerID,modelID}`）。`ModelRef = { providerID, modelID }`（结构化对象，不是字符串）。
- **agent pill**（输入区上方左）：显示当前 agent，点击**循环切换** primary agents（build → plan → design，`PRIMARY_AGENTS` 常量，model 跟随该 agent 默认模型）。
- **model pill**（旁边）：点击打开 **BottomSheet 弹出框**选择模型（**阶段 2 起为动态列表**：`listProviders()` 全量模型，失败回退 `PRIMARY_AGENTS` 默认模型；曾用内联下拉，被输入框遮挡且效果差，2026-08-12 改为 BottomSheet）。
- 初始化：mount 时 `getSession(sessionID)` 读取 session 的 `agent` / `model`（注意 `OpenCodeSession.model` 用 `id` 字段，非 `modelID`）。
- 发送：`sendMessageAsync` body 带 `agent: PRIMARY_AGENTS[agentIdx].id` + `model`。

## 修改本模块的注意事项

- **勿改 reducer 插入语义为固定端插入**：必须按时间戳定位，否则乱序（有单测覆盖：`order-sim.test.ts`）。
- **勿移除 step-start/step-finish 过滤**：会重新引入大量"开始执行/完成"噪音（2026-08-12 用户反馈）。
- **勿移除轮询兜底**：TUI 独立实例的消息只有轮询能同步（除非 TUI attach 4096）。
- **勿改 agent 切换为"修改 session"**：opencode API 不支持，必须按消息传 agent/model。
- **勿移除 delta 打字机**：BFF 缓冲合并是阶段 2 核心；`applyPartDelta` 必须保持纯函数（可单测）。
- **自定义 `code_inline` 样式必须显式覆盖 `padding`**：react-native-markdown-display 默认 `code_inline` 带 `padding: 10`，只覆盖 color/backgroundColor 会留下 39px 高的大框覆盖相邻行；需加 `padding: 0, lineHeight: 22`（2026-08-11 已修）。
- **BottomSheet fullScreen 无 padding**：输入区靠组件自身 padding 撑起（ChatPanel 自带 paddingBottom）。
- 单测：`message-merging.test.ts`、`message-reducer.test.ts`、`order-sim.test.ts`（模拟完整 SSE 链路）。
- E2E：`scripts/e2e/pulse-e2e.mjs` 覆盖打开项目 → 发消息 → 顺序校验；`test/steps-verify*.mjs` 验证旁白渲染；`test/agent-pill-verify.mjs` 验证 agent 循环 + prompt 参数；`test/model-sheet-verify.mjs` 验证模型弹出框；`test/bff-e2e.mjs` 验证登录 + 打字机 + 动态模型（阶段 2）。
