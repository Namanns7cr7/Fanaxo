# Fanaxo AI

**GenAI stadium operations and matchday experience platform** — a shared operating layer connecting fans, volunteers, and operators through live state, trusted routing, and human-approved AI recommendations. Built for the FIFA World Cup 2026 hackathon challenge.

> ⚠️ All data, venues, tickets, matches, and operations in this project are **simulated**. No real tournament data, branding, or personal information is used.

## What it does

- **Fans** verify a demo match ticket, get a personalized crowd-aware route to their seat, accessible (step-free) routing, live rerouting when conditions change, and multilingual alerts.
- **Volunteers** log in with a badge, receive prioritized tasks, report incidents, and see zone conditions live.
- **Operators** watch a live command center (gates, density, forecasts, incidents), receive AI congestion recommendations, and approve/modify/reject them — every approval executes real actions (gate restriction, volunteer tasks, localized notifications) that update all three portals in realtime.
- **The connected Gate C scenario**: rising density at Gate C → forecast warning → AI proposes redirecting fans to Gate D → operator approves → volunteer tasks appear, fan routes recalculate, and the simulation shifts — all without a page refresh.

## Status

🚧 **Work in progress.** Foundation packages are complete and tested; the web application is under active construction.

| Layer                                                                        | Status          |
| ---------------------------------------------------------------------------- | --------------- |
| `packages/contracts` — Zod schemas, realtime event envelope, API contracts   | ✅ done, tested |
| `packages/domain` — state machines, crowd-aware routing, forecasts           | ✅ done, tested |
| `packages/auth` — deny-by-default RBAC policy, tokens, rate limiting         | ✅ done, tested |
| `packages/db` — Drizzle + SQLite schema, migrations, deterministic demo seed | ✅ done, tested |
| `apps/web` — Next.js app (all role portals, APIs, SSE realtime, AI copilots) | 🚧 in progress  |
| Simulation, E2E tests, a11y/security audits, ADRs, evidence pack             | ⬜ pending      |

## Repository structure

```
fanaxo/
  apps/
    web/                # Next.js App Router application (fan/volunteer/operator)
  packages/
    contracts/          # Zod schemas: entities, API payloads, realtime events, actors
    domain/             # Pure business rules (no framework imports)
    auth/               # Authorization policy, token primitives, rate limiter
    db/                 # Drizzle schema, committed SQL migrations, demo seed
  01..08_*.md           # Build specification documents (input pack)
```

Dependency direction is strictly one-way: `contracts` ← `domain`/`auth` ← `db` ← `apps/web`.

## Getting started

Requirements: **Node.js ≥ 20**, **pnpm ≥ 9** (`npm i -g pnpm`).

```sh
pnpm install
pnpm typecheck   # strict TS across all packages
pnpm lint        # type-checked ESLint, complexity budget ≤ 12
pnpm test        # unit + integration tests (in-memory SQLite)
pnpm dev         # start the web app (once apps/web lands)
```

The database is SQLite (zero infrastructure): on first run in demo mode the app migrates and seeds itself. Reset to the known demo state anytime with `pnpm db:seed`.

## Demo credentials (demo mode only)

| Role      | Credential                                                   |
| --------- | ------------------------------------------------------------ |
| Fan       | Ticket token `FNX-DEMO-GATEC-214-0001` (Gate C, Section 214) |
| Volunteer | Badge `V-1001` … `V-1008`, OTP `123456`                      |
| Operator  | `operator@fanaxo.demo` / `FanaxoOps!2026`, MFA `123456`      |

These are intentionally public demo credentials, seeded only when `DEMO_MODE=true`. No real secrets live in this repository; see `.env.example`.

## Environment

Copy `.env.example` to `.env.local`. Everything has a working default — the demo runs with **zero secrets**. Optionally set `AI_PROVIDER=anthropic` and `ANTHROPIC_API_KEY` to power the operator copilot with Claude; otherwise a deterministic rule-based provider produces the same structured, human-approved recommendations.

## Architecture notes

- **Trust boundaries**: every API input is Zod-validated; role, venue scope, and ownership are derived from server-side sessions, never from the client. Authorization is deny-by-default and covered by negative tests.
- **Realtime**: versioned, idempotent event envelopes over SSE; clients ignore stale versions and reconcile on reconnect.
- **AI is a copilot, not the source of truth**: routes and operational state come from trusted services; the model proposes schema-validated plans that require operator approval, with a deterministic fallback when the model is unavailable.
- **Deterministic demo**: seed data uses stable IDs and a configurable demo clock, so the connected scenario is repeatable everywhere.

Full design rationale lives in the spec documents (`01`–`08`) and will be captured in ADRs under `docs/` before submission.
