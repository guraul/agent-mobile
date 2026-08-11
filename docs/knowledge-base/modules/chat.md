# modules/chat.md —— 聊天（项目对话）

> 最后更新：2026-08-11 · 修复 SSE 实时更新验证（code_inline 样式 + 新消息空壳插入）

## 模块职责

项目对话：选择/新建 session → 流式聊天（SSE 增量更新、消息合并折叠、下拉刷新、滚动保持）。

## 入口文件

`agent-mobile-app/src/components/chat/ProjectChat.tsx`

## 关键文件清单

| 文件路径 | 职责 |
|---|---|
| `agent-mobile-app/src/components/chat/ProjectChat.tsx` | 解析最近 session（按 `time.updated` 降序），无则展示"New session"入口 |
| `agent-mobile-app/src/components/chat/ChatPanel.tsx` | 对话面板：分页加载、SSE 订阅、输入框、下拉刷新 |
| `agent-mobile-app/src/components/chat/MessageBubble.tsx` | 气泡：user/AI 视觉区分 + markdown + 工具调用折叠 |
| `agent-mobile-app/src/services/message-merging.ts` | 合并 assistant step → DisplayMessage（含工具折叠） |
| `agent-mobile-app/src/services/message-reducer.ts` | SSE 事件增量 patch 消息列表 |
| `agent-mobile-app/src/services/opencode-events.ts` | SSE 订阅（message.* 事件） |
| `agent-mobile-app/src/services/opencode-client.ts` | listMessages / sendMessageAsync / abort / createSession |

## 数据流

```
ProjectChat: listSessions(projectPath) → 最近 session（无 → 空态 + New session）
  ↓ ChatPanel(sessionID)
loadMessages: listMessages(limit=50) → chronological（旧在前）→ mergeMessages → display
SSE: message.updated / message.part.updated / message.removed
  → message-reducer 增量 patch → 按 time.created 插入 → mergeMessages → display
发送: sendMessageAsync → 之后 loadMessages 全量刷新
下拉刷新: 重新 listMessages(limit=50)（上滑浏览不触发加载）
```

## 关键设计决策（重要）

### 消息顺序：chronological

- `listMessages` 返回 **chronological（旧在前）**；`recomputeDisplay` 按 `time.created` 升序排序后 merge，**不做 reverse**。
- `applyMessageUpdated` 新消息按 `time.created` 插入正确位置（**不是 unshift/push 到固定端**）。
- ⚠️ 历史 bug：曾误认为 newest-first 并 reverse + unshift，导致新消息显示在顶部。见 CONVENTIONS.md。

### 消息合并（message-merging.ts）

- 连续 assistant step（同一轮）合并为一个气泡：文本 `\n\n` 连接，工具调用收集。
- **跨轮次阈值 `mergeGapMs = 2min`**：连续 assistant 消息时间差 > 2min 视为不同轮次，不合并（防止初始加载的最新回复与 SSE 新回复被错误折叠）。
- 空文本且无工具的气泡被过滤。

### 滚动行为

- `stickToBottom` ref：距底部 < 80px 时自动吸底（`onContentSizeChange` → `scrollToEnd`）；上滑浏览暂停。
- **上滑不加载历史**（需求：无新输入不加载，下拉刷新拉新消息）。

### 输入区

- Mic（语音，`alert("Voice input")` 占位）+ TextInput + Send/Stop 三件套。
- 发送中显示 Stop（abort），空闲显示 Send。

## 修改本模块的注意事项

- **勿改 reducer 插入语义为固定端插入**：必须按时间戳定位，否则乱序（有单测覆盖：`order-sim.test.ts`）。
- **勿移除 mergeGapMs 阈值**：会重新引入"两轮回复被合并成一条"的问题（`message-merging.test.ts` 覆盖）。
- **自定义 `code_inline` 样式必须显式覆盖 `padding`**：react-native-markdown-display 默认 `code_inline` 带 `padding: 10`，只覆盖 color/backgroundColor 会留下 39px 高的大框覆盖相邻行；需加 `padding: 0, lineHeight: 22`（2026-08-11 已修）。
- **BottomSheet fullScreen 无 padding**：输入区靠组件自身 padding 撑起（ChatPanel 自带 paddingBottom）。
- 单测：`message-merging.test.ts`、`message-reducer.test.ts`、`order-sim.test.ts`（模拟完整 SSE 链路）。
- E2E：`scripts/e2e/pulse-e2e.mjs` 覆盖打开项目 → 发消息 → 顺序校验。
