# PRODUCTION_UI_MIGRATION_MAPPING.md

> **状态：READ ONLY 分析报告 / Migration Blueprint**
>
> **日期**：2026-09-21
>
> **作者**：OpenCode 会话（Production UI Migration Mapping — Round 2 Final）
>
> **依据**：
>
> * `showcase2/SHOWCASE2_VISUAL_SPEC.md`
> * `showcase2/SHOWCASE2_IMPLEMENTATION.md`
> * Showcase2 全部实现
> * `agent-mobile-app/src/` 全部路由、screens、services
> * `docs/redesign/PRODUCT_MODEL.md`
> * `docs/knowledge-base/API.md`
> * `docs/redesign/MVP_ACCEPTANCE.md`
>
> **目的**：在正式开始 production UI migration 前，冻结真实能力如何进入单一 Companion Surface，避免视觉迁移过程中丢失真实能力、混淆产品语义或重新引入 dashboard IA。

---

# 0. Executive Summary

Production 当前形态是：

```text
4-tab dashboard
Pulse / Talk / Memory / Me
+ independent stack routes
```

Showcase2 目标形态是：

```text
single-surface AI Companion

Pulse
  ↓
contextual Talk
```

本次 migration 是：

```text
IA refactor
+
visual refactor
```

不是产品后端重构。

不改变：

* canonical entity
* lifecycle
* scheduler
* delivery architecture
* Agent Registry
* A2A
* OpenThread
* DB schema
* product semantics

---

## Final Production Direction

```text
                    PULSE

                  AI → User

                       │

              contextual interaction

                       │

                      TALK

                 User ↔ AI
```

Pulse 是唯一 Home / Root。

Talk 是 contextual interaction，不是 top-level destination。

Memory / Knowledge / Responsibilities 是 contextual capabilities。

---

# 1. Locked Migration Principles

## 1.1 Single Surface

Production 最终不再使用 bottom tab bar。

不保留：

```text
Pulse tab
Talk tab
Memory tab
Me tab
```

而是：

```text
Pulse root
    ↓
contextual stack / sheet
```

---

## 1.2 Pulse ≠ Chat Screen

Pulse 是 AI briefing / presence surface。

因此：

* 无永久 TextInput
* 无 Pulse Send button
* 无 generic chat composer
* 无 Quick Actions tool directory
* 无 dashboard-style control grid

Pulse 底部只提供：

```text
Talk to Pulse…
```

点击后进入 Talk。

---

## 1.3 Companion ≠ Task Manager

Pulse 不应变成：

```text
task list
dashboard
operations console
workflow toolbar
```

尤其禁止：

* `ON MY PLATE`
* checkbox
* progress bar
* due-date wall
* assignment table
* 多个微型 section
* Bento tool grid

信息通过：

```text
Featured
Supporting
Noticed
```

形成 AI briefing，而不是管理面板。

---

## 1.4 Semantics Always Win Over Visual Convenience

UI 不得创造新的产品事实。

特别是：

```text
Viewing ≠ Handling
Discuss ≠ Confirm
Engage ≠ Handle
L1 ≠ Attention
Running ≠ Attention
Market L1 ≠ Attention
```

Canonical backend/service state 是唯一事实来源。

---

# 2. Production Capability Inventory

| #  | Capability                      | Current entry        | Data source                                                      | Lifecycle / semantics                                   | Must remain? | Final destination                                |
| -- | ------------------------------- | -------------------- | ---------------------------------------------------------------- | ------------------------------------------------------- | ------------ | ------------------------------------------------ |
| 1  | Needs You / open Attention list | Pulse group          | `GET /api/product/attention` + stream + reconnect reconciliation | `OPEN → HANDLED / DISMISSED / EXPIRED`                  | ✅            | Featured first item + Supporting remaining items |
| 2  | Attention detail                | `/attention/[id]`    | `fetchAttentionDetail`                                           | read-only projection                                    | ✅            | contextual route                                 |
| 3  | Attention dismiss               | Pulse / detail       | `POST /attention/:id/dismiss`                                    | `→ DISMISSED`                                           | ✅            | Supporting / detail                              |
| 4  | Attention handle                | Talk                 | `POST /attention/:id/handle`                                     | `→ HANDLED`                                             | ✅            | Talk                                             |
| 5  | Attention engage                | Talk entry           | `POST /attention/:id/engage`                                     | does not change state                                   | ✅            | Talk routing logic                               |
| 6  | Attention retry / repair        | detail               | `repairAssignment`                                               | replay occurrence                                       | ✅            | detail                                           |
| 7  | Suggested proposals             | Pulse                | proposal API + SSE                                               | `PROPOSED → CONFIRMED / REJECTED / CANCELLED / EXPIRED` | ✅            | Supporting                                       |
| 8  | Proposal confirm                | Pulse                | confirm API                                                      | activation moment                                       | ✅            | Supporting                                       |
| 9  | Proposal reject                 | Pulse                | reject API                                                       | `→ REJECTED`                                            | ✅            | Supporting                                       |
| 10 | Suggested discuss               | Pulse                | `createSession` + `autoContextText`                              | no authorization                                        | ✅            | Talk                                             |
| 11 | Noticed observation L1          | Pulse                | `/api/product/l1` + stream                                       | no lifecycle                                            | ✅            | Noticed                                          |
| 12 | Noticed → Talk                  | row/detail           | `createSession` + `autoContextText`                              | no state mutation                                       | ✅            | Detail sheet → Talk                              |
| 13 | Market estimate L1              | Pulse                | L1 `market-estimate`                                             | no lifecycle                                            | ✅            | Supporting                                       |
| 14 | Fund detail                     | Pulse                | market estimate data                                             | read-only                                               | ✅            | Fund sheet                                       |
| 15 | Running projects / Today        | Pulse                | `useProjectEvents`                                               | neutral information                                     | ✅            | Supporting                                       |
| 16 | Other projects                  | Pulse                | `otherProjects`                                                  | neutral information                                     | ✅            | More projects → sheet                            |
| 17 | Project → Talk                  | Pulse                | projectPath routing                                              | —                                                       | ✅            | Talk                                             |
| 18 | Direct Talk                     | Talk tab             | session list/create                                              | conversational workspace                                | ✅            | Pulse → `/talk`                                  |
| 19 | Session switch/create           | ProjectChatZ         | list/create session                                              | runtime-owned                                           | ✅            | Talk                                             |
| 20 | Contextual Talk                 | Pulse                | `resolveAttentionConversation`                                   | Resume/Create semantics unchanged                       | ✅            | Talk                                             |
| 21 | Session-lost escape hatch       | Talk boot            | existing fallback                                                | runtime recovery                                        | ✅            | Talk                                             |
| 22 | Streaming/typewriter            | ChatPanelZ           | opencode events                                                  | preserve `revealChars`, buffering, reducer              | ✅            | Talk                                             |
| 23 | Pagination                      | ChatPanelZ           | `listMessages`                                                   | chronological                                           | ✅            | Talk                                             |
| 24 | Abort                           | composer             | abort API                                                        | —                                                       | ✅            | Talk                                             |
| 25 | Permission flow                 | ChatPanelZ           | permission API                                                   | blocking runtime interaction                            | ✅            | Talk                                             |
| 26 | Question flow                   | ChatPanelZ           | question API                                                     | blocking runtime interaction                            | ✅            | Talk                                             |
| 27 | Slash commands                  | `send()` interceptor | existing command semantics                                       | assignment lifecycle / commands                         | ✅            | Talk                                             |
| 28 | Agent / model switching         | Talk                 | agent + model prefs                                              | —                                                       | ✅            | Talk                                             |
| 29 | Voice input placeholder         | ChatPanelZ           | placeholder only                                                 | no real capability                                      | ❌            | Remove placeholder in migration                  |
| 30 | Responsibilities list           | `/assignments`       | assignment APIs                                                  | active/completed/revoked + needs attention projection   | ✅            | contextual route + Settings                      |
| 31 | Assignment detail/history       | `/assignments/[id]`  | assignment/history APIs                                          | read-only projection                                    | ✅            | contextual route                                 |
| 32 | Revoke                          | list/detail          | revoke API                                                       | active → revoked                                        | ✅            | assignment detail                                |
| 33 | Repair                          | list/detail          | repair API                                                       | existing semantics                                      | ✅            | assignment detail                                |
| 34 | Compensate                      | list/detail          | compensate API                                                   | run now / skip                                          | ✅            | assignment detail                                |
| 35 | Memory view                     | Memory tab           | `/api/product/memory`                                            | read-only canonical projection                          | ✅            | Memory sheet                                     |
| 36 | Memory forget                   | Memory tab           | DELETE API                                                       | canonical mutation                                      | ✅            | Memory sheet                                     |
| 37 | KB search                       | Memory tab           | `/api/product/kb/search`                                         | read-only                                               | ✅            | Settings + Talk source path                      |
| 38 | KB document reader              | `/kb/doc`            | KB doc API                                                       | read-only                                               | ✅            | contextual route                                 |
| 39 | Raw ideas                       | no UI                | raw-ideas API                                                    | save ≠ execute                                          | ❌            | remain unexposed                                 |
| 40 | Login                           | Pulse banner/sheet   | auth API                                                         | —                                                       | ✅            | contextual sheet                                 |
| 41 | Logout                          | Me                   | auth API                                                         | —                                                       | ✅            | Settings                                         |
| 42 | Connection status               | Me                   | BFF health                                                       | —                                                       | ✅            | Settings                                         |
| 43 | BFF address                     | Me                   | bff config                                                       | technical setting                                       | ✅            | Settings → Advanced                              |
| 44 | Model preferences               | Me                   | model prefs                                                      | —                                                       | ✅            | Settings                                         |
| 45 | Runtime offline                 | Pulse/Talk           | runtime failure classification                                   | presentation only                                       | ✅            | orb/status/offline UI                            |
| 46 | Notification Bell               | Pulse header         | dead `Coming soon` action                                        | no capability                                           | ❌            | replace with Settings                            |
| 47 | Session rename/delete           | no UI                | client API exists                                                | currently unreachable                                   | ❌            | no new UI                                        |

---

# 3. Final Pulse IA

The production Pulse is:

```text
Header
  ↓
Hero
  ↓
Featured
  ↓
Supporting
  ↓
Noticed
  ↓
Conversation Entry
```

No permanent section for:

```text
Watching
Today
Market
Tasks
Quick Actions
```

These are represented through semantic rows or contextual capability access.

---

# 4. Header

Target:

```text
┌─────────────────────────────────────┐
│  ●  ATTENTIVE              [Settings]│
│     Pulse                            │
└─────────────────────────────────────┘
```

Header contains:

* AI orb
* runtime/presence state
* Pulse identity
* Settings entry

The current Notification Bell is removed because it is a dead button.

---

# 5. Hero

Hero contains:

```text
Greeting
AI companion line
Watching N things for you ›
```

Example conceptual composition:

```text
Good evening, Bin.

I've been keeping an eye on things for you.

Watching 3 things for you ›
```

The final wording is UI copy and may be refined, but the semantics must remain:

```text
active assignments > 0
→ show presence line

active assignments = 0
→ hide presence line
```

The line navigates to:

```text
/assignments
```

It does NOT render assignment rows directly on Pulse.

It does NOT create a new assignment concept.

---

# 6. Featured

Featured contains:

```text
first OPEN Attention only
```

Selection:

```text
OPEN Attention
sorted by createdAt DESC
take first
```

Featured never accepts:

* Suggested
* Running
* Market
* Watching
* Noticed

If there is no OPEN Attention:

```text
Featured hidden
```

---

# 7. Attention Actions

Featured:

```text
REVIEW
Discuss
```

Supporting Attention rows:

```text
REVIEW
Dismiss
```

subject to the existing Attention semantics.

### REVIEW

```text
→ /attention/[id]
```

Reviewing must not mutate Attention state.

### Discuss

```text
→ Talk
```

Uses:

```text
resolveAttentionConversation
```

and preserves:

```text
Resume existing session first
otherwise Create
```

### Engage

Entering Talk through an Attention context may call existing:

```text
POST /attention/:id/engage
```

This does NOT mean HANDLED.

### Handle

Only Talk's existing:

```text
Mark handled
```

can transition:

```text
OPEN → HANDLED
```

with the existing `artifactRef` requirement.

### Dismiss

Uses:

```text
POST /attention/:id/dismiss
```

and transitions:

```text
OPEN → DISMISSED
```

### Defer

**Removed.**

Production does not expose Defer.

Do not implement local collapse state that acts as a pseudo-lifecycle.

Do not map Defer → Dismiss.

---

# 8. Supporting

## 8.1 Final structure

Supporting is **ONE continuous visual region**.

There are no independent section headers for each domain.

Do NOT implement:

```text
NEEDS YOU
SUGGESTED
RUNNING
MARKET
```

as separate sections.

Instead each row carries lightweight semantic identity.

---

## 8.2 Supporting order

Final order:

```text
NEEDS YOU
→ SUGGESTED
→ RUNNING
→ MARKET
```

WATCHING is not part of Supporting.

---

## 8.3 Row semantics

Each row may use:

```text
semantic dot
micro-label
statement
quiet action
```

The category is communicated at row level.

Example:

```text
● NEEDS YOU
Refund approval still needs your review      REVIEW
```

```text
● SUGGESTED
I think we should adjust the fund monitor     CONFIRM
```

```text
● RUNNING
agent-mobile                                      →
```

```text
● MARKET
CSI fund        1.245   +0.83%                     →
```

Do not force every row to have the same control set.

Actions must reflect semantics.

---

# 9. Supporting Visibility Budget

This is a hard production constraint.

```text
Featured   ≤ 1
Supporting ≤ 4 rows
Noticed    ≤ 5 rows
```

Overflow:

```text
Supporting
  → More (n)
  → contextual sheet

Noticed
  → See All
  → contextual sheet
```

Visibility budget:

* changes presentation only
* never mutates lifecycle
* never deletes data
* never changes canonical ordering
* never changes backend state

---

## 9.1 Supporting selection

The visible Supporting rows should preserve semantic priority:

```text
NEEDS YOU
→ SUGGESTED
→ RUNNING
→ MARKET
```

Within a category, use the existing meaningful timestamp/order available from the source data.

A NEEDS YOU item must never be displaced by Market or other low-obligation information.

---

# 10. Suggested

Suggested is a proposal, not an obligation.

Lifecycle:

```text
PROPOSED
→ CONFIRMED
→ active assignment

or

PROPOSED
→ REJECTED / CANCELLED / EXPIRED
```

Visual treatment:

* lighter than Attention
* no checkbox
* no progress
* no due date
* no task framing
* statement-oriented wording

Actions:

```text
statement
→ Discuss / Talk

CONFIRM
→ confirm API
→ activation

Dismiss / Reject
→ reject API
```

Hard semantic rule:

```text
Discuss ≠ Confirm
```

Discussion must never silently activate an Assignment Proposal.

Confirm remains the activation moment.

---

# 11. Running / Today

Running projects remain visible because they provide evidence that the Companion is actively working.

But:

```text
Running ≠ Attention
```

and:

```text
Today ≠ task dashboard
```

Display inside Supporting using:

```text
RUNNING
```

micro-label.

Example:

```text
● RUNNING
Project 2                                      →
```

Tap:

```text
→ /talk?projectPath=...
```

Preserve existing ProjectChatZ behavior.

---

## 11.1 Other projects

Idle/other projects do not occupy the primary visible budget.

Use:

```text
More projects (n)
```

→ contextual project sheet.

Keep current project behavior and project-to-Talk route.

---

# 12. Market

Market L1 is informational:

```text
kind = market-estimate
```

It has:

* no lifecycle
* no obligation
* no Confirm
* no Handle
* no Dismiss

It appears in Supporting as:

```text
MARKET
```

and opens:

```text
Fund sheet
```

The existing market estimate data remains authoritative:

```text
name
code
estimatedNav
prevNav
changePct
```

---

## 12.1 Market Attention vs Market L1

These MUST remain separate.

### Market L1

```text
MARKET
→ informational
→ no lifecycle
→ no dismiss
```

### Market-related Attention

If an actual Attention is market-related:

```text
Attention semantics apply
```

including existing:

```text
Dismiss
Handle
Engage
```

where applicable.

Never add Attention actions to a plain Market L1 row.

---

# 13. Noticed

Noticed represents:

```text
L1 observation
```

It is:

* informational
* non-persistent from a lifecycle standpoint
* non-obligatory
* not an Assignment

Final flow:

```text
Noticed row
   ↓
read-only detail sheet
   ↓
Discuss
   ↓
Talk
```

Viewing and discussing do not mutate L1 state.

Use existing:

```text
L1Statement
```

fields:

```text
text
sourceRef
occurredAt
expiresAt
sourceKind
data
```

No new API is required.

---

# 14. Watching / Responsibilities

The final presentation is NOT:

```text
WATCHING · n
```

section.

It is:

```text
Watching N things for you ›
```

under Hero.

This line is intentionally first-person and companion-oriented.

It means:

```text
active assignments > 0
```

It does not expose a task list.

It does not duplicate needs-attention assignments already surfaced through Attention.

Tap:

```text
/assignments
```

All existing capabilities remain reachable:

```text
Needs attention
Active
Completed
Revoked

Revoke
Repair
Compensate / Run now
Skip
History
Assignment detail
```

No:

```text
ON MY PLATE
checkbox
progress
task wall
```

---

# 15. Memory

Memory is contextual.

Remove the top-level Memory tab.

Primary entry:

```text
Settings
→ What I remember
```

Optional contextual entry from Talk may be provided when the AI explicitly references a memory.

Keep:

```text
fetchMemories
buildMemoryGroups
forgetMemory
```

Memory remains canonical `memx` data.

Forget remains a real canonical mutation.

The Memory sheet should preserve:

```text
User
Projects
source
updatedAt
Forget
```

No new lifecycle.

---

# 16. Knowledge / Sources

Do not make "KB" a primary user-facing navigation term.

Primary concepts:

```text
Sources
Knowledge
```

Talk source chip example:

```text
▸ pricing-v3.md
```

Flow:

```text
AI source chip
   ↓
preview sheet
   ↓
OPEN
or
ASK ABOUT THIS
   ↓
Talk
```

Preview can show:

```text
filename
2–3 line excerpt
source metadata
OPEN
ASK ABOUT THIS
```

Reuse:

```text
searchKb
fetchKbDoc
```

No Raw Ideas UI is added in this migration.

---

# 17. Settings

Replace the Pulse header Bell with Settings.

Settings is a contextual sheet.

Sections:

```text
Responsibilities
Connection
Preferences
What I remember
Knowledge
Logout
```

Connection:

```text
online status
account
logout
```

Technical configuration:

```text
BFF address
```

under:

```text
Connection
→ Advanced
```

Preferences preserve the existing model selection flow.

Do not recreate Me as a full page.

---

# 18. Login

Login remains contextual.

Existing behavior:

```text
needLogin
→ login sheet / contextual login UI
```

Preserve:

```text
loadToken
login
JWT
401 handling
```

Do not introduce new authentication semantics.

---

# 19. Talk

Talk becomes:

```text
/talk
```

stack route.

No Talk tab.

The production Talk runtime stays based on:

```text
ProjectChatZ
ChatPanelZ
MessageBubbleZ
StepRow
```

The migration changes the presentation layer, not runtime architecture.

---

## 19.1 Direct Talk

Pulse:

```text
Talk to Pulse…
```

→

```text
router.push("/talk")
```

Existing direct Talk session resolution remains unchanged.

---

## 19.2 Contextual Talk

Preserve existing route parameters:

```text
sessionId
projectPath
attId
attTitle
attSummary
attSubjectId
attState
autoContextText
autoSendContext
```

Do not invent a replacement context protocol.

---

## 19.3 Attention Resume/Create

Keep:

```text
resolveAttentionConversation
```

Semantics:

```text
existing relevant session
→ Resume

no session
→ Create
```

Do not create duplicate session logic in Pulse components.

---

# 20. Talk Visual Language

Target visual direction:

```text
Quiet Sci-Fi / AI Cockpit
```

### Header

```text
[←]  ● Pulse · STATE       [Layers] [×]
```

### AI messages

Normal AI messages:

```text
plain text
```

No generic bordered chatbot bubbles.

### User messages

User messages:

```text
subtle violet bubble
```

### Steps

Execution/step information:

```text
compact collapsible row
```

### Errors/system intervention

Use semantic compact surfaces/pills.

Do not force errors into the same visual form as normal conversation.

### Composer

```text
rounded capsule composer
+
external circular Send
```

Voice placeholder is removed in this migration because it currently has no real interaction.

Future voice can be introduced as a complete interaction capability.

---

# 21. D8 Message Visual Semantics

Final rule:

```text
Normal AI response
→ plain text

Step / execution narration
→ compact collapsible row

Error / system intervention
→ semantic pill / compact surface

User message
→ subtle violet bubble
```

This is a semantic distinction, not a styling preference.

Do not revert to a dual-sided bubble chatbot layout.

---

# 22. Runtime / Offline

Keep:

```text
classifyRuntimeFailure
runtimeFailureMessage
probeBffHealth
runtime-presence
```

Existing classifications remain:

```text
opencode-offline
bff-offline
auth
other
```

Do not expose raw transport/system details such as:

```text
502
ECONNREFUSED
raw network stack trace
```

---

## 22.1 Pulse offline presentation

Offline state:

```text
orb → static/offline
Hero → companion status line
```

Example conceptual wording:

```text
I'm having trouble reaching my runtime.
```

Exact copy can be refined.

---

## 22.2 Talk offline presentation

Preserve:

```text
talk-offline
```

testID.

Visual:

```text
semantic offline card
Retry
```

No new runtime state.

---

## 22.3 Reconnection

Preserve existing behavior:

```text
server.connected
→ refresh
```

and existing subscription/reconciliation behavior for:

```text
Attention
Proposal
L1
```

No new delivery mechanism.

---

# 23. Navigation Migration

Current:

```text
app/_layout.tsx
  └── (tabs)
```

Target:

```text
app/_layout.tsx
  └── index
  └── talk
  └── attention/[id]
  └── assignments
  └── assignments/[id]
  └── kb/doc
```

---

## 23.1 Route changes

### Pulse

```text
app/(tabs)/index.tsx
```

becomes:

```text
app/index.tsx
```

or equivalent root route.

### Talk

```text
app/(tabs)/talk.tsx
```

moves to:

```text
app/talk.tsx
```

### Memory

Top-level Memory route is removed.

Functionality becomes:

```text
Memory sheet
+
Settings entry
```

### Me

Top-level Me route is removed.

Functionality becomes:

```text
Settings sheet
```

### Existing contextual routes

Keep:

```text
/attention/[id]
/assignments
/assignments/[id]
/kb/doc
```

and visually migrate them where appropriate.

---

# 24. Deep Link Compatibility

Existing scheme:

```text
pulseapp
```

must continue working.

Before removing old route paths, inspect actual web/static/deep-link behavior.

Do not silently break:

```text
/talk
/pulse
```

If existing external references use:

```text
/memory
/me
```

the migration must either:

* preserve a compatibility redirect, or
* establish the project-supported fallback behavior.

Do not remove route compatibility merely because the UI no longer exposes those pages.

---

# 25. Production Visual Migration Strategy

Use Strategy B.

```text
Showcase2 visual language
        ↓
production theme / primitives
        ↓
production Pulse components
        ↓
production real hooks
        ↓
production runtime
```

Do NOT:

```text
Showcase2 mock app
        ↓
copy screens wholesale
```

Showcase2 remains independent.

No production import from:

```text
/showcase2
```

---

# 26. Theme Migration

Use Showcase2 visual language as the visual reference.

Target tokens:

```text
background          #0B0A10
elevated            #12111A
surface             #15141D
surfaceElevated     #1B1A26

border              rgba(255,255,255,.10)
borderSubtle        rgba(255,255,255,.055)

textPrimary         #F4F3F8
textSecondary       #A9A6BB
textMuted           #6F6C82

accent              #8B5CF6
accentBright        #A78BFA
accentDeep          #6D3EF0
```

Semantic colors remain separate.

Attention:

```text
amber
```

Success:

```text
green
```

Danger:

```text
red
```

Do not use violet for every semantic state.

---

# 27. Visual Hierarchy

Target principles:

```text
depth, not decoration
```

Use:

* tonal surfaces
* hairline borders
* restrained glow
* one focal AI identity element
* sparse accents

Avoid:

* cyberpunk
* neon overload
* HUD clutter
* giant Pulse orb
* excessive gradient
* heavy glassmorphism
* dense card grids
* dashboard ornamentation

---

# 28. Reusable Production Components

Preferred production components:

```text
AIOrb
AIStatus
PulseHero
FeaturedAttention
SupportingRow
NoticedRow
ConversationEntry

NoticedDetailSheet
FundSheet
SettingsSheet
MemorySheet
KbPreviewSheet

OverflowSheet
ProjectsSheet
```

These should use production primitives and production data types.

Do not copy Showcase2 mock components directly.

---

# 29. Data Mapping

| Showcase2 concept    | Production source                                                            |
| -------------------- | ---------------------------------------------------------------------------- |
| Featured Needs You   | `openPulseItems()`                                                           |
| Supporting Attention | remaining OPEN Attention                                                     |
| Suggested            | `proposedSuggestions()`                                                      |
| Noticed              | `useL1().noticed`, `kind=observation`                                        |
| Market               | `useL1().noticed`, `kind=market-estimate`                                    |
| Running              | `useProjectEvents().events`                                                  |
| Watching count       | `fetchAssignments()` + existing projection                                   |
| Talk context         | `buildAttentionContext` / `autoContextText` / `resolveAttentionConversation` |
| Memory               | `fetchMemories` + `buildMemoryGroups`                                        |
| Knowledge            | `searchKb` + `fetchKbDoc`                                                    |
| Runtime state        | existing runtime presence + failure classification                           |
| Hero                 | `getGreeting()` + static companion copy                                      |
| Conversation Entry   | `/talk`                                                                      |
| Settings             | existing Me data/services                                                    |
| Noticed detail       | existing `L1Statement` fields                                                |
| Fund sheet           | existing Market L1 data                                                      |

No new backend concept is required.

---

# 30. Semantic Red Lines

The following are implementation invariants.

## Attention

```text
OPEN
→ HANDLED | DISMISSED | EXPIRED
```

No new local state.

---

## Proposal

```text
PROPOSED
→ CONFIRMED
```

only through Confirm/activation path.

---

## L1

```text
L1
→ informational
```

No lifecycle.

---

## Today / Running

```text
runtime state
→ neutral information
```

Never create Attention.

---

## Market L1

```text
market-estimate
→ informational
```

Never create lifecycle/action semantics.

---

## Discuss

```text
Discuss
→ Talk
```

Never:

```text
Discuss
→ Confirm
```

---

## Talk

Normal conversation:

```text
AI plain text
User subtle bubble
```

No generic chatbot bubble wall.

---

# 31. What NOT to Change

Do NOT introduce:

* new canonical entity
* new lifecycle
* new scheduler
* new delivery architecture
* new Agent Registry
* A2A
* OpenThread
* new database table
* new backend product semantics
* Defer state
* WATCHING section
* ON MY PLATE
* Quick Actions directory
* Pulse TextInput
* Pulse Send button
* bottom tab bar
* drawer
* hamburger
* Bento dashboard
* fake voice interaction

Do not alter:

* Attention lifecycle
* Proposal activation matrix
* L1 semantics
* Today semantics
* existing Talk runtime
* streaming/typewriter mechanism
* pagination
* session resolution
* permission flow
* question flow
* slash command semantics
* assignment lifecycle

---

# 32. Open Decision History

Earlier exploratory decisions are retained only as history.

They are no longer implementation choices.

---

## Round 1 — Locked

### D1 — Supporting structure

Decision:

```text
ONE Supporting region
```

No micro-sections.

Categories are represented through row-level labels.

---

### D2 — Watching

Decision:

```text
Hero presence line
```

Final form:

```text
Watching N things for you ›
```

No WATCHING section.

---

### D3 — Defer

Decision:

```text
REMOVE
```

No local pseudo-state.

No mapping to Dismiss.

---

### D4 — Visibility budget

Decision:

```text
Featured ≤ 1
Supporting ≤ 4
Noticed ≤ 5
```

Overflow uses contextual sheets.

---

# 33. Round 2 — Locked

## D5 — Featured REVIEW

Decision:

```text
REVIEW
→ /attention/[id]
```

Rationale:

Featured represents something that deserves inspection, not an automatic jump into execution.

This preserves:

```text
Review
Discuss
Handle
Dismiss
```

as distinct actions.

---

## D7 — Mic

Decision:

```text
REMOVE PLACEHOLDER
```

Current production Mic is not a real voice capability.

It should not remain as:

```text
alert("Voice input")
```

Future voice capability can be introduced as a complete interaction.

---

## D8 — AI message visual semantics

Decision:

```text
Normal AI response
→ plain text

Step
→ compact collapsible row

Error/system intervention
→ semantic pill/surface

User
→ subtle violet bubble
```

Do not restore generic AI message bubbles.

---

## D9 — Talk visual migration timing

Decision:

```text
MIGRATE IN THE SAME UI BATCH
```

Reason:

Pulse and Talk form one Companion experience.

Leaving Talk on the old dashboard/chat visual system would create a visible product discontinuity.

Runtime architecture remains untouched.

---

# 34. Final Production IA — LOCKED

```text
ROOT

└── Pulse
    │
    ├── Header
    │   └── orb · state · Pulse · Settings
    │
    ├── Hero
    │   ├── greeting
    │   ├── AI companion line
    │   └── Watching N things for you ›
    │
    ├── Featured
    │   └── first OPEN Attention
    │
    ├── Supporting
    │   ├── remaining OPEN Attention
    │   ├── Suggested
    │   ├── Running
    │   └── Market
    │
    ├── Noticed
    │   └── observation L1
    │
    └── Conversation Entry
        └── Talk to Pulse…

CONTEXTUAL

├── Talk
│   └── /talk
│
├── Attention detail
│   └── /attention/[id]
│
├── Responsibilities
│   ├── /assignments
│   └── /assignments/[id]
│
├── Knowledge
│   └── /kb/doc
│
├── Settings
│   ├── Responsibilities
│   ├── Connection
│   ├── Preferences
│   ├── What I remember
│   ├── Knowledge
│   └── Logout
│
├── Memory sheet
├── Noticed detail sheet
├── Fund sheet
├── Project sheet
└── Login sheet
```

---

# 35. Final Supporting Model

```text
Supporting = ONE visual region

row-level category encoding:

NEEDS YOU
SUGGESTED
RUNNING
MARKET
```

Sorting:

```text
NEEDS YOU
→ SUGGESTED
→ RUNNING
→ MARKET
```

WATCHING does not appear here.

Overflow:

```text
More (n)
```

No state changes.

---

# 36. Final Responsibility Model

```text
Hero

Watching N things for you ›
```

When tapped:

```text
/assignments
```

No assignment list on Pulse.

No duplicated urgency.

No task dashboard semantics.

---

# 37. Final Attention Model

```text
Featured
  REVIEW
  Discuss

Supporting
  REVIEW
  Dismiss where semantically supported

Talk
  Mark handled
```

There is:

```text
NO DEFER
```

Lifecycle remains:

```text
OPEN
→ HANDLED
→ DISMISSED
→ EXPIRED
```

with the existing canonical semantics and terminal-state rules.

---

# 38. Final Visibility Budget

```text
Featured   ≤ 1
Supporting ≤ 4
Noticed    ≤ 5
```

This is a hard constraint.

The purpose is to protect:

```text
AI briefing
```

rather than:

```text
information feed
```

or:

```text
dashboard
```

---

# 39. Migration Risks

## P0

### 1. Global accent migration

Production currently has amber as a primary accent in places.

The migration must converge on the Showcase2 violet visual language without introducing multiple active design systems.

---

### 2. Attention semantic regression

Verify independently:

```text
Dismiss
Handle
Engage
```

remain reachable and retain their original meaning.

---

### 3. Talk session continuity

Verify:

```text
Direct Talk
Contextual Talk
Resume
Create
Session-lost recovery
```

after route migration.

---

### 4. Deep link / web route behavior

Verify:

```text
pulseapp
/talk
/pulse
```

and compatibility behavior for legacy `/memory` and `/me`.

---

## P1

### 5. Supporting density

The Supporting budget is intentionally small.

Validate real production data rather than designing for empty mock state.

### 6. Market visual density

Market values may require careful row composition so they remain readable without returning to ticker/dashboard presentation.

### 7. Responsibility discoverability

Mitigate through:

```text
Watching N things for you ›
+
Settings
```

### 8. Memory / Knowledge discoverability

Mitigate through:

```text
Settings
+
contextual Talk references
```

### 9. Permission / Question flows

These are high-impact blocking interactions.

Run dedicated regression tests after Talk visual migration.

### 10. Streaming / typewriter

Do not regress:

```text
revealChars
extraData
32ms delta buffer
time.created ordering
MessageBubble memoization
```

---

# 40. Migration Sequence — Final

```text
1. Theme
   ↓
2. Pulse visual primitives
   ↓
3. PulseScreen real-data migration
   ↓
4. Root navigation migration
   ↓
5. Talk visual migration
   ↓
6. Attention / Proposal semantic wiring
   ↓
7. Settings / Responsibilities
   ↓
8. Memory / Knowledge contextualization
   ↓
9. Today / Market / overflow sheets
   ↓
10. Offline / loading / empty-state normalization
   ↓
11. Regression + E2E + human-path audit
```

---

# 41. Final Acceptance Matrix

## Pulse

```text
[ ] no bottom tab bar
[ ] no Pulse TextInput
[ ] no Pulse Send button
[ ] Featured ≤ 1
[ ] Supporting ≤ 4
[ ] Noticed ≤ 5
[ ] no WATCHING section
[ ] no ON MY PLATE
[ ] no Defer
```

---

## Attention

```text
[ ] REVIEW → detail
[ ] Discuss → Talk
[ ] Dismiss → DISMISSED where applicable
[ ] Mark handled only in Talk
[ ] Engage remains separate
```

---

## Suggested

```text
[ ] statement → Discuss
[ ] Discuss does not confirm
[ ] Confirm activates
[ ] Reject/reject path remains reachable
```

---

## Noticed

```text
[ ] row → read-only detail sheet
[ ] Discuss → Talk
[ ] no lifecycle mutation
[ ] no Attention creation
```

---

## Running

```text
[ ] Running remains neutral
[ ] tap → Talk
[ ] no Attention/badge
[ ] idle projects remain reachable
```

---

## Market

```text
[ ] Market L1 remains informational
[ ] no Dismiss
[ ] no lifecycle
[ ] fund sheet reachable
[ ] market-related Attention remains distinct
```

---

## Responsibilities

```text
[ ] Watching N things for you ›
[ ] → /assignments
[ ] revoke
[ ] repair
[ ] compensate
[ ] history
```

---

## Memory / Knowledge

```text
[ ] Memory reachable from Settings
[ ] Forget works
[ ] Knowledge reachable
[ ] source chip works
[ ] preview works
[ ] OPEN works
[ ] ASK ABOUT THIS works
```

---

## Talk

```text
[ ] direct Talk
[ ] contextual Talk
[ ] Resume
[ ] Create
[ ] Layers
[ ] streaming
[ ] typewriter
[ ] pagination
[ ] abort
[ ] permission
[ ] question
[ ] slash commands
[ ] agent/model
[ ] session-lost recovery
[ ] offline retry
```

---

# 42. Final Hard Constraints

Before migration is considered complete, verify:

```text
NO bottom tab bar
NO Pulse TextInput
NO Pulse Send button
NO dashboard-like micro-sections
NO WATCHING section
NO ON MY PLATE
NO Defer
NO new lifecycle
NO new canonical entity
NO new backend product concept
NO Discuss → implicit Confirm
NO L1 → Attention
NO Today → Attention
NO Market L1 → lifecycle
NO generic AI bubble wall
NO fake Voice placeholder
NO Showcase2 runtime dependency
```

And verify:

```text
Featured <= 1
Supporting <= 4
Noticed <= 5
```

with:

```text
Supporting order:

NEEDS YOU
→ SUGGESTED
→ RUNNING
→ MARKET
```

The final production experience must read as:

```text
AI briefing the user
+
AI working in the background
+
user-directed conversation
```

rather than:

```text
dashboard
+
task manager
+
chat application
```

---

# Appendix A — Key Production Files

| Domain            | Production file                                                     |
| ----------------- | ------------------------------------------------------------------- |
| Pulse             | `agent-mobile-app/src/app/(tabs)/index.tsx`                         |
| Talk              | `agent-mobile-app/src/app/(tabs)/talk.tsx`                          |
| Chat shell        | `src/components/chat/zcode/ProjectChatZ.tsx`                        |
| Chat panel        | `src/components/chat/zcode/ChatPanelZ.tsx`                          |
| Messages          | `src/components/chat/zcode/MessageBubbleZ.tsx`                      |
| Steps             | `src/components/chat/zcode/StepRow.tsx`                             |
| Attention         | `src/services/attention/*`, `src/hooks/useAttentions.ts`            |
| Proposal          | `src/services/proposal/*`, `src/hooks/useSuggestions.ts`            |
| L1                | `src/services/l1.ts`, `src/hooks/useL1.ts`                          |
| Project / Today   | `src/hooks/useProjectEvents.ts`, `src/services/project-status.ts`   |
| Assignment        | `src/services/assignment/*`, `/assignments`, `/assignments/[id]`    |
| Memory            | `src/services/memory/client.ts`, current Memory route               |
| Knowledge         | `src/app/kb/doc.tsx`, KB services                                   |
| Settings source   | current `me.tsx` and auth/BFF/model services                        |
| Runtime           | `src/services/runtime-presence.ts`                                  |
| Theme             | `src/theme/*`                                                       |
| Showcase2 source  | `showcase2/SHOWCASE2_VISUAL_SPEC.md`, `SHOWCASE2_IMPLEMENTATION.md` |
| Product semantics | `docs/redesign/PRODUCT_MODEL.md`                                    |

---

# Appendix B — Showcase2 Relationship

Showcase2 remains:

```text
independent prototype
```

Production:

```text
real data
real hooks
real services
real runtime
```

Showcase2:

```text
visual reference
interaction reference
IA prototype
```

The production app must not import or depend on Showcase2 runtime code.

---

# Appendix C — Final Decision Summary

```text
ROUND 1

Supporting
→ ONE continuous region

Watching
→ Hero presence line

Defer
→ removed

Visibility
→ Featured ≤1
  Supporting ≤4
  Noticed ≤5


ROUND 2

Featured Review
→ /attention/[id]

Mic placeholder
→ removed

AI messages
→ plain text
Steps
→ compact row
Errors
→ semantic pill
User
→ subtle violet bubble

Talk visual migration
→ same batch as Pulse
```

---

# Final Status

```text
IA                 LOCKED
Semantics          LOCKED
Supporting model   LOCKED
Watching model     LOCKED
Defer              REMOVED
Visibility budget  LOCKED
Talk visual rules  LOCKED
Migration strategy LOCKED

Ready for:
PRODUCTION READ-WRITE UI MIGRATION
```
