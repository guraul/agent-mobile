# SHOWCASE2_VISUAL_SPEC.md

**Project:** Agent Mobile / Pulse — AI Companion (single-surface)
**Scope:** Visual design specification for the Showcase2 Expo + React Native build
**Version:** 1.0

**How to read:** `[O]` = observed in reference images · `[I]` = inferred (not verifiable from static images) · `[R]` = design recommendation for Agent Mobile. Do not treat `[I]` as fact.

> **Product premise (binding for all visual decisions):**
> This is an AI companion *living on the user's phone*. Pulse = AI → User (primary home surface). Talk = contextual conversation mode. Memory / KB / Responsibilities are AI *capabilities*, never top-level destinations.
>
> **North star:** the user should feel a calm intelligence is paying attention — not that they opened an "AI dashboard."
>
> **Direction name:** Quiet Sci-Fi / AI Cockpit — meaning: dark, instrument-like restraint (Reference 1's discipline) applied to a living presence (Reference 2's orb idea, shrunk and calmed). Cyberpunk, neon, and HUD clutter are explicitly out of scope.

---

## 1. Reference Analysis

### 1.1 Reference 1 — "Dark technical assistant" (3 screens: onboarding, dashboard, AI home)

| Dimension         | Observation                                                                                                                                                                                                                                                            |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Overall direction | [O] Near-black "space cockpit". One violet accent family. Technical, instrument-like character.                                                                                                                                                                        |
| Visual hierarchy  | [O] S1: hero progress card (top) → large display heading (lower half) → single CTA. S2: greeting header → featured AI service card → activity card w/ progress → 2-up stat cards. S3: centered hero title → 2×2 utility grid → composer. One focal element per screen. |
| Composition       | [O] Single column. S1/S3 have centered hero moments; lists left-aligned.                                                                                                                                                                                               |
| Layout            | [O] Stacked full-width cards; 2-column grids for stats/features; 5-item bottom nav with a raised center button.                                                                                                                                                        |
| Spacing           | [O] Screen margins ≈ 20–24. Section gaps ≈ 24–32. Card padding ≈ 16–20.                                                                                                                                                                                                |
| Density           | [O] Moderate; generous air on S1/S3, denser on S2.                                                                                                                                                                                                                     |
| Background        | [O] ≈ #0A0A0E–#0D0C12 near-black; faint concentric arcs; sparse tiny star dots; subtle vignette.                                                                                                                                                                       |
| Surfaces          | [O] Dark stepped surfaces, barely lighter than bg; near-flat.                                                                                                                                                                                                          |
| Cards             | [O] Radius ≈ 18–24; icon tiles ≈ 44–48 with radius ≈ 14.                                                                                                                                                                                                               |
| Borders           | [O] Hairline (≈1px) very low-contrast borders on chips/cards.                                                                                                                                                                                                          |
| Shadows           | [O] Minimal — definition comes from lightness steps + borders, not drop shadows.                                                                                                                                                                                       |
| Glow              | [O] Soft violet bloom only on gradient elements (service icon, center nav button, send button).                                                                                                                                                                        |
| Typography        | [O] Grotesque/geometric sans. Display ≈ 34–40px bold. Task titles ALL-CAPS ≈ 16–18 semibold, slight tracking. Body ≈ 14. Metadata ≈ 11–12 muted. Numerals have a techy slashed/dotted zero.                                                                            |
| Iconography       | [O] Thin-line white icons inside dark rounded-square tiles.                                                                                                                                                                                                            |
| Buttons           | [O] One large violet-gradient CTA per screen ("Start Exploring"); secondary = dark bordered chips/rounded squares.                                                                                                                                                     |
| Navigation        | [O] Persistent bottom tab bar (home / history / center AI button / library / profile); header back + bell.                                                                                                                                                             |
| Alignment         | [O] Left-aligned content grids; centered hero text on S3.                                                                                                                                                                                                              |
| Empty space       | [O] Generous, especially S1/S3.                                                                                                                                                                                                                                        |
| Visual rhythm     | [O] Consistent tile sizes, aligned 2-col grids, repeated icon-tile pattern.                                                                                                                                                                                            |
| Motion cues       | [I] Progress fill animation, chart draw-in, breathing glow, press-scale on tiles. Unverifiable from stills.                                                                                                                                                            |

### 1.2 Reference 2 — "Expressive violet assistant" (3 screens: home, chat, voice)

| Dimension         | Observation                                                                                                                                                                                                                                                                                                    |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Overall direction | [O] Dark violet assistant; more emotive; the glowing orb is the AI's identity.                                                                                                                                                                                                                                 |
| Visual hierarchy  | [O] S1: huge 2-line display heading → asymmetric bento (1 large image card + 2 utility cards) → quick-action chip grid → wide pill CTA. S2: header → alternating chat bubbles w/ Copy/Share chips → media result card → composer. S3: status text ("Listening…") → hero orb → paragraph → 3 circular controls. |
| Composition       | [O] S1 asymmetric bento; S3 fully symmetric and centered.                                                                                                                                                                                                                                                      |
| Layout            | [O] Stacked; bento grid; two-party chat.                                                                                                                                                                                                                                                                       |
| Spacing           | [O] Margins ≈ 20–24; chat padding ≈ 16; S3 extremely airy.                                                                                                                                                                                                                                                     |
| Density           | [O] Low on S3, moderate elsewhere.                                                                                                                                                                                                                                                                             |
| Background        | [O] Deep-violet→black vertical gradient; radial purple glow behind orb; abstract swirl artwork inside the hero card.                                                                                                                                                                                           |
| Surfaces          | [O] Dark surfaces with purple-tinted hairline borders.                                                                                                                                                                                                                                                         |
| Cards / bubbles   | [O] Radius ≈ 16–24; chat bubbles ≈ 16–20.                                                                                                                                                                                                                                                                      |
| Borders           | [O] Purple-tinted hairlines, more visible than Ref 1.                                                                                                                                                                                                                                                          |
| Glow              | [O] Strong on the orb; subtle on buttons/inputs/borders.                                                                                                                                                                                                                                                       |
| Typography        | [O] Rounded geometric sans. Display ≈ 36–40 bold. Body 14–15. Chips 13–14 medium.                                                                                                                                                                                                                              |
| Iconography       | [O] Thin-line icons in circular containers (nav controls) and rounded squares (feature cards).                                                                                                                                                                                                                 |
| Buttons           | [O] Pills everywhere: gradient send circle, bordered dark pills (Copy/Share/Download), wide bordered "Start New Chat".                                                                                                                                                                                         |
| Navigation        | [O] No tab bar; contextual back + menu circular buttons.                                                                                                                                                                                                                                                       |
| Alignment         | [O] Centered hero moments; left-aligned conversation.                                                                                                                                                                                                                                                          |
| Empty space       | [O] Extreme on S3.                                                                                                                                                                                                                                                                                             |
| Visual rhythm     | [O] Repeated pill chips; consistent circular controls.                                                                                                                                                                                                                                                         |
| Motion cues       | [I] Orb slow rotation/breathing; "Listening…" state text swap; message enter; send pulse. Unverifiable from stills.                                                                                                                                                                                            |

### 1.3 What the two references have in common

[O] All of the following appear in both references:

* Very dark background (near-black or violet-black) — never light mode.
* A single violet/purple accent family; all other UI is neutral.
* Rounded geometry: cards 16–24 radius, pill buttons/chips, rounded icon containers.
* Dark elevated surfaces defined by hairline borders + lightness steps, not shadows.
* Violet gradient reserved for emphasis: primary CTA, AI icon, send button.
* Glow appears, but concentrated on AI-identity elements only.
* Large friendly display type paired with small muted metadata.
* Metadata is numeric (times, percentages) and set small/muted.
* Thin-line iconography in consistent containers (tiles or circles).
* Generous vertical rhythm; one clear focal element per screen.
* AI is personified via glow/orb/sparkle — never via a robot illustration.
* A docked composer/input pattern on the "AI home" surfaces.

### 1.4 What is different

| Axis              | Reference 1                                                              | Reference 2                                             |
| ----------------- | ------------------------------------------------------------------------ | ------------------------------------------------------- |
| Restraint         | More restrained, instrument-like: flat black bg, faint arcs, little glow | More expressive: gradient bg, strong glow, orb hero art |
| Character of type | Technical: ALL-CAPS task names, techy numerals                           | Friendly: rounded letterforms, sentence case            |
| Navigation        | Persistent bottom tab bar + center button                                | Contextual only (back/menu), no tabs                    |
| AI identity       | Sparkle icon + gradient tile                                             | Literal glowing orb (hero + chat avatar)                |
| Background        | Near-flat black + decorative arcs/stars                                  | Violet→black gradient + radial glow                     |
| Layout grammar    | Symmetric grids/stacks                                                   | Asymmetric bento (home)                                 |
| Accent borders    | Rare, neutral hairlines                                                  | Common, purple-tinted                                   |

### 1.5 Judgment: what becomes Agent Mobile DNA vs. app-specific detail

**Become the unified design language of Agent Mobile (adopt):**

* Dark single-accent system with violet as the only hue [O: both]
* Definition via hairline borders + surface lightness steps, not shadows [O: both]
* Pill/chip action language; at most one filled primary per screen [O: both]
* Thin-line icons in consistent containers [O: both]
* Large display type + small tabular-numeral metadata [O: both]
* The orb as AI presence — but adopted at Reference-1's restraint level, not Reference-2's hero scale [O: both / R]
* Contextual navigation over tab bars (Reference 2's model fits the product; Reference 1's tab bar does not) [R]

**Reject as app-specific implementation:**

* Starfield dots and concentric arc decoration [O: R1] — decorative noise, not language
* ALL-CAPS as a general content style (labels only) [O: R1]
* Techy slashed-zero display font as identity [O: R1]
* Full-screen violet gradient background [O: R2]
* Giant hero orb artwork as a home centerpiece [O: R2]
* Rounded-cute display type [O: R2]
* Bento grid with abstract artwork tiles [O: R2]

---

## 2. Color Tokens

Derived from both references: near-black base with a faint violet cast, one violet accent family, restrained semantics. Values marked ≈ are estimates from the images; treat ±1 step as acceptable.

### Core

| Token                | HEX                       | RGB         | Notes / usage                                                         |
| -------------------- | ------------------------- | ----------- | --------------------------------------------------------------------- |
| `background`         | `#0B0A12`                 | 11,10,18    | App base (bottom of the ambient gradient).                            |
| `backgroundElevated` | `#14101F`                 | 20,16,31    | Full-screen raised layers (Talk, sheet bodies).                       |
| `surface`            | `#171428`                 | 23,20,40    | Default grouping surface. Flat, non-interactive (chips, KB/memory).   |
| `surfaceElevated`    | `#221E38`                 | 34,30,56    | The Featured container (first open Needs You).                        |
| `surfaceElevatedDeep`| `#1B1830`                 | 27,24,48    | Composer, conversation entry, context chip.                           |
| `surfacePressed`     | `#2A2540`                 | 42,37,64    | Pressed step for any surface/button.                                  |
| `border`             | `rgba(167,139,250,0.22)`  | —           | Violet-tinted hairline on interactive surfaces.                       |
| `borderSubtle`       | `rgba(167,139,250,0.12)`  | —           | Violet-tinted hairline on quiet surfaces.                             |
| `textPrimary`        | `#F5F3FA`                 | 245,243,250 | Headings/body. Never pure `#FFFFFF` for large blocks.                 |
| `textSecondary`      | `#A9A3C2`                 | 169,163,194 | Descriptions, Supporting statements (≈ white 65%).                    |
| `textSecondaryBright`| `#B4AECB`                 | 180,174,203 | AI voice lines, Featured lead, entry label.                           |
| `textMuted`          | `#7A7494`                 | 122,116,148 | Metadata, timestamps (≈ white 45%).                                   |
| `textLabel`          | `#857FA3`                 | 133,127,163 | Section / micro-group labels.                                         |

### Accent (single hue family)

| Token          | Value                      | Usage                                                                                                                                                           |
| -------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `accent`       | `#8B5CF6` rgb(139,92,246)  | The violet seen in both refs' CTAs/icons. Fills, dots, active states.                                                                                           |
| `accentBright` | `#A78BFA` rgb(167,139,250) | Accent-colored text at small sizes, glow cores, gradient highlight end. (≈6:1 contrast on bg; accent itself is ≈4.6:1 — use only for large/bold text or fills.) |
| `accentDeep`   | `#6D3EF0` rgb(109,62,240)  | Gradient low end for primary CTA / send button only.                                                                                                            |
| `accentSoft`   | `rgba(139,92,246,0.14)`    | Tinted fills: user bubbles, selected chips, suggested-item cues.                                                                                                |
| `accentBorder` | `rgba(139,92,246,0.32)`    | Borders on AI-authored or selected surfaces only. [O: R2-style, restricted by R]                                                                                |

### Semantic

| Token        | HEX                         | Usage rules                                                                                  |
| ------------ | --------------------------- | -------------------------------------------------------------------------------------------- |
| `attention`  | `#F2B33D` rgb(242,179,61)   | "Needs You" cues: small dots + one chip. Max 2 items per Pulse. Never large fills.           |
| `suggestion` | Reuse accent + `accentSoft` | "Suggested" cues. No separate hue.                                                           |
| `noticed`    | `#6B7BB8` rgb(107,123,184)  | "Noticed" cues: 6px dots and tiny metadata accents only. Never fills, never text below 12px. |
| `success`    | `#3DC98A` rgb(61,201,138)   | Completed responsibility states, confirm feedback. Dots/checks only.                         |
| `warning`    | `#E8A13C` rgb(232,161,60)   | System warnings inside responsibility/AI status lines.                                       |
| `danger`     | `#E5484D` rgb(229,72,77)    | Destructive text/icons only; filled only inside the confirm sheet.                           |
| `offline`    | `#55536B` rgb(85,83,107)    | AI offline dot, disabled presence, ended sessions.                                           |

### Colors to avoid (hard rules)

* `#00E5FF` / cyan, `#FF00A8` / magenta, neon green — instantly reads cyberpunk [R]
* Pure `#000000` and pure `#FFFFFF` large fills [R]
* Multi-hue gradients (pink→blue, orange→purple) — violet family only, 2 stops max [R]
* Saturated accent fills larger than a button/dot (no full-screen purple surfaces) [R]
* More than one glowing element per viewport [R]

---

## 3. Typography

[O] Both refs: geometric sans; one large display moment per screen; small muted metadata with numeric content.

[R] Use the system font stack (SF Pro on iOS, Roboto on Android — Expo default when `fontFamily` is unset). It satisfies both refs' character without a font dependency. Optionally add Space Grotesk (weights 500/700) for hero/display only if the product needs a more technical voice — load via `@expo-google-fonts/space-grotesk` + `useFonts`, with silent fallback to system. Do not add fonts for body text.

| Style        | Size / line-height | Weight | Letter-spacing | Case      | Usage                                                                                             |
| ------------ | ------------------ | -----: | -------------: | --------- | ------------------------------------------------------------------------------------------------- |
| `hero`       | 40 / 46            |    700 |           −0.6 | Sentence  | Once per app: welcome/empty-state moment [O: R1 S1, R2 S1]                                        |
| `display`    | 30 / 36            |    700 |           −0.4 | Sentence  | Pulse greeting, screen hero lines                                                                 |
| `heading`    | 20 / 26            |    600 |           −0.2 | Sentence  | Screen titles, item titles in Needs You                                                           |
| `subheading` | 16 / 22            |    600 |           −0.1 | Sentence  | Item titles, chip emphasis                                                                        |
| `body`       | 15 / 22            |    400 |              0 | Sentence  | Default reading text, AI messages                                                                 |
| `bodySmall`  | 13 / 18            |    400 |              0 | Sentence  | Secondary descriptions, why-it-matters lines                                                      |
| `label`      | 12 / 16            |    600 |           +0.6 | UPPERCASE | Section labels (NEEDS YOU, NOTICED) — the only sanctioned all-caps [O: R1]                        |
| `metadata`   | 12 / 16            |    400 |           +0.2 | —         | Times, percentages, sources. Always `fontVariant: ['tabular-nums']` [O: numeric metadata in both] |
| `caption`    | 11 / 14            |    500 |           +0.4 | UPPERCASE | Tiny status captions ("LISTENING…", chips)                                                        |
| `mono`       | 13 / 18            |    400 |              0 | —         | IDs, log strings, system diagnostics. `Platform.select`: Menlo (iOS) / monospace (Android)        |

**Numbers rule:** every time, percentage, or count uses metadata with tabular numerals — this is what gives both references their instrument feel without copying R1's slashed-zero font.

---

## 4. Spacing System

[O] Both refs sit on a ~4pt grid: margins ≈ 20–24, section gaps ≈ 24–32, card padding ≈ 16–20, chip gaps ≈ 8–10.

| Token  | dp | Usage                                                   |
| ------ | -: | ------------------------------------------------------- |
| `xs`   |  4 | Title→meta inside items                                 |
| `sm`   |  8 | Chip gaps, inline icon–text                             |
| `md`   | 12 | Item-to-item in a section                               |
| `lg`   | 16 | Card inner padding (compact)                            |
| `xl`   | 20 | Screen margin (default; range 18–24), rich card padding |
| `xxl`  | 28 | Group boundaries within a section                       |
| `xxxl` | 36 | Section gaps in Pulse (range 32–40)                     |

**Fixed rhythms [R]:**

* Screen margin: 20 left/right everywhere.
* Pulse vertical order: header block → 36 → Needs You → 36 → Suggested → 36 → Noticed. The AI "narrative" needs air between chapters.
* Item internal: 16 padding, 12 between text rows, 8–10 between action chips.
* Composer zone: floating composer + 72–88 bottom clearance + safe-area inset.
* Text measure: body lines max ~30–34 characters per line on mobile widths; break AI messages into short paragraphs (matches R2's chat readability).

---

## 5. Surface / Card System

[O] Both references are card-based, radius 16–24, defined by hairline borders and lightness steps; shadows nearly absent; glow only on accent elements.

### Radius tokens

| Token            |            Value | Applies to                   |
| ---------------- | ---------------: | ---------------------------- |
| `radiusCard`     | 20 (range 18–24) | Item surfaces, result cards  |
| `radiusTile`     |               14 | Icon tiles (44–48px)         |
| `radiusChip`     |              999 | All pills/chips              |
| `radiusSheet`    | 24 (top corners) | Bottom sheets                |
| `radiusComposer` |               27 | Composer pill (height 52–54) |
| `radiusBubble`   |               18 | User message bubbles         |

### Elevation model [R]

Dark themes can't show shadows well — both refs prove it. Express elevation as three lightness steps:

* `surface` (flat) — static grouping. Pulse "Suggested"/"Noticed" content.
* `surfaceElevated` + border — interactive or attention-bearing. Needs-You items, composer, chat media cards.
* `backgroundElevated` + top hairline — sheets/Talk, floating above everything, with scrim `rgba(0,0,0,0.5)`.

### Surface decision tree (for the coding agent)

| Content                   | Treatment                                                                                                                   |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Is it a Pulse item?       | Needs You → `surfaceElevated` + border; Suggested → `surface`, no border; Noticed → **NO surface at all (typographic row)** |
| Is it a conversation?     | Talk message spec (§12)                                                                                                     |
| Is it a temporary layer?  | Sheet: `backgroundElevated`, `radiusSheet`, handle 36×4 (white 20%)                                                         |
| Is it a control?          | Action language (§8)                                                                                                        |
| Otherwise (settings row…) | Borderless row, 52px, `borderSubtle` divider                                                                                |

**Hard rules:**

* **NEVER:** card inside card inside card. Max one nesting level.
* **NEVER:** a card with a single line of static text.

### When NOT to use a card (explicit)

* Noticed list rows → plain text + dot, no container (this is what kills the "SaaS card grid" feel)
* Section labels → text only
* Suggested items → flat surface, borderless
* Any content that is pure metadata (timestamps, sources)

---

## 6. Action Language

[O] R2 leans heavily on pill chips and text actions (Copy/Share/Download) with only one strong CTA per flow; R1 uses one large gradient CTA per screen plus dark bordered squares.

[R] Agent Mobile should lean even further toward R2's quiet end: most actions are chips or text; a filled primary appears at most once per screen.

| Action type                 | Spec                                                                                                                                                                                                                                               |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Primary (≤1 per screen)** | Pill, height 52–56, radius 999, fill = vertical `LinearGradient` `accentDeep→accent` (2 stops), text body-size 600 white, padding-x 24, optional trailing arrow glyph, soft accent glow (§9 rules). [O: R1 "Start Exploring", R2 "Start New Chat"] |
| **Secondary**               | Pill or rounded-square, height 44–48, `surfaceElevated` fill + border, `textPrimary` 15/600.                                                                                                                                                       |
| **Text action**             | `accentBright` 15/600, no container. "See All", "Dismiss", "DEFER". [O: R1/R2 "See All"]                                                                                                                                                           |
| **Inline chip**             | Height 32–36, radius 999, surface fill + `borderSubtle`, 13/500, leading 14px glyph. [O: R2 Copy/Share/Download]                                                                                                                                   |
| **DISCUSS**                 | Quiet text action (Featured) or tapping the statement (Supporting). Opens Talk with context chip; never confirms anything.                                                                                                                          |
| **CONFIRM**                 | Quiet inline chip with `accentBorder` + `accentBright` label. Discuss ≠ Confirm; the gradient fill is reserved for the round Send / conversation entry.                                                                                            |
| **REVIEW**                  | Inline chip with `accentBorder` + `accentBright` label — the signature "AI is asking you to look" affordance.                                                                                                                                      |
| **Destructive**             | `danger`-colored 15/600 text on quiet bordered chip; filled red only inside the confirm sheet.                                                                                                                                                     |
| **Disabled**                | Opacity 0.4 on the whole control; no color change.                                                                                                                                                                                                 |
| **Loading**                 | Never spinners. On primary buttons: label swaps to 3-dot breathing (§10). On lists: plain surface skeletons, no shimmer.                                                                                                                           |
| **Pressed**                 | scale 0.97 + fill steps to `surfacePressed`, 120ms ease-out.                                                                                                                                                                                       |
| **Icon placement**          | Leading 14–16px glyph inside chips; trailing arrow only for navigation-to-detail.                                                                                                                                                                  |

---

## 7. AI Presence System

[O] R2 personifies the AI as a glowing violet orb (hero scale on the voice screen, ~24px as chat avatar). R1 personifies it as sparkle glyph + gradient tile. Neither shows status dots explicitly.

[R] Agent Mobile unifies this into a presence orb: a small radial-gradient circle — calm by default, expressive only when something matters.

### The orb

**Construction:** circle with radial gradient `accentBright` core → `accent` → transparent edge; on dark bg it reads as a soft glowing dot.

**Sizes:**

* dot 8px (inline, list rows)
* avatar 24px (headers, chat)
* hero 96–120px (Talk empty state only)

### States

| State                                       | Look                                                   | Motion                                                            |
| ------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------- |
| **Attentive (default)**                     | accent orb, dot/avatar size                            | Breathing: opacity 0.55→1.0 + scale 1→1.06, 3.5s ease-in-out loop |
| **Engaged (user mid-conversation in Talk)** | slightly brighter core                                 | Same breathing, faster (2.5s)                                     |
| **Thinking**                                | orb steady bright; conversation shows 3-dot wave (§10) | No extra orb motion                                               |
| **Noticed something**                       | one-time ping: ring expands 8→24px, fades, 600ms ×1    | Then returns to Attentive                                         |
| **Needs you**                               | attention amber orb + one ping                         | Then steady amber                                                 |
| **Offline**                                 | offline gray, flat                                     | Static, no glow                                                   |

**Placement rules:**

* exactly one orb visible per screen (Pulse header or Talk header)
* Never a row of glowing dots
* Glow halo limited to ~12–16px radius around the orb
* glow is the only animated shadow allowed

---

## 8. Motion Language

[I] (all inferred from static cues — not facts): progress bars imply fill animation; the orb implies rotation/breathing; "Listening…" implies state-text swap; charts imply draw-in; tiles imply press feedback.

[R] Recommended system:

| Context                           | Spec                                                                                                                                                         |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Durations                         | fast 120–150ms · base 200–250ms · slow 300–400ms                                                                                                             |
| Easing                            | standard cubic-bezier(0.32, 0.72, 0, 1); loops use ease-in-out                                                                                               |
| Page push (Pulse→Talk)            | Horizontal push, 300ms; incoming view from right at 8% translate + full fade                                                                                 |
| Card/item appearance              | Fade + translateY 8–12px, 200–250ms, stagger 30–50ms per item, first render of Pulse only                                                                    |
| AI thinking                       | 3 dots, opacity wave 0.3→1.0→0.3, 1.2s loop, `textSecondary` — never a spinner                                                                               |
| Presence breathing                | §7; runs only when visible; pause when app backgrounded                                                                                                      |
| Interaction feedback              | Press scale 0.97 (120ms); send button: 1.0→1.1→1.0 pop (250ms) on send                                                                                       |
| Contextual transition (item→Talk) | Composer rises first (200ms), conversation fades in behind (250ms, 60ms offset); back reverses                                                               |
| Sheet                             | Slide-up 300ms + scrim fade; drag-to-dismiss with velocity                                                                                                   |
| Reduce Motion                     | Replace breathing with static orb; replace pushes with 150ms crossfade; kill ping rings. Respect OS setting via `AccessibilityInfo`/Reanimated reduceMotion. |

---

## 9. Pulse — Information Design Language

Pulse is not a dashboard. It is the AI speaking: a short narrative of what it noticed, what it suggests, and what needs a human decision. Sections are chapters, not tabs.

### Hierarchy (V2 composition)

Composition: **Header → Hero → Featured → Supporting → Noticed → Conversation Entry.**
There is no Bento and no Quick Actions grid on Pulse.

| Section                            |           Count visible | Salience | Container                           | Cue                                       | Actions                                              |
| ---------------------------------- | ----------------------: | -------- | ----------------------------------- | ----------------------------------------- | ---------------------------------------------------- |
| Featured (first open Needs You)    |                       1 | Highest  | `surfaceElevated` + `accentBorder`  | alert glyph inside a 44px tile            | REVIEW chip + quiet Discuss / Defer text actions      |
| Supporting / Needs You             |               remaining | Medium   | No container (light rows)           | 6px attention dot + `NEEDS YOU · n` label | REVIEW chip + quiet DEFER text                        |
| Supporting / Suggested             |               remaining | Medium   | No container (light rows)           | 6px accent dot + `SUGGESTED · n` label    | CONFIRM chip + quiet DISMISS text                     |
| Noticed (AI observes, FYI)         | ≤5 rows (See All > 5)   | Lowest   | No container                        | 6px noticed dot                           | Tap row → read-only sheet; Discuss → Talk             |

Density deliberately decreases down the page — the AI shouts least about what matters least. Visual distinction comes from type size, dot color, surface level, and spacing — not from differently-styled cards.

### Item anatomy

**Featured item (first open Needs You):**

```text
One thing needs you                          ← lead (body 600, textSecondaryBright)
┌──────────────────────────────────────────┐
│ [alert tile 44]  Title (heading, ≤2 lines) │
│ Why it matters (bodySmall secondary)       │
│ source · time (metadata muted)             │
│ ( REVIEW )   Discuss   Defer               │
└──────────────────────────────────────────┘
```

**Supporting rows (no container, split by semantic micro-group):**

```text
NEEDS YOU · n
  ● one-line item (body secondary)             REVIEW   Defer
SUGGESTED · n
  ◆ one-line proposal (body secondary)         CONFIRM  Dismiss
```

**Noticed row:**

```text
[dot] Fact (body, 1 line) · time (metadata)   ← 52px row, tap → read-only sheet
```

Every item is written first-person, from the AI ("I noticed…", "This blocks…"). Group labels carry a live count only when >0. Featured is hidden when there is no open Needs You — the first Suggested never takes its place.

### Wireframe example

```text
──────────────────────────────────────────────
  ● ATTENTIVE                                 ← header line 1 (caption)
  Pulse                                       ← header line 2 (22/700)

  Good morning,
  Wei.                                        ← two-line hero (33/700, lh 1.18)
  I kept an eye on things overnight.          ← AI voice (body textSecondaryBright)

  One thing needs you                         ← Featured lead
  ┌──────────────────────────────────────┐
  │ [ ! ]  Preview deployment #412 is     │
  │        blocked.                       │
  │        It blocks the 14:00 release    │
  │        you asked me to watch.         │
  │        ci-runner · 12 min ago         │
  │  ( REVIEW )   Discuss   Defer         │
  └──────────────────────────────────────┘

  SUGGESTED · 1                               ← micro-label (label style)
  ◆ I think we should keep an eye on         CONFIRM  Dismiss
    Huabao Medical ETF.

  NOTICED
  · I noticed the fund estimate has          3d
    declined for three trading days.
  · Maya referenced "pricing-v3"             yesterday
    twice yesterday.
  · Nightly backup finished at 03:12.        6h ago

  ┌────────────────────────────┐   ◉          ← conversation entry (Pressable,
  │ +  Talk to Pulse…          │                not a TextInput; no Send here)
  └────────────────────────────┘
──────────────────────────────────────────────
```

The goal: reading Pulse should feel like skimming a note from someone who was watching while you were away — not scanning cards.

---

## 10. Talk — Contextual Conversation Space

Talk is opened *from* Pulse (or a notification), always about something.

### Entry & context [R]

* **Trigger:** DISCUSS chip, composer focus, or notification tap.
* **Transition:** push (§8), 300ms.
* **Context preservation:** the originating item appears pinned above the composer as a quiet chip: `↳ Deploy preview #412` (height 32, surface + `accentBorder`, dismissible). Dismissing it detaches the thread — it does not delete history.

Returning back returns to Pulse at the exact scroll position; the conversation stays reachable via a "Continue discussion" row in Noticed.

### Visual separation from Pulse

Same background token — separation comes from:

* a subtle radial accent glow behind the header orb (accent at 8–10% opacity, ~200px radius — the one place R2's glow language survives, reduced) [R]
* the pinned context chip
* message layout

No theme change, no gradient background.

### Talk screen spec

```text
[← ]   ● Pulse · attentive        [⋯]
      ← orb 24 + name (heading) + state (caption)
────────────────────────────────────────────
                              ┌────────────┐
                              │ user bubble │
                              └────────────┘
                                 ← accentSoft fill, radius 18,
                                   max-width 80%, no border

●  AI replies as plain text blocks (body),
   no bubble, indented 32px, paragraph gaps 12.
   From memory · pricing-v3 notes  ⌄
   ← memory chip (§11)

   ┌ docs ▸ pricing-v3.md ┐
   ← KB source chips (§11)

   ( Copy )  ( Discuss this )
   ← inline chips, 32px
────────────────────────────────────────────
[↳ Deploy preview #412  ✕]
← context chip
┌────────────────────────────────────┐
│ Message Pulse…                     │  ◉   ← capsule 52 + round Send 48 outside
└────────────────────────────────────┘
← the real Talk input; Pulse itself has no TextInput
```

AI identity in Talk = orb header + plain-text voice. R2's bordered AI bubbles are not adopted; borderless text reads as the AI speaking, not as a chat app [R].

---

## 11. Contextual Memory / KB / Responsibility

None of these are pages. Each is a surface that appears inside context.

### Memory

**Appearance:** an inline memory chip above or inside an AI message when it recalls something unprompted:

* height 32
* `surface` + `borderSubtle`
* leading memory glyph
* `bodySmall` text — `Recalled: your Tue/Thu blocker pattern.`

**Tap →** bottom sheet (`radiusSheet`):

* quoted memory
* source line (metadata: `Talk · 3 weeks ago`)
* actions: DISCUSS chip + FORGET text action (danger on confirm)

Memory is never browsable as a list in v1. If a user asks "what do you remember about X", that's a Talk conversation, not a screen.

### KB (knowledge sources)

Appearance: source chips under an AI message:

```text
[▸ pricing-v3.md] [▸ standup-notes]
```

Horizontal scroll if >2, height 32, doc glyph + name (metadata style).

Tap → sheet preview:

* filename
* 2–3 line excerpt
* OPEN secondary pill
* ASK ABOUT THIS chip (deep-links to Talk with the chip as context)

In Pulse, KB activity surfaces as Noticed rows ("Maya referenced pricing-v3 twice yesterday"), never as a file browser.

### Responsibilities ("AI is currently responsible for…")

Presented as AI commitments, not tasks.

**Location:** a quiet section in Pulse below Noticed — label **ON MY PLATE** — plus a one-line status under the Pulse greeting when one is active ("Watching: release branch until 14:00").

**Row anatomy:** state dot (6px) + verb-first one-liner + trailing quiet action.

* `watching` → accent dot, breathing
* `waiting on you` → attention amber dot, static
* `done` → success dot + row dims to `textMuted`
* `handed off` → offline gray

**Actions per row:** HAND OFF text action + tap → sheet with details.

**Never:** checkboxes, progress bars, kanban, due-date pickers, avatars. R1's striped progress bars are explicitly not carried over.

---

## 12. Navigation Philosophy

[O] R1 uses a 5-item tab bar; R2 uses purely contextual back/menu. R2's model matches the product; the four-tab Pulse/Talk/Memory/Me structure is rejected [R].

### Recommended model: single surface + contextual stack

| Mechanism                          | Usage                                                                                                                                                                                                                              |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Root**                           | Pulse. The only "home". No tabs, no hamburger, no drawer.                                                                                                                                                                          |
| **Talk**                           | Full-screen push. Dismiss = back gesture or down-swipe on header; transcript persists.                                                                                                                                             |
| **Sheets**                         | Memory detail, KB preview, responsibility detail, notification focus, settings. Bottom sheets: `backgroundElevated`, top radius 24, 36×4 handle, scrim, drag-to-dismiss.                                                           |
| **Modal**                          | Destructive confirms only.                                                                                                                                                                                                         |
| **Back behavior**                  | System swipe-back everywhere; Pulse scroll position always preserved; Talk keeps its session.                                                                                                                                      |
| **Global AI access**               | The conversation entry is permanently docked on Pulse — it is a Pressable, not a TextInput: tapping it (or its round button) pushes Talk, where the real input lives. Talk is never more than one tap away, which removes the need for a global FAB. In the few non-Pulse screens (settings), a 48px presence-orb pill bottom-right opens Talk as a sheet. |
| **Notifications**                  | Tapping a Pulse notification opens the item with a one-time attention ping ring + context chip pre-filled.                                                                                                                         |
| **Header pattern on every screen** | back (44px circular `surfaceElevated` + hairline [O]) · centered title or AI identity · one trailing action max.                                                                                                                   |

---

## 13. Do / Don't

### DO

* Do keep the palette to near-black neutrals + one violet family + sparse semantic dots.
* Do define surfaces with hairline borders and lightness steps, not shadows.
* Do write Pulse as first-person AI statements with decreasing density top→bottom.
* Do inline actions on the item they belong to; at most one filled primary per screen.
* Do use `label` (uppercase, tracked, muted) for section labels only.
* Do use tabular numerals for every time/percentage.
* Do keep exactly one presence orb per screen; let it breathe slowly.
* Do leave 32–36dp of air between Pulse sections; let Noticed be borderless text.
* Do put everything temporary in bottom sheets with a handle.
* Do respect Reduce Motion and 44×44 minimum touch targets.

### DON'T

* Don't build a bottom tab bar, hamburger, or drawer.
* Don't render Pulse as "card / card / card" — Noticed rows have no container.
* Don't use cyan, magenta, neon green, rainbow or multi-stop gradients.
* Don't use full-screen gradient/violet backgrounds; glow only on live presence + primary CTA.
* Don't apply glassmorphism or BlurView for style.
* Don't nest cards more than one level; don't wrap single-line metadata in cards.
* Don't use ALL-CAPS for content text, robot illustrations, or sparkle kitsch in empty states.
* Don't show spinners for the AI — use the 3-dot thinking wave.
* Don't create hero orb artwork on Pulse home (hero orb lives only in Talk's empty state).
* Don't add a Memory/KB/Responsibility tab, list page, or progress bars — they are contextual surfaces (§11).

---

## 14. React Native / Expo Implementation Guidance

### Recommended primitives

| Need         | Primitive                                                                                                                                                                                    |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Layout/lists | `View`, `Text`, `Pressable`, `ScrollView`, `FlatList`/`SectionList` (Pulse = `SectionList` with 3 sections)                                                                                  |
| Safe areas   | `react-native-safe-area-context` (`SafeAreaProvider` + insets; composer sits above bottom inset)                                                                                             |
| Motion       | `react-native-reanimated` (worklets for press scale, breathing via `withRepeat`, layout transitions). Plain Animated acceptable as fallback — don't add heavy libs beyond this               |
| Gradient     | `expo-linear-gradient` — only: primary CTA fill, send button, orb (radial via nested circles or `react-native-svg` radialGradient), Talk header glow. Hard cap: ≤3 gradient nodes per screen |
| Haptics      | `expo-haptics` light impact on send/confirm (optional)                                                                                                                                       |
| Blur         | `expo-blur` avoid by default; permitted only for the composer scrim over scrolled Pulse content on iOS, with an opaque `surfaceElevated` fallback on Android                                 |
| SVG          | `react-native-svg` only if needed for the orb's radial gradient — otherwise skip                                                                                                             |
| Hairlines    | `StyleSheet.hairlineWidth` or 1px with `borderSubtle`/`border`                                                                                                                               |

### Fonts

Default: leave `fontFamily` unset (system). Apply `fontVariant: ['tabular-nums']` on all metadata text.

Optional display font: `@expo-google-fonts/space-grotesk` (500/700) loaded via `useFonts`, applied only to hero/display styles; must render acceptably if the fallback (system) is used.

### Performance guidance

| Technique                 | Verdict                                                                                                                                                                                                           |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shadows (`shadow*` props) | Safe on iOS for small elements (≤80px: chips, composer). Android: don't rely on elevation for definition — borders carry the design. Glow on Android = pre-rendered gradient layer behind the element, not shadow |
| Animated glow/breathing   | Only on elements ≤48px, animate opacity + transform only; pause via `AppState` when backgrounded                                                                                                                  |
| BlurView                  | Avoid in scrolling lists; static composer only; always ship opaque fallback                                                                                                                                       |
| Gradients                 | Static only. Never animate gradient positions/colors per-frame                                                                                                                                                    |
| Background decoration     | None by default. If the Talk header glow is needed, one absolutely-positioned radial gradient behind the header — no Canvas/Skia in v1                                                                            |
| Layout animations         | Don't animate width/height; use transforms + opacity; Layout transitions via Reanimated for Pulse item insert/remove                                                                                              |
| Lists                     | Memoized item components; `getItemType` for Needs/Suggested/Noticed; default `windowSize`                                                                                                                         |
| Reduce Motion             | `reduceMotion` from Reanimated or `AccessibilityInfo.isReduceMotionEnabled` — swap loops for static states                                                                                                        |

---

## 15. Reference Mapping

| Visual characteristic | Reference 1                                  | Reference 2                             | Agent Mobile / Pulse                                                             |
| --------------------- | -------------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------- |
| Background            | Near-black + arcs + starfield [O]            | Violet→black gradient [O]               | Flat `#0B0A10`; no decorative bg; single radial glow in Talk header only [R]     |
| Accent discipline     | Restrained violet on icons/CTA [O]           | Expressive violet + glow [O]            | Restrained; gradient only on primary CTA, send, orb [R]                          |
| AI identity           | Sparkle + gradient tile [O]                  | Glowing orb (hero + avatar) [O]         | Unified presence-orb system, ≤24px in context [R]                                |
| Card language         | Symmetric stacks/grids, hairline borders [O] | Asymmetric bento + bordered bubbles [O] | Minimal cards: elevated only for Needs You; Noticed borderless [R]               |
| Borders               | Neutral hairlines, subtle [O]                | Purple-tinted hairlines [O]             | Neutral by default; `accentBorder` only on AI-authored/selected surfaces [R]     |
| Glow                  | Subtle, accent elements [O]                  | Strong (orb) [O]                        | Subtle, presence + primary only, ≤1 per viewport [R]                             |
| Navigation            | Bottom tab bar + center FAB [O]              | Contextual back/menu [O]                | Contextual stack + sheets; composer docked on Pulse [R]                          |
| Primary button        | Large gradient CTA [O]                       | Wide pill / gradient send [O]           | ≤1 per screen, pill 52–56, gradient, glow [R]                                    |
| Secondary actions     | Dark bordered squares [O]                    | Pill chips (Copy/Share) [O]             | Pill chips 32–36 [R]                                                             |
| Typography            | Techy grotesque, ALL-CAPS content [O]        | Rounded friendly sans [O]               | System sans; ALL-CAPS only for label/caption; optional Space Grotesk display [R] |
| Numerals              | Slashed-zero techy style [O]                 | Standard [O]                            | System tabular-nums [R]                                                          |
| Icon containers       | Rounded-square tiles [O]                     | Circles + squares [O]                   | Rounded-square tiles 44–48, radius 14 [R]                                        |
| Density rhythm        | Moderate, one focal per screen [O]           | Airy heroes [O]                         | Decreasing density: Needs You → Suggested → Noticed [R]                          |
| Chat layout           | — (no chat screen)                           | Bordered bubbles both sides [O]         | User: `accentSoft` bubble; AI: borderless text + orb avatar [R]                  |

### Keep

Dark single-accent system · hairline-border surface definition · tabular-numeral metadata · pill/chip action language · icon tiles · docked conversation entry · generous vertical rhythm · one focal element per screen.

### Adapt

The orb → shrunk into a stateful presence system · purple borders → only AI-authored content · bento → only if Pulse ever needs a top feature block (not in v1) · gradient → primary CTA/send/orb only · ALL-CAPS → section labels only · R1's progress bar → dropped entirely.

### Reject

Bottom tab bar + center FAB · full-screen gradient backgrounds · starfields/arcs · hero orb art on home · dotted-zero identity font · rounded-cute display type · glow on everything · bordered AI chat bubbles · abstract artwork tiles.

---

## 16. Acceptance Checks (for the implementing agent)

A build matches this spec when:

* Any screen contains one violet accent family and one visible orb, maximum.
* Pulse reads top-to-bottom as decreasing visual weight, with borderless Noticed rows.
* No screen has more than one filled primary control, one glow source, one gradient background element.
* All times/percentages render in tabular numerals; all-caps appears only in label/caption styles.
* Removing every card container from Noticed leaves a still-readable, well-spaced page.
* Talk opened from a Pulse item shows the context chip and returns without losing scroll or transcript.
* Pulse contains no TextInput and no Send: the conversation entry only pushes Talk.
* No cyan/magenta/neon hue, no glass blur, no spinner, no tab bar exists anywhere in the app.

---

*End of specification.*

