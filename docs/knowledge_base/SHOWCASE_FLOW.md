# SHOWCASE_FLOW.md

> 导航与交互参考（V3 事件流版现状，2026-08 更新）

## Page Navigation

All pages are served as iframe `src` in the iPhone mockup. Navigation uses `parent.navigateTo(page)` to switch the iframe's src from within each page.

### Navigation Map

```
+-----------+
| Pulse     |  ← default (Tab 1, pages/dashboard.html)
+-----+-----+
      |
      | tap event row ──────→ 全屏事件弹出框（openSheet，页内模态）
      |   └─ 弹出框内行动按钮 → Talk（带事件上下文）
      | bottom tab Talk     → Talk
      | bottom tab Memory   → Memory
      | bottom tab Me       → Me
      v

+-----------+
| Talk      |  (Tab 2, pages/conversation.html)
+-----------+
      | bottom tab Pulse   → Pulse
      | bottom tab Memory  → Memory
      | bottom tab Me      → Me

+-----------+
| Memory    |  (Tab 3, pages/history.html)
+-----------+
      | bottom tab Pulse   → Pulse
      | bottom tab Talk    → Talk
      | bottom tab Me      → Me

+-----------+
| Me        |  (Tab 4, pages/settings.html)
+-----------+
      | "Let's talk"       → Talk
      | bottom tab Pulse   → Pulse
      | bottom tab Talk    → Talk
      | bottom tab Memory  → Memory

Ambient（sidebar 专属，无底部 tab）:
+-----------+
| Lock Screen (pages/lockscreen.html) → tap → Talk
| Widget     (pages/widget.html)      → tap → Talk
+-----------+
```

### Implementation

- `scripts/navigation.js` exposes `window.navigateTo(page)` in the parent frame.
- Each page calls `parent.navigateTo('pages/...')` from within the iframe.
- Sidebar nav items remain functional and call the same `navigateTo` function.
- The page label and sidebar active state update on every navigation.

---

## Event BottomSheet（Pulse 首页全屏弹出框）

**Page:** `pages/dashboard.html`

- Clicking any **event row** opens a **full-screen bottom sheet** via `openSheet(id)`.
- Sheet content is filled from a JS data object (`events{}`):
  - Type label (ACTION / CALENDAR / SUBSCRIPTION / DRAFT) + status pill
  - Event title + full detail
  - Action buttons (per-event: Review / Pause / See draft / Send…)
  - Prompt Entry pinned to the bottom: input + Voice (mic) + Send
- Closing: top-right **Close (X)** button → `closeSheet()`.
  - The scrim is fully covered by the full-screen sheet and cannot be tapped.
- Sheet visibility toggled via `display: none` classes (defined after `.bottom-sheet` so they override `display: flex`):
  - `.bottom-sheet-scrim--hidden`
  - `.bottom-sheet--hidden`

---

## Button Behavior Reference

| Page | Element | Action | Type |
|---|---|---|---|
| Pulse | Event row (×4) | `openSheet(id)` | Full-screen sheet |
| Pulse | Sheet: Review / See draft (primary) | `parent.navigateTo('pages/conversation.html')` | Navigation |
| Pulse | Sheet: Pause / See day / Change plan / Send | `alert(...)` | Simulated |
| Pulse | Sheet: Voice | `alert('Voice input')` | Simulated |
| Pulse | Sheet: Send | `alert('Sent to Talk')` | Simulated |
| Pulse | Sheet: Close (X) | `closeSheet()` | Sheet close |
| Pulse | Notifications icon | `alert('Notifications')` | Simulated |
| Pulse | Bottom tab Talk/Memory/Me | `parent.navigateTo(...)` | Navigation |
| Talk | Action row (Roll back / Showed migration) | `alert(...)` | Simulated |
| Talk | Read me the brief | `alert('Read me the brief')` | Simulated |
| Talk | Message send | `alert('Message sent')` | Simulated |
| Talk | Hold to speak (voice) | `alert('Hold to speak — voice input')` | Simulated |
| Talk | Bottom tab Pulse/Memory/Me | `parent.navigateTo(...)` | Navigation |
| Memory | "Today" summary | static | — |
| Memory | "Did I remember something wrong?" | `parent.navigateTo('pages/conversation.html')` | Navigation |
| Memory | Bottom tab Pulse/Talk/Me | `parent.navigateTo(...)` | Navigation |
| Me | Ask first / Decide for me (×3 pairs) | `alert('Code changes: Ask first')` etc. | Simulated |
| Me | Take a break | `alert('Paused. Take your time.')` | Simulated |
| Me | Voice wake | `alert('Voice wake is coming soon')` | Simulated |
| Me | Let's talk | `parent.navigateTo('pages/conversation.html')` | Navigation |
| Me | Bottom tab Pulse/Talk/Memory | `parent.navigateTo(...)` | Navigation |
| Lock Screen | Briefing area (tap) | `parent.navigateTo('pages/conversation.html')` | Navigation |
| Widget | Tap | `parent.navigateTo('pages/conversation.html')` | Navigation |

---

## Cross-Frame Architecture

```
parent (index.html)
├── sidebar nav items → navigateTo(page)
├── iframe#preview-frame (src = page HTML)
│   └── onclick="parent.navigateTo(...)"
└── page label updates on navigateTo()
```

`navigation.js` defines `window.navigateTo` on the parent window. Pages call it via `parent.navigateTo()` because they run inside the iframe.

---

## Page Inventory

| Page | File | Content |
|---|---|---|
| Pulse | `pages/dashboard.html` | 事件流 + 全屏事件弹出框（默认页） |
| Talk | `pages/conversation.html` | 全屏对话流 + 常驻输入栏 + 语音占位 |
| Memory | `pages/history.html` | "Today" 今日总结 + 叙事记忆 |
| Me | `pages/settings.html` | 关系陈述 + 对话式调整 + Take a break |
| Lock Screen | `pages/lockscreen.html` | ambient 简报（呼吸点）→ Talk |
| Widget | `pages/widget.html` | ambient 小组件 → Talk |
| Archived | `pages/_archive_v1/` | V1 遗留（jobs / job-detail），不再引用 |
