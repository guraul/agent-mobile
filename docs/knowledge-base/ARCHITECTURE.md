# ARCHITECTURE.md —— 架构与数据流

> 最后更新：2026-08-11 · commit：`1e83c92`（opencode 集成）

## 整体架构

单仓库多工件，**无后端服务**（纯本地/前端演示应用）：

| 工件 | 形态 | 状态 | 说明 |
|---|---|---|---|
| `agent-mobile-app/` | Expo SDK 57 应用 | ✅ 活跃开发 | 唯一可构建产物（Android APK / web 静态站） |
| `src/`（仓库根） | React/TSX 源码 | ⚠️ 设计期，非运行态 | 早期屏幕设计（Agents/Activity/Settings），无 package.json |
| `showcase/` | 静态 HTML | ⚠️ 原型 | 浏览器打开 `showcase/index.html`（iPhone 16 Pro 393×852 mockup） |
| `docs/knowledge-base/` | Markdown 文档 | ✅ 参考 | 设计规范与评审 + 知识库，是 UI 实现的依据 |

> 注意：仓库根 `src/` 与 `agent-mobile-app/src/` 是两个不同代码库，勿混淆。

## 应用内架构（agent-mobile-app）

分层单向依赖：

```
app 层（路由 + 页面）      src/app/**
  ↓ 使用
模块层（页面逻辑 + 数据）   src/screens/events.ts
  ↓ 使用
组件层（可复用 UI）        src/components/**（primitives / feedback / navigation / session / chat）
  ↓ 使用
服务层（网络/状态）        src/services/**（opencode-client, opencode-events, message-reducer）
  ↓ 使用
主题层（设计 token）       src/theme/**
```

- **状态管理**：页面内 `useState` + 服务层 SSE 事件流订阅（无全局状态库）。
- **网络层**：`fetch` + Basic auth 对接 OpenCode Server（v1 `/global/event` SSE + REST）。
- **API 客户端**：`src/services/opencode-client.ts` 封装 REST 端点；`src/services/opencode-events.ts` 处理 SSE 流式订阅（16ms 批量合并 + 指数退避重连）。
- **增量更新**：`src/services/message-reducer.ts` 纯函数处理 `message.*` 事件，避免全量 reload。
- **路径别名**：`@/*` → `src/*`（tsconfig.json `paths`）。

## 跨端/跨服务通信

- **应用 ↔ OpenCode Server**：HTTP + Basic auth，SSE 事件流（`/global/event`），端口 4096。
- **web 预览 ↔ 服务器**：静态文件服务，`agent-mobile-app/scripts/serve-static.mjs`（HTTP），端口 9928。
- **构建 ↔ Expo 云**：EAS CLI 上传项目 → 云端 Gradle 构建 → 下载 APK。

## 数据模型定义

### PulseEvent（src/screens/events.ts）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | 唯一标识（如 `"migration"`），也用作 testID 后缀 |
| type | string | 事件类别标签（ACTION/CALENDAR/SUBSCRIPTION/DRAFT） |
| title | string | 标题 |
| summary | string | 列表页摘要（1 行） |
| status | StatusType | `"running" \| "idle" \| "success" \| "error" \| "warning"`（来自 `src/components/feedback/StatusDot.tsx`） |
| statusLabel | string | 状态文案（"Needs you" / "Confirmed"…） |
| detail | string | sheet 内详情正文 |
| projectPath | string | （新增）对应真实项目路径（如 `/root/project/agent-mobile`），用于 opencode session 绑定 |
| actions | { label; variant: `"primary"\|"secondary"\|"ghost"`; alert }[] | sheet 内操作按钮；alert 为点击后的演示文案 |

### PULSE_SECTIONS

```ts
{ label: string; eventIds: string[] }[]
```
分组定义，事件按 id 引用（如 `{ label: "Needs you", eventIds: ["migration"] }`）。

## 数据存储位置与格式

| 数据 | 位置 | 格式 |
|---|---|---|
| 事件数据 | `agent-mobile-app/src/screens/events.ts` | TypeScript 常量（PULSE_EVENTS: PulseEvent[]） |
| 主题 token | `agent-mobile-app/src/theme/*.ts` | TS 常量对象 |
| 应用配置 | `agent-mobile-app/app.json` / `eas.json` | JSON |
| OpenCode 会话/消息 | OpenCode Server（内存/磁盘） | REST + SSE 流式增量 |
| 环境变量 | `.env.local`（未提交） | `EXPO_PUBLIC_OPENCODE_URL/USERNAME/PASSWORD` |

**运行时持久化**：OpenCode Server 负责会话/消息的持久化（内存 + 磁盘）。应用重启后 opencode session 仍存在。

## 数据同步/流转机制

**SSE 事件流**：OpenCode Server 推送 `message.*` / `session.*` 事件，客户端增量更新 UI（16ms 批量合并）。

**web 部署流程**（非运行时）：

```
npx expo export --platform web   →  dist/（静态产物，pulse.html 等）
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
OPENCODE_SERVER_PASSWORD=… opencode serve --port 4096 --hostname 127.0.0.1 --cors http://localhost:9928 --cors http://127.0.0.1:9928
```
