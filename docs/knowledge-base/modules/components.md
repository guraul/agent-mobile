# modules/components.md —— 组件库

> 最后更新：2026-08-10 · commit：`022b4a6`

## 模块职责

可复用 UI 组件，分三类：基础原语（primitives）、状态反馈（feedback）、导航/容器（navigation）。统一出口 `src/components/index.ts`。

## 入口文件

`agent-mobile-app/src/components/index.ts`（barrel，导出全部组件与类型）

## 关键文件清单

| 文件路径 | 职责 |
|---|---|
| `src/components/primitives/Box.tsx` | 布局容器（padding/margin/gap 封装） |
| `src/components/primitives/Text.tsx` | 文本（variant 映射 theme.typography） |
| `src/components/primitives/Button.tsx` | 按钮（variant: primary/secondary/ghost） |
| `src/components/primitives/IconButton.tsx` | 图标按钮 |
| `src/components/primitives/Icon.tsx` | 图标包装（color/size token） |
| `src/components/primitives/Input.tsx` | 输入框 |
| `src/components/primitives/SearchInput.tsx` | 搜索输入框 |
| `src/components/primitives/Card.tsx` | 卡片容器（padding 档位） |
| `src/components/feedback/StatusDot.tsx` | 状态点（status + 尺寸 + pulse 动画；导出 `StatusType`） |
| `src/components/feedback/StatusPill.tsx` | 状态胶囊 |
| `src/components/feedback/StatusCallout.tsx` | 状态呼出块 |
| `src/components/navigation/ScreenHeader.tsx` | 页面顶栏（title + 左右图标） |
| `src/components/navigation/BottomTabBar.tsx` | 底部 tab 栏（导出 `TabConfig`） |
| `src/components/navigation/EventItem.tsx` | 事件流条目（Pulse 专用） |
| `src/components/navigation/BottomSheet.tsx` | 底部/全屏 sheet（visible/onClose/fullScreen） |
| `src/components/PlaceholderScreen.tsx` | 占位页（"Coming soon"） |

## 对外暴露的接口/导出

全部经 `src/components/index.ts` 导出，主要签名：

- `BottomSheetProps`: `{ visible: boolean; onClose: () => void; fullScreen?: boolean; children; testID?: string }`
- `EventItemProps`: `{ type; title; summary; status: StatusType; statusLabel; onPress?; testID? }`
- `StatusType`: `"running" | "idle" | "success" | "error" | "warning"`
- `Button` 变体：`"primary" | "secondary" | "ghost"`

## 依赖关系

- 依赖：`src/theme/`（colors、spacing、radius、motion、typography）
- 被依赖：所有页面（pulse.tsx、PlaceholderScreen）及 `app/(tabs)/_layout.tsx`（BottomTabBar）
- 组件间：navigation 组件内部使用 primitives（如 EventItem 用 Box/Text/StatusPill）

## 修改注意事项

- **新组件必须补 barrel 导出**（components/index.ts），否则页面无法 `@/components` 引用。
- 组件只依赖 theme token，禁止硬编码颜色/间距（见 CONVENTIONS）。
- `StatusType` 定义在 StatusDot.tsx，多组件引用，改状态集合会波及 events.ts、EventItem、BottomSheet。
- BottomSheet 动画用 RN Animated（useNativeDriver），web 下退化为 JS 动画（有 warning，无害）。
- BottomSheet 关闭动画期间仍渲染（isVisible ref 控制卸载时机），依赖此行为勿改。
