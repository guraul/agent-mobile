# SHOWCASE_HOME_PULSE_REVIEW.md

---

## 1. 修改文件

| File | Change |
|---|---|
| `pages/dashboard.html` | 完全重写 —— 卡片堆叠版 → 事件流 + 全屏 BottomSheet 交互 |
| `styles/components.css` | 新增 `.event-section`、`.event-list`、`.event-item`、`.event-item__type/title/summary/status` 样式；`.bottom-sheet` 改为全屏；`html, body` 补 `height: 100%` |
| `pages/history.html` | 顶部新增 "Today" 今日总结模块（原首页 Daily Brief 迁入） |

**未修改：** `theme.css`、`navigation.js`、其余页面。

---

## 2. 页面结构

```
screen
├── ScreenHeader: "Pulse" + 通知铃
├── Greeting: "Good evening."（按时间自动计算）+ presence 行
│   ├── StatusDot (sm, running, breathe 动画) ← 呼吸跳动，同 lockscreen
│   ├── "I'm here." (type-caption-strong)
│   └── "Watching 3 projects and your day." (muted)
│
├── screen__content (scrollable) — 事件流
│   ├── event-section "Needs you"
│   │   └── event-list
│   │       └── event-item (warning) → BottomSheet
│   │           ├── event-item__type: "ACTION"          ← 左上角类型标题
│   │           ├── event-item__title: "Review the auth migration"
│   │           ├── event-item__summary: "Session handling is done — ..."
│   │           └── event-item__status (右下角, 11px): status-pill--warning "Needs you"
│   │
│   └── event-section "Today"
│       └── event-list: 3 × event-item
│           ├── CALENDAR: "3pm with Mei moved to 4" / status: Confirmed
│           ├── SUBSCRIPTION: "Coffee subscription renews Friday" / status: Let through
│           └── DRAFT: "Reply to the recruiter" / status: Draft
│
├── BottomSheet（全屏, position: absolute 覆盖全屏）
│   ├── grabber
│   ├── 行: type + status-pill + Close (X) 按钮
│   ├── title (headline)
│   ├── detail (body)
│   ├── actions: 该事件的操作按钮（primary/ghost，→ Talk 或 alert）
│   ├── divider
│   └── Prompt Entry（margin-top: auto 钉底部）: input + Voice(mic) + Send
│
└── BottomTabBar: Pulse | Talk | Memory | Me（position: fixed 视口底部）
```

---

## 3. 交互逻辑

| 交互 | 实现 |
|---|---|
| 点击事件行 | JS 数据对象 `events{}` 填充 sheet → `openSheet(id)` |
| 关闭 sheet | 右上角 Close 按钮 → `closeSheet()`；scrim 被全屏 sheet 覆盖，不可点 |
| 事件行动按钮 | 有 `goto` → `parent.navigateTo('pages/conversation.html')`；否则 alert 模拟 |
| sheet 内 Prompt Entry | 发送 → alert('Sent to Talk')；Voice → alert('Voice input')（占位） |
| 呼吸点 | `status-dot--breathe` 复用 lockscreen 的 `@keyframes pulse-breathe`（2s 循环） |
| 时间问候 | `new Date().getHours()`：<12 morning / <18 afternoon / else evening |
| 隐藏机制 | `.bottom-sheet--hidden` / `.bottom-sheet-scrim--hidden`（display: none，定义在 `.bottom-sheet` 之后保证覆盖 display: flex） |

---

## 4. 与 DESIGN.md token 对齐情况

| Token Category | Usage | Status |
|---|---|---|
| Colors — Surfaces | `var(--color-canvas)` (screen bg), `var(--color-surface-1)` (event-list), `var(--color-surface-3)` (sheet) | All tokenized |
| Colors — Text | `var(--color-ink)` (title), `var(--color-muted)` (type/summary/status) | All tokenized |
| Colors — Accent | `var(--color-accent)` (send button), `var(--color-on-accent)` | All tokenized |
| Colors — Semantic | `status-dot/pill--warning/success/idle` | All tokenized |
| Typography | `type-headline`, `type-body`, `type-caption-strong`（事件行统一字体）, `type-caption` | All tokenized |
| Spacing | `var(--space-xxs)` through `var(--space-xl)` | All tokenized |
| Radius | `var(--radius-md)` (event-list), `var(--radius-pill)` (pill), `var(--radius-full)` (grabber) | All tokenized |
| Motion | `var(--duration-instant)`, `var(--ease-out)` (active states), `var(--duration-ambient)`/`ease-ambient` (breathe) | Tokenized |

**结论：100% token 对齐，无硬编码设计值。**（事件行状态 pill 的 11px/400 是展示站局部覆盖，非 token —— 有意的层级降级）

---

## 5. 与 React Native Component Mapping

| Showcase HTML | React Native Component |
|---|---|
| `.event-item` | 自定义 `EventItem`（可点击行，column 布局） |
| `.event-item__type` | `<Text variant="caption-strong" color="muted">` |
| `.event-item__title` | `<Text variant="caption-strong" color="ink">` |
| `.event-item__summary` | `<Text variant="caption-strong" color="muted">` + numberOfLines={1} |
| `.event-item__status .status-pill` | `<StatusPill status="..." size="sm">`（11px 变体） |
| `.bottom-sheet`（全屏） | `<BottomSheet fullScreen>`（扩展自 `src/components/navigation/BottomSheet.tsx`） |
| sheet 内 actions | `<Button variant="primary/ghost">` |
| `input-wrapper` + 发送 | `<Input>` + `<IconButton>` |
| Voice 按钮 | `<IconButton icon="mic">` |
| `status-dot--breathe` | `<StatusDot breathing>`（动画 prop） |
| `.event-section__label` | `<Text variant="caption" textTransform="uppercase">` |

---

## 6. 设计决策（本次改动）

| 决策 | 理由 |
|---|---|
| 事件流取代卡片堆叠 | 首页只保留一种信息单位（事件），扫读效率高 |
| 类型标识为行首标题 | 用户首先感知事件类别，再读内容 |
| 状态沉右下角 + 11px | 元信息不抢注意力，状态色仍可辨 |
| 事件行字体统一 13px | 同一层级不混用字体/字号，仅以颜色分层 |
| 全屏 BottomSheet | 事件详情 + 操作 + 指令集中在单一场景，不打断上下文 |
| Prompt Entry 移入 sheet | 指令是针对具体事件的（"Ask about this…"），首页不留常驻输入 |
| Daily Brief 迁入 Memory | 过去时的总结归属"记忆"语境，与实时流分离 |
| 首页 TabBar 固定底部 | `html, body { height: 100% }` 修复高度塌缩，所有页面受益 |

---

## 7. 下一步建议

| Priority | Task | Reason |
|---|---|---|
| **P1** | sheet 内 Voice 按钮接真实录音/转写 | 当前仅 alert 占位 |
| **P1** | sheet 行动按钮带上下文进 Talk | `goto` 目前只切页面，不携带事件上下文 |
| **P2** | 事件行加滑动（swipe）快操作 | 常见移动端模式，减少打开 sheet 的次数 |
| **P2** | 事件流 mock 数据抽成 `mockData.ts` | 与 `src/screens/mockData.ts` 对齐 |
| **P3** | RN 端实现 `EventItem` + `BottomSheet fullScreen` 变体 | 展示站已验证交互，可落 RN |
| **P3** | 今日总结（Memory）与首页事件流的事件去重 | 同一事件不应两处出现 |
