**FANAXO AI  /  BUILD SPEC 04** 

# **04** 

## **Technical Architecture and Codebase Structure** 

**Defines modular boundaries, repository organization, coding standards, and performance-aware platform architecture.** 

### **Evaluation Priority Order** 

**QUALITY TARGET: Build for the maximum possible evaluation score. No document can guarantee a numerical score, but the implementation must provide objective evidence for every criterion and must not be submitted while any highor medium-impact release gate is failing.** 

|**Impact**|**Criterion**|**Non-negotiable evidence**|
|---|---|---|
|**HIGH**|**Code Quality**|Clean, readable, modular, SOLID, strictly<br>typed, documented, and easyto extend.|
|**HIGH**|**Problem Statement Alignment**|Directly solves live stadium needs for fans,<br>volunteers, operators, organizers, and<br>venue staf.|
|**MEDIUM**|**Security**|Least privilege, server-side authorization,<br>validation, safe sessions, secure AI tools,<br>and auditability.|
|**MEDIUM**|**Eficiency**|Fast loading, bounded memory/CPU use,<br>optimized realtime updates, and browser-<br>safe simulation.|
|**LOW**|**Testing and Maintainability**|Automated validation of critical paths,<br>deterministic demos, and maintainable<br>contracts.|
|**LOW**|**Accessibility**|WCAG 2.2 AA, keyboard and screen-reader<br>support, reduced motion, and inclusive<br>routing.|



#### **Submission release gates** 

- Code Quality gate: strict TypeScript passes with zero errors; no any, @ts-ignore, circular dependencies, god components, duplicated business rules, or unexplained console warnings. 

- Alignment gate: the connected Gate C workflow works end-to-end and visibly benefits all three portals through shared state, not independent mock animations. 

- Security gate: authorization is enforced on the server for every privileged operation; secrets are absent from client bundles and repository history; high-severity findings are zero. 

- Efficiency gate: production build meets defined web performance and simulation budgets; no full React render per simulation frame; listeners, timers, and workers are cleaned up. 

- Testing gate: critical domain, API, authorization, and connected E2E scenarios pass deterministically in CI. 

- Accessibility gate: automated axe checks pass for critical screens and manual keyboard, focus, announcement, contrast, and reduced-motion checks are completed. 

**Product** 

Fanaxo AI - GenAI stadium operations and matchday experience platform 

**Primary quality gates** 

Code Quality | Security | Efficiency | Testing | Accessibility | 

Implementation-ready specification  |  Claude input pack Page 1 

**FANAXO AI  /  BUILD SPEC 04** 

Problem Statement Alignment 

### **1. Recommended implementation stack** 

|**Layer**|**Default choice**|**Reason**|
|---|---|---|
|Web framework|Next.js App Router with React and TypeScript|Server/client boundaries, routing, streaming, deployment fexibility|
|Styling|Tailwind CSS plus design tokens|Consistent responsive UI without one-of styles|
|Motion|Framer Motion; GSAP only for isolated<br>timelines|Maintainable animations and reduced-motion support|
|Simulation|Canvas or React Three Fiber with Web Worker|Eficient agent rendering and separated computation|
|Client state|Zustand for UI/demo state; TanStack Query for<br>server state|Clear separation and predictable caching|
|API|Next.js route handlers or separate FastAPI<br>adapter if already required|Typed contracts and simple deployment|
|Database|PostgreSQL with Prisma or Drizzle|Relational integrity and migrations|
|Validation|Zod at every trust boundary|Runtime and TypeScript contract alignment|
|Testing|Vitest, Testing Library, Playwright, axe-core,<br>MSW|Complete test pyramid|
|Observability|Structured logs, OpenTelemetry-compatible<br>tracing, Sentry-compatible errors|Debuggability and auditability|



Implementation-ready specification  |  Claude input pack Page 2 

**FANAXO AI  /  BUILD SPEC 04** 

### **2. Repository structure** 

|fanaxo/<br>apps/|
|---|
|web/|
|src/app/                 # route groups and layouts|
|src/features/            # role and domain feature modules|
|src/server/              # server-only actions, auth, services|
|src/components/          # app-level composition components|
|src/styles/              # global styles and tokens|
|public/                  # optimized static assets only|
|worker/                    # optional realtime or simulation service|
|packages/|
|ui/                        # accessible design-system primitives|
|domain/                    # pure entities, rules, state machines|
|contracts/                 # Zod schemas and API/event types|
|auth/                      # session and permission utilities|
|ai/                        # prompts, tools, guardrails, evaluations|
|simulation/                # graph, agents, density and forecasts|
|observability/             # logging, tracing and audit helpers<br>|
|confg/                    # shared lint, TS and test confguration|
|prisma/ or db/|
|schema, migrations, seed|
|tests/|
|e2e, performance, security, accessibility|
|docs/|
|ADRs, threat model, runbook, API notes<br>.github/workfows/|
|package.json|
|pnpm-workspace.yaml|
|turbo.json|



### **3. Feature module boundaries** 

|**Module**|**Owns**|**Must not own**|
|---|---|---|
|auth|Sessions, identity, roles, permissions|UI feature logic or AI prompts|
|tickets|Ticket verifcation and fan context|Raw QR rendering behavior|
|venues|Zones, gates, facilities, route graph|Operator permissions|
|crowd|Snapshots, density, forecasts, thresholds|Presentation-only colors|
|incidents|Incident lifecycle, assignment, resolution|AI vendor-specifc response objects|
|tasks|Volunteer work lifecycle|Authentication|
|notifcations|Audience, channels, localization, delivery state|Critical decisions without authorization|
|ai|Grounding, tools, structured recommendations, evaluations|Direct database access outside tools|
|simulation|Agents, graph weights, event-driven updates|React component state|
|reporting|Metrics and summaries|Mutating operational state|



Implementation-ready specification  |  Claude input pack Page 3 

**FANAXO AI  /  BUILD SPEC 04** 

### **4. Code quality rules** 

- Enable TypeScript strict mode, noUncheckedIndexedAccess, exactOptionalPropertyTypes, and consistent module resolution. 

- Avoid any. Use unknown plus validation when input type is uncertain. 

- Keep domain rules as pure functions or explicit services that can be unit tested without React or database setup. 

- Do not place business logic inside UI components, route pages, or animation callbacks. 

- Use dependency injection through constructor parameters or explicit function arguments for external services. 

- Prefer named exports, meaningful domain names, and small cohesive modules. 

- Limit files to a clear responsibility; split files that combine data access, business decisions, and rendering. 

- Use exhaustive checks for state-machine and role unions. 

- Centralize error types, HTTP mapping, user-safe messages, and telemetry metadata. 

- Document non-obvious algorithms and architecture decisions, not self-evident syntax. 

### **5. Server and client boundaries** 

- Keep database clients, credentials, authorization, AI API keys, signing keys, and audit writers in server-only modules. 

- Client components receive the minimum serializable data needed to render. 

- All mutations use server actions or authenticated API routes that validate input and permission. 

- Never trust role, venue ID, ticket owner, or incident severity supplied by the browser. 

- Use secure caching rules. Personal or operationally sensitive responses must not be publicly cached. 

- Prefer server components for static or initial data and client components only for interaction, animation, maps, and realtime state. 

### **6. Domain architecture** 

#### **6.1 Pure decision flow** 

- Input event -> validate contract 

- -> authenticate actor 

- -> authorize action and resource scope 

- -> load current aggregate/version 

- -> apply domain rule or state transition 

- -> persist transaction 

- -> append audit event 

- -> publish versioned realtime event 

- -> return safe response 

#### **6.2 Key state machines** 

- Incident: reported -> triaged -> assigned -> acknowledged -> responding -> resolved -> reopened. 

- Volunteer task: created -> delivered -> accepted -> in_progress -> completed or escalated or cancelled. 

- AI recommendation: generated -> awaiting_approval -> approved or modified or rejected -> executing -> measured -> closed. 

- Gate: open -> restricted -> closed -> reopening -> open. 

- Data feed: live -> delayed -> stale -> unavailable -> recovering -> live. 

### **7. Realtime architecture** 

- Use a typed event envelope with event ID, type, version, aggregate ID, venue ID, timestamp, correlation ID, and payload. 

- Use Server-Sent Events or WebSockets for the hackathon; hide the transport behind an adapter. 

- Every event is idempotent and versioned to handle reconnects and out-of-order delivery. 

- The client keeps a last-seen version and requests a snapshot when it detects a gap. 

- Do not push secrets, sensitive ticket fields, or unrelated venue data through broad channels. 

- Partition subscriptions by venue and role-relevant topics. 

Implementation-ready specification  |  Claude input pack Page 4 

**FANAXO AI  /  BUILD SPEC 04** 

### **8. Efficiency and performance architecture** 

|**Risk**|**Required mitigation**|
|---|---|
|Large 3D or agent load|Instanced rendering, adaptive agent count, Web Worker updates, 2D fallback|
|Dashboard re-render storms|Selector-based state subscriptions, memoized derived data, batched events|
|Heavy route graph|Precomputed adjacency, A* or Dijkstra with cached static costs and live deltas|
|Repeated AI requests|Cache safe grounded answers, stream responses, use small models for classifcation|
|Large initial bundle|Route-based splitting, lazy 3D import, optimized assets, no unused libraries|
|Realtime backpressure|Aggregate frequent telemetry into snapshots; throttle visual updates|
|Database contention|Indexes, bounded queries, transactions, optimistic concurrency|
|Slow external feeds|Timeouts, retries with jitter, circuit breakers, last-known-safe data|



### **9. Error handling and observability** 

- Use structured JSON logs with severity, event, actor type, venue, correlation ID, and safe metadata. 

- Never log ticket tokens, OTPs, session cookies, raw prompts containing personal data, or uploaded file contents. 

- Create route-level and component-level error boundaries. 

- Map internal errors to stable public error codes and recovery guidance. 

- Track latency for ticket verification, route calculation, incident submission, event delivery, and AI response. 

- Record audit events separately from debug logs and protect them from ordinary user modification. 

### **10. Engineering automation** 

Required local and CI commands: pnpm lint pnpm format:check pnpm typecheck pnpm test:unit pnpm test:integration pnpm test:e2e pnpm test:a11y pnpm test:security pnpm test:performance pnpm build pnpm analyze:bundle 

### **11. Architecture decision records** 

- ADR-001: Why one shared platform with role-based interfaces. 

- ADR-002: Realtime event transport and fallback. 

- ADR-003: 2D versus 3D simulation and performance thresholds. 

- ADR-004: Ticket-based fan session without storing unnecessary personal data. 

- ADR-005: Human approval and GenAI tool boundaries. 

- ADR-006: Database and schema strategy. 

- ADR-007: Deployment platform and secret management. 

### **12. Code review checklist** 

- [ ] Change has a clear feature or quality purpose. 

Implementation-ready specification  |  Claude input pack Page 5 

**FANAXO AI  /  BUILD SPEC 04** 

- [ ] Domain rule is tested independently. 

- [ ] Input is validated at the server boundary. 

- [ ] Authorization is enforced on the server. 

- [ ] No secret or sensitive data reaches client or logs. 

- [ ] Error and loading states are handled. 

- [ ] Accessibility and keyboard behavior are tested. 

- [ ] Performance impact is measured for simulation or large UI changes. 

- [ ] New API or event contract is versioned and documented. 

- [ ] CI passes without disabling rules or skipping tests. 

##### **CLAUDE EXECUTION RULE** 

Treat every MUST statement as an acceptance criterion. Do not replace functional workflows with static mockups. Do not claim completion until the relevant tests, security checks, accessibility checks, linting, type-checking, and production build all pass. 

### **High-Impact Code Quality Enforcement** 

- Adopt a ports-and-adapters architecture: domain and application layers must not import UI frameworks, database clients, AI SDKs, WebSocket libraries, or browser APIs. 

- Enable ESLint rules for complexity, import boundaries, unused code, promises, unsafe TypeScript operations, React hooks, and accessibility. 

- Use dependency-cruiser or an equivalent boundary checker to prevent circular and forbidden imports. 

- Require small, cohesive modules with explicit public APIs. Keep implementation details private to each feature. 

- Use Result or discriminated-union outcomes for expected failures; reserve exceptions for truly exceptional failures. 

- Create ADRs for authentication, realtime transport, simulation architecture, AI provider abstraction, and persistence choice. 

- Add code ownership and pull-request checks so architecture, security, tests, and accessibility cannot be bypassed. 

- Remove dead code, stale flags, commented-out implementations, placeholder handlers, and non-functional controls before submission. 

### **Static Quality Budgets** 

|**Measure**|**Target**|**Blocking threshold**|
|---|---|---|
|TypeScript errors|0|Anyerror|
|ESLint errors|0|Anyerror|
|Circular dependencies|0|Anycycle|
|Cyclomatic complexity|Prefer <= 8|No criticalpath > 12 without ADR|
|Duplicated business logic|0 known duplication|Any security/authorization/domain rule<br>duplicated|
|Public API documentation|100% of exported domain contracts|Missingcritical contract docs|
|Production console errors|0|Anyunexplained error or warning|



Implementation-ready specification  |  Claude input pack Page 6 

