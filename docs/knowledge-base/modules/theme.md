# modules/theme.md —— 设计 Token（暗色主题）

> 最后更新：2026-09-21 · commit：`feat/companion-ui-migration`（Companion UI Migration：accent 琥珀→紫罗兰，新增 hero/label 排版 token 与 accentBorder/border.subtle）

## 模块职责

全部视觉令牌：颜色、字体、间距、圆角、动效、图标、阴影。暗色系（canvas `#0B0A10`）。
视觉语言来源：`showcase2/SHOWCASE2_VISUAL_SPEC.md`（Strategy B：语言进 theme/components，非整体拷贝）。

## 入口文件

`agent-mobile-app/src/theme/index.ts`（统一聚合，导出 `theme` 对象与各 token 类型）

## 关键文件清单

| 文件路径 | 内容 |
|---|---|
| `src/theme/colors.ts` | 颜色令牌（导出 `colors`、`Colors`） |
| `src/theme/typography.ts` | 字号/行高/字重（variant 体系；含 `hero` 33/700、`label` 12/600 字距 .6） |
| `src/theme/spacing.ts` | 间距刻度 |
| `src/theme/radius.ts` | 圆角刻度 |
| `src/theme/motion.ts` | 动效时长/缩放 |
| `src/theme/icons.ts` | 图标尺寸刻度 + `iconStroke`（线宽常量） |
| `src/theme/shadows.ts` | 阴影令牌 |

## 颜色令牌要点（colors.ts）

| 组 | 键 | 值（示例） |
|---|---|---|
| 画布 | `canvas` | `#0B0A10`（暗底） |
| 表面 | `surface.1/2/3` | `#15141D` / `#1B1A26` / `#221F2E` |
| 文本 | `ink` / `body` / `muted` / `disabled` | `#F4F3F8` / `#A9A6BB` / `#6F6C82` / `#55536B` |
| 强调 | `accent.default/bright/pressed/focus/subtle` | 紫罗兰 `#8B5CF6` / `#A78BFA` / `#6D3EF0` / `rgba(139,92,246,.4)` / `rgba(139,92,246,.14)` |
| 强调边框 | `accentBorder` | `rgba(139, 92, 246, 0.32)` |
| 描边 | `border.default/subtle/strong/focused/error/disabled` | `rgba(255,255,255,.10/.055/.16/...)` |
| 状态 | `status.running/idle/success/error/warning` + `fill.*` + `border.*` | running=`#F2B33D`、success=`#3DC98A`、error=`#E5484D`、warning=`#E8A13C` |
| 前景 | `onAccent` / `onInverse` / `onSurface3` | `#FFFFFF` / `#12101A` / `#F4F3F8` |

**语义色与强调色解耦**：accent 改为紫罗兰后，`status.*`（attention/success/error/warning）保持原值不动——
语义状态色不是品牌色，不随 accent 迁移（PRODUCTION_UI_MIGRATION_MAPPING §23）。

## 对外暴露的接口/导出

- `colors`、`typography`、`spacing`、`radius`、`motion`、`iconSizes`、`iconStroke`、`shadows`
- 类型：`Colors`、`TypographyToken`、`TextStyleToken`、`TypographyStyle`、`SpacingToken`、`RadiusToken`、`Motion`、`IconSizeToken`、`ShadowToken`
- `theme`（聚合对象）+ `Theme` 类型
## 依赖关系

- 依赖：无（叶子模块）
- 被依赖：`src/components/**` 与所有页面、`components/pulse/`（Companion 视觉层）

## 修改注意事项

- **单一数据源**：改颜色只改 colors.ts；组件/页面一律经 import 使用，禁止写死色值。
  （迁移时已修掉 `Button.tsx` 内的写死 accent 色；`components/pulse/` 新组件全部走 token。）
- app.json 中另有应用级外观配置（`backgroundColor`、splash 背景、`userInterfaceStyle: "dark"`），改整体色调需两边同步。
- `iconStroke` 从 theme/icons.ts 导出（页面直接 `import { iconStroke } from "@/theme"`）。
- status 色与语义（running=进行中）被 StatusDot/Pill/Callout 与 SupportingRow 的 dot 色共用，改色表即全局生效。
- **Companion 组件硬约束**：发光元素只允许 `AIOrb` 一处；禁止新增会呼吸/发光的第二元素。
