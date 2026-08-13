# ARCHITECTURE.md —— 架构与数据流

> 最后更新：2026-08-13 · commit：`b4d9361`（阶段 2：BFF 中间层 + 打字机 + 动态模型 + 登录）

## 整体架构

单仓库多工件，后端为**外部 OpenCode Server**（经 family-finance BFF 中间层访问）：

| 工件 | 形态 | 状态 | 说明 |
|---|---|---|---|
| `agent-mobile-app/` | Expo SDK 57 应用 | ✅ 活跃开发 | 唯一可构建产物（Android APK / web 静态站） |
| `src/`（仓库根） | React/TSX 源码 | ⚠️ 设计期，非运行态 | 早期屏幕设计（Agents/Activity/Settings），无 package.json |
| `showcase/` | 静态 HTML | ⚠️ 原型 | 浏览器打开 `showcase/index.html`（iPhone 16 Pro 393×852 mockup） |
| `docs/knowledge-base/` | Markdown 文档 | ✅ 参考 | 设计规范与评审 + 知识库，是 UI 实现的依据 |
| family-finance BFF | Next.js（外部仓库） | ✅ 运行时依赖 | JWT 认证 + REST 转发 + SSE 缓冲合并（打字机）+ CORS |
| OpenCode Server | 外部进程（`opencode serve`） | ✅ 运行时依赖 | 项目/会话/消息/权限的数据源（127.0.0.1:4096，仅 BFF 可达） |

> 注意：仓库根 `src/` 与 `agent-mobile-app/src/` 是两个不同代码库，勿混淆。

## 应用内架构（agent-mobile-app）

分层单向依赖：

```
app 层（路由 + 页面）        src/app/**
  ↓ 使用
hooks 层（聚合状态）        src/hooks/useProjectEvents.ts
  ↓ 使用
组件层（可复用 UI）         src/components/**（primitives / feedback / navigation / chat / session）
  ↓ 使用
服务层（网络/状态/纯逻辑）   src/services/**（opencode-client, opencode-events, message-reducer,
                            message-merging, project-status）
  ↓ 使用
配置层（连接参数）          src/config/opencode.ts（env 驱动）
  ↓ 使用
主题层（设计 token）        src/theme/**
```

- **状态管理**：页面内 `useState` + 服务层 SSE 事件流订阅（无全局状态库）。
- **网络层**：`fetch` + Basic auth 对接 OpenCode Server（v1 `/global/event` SSE + REST）。
- **API 客户端**：`src/services/opencode-client.ts` 封装 REST 端点；`src/services/opencode-events.ts` 处理 SSE 流式订阅（16ms 批量合并 + 指数退避重连）。
- **增量更新**：`src/services/message-reducer.ts` 纯函数处理 `message.*` 事件（含 `mergeRecentMessages` 轮询合并），避免全量 reload。
- **显示层展开**：`src/services/message-merging.ts` 把 opencode 的 step 级消息**展开为独立 DisplayStep**（不做跨 step 合并；step-start/finish 过滤）。
- **路径别名**：`@/*` → `src/*`（tsconfig.json `paths`）。

## 跨端/跨服务通信

- **应用 ↔ OpenCode Server**：HTTP + Basic auth，SSE 事件流（`/global/event`），端口 4096。
- **web 预览 ↔ 服务器**：静态文件服务，`agent-mobile-app/scripts/serve-static.mjs`（HTTP），端口 9928。
- **构建 ↔ Expo 云**：EAS CLI 上传项目 → 云端 Gradle 构建 → 下载 APK。

## 数据模型定义

### OpenCodeSession（services/opencode-client.ts）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | 会话唯一 id（如 `ses_xxx`） |
| title | string? | 会话标题（可重命名） |
| directory | string? | 项目工作目录（**项目分组的关键键**） |
| agent | string? | agent 名 |
| model | { id; providerID; variant? }? | 模型信息 |
| time | { created; updated }? | 创建/更新时间（ms） |
| summary | { additions; deletions; files }? | 变更统计 |
| cost / tokens | number / Record | 消耗统计 |

### OpenCodeMessage（services/opencode-client.ts）

| 字段 | 类型 | 说明 |
|---|---|---|
| info.id | string | 消息 id |
| info.role | `"user" \| "assistant"` | 角色 |
| info.sessionID | string | 所属会话 |
| info.time.created | number? | 创建时间（ms） |
| parts | OpenCodePart[] | 内容块（text / step-start / step-finish / tool / reasoning / file / snapshot / agent） |

**注意**：`/session/{id}/message` 返回 **chronological 顺序（旧在前）**——知识库历史文档中的「newest-first」描述已废弃（曾导致消息顺序 bug，见 CONVENTIONS.md）。

### ProjectEvent（services/project-status.ts）

| 字段 | 类型 | 说明 |
|---|---|---|
| id / projectPath / name | string | 项目标识、路径、显示名 |
| status | `"running" \| "needs-you" \| "idle"` | 聚合状态（判定优先级：pending 权限 → busy/retry → 已知 idle → 兜底 idle） |
| statusLabel / summary | string | 状态文案与摘要 |
| updated | number | 最近活动时间（session.time.updated 取最大） |
| sessionIDs | string[] | 该项目全部会话 |

### DisplayStep（services/message-merging.ts）

| 字段 | 类型 | 说明 |
|---|---|---|
| kind | `"user" \| "text" \| "reasoning" \| "tool"` | step 类型（user/text 为气泡，reasoning/tool 为旁白） |
| id | string | 来源 part 的 id（无则 `${messageId}-${序号}`） |
| text | string? | user/text 的文本内容 |
| tool | string? | tool step 的工具名（如 `bash`） |
| status | string? | tool step 的状态（如 `completed`） |
| createdAt | number | 所属消息创建时间 |

**说明**：step-start/step-finish 在 `mergeMessages` 中被过滤（噪音）；reasoning/tool 渲染为 StepChip 小字号旁白；text 为主气泡（markdown）。

## 数据存储位置与格式

| 数据 | 位置 | 格式 |
|---|---|---|
| 项目/会话/消息/权限 | OpenCode Server（进程内存 + 磁盘） | REST + SSE 流式增量 |
| 主题 token | `agent-mobile-app/src/theme/*.ts` | TS 常量对象 |
| 应用配置 | `agent-mobile-app/app.json` / `eas.json` | JSON |
| 连接参数 | `agent-mobile-app/.env.local`（未提交） | `EXPO_PUBLIC_OPENCODE_URL`（BFF 地址） |
| 测试数据 | `src/services/*.test.ts` 内联构造 | vitest fixtures |

**运行时持久化**：OpenCode Server 负责会话/消息的持久化。应用重启后 opencode session 仍存在。

## 数据同步/流转机制

### Pulse 首页（项目导航）

```
REST /project + /session?directory= + /session/status   （30s 轮询 + server.connected 时全量刷新）
  ↓ useProjectEvents（ref 缓存 + recompute 纯函数）
  ↓ determineProjectStatus（needs-you/running/idle）
  ↓ pulse.tsx 分组渲染（Needs you / Today），点击 → BottomSheet(fullScreen) → ProjectChat
SSE session.status / permission.* / session.updated / session.created / session.deleted → 增量 recompute
```

### 聊天（流式对话，阶段 2 经 BFF）

```
用户输入 → sendMessageAsync (POST /prompt_async，经 BFF 转发)
  ↓ BFF /api/opencode/stream（Bearer JWT + ?sessionID= 过滤）
  ↓ message.updated / message.part.updated（BFF 32ms 缓冲合并为 delta）/ message.removed
  ↓ message-reducer 增量 patch（chronological 插入）+ applyPartDelta（打字机追加文本）
  ↓ mergeMessages（step 展开 + 工具折叠 + 跨轮次阈值）
  ↓ MessageBubble 渲染；下拉刷新 → 重新 listMessages(limit 50)
```

**web 部署流程**（非运行时）：

```
pnpm exec expo export --platform web   →  dist/（静态产物，pulse.html 等）
node scripts/serve-static.mjs    →  :9928 提供 HTTP 服务（gzip + /→/pulse 302）
```

**EAS 构建流转**：

```
eas build -p android --profile preview
  → 云端 Gradle assembleRelease（仅 arm64-v8a）
  → expo.dev 提供 APK 下载
```

**OpenCode Server 托管**（systemd transient）：

```
OPENCODE_SERVER_PASSWORD=… opencode serve --port 4096 --hostname 0.0.0.0 --cors http://localhost:9928 --cors http://127.0.0.1:9928 --cors http://106.13.181.13:9928
```
