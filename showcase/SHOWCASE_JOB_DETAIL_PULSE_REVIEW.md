# SHOWCASE_JOB_DETAIL_PULSE_REVIEW.md

---

## 1. 页面结构

```
screen
├── ScreenHeader: "Mission" (Back | Mission | More)
│
├── screen__content (scrollable)
│   ├── Card (comfortable) — Mission Identity
│   │   ├── AgentBadge (opencode) + "Refactoring authentication module"
│   │   ├── StatusPill (running): "Working"
│   │   ├── "I'm improving your authentication flow."
│   │   └── Path icon + "~/projects/webapp"
│   │
│   ├── Card — AI Brief (Current Focus)
│   │   ├── "Current Focus"
│   │   ├── "I'm analyzing the token refresh flow."
│   │   ├── row-item ✓ Completed: "14 files analyzed"
│   │   ├── row-item ⟳ Current: "Updating session handling"
│   │   ├── row-item → Next: "Run integration tests"
│   │   └── "2 files remaining in this phase"
│   │
│   ├── Card — Conversation (Latest Exchange)
│   │   ├── AgentBadge + "AI" + "I found a potential issue..."
│   │   ├── Button (primary): "Approve"
│   │   ├── Button (ghost): "Discuss"
│   │   ├── Divider
│   │   └── User icon + "You" + "Continue with the safer approach"
│   │
│   ├── Card — Approval Required
│   │   ├── StatusCallout (warning): "Your decision is needed"
│   │   ├── Button (primary): "Review Changes" → alert
│   │   └── Button (ghost): "Ask AI" → alert
│   │
│   └── Card — Mission Notes
│       ├── "MISSION NOTES"
│       ├── ✓ Analyzed authentication module
│       ├── ✓ Updated token handling
│       └── ✓ Added validation tests
│
├── Bottom Prompt Card (sticky, Card wrapper)
│   ├── Input: "Tell me what to do next..."
│   ├── Send icon button → toggle BottomSheet
│   └── 3 × chip: "Explain this" / "Show changes" / "Continue"
│
└── BottomSheet (hidden, overlay)
    ├── "Talk to Pulse"
    ├── Input: "What would you like me to do?"
    └── Cancel / Send buttons
```

---

## 2. 交互说明

| 元素 | 行为 | 类型 |
|---|---|---|
| Back (header left) | `parent.navigateTo('pages/dashboard.html')` | 导航 |
| More (header right) | `alert('More options')` | 模拟 |
| Approve | `alert('Approved')` | 模拟 |
| Discuss | `alert('Open discussion')` | 模拟 |
| Review Changes | `alert('Review Changes')` | 模拟 |
| Ask AI | `alert('Ask AI')` | 模拟 |
| Send icon (prompt card) | `toggleSheet()` | 打开 BottomSheet |
| Explain this / Show changes / Continue | `alert(...)` | 模拟 |
| BottomSheet Cancel | `toggleSheet()` | 关闭 |
| BottomSheet Send | `alert('Prompt sent')` + `toggleSheet()` | 模拟 + 关闭 |
| BottomSheet scrim click | `toggleSheet()` | 关闭 |

---

## 3. DESIGN.md token 使用情况

| Token Category | Usage | Status |
|---|---|---|
| Colors — Surfaces | `var(--color-canvas)`, `var(--color-surface-1)` (card BGs), `var(--color-surface-2)` (user avatar) | All tokenized |
| Colors — Text | `var(--color-muted)`, `var(--color-ink)` via `.type-*` and `.text-muted` | All tokenized |
| Colors — Accent | `var(--color-accent)` (send btn bg), `var(--color-on-accent)` (send icon) | All tokenized |
| Colors — Semantic | `status-dot--{success/running}`, `status-pill--running`, `status-callout--warning` | All tokenized |
| Colors — Agent Identity | `agent-badge--opencode` | Tokenized |
| Colors — Borders | `var(--color-border)` (dividers, prompt section top) | All tokenized |
| Typography | `.type-title`, `.type-body`, `.type-body-strong`, `.type-caption`, `.type-caption-strong`, `.type-mono-caption` | All tokenized |
| Spacing | `var(--space-xxs)` through `var(--space-md)` | All tokenized |
| Radius | `var(--radius-sm)`, `var(--radius-md)`, `var(--radius-full)` | All tokenized |

**结论：100% token 对齐，无硬编码设计值。**

---

## 4. React Native Component Mapping

| Showcase HTML | React Native Component |
|---|---|
| `screen-header` | `<ScreenHeader title="Mission" />` |
| `card card--comfortable` (Mission Identity) | `<Card variant="comfortable">` |
| `card` (AI Brief, Conversation, Approval, Notes, Prompt) | `<Card>` |
| `agent-badge--opencode` | `<AgentBadge agent="opencode" />` |
| `status-pill--running` | `<StatusPill status="running">` |
| `status-dot--{success/running}` | `<StatusDot status="..." />` |
| `status-callout--warning` | `<StatusCallout status="warning">` |
| `btn btn--primary` | `<Button variant="primary">` |
| `btn btn--ghost` | `<Button variant="ghost">` |
| `btn btn--secondary` | `<Button variant="secondary">` |
| `icon-btn` | `<IconButton onPress={...} />` |
| `input-wrapper` + `input` | `<Input placeholder="..." />` |
| `type-title` | `<Text variant="title">` |
| `type-body` / `type-body-strong` | `<Text variant="body/body-strong">` |
| `type-caption` / `type-caption-strong` | `<Text variant="caption/caption-strong">` |
| `type-mono-caption` | `<Text variant="mono-caption">` |
| `row-item` / `row-item__content` | `<Box flexDirection="row">` + `<Text>` |
| `chip-btn` | `<Button variant="ghost" style="pill">` |
| `bottom-sheet-scrim` / `bottom-sheet` | `<BottomSheet>` |

---

## 5. 是否需要新增组件

| 组件 | 是否需要 | 理由 |
|---|---|---|
| `RowItem` | **否** | 已在上一轮 Pulse 页面新增 `.row-item` / `.row-item__content`，可复用 |
| `ChipButton` | **否** | 已在上一轮 Pulse 页面新增 `.chip-btn`，可复用 |
| `UserAvatar` | **否** | 使用 `div` + `Icon` 替代（person SVG），无需独立组件 |
| `BottomSheet` | **否** | 对话式的 BottomSheet 内容通过 props 定制即可 |

**本轮无需新增 CSS 类。** 所有布局均使用已有组件和上轮新增的 `.row-item` / `.chip-btn`。

---

## 6. 下一步建议

| Priority | Task | Reason |
|---|---|---|
| **P1** | 确认 `.row-item` 的负 margin 在全页滚动时不溢出 | 布局稳健性 |
| **P2** | React Native 端确认 `Chip` 是否需要封装（基于 Button ghost） | 快捷指令在多处复用 |
| **P2** | 验证 `5 sections + 1 prompt card` 在 852px 高度的完整滚动体验 | 内容量是否符合预期 |
| **P3** | 如果内容过长，考虑将 Mission Notes 折叠为 "Show all" | 长屏幕体验 |
| **P3** | 同步更新 `index.html` 的 sidebar 中 "Job Detail" 名称为 "Mission" | 命名一致 |