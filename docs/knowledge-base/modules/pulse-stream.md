# modules/pulse-stream.md —— Pulse 事件流

> 最后更新：2026-08-11 · commit：`1e83c92`（opencode 集成）

## 模块职责

Pulse 首页：问候 + AI 在场状态 + 事件流列表 + 事件详情全屏 sheet + 指令输入条。是产品核心页（设计源头：`docs/knowledge-base/AI_INTERACTION_DESIGN.md`）。

## 入口文件

`agent-mobile-app/src/app/(tabs)/pulse.tsx`

## 关键文件清单

| 文件路径 | 职责 |
|---|---|
| `agent-mobile-app/src/app/(tabs)/pulse.tsx` | 页面：状态管理、列表渲染、sheet 装配 |
| `agent-mobile-app/src/screens/events.ts` | 类型 + 数据：PulseEvent、PULSE_EVENTS、PULSE_SECTIONS |
| `agent-mobile-app/src/components/navigation/EventItem.tsx` | 列表条目组件 |
| `agent-mobile-app/src/components/navigation/BottomSheet.tsx` | 全屏/底部 sheet 容器 |
| `agent-mobile-app/src/components/feedback/StatusDot.tsx` | 状态点（支持 pulse 呼吸动画） |
| `agent-mobile-app/src/components/primitives/Button.tsx` | sheet 内操作按钮 |
| `agent-mobile-app/src/components/session/SessionPanel.tsx` | opencode session CRUD 面板 |
| `agent-mobile-app/src/components/chat/ChatPanel.tsx` | 流式对话 + 工具调用展示 |
| `agent-mobile-app/src/services/opencode-client.ts` | OpenCode Server REST 客户端 |
| `agent-mobile-app/src/services/opencode-events.ts` | SSE 事件流订阅（批量合并 + 指数退避） |
| `agent-mobile-app/src/services/message-reducer.ts` | 消息增量更新纯函数 |
| `agent-mobile-app/src/components/session/SessionPanel.tsx` | opencode session 管理（CRUD + 列表） |
| `agent-mobile-app/src/components/chat/ChatPanel.tsx` | 流式对话 + 工具调用展示 |
| `agent-mobile-app/src/services/opencode-client.ts` | OpenCode Server REST 客户端 |
| `agent-mobile-app/src/services/opencode-events.ts` | SSE 事件流订阅（批量合并 + 指数退避） |
| `agent-mobile-app/src/services/message-reducer.ts` | 消息增量更新纯函数 |

## 页面结构（pulse.tsx）

```
KeyboardAvoidingView (ios: padding)
├── ScreenHeader (title="Pulse", right Bell → alert("Notifications"))
├── greetingWrap: getGreeting() 时间问候 + StatusDot(running, pulse) + "I'm here."
└── ScrollView
│   └── PULSE_SECTIONS.map → section 标题 + EventItem 列表（点击 → openSheet(event)）
└── BottomSheet(visible={selectedEvent!==null}, fullScreen)
    └── sheetBody: type/status/close ✕ / title / detail
        └── selectedEvent.projectPath 存在？
            ├── 是 → SessionPanel(projectPath) → ChatPanel(sessionID)（完整 opencode 对话）
            └── 否 → actions.map → Button(alert 演示)
```

**OpenCode 集成**：`PulseEvent` 新增 `projectPath` 字段（如 `/root/project/agent-mobile`）。当事件有 `projectPath` 时，详情 sheet 内显示 `SessionPanel`（session CRUD）→ 点击 session 进入 `ChatPanel`（流式对话 + 工具调用）。

## 对外暴露的接口/导出

- `PulseEvent`（类型）、`PULSE_EVENTS`、`PULSE_SECTIONS` —— 由 `src/screens/events.ts` 导出
- `SessionPanel`、`ChatPanel` —— 由 `src/components/session/SessionPanel.tsx`、`src/components/chat/ChatPanel.tsx` 导出
- `opencodeClient`、`subscribeToOpenCodeEvents`、`applyMessageUpdated` 等 —— 由 `src/services/` 导出
- 组件层：无页面级导出

## 依赖关系

- 依赖：`@/components`（EventItem、BottomSheet、ScreenHeader、Button、StatusDot、Text、SessionPanel、ChatPanel）、`@/theme`、`src/screens/events`、`src/services/opencode-client`、`src/services/opencode-events`、lucide-react-native、react-native-safe-area-context
- 被依赖：`app/(tabs)/_layout.tsx`（注册为 tab）

## 修改注意事项

- **数据驱动**：增删事件只改 `events.ts`，页面自动渲染（按 id 索引，勿留悬空 id）。
- `selectedEvent` 为页面私有 state；关闭 sheet 时同时清空 prompt。
- `getGreeting()` 按本地时间（早/午/晚）生成问候，无 i18n。
- 按钮动作均为 `alert()` 演示桩，接真实业务时替换 pulse.tsx:184 附近 `actions.map` 与指令条 onPress。
- 全屏 sheet 尺寸：`position:absolute` 铺满（BottomSheet.tsx fullScreen 分支），无原生手势（BottomSheet 未接入 gesture-handler 拖拽，web 上为全屏覆盖层）。
- **`reactCompiler` 必须保持关闭**：曾因 `app.json` 开启 `experiments.reactCompiler: true` 导致"打开详情→关闭→再点无反应"（React Compiler 错误 memo `PulseScreen`，`setSelectedEvent` 重渲染被跳过）。已在 2026-08-10 禁用。改 BottomSheet 状态逻辑后务必回归测试 open/close/reopen 流程。
- **BottomSheet 卸载机制**：原 `isVisible` ref 挂载逻辑已移除（ref 变化不触发重渲染，属死代码）。现改为遮罩层/sheet 容器 `pointerEvents: visible ? "auto" : "none"`，关闭态触摸穿透到下层列表，无需卸载组件。

## OpenCode 集成注意事项

- **SSE 事件流**：`subscribeToOpenCodeEvents` 已实现 16ms rAF 批量合并 + 指数退避重连（250ms → ×2 → 上限 30s）。无需手动优化。
- **增量更新**：`ChatPanel` 使用 `message-reducer.ts` 纯函数增量 patch 消息列表，避免 `loadMessages()` 全量 reload。确保 `message.updated` / `message.part.updated` 事件正确映射。
- **环境变量**：`.env.local` 配置 `EXPO_PUBLIC_OPENCODE_URL/USERNAME/PASSWORD`（未提交）。开发时需确保 `opencode serve` 在 4096 端口运行且 CORS 允许 9928。
- **测试**：纯逻辑测试（SSE 解析、批量调度、消息 reducer）用 vitest；活体集成验证需对运行中 server 发 `prompt_async` 并确认 SSE 事件流到达 UI。
