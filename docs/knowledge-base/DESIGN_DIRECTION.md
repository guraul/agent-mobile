# DESIGN_DIRECTION.md

## Mobile Remote Control for AI Coding Agents

> **Status:** Direction document. No screens, no code, no components yet.
> This document defines the *why* and *how* of our visual identity.
> The *what* (tokens, components, screens) comes later in DESIGN.md.

---

## 1. Executive Summary

We are building a mobile application that lets developers monitor and control
AI coding agents — OpenCode, Claude Code, and Codex — from their phone.

**Product metaphor:** Mission Control for AI agents.

Like an air traffic controller's dashboard, the UI must convey complex
real-time state at a glance, never feel frantic even when multiple agents
are running, and enable precise intervention with one thumb.

**Design philosophy in one line:**

> Calm density. Glanceable status, readable detail, confident interaction.

We are designing for a developer holding their phone in one hand, checking
on a long-running agent while away from their desk. The experience must
feel native to a developer's aesthetic vocabulary — terminal-adjacent,
dark-first, information-rich — while being calmer and more legible than
a raw terminal.

---

## 2. Product Identity

### Who the user is

- A software developer who runs AI coding agents for hours at a time.
- Technically fluent. Comfortable with dark themes, monospace, status codes.
- Checks the phone intermittently — glance, act, put away.
- May monitor 1–5 agents simultaneously.
- Needs to approve actions, send prompts, read logs, catch errors fast.

### What the product is NOT

- Not a chat app. The conversation is a means, not the centerpiece.
- Not a marketing site. Every reference we studied optimized for marketing.
  We optimize for *operational monitoring*.
- Not a dashboard web app squeezed onto mobile. It is mobile-native first.

### The identity we want

**Terminal-grade clarity, mobile-native calm.**

The visual language should feel like it belongs next to a developer's
terminal — dark, dense, monospace-accented — but re-engineered for
one-handed mobile use with the breathing room and hierarchy that
terminals lack.

---

## 3. Design Principles

These principles govern every decision that follows. When in conflict,
earlier principles win.

### P1. Dark is the default, not an option.

We ship dark-first. A light theme is a future consideration, not a
launch requirement. Committing fully to dark means every value is
tuned for dark surfaces — no compromised dual-theme muddy grays.

**Source:** Linear ("Don't ship a light-mode marketing page") and
Raycast ("The system is dark-only by design") both commit fully.
Apple and Claude tune for light. We side with Linear and Raycast.

### P2. Warmth over clinical cool.

Our dark canvas will carry a slight warm tint, not a cold blue-black.
Developers stare at this surface for hours. A near-black with warm
undertones reduces the harsh OLED contrast and reads as more human.

**Source:** Claude's canvas `#faf9f5` (warm cream, not pure white) and
dark surfaces `#181715` (warm-tinted black) both prove that warmth
differentiates from the generic. Linear's `#010102` is technically
sophisticated but too clinical for extended mobile viewing.

**Direction:** Warm-tinted near-black canvas. Not pure black, not
cool blue-black. Think warm charcoal.

### P3. One scarce accent. No second chromatic color.

A single brand accent color carries every interactive signal —
primary actions, focus rings, links, active states. It is used
sparingly so it retains voltage. No second decorative color.

**Source:** All four references enforce single-accent discipline.
Linear ("Treat lavender as scarce"), Claude ("The coral is the brand
voltage"), Raycast ("White IS the brand action"), Apple ("No second
brand color exists").

**Direction:** Our accent is **warm amber** — not blue (generic AI),
not lavender (Linear's brand), not coral (Anthropic's brand). Amber
signals attention and monitoring. It is the color of caution lights
in a control room, the phosphor of legacy terminals, and it reads
with high visibility against warm-tinted dark surfaces.

### P4. Depth from surfaces, not shadows.

Elevation is communicated through a surface ladder — stepped background
tones — and hairline borders. Drop shadows are almost entirely absent,
reserved for one or two specific cases where physical weight matters
(a floating action button, a modal sheet).

**Source:** Linear, Raycast, and Claude all achieve depth without
shadows. Apple uses exactly one shadow, reserved for product imagery.
All four treat shadows as a rare material, not a default elevation tool.

### P5. Density without clutter.

Developers need information. We will not waste screen real estate on
decorative whitespace the way Apple does (80px section padding is
absurd on mobile). But we will not cram either. Density is achieved
through tight, consistent spacing scales and strong typographic
hierarchy — not by removing breathing room around interactive elements.

**Source:** Raycast's compact button padding (8×16px), Linear's compact
button spec (8×14px), and tight in-card padding (16–24px) all prove
density and polish coexist. Apple's generous pedestal whitespace is
explicitly rejected for our context.

### P6. Motion is functional, not decorative.

Unlike all four references (which document zero motion tokens), we
define motion. On mobile, motion communicates state changes — an
agent starting, a task completing, a log streaming. Motion should
be fast, subtle, and never block interaction.

**Source gap:** Linear, Claude, Raycast, and Apple all explicitly
exclude motion from their design docs. This is the single biggest
gap we fill. Mobile interaction demands it.

### P7. The product IS the decoration.

No marketing illustrations. No decorative gradients. The real-time
status of AI agents — streaming logs, activity indicators, code
diffs — IS the visual content. The UI frames the agent's activity
the way a museum frame holds art.

**Source:** Raycast ("The marketing page is the product") and Claude
("Show real product chrome. Don't paint marketing illustrations of
code when you can show real code") both prove that authentic product
content beats decorative imagery.

---

## 4. Reference Analysis: What We Took and Why

### From Linear

| Principle adopted | Why it fits us |
|---|---|
| Dark-first, surface ladder depth | Perfect for a monitoring tool. Status cards lift off the canvas via tone, not shadow. |
| Single scarce accent | Our amber plays Linear's lavender role — brand mark, primary CTA, focus ring, links. Nothing else. |
| Compact button spec | Mobile demands efficient tap targets. 8×14–16px padding is tight but tappable at 36–40px height. |
| Focus ring as design element | A branded focus ring (amber at reduced opacity) is a polish signal developers notice. |
| Hairline borders over shadows | Essential on mobile OLED where drop shadows bloom and muddy. |
| Negative letter-spacing on display | Tightens headers into confident blocks. We adopt this. |

**Rejected from Linear:**
- `#010102` canvas — too cold/blue for extended mobile viewing. We warm it.
- Custom proprietary type — impractical for a small team. We use system/open fonts.
- "No motion tokens" — unacceptable for a mobile product.
- Marketing-page-only documentation scope — we are a product UI.

### From Claude (Anthropic)

| Principle adopted | Why it fits us |
|---|---|
| Warm-tinted surfaces | Our dark canvas and dark surfaces carry warm undertones. Reduces OLED harshness. |
| Color-block depth (no shadows) | Alternating surface tones create rhythm without shadow noise. |
| Alternating surface pacing | Agent activity panels alternate between canvas and lifted surfaces to create visual rhythm in a long scroll. |
| "Show real product chrome" | We show real agent output (logs, diffs, status), never decorative illustrations of "AI." |
| Scarce accent, generous only on full-bleed | Amber is scarce on controls, but an agent error state can use a full-bleed amber callout. |
| Off-pure-black ink | Text is near-black with warm tint, not `#000000`. Softer on the eyes. |

**Rejected from Claude:**
- Serif display type (Copernicus) — wrong register for a developer tool. We are sans-serif.
- Cream/light canvas — our product is dark-first. Warmth is in the dark tint, not cream.
- "Never document hover" — we need hover/press states for interactive controls on mobile.
- 96px section rhythm — far too generous for mobile. We use 24–32px section gaps.

### From Raycast

| Principle adopted | Why it fits us |
|---|---|
| "The marketing page is the product" → "The agent output IS the UI" | Agent activity is the hero content, not decoration around it. |
| Dark-only commitment | No light mode at launch. Full dark tuning. |
| Surface ladder with tiny increments | 4-step near-black ladder with ~6–8 RGB unit steps. Reads as calibrated. |
| Hairline borders with white-opacity | `rgba(255,255,255,0.08–0.16)` borders stay tonally cohesive at every surface level. |
| Token-count restraint | A small, internally-consistent vocabulary produces visual coherence. We resist adding tokens. |
| Signature typographic detail | We adopt a specific font feature setting as our signature (see Typography). |
| Tight radius vocabulary (6–10px chrome) | Feels macOS-native, which is our developer user's home platform. |

**Rejected from Raycast:**
- White as the primary CTA color — we need a chromatic accent (amber) to signal "action" distinctly from "content."
- `ss03` Inter feature set as signature — we choose our own (see Typography).
- Pure marketing-page scope — we are a product.
- No motion — rejected.

### From Apple

| Principle adopted | Why it fits us |
|---|---|
| `scale(0.95)` press interaction | The universal micro-interaction for button presses. Feels native, costs nothing. |
| 44px minimum touch target | Non-negotiable for mobile. Every interactive element meets this. |
| Pill radius as "action" signal | Pill-shaped elements signal primary actions; rectangular elements signal content. |
| Micro-step surface variation | 2–3 RGB unit steps between surfaces create rhythm without visible borders. |
| Backdrop blur for floating elements | Sticky bottom bars and sheets use blur, not shadow, for depth. |
| Weight 600 for headlines, not 700 | Headlines feel weighty but refined, not shouting. |
| Negative letter-spacing at display sizes | Signature "tight" headline cadence. We adopt, tuned for our sizes. |

**Rejected from Apple:**
- Photography-first approach — irrelevant. We have no product photography.
- 17px body text — too large for mobile density. We use 15–16px.
- Light-dominant default — we are dark-first.
- 80px section padding — absurd on mobile.
- Zero gradient tokens — we may use subtle gradients for agent activity indicators (status glows), used with extreme restraint.
- "Single shadow reserved for product imagery" — we have no product imagery. Our one shadow (if any) is on the floating action button.

---

## 5. What We Deliberately Reject

| Rejected | Reason |
|---|---|
| Pure black canvas (`#000000`) | Too harsh on OLED. We use warm near-black. |
| Cool blue accents | Every AI tool uses blue. We differentiate with amber. |
| Drop shadows on cards/buttons | Muddy on dark OLED. Surface ladder + hairlines instead. |
| Decorative gradients | Cheap signal. Exceptions: subtle agent-status glows only. |
| Serif display type | Wrong register for a developer tool. Sans-serif only. |
| 17px body text | Too generous for mobile information density. 15–16px. |
| Marketing-page whitespace | We are a product, not a brochure. Compact rhythm. |
| No motion | Mobile requires state-transition feedback. We define motion. |
| Hover-only states | We document press/active states explicitly. |
| Multiple accent colors | One amber. Semantic colors (success/warning/error) exist but are confined to status indicators, never chrome. |

---

## 6. Color Direction

### Philosophy

A warm-tinted dark canvas with a single amber accent. Surfaces step up
in barely-perceptible increments. Semantic colors exist only for agent
status, never for decorative purposes.

### Canvas and Surfaces (dark mode — the only mode at launch)

| Role | Direction |
|---|---|
| Canvas (page floor) | Warm near-black. Not pure black, not cool blue-black. Think `#0c0a09` to `#131110` range. Carries faint warm/brown undertone. |
| Surface 1 (cards) | One step lifted from canvas. ~6–10 RGB units lighter, same warm hue. |
| Surface 2 (elevated cards, hovered) | Two steps lifted. |
| Surface 3 (sheets, modals) | Three steps lifted. Noticeably lighter but still dark. |
| Inverse (rare light surface) | Warm off-white, not pure white. Used only for high-emphasis inverse moments (e.g., a critical approval modal). |

The surface ladder uses tiny increments (like Raycast's ~6–8 RGB unit
steps) to create calibrated depth. Each step should be barely
perceptible individually but create clear hierarchy when stacked.

### Text

| Role | Direction |
|---|---|
| Primary text (ink) | Warm near-white. Not `#ffffff`. Think `#f5f4f2` — carries the canvas warmth. |
| Secondary text (body) | Stepped down ~15–20% in luminance. |
| Tertiary text (meta, timestamps) | Stepped down further. Still warm. |
| Disabled text | Lowest emphasis. Warm gray. |
| Text on amber accent | Near-black (the inverse of the canvas). |

### Accent (Amber)

The single brand color. Used on:
- Primary CTAs (Send, Approve, Run)
- Focus rings
- Active/selected states
- Brand mark
- Inline links

**Never used on:**
- Card backgrounds
- Section backgrounds
- Decorative elements
- Secondary buttons

The amber sits in the warm gold range — distinct from Claude's coral,
Linear's lavender, and every blue-using AI tool. It should feel like
a monitoring light, not a notification color.

### Semantic Colors (agent status only)

| Status | Color family | Use |
|---|---|---|
| Running / active | Amber (our accent) | Agent is working. Pulsing indicator. |
| Idle / waiting | Neutral warm gray | Agent is paused, awaiting input. |
| Success / completed | Muted green | Task done. Not bright green — desaturated, calm. |
| Error / failed | Muted red | Task failed. Not bright red — desaturated, serious. |
| Warning / needs approval | Amber (brighter variant) | Agent is asking for human decision. |

Semantic colors are **never** used on chrome (buttons, borders, text
links). They live only in status dots, status pills, and full-bleed
status callout cards. This prevents semantic colors from competing
with the amber accent.

### Agent Identity Colors (optional, subtle)

If we distinguish between OpenCode, Claude Code, and Codex visually,
each agent gets a **desaturated identity tint** used only in:
- The agent's avatar/icon background
- A 2px left border on its activity card

These are not full accent colors. They are identification tags,
used at low saturation so they don't compete with the primary amber.

### Borders

All borders are `rgba(255,255,255,0.08–0.16)` — white at low opacity.
This keeps borders tonally cohesive with any dark surface level,
matching Raycast's approach. Never use gray hex borders (`#333` etc.)
which look pasted on.

---

## 7. Typography Direction

### Philosophy

Two typefaces. One sans for everything. One mono for code, logs, and
agent output. Tight tracking on display sizes. Body at 15–16px (not
Apple's 17px — we need mobile density). Weight 600 for headlines,
400 for body, 500 for labels. Never 700+.

### Font Families

| Role | Primary | Fallback | Rationale |
|---|---|---|---|
| Sans (all UI) | **Inter** | SF Pro Text, system-ui | Inter is the closest open-source match to SF Pro, available cross-platform, and used by Linear/Raycast as substitute. Consistent on iOS and Android. |
| Mono (code, logs, agent output) | **JetBrains Mono** | SF Mono, ui-monospace | The standard for developer-facing monospace. Reads well at small sizes on mobile. |

**Signature detail:** Enable Inter's `ss03` stylistic set (single-story
`g`) as our signature typographic detail — the "you can't quite tell
why it looks considered" move that Raycast uses. This is our
non-obvious brand marker.

### Type Scale (directional, mobile-tuned)

| Token | Size | Weight | Tracking | Use |
|---|---|---|---|---|
| Display | 28–32px | 600 | -0.5px | Screen titles, large status |
| Headline | 22–24px | 600 | -0.3px | Section headers, agent names |
| Title | 17–18px | 600 | -0.2px | Card titles, modal headers |
| Body | 15–16px | 400 | 0 | Default text, messages |
| Body strong | 15–16px | 500 | 0 | Emphasized text, labels |
| Caption | 13px | 400 | +0.1px | Timestamps, meta, secondary info |
| Caption strong | 13px | 500 | +0.1px | Status labels, badge text |
| Button | 15px | 500 | 0 | Button labels |
| Mono body | 13–14px | 400 | 0 | Logs, code, agent output |
| Mono caption | 12px | 400 | 0 | Inline code, file paths |

### Principles

- **Body at 15–16px, not 17px.** Apple's 17px is for marketing reading pace. We need operational scanning density.
- **Negative tracking on display only.** Never below 13px.
- **Weight 600 for headlines, never 700.** Following Linear and Apple.
- **Line height: tight at display (1.1–1.2), relaxed at body (1.5).** Following all references.
- **Mono is for content, not chrome.** Agent output, logs, code diffs, file paths. Never for button labels or nav.

---

## 8. Spatial Direction

### Spacing Scale

Base unit: **4px**. Structural unit: **8px**.

| Token | Value |
|---|---|
| xxs | 4px |
| xs | 8px |
| sm | 12px |
| md | 16px |
| lg | 20px |
| xl | 24px |
| xxl | 32px |
| section | 32px |

**Note:** Our section spacing (32px) is drastically tighter than the
references (96px) because we are a mobile product, not a marketing
site. Mobile screens are short; vertical real estate is precious.

### Padding Principles

| Component | Padding |
|---|---|
| Buttons | 10–12px vertical × 16–20px horizontal (meet 44px height) |
| Cards | 16–20px (tight, like Raycast) |
| List rows | 12–16px vertical |
| Screen edge margins | 16px (standard mobile safe area) |
| Section gaps | 24–32px |

### Radius

| Token | Value | Use |
|---|---|---|
| xs | 6px | Small chips, badges |
| sm | 8px | Buttons, inputs, small cards |
| md | 12px | Content cards, agent panels |
| lg | 16px | Sheets, modals |
| pill | 9999px | Primary CTA pills, status dots, avatars |

**Principle:** Radius signals hierarchy. Pills = actions. 12px = content.
8px = controls. 6px = metadata. Never mix grammars (following Apple).

### Shadows

**Essentially none.** Depth comes from the surface ladder and hairlines.

One exception: **floating action buttons and bottom sheets** may use a
single subtle shadow to signal they float above content. This shadow
should be warm-tinted (not pure black) and very soft.

### Borders

- `1px solid rgba(255,255,255,0.08)` — default hairline on cards.
- `1px solid rgba(255,255,255,0.16)` — stronger divider, focused input border.
- Never use gray hex values for borders.

---

## 9. Motion Direction

This is the gap all four references leave open. We fill it.

### Philosophy

Motion on mobile communicates state. It should be fast enough to not
slow interaction, slow enough to be perceived. Never block. Never
loop distractingly.

### Duration Tokens

| Token | Duration | Use |
|---|---|---|
| instant | 100ms | Press feedback, toggle states |
| quick | 150ms | Button state changes, hover equivalents |
| standard | 200ms | Card expansions, sheet slides, list reorders |
| deliberate | 300ms | Screen transitions, modal presentations |
| ambient | 2000ms+ | Pulsing status indicators (agent running) |

### Easing

| Token | Curve | Use |
|---|---|---|
| out | `cubic-bezier(0.2, 0, 0, 1)` | Elements entering / expanding |
| in | `cubic-bezier(0.4, 0, 1, 1)` | Elements exiting / collapsing |
| in-out | `cubic-bezier(0.4, 0, 0.2, 1)` | State transitions within a component |
| ambient | `ease-in-out` | Pulsing/looping indicators |

### Interaction Motion

| Interaction | Motion |
|---|---|
| Button press | `scale(0.96)` + color shift, 100ms, `out` easing |
| Card tap | Subtle surface lift (one notch up the ladder), 150ms |
| Agent status change | Status dot crossfade, 200ms |
| New log entry | Slide-in from bottom, 150ms, `out` |
| Sheet/modal present | Slide up from bottom, 300ms, `out` |
| Pull to refresh | Native platform behavior (do not override) |

### Ambient Motion

- **Agent running indicator:** A slow amber pulse (2s loop, opacity
  40%→100%→40%). This is the only continuous animation in the app.
  It signals "the agent is alive and working" without being distracting.
- **Streaming log text:** New lines fade in at low opacity then settle
  to full opacity. Gives a sense of live activity without jarring jumps.

### What Motion Must Not Do

- Never animate decorative elements continuously (no spinning logos, no
  shimmering backgrounds, no gradient shifts).
- Never block a tap while animating. All motion is interruptible.
- Never use motion slower than 300ms for interactive feedback.
- Never use bounce/spring physics for UI chrome (reserved only for
  playful moments we currently have none of).

---

## 10. Component Philosophy

We do not define components yet. But we establish how we think about them:

### Hierarchy of Components

1. **Status indicators** (dots, pills, badges) — the glanceable layer.
   Readable at arm's length. This is the most important component
   category: it's how you know if an agent needs you.

2. **Agent panels** (cards showing one agent's state) — the scan layer.
   Each panel shows: agent name, current task, status, last activity.
   Dense but scannable.

3. **Activity feeds** (streaming logs, message history) — the read layer.
   Mono type. Auto-scrolling when at bottom. Timestamped.

4. **Action controls** (buttons, approval prompts, input fields) — the
   interaction layer. Large touch targets. Unambiguous hierarchy.

5. **Navigation** (tab bar, screen headers) — the structure layer.
   Minimal. Bottom-tabbed for one-handed thumb reach.

### Component Principles

- **Every interactive element is ≥44px in its smallest dimension.**
- **Primary actions use pill radius. Content uses 12px. Controls use 8px.**
- **Status colors never appear on buttons or borders.** Only on status
  indicators and full-bleed callout cards.
- **One primary action per screen.** Secondary actions are text links
  or ghost buttons. Following Apple's single-pill-per-fold rule.
- **Agent output is always monospace.** UI chrome is always sans. Never mix.

---

## 11. Mobile-Specific Principles

These are rules the references (all web/marketing-oriented) do not
address. We define them because mobile is our only platform.

### Thumb Zone

- Primary actions live in the bottom third of the screen (thumb-reachable).
- Navigation is a bottom tab bar, not a top nav.
- Destructive actions (cancel, stop agent) require a confirmation sheet
  — not because users are careless, but because one-handed thumb taps
  are imprecise.
- Swipe gestures: swipe left on an agent panel for quick actions
  (pause, stop). Swipe right for details.

### Glanceability

- Agent status must be readable from arm's length (≈50cm).
- The status dot color and the agent name are the two things visible at
  a glance. Everything else is secondary.
- Lock screen widget / notification: status is conveyed in the
  notification title, not requiring app open.

### One-Handed Use

- All primary interactions are reachable with the thumb of the holding
  hand without re-gripping.
- Sheets present from the bottom, not modals from center.
- Dismiss gestures (swipe down) are available on every sheet.

### Platform Respect

- On iOS, use SF Pro where Inter is unavailable (system fallback).
- On Android, use Roboto where Inter is unavailable.
- Respect platform conventions for pull-to-refresh, back gestures,
  and share sheets. Do not reinvent native patterns.
- Haptic feedback on press for primary actions (iOS only at launch).

### Accessibility

- Minimum contrast: 4.5:1 for body text, 3:1 for large text and UI
  components (WCAG AA).
- Status indicators never rely on color alone — always pair with an
  icon or text label.
- Support Dynamic Type / font scaling on iOS and Android.
- Reduce Motion setting: disable ambient pulse and slide-in animations;
  replace with instant crossfades.

---

## 12. What Comes Next

This document establishes direction. The next steps are:

1. **DESIGN.md** — The full token specification: exact hex values, type
   scale, spacing scale, component definitions, state matrices. This is
   the document an AI coding agent reads to implement the UI.

2. **Screen Architecture** — The information architecture: what screens
   exist, how they connect, what each screen shows.

3. **Component Inventory** — The specific components we build, each with
   states (default, active, pressed, focused, disabled, loading).

4. **Prototype** — A clickable prototype to validate the direction before
   we write production code.

---

## Appendix: Decision Summary

| Decision | Choice | Rationale |
|---|---|---|
| Theme | Dark-first, warm-tinted | Developer audience, OLED, long sessions |
| Accent color | Warm amber | Distinct from all 4 references, signals monitoring |
| Depth system | Surface ladder + hairlines | Clean on dark OLED, all references agree |
| Typography | Inter (sans) + JetBrains Mono | Open-source, cross-platform, developer-native |
| Body size | 15–16px | Mobile density (not Apple's 17px) |
| Motion | Defined (100–300ms, ambient 2s) | Gap all references leave; mobile requires it |
| Radius grammar | Pill=action, 12px=content, 8px=control | Following Apple's grammatical radius |
| Press interaction | `scale(0.96)` + surface lift | Native-feeling, costs nothing |
| Section rhythm | 24–32px | Mobile, not marketing |
| Shadows | Almost none (FAB/sheet only) | Muddy on dark OLED |
| Agent identity | Desaturated tints, border-only | Subtle differentiation without color chaos |
| Touch targets | 44px minimum | Non-negotiable mobile standard |
