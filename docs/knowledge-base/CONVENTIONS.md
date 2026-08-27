# CONVENTIONS.md —— 约定与陷阱

> 最后更新：2026-08-25 · commit：`b8a122b`（工作区未提交）+error透传+question事件+对象渲染白屏

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
| **BottomSheet web 黑框（重大 bug）** | react-native-web **不桥接** `Animated` 插值 `transform: [{ translateY: <interpolation> }]` 到 DOM——sheet 即便 `visible={false}` 也以 `translateY(0)` 渲染，用不透明 `surface[3]` 覆盖整个 Pulse 屏幕，表现为"黑框 + 底部 tab"。`useNativeDriver:true/false` 都无效（控制台的"Falling back to JS"是假象，transform 实际从不更新）。scrim 用 `opacity` 动画正常（opacity 在 web 回退有效），故只 sheet 受影响 | BottomSheet 用 `{visible ? <Animated.View/> : null}` **条件渲染**（`src/components/navigation/BottomSheet.tsx`）；勿改回常驻渲染+transform 隐藏。代价：丢失关闭滑出动画（web 上本就不工作） |
| **serve-static gzipCache 缓存旧 bundle** | `scripts/serve-static.mjs` 的 `gzipCache` 按**文件路径**缓存 gzipped 字节；`expo export --clear` 覆盖 dist 文件后，`gzipCache.get(file)` 命中旧条目，服务仍返回**旧 JS/HTML**——代码改动看起来"没生效" | 每次 `pnpm exec expo export --platform web --clear` 后**必须** `pkill -f serve-static.mjs && node scripts/serve-static.mjs` 重启 9928。`Cache-Control: no-store` 只防浏览器缓存，防不了服务端 gzipCache |
| **`/session/status` 幽灵条目** | opencode 的 `/session/status` 可能残留**已删除 session** 的 busy/retry 状态（`GET /session/{id}` 返回 NotFound）。导致误判某项目 running | 用项目实际 session 列表交叉校验：仅当 session id 在 `listSessions` 结果中才采信其 busy 状态。useProjectEvents 目前**未做**此校验，是已知缺口 |
| **FlatList 不感知派生状态** | `FlatList` 是 PureComponent，只比较 `data` 与 `extraData` 引用。若在 renderItem 里根据某 state（如打字机 `revealChars`）派生展示内容但没传 `extraData`，该 state 变化不会触发重渲染——打字机逐字揭示表现为不生效 | 派生渲染状态必须通过 `extraData` 传给 FlatList（ChatPanel: `extraData={revealChars}`） |
| **打字机揭示速率 vs 全量渲染** | deepseek 整段回复 1.5s 流完，若每个 delta 立即 `setMessages`+`recomputeDisplay`，markdown 全量重渲染 + 文本瞬间到位，肉眼看到"整块弹出" | 前端限速：`revealChars` 按 40ms/3 字符推进，renderItem `slice` 截断；勿在 delta 分支直接渲染完整文本 |
| **发送后勿全量重拉** | 发送后调 `loadMessages()` 会重建整个列表、重置滚动位置（列表跳动） | `send()` 不重拉：自己的 user 气泡由 SSE `message.updated(role=user)` 回流（已实测 opencode 会推），本地乐观更新反会与 SSE 重复 |
| **RN TextInput web 垂直居中** | `textAlignVertical` 在 react-native-web 被忽略，单行输入文字会偏上 | `Platform.select({ web: { lineHeight: <高度> } })` + 固定 `height` + `paddingVertical: 0`（ChatPanel input 样式） |
| **手机端勿复用 agent 活跃 session** | 用户手机打开项目进入的"最近 session"可能是 agent（TUI）正在执行的 busy 会话，发消息后 agent 忙于执行任务不处理，表现为"没反应" | ProjectChat header 提供 **session 切换** + **New session** 弹层（BottomSheet），用户可切到独立会话 |
| `useNativeDriver` warning（web） | Animated 在 web 无原生驱动，控制台告警 | **非全无害**：见上"BottomSheet web 黑框"——依赖 `useNativeDriver` 驱动 transform 隐藏的组件会失效。opacity 类动画不受影响 |
| **React Compiler 误伤状态更新** | `app.json` 的 `experiments.reactCompiler: true` 会让 React Compiler 错误 memo 组件，导致 `setState(null)` 后再 `setState(obj)` 的重渲染被跳过——表现为"打开详情→关闭→再点无反应"。已在 2026-08-10 禁用。**勿重新开启**，如需启用须回归测试 Pulse 打开/关闭/再打开流程 | 保持 `reactCompiler` 关闭 |
| `accessible` 布尔透传警告（web） | `accessible={true}` 在 RN Web 会透传为 DOM 非布尔属性，触发 `received true for a non-boolean` 报错 | 勿给 View/组件传 `accessible={true}`（RN 默认即 accessible） |
| EAS 构建挂起 | 前台跑 `eas build` 会阻塞/超时 | 一律 nohup 后台 + 日志文件 |
| 端口被旧进程占用 | 9928 曾部署过旧 showcase / dev server | `ss -tlnp` 查进程，pkill 后重启 |
| 旧页面缓存 | 浏览器缓存旧 HTML | 响应已带 `Cache-Control: no-store` |
| chromium 测试 | Playwright 需复用系统浏览器（snap chromium 已删） | `executablePath: '/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell'` + `--no-sandbox`，勿 `playwright install`；headless 中 `locator.click`/`mouse` 对 RN Web Pressable 时序不稳定，可用 `dispatchEvent(new MouseEvent('click',{...}))` 复现真实点击 |
| **E2E 断言误匹配** | 脚本按气泡文本 `includes()` 断言时，AI 回复中若引用了测试消息文本会被误命中 | 断言尽量结合角色（USER/AI）与位置，或匹配不含引用的唯一标识 |
| **APK 冷启动 unmatched route** | `(tabs)` 组无 `index.tsx`，冷启动 `pulseapp:///` 无匹配路由 → 白屏 | 首页路由文件命名 `index.tsx`（pulse.tsx → index.tsx，commit `de9120c`） |
| **RN 原生无 `window` / 全局 `alert()`** | `window.addEventListener`、全局 `alert()` 在原生不存在，调用即崩 | `Platform.OS === 'web'` 判断 + `Alert.alert`（commit `824054f`） |
| **ErrorUtils 覆盖闪退（release）** | release 下覆盖 RN 全局错误 handler 有递归崩溃风险 | 移除 `ErrorUtils.setGlobalHandler` 覆盖（commit `824054f`） |
| **Android 9+ 禁明文 HTTP** | BFF 是 `http://` 明文，Android 9+ 默认禁 cleartext → `UnknownServiceException: cleartext communication ... not permitted` | `expo-build-properties` 插件配 `android.usesCleartextTraffic: true`（app.json，commit `46473bf`） |
| **EAS 云构建无 .env.local** | `.env.local` 被 gitignore，EAS 云构建只拉 git 代码 → 用代码 fallback 地址，若 fallback 是旧 IP 则连错 BFF | 代码 fallback 保持正确 IP `http://106.13.181.13:19234`（`src/config/opencode.ts`，commit `46473bf`）；或 EAS 环境变量注入 |
| **SSE 只透传 info.error 不透传文本错误** | 模型调用失败时，错误在 assistant 消息的 **`info.error`**（对象 `{name, data:{message}}`），不在任何 part 里。`applyMessageUpdated` 若只保留 id/role/sessionID/time 会把 error 丢掉 → 实时不显示、要重进才见 | `applyMessageUpdated` 必须透传 `info.error`；`mergeMessages` 对带 error 的消息产出 `error` step |
| **对象直接渲染 React error #31 → 白屏** | 运行时字段可能是对象（如 `info.error` = NamedError `{name,data}`），若直接塞进 `<Text>`/`<Markdown>`，React 报 "Objects are not valid as a React child"，**整棵组件树崩溃 → 全白屏**（曾表现为"打开聊天 load 一会儿全白"） | 渲染前用 `errorText()` 等安全转字符串；给 `info.error` 之类声明 `unknown` 类型而非 `string` |
| **question 事件名是 `question.asked` 非 `question.v2.asked`** | opencode server（1.18.22）实际发出 `question.asked`/`question.replied`/`question.rejected`（v1 兼容名），schema 里定义的 `question.v2.*` 未在运行时使用。只监听 v2 名 → 实时弹窗不触发，重进才显示（loadMessages→listQuestions 恢复） | ChatPanel 与 `OpenCodeEvent` 类型同时兼容两种命名 |

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
