**FANAXO AI / BUILD SPEC 05**

# **05**

## **Data Model, APIs and Realtime Crowd Engine**

**Defines persistent entities, typed contracts, event propagation, routing, simulation, and seeded demo data.**

### **Evaluation Priority Order**

**QUALITY TARGET: Build for the maximum possible evaluation score. No document can guarantee a numerical score, but the implementation must provide objective evidence for every criterion and must not be submitted while any highor medium-impact release gate is failing.**

| **Impact** | **Criterion**                   | **Non-negotiable evidence**                                                                                     |
| ---------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **HIGH**   | **Code Quality**                | Clean, readable, modular, SOLID, strictly<br>typed, documented, and easyto extend.                              |
| **HIGH**   | **Problem Statement Alignment** | Directly solves live stadium needs for fans,<br>volunteers, operators, organizers, and<br>venue staf.           |
| **MEDIUM** | **Security**                    | Least privilege, server-side authorization,<br>validation, safe sessions, secure AI tools,<br>and auditability. |
| **MEDIUM** | **Eficiency**                   | Fast loading, bounded memory/CPU use,<br>optimized realtime updates, and browser-<br>safe simulation.           |
| **LOW**    | **Testing and Maintainability** | Automated validation of critical paths,<br>deterministic demos, and maintainable<br>contracts.                  |
| **LOW**    | **Accessibility**               | WCAG 2.2 AA, keyboard and screen-reader<br>support, reduced motion, and inclusive<br>routing.                   |

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

Implementation-ready specification | Claude input pack Page 1

**FANAXO AI / BUILD SPEC 05**

Problem Statement Alignment

### **1. Data principles**

- Collect and store only data required for the product workflow.

- Use stable IDs, foreign keys, timestamps, status enums, and optimistic version fields.

- Keep personal fan data separate from operational telemetry.

- Represent live values as time-stamped snapshots, not mutable unexplained numbers.

- Use transactions for state changes that publish events or create audit records.

- All API and event payloads use shared Zod schemas and inferred TypeScript types.

### **2. Core entities**

| **Entity**       | **Key felds**                                                                  | **Notes**                                                                            |
| ---------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| User             | id, role, displayName, locale, status                                          | No password storage in application code; use auth<br>provider or secure hash service |
| Venue            | id, name, timezone, status                                                     | Root scope for operational data                                                      |
| Zone             | id, venueId, name, type, capacity, geometryRef                                 | Gate, concourse, section, facility, transport                                        |
| Match            | id, venueId, homeLabel, awayLabel, startsAt, status                            | Use demo country labels without protected crests                                     |
| Ticket           | id, matchId, gateId, section, row, seat, tokenHash, status                     | Store hash, not raw ticket token                                                     |
| FanSession       | id, ticketId optional, locale, accessibilityProfle, expiresAt                  | Short lived and minimal                                                              |
| VolunteerProfle  | userId, venueId, roleType, zoneId, shiftStart, shiftEnd                        | Least-privilege scope                                                                |
| GateState        | gateId, status, queueMinutes, throughput, version, updatedAt                   | Current materialized state plus history                                              |
| CrowdSnapshot    | venueId, zoneId, capturedAt, count, density, fowRate, confdence                | Aggregated anonymous telemetry                                                       |
| Route            | id, fromNode, toNode, accessibilityFlags, baseCost, status                     | Graph edges or route records                                                         |
| Incident         | id, venueId, zoneId, category, severity, status, reporter, summary,<br>version | Lifecycle controlled by state machine                                                |
| Task             | id, incidentId optional, assigneeId, priority, status, dueAt,<br>instructions  | Volunteer work item                                                                  |
| AIRecommendation | id, contextType, contextId, proposal, confdence, sources, status               | Requires approval for operational action                                             |
| Notifcation      | id, audience, locale, channel, message, status                                 | Targeted and auditable                                                               |
| AuditEvent       | id, actor, action, resource, beforeHash, afterHash, reason,<br>correlationId   | Append-only application record                                                       |

### **3. Suggested relational constraints and indexes**

- Unique ticket token hash and match-seat combination for demo data.

- Index CrowdSnapshot on venueId, zoneId, capturedAt descending.

- Index Incident on venueId, status, severity, createdAt descending.

- Index Task on assigneeId, status, priority, createdAt descending.

- Index AuditEvent on venueId, correlationId, createdAt descending.

- Use check constraints for normalized density and confidence ranges.

- Use foreign-key restrictions or soft-delete policy for referenced operational records.

- Use version integer for optimistic concurrency on Incident, Task, GateState, and AIRecommendation.

Implementation-ready specification | Claude input pack Page 2

**FANAXO AI / BUILD SPEC 05**

### **4. API design**

| **Method and route**                            | **Purpose**                                                       | **Authorization**                                  |
| ----------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------- |
| POST /api/fan/tickets/verify                    | Verify demo ticket and create fan session                         | Public with rate limit and anti-replay<br>controls |
| GET /api/fan/context                            | Return safe match, destination, preferences, and current<br>route | Fan session                                        |
| PUT /api/fan/preferences                        | Update locale and accessibility preferences                       | Own fan session                                    |
| POST /api/fan/assistance                        | Create fan assistance request                                     | Fan session                                        |
| GET /api/volunteer/dashboard                    | Tasks, alerts, zone, and shift data                               | Volunteer within venue scope                       |
| POST /api/incidents                             | Create validated incident                                         | Fan limited, volunteer, or operator                |
| PATCH /api/tasks/:id                            | Accept, progress, resolve, or escalate task                       | Assigned volunteer or operator                     |
| GET /api/operator/snapshot                      | Operational dashboard snapshot                                    | Operator venue scope                               |
| POST /api/operator/recommendations/:id/decision | Approve, modify, or reject AI plan                                | Authorized operator with reason                    |
| PATCH /api/gates/:id/state                      | Restrict, close, or reopen gate                                   | Authorized operator with<br>confrmation            |
| POST /api/notifcations                          | Create localized target alert                                     | Authorized operator                                |
| GET /api/reports/match-day                      | Return metrics and summary                                        | Authorized operator                                |
| GET /api/audit                                  | Query scoped audit events                                         | Authorized operator or own-activity<br>scope       |

### **5. Contract example**

const IncidentCreateSchema = z.object({ venueId: z.string().uuid(), zoneId: z.string().uuid(), category: z.enum([ "crowd_congestion", "medical", "lost_child", "security", "accessibility", "facility", "transport", "lost_item" ]), description: z.string().trim().min(10).max(1000), severityHint: z.enum(["low", "medium", "high", "critical"]).optional(), clientRequestId: z.string().uuid(), attachmentIds: z.array(z.string().uuid()).max(3).default([]) });

// Server derives reporter, venue permission, trusted timestamp, // final severity, status, version, and audit metadata.

Implementation-ready specification | Claude input pack Page 3

**FANAXO AI / BUILD SPEC 05**

### **6. Realtime event envelope**

type RealtimeEvent<T> = { eventId: string; eventType: EventType; schemaVersion: 1; venueId: string; aggregateId: string; aggregateVersion: number; occurredAt: string; correlationId: string; payload: T; };

#### **6.1 Required event types**

- crowd.snapshot.updated

- crowd.forecast.updated

- gate.state.changed

- incident.created

- incident.status.changed

- task.assigned

- task.status.changed

- recommendation.created

- recommendation.decision.recorded

- fan.route.updated

- notification.published

- feed.status.changed

### **7. Route graph and accessibility model**

- Represent venue navigation as nodes and directed edges.

- Node types: entrance, gate, corridor junction, section, lift, ramp, stairs, restroom, food, medical, exit, transit.

- Edge fields: distance, expected time, capacity, live density, status, slope, stairs, lift dependency, indoor/outdoor, sensory intensity.

- Route cost combines distance, queue, density, closure, accessibility constraints, and user preference.

- Hard accessibility constraints exclude invalid edges; soft preferences change cost.

- Never generate a route solely from the language model. The model may explain a path calculated by the trusted graph service.

edgeCost = baseTravelTime

- - congestionPenalty(density, capacity)

* queuePenalty(queueMinutes)

- - preferencePenalty(userPreferences)

- - operationalPenalty(edgeStatus)

Closed or inaccessible edge -> Infinity

### **8. Crowd simulation engine**

#### **8.1 Minimal agent model**

- Each agent has current node/position, destination, speed, route, role tag, and accessibility flag.

- Use graph-based pathfinding for destinations and lightweight local separation for visual agents.

- Recalculate only agents affected by a changed edge or destination.

- Aggregate agents into zone counts and flow rates for dashboards.

- Run computation in a Web Worker; render using Canvas or instanced WebGL.

Implementation-ready specification | Claude input pack Page 4

**FANAXO AI / BUILD SPEC 05**

- Use deterministic seeded random numbers so tests and demonstrations are repeatable.

#### **8.2 Forecast model for demo**

- Use recent density, arrival rate, departure rate, gate throughput, and scheduled phase as features.

- Implement a transparent heuristic or small time-series model for the hackathon; do not imply production safety certification.

- Return forecast value, horizon, confidence, contributing signals, and model version.

- Thresholds are venue configuration, not hard-coded throughout the UI.

### **9. Ticket and QR safety**

- Demo QR contains a random opaque ticket token, not personal details.

- Server stores only a one-way hash of the token.

- Verification endpoint is rate limited and returns generic errors where necessary to prevent enumeration.

- Fan session is short lived, secure, HttpOnly, SameSite, and scoped to the selected match.

- Uploaded ticket images are size/type validated, scanned, processed in isolation, and deleted according to policy.

- Never execute or render untrusted SVG, HTML, JavaScript, or QR payload as markup.

### **10. Seeded demo dataset**

- One fictional venue with 4 gates, 8 concourse zones, 12 seating sections, 3 accessible lifts, 2 ramps, facilities, and 2 transit exits.

- One fictional match using country labels or fictional team names without protected crests.

- One demo fan ticket assigned to Gate C and Section 214.

- Eight volunteers across fan support, crowd management, accessibility, transport, and medical liaison roles.

- Initial Gate C density trend that can be accelerated by a simulation control.

- One optional facility incident and one accessibility request for additional demo paths.

- Deterministic identifiers and timestamps relative to a configurable demo clock.

### **11. Data and API acceptance tests**

- [ ] Invalid input is rejected before domain processing.

- [ ] Authorization cannot be bypassed by changing IDs in requests.

- [ ] Duplicate clientRequestId does not create duplicate incident.

- [ ] Concurrent task updates produce a conflict instead of silent overwrite.

- [ ] Out-of-order realtime events do not roll state backward.

- [ ] Gate closure invalidates affected routes and creates versioned updates.

- [ ] Accessibility constraints never return stairs-only route for step-free requirement.

- [ ] Raw QR token, OTP, and secrets never appear in logs or API responses.

- [ ] Queries use indexes and bounded pagination.

- [ ] Demo seed can be reset to a known state through a protected development command.

##### **CLAUDE EXECUTION RULE**

Treat every MUST statement as an acceptance criterion. Do not replace functional workflows with static mockups. Do not claim completion until the relevant tests, security checks, accessibility checks, linting, type-checking, and production build all pass.

Implementation-ready specification | Claude input pack Page 5
