# ARCHITECTURE.md —— 架构与数据流

> 最后更新：2026-08-10 · commit：`022b4a6`

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
组件层（可复用 UI）        src/components/**（primitives / feedback / navigation）
  ↓ 使用
主题层（设计 token）       src/theme/**
```

- 无全局状态管理（无 Redux/Zustand）；页面内 `useState` 即全部状态。
- 无网络层、无持久化、无 API 客户端。
- 路径别名：`@/*` → `src/*`（tsconfig.json `paths`）。

## 跨端/跨服务通信

- **应用 ↔ 外部**：无（0 网络请求）。
- **web 预览 ↔ 服务器**：静态文件服务，`agent-mobile-app/scripts/serve-static.mjs`（HTTP）。
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

**无任何运行时持久化**（无 AsyncStorage/SQLite/文件）。重启即还原 mock 数据。

## 数据同步/流转机制

无数据同步。唯一"流转"是 web 部署流程（非运行时）：

```
npx expo export --platform web   →  dist/（静态产物，pulse.html 等）
node scripts/serve-static.mjs    →  :9928 提供 HTTP 服务（gzip + /→/pulse 302）
```

EAS 构建流转：

```
eas build -p android --profile preview
  → 云端 Gradle assembleRelease（仅 arm64-v8a）
  → expo.dev 提供 APK 下载
```
