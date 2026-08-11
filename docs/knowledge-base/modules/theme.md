# modules/theme.md —— 设计 Token（暗色主题）

> 最后更新：2026-08-10 · commit：`022b4a6`

## 模块职责

全部视觉令牌：颜色、字体、间距、圆角、动效、图标、阴影。暗色系（canvas #0c0a09）。

## 入口文件

`agent-mobile-app/src/theme/index.ts`（统一聚合，导出 `theme` 对象与各 token 类型）

## 关键文件清单

| 文件路径 | 内容 |
|---|---|
| `src/theme/colors.ts` | 颜色令牌（导出 `colors`、`Colors`） |
| `src/theme/typography.ts` | 字号/行高/字重（variant 体系） |
| `src/theme/spacing.ts` | 间距刻度 |
| `src/theme/radius.ts` | 圆角刻度 |
| `src/theme/motion.ts` | 动效时长/缩放 |
| `src/theme/icons.ts` | 图标尺寸刻度 + `iconStroke`（线宽常量） |
| `src/theme/shadows.ts` | 阴影令牌 |

## 颜色令牌要点（colors.ts）

| 组 | 键 | 值（示例） |
|---|---|---|
| 画布 | `canvas` | `#0c0a09`（暗底） |
| 表面 | `surface.1/2/3` | `#141211` / `#1c1917` / `#24211e` |
| 文本 | `ink` / `body` / `muted` / `disabled` | `#f5f4f2` / `#cbc9c6` / `#8a8884` / `#5c5a57` |
| 强调 | `accent.default/bright/pressed/focus/subtle` | 琥珀金 `#f5a624` 系 |
| 状态 | `status.running/idle/success/error/warning` + `fill.*` + `border.*` | running=`#f5a624` 等 |

## 对外暴露的接口/导出

- `colors`、`typography`、`spacing`、`radius`、`motion`、`iconSizes`、`iconStroke`、`shadows`
- 类型：`Colors`、`TypographyToken`、`TextStyleToken`、`TypographyStyle`、`SpacingToken`、`RadiusToken`、`Motion`、`IconSizeToken`、`ShadowToken`
- `theme`（聚合对象）+ `Theme` 类型

## 依赖关系

- 依赖：无（叶子模块）
- 被依赖：`src/components/**` 与所有页面、`app/(tabs)/_layout.tsx`（tab 配色）

## 修改注意事项

- **单一数据源**：改颜色只改 colors.ts；组件/页面一律经 import 使用，禁止写死色值。
- app.json 中另有应用级外观配置（`backgroundColor: #0c0a09`、splash 背景、`userInterfaceStyle: "dark"`），改整体色调需两边同步。
- `iconStroke` 从 theme/icons.ts 导出（页面直接 `import { iconStroke } from "@/theme"`）。
- status 色与语义（running=进行中/琥珀）被 StatusDot/Pill/Callout 与 EventItem 的状态映射共用，改色表即全局生效。
