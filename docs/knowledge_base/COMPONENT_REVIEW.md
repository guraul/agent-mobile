# COMPONENT_REVIEW.md

> Audit of current implementation against DESIGN.md.
> Scope: 2 components (Box, Text) + 8 theme token files.
> Method: line-by-line comparison of every source file against DESIGN.md.

---

## 1. Components Implemented

| Component | Location | Status |
|---|---|---|
| Box | `src/components/primitives/Box.tsx` | Implemented |
| Text | `src/components/primitives/Text.tsx` | Implemented |
| colors token | `src/theme/colors.ts` | Implemented |
| typography token | `src/theme/typography.ts` | Implemented |
| spacing token | `src/theme/spacing.ts` | Implemented |
| radius token | `src/theme/radius.ts` | Implemented |
| motion token | `src/theme/motion.ts` | Implemented |
| icons token | `src/theme/icons.ts` | Implemented |
| shadows token | `src/theme/shadows.ts` | Implemented |
| theme index | `src/theme/index.ts` | Implemented |

Total: 2 components + 8 token files.

---

## 2. Components Missing From Inventory

Per the original inventory task, the following components were specified but are not yet implemented:

### Primitives (6 missing)

1. **Icon** - §6. Wrapper around `lucide-react-native`. Enforces sizes xs/sm/md/lg, strokeWidth=2, color tokens.
2. **Card** - §7.1. Surface.1 background, 12px radius, 16px padding, pressed/selected states. No shadow.
3. **Button** - §7.2. Variants: primary (amber, pill), secondary (surface.2, 8px radius), ghost (transparent, amber text), destructive (error fill). scale(0.96) press. Loading/disabled states. Icon left placement.
4. **IconButton** - §7.2. 44x44 container, icon.md (20px), circular, transparent, pressed rgba(255,255,255,0.08).
5. **Input** - §7.3. TextInput with surface.1 bg, 8px radius, 44px min height, body typography, amber focus border animation.
6. **SearchInput** - §7.3. Leading Search icon, clear button, same base as Input.

### Feedback (3 missing)

7. **StatusDot** - §7.4. 8px circle, semantic colors, running pulse animation (opacity 0.4->1->0.4, 2000ms loop).
8. **StatusPill** - §7.4. Pill radius, semantic fill bg, semantic text color, dot + label.
9. **StatusCallout** - §7.4. Semantic fill bg, semantic border 30%, icon + title + body.

### Navigation (3 missing)

10. **ScreenHeader** - §7.6. 44px height, title typography, optional left/right icon buttons.
11. **BottomTabBar** - §7.6. Max 3 tabs, icon 20px, active amber / inactive muted, blur support.
12. **BottomSheet** - §7.5. Surface.3, top radius 16, scrim, slide animation, grabber.

### Infrastructure (5 missing)

13. `src/components/index.ts` - barrel export
14. `src/components/primitives/index.ts`
15. `src/components/feedback/index.ts`
16. `src/components/navigation/index.ts`
17. Component tests (Button variants, Card states, Status states, Input focus, accessibility labels)

**Total missing: 12 components + 5 infrastructure items.**

---

## 3. DESIGN.md Violations

### 3.1 Hardcoded Colors

**VIOLATION 1 - Text.tsx line 2: Unused import**
```typescript
import { Text as RNText, type TextProps, type TextProps as RNTextProps } from "react-native";
```
`TextProps` is imported but never used. Only `RNTextProps` is used (renamed on same line). This is a code cleanliness issue, not a design violation, but it produces a lint warning.

**Severity:** Low (code quality, not design)
**Fix:** Remove unused `TextProps` import.

---

**VIOLATION 2 - Box.tsx: `transparent` is a string literal, not a token**
```typescript
// Box.tsx line 40
transparent: "transparent",
```
The `colorMap` in Box.tsx includes `"transparent": "transparent"` as a hardcoded string. While "transparent" is a CSS keyword (not a hex color), DESIGN.md does not define a `transparent` color token. This is a convenience escape hatch that bypasses the token system.

**Severity:** Low
**DESIGN.md reference:** §1.2-§1.8 define all color tokens. No `transparent` token exists.
**Fix:** Acceptable as a layout utility (Box is a generic container that may need transparent backgrounds). However, it should be documented as a utility exception, not a design token. No change needed if Box is understood as a layout primitive, not a themed component.

---

**VIOLATION 3 - shadows.ts: `shadowColor: "#000000"` hardcoded**
```typescript
// shadows.ts lines 6, 13, 20
shadowColor: "#000000",
```
All three shadow definitions use `#000000` as a hardcoded string rather than referencing a token.

**Severity:** Low
**DESIGN.md reference:** §4.4 - "Shadows use `rgba(0, 0, 0, ...)` - pure black at low opacity for depth over dark surfaces." DESIGN.md explicitly specifies pure black for shadows. This is correct behavior, but the hex string is duplicated 3 times.
**Fix:** Extract a constant `const SHADOW_COLOR = "#000000"` at the top of the file, or reference `colors.scrim`'s color component. Since DESIGN.md says shadows use pure black (not the canvas warm-black), a local constant is the correct approach. This is a minor DRY issue, not a design violation.

---

### 3.2 Hardcoded Spacing Values

**No violations found.** All spacing in Box.tsx is resolved through `spacing[padding]` token lookups. No raw numbers appear in any component or theme file.

---

### 3.3 Duplicated Design Tokens

**VIOLATION 4 - Text.tsx: colorMap duplicates color resolution logic**
```typescript
// Text.tsx lines 33-48
const colorMap: Record<ColorToken, string> = {
  ink: colors.ink,
  body: colors.body,
  // ... 14 entries
};
```
Text.tsx maintains its own `colorMap` that maps string keys to `colors.*` values. This is a manual mapping that must be kept in sync with `colors.ts`. If a color token is renamed or added, this map must be updated separately.

**Severity:** Medium (maintenance burden, not a design violation)
**Fix:** Consider exporting a flat color map from `colors.ts` or a helper function `getColor(token: ColorToken): string` that components can share. This would centralize the mapping. Low priority since the color set is stable.

---

**VIOLATION 5 - Box.tsx: colorMap duplicates color resolution logic**
```typescript
// Box.tsx lines 34-41
const colorMap: Record<ColorToken, string> = {
  canvas: colors.canvas,
  "surface.1": colors.surface[1],
  // ... 6 entries
};
```
Same pattern as Text.tsx. Box maintains its own surface color map.

**Severity:** Low
**Fix:** Same as Violation 4. Could share a common color resolver.

---

### 3.4 Typography Violations

**No violations found.** All typography values in `typography.ts` match DESIGN.md §2.2 exactly:
- Font families: Inter (sans), JetBrains Mono (mono) - correct
- Weights: 400, 500, 600 only - correct (no 300 or 700+)
- Negative tracking on display/headline/title only - correct
- Positive tracking on captions (+0.1px) - correct
- Body at 16px (not 17px) - correct
- Line heights: tight at display, relaxed at body - correct

Text.tsx applies typography tokens correctly. No raw fontSize/fontWeight overrides are possible through the public API (the `style` prop is omitted from the spread via `Omit<RNTextProps, "style">`).

---

### 3.5 Radius Violations

**No violations found.** `radius.ts` matches DESIGN.md §4.1 exactly. Box.tsx uses `radius[rounded]` token lookups. No raw radius values appear anywhere.

---

### 3.6 Shadow Usage Violations

**No violations found.** No component uses shadows. The `shadows.ts` token file exists but is not yet imported by any component (no cards, buttons, or FABs are implemented yet). This is correct - shadows should only appear on floating elements per §4.4.

---

### 3.7 Business Logic in Components

**No violations found.** Box and Text are pure presentational components. No state management, no data fetching, no agent-specific logic, no navigation logic.

---

### 3.8 Components Outside Current Scope

**No violations found.** Only Box and Text are implemented. Both are explicitly in the primitives scope. No screens, no business components, no application logic.

---

## 4. Additional Issues (Code Quality)

### ISSUE 1 - Text.tsx: `align` type includes "auto"
```typescript
// Text.tsx line 53
align?: "auto" | "left" | "center" | "right" | "justify";
```
React Native's `textAlign` accepts `"auto" | "left" | "center" | "right" | "justify"`. However, "auto" is rarely useful and DESIGN.md does not mention text alignment. This is harmless but could be tightened to exclude "auto".

**Severity:** Negligible

---

### ISSUE 2 - Text.tsx: Props spread may leak style-related props
```typescript
// Text.tsx line 50
export interface TextProps extends Omit<RNTextProps, "style"> {
```
The `style` prop is omitted, which is correct - it prevents consumers from overriding typography tokens. However, `RNTextProps` also includes `allowFontScaling`, `maxFontSizeMultiplier`, and `suppressHighlighting` which affect text rendering behavior. DESIGN.md §8.4 requires support for Dynamic Type / font scaling. These props are currently passable but not defaulted.

**Severity:** Medium (accessibility)
**DESIGN.md reference:** §8.4 - "Support system font scaling on both platforms. Maximum scale: 1.5x."
**Fix:** When implementing Text (or in a follow-up), default `allowFontScaling` to `true` and `maxFontSizeMultiplier` to `1.5`. This is a missing feature, not a violation of existing code.

---

### ISSUE 3 - motion.ts: Easing structure is non-standard for React Native
```typescript
// motion.ts lines 10-13
easing: {
  out: { duration: 1, type: "bezier" as const, bezier: [0.2, 0, 0, 1] },
  // ...
}
```
The easing tokens store raw bezier arrays in a custom structure. React Native's `Animated` API uses `Easing.bezier(...)` and Reanimated uses `Easing.bezierFn(...)`. The current structure requires consumers to extract `.bezier` and spread it into the appropriate API. This is not wrong, but it's not directly usable either.

**Severity:** Low (ergonomics, not correctness)
**Fix:** When implementing animated components (Button, BottomSheet, StatusDot), create a helper that converts these tokens to the appropriate RN/Reanimated easing function. Or restructure to store `EasingFunction` instances directly if the animation library is known.

---

### ISSUE 4 - theme/index.ts: `theme` object does not aggregate type exports
```typescript
// theme/index.ts lines 22-31
export const theme = {
  colors,
  typography,
  spacing,
  radius,
  motion,
  iconSizes,
  iconStroke,
  shadows,
} as const;
```
The `theme` object combines all tokens, but `colors` is nested (e.g., `theme.colors.surface[1]`). This is fine for consumption. However, `TypographyStyle` is exported as a type but `TextStyleToken` and `TypographyToken` are also exported - three overlapping types for the same concept.

**Severity:** Negligible (type ergonomics)
**Fix:** Consolidate to one export name when convenient. Not blocking.

---

## 5. Recommended Fixes (Ordered by Priority)

### Priority 1: Missing Components (Blocking)

These are not violations of existing code, but they are blocking the component foundation from being complete. They must be implemented before the foundation is usable.

| # | Fix | Effort |
|---|---|---|
| P1.1 | Implement `Icon` (§6) - needed by Button, IconButton, Input, SearchInput, ScreenHeader, BottomTabBar | Small |
| P1.2 | Implement `Card` (§7.1) - needed by all content surfaces | Small |
| P1.3 | Implement `Button` (§7.2) - needed by all interaction surfaces | Medium |
| P1.4 | Implement `IconButton` (§7.2) - needed by ScreenHeader, Input clear button | Small |
| P1.5 | Implement `Input` (§7.3) - needed by all form surfaces | Medium |
| P1.6 | Implement `SearchInput` (§7.3) - extends Input | Small |
| P1.7 | Implement `StatusDot` (§7.4) - critical for agent status display | Medium (animation) |
| P1.8 | Implement `StatusPill` (§7.4) - depends on StatusDot | Small |
| P1.9 | Implement `StatusCallout` (§7.4) - depends on Text, Icon | Small |
| P1.10 | Implement `ScreenHeader` (§7.6) - depends on IconButton, Text | Small |
| P1.11 | Implement `BottomTabBar` (§7.6) - depends on Icon, Text | Medium |
| P1.12 | Implement `BottomSheet` (§7.5) - depends on Box, Text, scrim | Medium (animation) |

### Priority 2: Accessibility (Should Fix Before Components Ship)

| # | Fix | Effort |
|---|---|---|
| P2.1 | Add `allowFontScaling={true}` default to Text component (§8.4 Dynamic Type) | Trivial |
| P2.2 | Add `maxFontSizeMultiplier={1.5}` default to Text component (§8.4 max scale) | Trivial |

### Priority 3: Code Quality (Should Fix)

| # | Fix | Effort |
|---|---|---|
| P3.1 | Remove unused `TextProps` import in Text.tsx line 2 | Trivial |
| P3.2 | Extract `SHADOW_COLOR` constant in shadows.ts to avoid 3x duplication of `"#000000"` | Trivial |
| P3.3 | Create shared color resolver to eliminate colorMap duplication between Box and Text | Small |

### Priority 4: Infrastructure (Must Complete)

| # | Fix | Effort |
|---|---|---|
| P4.1 | Create `src/components/primitives/index.ts` barrel export | Trivial |
| P4.2 | Create `src/components/feedback/index.ts` barrel export (after feedback components exist) | Trivial |
| P4.3 | Create `src/components/navigation/index.ts` barrel export (after navigation components exist) | Trivial |
| P4.4 | Create `src/components/index.ts` root barrel export | Trivial |
| P4.5 | Write component tests: Button variants, Card states, Status states, Input focus, accessibility labels | Medium |

### Priority 5: Ergonomics (Nice to Have)

| # | Fix | Effort |
|---|---|---|
| P5.1 | Add motion easing helper to convert bezier arrays to RN/Reanimated easing functions | Small |
| P5.2 | Tighten `align` prop in Text.tsx to exclude "auto" | Trivial |
| P5.3 | Consolidate overlapping typography type exports in typography.ts | Trivial |

---

## 6. Summary

### Design Token Accuracy

| Token Category | Files | Values Correct | Violations |
|---|---|---|---|
| Colors | colors.ts | 33/33 | 0 design violations |
| Typography | typography.ts | 10/10 | 0 design violations |
| Spacing | spacing.ts | 8/8 | 0 design violations |
| Radius | radius.ts | 6/6 | 0 design violations |
| Motion | motion.ts | 10/10 | 0 design violations |
| Icons | icons.ts | 5/5 | 0 design violations |
| Shadows | shadows.ts | 3/3 | 0 design violations (1 DRY issue) |

**Token accuracy: 75/75 values match DESIGN.md. Zero design violations.**

### Component Accuracy

| Component | Props API | Token Usage | Design Violations |
|---|---|---|---|
| Box | Complete | All via tokens | 0 (1 utility exception for "transparent") |
| Text | Complete | All via tokens | 0 (1 unused import) |

**Component accuracy: 2/2 components match DESIGN.md. Zero design violations.**

### Overall Assessment

The implemented foundation is **clean and correct**. All 75 design token values match DESIGN.md exactly. Both implemented components (Box, Text) consume tokens properly with no hardcoded colors or spacing.

The main gap is **scope completion**: only 2 of 12 required components are implemented. The token layer is solid and ready to support the remaining 10 components.

No refactoring of existing code is required. The recommended fixes are:
1. Two trivial accessibility defaults on Text (P2.1, P2.2)
2. One trivial import cleanup (P3.1)
3. One trivial DRY fix in shadows.ts (P3.2)

All other work is **new component implementation**, not correction of existing code.
