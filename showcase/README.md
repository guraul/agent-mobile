# Agent Mobile - Design Showcase

HTML preview of the final app UI for designer/PM/developer review.

## Usage

Open `index.html` in a browser.

## Structure

```
showcase/
├── index.html              Showcase shell (sidebar + iPhone preview)
├── styles/
│   ├── theme.css           All DESIGN.md tokens (colors, type, spacing, etc.)
│   ├── components.css      Component styles (Button, Card, Input, etc.)
│   └── layout.css          Showcase frame + iPhone 16 Pro mockup
├── pages/
│   ├── dashboard.html      Agent overview (Tab 1)
│   ├── jobs.html           Activity log feed (Tab 2)
│   ├── job-detail.html     Single agent detail (pushed screen)
│   ├── history.html        Completed job history
│   └── settings.html       Settings (Tab 3)
├── scripts/
│   └── navigation.js       Sidebar page switching
└── assets/
    └── icons/              (SVGs are inline in HTML)
```

## Theme

All design tokens come from DESIGN.md. See `styles/theme.css`.

## Phone

iPhone 16 Pro dimensions: 393 x 852px.
