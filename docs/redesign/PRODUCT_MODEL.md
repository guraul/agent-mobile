# PRODUCT_MODEL.md

## 1. Product Vision

Agent Mobile / Pulse is a persistent, Jarvis-like AI companion.

Its purpose is not to provide a collection of independent AI tools. Instead, it provides one continuous AI relationship that can:

* understand what the user is currently working on
* remember relevant information about the user and their work
* accept responsibilities from the user
* perform work asynchronously through different capabilities
* monitor ongoing work
* return to the user when something requires attention
* continue unfinished discussions
* help the user think, decide, and delegate

The current implementation uses OpenCode as the underlying Agent Runtime.

OpenCode is an implementation choice, not the product identity.

The runtime may eventually be replaced by:

* Pi
* DSH
* another agent runtime
* a custom Agent implementation

The user should continue to experience the same companion regardless of the underlying runtime.

### Core principle

> One companion, multiple capabilities, continuous context.

The current interaction medium is Chat.

Voice is a future interaction channel and may initially be represented as a placeholder. The conversational model must not depend on voice being available.

---

# 2. Product Mental Model

The product has four primary user-facing surfaces:

| Surface | Meaning                                |
| ------- | -------------------------------------- |
| Pulse   | **I noticed.**                         |
| Talk    | **Let's think.**                       |
| Memory  | **I remember.**                        |
| Me      | **I understand how we work together.** |

These are not four separate assistants.

They are different surfaces through which the same AI companion interacts with the user.

The user should not feel that they are moving between unrelated applications when moving between these surfaces.

---

# 3. Core Runtime Model

The current system can be understood as:

```text
                    Agent Mobile

                         │
                         ▼
                  Agent Session
                         │
                         ▼
                  Agent Runtime
                         │
                      OpenCode
```

Supporting context and responsibilities surround the Agent Session:

```text
                  Agent Session
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
   Knowledge Base    Memory    Assignments
          │            │            │
          └────────────┴────────────┘
                       │
                       ▼
                Current Context
```

OpenCode currently provides:

* LLM interaction
* agent execution
* conversation session
* tool execution
* streaming
* coding actions
* project/session context

Agent Mobile should build product semantics around the Agent Session rather than around OpenCode-specific implementation details.

---

# 4. Agent Session

## Definition

> **An Agent Session is a bounded conversational workspace in which the user and Agent work on a current intent or topic.**

An Agent Session represents the current conversational/work state.

It may be associated with:

* current conversation
* current objective or topic
* working context
* relevant Knowledge Base information
* relevant Memory
* relevant domain context
* Assignments created during the conversation

Knowledge Base and Memory are context sources for a Session. They are not part of the Session's permanent conversation state.

The Agent Session is where current thinking and decision-making happen.

It is not:

* the long-term memory store
* the Knowledge Base
* an Assignment
* an Event
* an Attention Item
* an Open Thread

---

## 4.1 Agent Session and OpenCode Session

Currently:

```text
Agent Session
      ↓
OpenCode Session
```

An OpenCode Session is therefore the current runtime representation of an Agent Session.

For the current MVP:

> **One Agent Session is backed by one OpenCode Session.**

The product must avoid depending on OpenCode-specific concepts so that the runtime can later be replaced.

Conceptually:

```text
Agent Session
      │
      ├── OpenCode Session
      ├── Pi Session
      ├── DSH Session
      └── Custom Runtime Session
```

The product-level Session concept remains stable even when the underlying runtime changes.

---

## 4.2 Session Lifecycle: Create, Resume, Reconstruct

An Agent Session can be handled in three different ways.

### Create

A new Agent Session is created when the user starts a new conversation or when a new conversation is required.

```text
Create
  ↓
New Agent Session
  ↓
New runtime session
```

For the current implementation:

```text
Create
  ↓
New Agent Session
  ↓
New OpenCode Session
```

### Resume

An existing Agent Session is resumed when the user continues work that already has an existing Session.

```text
Resume
  ↓
Existing Agent Session
  ↓
Existing OpenCode Session
  ↓
Existing conversation/context
```

Resume should preserve the existing Session context rather than reconstructing it from Knowledge Base and Memory.

### Reconstruct

A new Agent Session may occasionally need to be created from the context of an older Session.

```text
Old Agent Session
      ↓
Relevant context extraction
      ↓
Knowledge Base
      +
Memory
      +
necessary summary
      ↓
New Agent Session
      ↓
New OpenCode Session
```

This is not a Resume.

It creates a new Session that inherits relevant knowledge from the previous context.

### Core rule

> **Default behavior is Resume when an existing Agent Session is available. Reconstruct is only used when a new Session is intentionally required or the original Session can no longer be used.**

---

## 4.3 Session is bounded

A Session should not be treated as an infinite global conversation.

When a new Session is created or a Session needs additional context, the product should prefer:

```text
Current Session

+

Relevant Knowledge Base

+

Relevant Memory

+

Relevant Domain Context
```

rather than loading unlimited historical conversation.

For an existing OpenCode Session, the existing Session context should be reused whenever possible.

The long-term continuity of the companion comes from:

* Memory
* Knowledge Base
* Open Threads
* Assignments
* persistent domain state
* relevant historical context

not from requiring every past conversation to remain in the active LLM context forever.

---

# 5. Knowledge Base

The Knowledge Base represents persistent knowledge about the user's world.

Examples include:

* project documentation
* architecture
* product knowledge
* technical documentation
* research
* previously recorded ideas
* structured and unstructured knowledge

The current Knowledge Base is implemented using an llm-wiki-based skill.

The Agent should access it as a capability.

Conceptually:

```text
Agent Session
      ↓
Knowledge Base Skill
      ↓
Relevant Knowledge
```

The complete Knowledge Base should not automatically become Session context.

The Agent should retrieve relevant information as required.

The Knowledge Base may also contain Raw Ideas that are worth preserving but do not currently require action or continuation.

The Knowledge Base answers a different question than Memory (see 6): **what can be retrieved later**, not what should be remembered about the user. It is also not Session history — conversations live in Agent Sessions; the Knowledge Base holds retrievable knowledge.

---

# 6. Memory

Memory represents persistent understanding about:

* the user
* user preferences
* working style
* prior decisions
* relationship-level understanding
* useful information about current projects or work

The current implementation uses an OpenCode plugin that silently records relevant information to persistent storage.

Memory should remain mostly invisible during normal interaction.

The Agent may load relevant Memory into a Session when appropriate.

Conceptually:

```text
Agent Session
      ↓
Relevant Memory
      ↓
Current Context
```

Memory is not:

* the complete conversation history
* every user statement
* every temporary fact
* every idea
* every unfinished conversation

Memory must remain selective.

### Memory and Knowledge Base

Memory and the Knowledge Base answer different questions:

* **Memory:** what must we remember about the user, the relationship, the working style, and durable context?
* **Knowledge Base (see 5):** what knowledge will we need to retrieve later?

Memory is not the chat history, and the Knowledge Base is not the user's Memory. The same fact may legitimately leave both representations — a preference ("smallest safe change before a release") may live in Memory as relationship understanding while the release process it refers to lives in the Knowledge Base as project knowledge — because the two carry different semantics (how we work vs. what is true and retrievable), not duplicated storage.

When a Session is resumed, the two serve different needs: Memory shapes how the Agent works with the user (style, preferences, durable context); the Knowledge Base is retrieved on demand for the facts and knowledge the conversation needs (see 4.3).

If a fact's two representations later diverge, neither automatically overrides the other: re-judge from the fact's semantic owner — user/relationship understanding belongs to Memory, project/world knowledge belongs to the Knowledge Base — and from the latest evidence. When the Agent performs this judgment, it is a **reconciliation / re-evaluation**, not a lifecycle transition of either side.

---

# 7. Context Composition

An Agent Session may use several context sources:

```text
                 Agent Session
                       │
       ┌───────────────┼───────────────┐
       ▼               ▼               ▼
Current Session   Knowledge Base     Memory
                       │
                       ▼
                Relevant Domain Context
                       │
                       ▼
                Current Context
```

For an existing runtime Session, the existing Session context should normally be preserved.

Additional context may be retrieved when required.

Example:

```text
Project 2

OpenCode Session 123

Attention: Review Project 2

Relevant KB

Relevant Memory

       ↓

Agent Session Context
```

For a domain that does not have an existing Agent Session, a new Session may instead be created with relevant domain context.

Example:

```text
Market Event

Fund X matched monitoring rule

        ↓

New Agent Session

        +

Market context

        +

Relevant KB

        +

Relevant Memory
```

The goal is not to construct a universal context.

The goal is to construct the **smallest relevant context for the current conversation**.

---

# 8. Direct Talk and Contextual Talk

Talk has two primary entry modes.

## 8.1 Direct Talk

The user proactively starts a new conversation.

Every new Direct Talk starts a new Agent Session.

For the current implementation:

```text
User opens Talk
      ↓
New Agent Session
      ↓
New OpenCode Session
```

The Agent initially does not need to know the final domain.

As the conversation develops, the topic and intent may become clear.

The Session can then create an Assignment.

Example:

```text
Direct Talk

      ↓

Discuss

      ↓

Understand intent

      ↓

Confirm

      ↓

Assignment → Market
```

Direct Talk should not automatically preload all Projects, Market information, Attention Items, Memory, or Knowledge Base content.

Relevant context should be retrieved based on the conversation.

---

## 8.2 Contextual Talk

Contextual Talk occurs when the user chooses to engage with a specific Pulse Attention Item or another existing context.

The key rule is:

> **If the Attention is associated with an existing Agent Session, Contextual Talk resumes that Session. If no Agent Session exists, Contextual Talk creates a new Session using the relevant domain context.**

### Existing Agent Session

Example:

```text
Pulse

"Project 2 is ready."

       ↓

[Let's talk]

       ↓

Existing Agent Session

       ↓

Existing OpenCode Session

       ↓

Resume
```

The original conversation and runtime context are preserved.

The user should not need to explain the project again.

### No existing Agent Session

Some capabilities may generate Events and Attention without an Agent Session.

For example, the current Market monitoring system is a deterministic scheduler/rule engine.

```text
Market Scheduler

      ↓

Rule matched

      ↓

Event

      ↓

Attention

      ↓

[Let's talk]

      ↓

New Agent Session

      ↓

New OpenCode Session

      +

Market context

      +

Relevant KB

      +

Relevant Memory
```

This is **Create**, not Resume.

The new Session is contextualized by the Event/Attention that caused the conversation.

### Core rule

```text
Existing Agent Session
        ↓
      Resume

No Agent Session
        ↓
       Create
        ↓
Relevant context
```

This distinction is important because not every capability is itself an Agent Runtime.

---

# 9. Talk

Talk is the bidirectional conversational surface of an Agent Session.

Its purpose is to:

* discuss
* investigate
* clarify
* challenge assumptions
* make decisions
* confirm intentions
* create Assignments
* continue unfinished discussions

Talk is not:

* a generic ChatGPT replacement
* a capability directory
* a dashboard
* a notification center
* a second unrelated chat system
* a requirement for every Pulse item

### Important rule

> **Pulse can speak without being interactive; Talk is where the user and Agent have a full two-way conversation.**

In the current Chat-first implementation:

```text
Pulse

   ↓

User explicitly chooses to engage

   ↓

Talk

   ↓

Input becomes available
```

There should not be a permanent generic chat input on Pulse simply to simulate future voice functionality.

Talk is an interaction surface. It does not itself determine whether the underlying Session is new or existing.

---

# 10. Assignment

## Definition

> **An Assignment is a responsibility that the Agent has explicitly accepted and delegated to a capability or execution system.**

A user instruction expressing a future responsibility first becomes an **Assignment proposal** — the system's interpreted intent. The proposal becomes an **Active Assignment** when the confirmation required for its risk level has happened (see Activation below).

An Assignment may define a **trigger mechanism**: the internal definition of which future conditions should surface the matter to the user (a time point, a schedule plus rule, a state to watch, or the completion of delegated work).

The trigger mechanism is **not an independent product object** — it is an internal mechanism of the Assignment (see 16.3).

Examples:

```text
"Continue Project 2 tonight."

        ↓

Assignment → OpenCode
```

```text
"Monitor Fund X every day at 14:50."

        ↓

Assignment → Market
```

Assignment represents delegated responsibility.

It is not the same as:

* a chat message
* an Event
* an Attention Item
* an ordinary instruction
* a Knowledge Base entry
* a Memory
* an Agent Session

An Assignment is not an Attention Item — but its authorized trigger conditions are one of the legitimate sources of Attention Items (see 16.3).

## Activation

An Assignment is not necessarily active when the user first expresses the intention:

```text
User instruction
      ↓
Assignment proposal / interpreted intent
      ↓
Confirmation when required
      ↓
Active Assignment
```

The confirmation requirement depends on risk and impact:

* **Low-risk personal reminders** may become active directly from the user's explicit instruction.
* Responsibilities with **external impact, ongoing monitoring, or meaningful consequences** require confirmation before becoming active.
* An Assignment must **not silently become active** based only on ambiguous conversation. If the intent is unclear, the Agent asks; until then, only a proposal exists.

### Minimal judgment principle

Whether confirmation is required follows a simple gradient:

* **Direct activation** from an explicit user instruction: low-risk, personal in scope, reversible, no external impact.
* **Explicit confirmation required** before activation: ongoing monitoring, sustained action on the user's behalf with external impact, financial matters, external communication, irreversible operations, or other meaningful consequences.
* **Ambiguous intent is never activated silently** — the Agent asks first, every time.

Ongoing monitoring deserves special note: it is not automatically high-risk *execution*, but it is a **sustained responsibility** — the user must knowingly accept that the system will keep carrying it. Establishing that awareness is what the confirmation step is for.

The per-domain matrix below applies this gradient to the current domains.

### Per-domain confirmation matrix

Three axes decide — not a single risk score:

* **Execution risk** — what acting could do (irreversible, destructive, hard to undo).
* **Responsibility persistence** — how long the obligation lives (one moment vs. ongoing).
* **External impact** — whether the Assignment reaches beyond the user's own sphere on their behalf.

**Direct activation from an explicit instruction requires all three axes to be low: low execution risk, momentary responsibility, no external impact. Any single axis crossing the line requires confirmation first.** Ongoing monitoring therefore needs confirmation even when execution risk is zero — persistence alone is the reason.

This matrix governs **activation confirmation** — whether a proposal may become an Active Assignment. It is a different moment from **action-time approval** during execution (the "Requires confirmation" items in 12; see 14); both may apply to the same Assignment. The matrix sets when confirmation is *required*; the Agent may always confirm a proposal voluntarily.

| Domain | Direct activation? | Confirmation required when | Confirmation authorizes |
|---|---|---|---|
| Personal reminder (one-shot) | **Yes** — an explicit, unambiguous instruction activates directly (low risk, personal, momentary, no external impact) | the instruction is ambiguous about time or content, or the "reminder" asks the Agent to *do* something beyond reminding | the responsibility (fire once) and its future trigger (the time); no execution scope |
| Coding / OpenCode delegated work | **Yes** — for reversible work in the user's own projects; the Agent may still confirm scope when the work runs unattended or overnight (see 31) | the work touches production or external systems, involves irreversible operations, or the scope is vague ("improve things") | the responsibility, the execution scope, and — if requested — the completion trigger ("tell me when it's done", see 31) |
| Market monitoring / financial observation | **No** — a standing responsibility requires confirmation even though execution risk is low | always at activation (the user must knowingly accept the persistent responsibility) | the responsibility (ongoing) and the future trigger conditions (schedule, threshold → Attention); trade execution is never authorized at activation — it remains action-time approval |
| External communication / email / message | **No** for ongoing organizing or watching; a one-shot "draft a reply" is an ordinary instruction (13), not an Assignment | always at activation for ongoing responsibilities | the responsibility, a read/draft execution scope, and future triggers (e.g. important email arrives → Attention); send and delete are never authorized at activation — always action-time approval |
| Other ongoing monitoring (build watching, "tell me if it fails", …) | **No** | always at activation | the responsibility (ongoing) and the authorized trigger conditions; execution scope follows the underlying domain |

Composition rule: when a proposal spans several domains, the **strictest** confirmation requirement among them applies.

Two standing rules cut across every row:

* The Agent may **propose**; it can never treat its own judgment — or "the user said something like this before" — as authorization. Prior conversation is context for a proposal; authorization happens only at the confirmation moment (see 12).
* This matrix governs **Assignment activation**. It does not govern when a named observation rule may be permitted — that authority path lives in 16.2 and 19 and is not an Assignment authorization.

### Unconfirmed proposal

A proposal is not an Active Assignment, and it is never silently promoted into one:

* a proposal runs **no trigger mechanism** and produces **no Attention Item**
* user silence, continued conversation, or the Agent's own judgment never activate a proposal — only explicit acceptance under the activation rules above does
* a proposal does not enter the Assignment lifecycle — the lifecycle below begins only at activation
* no additional lifecycle state is introduced for proposals; a proposal is simply the stage *before* an Assignment exists

A proposal may be clarified further — it remains a proposal until one of four endings:

* **Accepted** — the user explicitly confirms the interpreted intent. Acceptance is the activation moment: `proposal → activation → Active Assignment`, and the confirmed proposal becomes part of the Assignment's provenance (see 12, 16.2).
* **Rejected** — the user declines the proposal. Nothing becomes active; no trigger mechanism runs; no Attention Item is produced.
* **Canceled** — the proposal is withdrawn before activation — by the user, or by the Agent when it has become moot. Same outcome as rejection: there never was an Assignment.
* **Expired** — the proposal lapses naturally: the user never responds, the conversation has moved on, or its condition is no longer relevant (for example, the moment it was meant to remind about has passed). Expiration is passive — no ceremony, no residue beyond what retention keeps.

A rejected, canceled, or expired proposal never enters the Assignment lifecycle. If its history is kept at all, it lives only as proposal/provenance history and must remain distinguishable from an Assignment that was activated and later Revoked or Completed. Whether proposal history is kept is a retention and audit policy decision, not a product-model requirement.

Duplicates: when an Active Assignment already covers the same responsibility, a new proposal for it is redundant. The Agent should point to the existing Assignment rather than propose a parallel one — a duplicate proposal must never quietly become a second, implicit responsibility. This is a semantic principle, not a deduplication mechanism.

## Lifecycle

An Assignment has its own lifecycle, separate from the Attention Item lifecycle (see 16, 17). The business lifecycle has three states:

* **Active** — the responsibility is currently accepted; trigger mechanisms may run.
* **Revoked** — the user explicitly withdrew the responsibility; future execution and trigger evaluation stop. Existing Attention Items are **not** automatically changed (see 11).
* **Completed** — the responsibility has been discharged: for a one-shot Assignment, its single execution opportunity was consumed and nothing further will fire; for an ongoing Assignment, an end condition that was part of its authorized responsibility has been met (see 11). The underlying outcome — success or failure of the work — is recorded as the completion reason, not as a separate state.

Beyond the business states there is a **retention status**: a finished Assignment — Completed or Revoked — is **archived**: no longer used as an active responsibility, but kept for provenance and audit (see 16.2). Archived is not a fourth business state parallel to the others; it describes what happens to the record after the business lifecycle ends.

An Assignment never becomes an Attention Item, and an Attention Item is never an Assignment state: the two lifecycles are independent — in both directions:

* **Assignment Completed ≠ Attention Handled.** An Assignment is Completed when its responsibility is discharged; what the user later does with the Attention Items it produced belongs to the Attention lifecycle. Handling one Attention says nothing about the Assignment, and an ongoing Assignment is never Completed by an Attention being Handled (see 11).
* **Assignment Revoked ≠ Attention Dismissed or Expired.** Revocation stops the Assignment; existing Attention Items stay as they are (see 11).

The transition into Completed is auditable like every other authorization moment: the original Assignment authorization, the completion reason, and the completion moment are part of its provenance (see 12).

---

# 11. One-shot and Ongoing Assignments

One-shot reminders and ongoing monitoring are both Assignments. They share the same responsibility model; the mode is a property of the Assignment, not two different concepts.

### One-shot Assignment

A single future trigger or single execution, consumed after it runs.

Examples:

> "Continue Project 2 tonight."

> "Remind me tomorrow to review Project X."

Completion happens when the execution opportunity is consumed: the trigger has fired and the authorized surfacing has happened — or was legitimately suppressed (see 16.3). At that point:

* the Assignment produces no further Attention Items
* the outcome of the underlying work — success or failure — is recorded as the completion reason, not as a separate state
* historical Assignment information remains available for provenance and audit

Completion does **not** require the user to accept the result, and does **not** wait for resulting Attention Items to be Handled — those belong to the Attention lifecycle. Only if the authorization itself made user acceptance part of the responsibility ("draft it and wait for my OK") does Completion wait for it. Completion also does not make the Assignment disappear — the responsibility has been discharged and nothing further will fire.

### Ongoing Assignment

Repeated evaluation of its trigger condition, until revoked.

Example:

> "Monitor Fund X every day at 14:50 and tell me if the threshold is crossed."

```text
Assignment

→ Market

→ daily schedule

→ remains active until revoked
```

An ongoing Assignment may evaluate many times without producing an Attention Item: no trigger match means no Attention (see 16.3).

An ongoing Assignment is **never** Completed by a single trigger match, a single execution, or one of its Attention Items being Handled. It remains Active until:

* the user **Revokes** it (see below), or
* an **end condition that was part of its authorized responsibility** is met — for example "watch Fund X until I sell it". If no end condition was authorized, only Revocation ends it.

### Revocation and Attention are independent

Assignment lifecycle and Attention Item lifecycle are independent:

```text
Active:      Monitor Fund X
Trigger matches  →  Attention Item created
Later:       user revokes the monitoring
Result:      future monitoring stops;
             existing open Attention Items remain unchanged
```

Revocation rules:

* revocation is executed **explicitly by the user**
* revocation itself must be auditable
* the Agent may **suggest** revocation, but a suggestion alone never revokes a responsibility the user has authorized
* after revocation, future execution and trigger evaluation stop
* existing Attention Items are not automatically dismissed or expired — they wait for the user's own handling (see 17)

---

# 12. Assignment Authorization

The Agent's autonomy comes from the Assignment.

> **The Agent may act within the scope explicitly granted by the Assignment.**

Assignment authorization is the source of authority for:

* what responsibility the Agent accepts
* what actions the Agent may perform
* which future trigger conditions may create Attention Items

The authorization moment — the confirmed instruction that made the Assignment active — must be auditable through provenance (see 10, 16.2).

An Assignment should conceptually define:

* responsibility
* target
* allowed action
* execution conditions
* schedule, when applicable
* constraints
* expected result
* which future conditions may produce an Attention Item

An Attention Item created from an Assignment carries that authorization as its creation reason (see 16.2, 16.3).

Examples:

### Coding

```text
Assignment:

Continue Project 2

Allowed:

- inspect code
- modify code
- run tests

Requires confirmation:

- high-risk production deployment
```

### Market

```text
Assignment:

Monitor Fund X

Allowed:

- obtain market data
- evaluate rules
- notify user

Requires confirmation:

- execute financial transaction
```

### Email

```text
Assignment:

Organize important emails

Allowed:

- read
- classify
- summarize
- draft

Requires confirmation:

- send
- delete
```

The Agent must not interpret an Assignment as unlimited authority over the associated domain.

Whether a responsibility requires confirmation before activation follows the per-domain confirmation matrix (see 10). The "Requires confirmation" items above are a different moment — action-time approval during execution — not activation confirmation.

---

# 13. Assignment and User Instructions

Not every instruction leads to an Assignment.

### Current instruction

> "Check Project 2."

The Agent checks it and returns the result.

No Assignment is needed — this is work performed in the current conversational turn.

### Future-directed responsibility

> "Keep checking Project 2 tonight and tell me when it's done."

The instruction forms an **Assignment proposal** (see 10); once the activation requirement for its risk level is met, it becomes an **Active Assignment**. A low-risk, unambiguous personal reminder may be activated directly by the user's explicit instruction.

The distinguishing characteristic is:

> **The Agent takes ongoing responsibility beyond the current conversational turn.**

An ordinary instruction — even about the same subject — never silently becomes an Assignment.

---

# 14. Agent Autonomy Boundary

The Agent should have autonomy based on:

* explicit authorization
* action risk
* reversibility
* external impact

Conceptually:

### Low-risk, reversible, clearly authorized

The Agent may execute autonomously.

### Moderate-impact actions

The Agent may investigate, prepare, and recommend, then return to the user for confirmation where appropriate.

### Irreversible, externally consequential, financially consequential, or high-risk actions

The Agent should ask for confirmation before execution.

Important principle:

> **The Agent should be capable of acting without asking for permission at every step, but it must not infer unlimited authority from a vague instruction.**

If an Assignment becomes unsafe, ambiguous, or inconsistent with its original scope, the Agent may stop and create an Attention Item requesting the user's decision (an Assignment becoming unsafe or ambiguous is an attributable condition under 16.2 — not Agent curiosity).

---

# 15. Event

An Event represents a fact about something that happened.

Examples:

```text
OpenCode:

Project 2 session completed.

Market:

Fund X matched rule R03.

Email:

Important email received.

Planning:

Schedule conflict detected.
```

An Event answers:

> **What happened?**

An Event is not necessarily something the user needs to see.

For example:

```text
OpenCode session started
```

may be an Event without becoming an Attention Item — and without being shown to the user at all: presenting an Event requires its own authority (see 20, 22).

An Event may originate from:

* an Agent Runtime
* a deterministic scheduler
* a rule engine
* an external integration
* an Agent observation

---

# 16. Attention Item

## Definition

> **An Attention Item is a persistent, user-facing record that the system has judged — by an explicit rule or an explicit user instruction — that something currently deserves the user's handling.**

An Attention Item is a judgment, not a fact.

Event, Attention, and Pulse must remain distinct:

```text
Event
= What happened?

Attention Item
= What the system decided currently deserves the user's handling

Pulse
= How that Attention is presented to the user
```

Every Attention Item has:

* a **subject** — the underlying matter it is about (a fund, a project, a session); the subject outlives the item
* a **creation reason (provenance)** — the named rule or the explicit user instruction / Assignment authorization that justified it (see 16.2)
* **supporting evidence** — the Event(s) that triggered the judgment, referenced when they exist (see 16.2, 19)
* an optional **session reference** — the OpenCode Session it relates to, when one exists
* a **lifecycle state** (see 17)

An Attention Item is not:

* an Event
* a runtime state (idle / busy / retry)
* the underlying subject itself
* an Assignment
* a Pulse card (Pulse renders it)

Examples:

```text
Project 2 completed

        ↓

Attention:

Review Project 2
```

```text
Market rule triggered

        ↓

Attention:

Review Fund X
```

## 16.1 What becomes an Attention Item — and what never does

The same Event can have three different fates:

```text
Event
  ↓ judged against a named rule or explicit user instruction
├─ no rule applies / no user action possible → Event only (log)
├─ worth telling, nothing to decide          → Pulse statement (L1, see 22), no item
└─ user handling required now                → Attention Item
```

Attention creation must pass two tests:

* **User-action test.** A plausible user action must exist that changes the outcome. If nothing the user does changes anything, it is not an Attention.
* **Delegation-closure test.** Completion of a delegated, asynchronous task may become an Attention because the user explicitly asked to be told. Completion of an interactive exchange may not: the user was in the loop, and the runtime returning to idle is a technical state, not an obligation.

| Occurrence | Fate |
|---|---|
| Fund publishes an estimate | Event only — informational |
| OpenCode session turns idle after an interactive turn | Event only — never an Attention |
| OpenCode permission request (agent blocked) | Attention — the user must approve or reject |
| Fund crosses the user-configured threshold | Attention — the user defined the rule |
| Delegated async task completes ("tell me when done") | Attention — delegation closure |

## 16.2 Provenance and Creation Authority

Every Attention Item must carry an **explicit, auditable creation reason**.

Allowed sources:

* an explicit user instruction / Assignment authorization (see 16.3)
* a named deterministic rule (e.g. a user-configured threshold)
* a named Agent observation rule (see 19)

An Agent must not create an Attention merely because it considers something interesting.

These sources differ in authority and must not be conflated: an explicit user instruction or Assignment authorization is **direct authorization from the user**, while a named deterministic or Agent observation rule is **a standing rule allowed to judge on the user's behalf**. Where an observation rule itself requires authorization, that authorization is its own step — it must not be borrowed from, or mistaken for, an Assignment authorization.

Supporting Events are referenced when they exist, but an Event is not an absolute prerequisite. An Attention created directly by an explicit user instruction must not manufacture an artificial Event merely to satisfy the model.

These authorities create Attention Items; permission to speak informationally (L1, see 20, 22) is a separate authorization, not a byproduct of creation authority.

## 16.3 Instruction-born Attention Items

A future-directed user instruction does not immediately create an Attention Item.

Example:

> "Remind me tomorrow to review Project X."

What the instruction forms here is a one-shot **Assignment proposal** that becomes active immediately — a low-risk personal reminder is activated directly by the user's explicit instruction (see 10) — carrying an **internal trigger mechanism** that holds the condition ("tomorrow") and what to surface. What earlier drafts described as a "pending trigger" is not an independent product object; it is this internal trigger mechanism of the Assignment:

```text
User Instruction
      ↓
Assignment
      ↓
Trigger Condition
      ↓ (condition becomes true, handling required)
Attention Item
      ↓
OPEN
```

No Attention Item exists before the trigger condition is satisfied. Therefore:

> **An Attention Item's lifecycle starts when the user needs to handle the matter, not when the user first expresses the future-directed instruction.**

The item's `createdAt` is the trigger time, not the instruction time.

### The trigger mechanism is not an Attention

* the trigger mechanism is an **internal mechanism of the Assignment** — a system-side commitment; an Attention Item is a **user-facing pending matter**
* the trigger mechanism is not an independent product object and does not enter the Attention lifecycle
* no `PENDING` / `SCHEDULED` Attention state exists (see 17)
* the Assignment may be confirmed and canceled, but neither it nor its trigger mechanism is an Attention Item
* the trigger mechanism produces an Attention Item when its authorized condition becomes true and handling is required

The Assignment itself is never rendered as a user obligation. It may be confirmed and surfaced as a statement ("OK — tomorrow I'll remind you to review Project X.") and it must be cancelable — but none of that makes it an Attention Item.

### Attention creation semantics

An Attention Item is created only when:

* an **authorized** trigger condition becomes true, and
* the system judges that user handling is required.

No trigger match means no Attention. An ongoing Assignment that evaluates without a match produces nothing — silence is correct. Suppression is not expiration: when the condition holds but no user handling is needed at fire time, no Attention Item is created — an item is never created and immediately Expired.

### One creation semantics for all instruction shapes

```text
"Remind me tomorrow to review Project X"
→ one-shot Assignment
→ time-based trigger fires once
→ Attention

"Monitor Fund X every day and tell me if threshold is crossed"
→ ongoing Assignment
→ recurring condition matches
→ Attention

"Tell me if Project X build fails"
→ ongoing Assignment
→ state/event condition matches
→ Attention
```

All three share the same creation semantics:

```text
instruction
  ↓
Assignment
  ↓
trigger condition
  ↓
Attention
```

They differ only in the shape and arity of the trigger condition, and in the Assignment's mode (one-shot vs ongoing, see 11). This does not change the definition of the Attention Item itself.

### 16.4 Attention, Talk, and Sessions

An Attention Item is a user-facing record; Talk is an interaction surface. **Viewing an Attention and handling it are not the same thing**: opening the item, reading its context, or even entering a conversation does not change its state.

**Routing.** When the user chooses to engage with an Attention Item through Talk:

* the Item references an existing Agent Session → **Resume** that session (see 8.2);
* the Item has no session → **Create** a new one, contextualized by the Item (see 8.2, 32);
* **Reconstruct** applies only under its original conditions (see 4.2) — when the original session is unavailable and a new one must inherit its context;
* an Attention Item's existence alone never creates a Session; and an Attention Item is not a Session and never becomes one.

**Multiple Attention Items and Sessions:**

* one Session may be the handling surface for several Attention Items;
* an Attention Item references at most one Session at a time — its session reference when one existed, otherwise the session created for its handling; handling may continue across conversations, but the item keeps a single handling reference;
* no further many-to-many bookkeeping is introduced.

---

# 17. Attention Item Lifecycle

An Attention Item remains active while it is waiting for the user.

The state enum answers exactly one question: **does this still need the user, and why did that stop being true?**

```text
            created (rule or instruction passed judgment)
                                │
                             OPEN
                            /     \
              user acted on it     user explicitly opted out
                   /                    \
              HANDLED                DISMISSED
                   \                    /
                     (both terminal)

  (system-side) validity window passes while OPEN → EXPIRED
```

* **HANDLED** — the user substantively dealt with the matter. A handling artifact exists (an approval or rejection, a decision, a concluding conversation) and is recorded on the item.
* **DISMISSED** — the user explicitly chose not to deal with it. Dismissal is an explicit action (e.g. an Ignore button). Closing a screen, navigating away, or merely seeing the item never dismisses it.
* **EXPIRED** — nobody handled the item, and its validity window closed. Expiration says only that the window closed: the user neither handled nor dismissed the item, and the underlying subject is unaffected. The system retires it; this is not the user's will.

### Expiration

> **An Attention Item expires only when an explicit validity window closes. If no validity window exists, it does not expire merely because time passes.**

* The window comes from the **creation reason** (see 16.2, 18): the rule or instruction that created the item defines when it stops being valid — a 14:50 trade alert is valid until market close, a "remind me tomorrow" until the day ends. Expiration is never `createdAt + an arbitrary duration`.
* **No window, no expiry.** An item without a validity window — an OpenCode permission request, the report of delegated work, a project-related matter — stays **OPEN** until the user Handles or Dismisses it. It must not expire silently just because the user took a long time to respond.
* **EXPIRED is its own outcome, not a synonym.** It is not HANDLED (the user did nothing) and not DISMISSED (the user never opted out); the underlying subject — the monitoring responsibility, the Project, the session — is unaffected and outlives the item.
* An EXPIRED item remains part of history; how long expired items are kept is retention policy, separate from expiration itself.
* Expiration is independent of the Assignment lifecycle: it is not caused by the Assignment being Revoked or Completed, and it does not change the Assignment's lifecycle (see 10, 11).

### Seen is not a state

> **Being seen is not the same as being handled — so "seen" must not be a step toward any state.**

Whether the user has seen an item is interaction metadata (e.g. first/last seen). It never advances the state, and unread or badge views are derived from this metadata.

### In progress is not a state

"In progress" describes something that is already true elsewhere — an open conversation, an active review. It is a derived fact about the handling process, backed by a reference to that process. It is not a second source of truth in the state enum.

Handling, dismissing, or expiring Attention Items likewise says nothing about the Assignment that produced them: Assignment Completed ≠ Attention Handled, and Assignment Revoked does not change existing items (see 10, 11).

### Talk and handling

Entering Talk never changes an Attention Item's state by itself. A user who opens an item, reads its context, or even starts a conversation about it has only viewed it — the item stays OPEN until its handling produces an outcome.

**HANDLED** is recorded when the handling produces its artifact:

* an explicit user action that resolves the matter — approving or rejecting a permission request, a decision taken on the item; or
* a concluded handling conversation — the user talked the matter through to an outcome, and the item references that conversation.

A Talk session opening or completing does **not** automatically mark the item HANDLED: the conversation's outcome does. And DISMISSED remains what it always was — an explicit opt-out — distinct from HANDLED and from a conversation that simply ended.

### Dismiss and recurrence

Dismissing an item ends **that item only**. It does not revoke the Assignment behind it (see 10, 11) and does not permanently silence the matter: when the same creation reason and subject match again in a **later validity window**, a new Attention Item is created (see 19). Within the same window a dismissed matter does not re-nag; being re-notified sooner requires a new user instruction. Permanent silencing is never a side effect of dismissal — it is a separate, explicit authorization.

---

# 18. Attention Item Lifetime

Attention Items have their own lifetime, separate from the lifetime of the underlying domain object.

### Ephemeral Attention

Some Attention Items are only meaningful for a limited time.

Example:

```text
Market:

Fund X triggered today's rule.
```

After the valid time window:

```text
Attention

→ expired

→ removed
```

A future trigger creates a new Attention Item.

### Recallable underlying object

A Project may remain relevant even after its current Attention Item is no longer active.

Example:

```text
Project 2

  ↓

Session completed

  ↓

Attention:

Review Project 2
```

The user does not handle it today.

Later:

```text
Attention expires
```

The Project itself remains.

A future event or user intention can create a new Attention Item.

The system should not keep every historical Attention Item permanently active.

When an item's usefulness is time-bound, the creation reason supplies the validity window (for example, a 14:50 trade alert is valid until market close), and the system retires the item when the window passes. Expiry is not dismissal — it says nothing about the user's will. A later trigger of the same rule creates a new Attention Item; the underlying subject is unaffected.

---

# 19. Event → Attention

An Event can generate an Attention Item through deterministic rules or intelligent observation — but an Event never becomes an Attention Item merely because it exists. The transition is a judgment that must be attributable to a named rule or an explicit user instruction.

### Deterministic path

The rule — not the Event — is the creation authority. The Event is the fact; the Attention is created only when the rule's authorized condition holds and user handling is warranted (see 16.1, 16.2):

```text
Fact → Event → named rule (authorized condition + handling warranted) → Attention
```

Example — the named rule "review required after delegated coding work" (see 12, 16.2):

```text
session completed                  (Event — the fact)

      ↓

named rule: "review required"      (authorized condition, creation authority)

      ↓

handling warranted                 (the user asked to be told; a review awaits)

      ↓

Attention
```

The rule's authority comes from the user — a standing preference or the Assignment's authorized trigger (see 12) — never from the Event itself. The same Event arising from an interactive session the user was watching produces no Attention (see 16.1).

### Intelligent observation path

The observation is a judgment made by the Agent — it is not an Event, and it does not become an Attention by existing. The same creation-authority rule applies: the observation must be backed by a **permitted observation rule** (see 16.2); an Agent finding something interesting is not authorization. The Attention is created only when the authorized observation condition holds and user handling is warranted:

```text
Multiple Events → Agent / pattern detection → authorized observation (judgment + handling warranted) → Attention
```

Example — a permitted observation rule "repeated failure in the same place":

> "Project 3 has failed three times in the same place."

This may not be a native OpenCode Event.

It may be an Agent observation derived from several events:

```text
several failed runs                        (Events — the facts)

      ↓

Agent / pattern detection

      ↓

observation: "failing in the same place"   (authorized judgment, creation authority)

      ↓

handling warranted                         (a decision awaits; the user should weigh in)

      ↓

Attention
```

The observation rule's authority comes from the user — a standing permission to watch for this pattern — never from the Agent's own interest. Where the observation rule itself requires authorization, that authorization is its own step and must not be borrowed from, or mistaken for, an Assignment authorization (see 16.2).

The architecture must allow both approaches.

Both paths must record **why** the item was created: the rule or instruction that justified it, plus the triggering Event(s) when they exist (see 16.2).

Cardinality: one Event may produce several Attention Items (one per affected subject); one Attention Item may be supported by several Events. Items are deduplicated per (creation reason, subject, validity window).

Runtime states are never a path: idle, busy, and retry must not become Attention Items merely because the runtime entered those states (see 16.1).

---

# 20. Pulse

Pulse is the proactive surface through which the Agent communicates current Attention.

Pulse does not expose raw Events.

Pulse should communicate:

> **what the Agent believes currently deserves the user's attention.**

The user should experience Pulse as:

> "My AI has organized what needs me."

rather than:

> "Here is a notification dashboard."

Pulse may also communicate useful information that does not require action.

However, user-facing Pulse content should be presented through the Agent's voice rather than as a raw event stream.

Pulse content comes in exactly two kinds:

* **informational statements** — sourced from Events or observations; no item, no obligation (interaction level L1, see 22);
* **Attention renderings** — the presentation of an Attention Item (L2/L3). Actions taken on them advance the underlying item's lifecycle; Pulse never mutates runtime state directly.

Pulse must not present runtime state (idle / busy / retry) or raw Events as if they were Attention. The same standard applies to statements: an Event is a fact, not a sentence — Pulse speaks an Event only through an authority that permits saying it (see 22). "Not an Attention" does not mean "automatically speakable".

---

# 21. Multiple Attention Items

Multiple Attention Items can exist simultaneously.

Pulse should organize them into a concise briefing rather than simply exposing an undifferentiated list.

Example:

> "I've got three things for you."

> "Project 2 is ready for review."

> "One of your funds crossed the threshold you asked me to watch."

> "Your afternoon changed, so I reshuffled one task."

The underlying Attention Items remain separate objects.

Pulse provides their conversational presentation.

---

# 22. Pulse Interaction Levels

### L1 — Statement

The Agent tells the user something that does not require immediate interaction.

Example:

> "Project 2 is done."

No full Talk conversation is required.

An L1 statement is not an Attention Item: it carries no obligation, has no lifecycle, and never requires the user to act. It must not be used as a hiding place for what should have been an Attention — if the user actually needs to act, the matter is an Attention Item, not a statement.

#### L1 source authority

> **Not Attention ≠ automatically speakable.** An Event alone never authorizes an L1 statement; a fact has no voice until an authority lets Pulse speak it.

The same authority families as 16.2 govern speaking — but they authorize **presentation**, not item creation, and the two authorizations are separate:

* a **named rule** may permit speaking a class of information (market estimates, completion of delegated work);
* a **permitted observation** may be spoken when it is worth knowing and nothing needs deciding;
* an **explicit user instruction** may ask to be kept informed ("keep me posted on X").

A rule that may create Attention Items is not automatically a rule that may speak, and vice versa; L1 governance must not be conflated with Attention creation authority (16.2).

How the current examples fall:

| Occurrence | Presentation |
|---|---|
| Fund estimate / market information | L1 under a named standing rule — informational, never an Attention by itself |
| Delegated work completed, reporting clause present | Attention (see 31) — the user asked to be told |
| Delegated work completed, no reporting clause | may be spoken as L1 **under the commission itself** — the user ordered the work, so reporting what became of it is within its scope; no obligation, no item |
| OpenCode session started / runtime noise | nothing — an Event with no speaking authority is not presented |
| Permission request | never a statement — it is an Attention (the user must act) |
| Repeated build failure (observation) | L1 if a permitted observation covers it and nothing needs deciding; Attention if the observation is authorized and handling is warranted (see 19) |

"Project 2 is done." can therefore be either presentation, depending on authorization:

* with a reporting clause ("tell me when it's done"), it is the rendering of an Attention Item (see 31);
* without one, it may still be spoken as an L1 statement under the commission itself — why it may be spoken: the user commissioned the work, so reporting what became of it is within the commission; why it is still not an Attention: no handling was authorized, nothing waits for the user. No additional Pulse authority is needed beyond the commission, and no registry is introduced.

L1 and Talk: a statement carries no handling obligation. A user who taps it or asks about it starts a conversation under the normal Talk rules (8, 9) — Resume when a session exists for that context, Create when none does. Viewing or asking about an L1 marks nothing: an L1 has no lifecycle, and engaging with it never converts it into an Attention.

### L2 — Proposal

The Agent presents a simple action or decision.

Example:

> "Your fund crossed the threshold you asked me to watch."

```text
[Review]

[Ignore]
```

The user can often handle the matter without entering Talk.

### L3 — Invitation

The Agent believes meaningful discussion is required.

Example:

> "I found something in Project 3 that I think we should discuss."

```text
[Let's talk]
```

Only after the user chooses to engage does the application enter full Talk interaction.

---

# 23. Pulse and Chat Input

In the current Chat-first MVP:

> **Pulse is not a generic chat screen.**

Pulse may present conversational statements, proposals, and invitations.

The user does not continuously type into Pulse.

A two-way conversation begins when the user explicitly engages:

```text
Pulse

  ↓

[Let's talk]

  ↓

Talk

  ↓

Input
```

This structure also leaves room for future voice interaction:

```text
Pulse

  ↓

User speaks

  ↓

Talk conversation
```

Chat is therefore a temporary interaction mechanism, not the final definition of the product.

---

# 24. Open Thread

An Open Thread represents:

> **a conversation or topic that remains meaningfully unfinished and is worth continuing later.**

It is not:

* an Event
* a Memory
* an Assignment
* an Attention Item
* a new Agent Session

An Open Thread points back to an existing Agent Session.

An Open Thread is therefore a **continuation marker on an existing Agent Session**, not an independent entity. It owns no conversation, no history, and no lifecycle of its own — the conversation lives in the Agent Session; the Thread only records that this session is worth returning to, and why. Continuing an Open Thread always means **Resume existing Agent Session** (see 25). No separate Open Thread entity is introduced beyond this marker. A Thread surfaces later through the normal creation authorities — for example, a reminder the user set when the conversation paused (see 16.3); the Thread itself is not a creation authority.

Example:

```text
Today:

Agent Session

"Discuss Pulse market attention design."

Conversation stops before conclusion.

        ↓

Open Thread

"Continue discussion about market attention design."
```

Later:

```text
Open Thread

      ↓

Attention

      ↓

Pulse

"We left something unfinished yesterday."

      ↓

[Continue]

      ↓

Original Agent Session

      ↓

Resume existing OpenCode Session
```

The goal is continuity without creating a second conversation for the same unfinished topic.

---

# 25. Open Thread Recall

The default behavior for an Open Thread is **Resume**, not Create.

```text
Open Thread
      ↓
Agent Session reference
      ↓
Existing Agent Session
      ↓
Existing OpenCode Session
      ↓
Resume
```

The original Session context should be reused.

The system should not reconstruct the conversation from Wiki and Memory when the original Session is still available.

Only when the original Session cannot or should not be resumed should the system use Reconstruct:

```text
Open Thread
      ↓
Original Session unavailable / new Session required
      ↓
Relevant context
      +
Knowledge Base
      +
Memory
      +
necessary summary
      ↓
New Agent Session
      ↓
New OpenCode Session
```

This distinction prevents Open Thread from becoming an indirect mechanism for creating unrelated conversations.

---

# 26. When to Create an Open Thread

Not every unfinished conversation deserves an Open Thread.

### Good candidate

The user explicitly indicates continuation:

> "Let's continue tomorrow."

Or the conversation reaches a meaningful unresolved point:

> An important design decision remains open.

### Not a good candidate

Casual, low-commitment ideas:

> "Maybe someday we should build a mobile widget."

This should not become an Open Thread merely because the idea was mentioned.

However, it may still be worth preserving as a Raw Idea in the Knowledge Base.

---

# 27. Raw Idea

A Raw Idea is a potentially useful idea discovered during conversation that does not currently require action or continuation.

Example:

> "Maybe someday we should build a mobile widget."

This can be stored in the existing LLM-Wiki-based Knowledge Base. A Raw Idea does not require an Agent Session to exist — ideas arise in conversations but are not attached to continuing them.

Conceptually:

```text
Conversation

    ↓

Potentially valuable idea

    ↓

Raw Idea

    ↓

LLM Wiki
```

A Raw Idea should not automatically create:

* an Attention Item
* an Open Thread
* an Assignment
* a Memory

The purpose is preservation and future retrieval.

Later, the user may remember the idea:

> "Didn't we have an idea about a mobile widget?"

The Agent can search the Knowledge Base and retrieve the Raw Idea.

The idea can then become active again through a new Agent Session.

---

# 28. Memory vs Open Thread vs Raw Idea

These concepts must remain separate. They are not four ways of saving the conversation — each answers a different question:

| Concept | The question it answers |
|---|---|
| Open Thread | Will we continue this conversation later? (see 24) |
| Raw Idea | Is this idea worth keeping? (see 27) |
| Memory | What must we remember about the user, the relationship, and durable context? (see 6) |
| Knowledge Base | What knowledge will we need to retrieve later? (see 5) |

| Concept        | Meaning                                                       |
| -------------- | ------------------------------------------------------------- |
| Memory         | Long-term understanding about the user, work, or relationship |
| Open Thread    | A meaningful unfinished conversation worth continuing         |
| Raw Idea       | A useful idea worth preserving but not currently actionable   |
| Assignment     | A responsibility the Agent has accepted                       |
| Attention Item | A current matter waiting for the user                         |

Examples:

### Memory

> "You prefer the smallest safe change before a release."

### Open Thread

> "We still need to decide how Pulse should prioritize market alerts."

### Raw Idea

> "Maybe we should build a mobile widget."

### Assignment

> "Monitor Fund X daily at 14:50."

### Attention Item

> "Fund X triggered today's monitoring rule."

---

# 29. Decision and Outcome

A conversation may produce an outcome.

Possible conceptual outcomes include:

```text
Information

Decision

Action

Assignment

Open Thread

Raw Idea

No persistent outcome
```

The conversation itself does not need to remain active after every outcome.

What each outcome leaves behind:

| Outcome of the conversation | Persistent result |
|---|---|
| Worth continuing this conversation later | Open Thread → existing Agent Session (see 24) |
| Valuable, but nothing to continue now | Raw Idea → may enter the Knowledge Base (see 27) |
| Durable understanding about the user / relationship / working style | Memory (see 6) |
| Durable project / world / domain knowledge | Knowledge Base (see 5) |
| No future value | nothing |

One conversation may produce several of these at once — an idea recorded (Raw Idea), a preference learned (Memory), and a decision to continue tomorrow (Open Thread) can come from the same conversation — but each result needs its own semantic reason. None of these results is a way of "saving the chat": the conversation itself lives in its Agent Session, and these are markers and retained context around it, not copies of it. Retention is also not reconstruction (see 4.2): keeping a thread, idea, memory, or piece of knowledge never creates or activates a Session by itself.

For example:

```text
User:

"Keep monitoring Fund X."

        ↓

Decision

        ↓

Assignment
```

Or:

```text
User:

"Let's revisit this idea next week."

        ↓

Open Thread
```

Or:

```text
User:

"Maybe someday we should build this."

        ↓

Raw Idea
```

### Persistence authority

Who may leave these results behind? The persistence families are deliberately not one approval workflow:

* **Open Thread** — the user's explicit "continue later" always suffices. The Agent may also record a thread when the conversation itself shows a meaningfully unfinished topic. A thread is **inert**: recording it authorizes nothing — it surfaces later only through the normal creation authorities (see 16.3), and the user can cancel it.
* **Raw Idea** — the user's explicit request always suffices; the Agent may also record an idea it identified as worth keeping. Saving an idea executes nothing — saving and executing are different acts, and only the latter needs execution authority. An idea never becomes an Attention Item or an Assignment because the Agent found it interesting (see 16.2, 27).
* **Memory** — the user's explicit "remember this" always suffices. Beyond that, the standing Memory mechanism may form durable understanding from **explicit and stable context** — preferences, working style, decisions — silently and selectively (see 6). It never forms Memory from one-off, temporary, or ambiguous statements; Memory is durable understanding, not a chat summary.
* **Knowledge Base** — the user's explicit request always suffices; the Agent may also write durable project/world/domain knowledge that the conversation has established. Ordinary conversation content enters the Knowledge Base only as durable, retrievable knowledge — not as a chat log; Raw Ideas keep their own semantics (see 27).

### Authority families and purposes

The model uses a small set of **authority families** — explicit user instruction, named rule, permitted observation, Assignment authorization. Each **purpose** carries its own authorization:

> **Attention creation authority ≠ L1 presentation authority ≠ persistence authority.**

An authority family is a shape of permission, not a universal pass: being authorized to create Attention Items does not authorize speaking (see 22); being authorized to persist does not authorize surfacing or executing. No registry is introduced — each purpose is defined by its own section (16.2, 22, this section).

### Outcomes and Assignments

The outcome classification is not Assignment authorization:

* an Assignment formed during a conversation still follows the full governance — proposal → activation / confirmation → Active Assignment (see 10);
* a future-directed instruction ("from now on, help me with…") follows Assignment governance (see 10, 13);
* Open Thread, Raw Idea, Memory, and Knowledge Base retention must not be used to bypass Assignment authorization: persisting a *record* is not activating a *responsibility*;
* classifying a conversation as having a persistent outcome never creates an Assignment by itself.

---

# 30. End-to-End Product Loop

The core lifecycle is:

```text
                    User

                      │

                      ▼

                 Agent Session

                      │

             conversation / decision

                      │

          ┌───────────┼────────────┐

          ▼           ▼            ▼

      Assignment   Open Thread   Raw Idea

          │            │            │

          ▼            ▼            ▼

   Background Work   Continue     LLM Wiki

          │

          ▼

        Event

          │

          ▼

      Attention

          │

          ▼

        Pulse

          │

       user chooses

          │

          ▼

        Talk

          │

          ├───────────────┐
          │               │
          ▼               ▼
 Existing Session      No Session
          │               │
          ▼               ▼
       Resume           Create
          │               │
          ▼               ▼
 Existing Runtime    New Runtime
 Session             Session
```

Separately:

```text
Agent Session

      ↓

Relevant Memory / Knowledge Base

      ↓

Current Context
```

This allows the product to maintain continuity without requiring unlimited conversation history.

---

# 31. Example: OpenCode

### User starts work

```text
User

"Continue Project 2 tonight and tell me when it's done."
```

Agent Session:

```text
Understand

→ Assignment proposal

→ confirmed by the user

→ Active Assignment
```

Assignment:

```text
Target: OpenCode
Action: Continue Project 2
Timing: Tonight
Mode: One-shot
Authorized trigger: completion of the work → tell the user
```

OpenCode works asynchronously.

Later:

```text
OpenCode

→ session completed

→ Event
```

The Event alone is not an Attention Item. The Attention exists because the Assignment authorized this trigger condition ("tell me when it's done") and the completed work now deserves the user's review:

```text
Event  +  authorized trigger condition (see 16.1, 16.3)

→ Attention Item
```

Pulse:

> "Project 2 is done — ready for your review."

The user may see:

```text
[Review]

[Let's talk]
```

If the user chooses Talk:

```text
Talk

→ existing Project 2 Agent Session

→ existing OpenCode Session

→ Resume
```

The user can continue the conversation without re-explaining the project.

### Without the reporting clause

> "Continue Project 2 tonight."

The Assignment is the same in every other respect — but no trigger condition was authorized to surface the matter to the user. Completion then produces only an Event:

```text
session completed → Event → no Attention Item
```

The completion may still be spoken as an informational Pulse statement (see 20, 22), and the user can open the project and resume the session at any time — but nothing waits for the user's handling, so no Attention Item exists.

---

# 32. Example: Market

### User creates monitoring responsibility

Direct Talk:

> "Watch Fund X every day at 14:50 and notify me if it drops more than 5%."

After clarification and confirmation:

```text
Assignment

Target: Market

Type: Ongoing

Schedule: Daily 14:50

Rule: Drop > 5%
```

The Market scheduler and rule engine run independently.

At 14:50:

```text
Rule evaluation

      ↓

No match

      ↓

No Attention
```

or:

```text
Rule evaluation

      ↓

Match

      ↓

Event

      ↓

Attention Item
```

Pulse:

> "Your fund crossed the threshold you asked me to watch."

The user may:

```text
[Review]

[Ignore]

[Let's talk]
```

If the user chooses Talk, there may be no existing Agent Session because the monitoring itself is performed by the deterministic Market system.

Therefore:

```text
Market Attention

      ↓

[Let's talk]

      ↓

Create New Agent Session

      ↓

New OpenCode Session

      +

Market context

      +

Relevant Knowledge Base

      +

Relevant Memory
```

The new Session is about the Market Attention, but it is not a continuation of a previous Market monitoring Session.

The monitoring Assignment remains independent and active.

The day's Attention Item may expire later.

---

# 33. Example: Unfinished Idea

Direct Talk:

> "I think Pulse could eventually have a mobile widget."

The conversation does not establish a task or near-term continuation.

Therefore:

```text
No Assignment
No Attention
No Open Thread
```

But the Agent may preserve:

```text
Raw Idea

→ LLM Wiki
```

Later:

> "Didn't we discuss a mobile widget?"

The Agent searches the Knowledge Base and retrieves the Raw Idea.

A new Agent Session can then be started around it.

---

# 34. Agent Runtime Abstraction

The current product uses OpenCode as the Agent Runtime.

The product model should treat this as replaceable.

Conceptually:

```text
                    Agent Session

                          │

                          ▼

                    Agent Runtime

                          │

             ┌────────────┼────────────┐

             ▼            ▼            ▼

          OpenCode        Pi          DSH

                                      ...
```

The runtime is responsible for implementing agent-level execution.

Agent Mobile is responsible for:

* user interaction
* Pulse
* Talk
* Attention
* Assignment
* relationship experience
* integration with Knowledge Base and Memory
* presenting asynchronous outcomes

This separation should allow future runtime replacement without redesigning the core user experience.

---

# 35. Product Principles

1. **One companion.**
   The product represents one persistent AI relationship, even when multiple capabilities exist behind it.

2. **Agent Session is the current workspace.**
   It contains current conversational/work state, not permanent history.

3. **The current Agent Session is backed by an OpenCode Session.**

4. **OpenCode is a runtime, not the product identity.**

5. **Knowledge Base provides persistent world/project knowledge.**

6. **Memory provides persistent user and relationship understanding.**

7. **Knowledge Base and Memory are context sources, not replacements for an existing Session.**

8. **Assignment represents delegated responsibility.**

9. **Assignment may be one-shot or ongoing.**

10. **Agent autonomy is bounded by Assignment authorization.**

11. **Event represents what happened.**

12. **Attention represents what is currently waiting for the user — a judgment made by an explicit rule or an explicit user instruction, never a runtime state.**

13. **Attention is time-bounded where appropriate; the creation reason supplies the window and the system retires expired items.**

14. **Pulse presents current Attention, not raw system events.**

15. **Pulse is not a generic chat input surface in the current Chat-first MVP.**

16. **Talk is the two-way interaction surface of an Agent Session.**

17. **Direct Talk creates a new Agent Session.**

18. **Contextual Talk resumes the relevant existing Session when one exists.**

19. **Contextual Talk creates a new Session when no relevant Agent Session exists.**

20. **Resume preserves the existing Session and its runtime context.**

21. **Reconstruct creates a new Session using relevant context from Knowledge Base, Memory, and necessary summaries.**

22. **Open Thread points to an existing Agent Session and normally uses Resume.**

23. **Not every Event requires an Attention Item.**

24. **Not every conversation requires an Open Thread.**

25. **Not every idea requires an Assignment.**

26. **Not everything belongs in Memory.**

27. **Useful but inactive ideas may be stored as Raw Ideas in the Knowledge Base.**

28. **The Agent should remain quiet when nothing needs the user's attention.**

29. **The product should optimize for continuity of understanding, not unlimited conversation history.**

30. **UI should remain subordinate to the Agent's voice and behavior.**

31. **Idle, busy, and retry are runtime technical states. They are Events at most, never Attention Items.**

32. **Seen is interaction metadata, not a lifecycle state. Dismissal is always an explicit user action.**

---

# 36. Current MVP Boundary

The current MVP should prove the following loop:

```text
User

→ Agent Session

→ Assignment

→ asynchronous work

→ Event

→ Attention

→ Pulse

→ user engagement

→ Talk
```

The MVP may use:

* OpenCode as the Agent Runtime
* existing Knowledge Base skill
* existing Memory plugin
* existing OpenCode Project / Session implementation
* existing Market scheduler and rule engine

For the MVP, Attention Items come from exactly two sources: pending OpenCode permission requests, and fund trade alerts from the Market rule engine. Session idle / busy states are explicitly excluded (see 16.1).

The MVP does not require:

* multiple agent runtimes
* a universal context engine
* a universal notification center
* multiple domain-specific chat products
* unlimited conversation history
* a separate Assignment management screen
* complex autonomy configuration UI

The primary goal is to demonstrate that the user can interact with one persistent AI companion that can:

> **understand → accept responsibility → work asynchronously → notice meaningful outcomes → return to the user → continue the relationship.**
