# modules/chat.md —— 聊天（项目对话 / Talk）

> 最后更新：2026-09-29 · commit：`fix(chat): 模型失效修复（#42 / issue #41）`（模型全量切 `opencode/mimo-v2.6-flash-free`，选择器排除 DeepSeek Pro；**9928 线上恢复可发消息**）
> 上一版：`feat(chat): 气泡内白卡 + Duties/Projects 卡（#30）`（`a999f4a`，epic #35 第五项）——epic #35 除 #34 外五项全部 merged
> 分流判据（`resolveConversationKind`）详见 [router.md](router.md)「双 chat 页分流」段
> ⚠️ **已知缺陷**：**#33 排队队列实际不可用**（2026-09-29 查实）——busy 判定用了 `sending`，但 `prompt_async` 立即返回、不等 agent 跑完 → 判定失效；且 busy 时 composer 只有 Stop 键、入队分支不可达。用户 2026-10-01 决定暂不修、回 backlog（issue #44）。
> ✅ `Alert.alert` 在 RN Web 静默已修（issue #43 / PR #45）：全仓 25 处改用 `showAlert()`，Web 走 LightSheet 兜底 + `console.error` 日志；`AlertHost` 挂在组件树最后。
>
> ⚠️ **v0.1.1 变更**：聊天唯一入口 = **Talk stack route**（`src/app/talk.tsx` 薄入口 → `ProjectChatZ`/`ChatPanelZ`）。Pulse 不再承载 chat，只保留底部 Conversation Entry；contextual 会话（Attention/Suggested/Noticed）经 route params 进入 Talk。`ProjectChatZ` 有 `onClose`（X → 回 Pulse）与可选 `onBack`；`ChatPanelZ` 有 `autoContextText`（通用开场消息，无授权语义）与既有 `autoSendContext`（Attention 上下文注入）。Layers（session picker）是 session 列出/切换/新建的唯一 UI，按当前 projectPath 过滤。
>
> ⚠️ **2026-09-29 双 chat 页分流 + 浅色化（epic #35 / #29）**：
> - **单路由 /talk 运行时分流**：`resolveConversationKind(directory)`（`src/services/conversation-kind.ts`，纯函数+单测；`MARKET_TALK_DIRECTORY` 常量收编于此，attention/talk.ts re-export）——绑项目 → `chatcode`（标题 "Pulse — Code Chat"），market 工作区/无项目/根目录 → `chat`（"Pulse — Chat"）。directory 是 session 属性进页才知道，判据放运行时，route params 全兼容。**#29 仅标题分流，chatcode 工作台壳由 #31 落地**（当前两支都渲染 chat 形态）。
> - **chat 浅色形态（chat.html 基准）**：cream 画布 + 白色圆角聊天区面板（radius 30）+ 双气泡（AI #F1F1F1 / user #F7F3D3，radius 16，max-width 76%）+ **AiChatOrb**（`zcode/AiChatOrb.tsx`，react-native-svg RadialGradient 还原 mock 径向渐变 + 分层光晕圆）+ user check-badge（20px #F5F5D5 圆 + 绿对勾）+ inputbar（58px 胶囊带 3px ink 描边，内含附件/语音 round-btn 占位 + 42px 圆钮，右侧 58px **peach #F3BA8F 圆形发送键**）+ agent/model 白底细边 pill 行。boot/offline 屏同步浅色（LightPresenceDot + peach Retry）。token 全部在 `light.ts` **chat 专属段**（`lightChatColors/lightChatTypography/lightChatSizes/lightChatOrbStops`），Text 新增 `lightChatTitle` variant。
> - **呈现层守卫**：零 parts 的 user 消息（历史脏数据）不渲染空气泡+badge（MessageBubbleZ 呈现层判空；mergeMessages 数据层语义不动）。
> - **chatcode 壳 + 弹层浅色化（#31）**：chatcode 侧（绑项目会话）**无会话选择器**——Layers 按钮不渲染（绑项目最新 session = resume-most-recent）；chat 侧 Layers 保留。model 面板 / question 问答 / permission 弹窗 / session picker 全部从旧暗色 BottomSheet 换 **LightSheet**（白卡 + 灰 scrim）+ light token：active 高亮 `peachSubtle`（providerID+modelID 双匹配逻辑不变），主行动作 peach 实心胶囊（老 `Button` primary 换 Pressable peachPill）、弱化动作透明细边胶囊。**层叠注意：LightSheet 无 zIndex，靠渲染顺序压层——在 ChatPanelZ 里三个 sheet 必须渲染在 inputBar 之后（最后渲染 = 最上层），否则输入区盖在 sheet 上**；ProjectChatZ 的 picker 本就是最后子节点无此问题。已知数据事实：BFF providers 列表可能不含当前 fallback/prefs 模型（注意过滤后只剩 mimo 系列，见下「model 列表过滤」），此时面板无高亮行（旧行为相同，非 bug）。e2e 新增条件步：`supporting-run-*` 行存在时点击断言 "Pulse — Code Chat" 且 Switch session 按钮不出现（动态数据缺失自动 skip）。
> - **信息层（#32）**：① **工具折叠组**——`groupToolSteps()`（message-merging.ts，纯函数+单测）把**连续** tool step 合并为 `toolGroup` 呈现组（非 tool step 打断分组），`ToolGroupCard`（tech-card：暖白 #FBF9EC 底，头部 chevron+工具名·摘要+N 项徽章+状态；展开 per-call 行=图标+工具名+mono 目标（state.title 优先）+diffstat/绿勾；行点击→**工具输出 LightSheet**（mono 全文可复制，挂在 ChatPanelZ 尾部渲染保压层））；② **thinking 块**——`ThinkCard`（虚线边框+斜体正文，替代旧 StepRow，已删）；reasoning step 纳入打字机（ChatPanelZ 对 reasoning 同样按 revealChars slice，extraData 机制不变）；③ **diff 代码卡**——`tool-diff.ts`（`extractDiffText`：metadata.diff 优先/looksLikeDiff 启发式兜底；`parseDiff`：unified diff→行类型+增删统计+文件路径；`langFromPath`；全部纯函数+单测），patch 类工具（edit/write 的 `metadata.diff`）在组卡下方渲染深暖底（#322B24）红绿行级着色卡（常显，400 行截断）。⚠️ 坑：lucide 图标不吃 style.transform（会整个消失），旋转 chevron 必须外包 View。已知限制：现库 11 个会话无任何 diff 数据（edit 工具零实例），diff 卡视觉验收为数据依赖项（解析层 23 用例兜底）。
> - **交互层（#33）**：① **composer 两态**——收起态 pill（草稿预览 + 附件/语音占位圆钮 + 有草稿才出现的内嵌发送/停止钮 + pill-sub 行内 model/agent ma-btn）↔ 展开态 composer-box（全高多行输入 minHeight72/maxHeight200 + 字数 + 附件/语音 + 44px peach 发送/停止）；发送成功自动收起。⚠️ 坑：RN Web 把 `editable={false}` 的 TextInput 渲染成 **div**（不是 readonly textarea）——"收起态预览"因此用 Pressable 包 RNText 实现，e2e"打开工作区含输入框"步骤改为先点 `[data-testid="composer-preview"]` 展开再数 textarea（Step2/Step4 已适配）；长按只认真实指针序列，playwright 需 `mouse.down/hold/up`（dispatchEvent 合成事件不触发 onLongPress）。② **agent 面板**——agent ma-btn 轻点循环（原逻辑）+ **长按 400ms 唤起 agent-sheet**（LightSheet 列出 primary agents + 模型副标题 + 桃色选中高亮，点选=直接切到该 agent 及其模型）。③ **排队消息队列**——`message-queue.ts` 纯函数（enqueue/dequeueFirst/remove/moveUp + 单测）；**busy 判定 = 现有 `sending` 状态**（opencode `prompt_async` 在整个 agent 运行期间挂起，BFF 透明代理）；busy 时 send() 走入队分支（命令类 /assignments 除外——独立瞬时 API 不排队），chip 浮层在 composer 上方（上移/删除/点文本回填编辑），busy 结束 flush effect 逐条自动发送；**发送失败：条目回填队首 + `queueBlocked` 阻塞自动重试**（防无限重试），chip 操作解除阻塞；agent/model 取发送时刻当前值。队列场景 e2e 需真实发消息（`pnpm e2e` 发送模式，需用户确认后跑）。
> - **⛔⛔ #33 排队队列实际不可用（2026-10-01 查实，用户决定暂不修、回 backlog，详见 issue #44）**：**根因是 busy 判定从根上就错了，不只是缺 UI 入口**。
>   - **设计前提实测不成立**：本文件旧版写"busy 判定 = 现有 `sending` 状态（`prompt_async` 在整个 agent 运行期间挂起）"——**这是错的**。`doSend()` 里 `finally { setSending(false) }` 在 `sendMessageAsync` 返回时就执行，而 `prompt_async` **收到 204 立刻返回**（实测 1.4s），**不等 agent 跑完**。故 `sending` 只在 HTTP 往返那一瞬间为 true，agent 实际还在生成时 `sending` 早已 false（实测：`session/status` 仍 `busy`、agent 文本仍在增长，界面 Stop 键却已消失）。
>   - **叠加入口缺失**：两态 composer 都是 `{sending ? <Stop/> : <Send/>}` **互斥渲染**（`ChatPanelZ.tsx` 展开态 ~1041 行 / 收起态 ~1108 行），agent 运行时 UI 上只有 Stop 键，而 `send()` 的入队逻辑只在 `if (sending)` 分支里 → 无任何 UI 路径可触发入队。
>   - **后果**：排队功能几乎永远不触发，chip/排序/删除/失败重试整套逻辑走不到。**这才是 #33 e2e 从一开始就挂着的真因**（不是"缺验证条件"）。
>   - **⚠️ 若将来重启，busy 必须换成真实信号**（数据层，配单测）：SSE 仍有 delta 流入 = busy，或轮询 `session/status`（实测该字段准确）。**勿再用 `sending`**——它只代表 HTTP 请求在飞。
>   - e2e 踩坑备忘（已废弃的 `queue-e2e.mjs`）：⚠️ 必须打**本地 `localhost:9928` + 专用 scratch 会话**（`E2E_SESSION=`），否则往用户真实 market 会话灌测试消息（本轮已踩坑并清理）；⚠️ mimo busy 窗口极短（长 prompt 可撑到十几秒），要**先填草稿再盯 Stop**；⚠️ 勿用 Enter 兜底发送（TextInput **未绑 `onSubmitEditing`**，Enter 不触发 send）；⚠️ 收起态 pill preview 是 `readonly`，无草稿可排，队列入口只能挂展开态。
> - **气泡内白卡（#30）**：`InnerCard`（白底 radius 14 内嵌卡，头行标题+计数+底注——将来 Settings 气泡化的统一载体）+ **Duties 卡**（状态 pill Active/Failed/Missed + Revoke 红字/Retry 桃色/Run now+Skip，数据 = `fetchAssignments("active")`+`fetchAttentions` 经 `buildDutyRows`（chat-cards.ts 纯函数，状态口径复用 assignment/projection 分组投影：repairRequest→Failed、pendingCompensation→Missed））+ **Projects 卡**（绿/灰点 + Open ›→ /talk?projectPath，数据 = listSessions+getSessionStatus 经 `buildProjectRows`，**排除 market 工作区与根目录**）。触发 = 斜杠命令**客户端拦截**：`/assignments`（原 Alert 改卡片）、新增 `/projects`——不进 agent、不进队列、不产生 opencode 消息；卡片作为 `LocalCardStep` 追加在消息流尾部（localSteps state，session 切换随 key remount 重置）。e2e Step5 在 NO_SEND 模式即可真实验证两卡（12 项）。⚠️ 坑：白卡必须嵌**灰色 AI 气泡壳**（.bubble.wide）——直接放白色聊天面板上对比度丢失（首版审图 FAIL）；useMemo 勿放条件 return 之后。⚠️ 已知观感：历史会话目录如 `/root/project`、`/root` 会以末段做项目名（"project"/"root"），真实项目目录（/root/project/agent-mobile）显示正常。⚠️ **e2e 坑（2026-09-29 收尾实测）**：卡片步断言**勿用固定 sleep**。页面此时正并发拉十余条 `opencode/rest/session?directory=…`（工作台导航），HTTP/1.1 单域 6 连接上限会把 `product/assignments`+`product/attention` 两个请求挤到 **+9s/+10s** 才回（接口自身只需 ~1.3s），固定 `waitForTimeout(4000)` 会稳定假失败。已改 20s 轮询（`e8a1f90`）。诊断这类"卡没出现"用 `page.on('response')` 抓 BFF 请求时序最有效——**注意 armed 窗口要覆盖整个等待期**，否则迟到的响应会被过滤掉误判成"没发请求"。
> - **sessions 抽屉 + 边缘手势（#34F，issue #46，用户 2026-10-01 拍板 A 方案）**：`SessionsDrawer`（zcode/，自实现 drawer——RN Web 无原生；cream 底 306px 右缘 30px 圆角 + scrim）+ `drawer-gesture.ts` 纯函数（`decideDrawerSnap` 快甩/35% 阈值、`clampDrawerTranslate`、`isHorizontalDrag`，均单测）。chat 侧 **Layers 改为唤起抽屉**（替代 #31 的 LightSheet 会话选择器，避免双选择 UI）+ 左缘 24px 热区右滑唤起；**chatcode 侧维持无入口**（绑最新 session 不变，是否加抽屉入口待用户确认）。抽屉内：会话列表（当前 peachSubtle 高亮 + 相对时间，>24h 显绝对日期）/ 切换 / 新建。⚠️ 三个实测坑：① **手势拖关必须回调父组件同步 visible**（onGestureClose）——否则 scrim 停留 pointerEvents:auto 全屏拦截，页面点不动；② RN Web PanResponder **鼠标路径不 grant 边缘热区**（move 协商不可靠），热区需 `onStartShouldSetPanResponder: true`（24px 无子元素无副作用），纵向滚动靠 move 阶段 isHorizontalDrag 门卫交还；③ e2e 模拟：鼠标拖拽可用于抽屉本体，**边缘手势只能 CDP touch + 页面 hasTouch:true**（dispatchEvent 合成事件无效）。K70 真机手势区冲突验证由用户执行。
>
> ⚠️ **2026-09-21 Companion 视觉迁移**：`USE_ZCODE_CHAT_SHEET` 开关已删除（Talk 是唯一聊天渲染层，无回退分支）；ZCode 组件改为 Companian 视觉——header 左 AIOrb + AIStatus +「Pulse」+ 右会话标题/Layers/Close；AI 消息纯文本无气泡，user 消息 accent.subtle 淡紫气泡，error 为语义色 pill；输入区移除 Mic，输入框与发送键统一 48px。

## 模块职责

项目对话：选择/新建 session → 实时聊天（**BFF 中间层** + SSE 增量 + 打字机 + 轮询兜底、step 独立展示、下拉刷新、滚动保持）。

## 入口文件

- `agent-mobile-app/src/app/talk.tsx`（Talk contextual stack：薄入口，进入即当前/默认 session；runtime 不可用时呈现 orb header + 离线卡片 + 返回；pinned session 404 时自动降级默认会话）
- `agent-mobile-app/src/components/chat/zcode/ProjectChatZ.tsx`（活跃壳：header + Layers picker + ChatPanelZ）

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

- **来源**：mount 时 `listProviders()`（BFF 转发 `/config/providers`）拉取全量模型，经 `selectModels()` 过滤后平铺为 `{providerID, modelID}` 列表；失败回退 `FALLBACK_AGENTS`（当前为 `opencode/mimo-v2.6-flash-free`，见 model-registry.ts）。
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
- **agent pill**（输入区上方左）：显示当前 agent，点击**循环切换** primary agents。primary agents 的 model **动态加载**：mount 时 `listAgents()`（`GET /agent`）过滤 `mode === "primary"`，取其 `model`，再 `loadModelPrefs()` 用 **Settings 偏好覆盖**（优先级：**Settings 偏好 > server `agent.model` > FALLBACK_AGENTS**，build/plan/design，deepseek）。偏好入口在 Pulse → Settings sheet。
- **初始 model pill（2026-08-30）**：`getModelPref(curAgent)` 有偏好 → 直接设为当前 model；无偏好才 adopt session model（须匹配 primary agent 列表）。手选 model 不持久化（只影响本次会话）。
- 常量已从 `PRIMARY_AGENTS` 重命名为 `FALLBACK_AGENTS`。
- **model pill**（旁边）：点击打开 **BottomSheet 弹出框**选择模型（**阶段 2 起为动态列表**：`listProviders()` 全量模型，失败回退 `FALLBACK_AGENTS` 默认模型；曾用内联下拉，被输入框遮挡且效果差，2026-08-12 改为 BottomSheet）。
- **model 列表过滤（2026-09-29 重写，PR #42 / issue #41）**：`loadModels()` 改用纯函数 **`selectModels()`**（`src/services/model-registry.ts` + 单测 9 例）——**白名单只留 modelID 含 `mimo`**；排除整 provider `siliconflow-cn`；**排除 DeepSeek Pro 全系**（`deepseek-v4-pro`/`v3.2`/`v3.1-terminus`/`v3`/`r1`/`pro/deepseek`，跨 provider 生效，sensenova 的 `deepseek-v4-pro` 同样被排除）。⚠️ **旧白名单是 `modelID.includes("deepseek")`——换模型时必须同步改，否则选择器会一个模型都不剩**。
- **⚠️ 勿采纳 server 端 `agent.model`（2026-09-29，issue #41 生产故障教训）**：opencode 的 `deepseek` provider 已下线 `deepseek-v4-flash`，而服务器 `opencode.json` 里 build/plan/design 三个 primary agent 仍配着它 → opencode **在 loop 层就抛 `ProviderModelNotFoundError`、不生成 assistant 消息**，表现为"发消息完全没反应"且 `errors.length === 0`（错误不走 `message.updated` 通道，所以既无回复也无 error 气泡——最隐蔽的失败形态）。故 mount 时 `listAgents()` 只用来看 agent 名单，**模型一律用 `DEFAULT_MODEL`**（`opencode/mimo-v2.6-flash-free`，已实测跑通）；用户手动设的 model 偏好（`loadModelPrefs`）仍优先。**服务器 opencode.json 本次未改**（用户明确"不用管"）——若日后 server 侧改回别的模型，前端仍以 `DEFAULT_MODEL` 为准，两者解耦。
- **model 列表滚动 + provider 前缀（2026-08-25）**：列表包 `ScrollView`（`maxHeight: 400`）可滚动；每项显示 **`{providerID}: {modelID}`**（如 `opencode: mimo-v2.6-flash-free`）以区分跨 provider 的同名模型；active 高亮按 **providerID + modelID 双匹配**（避免同名模型误高亮）。
- 初始化：mount 时 `getSession(sessionID)` 读取 session 的 `agent` / `model`（注意 `OpenCodeSession.model` 用 `id` 字段，非 `modelID`）。**仅当 session.model 命中某个 primary agent 的默认 model 时才采纳**——避免迁移前的旧 model 把会话钉在旧 provider。
- 发送：`sendMessageAsync` body 带 `agent: agents[agentIdx].id` + `model`。

## ZCode 风格弹框（2026-08-30 起为唯一聊天渲染层；2026-09-21 Companian 视觉）

- **组件树**（`src/components/chat/zcode/`，fork 自旧组件）：`ProjectChatZ`（header：AIOrb + AIStatus「Pulse」+ 会话标题 + Layers + Close）→ `ChatPanelZ`（ListFooter 状态行「运行中…/已停止」、圆角输入栏、pills 带 Bot/Cpu 图标）→ `MessageBubbleZ`（AI 纯文本无气泡 / user accent.subtle 淡紫气泡 / error 语义色 pill；气泡下复制 expo-clipboard + HH:mm 时间戳）→ `StepRow`（思考/工具可折叠行：icon+label+inputSummary 摘要，展开显 reasoning 正文/命令摘要）。
- **`USE_ZCODE_CHAT_SHEET` 开关已删除**：Talk stack route 只渲染 ZCode 组件；旧 `ProjectChat`/`ChatPanel`/`MessageBubble` 组件仍保留在 `components/chat/`（fork 上游），但无路由引用。
- **fork 双维护**：ChatPanelZ/ProjectChatZ 复制自 ChatPanel/ProjectChat，上游 SSE/reducer/typewriter 修复需手动同步（两文件头有 fork 声明）。
- **数据层**：`mergeMessages` 增量透传 `reasoning.text` 与 `tool.inputSummary`（input 压缩单行、200 字符截断）——旧组件不读新字段，行为零影响。
- **输入区**：Mic 已移除；输入框与发送键统一 48px 高度（Companion 规格）。
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


## Phase 4 追加：Attention → Talk

- 从 Attention 进入时 `ProjectChatZ` 携带 `attention` ref：顶部上下文卡（`buildAttentionContext`）+ 显式 Mark handled 按钮（`handleAttention` → POST handle，artifact=`handling:<sessionID>`）。
- market 类无 session → Create 新会话（MARKET_TALK_DIRECTORY）+ `engageAttention` 回填 + `autoSendContext` 自动注入上下文；Resume 语义见 PM §8.2/§16.4。
- Phase 5：`send()` 前拦截斜杠命令（/assign /confirm /reject /revoke /assignments，见 services/assignment/client.ts），命令不发给 Agent。
