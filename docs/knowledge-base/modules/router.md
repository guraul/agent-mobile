# modules/router.md —— 路由与应用壳

> 最后更新：2026-09-21 · commit：`feat/companion-ui-migration`（Companion UI Migration：单表面导航，取消 4-tab）

## 模块职责

Expo Router 文件路由：根 Stack（单表面 Companion 导航），承载全部页面注册。
Pulse 是唯一根界面；Talk / Attention / Responsibilities / Knowledge 是 contextual stack 路由；
Settings / Memory / Knowledge 检索以 contextual sheet 呈现（不再是 tab 页）。

## 入口文件

- `agent-mobile-app/src/app/_layout.tsx`（根，SafeAreaProvider + StatusBar(light) + Stack）

## 关键文件清单

| 文件路径 | 路由 | 内容 |
|---|---|---|
| `src/app/_layout.tsx` | — | SafeAreaProvider + StatusBar(light) + Stack（headerShown:false；web 端 fatal error 兜底屏） |
| `src/app/index.tsx` | `/` | **Pulse 根界面**（唯一表面）：Hero（问候+AI 文案+watching 行）/ Featured（≤1 attention）/ Supporting（≤4 行）/ Noticed（≤5）+ Conversation Entry + Settings 入口 |
| `src/app/talk.tsx` | `/talk` | Talk contextual stack：params sessionId/projectPath/attention/autoSendContext/autoContextText；runtime 不可用时呈现 orb header + 离线卡片（带返回） |
| `src/app/assignments.tsx` | `/assignments` | Responsibilities 列表（WATCHING 行 → FundSheet） |
| `src/app/assignments/[id].tsx` | `/assignments/[id]` | Responsibility 详情 |
| `src/app/attention/[id].tsx` | `/attention/[id]` | Attention 详情（evidence + 关联 assignment 只读投影） |
| `src/app/kb/doc.tsx` | `/kb/doc` | KB 文档阅读屏（params ref/title） |
| `src/app/memory.tsx` | `/memory` | **Redirect → `/`**（legacy 兼容，避免旧深链 404） |
| `src/app/me.tsx` | `/me` | **Redirect → `/`**（legacy 兼容；配置能力迁入 SettingsSheet） |
| `src/app/+not-found.tsx` | 404 | expo-router 自动生成（未列，由模板提供） |

**已删除**：`src/app/(tabs)/` 整个目录（`_layout.tsx` / `index.tsx` / `talk.tsx` / `memory.tsx` / `me.tsx`）。
底部 tab bar 已不存在；`(tabs)/_layout.tsx` 的 Tab 配置随之废弃。

## 导航语义（Companion IA）

- Pulse 根界面不渲染 tab bar；唯一输入 affordance 是底部 Conversation Entry（胶囊输入 + 发送按钮），
  进入即 `/talk`（无既有 attention 上下文时）。
- Attention 动作路由：REVIEW → `/attention/[id]`；Discuss → `/talk`（带 attention 上下文）；Mark handled / Dismiss 在卡内完成。
- Settings / Memory / Knowledge / Fund 详情均为 **sheet**（`components/pulse/*Sheet.tsx`），挂在 `index.tsx`。
- `/talk` 是 stack 路由：关闭走 `router.back()`（无可返回时 `router.replace("/")`），
  离线/加载态 header 也带返回按钮（`talk-back`），不会把用户困在子页。

## 对外暴露的接口/导出

- 无程序化导出；仅默认导出布局组件。

## 依赖关系

- 依赖：expo-router、lucide-react-native、`src/theme`（colors/iconStroke）、各页面
- 被依赖：应用入口（`package.json` `"main": "expo-router/entry"`）

## 修改注意事项

- **新增页面**：在 `src/app/` 下建文件即注册路由；同时必须在 `_layout.tsx` 的 `<Stack.Screen>` 登记。
- **不要再建 tab**：IA 已冻结为单表面（PRODUCT_MODEL / PRODUCTION_UI_MIGRATION_MAPPING.md）；
  contextual 能力一律 sheet 或 stack push。
- expo 静态导出（web）按路由生成独立 HTML（`index.html` / `talk.html` / `memory.html` / `me.html` /
  `assignments.html` / `attention/[id].html` / `kb/doc.html`），`serve-static.mjs` 处理 `/`、无扩展名
  与动态段回退（`/attention/x` → `attention/[id].html`）。
- `/memory` `/me` 保留仅为旧深链兼容，不要再往里加功能。
