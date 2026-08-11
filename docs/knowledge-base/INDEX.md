# Agent Mobile 项目知识库 · 索引总览

> 最后更新：2026-08-11 · commit：`072537f`（opencode 集成 + 消息顺序修复）
> 维护：见 [CONVENTIONS.md](CONVENTIONS.md)「知识库维护约定」

## 使用说明

| 场景 | 加载文档 |
|---|---|
| 第一次接触 / 全局定位 | 本文件 INDEX.md |
| 理解架构与数据流 | ARCHITECTURE.md |
| 改 Pulse 首页（项目导航/分组） | modules/pulse-stream.md |
| 改聊天界面（气泡/输入框/消息合并） | modules/chat.md |
| 改 opencode 对接（REST/SSE/reducer/状态机） | modules/services.md |
| 改组件库 | modules/components.md |
| 改颜色/字号/间距等 token | modules/theme.md |
| 改路由/新增页面 | modules/router.md |
| 查数据在哪 / 数据怎么流动 | DATA.md |
| 有没有对外接口 | API.md |
| 构建/部署/预览/测试 | OPERATIONS.md |
| 改代码前的红线与坑 | CONVENTIONS.md |

## 项目定位

**Agent Mobile** — AI 编码 agent（OpenCode 等）的移动端遥控器。"Mission Control for AI agents"。
当前形态：Expo（SDK 57）应用，Pulse 首页展示真实 opencode 项目状态（running / needs-you 分组），点击项目进入真实对话（流式回复 + 工具调用折叠）；其余 3 个 tab 为占位页。

## 核心功能清单

| 功能 | 所属模块 | 入口文件 |
|---|---|---|
| Pulse 首页（项目导航 + 状态分组 + 全屏聊天 sheet） | pulse-stream | `agent-mobile-app/src/app/(tabs)/pulse.tsx` |
| 项目状态聚合（running/needs-you/idle + SSE 实时） | pulse-stream | `agent-mobile-app/src/hooks/useProjectEvents.ts` |
| 项目状态判定纯函数 | services | `agent-mobile-app/src/services/project-status.ts` |
| 项目聊天（最近 session / 新建 session） | chat | `agent-mobile-app/src/components/chat/ProjectChat.tsx` |
| 对话面板（下拉刷新/分页/滚动保持/输入三件套） | chat | `agent-mobile-app/src/components/chat/ChatPanel.tsx` |
| 消息气泡（user/AI 区分 + 工具折叠） | chat | `agent-mobile-app/src/components/chat/MessageBubble.tsx` |
| OpenCode REST 客户端 | services | `agent-mobile-app/src/services/opencode-client.ts` |
| SSE 事件流订阅（rAF 批量 + 指数退避） | services | `agent-mobile-app/src/services/opencode-events.ts` |
| 消息增量更新 reducer | services | `agent-mobile-app/src/services/message-reducer.ts` |
| 消息合并（assistant step → 气泡） | services | `agent-mobile-app/src/services/message-merging.ts` |
| 底部 4-tab 导航 | router | `agent-mobile-app/src/app/(tabs)/_layout.tsx` |
| Talk/Memory/Me 占位页 | router | `agent-mobile-app/src/app/(tabs)/talk.tsx` 等 |
| 组件库（primitives/feedback/navigation） | components | `agent-mobile-app/src/components/index.ts` |
| 设计 token（暗色主题） | theme | `agent-mobile-app/src/theme/index.ts` |
| Web 静态预览服务（9928，gzip） | ops | `agent-mobile-app/scripts/serve-static.mjs` |
| E2E 测试（Playwright） | ops | `agent-mobile-app/scripts/e2e/pulse-e2e.mjs` |

## 技术栈表

| 类别 | 技术/库 | 版本 | 用途 |
|---|---|---|---|
| 框架 | Expo | ~57.0.11 | 应用骨架、构建（SDK 57） |
| 路由 | expo-router | ~57.0.11 | 文件路由（Stack + Tabs） |
| UI 框架 | React Native | 0.86.2 | 原生渲染 |
| 语言 | TypeScript | ~6.0.3 | 全量类型 |
| Web 渲染 | react-native-web | ~0.21.0 | web 导出/预览 |
| 图标 | lucide-react-native | ^1.31.0 | 全部图标 |
| 动画 | react-native-reanimated | 4.5.1 | BottomSheet 动画 |
| 手势 | react-native-gesture-handler | ~2.32.0 | 手势基础 |
| 安全区 | react-native-safe-area-context | ~5.7.0 | 刘海屏适配 |
| Markdown 渲染 | react-native-markdown-display | ^7.0.2 | 聊天气泡 markdown |
| 后端协议 | OpenCode Server v1 REST + SSE | — | 项目/会话/消息/权限 |
| 官方 SDK | @opencode-ai/sdk | ^1.18.15 | 协议参考（本项目自写 client） |
| 测试 | vitest | ^4.1.10 | 纯逻辑单元测试 |
| E2E | playwright-core | — | 浏览器端到端（复用 playwright-skill 依赖） |
| 构建(云) | eas-cli（EAS Build） | 21.x | Android APK/AAB |
| 静态服务 | node:http（自写） | — | 9928 web 预览 |

## 仓库拓扑

```
agent-mobile/                                  # git 根仓库
├── README.md / README_zh.md                   # 项目说明（英/中）
├── session.md                                 # 早期设计会话记录
├── test/                                      # ★ 临时测试脚本 + 测试结果（截图/日志）统一存放
├── docs/
│   ├── promptA.md                            # 知识库生成规范（模板）
│   ├── knowledge-base/                       # ★ 全部文档：设计规范 + 知识库
│   │   ├── INDEX.md / ARCHITECTURE.md / API.md / DATA.md / OPERATIONS.md / CONVENTIONS.md
│   │   ├── modules/{router,theme,components,pulse-stream,chat,services}.md
│   │   └── DESIGN*.md / REVIEW*.md / SHOWCASE*.md  # 历史设计/评审（仅参考）
├── src/                                       # 设计期 RN 源码（React/TSX，无 package.json，非运行态）
│   ├── components/  screens/  theme/
├── showcase/                                  # 静态 HTML UI 原型（浏览器打开 index.html）
└── agent-mobile-app/                          # ★ 当前活跃的 Expo 应用
    ├── app.json / eas.json                    # EAS + 应用配置
    ├── package.json                           # 依赖（见技术栈表）
    ├── pnpm-workspace.yaml                    # 包源排除规则（非 workspace）
    ├── .env.local                             # 环境变量（未提交，见 OPERATIONS.md）
    ├── scripts/
    │   ├── serve-static.mjs                   # 9928 静态服务器（gzip + /→/pulse）
    │   ├── e2e/pulse-e2e.mjs                  # Playwright E2E（含发消息）
    │   └── reset-project.js                   # create-expo-app 模板残留（可忽略）
    ├── assets/                                # 图标/启动图
    └── src/
        ├── app/_layout.tsx                    # 根 Stack
        ├── app/(tabs)/_layout.tsx             # Tabs（4 tab）
        ├── app/(tabs)/pulse.tsx               # Pulse 页（项目导航，完整）
        ├── app/(tabs)/talk|memory|me.tsx      # 占位页
        ├── config/opencode.ts                 # opencode 连接配置（env）
        ├── hooks/useProjectEvents.ts          # 项目事件聚合 hook
        ├── services/                          # ★ opencode REST/SSE/reducer/合并/状态机
        ├── components/                        # primitives/feedback/navigation/chat/session + index.ts
        └── theme/                             # colors/typography/spacing/radius/motion/icons/shadows
```

## 模块依赖关系

```
theme（无依赖，叶子）
  ↑
components（依赖 theme）
  ↑
services（opencode-client/events/reducer/merging/project-status；无 UI 依赖）
  ↑
chat（ChatPanel/MessageBubble/ProjectChat；依赖 components + services + theme）
  ↑
pulse-stream（pulse.tsx + useProjectEvents；依赖 components + chat + services + theme）
  ↑
router（app/_layout → (tabs)/_layout → 各页面，依赖全部）
  ↑
ops（serve-static.mjs / e2e；服务 dist/ 导出产物，与应用代码解耦）
```

## 数据流向总览

```
opencode server (127.0.0.1:4096, Basic auth)
  ├── REST /project /session /session/{id}/message → opencodeClient
  ├── SSE /global/event → opencode-events (rAF 批量 + 退避重连)
  │     ├── → useProjectEvents → pulse.tsx（项目分组渲染）
  │     └── → ChatPanel → message-reducer（增量 patch）→ message-merging → MessageBubble
  └── 发送消息：ChatPanel → sendMessageAsync (prompt_async) → SSE 回流
```

## 速查表

| 常见任务 | 涉及文件 |
|---|---|
| 新增/修改项目状态判定 | `agent-mobile-app/src/services/project-status.ts` + 测试 |
| 改 Pulse 列表 UI/分组 | `agent-mobile-app/src/app/(tabs)/pulse.tsx` |
| 改项目聚合逻辑（轮询/SSE 事件处理） | `agent-mobile-app/src/hooks/useProjectEvents.ts` |
| 改聊天面板（输入/刷新/分页） | `agent-mobile-app/src/components/chat/ChatPanel.tsx` |
| 改消息气泡（样式/工具折叠） | `agent-mobile-app/src/components/chat/MessageBubble.tsx` |
| 改项目→会话解析 | `agent-mobile-app/src/components/chat/ProjectChat.tsx` |
| 改消息合并规则（时间阈值等） | `agent-mobile-app/src/services/message-merging.ts` |
| 改 SSE 增量更新 | `agent-mobile-app/src/services/message-reducer.ts` |
| 新增 opencode 端点封装 | `agent-mobile-app/src/services/opencode-client.ts` |
| 改 SSE 订阅/重连 | `agent-mobile-app/src/services/opencode-events.ts` |
| 改后端地址/账号 | `agent-mobile-app/.env.local`（EXPO_PUBLIC_OPENCODE_*） |
| 新增 tab / 页面 | `agent-mobile-app/src/app/(tabs)/_layout.tsx` + 新建路由文件 |
| 改颜色 | `agent-mobile-app/src/theme/colors.ts` |
| 新增组件 | `agent-mobile-app/src/components/<category>/xxx.tsx` + 在 index.ts 导出 |
| 跑单测 | `pnpm test`（vitest） |
| 跑 E2E | `pnpm e2e` / `pnpm e2e:nosend`（见 OPERATIONS.md） |
| 写临时测试脚本/存截图 | `agent-mobile/test/`（勿放 /tmp） |
| 排查 opencode 机制（auto compact 等） | 源码在 `/root/project/opencode-src`（仓库外，含 .git 历史） |
| 预览 web 版 | `pnpm exec expo export --platform web` + 9928 服务（见 OPERATIONS.md） |
| 打 APK | `eas build -p android --profile preview`（见 OPERATIONS.md） |
| 改应用元信息（包名/名称/主题色） | `agent-mobile-app/app.json` |
