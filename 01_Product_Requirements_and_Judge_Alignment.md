**FANAXO AI / BUILD SPEC 01**

# **01**

## **Product Requirements and Judge Alignment**

**Defines what to build, why it matters, and how every feature maps to the evaluation criteria.**

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

**FANAXO AI / BUILD SPEC 01**

Problem Statement Alignment

### **1. How Claude must use this document**

1. Read this document before writing code.

2. Use it as the product source of truth when other documents discuss implementation details.

3. Resolve ambiguity in favor of the smallest complete, secure, accessible, and demonstrable workflow.

4. Keep all three user groups connected through shared real-time state: fans, volunteers, and operators.

5. Reject scope that is decorative but does not improve the judging criteria or the connected demo.

### **2. Challenge interpretation**

Build a GenAI-enabled web solution that improves stadium operations and the tournament experience during the FIFA World Cup 2026. The system must create measurable value for fans, organizers/operators, volunteers, and venue staff through navigation, crowd management, accessibility, transportation, multilingual assistance, sustainability, operational intelligence, or real-time decision support.

##### **Product thesis**

Fanaxo AI is a shared stadium operating layer. A fan ticket personalizes the experience; volunteers act as the ground network; operators supervise decisions through a live digital twin and GenAI copilot.

### **3. Core problem statement**

Large matchday venues suffer from fragmented information, static navigation, slow incident escalation, crowd bottlenecks, language barriers, accessibility gaps, and disconnected staff workflows. Fans receive generic or outdated guidance, volunteers lack instant access to verified procedures, and operators must combine data manually while conditions change in minutes.

Fanaxo AI must turn live venue signals into personalized fan guidance, structured volunteer actions, and human-approved operational recommendations.

### **4. Product users and jobs to be done**

| **Role**   | **Primary job**                                                                 | **Critical pain**                                               | **Fanaxo outcome**                                                          |
| ---------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Fan        | Enter, navigate, use facilities,<br>travel, and request help                    | Static maps, queues, language and<br>accessibility barriers     | Ticket-aware, multilingual, live route<br>and assistance                    |
| Volunteer  | Help fans and manage local<br>crowd conditions                                  | Incomplete context, repetitive<br>questions, unclear escalation | Task-focused copilot, live alerts,<br>structured incident reporting         |
| Operator   | Maintain safe, eficient venue<br>operations                                     | Fragmented systems and late detection                           | Digital twin, predictive insights,<br>resource recommendations, audit trail |
| Venue staf | Respond to medical, security,<br>maintenance, transport, and<br>facility issues | Poor incident detail and overloaded<br>communication            | Structured, prioritized, location-aware<br>work items                       |

### **5. Product scope**

#### **5.1 Mandatory MVP**

- Responsive web application with role-based entry for fan, volunteer, and operator.

- Fan access through a demo match-ticket QR code, upload, or ticket ID.

Implementation-ready specification | Claude input pack Page 2

**FANAXO AI / BUILD SPEC 01**

- Fan dashboard with personalized gate, seat, crowd-aware route, nearby facilities, transport, accessibility, and AI assistance.

- Volunteer login, zone assignment, task list, AI procedure support, and incident reporting by text, voice simulation, or image upload.

- Operator command center with crowd heatmap or digital twin, incidents, gates, volunteers, live metrics, and AI recommendations.

- A connected scenario where Gate C congestion changes the operator view, volunteer tasks, fan route, and simulation state.

- Human approval before critical operational actions.

- Persistent audit events for ticket verification, incident creation, task assignment, recommendation approval, and route changes.

- Automated unit, integration, end-to-end, accessibility, security, and performance checks.

#### **5.2 Stretch scope only after MVP passes**

- 3D stadium model with WebGL particle agents.

- Live speech-to-text and text-to-speech integration.

- Real transit, weather, or venue feeds behind adapters.

- Advanced sustainability dashboard.

- Offline-first volunteer queue and background sync.

- Multivenue deployment and host-city administration.

#### **5.3 Explicit non-goals for the hackathon build**

- Facial recognition or biometric crowd tracking.

- Autonomous emergency commands without human authorization.

- Real ticket payment, ticket transfer, or access-control integration.

- Production medical diagnosis or security adjudication.

- Copying FIFA trademarks, the official 2026 logo, team crests, broadcast assets, fonts, or advertising footage.

### **6. Required product capabilities**

| **Capability**             | **Required behavior**                                                                   | **Proof in demo**                                  |
| -------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Ticket personalization     | Ticket resolves match, venue, gate, section, seat, and<br>destination                   | Demo ticket opens a personalized<br>dashboard      |
| Dynamic navigation         | Route responds to closures, congestion, and accessibility<br>preferences                | Gate C route changes to Gate D                     |
| Crowd intelligence         | Current density plus 5, 15, and 30 minute forecast                                      | Operator receives bottleneck warning               |
| Volunteer operations       | Tasks, requests, procedures, escalation, and status updates                             | Volunteer accepts Gate D task                      |
| Incident workfow           | Capture, classify, prioritize, assign, track, and resolve                               | Volunteer report appears instantly for<br>operator |
| Multilingual<br>assistance | Fan and staf answers in selected language with safety-<br>preserving translation        | Generate three-language announcement               |
| Accessibility              | Step-free routes, readable UI, voice support, reduced motion,<br>and assistance request | Wheelchair route avoids unavailable lift           |
| GenAI copilot              | Grounded answer, confdence, source context, and action<br>options                       | Operator gets explainable recommendation           |
| Auditability               | Track who approved or changed operational state                                         | Timeline shows recommendation and<br>action        |

Implementation-ready specification | Claude input pack Page 3

**FANAXO AI / BUILD SPEC 01**

### **7. User stories and acceptance criteria**

#### **7.1 Fan**

- **As a ticket holder,** I can scan or enter my ticket and see the correct match, gate, section, row, and seat.

- **As a fan,** I can request the least congested or accessible route and see why it is recommended.

- **As an international fan,** I can interact in my preferred language and translate operational announcements.

- **As a fan needing assistance,** I can request a volunteer and track acknowledgement.

- **Acceptance:** the route must update when the shared Gate C state changes, without refreshing the page.

#### **7.2 Volunteer**

- **As a volunteer,** I can see my zone, shift, tasks, priority, distance, and supervisor.

- **As a volunteer,** I can report an incident with location and evidence and receive a structured AI summary.

- **As a volunteer,** I can query verified procedures and escalate to the correct team.

- **Acceptance:** a submitted incident must appear on the operator feed and create an audit record.

#### **7.3 Operator**

- **As an operator,** I can see crowd density, gates, incidents, volunteers, and predictions on one screen.

- **As an operator,** I can approve, modify, or reject AI recommendations.

- **As an operator,** I can assign volunteers, close a route, send a localized alert, and resolve incidents.

- **Acceptance:** operator approval must update fan routes, volunteer tasks, and simulation state consistently.

### **8. Evaluation criteria alignment**

| **Criterion**     | **What judges should see**                                                   | **Engineering evidence**                                                                                           |
| ----------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Code Quality      | Consistent behavior, no dead controls, maintainable<br>feature separation    | Strict TypeScript, modular packages, linting, formatting,<br>typed contracts, low duplication, clear errors        |
| Security          | Safe role separation and controlled AI actions                               | RBAC, secure sessions, validation, CSP, CSRF strategy, rate<br>limiting, safe uploads, secret scanning, audit logs |
| Eficiency         | Smooth simulation and fast interactions                                      | Lazy loading, code splitting, Web Workers, instancing,<br>caching, bounded payloads, performance budgets           |
| Testing           | Reliable connected scenario                                                  | Unit, contract, integration, E2E, a11y, security, load and<br>visual tests in CI                                   |
| Accessibility     | Fan and staf interfaces work without color or mouse<br>dependence            | WCAG 2.2 AA targets, keyboard, screen reader, reduced<br>motion, focus, contrast, touch size                       |
| Problem alignment | Clear value for every stated stakeholder and real-<br>time stadium challenge | Traceability from challenge -> user story -> feature -> test -><br>demo                                            |

### **9. Product metrics**

- Fan route recalculation time: target under 1 second after shared-state update in demo mode.

- Operator dashboard state propagation: target under 1 second locally and under 2 seconds with remote event service.

- Incident submission completion: target under 45 seconds on mobile.

- Common fan query answer: target under 3 seconds with streaming response.

- Core Web Vitals: LCP under 2.5 seconds, INP under 200 ms, CLS under 0.1 on representative hardware.

- Automated test coverage: at least 80 percent statements for domain logic and 100 percent for security-critical authorization rules.

- Accessibility: zero critical automated violations and manual keyboard completion for all critical flows.

- Security: zero high or critical dependency, SAST, secret-scan, or dynamic-scan findings at submission.

Implementation-ready specification | Claude input pack Page 4

**FANAXO AI / BUILD SPEC 01**

### **10. Connected demo script - mandatory**

6. Open Fanaxo and select Fan.

7. Use the demo ticket to load a personalized route through Gate C.

8. Open the operator simulation and increase the arrival rate at Gate C.

9. Show the forecast warning and GenAI recommendation.

10. Approve redirection to Gate D and assign two volunteers.

11. Show volunteers receiving and accepting tasks.

12. Return to the fan view and show the route, queue estimate, and message updating in real time.

13. Show particles or route flows shifting toward Gate D and Gate C density declining.

14. Resolve the event and open the audit timeline or generated summary.

15. Show an accessibility variation and multilingual announcement as proof of inclusive design.

### **11. Definition of done**

- [ ] All required routes exist and are reachable.

- [ ] All primary buttons perform meaningful actions.

- [ ] All three roles share one event model.

- [ ] The connected Gate C to Gate D demo works end to end.

- [ ] Authentication and authorization are enforced server-side.

- [ ] No production secret is present in source control or client bundles.

- [ ] Type-check, lint, tests, accessibility checks, security scans, and production build pass.

- [ ] Error, empty, loading, offline, and permission-denied states are implemented.

- [ ] Critical actions require confirmation and are auditable.

- [ ] The implementation is original and does not reproduce protected tournament branding.

##### **CLAUDE EXECUTION RULE**

Treat every MUST statement as an acceptance criterion. Do not replace functional workflows with static mockups. Do not claim completion until the relevant tests, security checks, accessibility checks, linting, type-checking, and production build all pass.

### **100-Point Evaluation Traceability Matrix**

Use this matrix as a working requirements ledger. Every implemented feature, test, screenshot, metric, and demo step must map to at least one row. High-impact rows take priority over decorative scope.

| **Criterion**            | **Required implementation**<br>**proof**                                                                    | **Submission evidence**                                                       | **Fail condition**                                                                     |
| ------------------------ | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Code Quality - High      | SOLID modules, strict types,<br>dependency boundaries, concise<br>components, documented ADRs               | CI logs, architecture diagram,<br>lint/typecheck output, code<br>excerpts     | Monolithic components,<br>duplicated rules, weak names,<br>unsafe casts, broken build  |
| Problem Alignment - High | Connected fan-volunteer-<br>operator workfow with live<br>rerouting and human-approved<br>decision support  | End-to-end demo video,<br>traceability checklist, user<br>journey screenshots | Only a chatbot, only a dashboard,<br>disconnected role demos,<br>decorative simulation |
| Security - Medium        | Server RBAC, validation, secure<br>sessions, rate limits, audit logs,<br>AI tool allowlists                 | Security tests, threat model,<br>dependency/secret scan reports               | Client-only authorization,<br>exposed secrets, unvalidated<br>inputs, critical fndings |
| Eficiency - Medium       | Lazy loading, worker-based<br>simulation, instancing, bounded<br>events, cleanup and performance<br>budgets | Lighthouse report, FPS/memory<br>evidence, load test summary                  | UI freezes, leaks, uncontrolled<br>listeners, excessive bundle or<br>rendering cost    |
| Testing - Low            | Unit, integration, contract and<br>E2E coverage of critical fows                                            | CI test report, coverage<br>summary, deterministic seed                       | Critical journey untested or faky                                                      |
| Accessibility - Low      | WCAG 2.2 AA practices and<br>accessible dynamic updates                                                     | axe results, keyboard checklist,<br>screen-reader evidence                    | Inaccessible controls, color-only<br>status, no reduced motion                         |

Implementation-ready specification | Claude input pack Page 5
