# CONVENTIONS.md —— 约定与陷阱

> 最后更新：2026-08-12 · commit：`e18cb24`（阶段1：DisplayStep 展开 + 轮询兜底）

## 代码风格与命名约定

- TypeScript strict 模式；组件使用函数组件 + 显式 props 接口（`XxxProps`）。
- 组件文件：`src/components/<分类>/<组件名>.tsx`，分类目录：`primitives/`（基础）、`feedback/`（状态）、`navigation/`（导航容器）、`chat/`（对话）、`session/`（会话管理）。
- 主题文件：`src/theme/<token组>.ts`，导出对象名 = 文件名（colors.ts → `colors`）。
- 纯逻辑放 `src/services/*.ts`（无 UI 依赖），聚合状态放 `src/hooks/*.ts`，页面/组件用 `.tsx`。
- 测试 ID 惯例：`project-<id>`（EventItem）、`<testID>-scrim`（BottomSheet 遮罩）、`project-chat-sheet`（全屏 sheet）。
- 图标统一 lucide-react-native，`strokeWidth={iconStroke}`。

## 文件组织约定

- 页面路由固定 `src/app/**`；可复用组件进 `components/` 并在 `index.ts` barrel 导出；服务层进 `services/`。
- **临时测试脚本 / 测试结果（截图、日志）统一放仓库根 `test/` 目录**，勿散落 /tmp（用户明确要求）。
- 排查 opencode 内部机制（auto compact、token 统计等）参考 `/root/project/opencode-src`（opencode 官方源码，仓库外）。
- 组件间依赖用相对路径（如 `../../theme`）或别名 `@/`；页面统一 `@/components`、`@/theme`、`@/hooks`、`@/services`。
- 应用配置 `app.json`；构建配置 `eas.json`。
- 单元测试与源码同目录（`src/services/xxx.test.ts`），vitest include 只匹配 `src` 下。

## 已知问题 / 易踩的坑

| 坑 | 说明 | 规避 |
|---|---|---|
| **消息顺序反转（历史重大 bug）** | 曾误认为 `listMessages` 返回 newest-first 并 reverse + unshift，实际 API 返回 **chronological（旧在前）**，导致新消息显示在顶部、旧消息沉底 | 排序/插入一律以 `time.created` 为准；`applyMessageUpdated` 按时间戳定位插入；勿用固定端 push/unshift（有单测：order-sim.test.ts） |
| **两轮回复被合并成一条（已废弃）** | ~~`mergeMessages` 曾合并连续 assistant step~~ 2026-08-12 起改为**不合并**，输出独立 DisplayStep，`mergeGapMs` 阈值已删除 | 新逻辑见 modules/chat.md；勿用旧文档的"合并/阈值"描述 |
| **TUI 与 4096 事件流不互通** | 本地 TUI（`opencode -s` 独立实例）与 `opencode serve`(4096) 共享 DB 但 **SSE 事件流独立**：TUI 写的消息不进 4096 的 `/global/event` | ChatPanel 每 5s 轮询 `mergeRecentMessages` 兜底；或 TUI 用 `opencode attach http://127.0.0.1:4096` 统一事件流 |
| **BottomSheet 展开动画导致自动滚底失效** | 打开 sheet 时列表从 0 高度增长，单次 `scrollToEnd` 在内容未布局时执行会落空；且落点未到最终底部时 onScroll 会误关 `stickToBottom` | `loadMessages` 后 150/400/800/1500ms 多次滚动 + `ignoreScrollUntil`（2s 内忽略 onScroll 覆盖） |
| **step-start/step-finish 噪音** | opencode 每次工具调用循环产生一对 start/finish，全部显示会很吵（用户反馈"开始执行/完成出现太多次"） | `mergeMessages` 过滤这两类 part，只留 reasoning/tool 旁白 |
| **`/session` 不带 directory 只返回默认工作区** | `/session` 端点不带 `?directory=` 时只返回 `/root` 的会话 | 按项目 `directory` 分别查询（useProjectEvents / ProjectChat） |
| **`/session/status` 只含活跃会话** | busy/retry 之外的存在会话不会出现在返回 map 中 | 调用方需对已知 session 显式补 `"idle"` |
| **project.time.updated 被 watcher 污染** | 项目 `time.updated` 会被文件 watcher 更新，不能用于活跃度判断 | 活跃度以 `session.time.updated` 为准（project-status.ts） |
| web 静态导出无 index.html | `expo export` 不产出根 `index.html`，`/` 会 404/目录列表 | serve-static.mjs 已处理（302→/pulse） |
| 页面交互延迟 | web 版交互依赖 JS bundle 加载完（3MB），低带宽下"看着加载完但点不动" | gzip 已开；仍有体感问题则考虑拆包/CDN |
| `useNativeDriver` warning（web） | Animated 在 web 无原生驱动 | 无害，忽略 |
| **React Compiler 误伤状态更新** | `app.json` 的 `experiments.reactCompiler: true` 会让 React Compiler 错误 memo 组件，导致 `setState(null)` 后再 `setState(obj)` 的重渲染被跳过——表现为"打开详情→关闭→再点无反应"。已在 2026-08-10 禁用。**勿重新开启**，如需启用须回归测试 Pulse 打开/关闭/再打开流程 | 保持 `reactCompiler` 关闭 |
| `accessible` 布尔透传警告（web） | `accessible={true}` 在 RN Web 会透传为 DOM 非布尔属性，触发 `received true for a non-boolean` 报错 | 勿给 View/组件传 `accessible={true}`（RN 默认即 accessible） |
| EAS 构建挂起 | 前台跑 `eas build` 会阻塞/超时 | 一律 nohup 后台 + 日志文件 |
| 端口被旧进程占用 | 9928 曾部署过旧 showcase / dev server | `ss -tlnp` 查进程，pkill 后重启 |
| 旧页面缓存 | 浏览器缓存旧 HTML | 响应已带 `Cache-Control: no-store` |
| chromium 测试 | Playwright 需复用系统浏览器（snap chromium 已删） | `executablePath: '/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell'` + `--no-sandbox`，勿 `playwright install`；headless 中 `locator.click`/`mouse` 对 RN Web Pressable 时序不稳定，可用 `dispatchEvent(new MouseEvent('click',{...}))` 复现真实点击 |
| **E2E 断言误匹配** | 脚本按气泡文本 `includes()` 断言时，AI 回复中若引用了测试消息文本会被误命中 | 断言尽量结合角色（USER/AI）与位置，或匹配不含引用的唯一标识 |

## 修改红线

- **勿在组件/页面硬编码颜色、字号、间距** —— 必须走 `src/theme/`，否则破坏主题一致性。
- **勿改 `StatusType` 取值集合**（running/idle/success/error/warning）—— 牵连 StatusDot/Pill/Callout、EventItem。
- **勿删 `BottomSheet` 的 fullScreen 无 padding 布局约定** —— 内容组件（ProjectChat header、ChatPanel 输入区）依赖自身 padding；加回 padding 会导致输入框/header 不贴边。
- **勿改消息数组的 chronological 语义** —— reducer 插入、ChatPanel 排序、step 展开顺序全部基于 `time.created`；任何"反向"假设都会重现消息错乱。
- **勿把仓库根 `src/`（设计期源码）与 `agent-mobile-app/src/` 混为一谈** —— 两个独立代码库，改错位置 = 改到不运行的东西。
- **`EXPO_TOKEN` / `EXPO_PUBLIC_OPENCODE_PASSWORD` 为敏感凭据** —— 不写入代码/文档/提交。
- **expo 依赖版本必须匹配 SDK 57** —— 用 `npx expo install`，勿手工改版本号。
- 写代码前遵守 `agent-mobile-app/AGENTS.md`：先读 https://docs.expo.dev/versions/v57.0.0/ 版本化文档。

## 知识库维护约定

- 全部文档（设计规范 + 知识库）统一放 `docs/knowledge-base/`。
- 每份文档顶部标注最后更新日期 + commit 短 hash。
- 架构/接口/数据模型变更时同步更新对应文档；纯实现细节不必更新。
- 生成规范见 `docs/promptA.md`。
