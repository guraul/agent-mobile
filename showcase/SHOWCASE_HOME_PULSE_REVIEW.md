# SHOWCASE_HOME_PULSE_REVIEW.md

---

## 1. 修改文件

| File | Change |
|---|---|
| `pages/dashboard.html` | 完全重写 —— Agent 列表 → Pulse AI Companion 首页 |
| `styles/components.css` | 新增 `.row-item`、`.row-item__content`、`.chip-btn` 样式 |

**未修改：** `theme.css`、`navigation.js`、其余 4 个页面。

---

## 2. 页面结构

```
screen
├── ScreenHeader: "Pulse"
├── Greeting: "Good evening." (根据时间自动计算)
├── screen__content (scrollable)
│   ├── Card (comfortable) — Presence Card
│   │   ├── StatusDot (lg, running)
│   │   ├── "I'm here."
│   │   ├── "I'm monitoring 3 projects."
│   │   └── StatusPill (warning): "1 needs attention"
│   │
│   ├── Card — Mission Card
│   │   ├── AgentBadge (opencode) + "Refactoring authentication module"
│   │   ├── StatusPill (running): "Working"
│   │   ├── "14 files analyzed, 3 modified so far."
│   │   ├── StatusCallout (warning): "Review Required — I need your approval..."
│   │   ├── Button (primary): "Review" → navigate to job-detail
│   │   └── Button (ghost): "Pause" → alert
│   │
│   ├── Card — Insights Card
│   │   ├── StatusCallout (idle): "I noticed something — Test coverage dropped 7%"
│   │   └── Button (ghost): "Investigate" → alert
│   │
│   └── Card — Today's Work
│       ├── "TODAY"
│       ├── 3 × row-item (success / success / warning)
│       └── "3 tasks · 2h total"
│
├── Prompt Entry (sticky)
│   ├── Input + accent Send button
│   └── 3 × chip-btn: "Review code" / "Run tests" / "Summarize"
│
└── BottomTabBar: Home | Activity | Settings
```

---

## 3. 与 DESIGN.md token 对齐情况

| Token Category | Usage | Status |
|---|---|---|
| Colors — Surfaces | `var(--color-canvas)` (screen bg, prompt bg), `var(--color-surface-1)` (cards), `var(--color-surface-2)` (chip bg) | All tokenized |
| Colors — Text | `var(--color-body)`, `var(--color-muted)`, `var(--color-ink)` via `.type-*` classes | All tokenized |
| Colors — Accent | `var(--color-accent)` (send button bg), `var(--color-on-accent)` (send button icon) | All tokenized |
| Colors — Semantic | `status-dot--running`, `status-dot--warning`, `status-dot--success`; `status-pill--running/warning`; `status-callout--warning/idle` | All tokenized |
| Colors — Agent Identity | `agent-badge--opencode` | Tokenized |
| Colors — Borders | `var(--color-border)` (divider, prompt section border-top, chip border) | All tokenized |
| Typography | `.type-headline`, `.type-body`, `.type-body-strong`, `.type-caption`, `.type-caption-strong`, `.type-mono-caption`, `.type-title` | All tokenized |
| Spacing | `var(--space-xxs)` through `var(--space-lg)` | All tokenized |
| Radius | `var(--radius-sm)`, `var(--radius-md)`, `var(--radius-pill)` | All tokenized |
| Motion | `var(--duration-instant)`, `var(--ease-out)` (chip :active) | Tokenized |

**结论：100% token 对齐，无硬编码设计值。**

---

## 4. 与 React Native Component Mapping

| Showcase HTML | React Native Component |
|---|---|
| `card card--comfortable` (Presence) | `<Card variant="comfortable">` |
| `card` (Mission, Insights, Today) | `<Card>` |
| `status-dot--running status-dot--lg` | `<StatusDot status="running" size="lg" />` |
| `status-pill--warning/running` | `<StatusPill status="warning">...` |
| `status-callout--warning/idle` | `<StatusCallout status="warning">...` |
| `agent-badge--opencode` | `<AgentBadge agent="opencode" />` |
| `btn btn--primary` | `<Button variant="primary">` |
| `btn btn--ghost` | `<Button variant="ghost">` |
| `icon-btn` (send) | `<IconButton onPress={...} />` |
| `input-wrapper` | `<Input placeholder="..." />` |
| `type-headline` | `<Text variant="headline">` |
| `type-body` / `type-body-strong` | `<Text variant="body/body-strong">` |
| `type-caption` / `type-caption-strong` | `<Text variant="caption/caption-strong">` |
| `type-mono-caption` | `<Text variant="mono-caption">` |
| `type-title` | `<Text variant="title">` |
| `row-item` | `<Box flexDirection="row" alignItems="center">` + `<Text>` |
| `chip-btn` | `<Button variant="ghost" style="pill">` 或自定义 `Chip` 组件 |

**新增组件需求（对 RN 映射）：**
- `RowItem` —— 简单 flex row 布局，可用 `Box` + `Text` 替代，无需新增组件
- `ChipButton` —— 小型 pill 按钮，当前 `Button` ghost 变体可覆盖（调整 border/padding）

---

## 5. 是否存在硬编码

| Location | Value | Type |
|---|---|---|
| `icon-btn` background/accent color | `style="background: var(--color-accent)"` | Token reference, OK |
| Send button icon color | `style="color: var(--color-on-accent)"` | Token reference, OK |
| Negative margin for row items | `margin: 0 calc(-1 * var(--space-md))` | Token-derived calculation, OK |
| `align-self: flex-start` on Investigate | Layout choice, not token | Acceptable |
| Prompt section border-top | `border-top: 1px solid var(--color-border)` | Token reference, OK |
| Time-based greeting | `new Date().getHours()` | Runtime logic, OK |

**App UI 硬编码设计值：0。** 所有颜色、间距、圆角、字体均通过 `var()` 引用。

---

## 6. 下一步建议

| Priority | Task | Reason |
|---|---|---|
| **P1** | 给 Presence Card `StatusDot--lg` 添加 CSS pulse 动画 (keyframe opacity) | 呼吸感是 Presence Card 的核心体验 |
| **P2** | 在 `index.html` sidebar 中将 "Dashboard" 改为 "Pulse" | 与首页名称对齐 |
| **P2** | 将手机壳 `<title>` 从 "Dashboard" 更新为与 greeting 一致的名称 | HTML metadata 一致性 |
| **P3** | React Native 端实现 `Chip` 组件（基于 Button ghost + pill radius） | 快捷指令在 Home 中重复使用 |
| **P3** | 验证 Prompt Entry 的 sticky 布局在不同 iframe 内容高度下是否稳定 | 布局稳健性 |