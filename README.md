# Fanaxo AI

**A shared stadium operating layer for matchday** — one live state that connects fans, volunteers, and operators through trusted routing, crowd intelligence, and human-approved AI. Built for the FIFA World Cup 2026 hackathon challenge.

> ⚠️ Everything here — venue, match, tickets, crowd data, staff — is **simulated**. No real tournament data, branding, or personal information is used.

---

## The one-minute pitch

Large matchday venues suffer from fragmented information: fans get static maps and dead-end queues, volunteers lack live context, and operators stitch data together by hand while conditions change in minutes. Fanaxo turns live venue signals into **personalized fan guidance**, **structured volunteer actions**, and **human-approved operational decisions** — all sharing a single event model, so one decision ripples through every screen.

The headline is the **connected Gate C scenario**: an operator sees Gate C surge, the AI proposes a redirect to Gate D, the operator approves it, and in the same moment volunteers receive tasks, fans get rerouted with a multilingual alert, and the crowd model shifts — no page glued together with fake animations.

---

## What each role can do

| Role          | Experience                                                                                                                                                                                                                                                                   |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Fan**       | Verify a demo ticket → personalized crowd-aware route to your seat, step-free routing toggle, a **grounded AI assistant** (seat, facilities, route, kickoff — cites its sources, never guesses), a facilities finder with live walk times, and one-tap volunteer assistance. |
| **Volunteer** | Badge + OTP login → zone-scoped task list you can **accept / start / complete / escalate**, plus an **incident report** form that reaches the operator instantly.                                                                                                            |
| **Operator**  | Command center: live gate density, incidents, workforce, and AI recommendations. **Simulate a Gate C surge**, then **approve / reject** the AI plan — approving executes real actions (gate changes, volunteer tasks, localized notifications, fan reroutes).                |

---

## The connected demo (2-minute script)

1. Open three tabs: **Operator**, **Volunteer** (V-1001), **Fan** (demo ticket).
2. As the **Fan**, verify the demo ticket → see your route through Gate C to Section 214.
3. As the **Operator**, click **Simulate Gate C surge** → density spikes, a forecast warning appears, and the AI proposes a grounded response plan.
4. **Approve** the recommendation. Behind one click: volunteer tasks are assigned, a 3-language notification is sent, and fan routes recalculate.
5. Refresh the **Volunteer** tab → a "Crowd redirect support" task is waiting.
6. Refresh the **Fan** tab → "Gate C is congested. Please use Gate D for faster entry."
7. As the **Volunteer**, accept the task and report an incident → it appears on the operator feed immediately.

---

## Architecture

A pnpm + Turborepo monorepo with a strict, one-directional dependency graph:

```
apps/
  web/            Next.js App Router app — fan / volunteer / operator portals + APIs
packages/
  contracts/      Zod schemas: entities, API payloads, realtime events, actor identity
  domain/         Pure business rules — state machines, crowd-aware routing, forecasts
  auth/           Deny-by-default RBAC policy, token hashing, rate limiting
  db/             Drizzle + SQLite schema, committed migrations, deterministic demo seed
```

`contracts` ← `domain` / `auth` ← `db` ← `apps/web`. The domain and auth layers import no framework, database, or AI SDK — they're pure and unit-tested with plain values (ports-and-adapters).

**Principles the code holds to:**

- **AI is a copilot, not the source of truth.** Routes, densities, and operational state come from trusted services. The model _explains_ a route the graph service computed and _proposes_ plans as schema-validated objects — it never invents facts or executes actions. Every high-impact action requires explicit operator approval, and there's a deterministic fallback when no model is configured.
- **Server-side authorization, always.** Role, venue scope, and resource ownership are derived from the session, never trusted from the client. Authorization is deny-by-default and covered by negative (IDOR) tests.
- **Grounded, guarded assistant.** The fan assistant answers only from a fact sheet built by trusted services, treats the user's message as untrusted data, and escalates to a human when the facts don't cover the question.
- **Versioned realtime events.** Every state change is an idempotent, versioned envelope; consumers ignore stale versions and reconcile on reconnect.
- **Deterministic demo.** Seed data uses stable IDs and a configurable clock, so the connected scenario is reproducible on any machine.

---

## Tech stack

Next.js 15 (App Router, React 19) · TypeScript (strict) · Tailwind CSS · Zod · Drizzle ORM + SQLite · Anthropic Claude (optional, with deterministic fallback) · Vitest · ESLint (type-checked, complexity-budgeted) · Turborepo.

---

## Getting started

**Requirements:** Node.js ≥ 20, pnpm ≥ 9 (`npm i -g pnpm`).

```sh
pnpm install
pnpm dev            # start the web app
```

Open the URL it prints (default http://localhost:3000). In demo mode the app migrates and seeds a SQLite database automatically on first run — **zero setup, zero secrets required.**

Reset the demo to its known state at any time:

```sh
pnpm db:seed
```

### Demo credentials (demo mode only)

| Role          | Credential                                                                                    |
| ------------- | --------------------------------------------------------------------------------------------- |
| **Fan**       | Ticket `FNX-DEMO-GATEC-214-0001` — or click "Use the demo ticket"                             |
| **Volunteer** | Badge `V-1001` … `V-1008`, OTP `123456` — or click "Sign in as demo volunteer"                |
| **Operator**  | `operator@fanaxo.demo` / `FanaxoOps!2026`, MFA `123456` — or click "Sign in as demo operator" |

These are intentionally public and seeded only when `DEMO_MODE=true`. **No real secrets are in this repository.**

### Enabling Claude (optional)

The app runs fully without a key. To power the fan assistant and operator recommendations with Claude, copy `.env.example` to `.env.local` and set:

```
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=your-key
```

Without it (`AI_PROVIDER=mock`), a deterministic, grounded provider produces the same structured, human-approved outputs.

---

## Quality gates

```sh
pnpm typecheck      # strict TypeScript across every package
pnpm lint           # type-checked ESLint, complexity budget ≤ 12, no `any`
pnpm test           # unit + integration tests (in-memory SQLite)
pnpm format:check   # Prettier
```

Domain logic, authorization policy, state machines, routing, and the demo seed are covered by ~100 tests, including negative authorization (IDOR) and idempotency cases.

---

## Status & roadmap

The three portals, all role workflows, and the connected Gate C scenario are working end-to-end. Still on the roadmap:

- Live push (Server-Sent Events) so cross-role updates land without a refresh — the realtime event bus and versioned envelopes are already in place; the client subscription is the remaining piece.
- Animated 2D crowd simulation on the operator map.
- Expanded automated coverage (E2E, accessibility, and AI-safety suites) and architecture decision records.

Known limitations are documented honestly rather than hidden — the demo is designed to be reproducible and truthful about what is and isn't finished.

---

## License

MIT. Original identity and assets only — no protected tournament branding is reproduced.
