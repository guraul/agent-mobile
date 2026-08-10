# CONVENTIONS.md —— 约定与陷阱

> 最后更新：2026-08-10 · commit：`c836209`（reactCompiler 禁用 + BottomSheet/accessible 修复）

## 代码风格与命名约定

- TypeScript strict 模式；组件使用函数组件 + 显式 props 接口（`XxxProps`）。
- 组件文件：`src/components/<分类>/<组件名>.tsx`，分类目录：`primitives/`（基础）、`feedback/`（状态）、`navigation/`（导航容器）。
- 主题文件：`src/theme/<token组>.ts`，导出对象名 = 文件名（colors.ts → `colors`）。
- 数据文件用 `.ts`（events.ts），页面/组件用 `.tsx`。
- 测试 ID 惯例：`event-<id>`（EventItem）、`<testID>-scrim`（BottomSheet 遮罩）。
- 图标统一 lucide-react-native，`strokeWidth={iconStroke}`。

## 文件组织约定

- 页面路由固定 `src/app/**`；页面级数据放 `src/screens/`；可复用组件进 `components/` 并在 `index.ts` barrel 导出。
- 组件间依赖用相对路径（如 `../../theme`）或别名 `@/`；页面统一 `@/components`、`@/theme`。
- 应用配置 `app.json`；构建配置 `eas.json`。

## 已知问题 / 易踩的坑

| 坑 | 说明 | 规避 |
|---|---|---|
| web 静态导出无 index.html | `expo export` 不产出根 `index.html`，`/` 会 404/目录列表 | serve-static.mjs 已处理（302→/pulse） |
| 页面交互延迟 | web 版交互依赖 JS bundle 加载完（3MB），低带宽下"看着加载完但点不动" | gzip 已开；仍有体感问题则考虑拆包/CDN |
| `useNativeDriver` warning（web） | Animated 在 web 无原生驱动 | 无害，忽略 |
| **React Compiler 误伤状态更新** | `app.json` 的 `experiments.reactCompiler: true` 会让 React Compiler 错误 memo 组件，导致 `setState(null)` 后再 `setState(obj)` 的重渲染被跳过——表现为"打开详情→关闭→再点无反应"。已在 2026-08-10 禁用。**勿重新开启**，如需启用须回归测试 Pulse 打开/关闭/再打开流程 | 保持 `reactCompiler` 关闭 |
| `accessible` 布尔透传警告（web） | `accessible={true}` 在 RN Web 会透传为 DOM 非布尔属性，触发 `received true for a non-boolean` 报错 | 勿给 View/组件传 `accessible={true}`（RN 默认即 accessible） |
| EAS 构建挂起 | 前台跑 `eas build` 会阻塞/超时 | 一律 nohup 后台 + 日志文件 |
| 端口被旧进程占用 | 9928 曾部署过旧 showcase / dev server | `ss -tlnp` 查进程，pkill 后重启 |
| 旧页面缓存 | 浏览器缓存旧 HTML | 响应已带 `Cache-Control: no-store` |
| chromium 测试 | Playwright 需复用系统浏览器（snap chromium 已删） | `executablePath: '/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell'` + `--no-sandbox`，勿 `playwright install`；headless 中 `locator.click`/`mouse` 对 RN Web Pressable 时序不稳定，可用 `dispatchEvent(new MouseEvent('click',{...}))` 复现真实点击 |

## 修改红线

- **勿在组件/页面硬编码颜色、字号、间距** —— 必须走 `src/theme/`，否则破坏主题一致性。
- **勿改 `StatusType` 取值集合**（running/idle/success/error/warning）—— 牵连 events.ts、StatusDot/Pill/Callout、EventItem。
- **勿删 `BottomSheet` 的 `isVisible` ref 卸载机制** —— 关闭动画依赖它（2026-08-10 起已由 `pointerEvents` 方案替代，见 pulse-stream.md）。
- **勿把仓库根 `src/`（设计期源码）与 `agent-mobile-app/src/` 混为一谈** —— 两个独立代码库，改错位置 = 改到不运行的东西。
- **`EXPO_TOKEN` 为敏感凭据** —— 不写入代码/文档/提交。
- **expo 依赖版本必须匹配 SDK 57** —— 用 `npx expo install`，勿手工改版本号。
- 写代码前遵守 `agent-mobile-app/AGENTS.md`：先读 https://docs.expo.dev/versions/v57.0.0/ 版本化文档。

## 知识库维护约定

- 全部文档（设计规范 + 知识库）统一放 `docs/knowledge-base/`。
- 每份文档顶部标注最后更新日期 + commit 短 hash。
- 架构/接口/数据模型变更时同步更新对应文档；纯实现细节不必更新。
- 生成规范见 `docs/promptA.md`。
