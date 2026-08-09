# COMPONENT_INVENTORY.md

> Generated from current implementation state.
> Source of truth: DESIGN.md
> Scope: foundational component library (primitives + theme tokens)

---

## Theme Tokens

### colors.ts

| Field | Value | DESIGN.md Reference |
|---|---|---|
| `canvas` | `#0c0a09` | §1.2 - color.canvas |
| `surface.1` | `#141211` | §1.2 - color.surface.1 |
| `surface.2` | `#1c1917` | §1.2 - color.surface.2 |
| `surface.3` | `#24211e` | §1.2 - color.surface.3 |
| `inverse` | `#f5f4f2` | §1.2 - color.inverse |
| `ink` | `#f5f4f2` | §1.3 - color.ink |
| `body` | `#cbc9c6` | §1.3 - color.body |
| `muted` | `#8a8884` | §1.3 - color.muted |
| `disabled` | `#5c5a57` | §1.3 - color.disabled |
| `onAccent` | `#1a1410` | §1.3 - color.on-accent |
| `onInverse` | `#1a1410` | §1.3 - color.on-inverse |
| `onSurface3` | `#f5f4f2` | §1.3 - color.on-surface.3 |
| `accent.default` | `#f5a624` | §1.4 - color.accent |
| `accent.bright` | `#ffb84d` | §1.4 - color.accent.bright |
| `accent.pressed` | `#d18d1e` | §1.4 - color.accent.pressed |
| `accent.focus` | `rgba(245, 166, 36, 0.4)` | §1.4 - color.accent.focus |
| `accent.subtle` | `rgba(245, 166, 36, 0.12)` | §1.4 - color.accent.subtle |
| `status.running` | `#f5a624` | §1.5 - color.status.running |
| `status.idle` | `#8a8884` | §1.5 - color.status.idle |
| `status.success` | `#5db872` | §1.5 - color.status.success |
| `status.error` | `#c75c4c` | §1.5 - color.status.error |
| `status.warning` | `#ffb84d` | §1.5 - color.status.warning |
| `status.fill.*` | 5 tokens, 15% opacity | §1.5 - semantic fill variants |
| `status.border.*` | 5 tokens, 30% opacity | §7.4 - callout card border |
| `agent.opencode` | `#7c8aa0` | §1.6 - color.agent.opencode |
| `agent.claude` | `#a08272` | §1.6 - color.agent.claude |
| `agent.codex` | `#7a9a92` | §1.6 - color.agent.codex |
| `agent.fill.*` | 3 tokens, 15% opacity | §1.6 - agent identity fills |
| `border.default` | `rgba(255, 255, 255, 0.08)` | §1.7 - color.border |
| `border.strong` | `rgba(255, 255, 255, 0.16)` | §1.7 - color.border.strong |
| `border.focused` | `rgba(245, 166, 36, 0.4)` | §1.7 - color.border.focused |
| `border.error` | `rgba(199, 92, 76, 0.5)` | §7.3 - input error border |
| `border.disabled` | `rgba(255, 255, 255, 0.04)` | §7.3 - disabled input border |
| `scrim` | `rgba(0, 0, 0, 0.5)` | §1.8 - color.scrim |

**Status:** Implemented. Matches DESIGN.md exactly.

---

### typography.ts

| Token | Font | Size | Weight | Line Height | Letter Spacing | DESIGN.md Ref |
|---|---|---|---|---|---|---|
| `display` | Inter | 28px | 600 | 32.2 | -0.5px | §2.2 |
| `headline` | Inter | 22px | 600 | 26.4 | -0.3px | §2.2 |
| `title` | Inter | 17px | 600 | 22.1 | -0.2px | §2.2 |
| `body` | Inter | 16px | 400 | 24.0 | 0 | §2.2 |
| `bodyStrong` | Inter | 16px | 500 | 24.0 | 0 | §2.2 |
| `caption` | Inter | 13px | 400 | 18.2 | +0.1px | §2.2 |
| `captionStrong` | Inter | 13px | 500 | 18.2 | +0.1px | §2.2 |
| `button` | Inter | 15px | 500 | 18.0 | 0 | §2.2 |
| `monoBody` | JetBrains Mono | 14px | 400 | 22.4 | 0 | §2.2 |
| `monoCaption` | JetBrains Mono | 12px | 400 | 18.0 | 0 | §2.2 |

**Status:** Implemented. All values match DESIGN.md §2.2.

---

### spacing.ts

| Token | Value | DESIGN.md Ref |
|---|---|---|
| `xxs` | 4 | §3.1 |
| `xs` | 8 | §3.1 |
| `sm` | 12 | §3.1 |
| `md` | 16 | §3.1 |
| `lg` | 20 | §3.1 |
| `xl` | 24 | §3.1 |
| `xxl` | 32 | §3.1 |
| `section` | 32 | §3.1 |

**Status:** Implemented. Matches DESIGN.md exactly.

---

### radius.ts

| Token | Value | DESIGN.md Ref |
|---|---|---|
| `xs` | 6 | §4.1 |
| `sm` | 8 | §4.1 |
| `md` | 12 | §4.1 |
| `lg` | 16 | §4.1 |
| `pill` | 9999 | §4.1 |
| `full` | 9999 | §4.1 |

**Status:** Implemented. Matches DESIGN.md exactly.

---

### motion.ts

| Token | Value | DESIGN.md Ref |
|---|---|---|
| `duration.instant` | 100 | §5.1 |
| `duration.quick` | 150 | §5.1 |
| `duration.standard` | 200 | §5.1 |
| `duration.deliberate` | 300 | §5.1 |
| `duration.ambient` | 2000 | §5.1 |
| `easing.out` | bezier(0.2, 0, 0, 1) | §5.2 |
| `easing.in` | bezier(0.4, 0, 1, 1) | §5.2 |
| `easing.inOut` | bezier(0.4, 0, 0.2, 1) | §5.2 |
| `easing.ambient` | ease-in-out | §5.2 |
| `scale.pressed` | 0.96 | §5.3 |

**Status:** Implemented. Matches DESIGN.md exactly.

---

### icons.ts

| Token | Value | DESIGN.md Ref |
|---|---|---|
| `iconSizes.xs` | 14 | §6.2 |
| `iconSizes.sm` | 16 | §6.2 |
| `iconSizes.md` | 20 | §6.2 |
| `iconSizes.lg` | 24 | §6.2 |
| `iconStroke` | 2 | §6.2 |

**Status:** Implemented. Matches DESIGN.md exactly.

---

### shadows.ts

| Token | Value | DESIGN.md Ref |
|---|---|---|
| `fab` | elevation:6, shadow 0,4,16 @0.35 | §4.4 |
| `sheet` | elevation:8, shadow 0,-4,32 @0.4 | §4.4 |
| `modal` | elevation:10, shadow 0,8,32 @0.4 | §4.4 |

**Status:** Implemented. Matches DESIGN.md exactly.

---

### theme/index.ts

Aggregates all token modules into a single `theme` export.

**Status:** Implemented.

---

## Primitives

### Box

- **Location:** `src/components/primitives/Box.tsx`
- **Purpose:** Generic layout container. Translates spacing/radius/color token props into `ViewStyle`.
- **Props API:**
  - `backgroundColor?: "canvas" | "surface.1" | "surface.2" | "surface.3" | "inverse" | "transparent"`
  - `padding?, paddingHorizontal?, paddingVertical?, paddingTop?, paddingBottom?, paddingLeft?, paddingRight?: SpaceToken`
  - `margin?, marginHorizontal?, marginVertical?, marginTop?, marginBottom?, marginLeft?, marginRight?: SpaceToken`
  - `gap?: SpaceToken`
  - `rounded?, borderTopLeftRadius?, borderTopRightRadius?, borderBottomLeftRadius?, borderBottomRightRadius?: RadiusToken`
  - `testID?: string`
  - `...ViewProps` (spread)
- **Dependencies:** `react-native` (View, ViewProps, ViewStyle)
- **Design token dependencies:** `colors`, `spacing`, `radius`
- **Status:** Implemented.

### Text

- **Location:** `src/components/primitives/Text.tsx`
- **Purpose:** Renders text using typography tokens. Applies font family, size, weight, line height, letter spacing, and color from theme.
- **Props API:**
  - `variant?: "display" | "headline" | "title" | "body" | "bodyStrong" | "caption" | "captionStrong" | "button" | "monoBody" | "monoCaption"`
  - `color?: "ink" | "body" | "muted" | "disabled" | "onAccent" | "onInverse" | "accent" | "accentBright" | "accentPressed" | "success" | "error" | "warning" | "running" | "idle"`
  - `align?: "auto" | "left" | "center" | "right" | "justify"`
  - `numberOfLines?: number`
  - `ellipsizeMode?: "head" | "middle" | "tail" | "clip"`
  - `accessibilityLabel?: string`
  - `testID?: string`
  - `children?: React.ReactNode`
- **Dependencies:** `react-native` (Text, TextProps)
- **Design token dependencies:** `typography`, `colors`
- **Status:** Implemented.

---

## Components Not Yet Implemented

### Primitives (missing)

| Component | DESIGN.md Ref | Status |
|---|---|---|
| Icon | §6 | Not implemented |
| Card | §7.1 | Not implemented |
| Button | §7.2 | Not implemented |
| IconButton | §7.2 | Not implemented |
| Input | §7.3 | Not implemented |
| SearchInput | §7.3 | Not implemented |

### Feedback (missing)

| Component | DESIGN.md Ref | Status |
|---|---|---|
| StatusDot | §7.4 | Not implemented |
| StatusPill | §7.4 | Not implemented |
| StatusCallout | §7.4 | Not implemented |

### Navigation (missing)

| Component | DESIGN.md Ref | Status |
|---|---|---|
| ScreenHeader | §7.6 | Not implemented |
| BottomTabBar | §7.6 | Not implemented |
| BottomSheet | §7.5 | Not implemented |

### Infrastructure (missing)

| Item | Status |
|---|---|
| `src/components/index.ts` (barrel export) | Not implemented |
| `src/components/primitives/index.ts` | Not implemented |
| `src/components/feedback/index.ts` | Not implemented |
| `src/components/navigation/index.ts` | Not implemented |
| Component tests | Not implemented |
