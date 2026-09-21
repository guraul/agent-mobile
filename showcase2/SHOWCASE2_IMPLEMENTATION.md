# SHOWCASE2_IMPLEMENTATION.md

**Project:** Agent Mobile / Pulse
**Prototype:** Showcase2
**Location:** `/root/project/agent-mobile/showcase2`

## 1. Purpose

Showcase2 is an **independent interactive UI prototype** for Agent Mobile / Pulse.

Its purpose is to validate:

* product information architecture
* interaction model
* visual language
* transition behavior
* emotional character of the companion

before any UI changes are made to the production Agent Mobile MVP.

Showcase2 is a prototype, not a production feature branch.

---

## 2. Isolation

Showcase2 MUST remain isolated from the current production application.

### MUST NOT

* modify production screens
* modify production navigation
* modify BFF
* modify OpenCode integration
* modify product state
* modify database
* modify existing tests
* import production UI components
* call production APIs
* depend on OpenCode runtime

### MAY

Reuse only generic technical infrastructure where necessary to run the independent Expo prototype.

Prefer local implementation over runtime coupling to production code.

---

## 3. Product Model

Showcase2 explores a **single-surface AI companion**.

### Primary surface

`Pulse`

Pulse is the home surface where the AI proactively presents what it noticed, what it suggests, and what currently needs the user's attention.

### Conversation

`Talk`

Talk is NOT a top-level tab.

Talk is a contextual conversation mode entered from Pulse or from the global "talk to Pulse" affordance.

### Other capabilities

The following are NOT top-level destinations:

* Memory
* Knowledge Base
* Responsibilities

They appear contextually when relevant.

Do not expose internal domain entities as primary navigation merely because they exist in the backend.

---

## 4. Navigation Model

Use:

```text
Pulse
  ↓
contextual interaction
  ↓
Talk / Sheet / Detail
```

Do NOT use:

```text
Pulse | Talk | Memory | Me
```

No:

* bottom tab bar
* hamburger
* drawer
* dashboard navigation
* duplicate session-management screen

Pulse is the root.

Talk uses contextual navigation and normal back behavior.

---

## 5. Pulse

Pulse is the visual and conceptual center of Showcase2.

It should feel like:

> "The AI has been paying attention and is now telling me what matters."

It should NOT feel like:

> "I opened an event dashboard."

The current visual structure may contain:

* Needs You
* Suggested
* Noticed

but the implementation must not make the page feel like three business modules stacked vertically.

The `SHOWCASE2_VISUAL_SPEC.md` wireframe is a reference, not a mandatory pixel-by-pixel layout.

The prototype should be allowed to discover a more natural "AI note / AI presence" composition during implementation.

---

## 6. Pulse Actions

Actions should remain lightweight.

Avoid showing every possible action simultaneously.

Prefer:

```text
information
→ contextual action
→ conversation
→ explicit commitment when necessary
```

Especially:

### Suggested

"Discuss" must NOT confirm or activate anything.

"Confirm" is an explicit authorization action.

### Needs You

Review / discuss / defer may exist, but should not create a dense workflow toolbar.

### Noticed

Noticed is informational and visually quieter than the other categories.

---

## 7. Responsibilities

Responsibilities are contextual AI commitments.

Do NOT create a permanent `ON MY PLATE` section in the first Showcase2 Pulse implementation.

Do not turn Pulse into a responsibility dashboard.

A responsibility may appear contextually:

* in a conversation
* in a relevant Pulse item
* through a lightweight "watching" / "handling" indicator
* in a contextual detail sheet

The first prototype should discover where this information feels most natural rather than committing to a permanent section.

---

## 8. Memory and Knowledge

Memory and KB are AI capabilities, not navigation destinations.

### Memory

Memory should appear when relevant to the conversation.

Example:

```text
I remember you prefer architecture
decisions to be documented first.

[Why am I saying this?]
```

### Knowledge

Knowledge should appear as contextual sources:

```text
pricing-v3.md
standup-notes
```

The user should be able to open or ask about a source without navigating into a dedicated "Knowledge" application.

The first Showcase2 version does not need a full KB browser.

---

## 9. Talk

Talk is a full conversational workspace.

It should feel like entering the AI's conversational space, not opening another dashboard panel.

Required first-prototype behavior:

* open from Pulse
* preserve source context
* show contextual chip
* send a mock message
* show thinking state
* show mock AI response
* return to Pulse naturally

Talk may later evolve independently, but the first prototype should remain intentionally small.

---

## 10. Direct Conversation Entry

Because there is no Talk tab, Pulse must provide a clear way to initiate a conversation.

The implementation should provide a subtle but unmistakable affordance such as:

> Talk to Pulse

Do not use a traditional large floating action button unless the visual language clearly benefits from it.

The user should understand within a few seconds how to speak to the AI proactively.

In V2 the entry is docked at the bottom of Pulse beside a round "enter" button, and it is **not** a text input: tapping it pushes Talk, where the real composer (TextInput + Send) lives. Pulse never sends a message itself.

---

## 11. Mock Runtime

Showcase2 uses local mock state only.

At minimum, mock:

```text
runtime
pulse
attention
suggestions
noticed
conversation
proposals
assignments
memory
knowledge
```

Mock state must be interactive.

For example:

```text
Suggested
   ↓
Discuss
   ↓
Talk
   ↓
Back
```

must leave the proposal unchanged.

Whereas:

```text
Suggested
   ↓
Confirm
```

may transition:

```text
proposal = confirmed
assignment = active
```

No production state is affected.

---

## 12. Visual Source of Truth

`SHOWCASE2_VISUAL_SPEC.md` is the visual source of truth.

Implementation precedence:

1. `SHOWCASE2_VISUAL_SPEC.md`
2. this document
3. existing production UI

The production UI must NOT constrain Showcase2 visual design.

When the visual spec gives a range or an example rather than an absolute rule, prefer the option that creates the most coherent companion experience.

---

## 13. Reference Images

Reference images belong under:

```text
showcase2/references/
```

They are design references, not assets to copy.

Do not directly reproduce another application's:

* branding
* artwork
* illustrations
* exact layouts
* proprietary visual identity

Extract visual principles and create Agent Mobile's own expression.

---

## 14. First Implementation Scope

### Fully implemented

* Showcase2 app shell
* Pulse Home
* AI Presence
* Needs You
* Suggested
* Noticed
* Direct conversation affordance
* Pulse → Talk transition
* Mock Talk conversation

### Minimal placeholders only

* contextual Memory
* contextual KB
* contextual Responsibility

Do not implement a complete secondary information architecture in the first pass.

---

## 15. Quality Bar

The prototype is successful when:

### Product

A first-time user can naturally understand:

* "This is my AI."
* "It has been paying attention."
* "It found something worth telling me."
* "I can talk to it from here."

### Visual

The prototype feels:

* quiet
* intelligent
* futuristic
* restrained
* cohesive

It must NOT feel:

* cyberpunk
* gamified
* SaaS dashboard
* developer console
* generic AI chat app

### Interaction

Pulse → Talk should feel like:

> entering a conversation that already has context

not:

> opening another page with a card copied into it.

---

## 16. Stop Condition

The first implementation MUST stop after the agreed scope is complete.

Do not independently add:

* Memory pages
* KB browser
* Responsibilities dashboard
* notification center
* voice mode
* settings system
* session history UI
* additional tabs
* additional product concepts

The purpose of Showcase2 is to validate the core experience before expanding it.

