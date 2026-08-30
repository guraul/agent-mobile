# modules/chat.md —— 聊天（项目对话）

> 最后更新：2026-08-30 · commit：`d255c48`（ChatPanel 默认 model pill 读 Me 偏好）

## 模块职责

项目对话：选择/新建 session → 实时聊天（**BFF 中间层** + SSE 增量 + 打字机 + 轮询兜底、step 独立展示、下拉刷新、滚动保持）。

## 入口文件

`agent-mobile-app/src/components/chat/ProjectChat.tsx`

## 关键文件清单

| 文件路径 | 职责 |
|---|---|
| `agent-mobile-app/src/components/chat/ProjectChat.tsx` | 会话解析 + **session 切换弹层**（header 按钮 → BottomSheet 列会话 + New session）+ 返回按钮 |
| `agent-mobile-app/src/components/chat/ChatPanel.tsx` | 对话面板：分页加载、SSE 订阅（delta 打字机）、输入框、下拉刷新、自动滚底、agent/model 切换 |
| `agent-mobile-app/src/components/chat/MessageBubble.tsx` | 渲染单个 DisplayStep：user/text 气泡（markdown）、process step 委托 StepChip |
| `agent-mobile-app/src/components/chat/StepChip.tsx` | 过程旁白：思考中… / 工具(x)调用中…（小字号 caption + 图标） |
| `agent-mobile-app/src/services/message-merging.ts` | `mergeMessages`：OpenCodeMessage[] → DisplayStep[]（step 展开 + 过滤） |
| `agent-mobile-app/src/services/message-reducer.ts` | SSE 增量 patch + `applyPartDelta`（打字机）+ `mergeRecentMessages`（轮询合并纯函数） |
| `agent-mobile-app/src/services/opencode-events.ts` | BFF stream 订阅（message.* / delta 事件），rAF 批量分发 + 指数退避重连 |
| `agent-mobile-app/src/services/opencode-client.ts` | listMessages / sendMessageAsync / abort / createSession / listProviders |
| `agent-mobile-app/src/services/auth.ts` | JWT 登录/存取/401 联动（登录横幅） |

## 数据流（阶段 2：经 BFF）

```
ProjectChat: listSessions(projectPath) → 最近 session（无 → 空态 + New session）；header 按钮可切换 session
  ↓ ChatPanel(sessionID)
loadMessages: listMessages(limit=50) → chronological（旧在前）→ mergeMessages → DisplayStep[]
SSE: BFF /api/opencode/stream（Bearer JWT + ?sessionID= 过滤）
  → message.updated / message.part.updated（BFF 32ms 缓冲合并为 delta）/ message.removed
  → message-reducer 增量 patch → applyPartDelta 追加文本（打字机）→ mergeMessages → display
  → 自己发的 user 消息也由 SSE 的 message.updated(role=user) 回流（**无需乐观更新/重拉**）
发送: sendMessageAsync（不再 loadMessages 全量重拉，避免列表跳动）
下拉刷新: 重新 listMessages(limit=50)（上滑浏览不触发加载）
```
> **轮询兜底已禁用（2026-08-14）**：曾每 5s listMessages+mergeRecentMessages 同步 TUI 跨实例消息，但会整条替换正在打字机的 part，与 SSE 打字机冲突。已注释掉（代码内保留注释）。若需恢复 TUI 跨实例同步再启用。

## 关键设计决策（重要）

### 打字机（阶段 2，2026-08-13；前端限速 2026-08-14）

- **BFF 缓冲合并**：opencode 原始 `message.part.updated` 事件被 BFF 按 **32ms 缓冲**合并为 `delta` 事件（`properties = { sessionID, messageID, partID, field, text }`，`text` 为增量片段），避免高频事件压垮手机端。
- **`applyPartDelta`**（message-reducer.ts 纯函数）：消息缺失返回原数组；part 缺失创建 text part；已有 part 的 `text` 字段 += delta.text。
- **前端限速揭示（2026-08-14 新增）**：deepseek 输出太快（整段回复 ~1.5s 流完），若每次 delta 立即渲染，肉眼看到的是"整块弹出"。因此 ChatPanel 用 `revealChars`（partID → 已揭示字符数）+ 40ms 定时器按 `TYPING_CHARS_PER_TICK=3` 逐字揭示，渲染时对 text step `text.slice(0, revealChars[partID])`。纯函数 `nextRevealChars`（message-reducer.ts）可单测。
- **关键坑**：`FlatList` 是 PureComponent，只比较 `data` 与 **`extraData`**。`revealChars` 变化时必须传 `extraData={revealChars}`，否则定时器推进不会触发重渲染，打字机失效（表现为仍是整块弹出）。
- `revealTargets` 在 delta 分支、`message.part.updated` 分支、轮询合并分支都会用 `Math.max` 延伸，避免揭示停在最后一次 delta 的旧目标。
- 订阅带 sessionID：`subscribeToOpenCodeEvents(cb, undefined, sessionID)`（BFF 服务端过滤，只推本 session 事件）。
- reasoning delta 一并推送（field=text），前端追加无害（已知行为）。

### 登录（阶段 2，2026-08-13）

- **JWT 认证**：手机端经 BFF `/api/auth/login` 登录拿 JWT，存 AsyncStorage（key `pulse_opencode_token`）。
- **登录横幅**：index.tsx（Pulse 首页）顶部——`loadToken()` 无 token 或收到 `onUnauthorized` 时显示"未登录 — 点击登录"，点击打开 BottomSheet 登录弹窗（账号/密码 + 登录按钮）。
- **401 联动**：任何 REST/stream 调用返回 401 → `handleUnauthorized()` 清 token + 触发横幅。

### 动态模型列表（阶段 2，2026-08-13）

- **来源**：mount 时 `listProviders()`（BFF 转发 `/config/providers`）拉取全量模型，平铺为 `{providerID, modelID}` 列表；失败回退 `FALLBACK_AGENTS`（deepseek）的默认模型。
- **model pill**：点击打开 BottomSheet 弹出框选择模型（打开时刷新列表）；选中后 `setModel` 用于后续发送。

### DisplayStep 结构（不合并 step）

- `mergeMessages` 输出 `DisplayStep[]`，**不再合并**同轮 assistant step 为单个气泡；每条有意义的 part 独立成 step。
- step 类型：`user`（用户气泡）/ `text`（assistant 主气泡，markdown）/ `reasoning`（思考中…）/ `tool`（工具(x)调用中…）/ **`error`（错误气泡，2026-08-25 新增）**。
- **step-start / step-finish 被过滤**（opencode 每次工具调用循环都产生一对，噪音大；2026-08-12 起不再展示）。
- 空 text part、snapshot/agent/file/compaction 等 part 也被过滤。
- 单测：`message-merging.test.ts` 覆盖 step 展开/过滤/顺序。

### 错误气泡（模型调用失败，2026-08-25 新增）

- **触发**：模型调用失败（如 provider API key 无效）时，opencode 把错误写进 assistant 消息的 **`info.error`**（对象，`{name, data:{message}}`，NamedError 结构），并发布 `session.error` + 最终 `message.updated(info 带 error)`。消息无 text part，`mergeMessages` 曾静默丢弃。
- **渲染**：`mergeMessages` 对带 `info.error` 的 assistant 消息产出 `{kind:"error"}` step，`MessageBubble` 渲染为红色左边框气泡 + "Pulse · 出错了" 标题（颜色走 `colors.status.error`，勿硬编码）。
- **实时链路（关键）**：SSE `message.updated` 的 `info.error` 由 **`applyMessageUpdated` 透传**（曾只保留 id/role/sessionID/time，把 error 丢掉 → 错误只会在全量 reload 时显示，需重进聊天才看到；2026-08-25 修复透传）。
- **⚠️ error 是对象不是字符串**：`OpenCodeMessage.info.error` 运行时是 NamedError 对象 `{name, data}`，不是 string。若把对象直接塞进 `<Text>` 会触发 React error #31（"Objects are not valid as a React child"）→ **整棵组件树崩溃 → 白屏**。`mergeMessages` 用 `errorText()` 安全转换（name + data.message，兜底 JSON）。
- 单测：`message-merging.test.ts` 覆盖字符串/对象两种 error；`message-reducer.test.ts` 覆盖 SSE 透传 error + 无 error 时保持 undefined。

### 消息顺序：chronological

- `listMessages` 返回 **chronological（旧在前）**；`recomputeDisplay` 按 `time.created` 升序排序后 merge，**不做 reverse**。
- `applyMessageUpdated` 新消息按 `time.created` 插入正确位置（**不是 unshift/push 到固定端**）。
- ⚠️ 历史 bug：曾误认为 newest-first 并 reverse + unshift，导致新消息显示在顶部。见 CONVENTIONS.md。

### SSE 增量 + 轮询兜底（跨实例同步，已禁用）

- **背景**：本地 TUI（`opencode -s` 独立实例）与 4096 server 是**两个进程**，共享 SQLite DB 但 **SSE 事件流不互通**——TUI 写的消息不会出现在 4096 的 `/global/event` 推送里。
- 曾用 ChatPanel 每 5s `listMessages(limit=10)` → `mergeRecentMessages` 兜底同步。
- **2026-08-14 已禁用**：轮询会整条替换正在打字机的 part（拿到完整文本直接覆盖），与 SSE 打字机逐字揭示冲突，导致打字机失效。手机端场景只依赖 SSE 流（自己发的 user 消息也会由 SSE `message.updated(role=user)` 回流）。
- `mergeRecentMessages` 纯函数保留在 `message-reducer.ts`（单测仍在），代码里轮询 effect 已注释保留，需要 TUI 跨实例同步时可恢复。
- **若 TUI 用 `opencode attach http://127.0.0.1:4096` 启动**，事件流统一，SSE 即可双向实时，无需轮询。

### 滚动行为

- 初次加载后自动滚动到底部：`loadMessages` 完成后 150/400/800/1500ms 多次 `scrollToEnd`（BottomSheet 展开动画使列表从 0 高度增长，单次滚动会失效）。
- **`ignoreScrollUntil`（加载后 2s）**：初次定位期间忽略 `onScroll` 的 stickToBottom 覆盖——否则程序化滚动落点未到最终底部时，onScroll 会把 stickToBottom 关掉，列表冻结在中间（2026-08-12 修复）。
- **打字机期间强制吸底（2026-08-14）**：`handleContentSizeChange` 与打字机定时器都用 `scrollToEnd({ animated: false })`（不再 animated:true）——内容每 40ms 增长时动画滚动追不上，导致最新字符停留在 agentRow（build/model 栏）下方被遮挡。
- 之后 `stickToBottom`：距底部 < 80px 自动吸底；上滑浏览暂停。
- **上滑不加载历史**（需求：无新输入不加载，下拉刷新拉新消息）。

### 输入区

- Mic（语音，`alert("Voice input")` 占位）+ TextInput + Send/Stop 三件套。
- **三元素同一水平线（2026-08-14）**：voice/send 按钮固定 40×40、输入框 `height: 40`（非 minHeight）、`paddingVertical: 0`。三者 `alignItems: "center"` 在 inputRow 内，视觉上一条水平线。
- **文字垂直居中（web）**：RN TextInput 在 web 忽略 `textAlignVertical`，需 `Platform.select({ web: { lineHeight: 40 } })` 才真正居中；native 用 `textAlignVertical: "center"`。
- 发送后**不重拉**：`send()` 不再调 `loadMessages()`——自己的 user 气泡由 SSE `message.updated(role=user)` 回流，重拉会导致列表跳动。

### question 问答弹窗（2026-08-14 新增，事件类型 2026-08-25 修正）

- **背景**：agent 用 `question` 工具提问澄清（如 brainstorming skill 的"Ask clarifying questions"）时会**阻塞等待回答**；手机端若不响应，agent 永久卡死（session 永远 busy）。曾出现"写200字新概念"后 agent 卡死的问题。
- **实时触发**：SSE 收到 `question.asked`（`properties = {id, sessionID, questions[], tool}`）→ ChatPanel 弹 BottomSheet，一次显示一个 question（header + question + options + 自定义输入）。
- **⚠️ 事件类型坑（2026-08-25）**：opencode server（1.18.22）实际发出的是 **`question.asked` / `question.replied` / `question.rejected`**（v1 兼容名），**不是** schema 里定义的 `question.v2.asked` 等。曾因 ChatPanel 只监听 `question.v2.asked` 导致实时弹窗不触发、必须重进才显示（`loadMessages → listQuestions()` 恢复）。现 ChatPanel 同时兼容两种命名（`opencode-events.ts` 类型定义亦然）。
- **加载恢复**：SSE **不会重放** `question.asked`（重连只有心跳）。若 question 在打开聊天前已发出（agent 卡住），`loadMessages` 后调 `listQuestions()` 找到该 session 的 pending question 恢复弹窗。
- **多问题逐个弹**：`questions[]` 多个时，回答一个 → 存 `questionAnswersRef` → 弹下一个 → 全部答完调 `replyQuestion(requestID, allAnswers)`。
- **跳过**：`rejectQuestion(requestID)`（避免 agent 永久等待）。
- **关键坑**：question tool part 的 `state.input.questions` 有数据但**无 requestID**；requestID 只能从 `question.asked` 事件或 `listQuestions()` 获取。
- 注意：`question` 工具的回复路径是 `POST /question/{id}/reply`（不是 session 下的 permissions 路径）；`replyPermission` 是另一套（bash/edit 等权限请求）。

### permission 权限弹窗（2026-08-14 新增）

- **背景**：agent 执行需要权限的动作（bash 命令、编辑外部目录文件等）会触发 `permission.asked` 并**阻塞等待回复**；手机端若不响应，agent 卡死（曾见读 `~/.opencode/` 记忆文件触发 `external_directory` 权限卡死）。
- **实时触发**：SSE 收到 `permission.asked`（`properties = {id, sessionID, permission, patterns[], metadata, always[], tool}`）→ ChatPanel 弹 BottomSheet，显示权限类型 + patterns + filepath，提供"允许一次/始终允许/拒绝"三按钮。
- **加载恢复**：SSE 不重放 `permission.asked`；`loadMessages` 调 `listPermissions()` 恢复 pending 权限。
- **回复**：`replyPermission(requestID, "once"|"always"|"reject")` → `POST /permission/{requestID}/reply`。
- 注意：权限路径是 `/permission/{requestID}/reply`（v1）；旧 `/session/{id}/permissions/{permissionID}` 也已弃用为规范版本。

### agent / model 切换（动态加载，2026-08-14 重构）

- **机制**：opencode **不支持修改已存在 session 的 agent/model**（`PATCH /session/{id}/update` 只有 title/metadata/permission）；agent/model 只能**按消息指定**（`POST /session/{id}/prompt_async` body 的 `agent` / `model:{providerID,modelID}`）。`ModelRef = { providerID, modelID }`（结构化对象，不是字符串）。
- **agent pill**（输入区上方左）：显示当前 agent，点击**循环切换** primary agents。primary agents 的 model **动态加载**：mount 时 `listAgents()`（`GET /agent`）过滤 `mode === "primary"`，取其 `model`，再 `loadModelPrefs()` 用 **Me 页偏好覆盖**（优先级：**Me 偏好 > server `agent.model` > FALLBACK_AGENTS**，build/plan/design，deepseek）。
- **初始 model pill（2026-08-30）**：`getModelPref(curAgent)` 有偏好 → 直接设为当前 model；无偏好才 adopt session model（须匹配 primary agent 列表）。手选 model 不持久化（只影响本次会话）。
- 常量已从 `PRIMARY_AGENTS` 重命名为 `FALLBACK_AGENTS`。
- **model pill**（旁边）：点击打开 **BottomSheet 弹出框**选择模型（**阶段 2 起为动态列表**：`listProviders()` 全量模型，失败回退 `FALLBACK_AGENTS` 默认模型；曾用内联下拉，被输入框遮挡且效果差，2026-08-12 改为 BottomSheet）。
- **model 列表过滤（2026-08-25）**：`loadModels()` 只保留 **modelID 含 `deepseek`（大小写不敏感）** 的模型，且**排除 `openrouter`、`siliconflow-cn`** 两个 provider（避免列表刷屏 + 第三方中转模型混杂）。真实数据源来自 BFF `listProviders()` 转发 opencode `/config/providers`。
- **model 列表滚动 + provider 前缀（2026-08-25）**：列表包 `ScrollView`（`maxHeight: 400`）可滚动；每项显示 **`{providerID}: {modelID}`**（如 `deepseek: deepseek-v4-flash`、`volcengine-plan: deepseek-v4-flash`）以区分跨 provider 的同名模型；active 高亮按 **providerID + modelID 双匹配**（避免同名模型误高亮）。
- 初始化：mount 时 `getSession(sessionID)` 读取 session 的 `agent` / `model`（注意 `OpenCodeSession.model` 用 `id` 字段，非 `modelID`）。**仅当 session.model 命中某个 primary agent 的默认 model 时才采纳**——避免迁移前的旧 model 把会话钉在旧 provider。
- 发送：`sendMessageAsync` body 带 `agent: agents[agentIdx].id` + `model`。

## ZCode 风格弹框（2026-08-30，与旧弹框并存）

- **开关**：`src/app/(tabs)/index.tsx` 的 `USE_ZCODE_CHAT_SHEET`（true=新弹框，false 一行回退旧弹框；旧组件零改动保留）。
- **组件树**（`src/components/chat/zcode/`，全部 fork 自旧组件）：`ProjectChatZ`（header 会话标题+项目名副标题+IconButton）→ `ChatPanelZ`（ListFooter 状态行「运行中…/已停止」、圆角输入栏、pills 带 Bot/Cpu 图标）→ `MessageBubbleZ`（气泡下复制 expo-clipboard + HH:mm 时间戳）→ `StepRow`（思考/工具可折叠行：icon+label+inputSummary 摘要，展开显 reasoning 正文/命令摘要）。
- **fork 双维护**：ChatPanelZ/ProjectChatZ 复制自 ChatPanel/ProjectChat，上游 SSE/reducer/typewriter 修复需手动同步（两文件头有 fork 声明）。
- **数据层**：`mergeMessages` 增量透传 `reasoning.text` 与 `tool.inputSummary`（input 压缩单行、200 字符截断）——旧组件不读新字段，行为零影响。
- 验收脚本：`test/zcode-sheet-e2e.mjs`（8 项，含剪贴板真实验证）。

## 修改本模块的注意事项

- **勿改 reducer 插入语义为固定端插入**：必须按时间戳定位，否则乱序（有单测覆盖：`order-sim.test.ts`）。
- **勿移除 step-start/step-finish 过滤**：会重新引入大量"开始执行/完成"噪音（2026-08-12 用户反馈）。
- **勿把轮询和打字机同时启用**：轮询整条替换 part 会破坏逐字揭示（2026-08-14 禁用轮询的教训）；如需 TUI 跨实例同步，须改造轮询为"只插入新消息、不覆盖流式 part"。
- **勿改 agent 切换为"修改 session"**：opencode API 不支持，必须按消息传 agent/model。
- **勿移除 delta 打字机**：BFF 缓冲合并是阶段 2 核心；`applyPartDelta` 必须保持纯函数（可单测）。
- **自定义 `code_inline` 样式必须显式覆盖 `padding`**：react-native-markdown-display 默认 `code_inline` 带 `padding: 10`，只覆盖 color/backgroundColor 会留下 39px 高的大框覆盖相邻行；需加 `padding: 0, lineHeight: 22`（2026-08-11 已修）。
- **BottomSheet fullScreen 无 padding**：输入区靠组件自身 padding 撑起（ChatPanel 自带 paddingBottom）。
- **勿把对象塞进 `<Text>`/`<Markdown>`**：运行时字段可能是对象（如 `info.error` 是 NamedError `{name,data}`），直接渲染会 React error #31 → 白屏。必须经 `errorText()` 等安全转字符串。
- **勿只监听 `question.v2.asked`**：opencode 实际发 `question.asked`（v1 兼容名），两端命名都要同时兼容，否则实时弹窗不触发。
- 单测：`message-merging.test.ts`（含 error step 字符串/对象 case）、`message-reducer.test.ts`（含 SSE 透传 error case）、`order-sim.test.ts`（模拟完整 SSE 链路）。
- E2E：`scripts/e2e/pulse-e2e.mjs` 覆盖打开项目 → 发消息 → 顺序校验；`test/steps-verify*.mjs` 验证旁白渲染；`test/agent-pill-verify.mjs` 验证 agent 循环 + prompt 参数；`test/model-sheet-verify.mjs` 验证模型弹出框；`test/bff-e2e.mjs` 验证登录 + 打字机 + 动态模型（阶段 2）；`test/diag/*.mjs` 各种诊断/隔离验证脚本。
