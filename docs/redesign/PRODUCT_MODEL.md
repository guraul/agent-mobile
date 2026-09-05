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

An Assignment is created when the user and Agent reach a sufficiently clear and authorized intent.

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

---

# 11. One-shot and Ongoing Assignments

Assignment supports both:

### One-shot

The work is expected to happen once.

Example:

> "Continue Project 2 tonight."

```text
Assignment

→ OpenCode

→ execute once

→ completed
```

### Ongoing

The responsibility continues over time.

Example:

> "Check Fund X every day at 14:50."

```text
Assignment

→ Market

→ daily schedule

→ remains active
```

The distinction is a property of the Assignment, not two different concepts.

An ongoing Assignment may execute repeatedly without producing an Attention Item every time.

---

# 12. Assignment Authorization

The Agent's autonomy comes from the Assignment.

> **The Agent may act within the scope explicitly granted by the Assignment.**

An Assignment should conceptually define:

* responsibility
* target
* allowed action
* execution conditions
* schedule, when applicable
* constraints
* expected result

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

---

# 13. Assignment and User Instructions

Not every instruction creates an Assignment.

### Current instruction

> "Check Project 2."

The Agent checks it and returns the result.

No persistent Assignment is required.

### Delegated responsibility

> "Keep checking Project 2 tonight and tell me when it's done."

This creates an Assignment.

The distinguishing characteristic is:

> **The Agent takes ongoing responsibility beyond the current conversational turn.**

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

If an Assignment becomes unsafe, ambiguous, or inconsistent with its original scope, the Agent may stop and create an Attention Item requesting the user's decision.

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

may be an Event without becoming an Attention Item.

An Event may originate from:

* an Agent Runtime
* a deterministic scheduler
* a rule engine
* an external integration
* an Agent observation

---

# 16. Attention Item

## Definition

> **An Attention Item is something that is currently waiting for the user to handle.**

This is the core distinction:

```text
Event
= What happened?

Attention Item
= What is waiting for you?
```

Attention Items are the current user-facing obligations generated by system events, observations, unfinished work, or other meaningful circumstances.

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

An Event should not become an Attention Item merely because it exists.

It must represent something that currently deserves user attention.

---

# 17. Attention Item Lifecycle

An Attention Item remains active while it is waiting for the user.

Conceptually:

```text
OPEN

  ↓

IN PROGRESS

  ↓

RESOLVED
```

It may also become:

```text
DISMISSED
```

when the user explicitly chooses not to deal with it.

An Attention Item can also stop being active when its validity period expires.

### Important rule

> **Being seen is not the same as being handled.**

A user opening Pulse does not automatically resolve an Attention Item.

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

---

# 19. Event → Attention

An Event can generate an Attention Item through deterministic rules or intelligent observation.

### Deterministic path

```text
OpenCode Event

      ↓

Rule

      ↓

Attention
```

Example:

```text
session.completed

      ↓

Review required

      ↓

Attention
```

### Intelligent observation path

```text
Multiple Events

      ↓

Agent / pattern detection

      ↓

Observation

      ↓

Attention
```

Example:

> "Project 3 has failed three times in the same place."

This may not be a native OpenCode Event.

It may be an Agent observation derived from several events.

The architecture must allow both approaches.

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

This can be stored in the existing LLM-Wiki-based Knowledge Base.

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

These concepts must remain separate.

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

"Continue Project 2 tonight."
```

Agent Session:

```text
Understand

→ Confirm

→ Assignment
```

Assignment:

```text
Target: OpenCode
Action: Continue Project 2
Timing: Tonight
Mode: One-shot
```

OpenCode works asynchronously.

Later:

```text
OpenCode

→ session completed

→ Event

→ Attention Item
```

Pulse:

> "Project 2 is done."

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

12. **Attention represents what is currently waiting for the user.**

13. **Attention is time-bounded where appropriate.**

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
