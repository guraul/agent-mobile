# Agent Mobile

Mobile remote control for AI coding agents (OpenCode, Claude Code, Codex).

A design-first project: the visual identity, component system, and screens for a mobile app that lets developers monitor and control AI agents from their phone — "Mission Control for AI agents."

## Design Philosophy

> Calm density. Glanceable status, readable detail, confident interaction.

## Repository Layout

```
├── src/                      React/TSX source
│   ├── components/           UI primitives & components
│   ├── screens/              App screens (Agents, Activity, Settings, ...)
│   └── theme/                Design tokens (colors, typography, spacing, ...)
├── showcase/                 Static HTML preview of the final UI
│   └── README.md             Showcase usage & structure
└── docs/
    └── knowledge_base/       Design specs & review docs
        ├── DESIGN.md         Full design system spec (tokens, components, screens)
        ├── DESIGN_DIRECTION.md  Design direction (why & how)
        ├── VISION_REVIEW.md  Product vision review
        ├── AI_INTERACTION_DESIGN.md  Home interaction design (event stream)
        ├── SHOWCASE_*.md     Showcase implementation & review docs
        └── *_REVIEW.md       Component & screen review docs
```

## Showcase

Open `showcase/index.html` in a browser for an HTML preview of the final UI (iPhone 16 Pro mockup, 393x852).

## Documentation

- English: [README.md](README.md)
- 中文: [README_zh.md](README_zh.md)
