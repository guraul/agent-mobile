# SHOWCASE_FLOW.md

## Page Navigation

All pages are served as iframe `src` in the iPhone mockup. Navigation uses `parent.navigateTo(page)` to switch the iframe's src from within each page.

### Navigation Map

```
+-----------+
| Dashboard |  ← default (Tab 1: Agents)
+-----+-----+
      |
      | click card ──────────→ Job Detail
      | header [history] icon → History
      | bottom tab Activity  → Jobs (Activity)
      | bottom tab Settings  → Settings
      v
   (same page, goto above)

+-------------+
| Jobs        |  (Tab 2: Activity)
+------+------+
       |
       | bottom tab Agents   → Dashboard
       | bottom tab Settings → Settings
       v
   (same page, goto above)

+-------------+
| Job Detail  |  (pushed screen)
+------+------+
       |
       | header back ← ────── Dashboard
       v
   (same page, goto above)

+----------+
| History  |  (pushed screen)
+----+-----+
     |
     | header back ← ────── Dashboard
     v
   (same page, goto above)

+----------+
| Settings |  (Tab 3)
+----+-----+
     |
     | bottom tab Agents   → Dashboard
     | bottom tab Activity → Jobs
     v
   (same page, goto above)
```

### Implementation

- `scripts/navigation.js` exposes `window.navigateTo(page)` in the parent frame.
- Each page calls `parent.navigateTo('pages/...')` from within the iframe.
- Sidebar nav items remain functional and call the same `navigateTo` function.
- The page label and sidebar active state update on every navigation.

---

## Search Input

**Page:** `pages/jobs.html`

- The search input accepts typed text.
- A clear button (X icon) appears when text is entered, and clears the input on click.
- No filtering logic — purely visual.

---

## Bottom Sheet

**Page:** `pages/job-detail.html`

- Clicking **Send Prompt** opens the bottom sheet.
- The bottom sheet shows:
  - Grabber handle
  - "Send Prompt" title
  - Text input field
  - Cancel / Send buttons
- Clicking the scrim, Cancel, or Send closes the sheet.
- Sheet visibility is toggled via `display: none` classes:
  - `.bottom-sheet-scrim--hidden`
  - `.bottom-sheet--hidden`

---

## Button Behavior Reference

| Page | Element | Action | Type |
|---|---|---|---|
| Dashboard | Agent cards (×5) | `parent.navigateTo('pages/job-detail.html')` | Navigation |
| Dashboard | History icon (header left) | `parent.navigateTo('pages/history.html')` | Navigation |
| Dashboard | + icon (header right) | `alert('Add new agent')` | Simulated |
| Dashboard | Bottom tab Activity | `parent.navigateTo('pages/jobs.html')` | Navigation |
| Dashboard | Bottom tab Settings | `parent.navigateTo('pages/settings.html')` | Navigation |
| Jobs | Search input | Typing + clear button | Simulated |
| Jobs | Bottom tab Agents | `parent.navigateTo('pages/dashboard.html')` | Navigation |
| Jobs | Bottom tab Settings | `parent.navigateTo('pages/settings.html')` | Navigation |
| Job Detail | Back | `parent.navigateTo('pages/dashboard.html')` | Navigation |
| Job Detail | Send Prompt | `toggleSheet()` | Bottom Sheet |
| Job Detail | Pause | `alert('Pause agent')` | Simulated |
| Job Detail | Stop | `alert('Stop agent')` | Simulated |
| Job Detail | More options | `alert('More options')` | Simulated |
| History | Back | `parent.navigateTo('pages/dashboard.html')` | Navigation |
| History | History cards (×6) | `alert('Open history detail')` | Simulated |
| Settings | Bottom tab Agents | `parent.navigateTo('pages/dashboard.html')` | Navigation |
| Settings | Bottom tab Activity | `parent.navigateTo('pages/jobs.html')` | Navigation |
| Settings | Toggles | `alert(...)` | Simulated |
| Settings | List rows | `alert(...)` | Simulated |
| Settings | Sign Out | `alert('Sign out?')` | Simulated |
| Settings | Notifications icon | `alert('Notifications')` | Simulated |

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