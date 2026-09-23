# Agent Mobile — Warm AI Companion Design System

> Version: 1.0
> Status: Design Specification
> Target: Expo / React Native / Android
> Visual reference: OpenChamber Light Theme
> Product identity: Agent Mobile / Pulse

---

## 1. Design Direction

Agent Mobile should move from a dark developer-tool aesthetic to a **Warm AI Companion** visual language.

The design should feel:

* warm
* calm
* intelligent
* technical but approachable
* lightweight
* content-focused
* personal rather than enterprise-dashboard-like

OpenChamber Light is used as a **visual reference**, not as a UI or product architecture to copy.

### Core visual idea

```text
Warm Paper
    +
Warm Dark Gray
    +
Burnt Orange Accent
    +
Subtle Borders
    +
Minimal Shadows
    +
Compact Typography
```

The product should NOT become a generic white SaaS application.

Avoid:

* pure white everywhere
* pure black text
* excessive blue
* excessive rounded cards
* glassmorphism
* heavy drop shadows
* gradients used for decoration
* excessive orange
* neon colors
* dark-mode remnants

---

# 2. Product Identity

The visual system must preserve Agent Mobile's product semantics.

```text
Pulse   = I noticed
Talk    = Let's think
Memory  = I remember
Me      = How we work together
```

Do not redesign these concepts into an OpenChamber-style coding interface.

OpenChamber provides inspiration for:

* visual hierarchy
* spacing
* typography
* drawers
* sheets
* session interaction
* compact information density
* agent activity presentation

Agent Mobile retains:

* Pulse
* Talk
* Memory
* Me
* Attention Items
* Agent Sessions
* Companion relationship model

---

# 3. Color System

## 3.1 Base surfaces

Use warm neutrals rather than pure white.

```text
background        #FDFCFA
surface           #FFFFFF
surface-muted     #F7F6F4
surface-elevated  #F8F7F5
surface-subtle    #F4F3F1
```

### Usage

```text
App background:
#FDFCFA

Navigation / secondary surface:
#F7F6F4

Cards:
#F8F7F5

Inputs:
#FFFFFF

Code / technical blocks:
#F4F3F1
```

Do not introduce large areas of pure `#FFFFFF` as the primary application background.

---

# 4. Text Colors

Use warm dark gray rather than black.

```text
text-primary      #393A34
text-secondary    #5C5C54
text-tertiary     #6B6B63
text-disabled     #9A9991
```

### Rules

Primary content:

```text
#393A34
```

Secondary descriptions:

```text
#5C5C54
```

Metadata / timestamps:

```text
#6B6B63
```

Disabled content:

```text
#9A9991
```

Never use pure black `#000000` for normal application text.

---

# 5. Brand / Accent

Primary accent:

```text
primary           #B35017
primary-hover     #9A4310
primary-active    #85390C
```

This is a muted burnt-orange / terracotta.

It is the main brand accent but must remain restrained.

### Correct usage

```text
Primary CTA
Active navigation
Selected state
Focus indicator
Important action
Agent activity indicator
```

### Incorrect usage

Do not make:

```text
every icon orange
every heading orange
every card orange
every button orange
```

The approximate visual balance should be:

```text
90% warm neutral
8% gray hierarchy
2% accent
```

---

# 6. Semantic Colors

```text
success           #5F8D3D
warning           #8D6C15
error             #B7493F
info              #2D72C4
```

These colors must be muted.

Avoid highly saturated Material-style colors.

Semantic colors should communicate state without becoming the visual focus.

---

# 7. Borders

```text
border            #E5E1DE
border-strong     #D8D5D0
border-hover      #CBC7C2
border-focus      #B35017
```

Prefer borders and subtle surface differences over shadows.

Example:

```tsx
{
  backgroundColor: '#F8F7F5',
  borderWidth: 1,
  borderColor: '#E5E1DE',
}
```

---

# 8. Shadows / Elevation

The design should be mostly flat.

Preferred hierarchy:

```text
surface difference
        ↓
border
        ↓
subtle shadow
        ↓
strong shadow
```

Avoid heavy shadows.

Cards normally use:

```text
background: surface-elevated
border: 1px solid border
shadow: none
```

Bottom sheets may use a very subtle elevation.

---

# 9. Typography

## 9.1 Font family

Preferred UI font:

```text
Inter
```

Preferred technical / code font:

```text
JetBrains Mono
```

If the existing project already has a suitable bundled font, preserve it only if it satisfies the visual requirements.

Do not introduce multiple UI font families.

---

# 10. Typography Scale

Use the following semantic scale.

```text
Display
28px / 34px
weight: 600

Screen Title
20px / 26px
weight: 600

Section Title
16px / 22px
weight: 600

Body
15px / 22px
weight: 400

Body Compact
14px / 20px
weight: 400

Label
13px / 18px
weight: 500

Metadata
12px / 16px
weight: 400

Micro
11px / 14px
weight: 400

Code
12px / 18px
weight: 400
```

### Weight rules

Use:

```text
400 body
500 labels / controls
600 titles
```

Avoid unnecessary 700/800 weights.

The hierarchy should come from:

* size
* weight
* spacing
* color

rather than heavy typography.

---

# 11. Spacing System

Use a 4px base scale with 8px as the dominant rhythm.

```text
4px
8px
12px
16px
20px
24px
32px
```

Semantic usage:

```text
4px   title/subtitle relationship
8px   icon/text gap, compact controls
12px  element groups
16px  normal padding
20px  comfortable padding
24px  section separation
32px  major layout separation
```

---

# 12. Screen Padding

Default Android screen padding:

```text
horizontal: 16px
```

For major content surfaces:

```text
16px
```

Do not use excessive horizontal padding on phone screens.

Tablet may increase outer content padding while preserving the same internal spacing system.

---

# 13. Component Spacing

Recommended defaults:

```text
Icon ↔ Text:
8px

Title ↔ Subtitle:
4px

List item internal spacing:
8px / 12px

Card internal padding:
16px

Card ↔ Card:
12px / 16px

Section ↔ Section:
24px

Major section:
32px
```

---

# 14. Radius

Use restrained rounding.

```text
small:
6px

standard:
12px

large:
16px

pill:
999px
```

Recommended:

```text
Buttons:
8px

Cards:
12px

Inputs:
10px

Bottom Sheets:
16px

Pills:
999px
```

Do not make every component highly rounded.

Avoid excessive `20px` / `24px` card radius.

---

# 15. Iconography

Use a single consistent icon family.

Preferred:

```text
Lucide / Lucide React Native
```

Default sizes:

```text
12px  micro
16px  standard
20px  navigation/action
24px  primary action
28px  prominent action
```

Icons should normally use:

```text
text-secondary
```

and become:

```text
primary
```

only for active/important states.

Do not fill the UI with decorative icons.

---

# 16. Bottom Navigation

Bottom navigation is part of the product identity.

Primary destinations:

```text
Pulse
Talk
Memory
Me
```

The selected state should use a subtle accent treatment.

Preferred:

```text
selected icon:
#B35017

selected label:
#393A34

selected background:
very light warm-orange tint
```

Do not use a solid orange navigation bar.

---

# 17. Pulse

Pulse should feel like an intelligent briefing surface.

It is not a dashboard.

It should communicate:

```text
I noticed something
```

### Visual hierarchy

```text
Pulse
  ↓
Attention Items
  ↓
Why it matters
  ↓
Relevant context
  ↓
Suggested action
```

Cards should remain visually lightweight.

Recommended:

```text
background:
#F8F7F5

border:
#E5E1DE

radius:
12px

padding:
16px
```

Use accent color selectively for:

* urgency
* active status
* action
* important agent state

Do not make every Attention Item orange.

---

# 18. Talk

Talk is the primary thinking/work surface.

It should borrow OpenChamber's compact information density but preserve Agent Mobile's companion identity.

Structure:

```text
Header
  ↓
Session context
  ↓
Conversation
  ↓
Agent activity
  ↓
Composer
```

Conversation should feel more like a focused workspace than a traditional messaging app.

---

# 19. User Messages

Recommended background:

```text
#F7F2EE
```

Text:

```text
#393A34
```

Radius:

```text
12px
```

Padding:

```text
12px 16px
```

Do not use blue bubbles.

Do not use strong shadows.

---

# 20. Agent Messages

Agent content should remain close to the application background.

```text
background:
#FDFCFA

text:
#393A34
```

The distinction between user and agent should primarily come from:

* alignment
* typography
* spacing
* metadata
* activity indicators

rather than strong colored bubbles.

---

# 21. Agent Activity

Agent activity includes:

```text
Thinking
Tool call
Running
Completed
Waiting
Error
```

Use compact technical surfaces.

Example:

```text
┌─────────────────────────────┐
│  Running                    │
│  Search repository          │
│                             │
│  2.4s                       │
└─────────────────────────────┘
```

Background:

```text
#F4F3F1
```

Border:

```text
#E5E1DE
```

Metadata:

```text
#6B6B63
```

Active indicator:

```text
#B35017
```

---

# 22. Composer

The composer is a primary interaction surface.

It should not look like a generic chat input.

Structure:

```text
┌─────────────────────────────────┐
│                                 │
│ Message...                      │
│                                 │
│ Context / attachment / actions  │
│                         Send ↑  │
└─────────────────────────────────┘
```

Recommended:

```text
background:
#FFFFFF

border:
#E5E1DE

focus border:
#B35017

radius:
12px

padding:
12px
```

The composer may expand vertically while typing.

Avoid excessive floating effects.

---

# 23. Memory

Memory should feel quieter than Talk.

It is:

```text
I remember
```

Therefore:

* lower visual density
* larger whitespace
* softer typography
* fewer controls
* narrative presentation

Memory should not look like a database table.

---

# 24. Me

Me represents the relationship between the user and the companion.

It should feel personal but restrained.

Avoid:

* gamification
* excessive avatars
* achievement badges
* artificial personality decorations

Use:

```text
warm surfaces
subtle typography
clear relationship settings
compact preference controls
```

---

# 25. Cards

Default card:

```text
background: #F8F7F5
border: 1px solid #E5E1DE
radius: 12px
padding: 16px
```

Cards should only be used when they establish meaningful grouping.

Do not put every piece of information into a card.

Prefer:

```text
content
content
divider
content
```

over:

```text
card
card
card
card
```

---

# 26. Drawers

OpenChamber's drawer interaction is useful inspiration.

Agent Mobile may use drawers for contextual navigation, but drawer contents must be Agent Mobile-specific.

Examples:

```text
Talk
  ↓
Session Drawer
```

or:

```text
Talk
  ↓
Context / Agent Work Drawer
```

The drawer should feel like a temporary workspace, not a permanent second application.

---

# 27. Bottom Sheets

Use bottom sheets for:

* contextual actions
* filters
* session actions
* detail views
* secondary tools

Do not use bottom sheets for primary navigation.

Recommended:

```text
background:
#FFFFFF

radius:
16px 16px 0 0

top border:
#E5E1DE
```

---

# 28. Empty States

Empty states should be calm and useful.

Avoid:

```text
Huge illustration
Huge icon
Marketing copy
```

Prefer:

```text
Short explanation

One useful next action
```

Example:

```text
Nothing needs your attention.

Your companion will surface something here
when there is a useful update.
```

---

# 29. Loading States

Prefer subtle motion.

Use:

* skeletons
* small progress indicators
* streaming indicators

Avoid large spinners dominating the screen.

---

# 30. Error States

Errors should be factual and actionable.

Use:

```text
error:
#B7493F
```

But avoid making the entire screen red.

Preferred hierarchy:

```text
small error indicator
      ↓
short explanation
      ↓
retry / action
```

---

# 31. Android Safe Area

All screens must correctly handle:

```text
status bar
navigation bar
display cutouts
gesture navigation
keyboard
```

Never hard-code screen heights.

Use safe-area insets.

---

# 32. Android Keyboard

The composer is a critical interaction.

When the keyboard opens:

```text
composer remains visible
content remains scrollable
latest relevant content remains accessible
```

Avoid:

```text
keyboard covers composer
keyboard causes full-screen layout jump
composer disappears
```

Keyboard behavior should be implemented and tested independently from the visual migration.

---

# 33. Tablet

The same design system must work on Android tablets.

Use responsive layout rather than creating an independent tablet design.

Conceptually:

```text
Phone
┌──────────────────────┐
│      Primary UI      │
└──────────────────────┘
```

Tablet:

```text
┌────────────┬───────────────────────┐
│ Context    │ Primary Content       │
│            │                       │
└────────────┴───────────────────────┘
```

Do not simply scale phone UI.

---

# 34. React Native Implementation

All visual constants must be centralized.

Do NOT write:

```tsx
backgroundColor: '#FDFCFA'
```

throughout individual components.

Instead:

```ts
colors.background
```

Likewise:

```ts
spacing.md
radius.card
typography.body
```

---

# 35. Recommended Token Structure

```ts
export const colors = {
  background: '#FDFCFA',
  surface: '#FFFFFF',
  surfaceMuted: '#F7F6F4',
  surfaceElevated: '#F8F7F5',
  surfaceSubtle: '#F4F3F1',

  textPrimary: '#393A34',
  textSecondary: '#5C5C54',
  textTertiary: '#6B6B63',
  textDisabled: '#9A9991',

  primary: '#B35017',
  primaryHover: '#9A4310',
  primaryActive: '#85390C',

  border: '#E5E1DE',
  borderStrong: '#D8D5D0',
  borderHover: '#CBC7C2',

  userMessage: '#F7F2EE',

  success: '#5F8D3D',
  warning: '#8D6C15',
  error: '#B7493F',
  info: '#2D72C4',

  codeBackground: '#F4F3F1',
}
```

---

# 36. Spacing Tokens

```ts
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
}
```

---

# 37. Radius Tokens

```ts
export const radius = {
  sm: 6,
  md: 10,
  card: 12,
  lg: 16,
  pill: 999,
}
```

---

# 38. Typography Tokens

```ts
export const typography = {
  display: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '600',
  },

  screenTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '600',
  },

  sectionTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },

  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  },

  bodyCompact: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  },

  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },

  metadata: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
  },

  micro: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '400',
  },

  code: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '400',
  },
}
```

---

# 39. Migration Rules

This is a visual-system migration, not a product redesign.

## Preserve

```text
Pulse
Talk
Memory
Me

Agent Session
Attention Item
Event
Assignment

Existing backend integration
Existing navigation semantics
Existing agent runtime
Existing business logic
```

## Replace

```text
Dark color system
Dark surfaces
Dark cards
Dark inputs
Dark navigation
Dark typography
Dark status treatment
Dark shadows
Legacy spacing inconsistencies
Hard-coded visual values
```

## Adapt from OpenChamber

```text
Warm light palette
Typography density
Surface hierarchy
Drawer interaction
Bottom sheets
Contextual actions
Agent activity presentation
Code presentation
Compact metadata
Responsive workspace concepts
```

## Do NOT copy blindly

```text
OpenChamber branding
OpenChamber information architecture
OpenChamber project/session semantics
OpenChamber coding-tool terminology
OpenChamber server assumptions
Capacitor architecture
WebView implementation
```

---

# 40. Migration Order

Do not redesign all screens simultaneously.

Recommended sequence:

```text
Phase 1
Design tokens
        ↓
Phase 2
App shell
        ↓
Phase 3
Bottom navigation
        ↓
Phase 4
Pulse
        ↓
Phase 5
Talk
        ↓
Phase 6
Composer
        ↓
Phase 7
Agent activity
        ↓
Phase 8
Memory
        ↓
Phase 9
Me
        ↓
Phase 10
Sheets / drawers / modals
        ↓
Phase 11
Tablet
        ↓
Phase 12
Accessibility / keyboard / safe area
```

Do not start by modifying individual colors inside individual components.

---

# 41. Acceptance Criteria

The migration is complete only when:

### Visual

* No primary dark surfaces remain.
* No dark-mode legacy colors remain unintentionally.
* Primary application background is warm rather than pure white.
* Primary text is warm dark gray rather than black.
* Burnt orange is used as the primary accent.
* Orange does not dominate the UI.
* Cards use subtle surfaces and borders.
* Heavy shadows are removed.
* Typography is consistent across all four product areas.

### System

* Colors are centralized.
* Typography is centralized.
* Spacing is centralized.
* Radius is centralized.
* Components do not introduce arbitrary visual tokens.
* No duplicated color systems exist.

### Product

* Pulse still means "I noticed".
* Talk still means "Let's think".
* Memory still means "I remember".
* Me still means "How we work together".
* Product semantics are not changed merely to imitate OpenChamber.

### Android

* Safe-area handling is correct.
* Keyboard does not obscure the composer.
* Composer behaves correctly while typing.
* Bottom sheets behave correctly with the keyboard.
* Touch targets remain usable.
* Scrolling remains stable during agent streaming.
* Tablet layouts use the same design language.

---

# 42. Visual North Star

The final product should feel approximately like this:

```text
                    AGENT MOBILE

     warm paper background
     #FDFCFA

     calm dark typography
     #393A34

     subtle warm surfaces
     #F7F6F4 / #F8F7F5

     restrained burnt-orange accent
     #B35017

     minimal borders
     #E5E1DE

     compact but comfortable typography

     little or no shadow

     content first
     agent activity second
     controls third
```

The desired emotional transition is:

```text
Before:

Developer Tool
Dark
Dense
Technical
Utility-oriented


After:

AI Companion
Warm
Calm
Focused
Intelligent
Personal
```

The implementation should preserve Agent Mobile's existing product model while replacing its visual language with this system.
