# SHOWCASE_MEMORY_REVIEW.md

---

## 1. 页面结构

```
screen
├── ScreenHeader: "Memory" (Back | Memory | --empty--)
├── Subtitle: "Things Pulse remembers"
│
├── screen__content (scrollable)
│   ├── Card (comfortable) — Memory Overview
│   │   ├── StatusDot (lg, running) + "I know your workflow"
│   │   ├── "You usually review security changes before deployment."
│   │   └── StatusPill (warning): "3 memories updated today"
│   │
│   ├── Card — Recent Memories
│   │   ├── "RECENT MEMORIES"
│   │   ├── row-item ✓ running: "Authentication migration" — Today
│   │   ├── divider
│   │   ├── row-item ✓ success: "Code review style" — Yesterday
│   │   ├── divider
│   │   ├── row-item ✓ idle: "Project context" — 3 days ago
│   │   └── Each: title + description (AI's understanding of user) + time
│   │
│   ├── Card — Insights From Memory
│   │   ├── StatusCallout (idle): "I can help better"
│   │   ├── "Based on your previous decisions, I can prepare safer migration plans."
│   │   └── Button (ghost): "Review" → alert
│   │
│   └── Card — Memory Categories
│       ├── "Knowledge"
│       └── 3 × chip-btn: "Projects" / "Preferences" / "Decisions"
│
└── Bottom Prompt Entry (sticky)
    ├── Input: "Ask about your memories..."
    ├── Send icon → alert
    └── 3 × chip: "What do you remember?" / "Show decisions" / "Forget this"
```

---

## 2. 交互说明

| 元素 | 行为 | 类型 |
|---|---|---|
| Back (header left) | `parent.navigateTo('pages/dashboard.html')` | 导航 |
| Memory cards (×3) | `alert('Open memory detail')` | 模拟 |
| Review | `alert('Review insights')` | 模拟 |
| Projects / Preferences / Decisions | `alert(...)` | 模拟 |
| Send icon (prompt) | `alert('Ask about memory')` | 模拟 |
| What do you remember? | `alert('What do you remember?')` | 模拟 |
| Show decisions | `alert('Show decisions')` | 模拟 |
| Forget this | `alert('Forget this')` | 模拟 |

---

## 3. DESIGN.md token 使用情况

| Token Category | Usage | Status |
|---|---|---|
| Colors — Surfaces | `var(--color-canvas)`, `var(--color-surface-1)` (cards) | All tokenized |
| Colors — Text | `var(--color-muted)`, `var(--color-ink)` via `.type-*` / `.text-muted` | All tokenized |
| Colors — Accent | `var(--color-accent)` (send btn bg), `var(--color-on-accent)` (send icon) | All tokenized |
| Colors — Semantic | `status-dot--{running/success/idle/warning}`, `status-pill--warning`, `status-callout--idle` | All tokenized |
| Colors — Borders | `var(--color-border)` (dividers, prompt border-top) | All tokenized |
| Typography | `.type-headline`, `.type-body`, `.type-body-strong`, `.type-caption`, `.type-caption-strong`, `.type-mono-caption` | All tokenized |
| Spacing | `var(--space-xxs)` through `var(--space-md)` | All tokenized |
| Radius | `var(--radius-sm)`, `var(--radius-md)`, `var(--radius-full)` | All tokenized |

**结论：100% token 对齐，无硬编码设计值。**

---

## 4. React Native Component Mapping

| Showcase HTML | React Native Component |
|---|---|
| `screen-header` | `<ScreenHeader title="Memory" />` |
| `card card--comfortable` (Overview) | `<Card variant="comfortable">` |
| `card` (Memories, Insights, Categories) | `<Card>` |
| `status-dot--{running/success/idle/warning}` | `<StatusDot status="..." />` |
| `status-dot--running status-dot--lg` | `<StatusDot status="running" size="lg" />` |
| `status-pill--warning` | `<StatusPill status="warning">` |
| `status-callout--idle` | `<StatusCallout status="idle">` |
| `btn btn--ghost` | `<Button variant="ghost">` |
| `icon-btn` (send) | `<IconButton onPress={...} />` |
| `input-wrapper` + `input` | `<Input placeholder="..." />` |
| `type-headline` / `type-body` / `type-body-strong` / `type-caption` / `type-caption-strong` / `type-mono-caption` | `<Text variant="...">` |
| `row-item` / `row-item__content` | `<Box flexDirection="row">` + `<Text>` |
| `chip-btn` | `<Button variant="ghost" style="pill">` |

---

## 5. 是否需要新增组件

| 组件 | 是否需要 | 理由 |
|---|---|---|
| `RowItem` | **否** | 复用 Pulse 页面新增的 `.row-item` |
| `ChipButton` | **否** | 复用 Pulse 页面新增的 `.chip-btn` |

**本轮无需修改 `components.css`。** 所有布局使用已有组件 + 前两轮新增的通用类。

---

## 6. 下一步建议

| Priority | Task | Reason |
|---|---|---|
| **P1** | 确认 `.chip-btn` 在较长文字（"What do you remember?"）下不发生截断或溢出 | 芯片按钮文本长度差异较大 |
| **P2** | 验证 6 个 section 在 852px 高度的完整滚动体验 | 内容量是否适中 |
| **P2** | 确认各页面 Back 导航路径的一致性（dashboard / pulse） | 页面名已变更，需要确认 `index.html` sidebar 是否同步 |
| **P3** | 考虑在 "Knowledge" 分类增加选中/高亮状态 | 目前仅 alert，无视觉反馈 |
| **P3** | 如果内容过少，考虑 Memory Overview + Recent Memories 合并为一个可视区域 | 保持页面信息密度适中 |