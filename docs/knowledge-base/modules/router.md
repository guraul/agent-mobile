# modules/router.md —— 路由与应用壳

> 最后更新：2026-08-30 · commit：`d255c48`（Me 页从占位转正式——账号/BFF地址/model偏好）

## 模块职责

Expo Router 文件路由：根 Stack + 4-tab Tabs，承载全部页面注册。

## 入口文件

- `agent-mobile-app/src/app/_layout.tsx`（根）
- `agent-mobile-app/src/app/(tabs)/_layout.tsx`（Tabs）

## 关键文件清单

| 文件路径 | 路由 | 内容 |
|---|---|---|
| `src/app/_layout.tsx` | — | SafeAreaProvider + StatusBar(light) + Stack（headerShown:false，仅 `(tabs)`） |
| `src/app/(tabs)/_layout.tsx` | `/` 组 | Tabs 容器，4 个 Tab.Screen |
| `src/app/(tabs)/index.tsx` | `/`（默认 tab） | Pulse 事件流页（默认 tab，历史名 pulse.tsx） |
| `src/app/(tabs)/talk.tsx` | `/talk` | 占位页 |
| `src/app/(tabs)/memory.tsx` | `/memory` | 占位页 |
| `src/app/(tabs)/me.tsx` | `/me` | Me 配置页：连接与账号（在线探测/登出）+ BFF 地址（运行时覆盖）+ model 偏好（BottomSheet 选择）；直开时 reload 开头 `loadToken()` |
| `src/app/+not-found.tsx` | 404 | expo-router 自动生成（未列，由模板提供） |

## Tab 配置（(tabs)/_layout.tsx）

| Tab | title | 图标（lucide） |
|---|---|---|
| pulse | Pulse | Activity |
| talk | Talk | MessageCircle |
| memory | Memory | BookOpen |
| me | Me | User |

Tab 样式：`tabBarActiveTintColor=colors.accent.default`，`tabBarInactiveTintColor=colors.muted`，背景 `colors.canvas`，`headerShown:false`，label fontSize 11 / weight 500。

## 对外暴露的接口/导出

- 无程序化导出；仅默认导出布局组件。

## 依赖关系

- 依赖：expo-router、lucide-react-native、`src/theme`（colors/iconStroke）、各页面
- 被依赖：应用入口（`package.json` `"main": "expo-router/entry"`）

## 修改注意事项

- **新增页面**：在 `src/app/` 下建文件即注册路由；新增 tab 需同时加 `Tabs.Screen` 并在 `src/app/(tabs)/_layout.tsx` 配图标。
- expo 静态导出（web）按路由生成独立 HTML（pulse.html 等），**不生成根 index.html**——web 服务器需处理 `/` 与无扩展名路径（serve-static.mjs 已处理：`/`→302 `/pulse`，`/pulse`→`pulse.html`）。
- tab 顺序决定默认首页（pulse 在前即为默认）。
- 根 `_layout.tsx` 目前只有一个 Stack.Screen，新增非 tab 路由（如详情页）在此登记。
- 改 tab 图标来自 lucide-react-native，导入后 `strokeWidth={iconStroke}` 保持视觉统一。
