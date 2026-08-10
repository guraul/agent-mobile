# Agent Mobile - Design Showcase

HTML preview of the final app UI for designer/PM/developer review.

## Usage

Open `index.html` in a browser.

## Structure

```
showcase/
├── index.html              Showcase shell (sidebar + iPhone preview)
├── styles/
│   ├── theme.css           All design tokens (colors, type, spacing, etc.)
│   ├── components.css      Component styles (Button, Card, Input, etc.)
│   └── layout.css          Showcase frame + iPhone 16 Pro mockup
├── pages/
│   ├── dashboard.html      Pulse home: event stream + full-screen sheet
│   ├── conversation.html   Talk (full-screen conversation)
│   ├── history.html        Memory (Today summary + narrative)
│   ├── settings.html       Me (relationship statements)
│   ├── lockscreen.html     Ambient lock screen
│   ├── widget.html         Ambient widget
│   └── _archive_v1/        Archived V1 pages (jobs, job-detail)
├── scripts/
│   └── navigation.js       Sidebar page switching
└── assets/
    └── icons/              (SVGs are inline in HTML)
```

## Theme

All design tokens come from DESIGN.md. See `styles/theme.css`.
Docs moved to `../docs/knowledge_base/`.

## Phone

iPhone 16 Pro dimensions: 393 x 852px.
