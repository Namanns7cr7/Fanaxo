**FANAXO AI / BUILD SPEC 08**

# **08**

## **Implementation, Testing, Deployment and Claude Master Instructions**

**Turns the specifications into an execution plan with CI quality gates, demo proof, and a final build prompt.**

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

**FANAXO AI / BUILD SPEC 08**

Problem Statement Alignment

### **1. Order of execution**

1. Read all eight documents and create a requirements traceability checklist.

2. Audit the existing repository before changing architecture.

3. Establish linting, formatting, strict TypeScript, test runners, security scanning, and CI first.

4. Implement domain contracts, seeded data, auth/authorization, and shared event state.

5. Build functional role workflows with a simple 2D map before advanced 3D visuals.

6. Complete the connected Gate C scenario and automate it with E2E tests.

7. Add GenAI through guarded server tools and deterministic fallback.

8. Add the color, motion, and simulation polish without regressing accessibility or performance.

9. Run the full quality matrix, fix findings, and produce a submission-ready README and demo script.

### **2. Phased implementation plan**

| **Phase**     | **Deliverable**                                      | **Exit criteria**                                              |
| ------------- | ---------------------------------------------------- | -------------------------------------------------------------- |
| 0. Baseline   | Repository audit and quality tooling                 | Clean install, strict typecheck, lint, test and build commands |
| 1. Foundation | Design tokens, layouts, contracts, database, seed    | Reusable components and deterministic demo reset               |
| 2. Identity   | Fan ticket, volunteer, operator auth and RBAC        | Positive and negative authorization tests pass                 |
| 3. Core fows  | Fan, volunteer, operator screens and actions         | No broken primary control; role workfows complete              |
| 4. Realtime   | Shared events and connected Gate C scenario          | All three portals update without refresh                       |
| 5. AI         | Grounded copilots and approval fow                   | Structured output, safety and injection tests pass             |
| 6. Simulation | 2D/3D agents and operator controls                   | Visible response with acceptable frame rate                    |
| 7. Quality    | A11y, security, performance, resilience and docs     | All CI gates pass and no high-risk issue remains               |
| 8. Submission | Hosted app, demo accounts, video/script and evidence | Fresh clone to deployment and demo reproducible                |

### **3. Testing strategy**

| **Test layer** | **Scope**                                | **Examples**                                                         |
| -------------- | ---------------------------------------- | -------------------------------------------------------------------- |
| Unit           | Pure domain and utility logic            | Route costs, state machines, thresholds, redaction, permission rules |
| Component      | Accessible interactive UI                | Ticket form, task card, dialog focus, AI card, status labels         |
| Contract       | API/event schemas                        | Valid and invalid payloads, backward compatibility                   |
| Integration    | Server, database, auth, tools            | Ticket verifcation, incident transaction, gate action, audit event   |
| E2E            | Critical user journeys                   | All three logins and Gate C connected scenario                       |
| Accessibility  | Automated plus manual                    | axe, keyboard, focus, reduced motion, screen-reader smoke            |
| Security       | SAST, dependencies, auth negatives, DAST | IDOR, upload abuse, CSRF, XSS, prompt injection                      |
| Performance    | Web vitals and simulation load           | Lighthouse, bundle budget, agent FPS, event burst                    |
| Visual         | Critical responsive screens              | Screenshot regression for representative widths                      |
| AI evaluation  | Grounding, safety, structured actions    | Curated dataset and adversarial prompts                              |

Implementation-ready specification | Claude input pack Page 2

**FANAXO AI / BUILD SPEC 08**

### **4. Minimum automated test cases**

#### **4.1 Domain and API**

- Fan ticket verification succeeds for valid token and rejects invalid, expired, replayed, and wrong-match cases.

- Fan cannot read another fan session or ticket.

- Volunteer cannot assign tasks, close gates, or approve recommendations.

- Operator cannot act outside authorized venue.

- Incident creation is idempotent and writes audit plus realtime event.

- Gate closure changes graph cost and affected fan route.

- Step-free route never includes stairs.

- Out-of-order events do not overwrite newer aggregate state.

- Critical action fails without confirmation/reason where required.

#### **4.2 End-to-end**

- Fan demo ticket -> preferences -> dashboard -> navigation.

- Volunteer demo login -> accept task -> report incident -> resolve task.

- Operator login -> view warning -> approve plan -> assign volunteers -> publish alert.

- Connected Gate C scenario updates all three role sessions.

- AI low-confidence path shows escalation instead of invented answer.

- Keyboard-only user completes ticket and incident forms.

- Reduced-motion user can navigate without tunnel or agent motion.

### **5. Coverage and quality thresholds**

- At least 80 percent statement and branch coverage for domain packages.

- 100 percent explicit test coverage for authorization policy functions and critical state transitions.

- No skipped core E2E test in CI.

- Zero TypeScript errors, lint errors, unhandled test warnings, and production build errors.

- Zero critical/serious automated accessibility issue on core pages.

- Zero high/critical security finding or known production dependency vulnerability.

- Bundle and performance budgets documented and enforced where tooling supports them.

### **6. CI/CD pipeline**

- On every pull request: 1. Install with frozen lockfile 2. Validate formatting 3. Lint 4. Type-check 5. Unit and component tests with coverage 6. Contract and integration tests with ephemeral database 7. Build production application 8. Dependency and secret scan 9. Accessibility component scan 10. E2E smoke against preview build On main/release: 11. Full E2E and connected scenario 12. DAST baseline against deployed preview 13. Performance and bundle checks 14. AI evaluation suite 15. Deploy only when all required gates pass

Implementation-ready specification | Claude input pack Page 3

**FANAXO AI / BUILD SPEC 08**

### **7. Environment and deployment**

- Provide .env.example with names and descriptions only, never real secrets.

- Validate required environment variables at startup with a server-only schema.

- Use managed PostgreSQL and platform secret storage for hosted demo.

- Run database migrations as a controlled deployment step and seed only in demo environment.

- Use separate development, preview, and production/demo environments.

- Disable or strongly protect reset and seed endpoints outside demo/development.

- Configure HTTPS, secure cookies, CSP, exact allowed origins, logging, and error monitoring.

- Document rollback, demo reset, and service-degraded modes.

### **8. Performance validation**

| **Area**        | **Budget or acceptance**                                             |
| --------------- | -------------------------------------------------------------------- |
| Landing load    | Useful content before 3D; lazy-load heavy engine                     |
| Core Web Vitals | LCP < 2.5 s, INP < 200 ms, CLS < 0.1 on representative run           |
| Simulation      | Smooth on target laptop; adaptive count and 2D fallback              |
| Realtime        | UI update within 1 s locally and reconnect without duplicate actions |
| AI              | Stream response; timeout and deterministic fallback                  |
| Database        | Bounded queries, pagination, indexes verifed                         |
| Bundle          | No unused heavy dependency; route-level chunks reviewed              |
| Mobile          | Fan and volunteer fows remain responsive on constrained profle       |

### **9. Submission evidence**

- README with problem, architecture, setup, environment, demo accounts, commands, and limitations.

- Architecture diagram and data/event flow diagram.

- Threat model and accessibility checklist.

- Test report with coverage and passed E2E scenarios.

- Security scan summary and dependency status.

- Lighthouse or equivalent performance/accessibility evidence.

- AI evaluation summary including groundedness and adversarial tests.

- Two-minute demo script centered on the connected Gate C scenario.

- Clear disclosure that data, venue, tickets, and operations are simulated.

Implementation-ready specification | Claude input pack Page 4

**FANAXO AI / BUILD SPEC 08**

### **10. Claude master build instruction**

You are the lead engineer and product designer for Fanaxo AI.

Read all eight Fanaxo specification documents before editing code. Create a requirements traceability checklist and follow the documents in numeric order. The existing repository must be inspected first. Preserve sound code, but refactor weak structure rather than layering more duplication over it.

Build the complete responsive web application, not a landing-page mockup. Implement the fan, volunteer, and operator portals, all required routes, demo authentication, ticket personalization, venue navigation, incident workflow, operator command center, crowd simulation, guarded GenAI copilots, and the shared Gate C to Gate D realtime scenario.

Non-negotiable engineering requirements:

- Strict TypeScript and runtime validation at every trust boundary.

- Server-side authentication, authorization, venue scoping, and ownership checks.

- No secrets in source, client bundles, logs, prompts, screenshots, or sample data. - Modular feature and domain architecture with reusable accessible components.

- No business logic hidden in React presentation components. - No arbitrary HTML/SVG execution and no unsafe file handling.

- High-impact AI or operational actions require human approval and audit records. - Meaningful loading, empty, success, failure, offline, stale, and forbidden states. - Responsive fan and volunteer mobile flows and desktop operator experience.

- WCAG 2.2 AA target, keyboard support, screen-reader support, contrast, and reduced motion. - Efficient simulation with Web Worker/instancing or a 2D fallback.

- Unit, component, contract, integration, E2E, accessibility, security, performance, and AI safety tests.

Do not mark buttons as functional unless they perform the specified action. Do not leave coming-soon screens, TODO placeholders, disabled quality rules, skipped critical tests, or TypeScript/lint/build errors. Do not copy FIFA logos, the official trophy, official wordmarks, team crests, fonts, advertising footage, or exact animation frames. Use the supplied mark only as abstract visual inspiration and create an original Fanaxo identity.

After each phase:

1. Run formatter, lint, type-check, relevant tests, and production build.

2. Fix all failures rather than suppressing them.

3. Review security, accessibility, and performance impact.

4. Update the traceability checklist.

Before declaring completion, run the entire quality matrix and verify the connected demo in multiple simultaneous role sessions. Deliver a final summary containing architecture, routes, completed features, test results, security controls, accessibility evidence, performance evidence, known limitations, and exact commands to run the project.

### **11. Final judge-facing quality matrix**

| **Evaluation area** | **Evidence to show in repository/demo**                                                       |
| ------------------- | --------------------------------------------------------------------------------------------- |
| Code Quality        | Feature modules, strict typing, clean contracts, ADRs, review checklist, no dead UI           |
| Security            | Threat model, RBAC tests, headers, safe upload, secret scan, approval and audit               |
| Eficiency           | Lazy engine, worker/instancing, route caching, event aggregation, performance report          |
| Testing             | Coverage report, E2E video/log, contract tests, security/a11y/performance suites              |
| Accessibility       | WCAG checklist, axe results, keyboard demo, reduced motion and accessible routing             |
| Problem Alignment   | Three connected roles, live congestion scenario, multilingual/accessibility/operations impact |

Implementation-ready specification | Claude input pack Page 5

**FANAXO AI / BUILD SPEC 08**

### **12. Final go/no-go checklist**

- [ ] Fresh install and production build succeed.

- [ ] All required routes and demo accounts work.

- [ ] All core actions work without console errors.

- [ ] Gate C connected scenario is deterministic and repeatable.

- [ ] AI outputs are grounded, structured, permissioned, and safe.

- [ ] Security scans and negative authorization tests pass.

- [ ] Core accessibility audits and manual checks pass.

- [ ] Performance is acceptable with fallback behavior verified.

- [ ] Repository includes setup, architecture, threat, testing, and demo documentation.

- [ ] No protected tournament logo or media is shipped as Fanaxo branding.

- [ ] Known limitations are honest and do not undermine the core demo.

- [ ] The presentation explicitly connects each feature to a challenge stakeholder and judging criterion.

##### **CLAUDE EXECUTION RULE**

Treat every MUST statement as an acceptance criterion. Do not replace functional workflows with static mockups. Do not claim completion until the relevant tests, security checks, accessibility checks, linting, type-checking, and production build all pass.

### **Final Evaluator-First Master Instruction**

Claude must optimize implementation decisions in this exact order: (1) Code Quality, (2) Problem Statement Alignment, (3) Security, (4) Efficiency, (5) Testing and Maintainability, and (6) Accessibility. Do not spend time on additional visual spectacle while a higher-priority criterion has an open defect.

A nominal 100/100 cannot be guaranteed because scoring belongs to external evaluators. The project must instead maximize defensible evidence: every claim in the submission must be demonstrated by code, tests, reports, or a reproducible workflow.

- Before coding, produce a requirements-to-code-to-test traceability table and keep it current.

- After each implementation phase, run typecheck, lint, tests, security scans, and production build. Fix failures immediately.

- Before visual polish, complete the connected Gate C workflow with shared state and automated E2E coverage.

- Before submission, perform a red-team review for authorization, input validation, prompt injection, replay, data leakage, and resource exhaustion.

- Generate a final evidence folder containing architecture diagrams, scorecard, test report, coverage report, Lighthouse output, accessibility audit, security scan summaries, screenshots, and demo script.

- Do not claim a feature is complete unless it works in the production build and has an explicit acceptance test.

- Do not hide limitations. Document controlled fallbacks and known constraints honestly.

### **Definition of Done by Evaluation Criterion**

| **Criterion**     | **Defnition of done**<br>                                                                                                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Code Quality      | Strict build and lint pass; SOLID boundaries verifed; no god<br>modules/cycles/dead code; clear naming/docs; production console<br>clean.                                          |
| Problem Alignment | Fan ticket journey, volunteer response, operator decision, crowd<br>engine, multilingual/accessibility support, and realtime rerouting work<br>as one coherent challenge solution. |
| Security          | Server-side RBAC and resource checks pass negative tests; secrets<br>and sensitive data are protected; no unresolved high-severity scan<br>fndings.<br>                            |
| Eficiency         | Performance budgets met; simulation runs of the main UI path;<br>bounded events and cleanupverifed; mobile fallback works.                                                         |
| Testing           | Critical behavior has deterministic unit/integration/E2E tests in CI;<br>failure states and authorization denials are covered.                                                     |
| Accessibility     | Criticaljourneys are keyboard-operable,screen-reader                                                                                                                               |

Implementation-ready specification | Claude input pack Page 6

**FANAXO AI / BUILD SPEC 08**

understandable, contrast-compliant, responsive, and safe under reduced motion.

Implementation-ready specification | Claude input pack Page 7
