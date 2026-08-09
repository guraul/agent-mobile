# DESIGN.md

## Implementation-Level Design System

> **Purpose:** This document is the single source of truth for UI implementation.
> AI coding agents read this file to build screens and components.
> All values are exact. No ranges. No ambiguity.
>
> **Derived from:** DESIGN_DIRECTION.md
> **Platform:** Mobile (iOS + Android), React Native
> **Theme:** Dark-only (no light mode at launch)

---

## Table of Contents

1. Design Tokens
2. Typography System
3. Spacing System
4. Shape System
5. Motion System
6. Icon System
7. Component Design Rules
8. Mobile Interaction Rules

---

## 1. Design Tokens

### 1.1 Theme Mode

```
theme.mode = "dark"
theme.supportsLight = false
```

No light mode tokens exist. Do not implement light/dark switching logic.

### 1.2 Color Tokens - Surfaces

The surface ladder uses warm-tinted near-blacks. Each step is
~8 RGB units lighter than the previous, maintaining warm hue
consistency across all levels.

| Token | Hex | RGB | Role |
|---|---|---|---|
| `color.canvas` | `#0c0a09` | rgb(12, 10, 9) | Page floor. App background. |
| `color.surface.1` | `#141211` | rgb(20, 18, 17) | Default card background. List rows. |
| `color.surface.2` | `#1c1917` | rgb(28, 25, 23) | Elevated cards. Pressed/hovered cards. |
| `color.surface.3` | `#24211e` | rgb(36, 33, 30) | Bottom sheets. Modals. Sticky bars. |
| `color.inverse` | `#f5f4f2` | rgb(245, 244, 242) | Rare light surface (critical modals). Warm off-white, never `#ffffff`. |

**Rules:**
- Never use `#000000` for any surface. The canvas is `#0c0a09`.
- Never use `#ffffff` for any surface. The inverse surface is `#f5f4f2`.
- Surface steps are sequential. Do not skip levels (canvas -> surface.1 -> surface.2 -> surface.3).
- All surfaces carry warm undertones (R > G > B by 1-3 units).

### 1.3 Color Tokens - Text

All text colors are warm-tinted. No pure white, no pure black.

| Token | Hex | RGB | Role |
|---|---|---|---|
| `color.ink` | `#f5f4f2` | rgb(245, 244, 242) | Primary text. Headlines, titles, emphasized body. |
| `color.body` | `#cbc9c6` | rgb(203, 201, 198) | Secondary text. Default body copy. |
| `color.muted` | `#8a8884` | rgb(138, 136, 132) | Tertiary text. Timestamps, meta info, captions. |
| `color.disabled` | `#5c5a57` | rgb(92, 90, 87) | Disabled text. Placeholder text. Lowest emphasis. |
| `color.on-accent` | `#1a1410` | rgb(26, 20, 16) | Text on amber accent buttons. Warm near-black. |
| `color.on-inverse` | `#1a1410` | rgb(26, 20, 16) | Text on inverse (light) surfaces. |
| `color.on-surface.3` | `#f5f4f2` | rgb(245, 244, 242) | Text on surface.3 (sheets/modals). Same as ink. |

**Rules:**
- `color.ink` is the default text color on all dark surfaces.
- `color.body` is for paragraphs, descriptions, secondary content.
- `color.muted` is for timestamps, file paths in captions, counts.
- `color.disabled` is only for disabled controls and placeholder text.
- Never use `#ffffff` for text. Use `#f5f4f2`.

### 1.4 Color Tokens - Accent (Amber)

Amber is the single brand accent. It is the only chromatic interactive
color in the system.

| Token | Hex | RGB | Role |
|---|---|---|---|
| `color.accent` | `#f5a624` | rgb(245, 166, 36) | Primary accent. CTAs, focus rings, active states, links, brand mark. |
| `color.accent.bright` | `#ffb84d` | rgb(255, 184, 77) | Warning status variant. Brighter amber for "needs approval" state. |
| `color.accent.pressed` | `#d18d1e` | rgb(209, 141, 30) | Pressed state for accent buttons. |
| `color.accent.focus` | `rgba(245, 166, 36, 0.4)` | - | Focus ring outline. 40% opacity. |
| `color.accent.subtle` | `rgba(245, 166, 36, 0.12)` | - | Subtle accent fill. Active tab backgrounds, selected row tints. |
| `color.on-accent` | `#1a1410` | rgb(26, 20, 16) | Text/icon color on amber backgrounds. |

**Where amber is used:**
- Primary CTA button backgrounds
- Focus rings on inputs and buttons
- Active/selected states on tabs and list items
- Inline links in body text
- Brand mark / logo
- Agent "running" status indicator (pulsing)

**Where amber is NEVER used:**
- Card backgrounds (use surface tokens)
- Section/divider backgrounds
- Secondary or tertiary button backgrounds
- Decorative elements
- Border colors (use white-opacity borders, section 1.7)

### 1.5 Color Tokens - Semantic (Agent Status)

Semantic colors exist ONLY for agent status representation.
They appear in status dots, status pills, and full-bleed status
callout cards. They NEVER appear on buttons, borders, or text links.

| Token | Hex | RGB | Status | Use |
|---|---|---|---|---|
| `color.status.running` | `#f5a624` | rgb(245, 166, 36) | Running / active | Agent is working. Uses accent amber. Pulsing indicator. |
| `color.status.idle` | `#8a8884` | rgb(138, 136, 132) | Idle / waiting | Agent is paused, awaiting input. Warm gray. |
| `color.status.success` | `#5db872` | rgb(93, 184, 114) | Success / completed | Task completed. Desaturated green. |
| `color.status.error` | `#c75c4c` | rgb(199, 92, 76) | Error / failed | Task failed. Desaturated red. |
| `color.status.warning` | `#ffb84d` | rgb(255, 184, 77) | Warning / needs approval | Agent requests human decision. Bright amber. |

**Semantic fill variants (for status pill backgrounds):**

| Token | Value | Use |
|---|---|---|
| `color.status.running.fill` | `rgba(245, 166, 36, 0.15)` | Running pill background |
| `color.status.idle.fill` | `rgba(138, 136, 132, 0.15)` | Idle pill background |
| `color.status.success.fill` | `rgba(93, 184, 114, 0.15)` | Success pill background |
| `color.status.error.fill` | `rgba(199, 92, 76, 0.15)` | Error pill background |
| `color.status.warning.fill` | `rgba(255, 184, 77, 0.15)` | Warning pill background |

**Rules:**
- Semantic colors are NEVER used on chrome (buttons, borders, text links, nav).
- Status indicators must never rely on color alone. Always pair with an icon or text label.
- The `running` status reuses the accent amber. This is intentional - the agent is the primary "active" entity in the app.
- The `warning` status uses `accent.bright`. This is the only case where a brighter amber variant appears.

### 1.6 Color Tokens - Agent Identity

Desaturated tints for distinguishing between OpenCode, Claude Code, and
Codex. Used ONLY in two places:
1. Agent avatar/icon background (at 15% opacity)
2. 2px left border on agent panel cards (at full color)

| Token | Hex | RGB | Agent |
|---|---|---|---|
| `color.agent.opencode` | `#7c8aa0` | rgb(124, 138, 160) | OpenCode (muted periwinkle) |
| `color.agent.claude` | `#a08272` | rgb(160, 130, 114) | Claude Code (muted clay) |
| `color.agent.codex` | `#7a9a92` | rgb(122, 154, 146) | Codex (muted sage) |

| Token | Value | Use |
|---|---|---|
| `color.agent.opencode.fill` | `rgba(124, 138, 160, 0.15)` | OpenCode avatar background |
| `color.agent.claude.fill` | `rgba(160, 130, 114, 0.15)` | Claude Code avatar background |
| `color.agent.codex.fill` | `rgba(122, 154, 146, 0.15)` | Codex avatar background |

**Rules:**
- Identity colors never appear on buttons, text, or general UI chrome.
- Identity colors are desaturated by design. They identify, they do not decorate.
- These three colors are the ONLY additional chromatic colors beyond amber and semantic status colors.

### 1.7 Color Tokens - Borders

All borders use white at low opacity. This keeps them tonally cohesive
with every dark surface level. Never use gray hex values for borders.

| Token | Value | Role |
|---|---|---|
| `color.border` | `rgba(255, 255, 255, 0.08)` | Default hairline on cards, list separators. |
| `color.border.strong` | `rgba(255, 255, 255, 0.16)` | Stronger dividers. Focused input border. Selected card border. |
| `color.border.focused` | `rgba(245, 166, 36, 0.4)` | Focus ring border on inputs. Amber at 40%. |

**Rules:**
- Default card border: `1px solid rgba(255, 255, 255, 0.08)`.
- Divider between list rows: `1px solid rgba(255, 255, 255, 0.08)`.
- Focused input border: `1px solid rgba(245, 166, 36, 0.4)` (amber focus).
- Never use hex values like `#333`, `#444`, or `#555` for borders.

### 1.8 Color Tokens - Scrim

| Token | Value | Role |
|---|---|---|
| `color.scrim` | `rgba(0, 0, 0, 0.5)` | Modal/sheet backdrop overlay. |

The scrim darkens the background when a sheet or modal is presented.
It is the only place pure black (`rgba(0,0,0,...)`) appears in the system.

### 1.9 Color Token Summary (Quick Reference)

```
/* Surfaces */
--color-canvas: #0c0a09;
--color-surface-1: #141211;
--color-surface-2: #1c1917;
--color-surface-3: #24211e;
--color-inverse: #f5f4f2;

/* Text */
--color-ink: #f5f4f2;
--color-body: #cbc9c6;
--color-muted: #8a8884;
--color-disabled: #5c5a57;
--color-on-accent: #1a1410;

/* Accent */
--color-accent: #f5a624;
--color-accent-bright: #ffb84d;
--color-accent-pressed: #d18d1e;
--color-accent-focus: rgba(245, 166, 36, 0.4);
--color-accent-subtle: rgba(245, 166, 36, 0.12);

/* Semantic */
--color-status-running: #f5a624;
--color-status-idle: #8a8884;
--color-status-success: #5db872;
--color-status-error: #c75c4c;
--color-status-warning: #ffb84d;

/* Borders */
--color-border: rgba(255, 255, 255, 0.08);
--color-border-strong: rgba(255, 255, 255, 0.16);
--color-border-focused: rgba(245, 166, 36, 0.4);

/* Scrim */
--color-scrim: rgba(0, 0, 0, 0.5);
```

---

## 2. Typography System

### 2.1 Font Families

| Token | Primary | Fallback Stack | Feature Settings |
|---|---|---|---|
| `font.sans` | `Inter` | `SF Pro Text, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` | `"ss03" 1` |
| `font.mono` | `JetBrains Mono` | `SF Mono, ui-monospace, Menlo, monospace` | default |

**Signature detail:** Inter's `ss03` stylistic set is enabled globally.
This enables the single-story `g` glyph - our non-obvious brand marker.

**Platform behavior:**
- iOS: If Inter is not bundled, falls back to SF Pro Text (system font). SF Pro is an excellent match.
- Android: If Inter is not bundled, falls back to Roboto. Acceptable but Inter should be bundled.

**Rules:**
- `font.sans` is used for ALL UI chrome: headlines, body, buttons, labels, navigation, captions.
- `font.mono` is used ONLY for: agent output (logs, code, diffs), file paths, terminal text, inline code.
- Never use `font.mono` for button labels, navigation, or general UI text.
- Never use `font.sans` for agent output or code content.
- Bundle Inter (variable weight) and JetBrains Mono in the app binary for cross-platform consistency.

### 2.2 Type Scale

| Token | Font | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|---|
| `type.display` | sans | 28px | 600 | 1.15 | -0.5px | Screen titles. Large status headings. |
| `type.headline` | sans | 22px | 600 | 1.20 | -0.3px | Section headers. Agent names. |
| `type.title` | sans | 17px | 600 | 1.30 | -0.2px | Card titles. Modal headers. List item titles. |
| `type.body` | sans | 16px | 400 | 1.50 | 0 | Default text. Messages. Descriptions. |
| `type.body.strong` | sans | 16px | 500 | 1.50 | 0 | Emphasized text. Labels. Property names. |
| `type.caption` | sans | 13px | 400 | 1.40 | +0.1px | Timestamps. Meta info. Secondary labels. |
| `type.caption.strong` | sans | 13px | 500 | 1.40 | +0.1px | Status labels. Badge text. Toggle labels. |
| `type.button` | sans | 15px | 500 | 1.20 | 0 | Button labels. |
| `type.mono.body` | mono | 14px | 400 | 1.60 | 0 | Logs. Code blocks. Agent output. |
| `type.mono.caption` | mono | 12px | 400 | 1.50 | 0 | Inline code. File paths. Short code snippets. |

### 2.3 Typography Rules

1. **Weight ladder:** 400, 500, 600 only. Never use 300 (too light for dark UI) or 700+ (too heavy, reads as shouting).
2. **Negative tracking:** Applied to display, headline, and title sizes only (17px+). Never below 13px.
3. **Positive tracking:** Applied to caption sizes only (+0.1px). Opens up small text for legibility.
4. **Line height:** Tight at display (1.15-1.20), relaxed at body (1.50), generous at mono (1.60).
5. **Body size:** 16px, not 17px. We need operational density, not marketing reading pace.
6. **Emphasis:** When in doubt, increase size before increasing weight. A 22px/600 headline is preferred over a 17px/700 headline.
7. **Mono content:** Agent output, logs, code diffs, file paths, terminal text. Always `font.mono`. Never use sans for code content.
8. **Text color hierarchy:** Default to `color.body` for paragraphs. Use `color.ink` only for headlines, titles, and the primary text the user needs to read. Use `color.muted` for everything secondary.

---

## 3. Spacing System

### 3.1 Spacing Scale

Base unit: 4px. Structural unit: 8px.

| Token | Value | Use |
|---|---|---|
| `space.xxs` | 4px | Tight inline gaps. Icon-to-text spacing. Badge internal padding. |
| `space.xs` | 8px | Small component gaps. Status dot to label. |
| `space.sm` | 12px | List row vertical padding. Tight card internal gaps. |
| `space.md` | 16px | Default screen edge margin. Card internal padding. Standard gaps. |
| `space.lg` | 20px | Card internal padding (comfortable). Button horizontal padding. |
| `space.xl` | 24px | Section gaps within a screen. Large card padding. |
| `space.xxl` | 32px | Section gaps between major screen sections. Modal/sheet padding. |
| `space.section` | 32px | Top-level section separation. Same as xxl on mobile. |

### 3.2 Screen Padding Rules

| Context | Value |
|---|---|
| Screen horizontal margin (left + right) | `space.md` (16px) |
| Screen top padding (below status bar) | `space.md` (16px) |
| Screen bottom padding (above tab bar) | `space.xl` (24px) |
| Section gap (between major content sections) | `space.xl` (24px) to `space.xxl` (32px) |
| Safe area insets | Respect OS safe area (notch, home indicator). Add to screen padding. |

### 3.3 Component Padding Rules

| Component | Padding | Notes |
|---|---|---|
| Primary button (pill) | 12px vertical x 20px horizontal | Min height 44px. |
| Secondary button | 10px vertical x 16px horizontal | Min height 44px. |
| Ghost/text button | 8px vertical x 12px horizontal | Min height 44px (includes tap padding). |
| Icon button | 10px (all sides, on 44px container) | 44x44px container, 24px icon centered. |
| Text input | 12px vertical x 16px horizontal | Min height 44px. |
| Search input | 12px vertical x 16px horizontal | Min height 44px. Includes leading search icon. |
| Card (default) | 16px (all sides) | Content cards, agent panels. |
| Card (comfortable) | 20px (all sides) | Modals, detail panels. |
| List row | 12px vertical x 16px horizontal | Min row height 48px. |
| Bottom sheet | 24px horizontal x 20px vertical | Sheet content padding. |
| Modal | 24px (all sides) | Modal content padding. |
| Status pill | 4px vertical x 12px horizontal | With dot icon + text label. |
| Badge | 2px vertical x 8px horizontal | Small count/label badges. |

### 3.4 Gap Rules

| Context | Gap |
|---|---|
| Between elements in a row (horizontal) | `space.xs` (8px) or `space.sm` (12px) |
| Between stacked elements in a card | `space.sm` (12px) or `space.md` (16px) |
| Between cards in a list | `space.xs` (8px) |
| Between sections on a screen | `space.xl` (24px) |
| Between title and body in a card | `space.xs` (8px) |
| Between icon and label (inline) | `space.xxs` (4px) or `space.xs` (8px) |

---

## 4. Shape System

### 4.1 Border Radius Tokens

| Token | Value | Use |
|---|---|---|
| `radius.xs` | 6px | Small chips, badges, inline tags. |
| `radius.sm` | 8px | Buttons (secondary/ghost), inputs, small cards. |
| `radius.md` | 12px | Content cards, agent panels, list sections. |
| `radius.lg` | 16px | Bottom sheets, modals, large feature cards. |
| `radius.pill` | 9999px | Primary CTA buttons, status pills, avatars. |
| `radius.full` | 9999px | Status dots, circular icons, icon buttons. |

### 4.2 Radius Grammar Rules

Radius signals component category. Never mix grammars.

| Grammar | Radius | What it signals |
|---|---|---|
| Action | `radius.pill` (9999px) | Primary CTAs, status pills, configurator chips. "Tap me." |
| Content | `radius.md` (12px) | Cards, agent panels, content containers. "Read me." |
| Control | `radius.sm` (8px) | Secondary buttons, inputs, small cards. "Interact with me." |
| Metadata | `radius.xs` (6px) | Chips, badges, inline tags. "I am a label." |
| Sheet | `radius.lg` (16px) | Bottom sheets, modals. "I am an overlay." |

**Rules:**
- Primary CTA buttons are ALWAYS pill-shaped. This is the brand action signal.
- Secondary and ghost buttons use `radius.sm` (8px). They are controls, not actions.
- Cards use `radius.md` (12px). Always.
- Inputs use `radius.sm` (8px). Matches secondary buttons.
- Bottom sheets use `radius.lg` (16px) on their top corners only. Bottom corners are square (0px).
- Modals use `radius.lg` (16px) on all corners.
- Status dots are full circles (`radius.full`).
- Avatars are full circles (`radius.full`).
- Never apply `radius.pill` to cards or containers. Pills are reserved for actions and status.

### 4.3 Border Rules

| Context | Border |
|---|---|
| Default card | `1px solid rgba(255, 255, 255, 0.08)` |
| Selected/active card | `1px solid rgba(255, 255, 255, 0.16)` |
| Focused input | `1px solid rgba(245, 166, 36, 0.4)` (amber focus ring) |
| List row separator | `1px solid rgba(255, 255, 255, 0.08)` (bottom only) |
| Bottom sheet top edge | No border. Surface color change is the separator. |
| Agent panel left accent | `2px solid {agent.identity.color}` (left side only) |

**Rules:**
- Borders are always 1px. The only exception is the 2px agent identity border on panel left edges.
- Never use hex values for borders. Always use `rgba(255, 255, 255, opacity)`.
- Never use colored borders (amber, red, green) except the focused input amber ring.
- List separators appear on the bottom of each row, not the top.

### 4.4 Shadow Rules

Shadows are almost entirely absent. Depth comes from the surface ladder and hairline borders.

| Token | Value | Use |
|---|---|---|
| `shadow.fab` | `0 4px 16px rgba(0, 0, 0, 0.35)` | Floating action button only. |
| `shadow.sheet` | `0 -4px 32px rgba(0, 0, 0, 0.4)` | Bottom sheet top edge (subtle, only if surface lift is insufficient). |
| `shadow.modal` | `0 8px 32px rgba(0, 0, 0, 0.4)` | Centered modals only. |

**Rules:**
- Cards NEVER have shadows. Depth comes from surface color lift + hairline border.
- Buttons NEVER have shadows.
- Text NEVER has shadows.
- Only floating elements (FAB, sheets, modals) may use shadows, and only the values defined above.
- Shadows use `rgba(0, 0, 0, ...)` - pure black at low opacity for depth over dark surfaces.

### 4.5 Backdrop Blur Rules

Floating surfaces that overlay content use backdrop blur for depth
instead of (or in addition to) shadow.

| Context | Background | Blur |
|---|---|---|
| Bottom sheet | `color.surface.3` at 90% opacity | `blur(24px) saturate(150%)` |
| Sticky bottom bar | `color.canvas` at 80% opacity | `blur(20px) saturate(150%)` |
| Modal backdrop (scrim) | `rgba(0, 0, 0, 0.5)` | No blur (scrim only darkens) |

**Rules:**
- Backdrop blur creates a "frosted glass" effect over content beneath.
- The blur radius is 20-24px. Never less than 16px (too subtle) or more than 32px (too blurry).
- Always pair with `saturate(150%)` to prevent the frosted surface from looking washed out.
- If the platform does not support backdrop blur, fall back to solid `color.surface.3` (no transparency).

---

## 5. Motion System

### 5.1 Duration Tokens

| Token | Duration | Use |
|---|---|---|
| `duration.instant` | 100ms | Press feedback. Toggle switches. Checkbox state. |
| `duration.quick` | 150ms | Button state changes. Tab switches. List item reorder. |
| `duration.standard` | 200ms | Card expansions. Sheet partial slides. Status changes. |
| `duration.deliberate` | 300ms | Screen transitions. Full sheet presentations. Modal appearances. |
| `duration.ambient` | 2000ms | Pulsing status indicators. Looping animations. |

### 5.2 Easing Curves

| Token | Curve | Use |
|---|---|---|
| `ease.out` | `cubic-bezier(0.2, 0, 0, 1)` | Elements entering, expanding, appearing. |
| `ease.in` | `cubic-bezier(0.4, 0, 1, 1)` | Elements exiting, collapsing, disappearing. |
| `ease.in.out` | `cubic-bezier(0.4, 0, 0.2, 1)` | State transitions within a component (color changes, size shifts). |
| `ease.ambient` | `ease-in-out` | Looping/ambient animations (pulses, glows). |

### 5.3 Interaction Motion Rules

| Interaction | Property | Duration | Easing | Notes |
|---|---|---|---|---|
| Button press | `transform: scale(0.96)` + bg color shift | 100ms | `ease.out` | Scale applies on press-down. Reverts on release. |
| Card tap | Surface lift (surface.1 -> surface.2) | 150ms | `ease.out` | Background color animates. |
| Tab switch | Active indicator slides | 150ms | `ease.in.out` | Indicator (amber underline/dot) slides between tabs. |
| Input focus | Border color shift to amber focus | 150ms | `ease.in.out` | `rgba(255,255,255,0.08)` -> `rgba(245,166,36,0.4)`. |
| Input blur | Border color revert | 150ms | `ease.in.out` | Reverts to default border. |
| Toggle switch | Knob slides | 150ms | `ease.out` | Track color crossfades. |
| List item reorder | Items shift to fill gap | 200ms | `ease.in.out` | Other items animate to new positions. |
| New log entry | Slide-in from bottom + fade | 150ms | `ease.out` | New line starts at `opacity: 0, translateY: 8px`, settles to `opacity: 1, translateY: 0`. |
| Sheet present | Slide up from bottom | 300ms | `ease.out` | Sheet covers full width, starts at `translateY: 100%`. |
| Sheet dismiss | Slide down to bottom | 200ms | `ease.in` | Faster than present. Exits feel snappy. |
| Modal present | Fade in + scale up | 300ms | `ease.out` | Starts at `opacity: 0, scale: 0.95`, settles to `opacity: 1, scale: 1`. |
| Modal dismiss | Fade out + scale down | 200ms | `ease.in` | Exits to `opacity: 0, scale: 0.95`. |
| Scrim appear | Fade in | 200ms | `ease.in.out` | `opacity: 0 -> 1`. |
| Scrim dismiss | Fade out | 150ms | `ease.in.out` | `opacity: 1 -> 0`. Faster than appear. |
| Screen push (nav) | Slide in from right | 300ms | `ease.out` | New screen enters from right edge. |
| Screen pop (nav) | Slide out to right | 250ms | `ease.in` | Current screen exits to right. |

### 5.4 Ambient Motion Rules

| Animation | Property | Duration | Easing | Loop |
|---|---|---|---|---|
| Agent running pulse | `opacity: 0.4 -> 1.0 -> 0.4` | 2000ms | `ease.ambient` | Infinite, while agent status = running |
| Streaming log fade-in | `opacity: 0.3 -> 1.0` on new lines | 150ms | `ease.out` | Once per line |

**Rules for ambient motion:**
- The agent running pulse is the ONLY continuous loop animation in the app.
- The pulse only plays when an agent status is `running`. It stops immediately when status changes.
- Streaming log fade-in plays once per new line, then stops. It does not loop.
- Ambient motion must respect the Reduce Motion accessibility setting (section 8.4).

### 5.5 Motion Prohibitions

1. **Never animate decorative elements continuously.** No spinning logos, no shimmering backgrounds, no gradient shifts, no skeleton loaders that shimmer.
2. **Never block a tap while animating.** All motion is interruptible. If a user taps during a 300ms transition, the transition completes instantly and the new action begins.
3. **Never use motion slower than 300ms for interactive feedback.** 300ms is the ceiling for user-initiated transitions. Only ambient (non-interactive) loops may exceed this.
4. **Never use bounce/spring physics.** All curves are bezier-based. No spring dampening, no overshoot, no bounce. The product is a control room, not a toy.
5. **Never animate opacity below 0.3.** Elements fading out should go from 1.0 to 0.0, but elements settling in should never rest below 0.3 opacity (except the running pulse which goes to 0.4).
6. **Never animate text content.** Text appears at full opacity. No typewriter effects, no letter-by-letter reveals, no character animations.

---

## 6. Icon System

### 6.1 Icon Library

**Primary library:** [Lucide](https://lucide.dev) (open-source, ISC license)

Lucide is a clean, 2px-stroke icon set that is:
- Cross-platform (React Native compatible via `lucide-react-native`)
- Consistent in style (all icons share the same stroke weight and grid)
- Developer-recognizable (used by many developer tools)
- Extensible (1500+ icons, we use a curated subset)

**Fallback:** SF Symbols (iOS) / Material Symbols (Android) - only for
platform-native icons (back, share, compose) that should match the OS.

### 6.2 Icon Sizes

| Token | Size | Stroke Width | Use |
|---|---|---|---|
| `icon.xs` | 14px | 2px | Inline icons in text. Badges. Small indicators. |
| `icon.sm` | 16px | 2px | Inline icons in list rows. Compact buttons. Captions. |
| `icon.md` | 20px | 2px | Standard UI icons. Buttons. Tab bar. Inputs (leading icon). |
| `icon.lg` | 24px | 2px | Large buttons. Empty states. Modal headers. |

**Rules:**
- Stroke width is always 2px. Never 1px (too thin on dark) or 3px (too heavy).
- Icons are always monochrome. They inherit the text color of their context.
- Icon color follows text color rules: primary icon = `color.ink`, secondary = `color.body`, muted = `color.muted`, disabled = `color.disabled`.
- On amber accent buttons, icons use `color.on-accent` (`#1a1410`).
- Never apply multiple colors to a single icon.
- Never scale icons non-proportionally.

### 6.3 Required Icons (Curated Subset)

These are the icons needed for the app. Use the exact Lucide icon name.

**Navigation:**
- `Home` - agents overview tab
- `Terminal` - activity/logs tab
- `Settings` - settings tab
- `ChevronRight` - list disclosure indicator
- `ChevronLeft` - back button (if not using OS back gesture)
- `ChevronDown` - expandable sections, sheet grabber

**Agent Status:**
- `Circle` - idle status (filled with `color.status.idle`)
- `Loader` - running status (filled with `color.status.running`, used as static icon if pulse is separate)
- `CheckCircle2` - success status
- `XCircle` - error status
- `AlertTriangle` - warning / needs approval
- `CircleDot` - active/selected indicator

**Actions:**
- `Send` - send message/prompt
- `Play` - resume/start agent
- `Pause` - pause agent
- `Square` - stop agent
- `Plus` - add new agent
- `Check` - approve action
- `X` - dismiss/reject
- `RotateCcw` - retry

**Content:**
- `MessageSquare` - message/conversation
- `FileText` - file/log
- `Code2` - code block/diff
- `GitBranch` - branch/PR reference
- `Terminal` - terminal output

**System:**
- `Search` - search input
- `Bell` - notifications
- `MoreHorizontal` - overflow menu
- `X` - close/dismiss
- `Settings` - settings
- `Info` - info/help

### 6.4 Icon Usage Rules

1. **Icons in buttons:** Place icon to the LEFT of the label. Size: `icon.md` (20px). Gap between icon and label: `space.xs` (8px).
2. **Icons in list rows:** Place icon to the LEFT. Size: `icon.sm` (16px) or `icon.md` (20px). Gap to text: `space.sm` (12px).
3. **Icons in inputs:** Place search/leading icon to the LEFT. Size: `icon.md` (20px). Gap to text: `space.xs` (8px).
4. **Status dot icons:** Use filled circle, 8px diameter. Do not use Lucide icon for status dots - use a CSS/view-drawn circle for precise control.
5. **Tab bar icons:** Size: `icon.md` (20px). Active tab icon = `color.accent` (amber). Inactive tab icon = `color.muted`.
6. **Never use icons as decoration.** Every icon must have a functional purpose.
7. **Never mix icon styles.** All icons are from Lucide. Do not mix in Material Icons, Feather, or other sets (except platform-native fallbacks for OS-level actions like back/share).

---

## 7. Component Design Rules

This section defines the visual rules for each component category.
It does not define every possible component - it defines the design
constraints that any future component must follow.

### 7.1 Cards

Cards are the primary content container. They display agent state,
activity summaries, settings groups, and detail panels.

**Default card:**
| Property | Value |
|---|---|
| Background | `color.surface.1` (`#141211`) |
| Border | `1px solid rgba(255, 255, 255, 0.08)` |
| Radius | `radius.md` (12px) |
| Padding | `space.md` (16px) |
| Shadow | None |

**Card states:**
| State | Background | Border |
|---|---|---|
| Default | `color.surface.1` | `1px solid rgba(255, 255, 255, 0.08)` |
| Pressed | `color.surface.2` | `1px solid rgba(255, 255, 255, 0.08)` |
| Selected | `color.surface.2` | `1px solid rgba(255, 255, 255, 0.16)` |

**Card rules:**
1. Cards always use `color.surface.1` as the default background, sitting on the `color.canvas` page floor.
2. Pressed state lifts the card one surface level (surface.1 -> surface.2). No shadow.
3. Selected state lifts AND strengthens the border.
4. Card padding is 16px default, 20px for comfortable/detail cards.
5. Cards never have shadows. Depth comes from surface lift + border.
6. Agent panel cards have an additional 2px left border in the agent's identity color. This is the ONLY non-white-opacity border allowed.
7. Multiple cards in a list are separated by `space.xs` (8px) vertical gap.
8. Card titles use `type.title` (17px/600). Card body uses `type.body` (16px/400). Card meta uses `type.caption` (13px/400).

### 7.2 Buttons

**Primary button (CTA):**
| Property | Value |
|---|---|
| Background | `color.accent` (`#f5a624`) |
| Text color | `color.on-accent` (`#1a1410`) |
| Radius | `radius.pill` (9999px) |
| Padding | 12px vertical x 20px horizontal |
| Min height | 44px |
| Typography | `type.button` (15px / 500) |
| Border | None |
| Shadow | None |
| Pressed transform | `scale(0.96)` |
| Pressed background | `color.accent.pressed` (`#d18d1e`) |
| Disabled background | `rgba(245, 166, 36, 0.3)` |
| Disabled text | `rgba(26, 20, 16, 0.4)` |

**Secondary button:**
| Property | Value |
|---|---|
| Background | `color.surface.2` (`#1c1917`) |
| Text color | `color.ink` (`#f5f4f2`) |
| Radius | `radius.sm` (8px) |
| Padding | 10px vertical x 16px horizontal |
| Min height | 44px |
| Typography | `type.button` (15px / 500) |
| Border | `1px solid rgba(255, 255, 255, 0.08)` |
| Pressed transform | `scale(0.96)` |
| Pressed background | `color.surface.3` (`#24211e`) |
| Disabled background | `color.surface.1` (`#141211`) |
| Disabled text | `color.disabled` (`#5c5a57`) |

**Ghost button (tertiary):**
| Property | Value |
|---|---|
| Background | Transparent |
| Text color | `color.accent` (`#f5a624`) |
| Radius | `radius.sm` (8px) |
| Padding | 8px vertical x 12px horizontal |
| Min height | 44px (achieved via transparent tap padding) |
| Typography | `type.button` (15px / 500) |
| Border | None |
| Pressed transform | `scale(0.96)` |
| Pressed text color | `color.accent.pressed` (`#d18d1e`) |
| Disabled text | `color.disabled` (`#5c5a57`) |

**Icon button:**
| Property | Value |
|---|---|
| Background | Transparent |
| Icon color | `color.body` (`#cbc9c6`) |
| Size | 44 x 44px (container) |
| Icon size | `icon.md` (20px) |
| Radius | `radius.full` (9999px) - circular tap area |
| Border | None |
| Pressed transform | `scale(0.96)` |
| Pressed background | `rgba(255, 255, 255, 0.08)` |
| Disabled icon color | `color.disabled` (`#5c5a57`) |

**Destructive button:**
| Property | Value |
|---|---|
| Background | `rgba(199, 92, 76, 0.15)` (error fill) |
| Text color | `color.status.error` (`#c75c4c`) |
| Radius | `radius.sm` (8px) |
| Padding | 10px vertical x 16px horizontal |
| Min height | 44px |
| Typography | `type.button` (15px / 500) |
| Border | `1px solid rgba(199, 92, 76, 0.3)` |
| Pressed transform | `scale(0.96)` |
| Pressed background | `rgba(199, 92, 76, 0.25)` |
| Disabled | Same as secondary disabled |

**Button rules:**
1. One primary (pill) button per screen or per bottom sheet. Secondary actions use secondary or ghost buttons.
2. Primary buttons are the ONLY buttons with `radius.pill`. All other buttons use `radius.sm` (8px).
3. All button presses use `scale(0.96)` transform. This is the universal micro-interaction.
4. Press animation duration: 100ms, easing: `ease.out`.
5. Button labels use `type.button` (15px / 500). Never use mono font for button labels.
6. Icon in button: place LEFT of label, `icon.md` (20px), gap `space.xs` (8px).
7. Icon-only button: no label. Use `icon.md` (20px) centered in 44x44 container.
8. Loading state: replace label with a spinner (amber on primary, `color.body` on others). Button maintains its size. Disable taps.
9. Full-width buttons stretch to screen width minus 2x screen margin (32px total). Padding remains the same; the button simply widens.
10. Destructive buttons use the error semantic color at low fill opacity. They are the ONLY buttons that use semantic colors. This is because destructive actions need to signal danger clearly.

### 7.3 Inputs

**Text input:**
| Property | Value |
|---|---|
| Background | `color.surface.1` (`#141211`) |
| Text color | `color.ink` (`#f5f4f2`) |
| Placeholder color | `color.disabled` (`#5c5a57`) |
| Radius | `radius.sm` (8px) |
| Padding | 12px vertical x 16px horizontal |
| Min height | 44px |
| Typography | `type.body` (16px / 400) |
| Border (default) | `1px solid rgba(255, 255, 255, 0.08)` |
| Border (focused) | `1px solid rgba(245, 166, 36, 0.4)` (amber focus) |
| Border (error) | `1px solid rgba(199, 92, 76, 0.5)` (error at 50%) |
| Disabled | Background: `color.surface.1`. Text: `color.disabled`. Border: `1px solid rgba(255, 255, 255, 0.04)`. |

**Search input:**
| Property | Value |
|---|---|
| Background | `color.surface.1` (`#141211`) |
| Text color | `color.ink` (`#f5f4f2`) |
| Placeholder color | `color.disabled` (`#5c5a57`) |
| Radius | `radius.sm` (8px) |
| Padding | 12px vertical x 16px horizontal |
| Min height | 44px |
| Leading icon | `Search` icon, `icon.md` (20px), color `color.muted` |
| Icon-to-text gap | `space.xs` (8px) |
| Clear button | `X` icon button, `icon.sm` (16px), color `color.muted`, appears when text present |

**Multi-line text area (for prompts):**
| Property | Value |
|---|---|
| Background | `color.surface.1` (`#141211`) |
| Text color | `color.ink` (`#f5f4f2`) |
| Placeholder color | `color.disabled` (`#5c5a57`) |
| Radius | `radius.sm` (8px) |
| Padding | 12px vertical x 16px horizontal |
| Min height | 44px (grows with content) |
| Max height | 120px (then scrolls internally) |
| Typography | `type.body` (16px / 400) |
| Border (default) | `1px solid rgba(255, 255, 255, 0.08)` |
| Border (focused) | `1px solid rgba(245, 166, 36, 0.4)` |

**Input rules:**
1. Inputs use `color.surface.1` background - same as cards. They sit on the canvas.
2. Focused input border shifts to amber focus ring. Duration: 150ms, easing: `ease.in.out`.
3. Error state border uses the error semantic color at 50% opacity. This is the only place semantic color appears on a border.
4. Inputs always have a 1px border. Never borderless inputs.
5. Placeholder text uses `color.disabled` - the lowest emphasis text color.
6. Input text uses `type.body` (16px). Never smaller - users are typing, legibility is critical.
7. Inputs with leading icons: icon is inside the padding area. Text starts after icon + gap.
8. Disabled inputs reduce border opacity to 4% and text to `color.disabled`.

### 7.4 Status Indicators

Status indicators are the most important component category.
They are how users know if an agent needs attention at a glance.

**Status dot:**
| Property | Value |
|---|---|
| Shape | Circle |
| Size | 8px diameter |
| Color | Semantic status color (see section 1.5) |
| Border | None |

**Status dot states:**
| Status | Dot Color | Animation |
|---|---|---|
| Running | `color.status.running` (`#f5a624`) | Pulse: `opacity 0.4 -> 1.0 -> 0.4`, 2000ms loop, `ease.ambient` |
| Idle | `color.status.idle` (`#8a8884`) | None (static) |
| Success | `color.status.success` (`#5db872`) | None (static) |
| Error | `color.status.error` (`#c75c4c`) | None (static) |
| Warning | `color.status.warning` (`#ffb84d`) | None (static) |

**Status pill:**
| Property | Value |
|---|---|
| Background | Semantic fill color (see section 1.5, 15% opacity) |
| Text color | Semantic solid color (matching) |
| Radius | `radius.pill` (9999px) |
| Padding | 4px vertical x 12px horizontal |
| Typography | `type.caption.strong` (13px / 500) |
| Contents | Status dot (6px) + gap (4px) + text label |

**Status pill variants:**
| Status | Background | Text Color | Dot Color |
|---|---|---|---|
| Running | `rgba(245, 166, 36, 0.15)` | `#f5a624` | `#f5a624` (pulsing) |
| Idle | `rgba(138, 136, 132, 0.15)` | `#8a8884` | `#8a8884` |
| Success | `rgba(93, 184, 114, 0.15)` | `#5db872` | `#5db872` |
| Error | `rgba(199, 92, 76, 0.15)` | `#c75c4c` | `#c75c4c` |
| Warning | `rgba(255, 184, 77, 0.15)` | `#ffb84d` | `#ffb84d` |

**Status callout card (full-bleed):**
| Property | Value |
|---|---|
| Background | Semantic fill color (15% opacity) |
| Border | `1px solid {semantic color at 30% opacity}` |
| Radius | `radius.md` (12px) |
| Padding | 16px |
| Contents | Status icon (24px) + text (title + body) |
| Typography (title) | `type.title` (17px / 600) |
| Typography (body) | `type.body` (16px / 400) |

**Status indicator rules:**
1. Status indicators NEVER rely on color alone. Always pair the dot/pill with a text label.
2. The running pulse is the ONLY ambient animation on status indicators. All other states are static.
3. Status dots in pills are 6px (smaller than standalone 8px dots) to fit within the pill padding.
4. Status callout cards use semantic fill at 15% opacity as background. This is the one case where semantic colors appear on a card background.
5. Status callout card borders use the semantic color at 30% opacity. This is the one case where a non-white, non-amber colored border appears.
6. Status indicators never appear on buttons, tab bars, or navigation chrome. They live in agent panels, list rows, and detail screens.

### 7.5 Bottom Sheets

Bottom sheets are the primary overlay mechanism for actions, filters,
and detail views. They present from the bottom of the screen.

**Bottom sheet:**
| Property | Value |
|---|---|
| Background | `color.surface.3` (`#24211e`) at 90% opacity + `blur(24px) saturate(150%)` |
| Top corner radius | `radius.lg` (16px) |
| Bottom corner radius | 0px (flush with screen bottom) |
| Shadow | `shadow.sheet` (`0 -4px 32px rgba(0, 0, 0, 0.4)`) - only if blur is unsupported |
| Padding | 24px horizontal x 20px vertical |
| Scrim | `rgba(0, 0, 0, 0.5)` on content beneath |
| Grabber | 36px wide x 4px tall, `rgba(255, 255, 255, 0.2)`, centered, 8px from top |

**Sheet presentation:**
- Enter: slide up from bottom, 300ms, `ease.out`.
- Exit: slide down to bottom, 200ms, `ease.in`.
- Scrim enter: fade in, 200ms, `ease.in.out`.
- Scrim exit: fade out, 150ms, `ease.in.out`.
- Dismiss: tap scrim or swipe down. Both must work.

**Sheet content rules:**
1. Sheet title uses `type.headline` (22px / 600), centered or left-aligned.
2. Sheet body uses `type.body` (16px / 400).
3. Primary action button is full-width, pinned to the bottom of the sheet (above safe area).
4. Secondary action is a ghost button below or above the primary (depending on context).
5. Sheet content scrolls if it exceeds viewport height. The grabber and title stay fixed.
6. Sheets cover full screen width. On large screens (tablet), constrain to 480px max width, centered.

### 7.6 Navigation

**Bottom tab bar:**
| Property | Value |
|---|---|
| Background | `color.canvas` (`#0c0a09`) at 80% opacity + `blur(20px) saturate(150%)` |
| Top border | `1px solid rgba(255, 255, 255, 0.08)` |
| Height | 49px + safe area bottom inset (total ~83px on notched devices) |
| Items | 3 tabs maximum |
| Tab icon | `icon.md` (20px), inactive color `color.muted`, active color `color.accent` |
| Tab label | `type.caption.strong` (13px / 500), inactive color `color.muted`, active color `color.accent` |
| Icon-to-label gap | 4px |
| Active indicator | No underline. Icon + label color change to amber is the only active signal. |

**Tab bar rules:**
1. The tab bar is always visible. It does not hide on scroll.
2. Maximum 3 tabs. If more destinations are needed, place them in a "More" screen or settings.
3. Active tab is indicated by amber color on icon and label. No underline, no background fill, no badge.
4. Tab bar uses backdrop blur. If unsupported, use solid `color.canvas`.
5. Tab tap: instant switch (no animation on the content area beyond the screen push/pop).
6. Tab icon to label gap is 4px. Both are centered horizontally in each tab.
7. Each tab has a minimum 44px x 44px tap area.

**Screen header (top bar):**
| Property | Value |
|---|---|
| Background | Transparent (inherits canvas) or `color.canvas` at 80% + blur if sticky |
| Height | 44px + safe area top inset |
| Title | `type.title` (17px / 600), centered or left-aligned |
| Left action | Back button (icon button, `ChevronLeft` or OS back gesture) or none (root screens) |
| Right action | Icon button (`MoreHorizontal`, `Plus`, or `Settings`) or none |
| Bottom border | `1px solid rgba(255, 255, 255, 0.08)` if sticky. None if transparent. |

**Header rules:**
1. Screen headers are minimal. Title + optional left/right icon buttons.
2. On screens with scrollable content, the header can become sticky (stays at top, gains blur + bottom border).
3. Header title is left-aligned on push screens (detail views). Centered on root screens (overview).
4. Back button on iOS: use `ChevronLeft` icon. On Android: use OS back gesture. Both must work.
5. Header right action: only one icon button. If more actions are needed, use `MoreHorizontal` to open a sheet.

### 7.7 Lists

Lists display agents, settings, logs, and other scrollable content.

**List section:**
| Property | Value |
|---|---|
| Background | `color.surface.1` (`#141211`) if grouped. Transparent if inline. |
| Radius | `radius.md` (12px) if grouped. None if inline. |
| Padding | None on the section container. Padding on individual rows. |

**List row:**
| Property | Value |
|---|---|
| Background | `color.surface.1` (`#141211`) if grouped. Transparent if inline. |
| Padding | 12px vertical x 16px horizontal |
| Min height | 48px (including padding) |
| Bottom border | `1px solid rgba(255, 255, 255, 0.08)` (except last row in section) |
| Radius | None (rectangular). Parent section has radius. |
| Pressed | Background lifts to `color.surface.2` (`#1c1917`), 150ms |

**List row layout (standard):**
```
[Leading icon/avatar] [Title + subtitle] [Trailing content] [Chevron]
        20-40px            flex-grow           auto           16px
```

- Leading: icon (`icon.sm` or `icon.md`) or avatar (32px circle).
- Title: `type.body.strong` (16px / 500), color `color.ink`.
- Subtitle: `type.caption` (13px / 400), color `color.muted`.
- Trailing: status dot, count badge, or timestamp. Color `color.muted`.
- Chevron: `ChevronRight` icon, `icon.sm` (16px), color `color.disabled`. Only on navigational rows.

**List row variants:**

| Variant | Leading | Trailing | Has chevron? |
|---|---|---|---|
| Navigation row | Icon or avatar | None or badge | Yes |
| Agent row | Agent avatar (with identity color) | Status dot + status label | Yes |
| Setting row | Setting icon | Toggle or value | No (if toggle) / Yes (if push) |
| Log row | Timestamp (mono) | Log content | No |

**Log row (special):**
| Property | Value |
|---|---|
| Background | `color.canvas` (`#0c0a09`) - transparent on canvas |
| Padding | 8px vertical x 16px horizontal |
| Typography | `type.mono.body` (14px / 400) for content |
| Timestamp | `type.mono.caption` (12px / 400), color `color.muted` |
| Bottom border | None (log rows are borderless; tight stacked) |
| Content color | `color.body` (`#cbc9c6`) default. `color.ink` for important lines. `color.status.error` for error lines. |
| New entry animation | Slide-in from bottom (8px) + fade, 150ms, `ease.out` |

**List rules:**
1. Grouped lists have a section background (`color.surface.1`) with `radius.md` (12px) and 16px horizontal margin from screen edge.
2. Inline lists (like logs) have transparent backgrounds and sit directly on the canvas.
3. List row tap targets: minimum 48px height (including padding). Comfortable rows are 56px+.
4. Pressed state: background lifts to `color.surface.2`. 150ms. No scale transform (lift is sufficient).
5. Last row in a grouped section: no bottom border.
6. Section headers (if used): `type.caption.strong` (13px / 500), `color.muted`, uppercase optional, 16px padding.
7. Log rows never have bottom borders. They are tightly stacked to maximize density.
8. Log row content wraps if longer than screen width. Do not truncate with ellipsis - logs need full text.

---

## 8. Mobile Interaction Rules

### 8.1 Touch Targets

1. **Minimum touch target: 44 x 44px.** Every interactive element must have a minimum 44px tap area in both dimensions.
2. If a visual element is smaller than 44px (e.g., a 20px icon), add transparent padding to reach 44px.
3. Touch targets may overlap visually (with spacing) but must not overlap in their hit-test areas.
4. Minimum spacing between touch targets: 8px. This prevents accidental mis-taps.
5. Tab bar items: each tab has at least 33% of the tab bar width as its tap area.
6. Icon buttons: the 44x44 container is the tap area, even if the icon is only 20px.

### 8.2 Gestures

| Gesture | Action | Context |
|---|---|---|
| Tap | Activate / select / navigate | All interactive elements. |
| Press + hold | Show context menu / quick actions | Agent panel cards, list rows. |
| Swipe left | Reveal quick actions (Pause, Stop) | Agent panel cards. |
| Swipe right | Open details / expand | Agent panel cards. |
| Swipe down | Dismiss sheet / pull to refresh | Bottom sheets, scrollable screens. |
| Swipe from left edge | Back navigation | Push screens (matches iOS back gesture). |
| Pinch | None | We do not use pinch gestures. |
| Double tap | None | We do not use double-tap gestures. |

**Gesture rules:**
1. Swipe gestures on agent cards: reveal action buttons behind the card. Left swipe reveals destructive actions (Stop). Right swipe reveals informational actions (Details).
2. Swipe-down on a sheet: dismiss. The grabber is a visual affordance for this gesture.
3. Pull-to-refresh: use the platform-native implementation. Do not build a custom pull-to-refresh. The native spinner color should be `color.accent`.
4. Edge swipe (back): must work on all pushed screens. This is mandatory on iOS (users expect it). On Android, use the OS back button/gesture.
5. Press-and-hold: opens a context sheet (not a context menu). The sheet presents relevant quick actions.

### 8.3 Haptic Feedback

Haptic feedback is triggered for specific interactions to provide
physical confirmation. iOS only at launch (Android haptics are
inconsistent across devices).

| Interaction | Haptic | iOS API |
|---|---|---|
| Button press (primary CTA) | Light impact | `UIImpactFeedbackGenerator(style: .light)` |
| Toggle switch | Light impact | `UIImpactFeedbackGenerator(style: .light)` |
| Destructive action confirm | Medium impact | `UIImpactFeedbackGenerator(style: .medium)` |
| Agent status change (error) | Notification error | `UINotificationFeedbackGenerator()` |
| Agent status change (success) | Notification success | `UINotificationFeedbackGenerator()` |
| Agent status change (warning) | Notification warning | `UINotificationFeedbackGenerator()` |
| Swipe action reveal | Selection | `UISelectionFeedbackGenerator()` |
| Sheet present / dismiss | None | - |
| List scroll | None | - |
| Typing in input | None (use system keyboard haptics) | - |

**Haptic rules:**
1. Haptics fire on state COMMIT, not on touch-down. E.g., a button haptic fires when the press is released and the action is triggered, not when the finger first touches.
2. Haptics are DISABLED when the user has "Reduce Motion" or haptics disabled in system settings.
3. Never fire two haptics within 100ms of each other. This prevents buzzing.
4. Haptics are optional. The app must be fully usable without them.

### 8.4 Accessibility

**Contrast ratios (WCAG AA):**
| Element | Min Ratio | Check |
|---|---|---|
| Body text (16px and below) | 4.5:1 | `color.body` (#cbc9c6) on `color.canvas` (#0c0a09) = 10.2:1. Pass. |
| Large text (17px+ and bold) | 3:1 | `color.ink` (#f5f4f2) on `color.surface.1` (#141211) = 13.5:1. Pass. |
| UI components (borders, icons) | 3:1 | `rgba(255,255,255,0.08)` borders on `#141211` = insufficient. Borders are decorative; rely on surface lift for structural separation. |
| Focus indicators | Visible | Amber focus ring at 40% opacity is clearly visible. |

**Color blindness:**
- Status indicators NEVER rely on color alone. Every status has:
  - A distinct shape/icon (circle, check, X, triangle)
  - A text label
- The running pulse animation provides an additional non-color cue for the "running" state.
- Test with simulated deuteranopia, protanopia, and tritanopia. All status states must be distinguishable.

**Dynamic Type / Font Scaling:**
- Support system font scaling on both platforms.
- iOS: respond to `UIContentSizeCategory`. Scale all type tokens proportionally.
- Android: respond to font scale setting. Scale all type tokens proportionally.
- Maximum scale: 1.5x (above this, layout may break; allow horizontal scroll if needed).
- When font scales, spacing scales proportionally for text-adjacent spacing (padding around text). Structural spacing (screen margins) does not scale.

**Reduce Motion:**
- When the user has "Reduce Motion" enabled:
  - Replace the running pulse with a static solid dot.
  - Replace slide-in animations with instant crossfades (0ms duration).
  - Replace sheet slide with fade (200ms).
  - Replace scale(0.96) press with opacity reduction (0.7) for 100ms.
  - Keep scrim fade (it is not motion-sickness inducing).
  - Disable new-log-entry slide-in. New lines appear instantly.

**VoiceOver / TalkBack:**
- Every interactive element has an accessibility label.
- Status indicators read their status: "Agent running" not "amber dot."
- Log entries read their full content.
- Agent panels read: "{agent name}, {current task}, {status}."
- Buttons read their action: "Send message" not "send icon."
- Tab bar reads: "{tab name}, tab {n} of {total}."

**Minimum tap target enforcement:**
- If a design calls for an element smaller than 44px, expand its hit area with transparent padding. The visual size stays small; the tap area meets 44px.

---

## Appendix: Token Quick Reference

```css
/* === COLORS === */

/* Surfaces */
--color-canvas: #0c0a09;
--color-surface-1: #141211;
--color-surface-2: #1c1917;
--color-surface-3: #24211e;
--color-inverse: #f5f4f2;

/* Text */
--color-ink: #f5f4f2;
--color-body: #cbc9c6;
--color-muted: #8a8884;
--color-disabled: #5c5a57;
--color-on-accent: #1a1410;

/* Accent */
--color-accent: #f5a624;
--color-accent-bright: #ffb84d;
--color-accent-pressed: #d18d1e;
--color-accent-focus: rgba(245, 166, 36, 0.4);
--color-accent-subtle: rgba(245, 166, 36, 0.12);

/* Semantic */
--color-status-running: #f5a624;
--color-status-idle: #8a8884;
--color-status-success: #5db872;
--color-status-error: #c75c4c;
--color-status-warning: #ffb84d;

/* Agent Identity */
--color-agent-opencode: #7c8aa0;
--color-agent-claude: #a08272;
--color-agent-codex: #7a9a92;

/* Borders */
--color-border: rgba(255, 255, 255, 0.08);
--color-border-strong: rgba(255, 255, 255, 0.16);
--color-border-focused: rgba(245, 166, 36, 0.4);

/* Scrim */
--color-scrim: rgba(0, 0, 0, 0.5);


/* === TYPOGRAPHY === */

--font-sans: Inter, "SF Pro Text", system-ui, -apple-system, sans-serif;
--font-mono: "JetBrains Mono", "SF Mono", ui-monospace, monospace;

--type-display: 28px/600/1.15/-0.5px;
--type-headline: 22px/600/1.20/-0.3px;
--type-title: 17px/600/1.30/-0.2px;
--type-body: 16px/400/1.50/0;
--type-body-strong: 16px/500/1.50/0;
--type-caption: 13px/400/1.40/+0.1px;
--type-caption-strong: 13px/500/1.40/+0.1px;
--type-button: 15px/500/1.20/0;
--type-mono-body: 14px/400/1.60/0;
--type-mono-caption: 12px/400/1.50/0;


/* === SPACING === */

--space-xxs: 4px;
--space-xs: 8px;
--space-sm: 12px;
--space-md: 16px;
--space-lg: 20px;
--space-xl: 24px;
--space-xxl: 32px;
--space-section: 32px;


/* === RADIUS === */

--radius-xs: 6px;
--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 16px;
--radius-pill: 9999px;
--radius-full: 9999px;


/* === MOTION === */

--duration-instant: 100ms;
--duration-quick: 150ms;
--duration-standard: 200ms;
--duration-deliberate: 300ms;
--duration-ambient: 2000ms;

--ease-out: cubic-bezier(0.2, 0, 0, 1);
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-ambient: ease-in-out;


/* === SHADOWS === */

--shadow-fab: 0 4px 16px rgba(0, 0, 0, 0.35);
--shadow-sheet: 0 -4px 32px rgba(0, 0, 0, 0.4);
--shadow-modal: 0 8px 32px rgba(0, 0, 0, 0.4);


/* === BLUR === */

--blur-sheet: blur(24px) saturate(150%);
--blur-sticky: blur(20px) saturate(150%);


/* === ICONS === */

--icon-xs: 14px;
--icon-sm: 16px;
--icon-md: 20px;
--icon-lg: 24px;
--icon-stroke: 2px;
```
