# Agent Mobile / Pulse

> A persistent AI companion for your work — with **Pulse** as the proactive surface and **OpenCode** as the current agent runtime.

Agent Mobile / Pulse is an accepted MVP (see [MVP_ACCEPTANCE](docs/redesign/MVP_ACCEPTANCE.md)): one continuous AI companion that understands your current work, accepts responsibilities, performs them asynchronously, notices meaningful outcomes, and comes back to you when something needs your attention.

This is **not** an OpenCode client or dashboard. OpenCode is the current runtime implementation — a choice, not the product identity; the product semantics are runtime-independent and the runtime is replaceable ([PRODUCT_MODEL §34](docs/redesign/PRODUCT_MODEL.md)).

## The four surfaces

| Surface | Meaning | What it shows |
|---|---|---|
| **Pulse** | *"I noticed."* | The proactive surface. Five presentation groups (below). |
| **Talk** | *"Let's think."* | Two-way conversation with the Agent Session (Resume existing / Create new), explicit decisions, `/assign` `/confirm` `/reject` commands, handling. |
| **Memory** | *"I remember."* | Long-term understanding: memory projection, Responsibilities (assignment management with authorization & execution history), Knowledge Base retrieval. |
| **Me** | *"I understand how we work together."* | Account, BFF endpoint, model preferences. |

Pulse presentation groups — all of them are **presentations, not new entities**:

- **Needs You** — Attention Items: persistent records of matters currently waiting for the user.
- **Suggested** — user-facing projection of Assignment Proposals ("the agent suggests taking on a responsibility"). Confirm / Reject are the only ways forward.
- **Noticed** — authorized L1 / Observation statements: informational, no action required, no lifecycle.
- **Today** — running projects (informational).
- **Market** — fund estimate marquee (informational L1).

## Architecture (high level)

```text
User
  ↓
Agent Session (OpenCode — current runtime)
  ↓
Conversation / Decision
  ├── Assignment      (responsibility: proposal → explicit confirm → active)
  ├── Open Thread     (Post-MVP)
  ├── Raw Idea        (→ Knowledge Base)
  └── Memory

Assignment → Trigger → Execution → Event          (Event = a fact, append-only)

Event → Attention (waiting for the user) → Pulse "Needs You" → Talk → Handling
Event → authorized Observation rule
        ├── L1 statement   (presentation, not a canonical entity) → Pulse "Noticed"
        └── Proposal       (canonical while proposed)
              → Pulse "Suggested" → Confirm (the activation moment, explicit) → Assignment
                                  → Reject → nothing becomes active
```

Core semantics (authoritative in [PRODUCT_MODEL](docs/redesign/PRODUCT_MODEL.md)):

- **Event** is a fact. It is never an Attention by itself.
- **Attention** is a persistent record that something needs user handling (`OPEN → HANDLED / DISMISSED / EXPIRED`). Viewing it, or talking about it, never advances its state.
- **L1** is presentation. It is not a canonical entity and carries no obligation.
- **Suggested** is a projection of an Assignment Proposal — the proposal (in the BFF) remains the single source of truth.
- **Assignment activation requires explicit authorization** (per-domain confirmation matrix). Seeing a Suggestion, opening it, or entering Talk never confirms anything.
- **Pulse owns no business state.** It renders; canonical state lives in the BFF (SQLite), OpenCode (sessions), Memory and Knowledge Base files.

## Documentation

| Document | Role |
|---|---|
| [docs/redesign/PRODUCT_MODEL.md](docs/redesign/PRODUCT_MODEL.md) | **Canonical, frozen semantic model** — the single source of product meaning. |
| [docs/redesign/FINAL_ARCHITECTURE.md](docs/redesign/FINAL_ARCHITECTURE.md) | **Implementation architecture** — entities, authority model, lifecycles, recovery, security boundaries. |
| [docs/redesign/MVP_ACCEPTANCE.md](docs/redesign/MVP_ACCEPTANCE.md) | **Final acceptance result** — `ACCEPTED WITH NON-BLOCKING GAPS`, known issues, post-MVP register. |
| [docs/knowledge-base/INDEX.md](docs/knowledge-base/INDEX.md) | **Knowledge base** — module docs, API, data flows, operations, conventions. |
| [docs/redesign/](docs/redesign/) | Phase 9–13 design / report / audit trail. |

## Repository layout

```text
├── agent-mobile-app/      # ★ the active Expo (SDK 57) app — Pulse / Talk / Memory / Me
│   ├── src/app/           #   routes (tabs + assignments/attention screens)
│   ├── src/services/      #   BFF clients (attention / assignment / proposal / l1 / memory / kb)
│   └── src/components/    #   component library (theme tokens only)
├── src/                   # design-era React/TSX reference (not running code)
├── showcase/              # static HTML UI prototype (historical)
├── docs/
│   ├── redesign/          # ★ product model / architecture / acceptance / phase docs
│   └── knowledge-base/    # ★ module docs, API, data flows, operations
└── test/                  # throwaway test scripts, screenshots, logs (not shipped)
```

## Setup

**Prerequisites**: Node.js 20+ and pnpm. The app talks to a **BFF** (the `family-finance` repo — a separate Git repository) which owns all product state, and an **OpenCode server** for session/chat content.

**1. BFF (family-finance, separate repo)**

```bash
cd family-finance
pnpm install:all
# packages/web/.env.local — JWT_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD, OPENCODE_* (see family-finance docs)
./app.sh start            # next dev on :19234 (or: pnpm dev)
```

**2. Mobile app (this repo)**

```bash
cd agent-mobile-app
pnpm install

# .env.local (gitignored) — point the app at the BFF:
#   EXPO_PUBLIC_OPENCODE_URL=http://<bff-host>:19234

pnpm start                # Expo dev server
```

**3. Web static build (current deployment shape, served on :9928)**

```bash
cd agent-mobile-app
EXPO_PUBLIC_OPENCODE_URL=http://<bff-host>:19234 pnpm exec expo export --platform web --clear
# dist/ is served by scripts/serve-static.mjs (port 9928); restart that service to pick up a new bundle
```

## Testing

```bash
cd agent-mobile-app
pnpm test                 # vitest unit tests (pure logic: stores/projections/clients)
pnpm exec tsc --noEmit    # typecheck
pnpm lint                 # expo lint

pnpm e2e                  # Playwright E2E (sends a real chat message — use deliberately)
pnpm e2e:nosend           # same, skips the message step
node scripts/e2e/phase9-e2e.mjs    # Phase 9 suite (Responsibilities / details)
node scripts/e2e/phase13-e2e.mjs   # Phase 13 suite (Suggestion → Confirm/Reject → cleanup)
```

E2E dependencies: a served web build (default `E2E_URL=http://127.0.0.1:9928/`), a reachable BFF (`E2E_BFF_URL` or `EXPO_PUBLIC_OPENCODE_URL`), and admin credentials (read from the BFF's `.env.local`, or `E2E_USER`/`E2E_PASS`). E2E drives only existing BFF APIs and revokes the assignment it creates. The OpenCode runtime is needed for chat/project content; Pulse product groups work without it.

BFF tests (separate repo): `cd family-finance && pnpm test` — all tests run against isolated temp databases; a fail-fast guard refuses to touch the production database from tests. Typecheck: `cd family-finance/packages/web && npx tsc --noEmit`.

## Current MVP scope (accepted)

Event pipeline · Attention lifecycle · Assignment + Assignment Proposal (confirmation matrix) · Agent Observation (repeated-decline) · L1 presentation · Pulse **Needs You / Suggested / Noticed / Today / Market** · Talk & handling · Memory / Knowledge Base · delivery infrastructure (outbox + Email/WeCom/WeChat adapters) · restart/recovery semantics · authorization boundaries (nothing activates without explicit confirmation).

## Post-MVP (planned, not in the current MVP)

Observation → Attention path · LLM-driven observation · Open Thread · richer proactive behavior · push delivery expansion · agent-runtime abstraction. See [MVP_ACCEPTANCE](docs/redesign/MVP_ACCEPTANCE.md) and [BACKLOG](docs/redesign/BACKLOG.md).
