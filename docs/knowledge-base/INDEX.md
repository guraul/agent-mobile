# Agent Mobile 项目知识库 · 索引总览

> 最后更新：2026-09-12 · MVP mainline closed（Phase 13 + MVP Acceptance 完成，状态见 `docs/redesign/MVP_ACCEPTANCE.md`）
> 维护：见 [CONVENTIONS.md](CONVENTIONS.md)「知识库维护约定」

## 使用说明

| 场景 | 加载文档 |
|---|---|
| 第一次接触 / 全局定位 | 本文件 INDEX.md |
| 理解架构与数据流 | ARCHITECTURE.md |
| 改 Pulse 首页（项目导航/分组） | modules/pulse-stream.md |
| 改聊天界面（气泡/输入框/step 展开） | modules/chat.md |
| 改 opencode 对接（REST/SSE/reducer/状态机） | modules/services.md |
| 改组件库 | modules/components.md |
| 改颜色/字号/间距等 token | modules/theme.md |
| 改路由/新增页面 | modules/router.md |
| 查数据在哪 / 数据怎么流动 | DATA.md |
| 有没有对外接口 | API.md |
| 构建/部署/预览/测试 | OPERATIONS.md |
| 改代码前的红线与坑 | CONVENTIONS.md |
| **产品语义（冻结基线）** | `docs/redesign/PRODUCT_MODEL.md` |
| **最终架构 / canonical / authority / 恢复语义** | `docs/redesign/FINAL_ARCHITECTURE.md` |
| **MVP 验收结论与 known gaps** | `docs/redesign/MVP_ACCEPTANCE.md` |
| **Phase 9–13 设计与实现记录** | `docs/redesign/PHASE{9,10,11,12,13}_*.md` |

## 项目定位

**Agent Mobile / Pulse** — 持久 AI 伴侣（persistent, Jarvis-like companion），当前 Agent Runtime 为 OpenCode（实现选择，非产品身份，PM §1/§34）。
当前形态（MVP mainline）：Expo（SDK 57）应用；Pulse 首页五分组 = Needs you（Attention）/ Suggested（Assignment Proposal 的 L2 呈现）/ Noticed（observation L1）/ Today（项目 running）/ Market（行情 L1）；Talk = 真实会话（经 Pulse 项目/Attention 卡进入 ChatPanelZ，含 /assign /confirm 斜杠命令；Talk tab 本身为占位）；Memory tab = 真实数据 + Responsibilities（Assignment 管理面）+ KB 检索；Me tab 为配置页。产品语义唯一来源 `docs/redesign/PRODUCT_MODEL.md`（冻结）。

## 核心功能清单

| 功能 | 所属模块 | 入口文件 |
|---|---|---|
| Pulse 首页（五分组：Needs you / Suggested / Noticed / Today / Market + 其他项目折叠栏 + 全屏聊天 sheet） | pulse-stream | `agent-mobile-app/src/app/(tabs)/index.tsx` |
| 项目状态聚合（running/idle + 不活跃项目 otherProjects + SSE 实时） | pulse-stream | `agent-mobile-app/src/hooks/useProjectEvents.ts` |
| 基金行情订阅（L1 presentation：`/api/product/l1` + `/api/product/l1/stream`，行情跑马灯） | pulse-stream | `agent-mobile-app/src/hooks/useL1.ts` + `services/l1.ts` |
| 项目状态判定纯函数 | services | `agent-mobile-app/src/services/project-status.ts` |
| Me 页（连接与账号 / BFF 地址 / model 偏好三 Card + model 选择 BottomSheet） | router | `agent-mobile-app/src/app/(tabs)/me.tsx` |
| BFF 地址运行时覆盖（方案 C 重启生效，key `pulse_bff_url`） | services | `agent-mobile-app/src/services/bff-config.ts` + `config/opencode.ts getBaseUrl()` |
| BFF 在线探测 | services | `agent-mobile-app/src/services/bff-health.ts` |
| model 偏好（按 agent，key `pulse_model_pref_<agent>`） | services | `agent-mobile-app/src/services/model-prefs.ts` + `filter-models.ts` |
| 项目聊天（最近 session / 新建 session） | chat | `agent-mobile-app/src/components/chat/ProjectChat.tsx` |
| ZCode 风格聊天弹框（并存，`USE_ZCODE_CHAT_SHEET` 开关） | chat | `agent-mobile-app/src/components/chat/zcode/ProjectChatZ.tsx` |
| Attention store（Pulse actionable 唯一来源，Phase 3） | services | `agent-mobile-app/src/services/attention/` + `hooks/useAttentions.ts` |
| Memory tab（Phase 6 真实数据：Memory 投影 + KB 检索入口） | services | `agent-mobile-app/src/app/(tabs)/memory.tsx` + `services/memory/` |
| Responsibilities / Assignment 管理面 + 详情（Phase 9：授权/执行历史投影，revoke/repair/compensate） | services | `agent-mobile-app/src/app/assignments/` + `services/assignment/`（client/projection） |
| Attention 详情屏（Phase 9：evidence + 关联 assignment 只读投影） | services | `agent-mobile-app/src/app/attention/[id].tsx` |
| L1 订阅（market + observation，Phase 10/12：Noticed 组数据源） | services | `agent-mobile-app/src/services/l1.ts` + `hooks/useL1.ts` |
| Suggestion 数据面（Phase 13：proposal 只读投影 + product SSE + confirm/reject 转发） | services | `agent-mobile-app/src/services/proposal/` + `hooks/useSuggestions.ts` |
| 对话面板（下拉刷新/分页/滚动保持/输入三件套/轮询兜底/agent+model切换/question+permission弹窗） | chat | `agent-mobile-app/src/components/chat/ChatPanel.tsx` |
| 消息气泡（user/text markdown + 错误气泡 + StepChip 旁白） | chat | `agent-mobile-app/src/components/chat/MessageBubble.tsx` |
| 过程旁白（思考中/工具调用中） | chat | `agent-mobile-app/src/components/chat/StepChip.tsx` |
| OpenCode REST 客户端 | services | `agent-mobile-app/src/services/opencode-client.ts` |
| SSE 事件流订阅（rAF 批量 + 指数退避） | services | `agent-mobile-app/src/services/opencode-events.ts` |
| 消息增量更新 reducer | services | `agent-mobile-app/src/services/message-reducer.ts` |
| 消息 step 展开（OpenCodeMessage → DisplayStep） | services | `agent-mobile-app/src/services/message-merging.ts` |
| 底部 4-tab 导航 | router | `agent-mobile-app/src/app/(tabs)/_layout.tsx` |
| Talk tab（占位；Talk 能力经 Pulse 项目/Attention 卡的会话 sheet 承载） | router | `agent-mobile-app/src/app/(tabs)/talk.tsx` |
| 组件库（primitives/feedback/navigation） | components | `agent-mobile-app/src/components/index.ts` |
| 设计 token（暗色主题） | theme | `agent-mobile-app/src/theme/index.ts` |
| Web 静态预览服务（9928，gzip，当前） | ops | `agent-mobile-app/scripts/serve-static.mjs` + `serve-9928.service` |
| APK 下载服务（9928，备用） | ops | `test/download/pulse.apk`（python3 http.server） |
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
│   └── redesign/                             # ★ MVP 语义与架构文档（PRODUCT_MODEL 冻结）
│       ├── PRODUCT_MODEL.md                  # 冻结产品语义基线（唯一语义来源）
│       ├── FINAL_ARCHITECTURE.md / MVP_ACCEPTANCE.md / BACKLOG.md / IMPLEMENTATION_MODEL.md
│       └── PHASE{1,5,9..13}_*.md             # 各阶段设计/实现/审计报告
├── src/                                       # 设计期 RN 源码（React/TSX，无 package.json，非运行态）
│   ├── components/  screens/  theme/
├── showcase/                                  # 静态 HTML UI 原型（浏览器打开 index.html）
└── agent-mobile-app/                          # ★ 当前活跃的 Expo 应用
    ├── app.json / eas.json                    # EAS + 应用配置
    ├── package.json                           # 依赖（见技术栈表）
    ├── pnpm-workspace.yaml                    # 包源排除规则（非 workspace）
    ├── .env.local                             # 环境变量（未提交，见 OPERATIONS.md）
    ├── scripts/
    │   ├── serve-static.mjs                   # 9928 静态服务器（gzip，Pulse 首页在 /，Me 页 /me）
    │   ├── e2e/pulse-e2e.mjs                  # Playwright E2E（含发消息）
    │   └── reset-project.js                   # create-expo-app 模板残留（可忽略）
    ├── assets/                                # 图标/启动图
    └── src/
        ├── app/_layout.tsx                    # 根 Stack
        ├── app/(tabs)/_layout.tsx             # Tabs（4 tab）
        ├── app/(tabs)/index.tsx              # Pulse 页（项目导航，完整；默认 tab）
        ├── app/(tabs)/me.tsx                  # Me 配置页（账号/BFF地址/model偏好）
        ├── app/(tabs)/talk|memory.tsx          # 占位页
        ├── config/opencode.ts                 # opencode 连接配置（env）
        ├── hooks/useProjectEvents.ts          # 项目事件聚合 hook
        ├── services/                          # ★ opencode REST/SSE/reducer/step展开/状态机
        ├── components/                        # primitives/feedback/navigation/chat/session + index.ts
        └── theme/                             # colors/typography/spacing/radius/motion/icons/shadows
```

## 模块依赖关系

```
theme（无依赖，叶子）
  ↑
components（依赖 theme）
  ↑
services（opencode-client/events/reducer/merging/project-status/l1；无 UI 依赖）
  ↑
chat（ChatPanel/MessageBubble/StepChip/ProjectChat；依赖 components + services + theme）
  ↑
pulse-stream（index.tsx + useProjectEvents + useL1；依赖 components + chat + services + theme）
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
  │     ├── → useProjectEvents → index.tsx（项目分组渲染）
  │     └── → ChatPanel → message-reducer（增量 patch）→ message-merging → MessageBubble
  └── 发送消息：ChatPanel → sendMessageAsync (prompt_async) → SSE 回流

family-finance BFF (106.13.181.13:19234)，JWT，全部为 projection（canonical 在 BFF SQLite / memx / vault）：
  ├── /api/product/attention（snapshot）+ /api/product/stream（SSE：attention.* + proposal.*）→ services/attention → useAttentions → Needs you
  ├── /api/product/assignment-proposals（snapshot ?status=proposed，SSE proposal.*）→ services/proposal → useSuggestions → Suggested（Confirm/Reject 转发既有 API）
  ├── /api/product/l1 + /api/product/l1/stream（SSE 全帧）→ services/l1 → useL1 → Market 跑马灯 + Noticed
  ├── /api/product/assignments(+detail/history/repair/compensate/revoke) → services/assignment → Memory tab Responsibilities
  └── /api/product/memory + /api/product/kb/* → services/memory → Memory tab（只读投影 + forget/检索）
```

## 速查表

| 常见任务 | 涉及文件 |
|---|---|
| 新增/修改项目状态判定 | `agent-mobile-app/src/services/project-status.ts` + 测试 |
| 改 Pulse 列表 UI/分组 | `agent-mobile-app/src/app/(tabs)/index.tsx` |
| 改项目聚合逻辑（轮询/SSE 事件处理） | `agent-mobile-app/src/hooks/useProjectEvents.ts` |
| 改聊天面板（输入/刷新/分页） | `agent-mobile-app/src/components/chat/ChatPanel.tsx` |
| 改 ZCode 风格弹框（折叠步骤行/复制/状态行） | `agent-mobile-app/src/components/chat/zcode/`（fork 自 ChatPanel，双维护见 chat.md） |
| 改消息气泡（样式/工具折叠） | `agent-mobile-app/src/components/chat/MessageBubble.tsx` |
| 改项目→会话解析 | `agent-mobile-app/src/components/chat/ProjectChat.tsx` |
| 改 step 展开规则（过滤/顺序） | `agent-mobile-app/src/services/message-merging.ts` |
| 改 SSE 增量更新 | `agent-mobile-app/src/services/message-reducer.ts` |
| 新增 opencode 端点封装 | `agent-mobile-app/src/services/opencode-client.ts` |
| 改 SSE 订阅/重连 | `agent-mobile-app/src/services/opencode-events.ts` |
| 改基金行情订阅/跑马灯（L1） | `agent-mobile-app/src/services/l1.ts` + `hooks/useL1.ts` + `components/navigation/Marquee.tsx` |
| 改 BFF 地址（运行时切换，重启生效） | `agent-mobile-app/src/services/bff-config.ts`，消费方一律走 `config/opencode.ts getBaseUrl()` |
| 改 model 偏好 / Me 页 | `agent-mobile-app/src/app/(tabs)/me.tsx` + `services/model-prefs.ts`；ChatPanel 默认 pill 优先级 Me 偏好 > server agent.model > FALLBACK_AGENTS |
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
| 下载/分发 APK | `eas build:download --build-id <id>` → 覆盖 `test/download/pulse.apk` → `apk-download-9928.service`（备用） |
| 改应用元信息（包名/名称/主题色） | `agent-mobile-app/app.json` |
