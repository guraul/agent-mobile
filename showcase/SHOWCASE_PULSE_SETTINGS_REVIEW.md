# SHOWCASE_PULSE_SETTINGS_REVIEW.md

---

## 1. 页面结构

```
screen
├── ScreenHeader: "Pulse" (left empty | Pulse | Notifications icon)
├── Subtitle: "How we work together"
│
├── screen__content (scrollable)
│   ├── Card (comfortable) — Identity
│   │   ├── StatusDot (lg, running) + "Pulse"
│   │   ├── "Your AI companion for projects and decisions."
│   │   ├── StatusPill (running): "Online"
│   │   └── "Since: Today"
│   │
│   ├── Card — Working Style
│   │   ├── "Working Style"
│   │   ├── 3 × chip-btn: Conservative / Balanced (selected, accent) / Autonomous
│   │   └── caption: "Ask when important"
│   │
│   ├── Card — Communication
│   │   ├── "Communication"
│   │   ├── row-item: Morning Brief  [TOGGLE ON]
│   │   ├── row-item: Daily Summary  [TOGGLE ON]
│   │   └── row-item: Proactive Suggestions  [TOGGLE ON]
│   │
│   ├── Card — Decision Preferences
│   │   ├── "Decision Preferences"
│   │   ├── row-item: Code Changes        → Ask First
│   │   ├── row-item: Deployments         → Always Ask
│   │   └── row-item: Documentation       → Proceed Automatically
│   │
│   ├── Card — Knowledge
│   │   ├── "What I know"
│   │   ├── flex-row: Projects      12
│   │   ├── flex-row: Preferences    8
│   │   ├── flex-row: Decisions     27
│   │   └── Button (ghost): "Manage Memory"
│   │
│   ├── Card — Safety
│   │   ├── StatusCallout (warning): "Safety Boundaries"
│   │   ├── "I will always ask before critical actions."
│   │   └── Button (ghost): "Review Rules"
│   │
│   ├── Card — Relationship
│   │   ├── "Working Together"
│   │   ├── "We've completed 18 projects together."
│   │   ├── "You've approved 47 reviews."
│   │   └── "That's about 32 hours of collaboration."
│   │
│   └── Disconnect Pulse (btn--secondary btn--full)
│
└── BottomTabBar (Home | Activity | Pulse)
```

---

## 2. 交互说明

| 元素 | 行为 | 类型 |
|---|---|---|
| Notifications icon | `alert('Notifications')` | 模拟 |
| Conservative / Balanced / Autonomous | `alert('...')` | 模拟 |
| Morning Brief / Daily Summary / Suggestions toggles | `alert('Toggle ...')` | 模拟 |
| Code Changes / Deployments / Documentation rows | — | 静态 |
| Manage Memory | `alert('Manage Memory')` | 模拟 |
| Review Rules | `alert('Review Rules')` | 模拟 |
| Disconnect Pulse | `alert('Disconnect Pulse')` | 模拟 |
| Bottom Tab Home | `parent.navigateTo('pages/dashboard.html')` | 导航 |
| Bottom Tab Activity | `parent.navigateTo('pages/jobs.html')` | 导航 |

---

## 3. DESIGN.md token 使用情况

| Token Category | Usage | Status |
|---|---|---|
| Colors — Surfaces | `var(--color-canvas)`, `var(--color-surface-1)` (cards), `var(--color-surface-2)` (toggle bg) | All tokenized |
| Colors — Text | `var(--color-muted)`, `var(--color-ink)` via `.type-*` / `.text-muted` | All tokenized |
| Colors — Accent | `var(--color-accent)` (selected chip, toggle-on), `var(--color-on-accent)` (selected chip text) | All tokenized |
| Colors — Semantic | `status-dot--running`, `status-pill--running`, `status-callout--warning` | All tokenized |
| Colors — Borders | `var(--color-border)` (dividers, toggle-off bg) | All tokenized |
| Typography | `.type-headline`, `.type-body`, `.type-body-strong`, `.type-caption`, `.type-mono-caption` | All tokenized |
| Spacing | `var(--space-xxs)` through `var(--space-md)` | All tokenized |
| Radius | `var(--radius-sm)`, `var(--radius-md)`, `var(--radius-full)` | All tokenized |

**结论：100% token 对齐，无硬编码设计值。**

---

## 4. React Native Component Mapping

| Showcase HTML | React Native Component |
|---|---|
| `screen-header` | `<ScreenHeader title="Pulse" />` |
| `card card--comfortable` (Identity) | `<Card variant="comfortable">` |
| `card` (Working Style, Communication, Decision, Knowledge, Safety, Relationship) | `<Card>` |
| `status-dot--running` + `status-dot--lg` | `<StatusDot status="running" size="lg" />` |
| `status-pill--running` | `<StatusPill status="running">Online` |
| `status-callout--warning` | `<StatusCallout status="warning">` |
| `chip-btn` | `<Button variant="ghost" style="pill">` |
| `toggle toggle--on` | `<Toggle value={true} />` |
| `btn btn--ghost` | `<Button variant="ghost">` |
| `btn btn--secondary` | `<Button variant="secondary">` |
| `row-item` / `row-item__content` | `<Box flexDirection="row">` + `<Text>` |
| `icon-btn` (notifications) | `<IconButton onPress={...} />` |
| `type-headline` / `type-body` / `type-body-strong` / `type-caption` / `type-mono-caption` | `<Text variant="...">` |

---

## 5. 是否需要新增组件

| 组件 | 是否需要 | 理由 |
|---|---|---|
| `ChipButton` variant `selected` | **否** | 使用 inline style + token 实现选中态，无需新增 CSS 类 |
| `WorkingStyleSelector` | **否** | 3 个 chip-btn + caption 已满足，无需独立组件 |
| 其余 | **否** | 所有布局使用已有组件 + 前几轮新增的通用类 |

**本轮无需修改 `components.css`。**

---

## 6. 下一步建议

| Priority | Task | Reason |
|---|---|---|
| **P1** | 更新 `index.html` sidebar 标签：Dashboard→Pulse, Job Detail→Mission, History→Memory, Settings→Pulse | 当前 sidebar 名与页面名不对齐 |
| **P1** | 更新 `index.html` 标题和 page label 映射 | 导航后标签仍显示旧名 |
| **P2** | 确认 Working Style 选中态 chip 的 inline style 是否需要在 CSS 中统一 | 目前使用 inline，后续 RN 实现需要对应 prop |
| **P3** | 验证 8 个 section 在 852px 高度的完整滚动体验 | 内容量较多 |
| **P3** | 考虑加载时自动将 BottomTab 的 "Settings" 标签改为 "Pulse" | 保持命名一致 |