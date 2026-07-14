**FANAXO AI  /  BUILD SPEC 03** 

# **03** 

## **Information Architecture and End-toEnd User Flows** 

**Defines routing, permissions, state transitions, edge cases, and all role-specific workflows.** 

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

**FANAXO AI  /  BUILD SPEC 03** 

Problem Statement Alignment 

### **1. Application map** 

Public / -> /select-role Fan /fan/ticket -> /fan/preferences -> /fan/dashboard /fan/dashboard -> /fan/navigation | /fan/assistant Volunteer /volunteer/login -> /volunteer/dashboard /volunteer/dashboard -> /volunteer/report | /volunteer/copilot Operator /operator/login -> /operator/dashboard /operator/dashboard -> /operator/simulation | /operator/incidents -> /operator/volunteers | /operator/copilot 

-> /operator/reports 

### **2. Role and permission model** 

|**Action**|**Fan**|**Volunteer**|**Operator**|
|---|---|---|---|
|View public venue and match information|Yes|Yes|Yes|
|View personal ticket and route|Own only|No|Support view by request<br>only|
|Request assistance or report issue|Yes|Yes|Yes|
|View assigned tasks|No|Own only|All authorized venue tasks|
|Create operational incident|Limited fan report|Yes|Yes|
|Assign or reassign tasks|No|No|Yes|
|Change gate or route operational status|No|No|Yes with confrmation|
|Send targeted alert|No|No|Yes|
|Approve AI operational recommendation|No|No|Yes|
|View audit logs and reports|Own activity only|Own activity only|Authorized venue scope|



Client-side route guards improve UX but are not security boundaries. Every server action must revalidate identity, role, venue scope, and resource ownership. 

### **3. Authentication flows** 

#### **3.1 Fan ticket access** 

1. Fan chooses scan, upload, ticket ID, demo ticket, or guest mode. 

2. Client parses only the minimum QR payload and sends a ticket token to the server. 

3. Server validates format, status, match, and replay/abuse controls. 

4. Server creates a short-lived fan session; never place sensitive ticket data in the URL. 

5. Fan selects language and accessibility preferences. 

6. Dashboard loads match, destination, live route, and facilities. 

Implementation-ready specification  |  Claude input pack Page 2 

**FANAXO AI  /  BUILD SPEC 03** 

#### **3.2 Volunteer access** 

7. Volunteer uses staff ID or badge plus OTP in the demo. 

8. Server confirms active shift, role, venue, and zone. 

9. Dashboard shows only authorized tasks and procedures. 

10. Session expiration returns the user to login without losing an unsent incident draft. 

#### **3.3 Operator access** 

11. Operator signs in with organization account and simulated MFA. 

12. Server assigns least-privilege scopes. 

13. High-risk actions require reauthentication or a confirmation step. 

14. Every action records actor, timestamp, reason, affected resources, and correlation ID. 

### **4. Fan journey** 

|**Stage**|**User action**|**System response**|**Failure handling**|
|---|---|---|---|
|Entry|Scan or enter ticket|Verify and open preferences|Explain invalid, used, expired, or wrong-<br>venue ticket|
|Plan|Review arrival, gate, transit,<br>and conditions|Personalized recommendations|Show last-updated time if feed is stale|
|Navigate|Start route|Turn-by-turn guidance and density ahead|Ofer alternate route or static map|
|Use venue|Find food, restroom, medical,<br>merchandise|Filter by distance, queue, dietary and accessibility<br>needs|Show unavailable status and next option|
|Request help|Ask AI or volunteer|Contextual answer or assistance task|Provide emergency and direct staf<br>fallback|
|Leave|Ask for best exit and transit|Zone-aware departure plan|Show transport delay alternatives|



### **5. Volunteer journey** 

|**Stage**|**Required capabilities**|**State changes**|
|---|---|---|
|Shift start|Confrm role, zone, equipment, and briefng|Volunteer status becomes available|
|Task receive|See priority, location, route, SLA, and recommended action|Task becomes delivered|
|Task accept|Acknowledge and navigate|Task becomes accepted and operator sees owner|
|Fan support|Translate, navigate, or consult procedure|Assistance interaction is logged minimally|
|Incident report|Text/voice/image, category, location, severity|Incident is validated, classifed, and queued|
|Escalation|Request security, medical, maintenance, or supervisor|Escalation is routed and auditable|
|Resolution|Add outcome and close task|Incident or task becomes resolved|
|Shift handover|Summarize open tasks and notable events|Structured handover record is created|



### **6. Operator journey** 

|**Stage**|**Operator view**|**Permitted action**|
|---|---|---|
|Monitor|Digital twin, feeds, queue, incidents, volunteers, transport|Filter, inspect, compare, replay|
|Predict|5/15/30 minute risk and confdence|Request explanation or alternative plan|



Implementation-ready specification  |  Claude input pack Page 3 

**FANAXO AI  /  BUILD SPEC 03** 

|**Stage**|**Operator view**|**Permitted action**|
|---|---|---|
|Decide|AI recommendation and operational constraints|Approve, modify, reject, or defer|
|Coordinate|Available volunteers and response teams|Assign tasks and targeted instructions|
|Communicate|Audience, language, channel, message preview|Approve localized alert or announcement|
|Resolve|Outcome, remaining risk, evidence|Mark resolved or reopen|
|Review|Timeline, KPIs, AI acceptance and response time|Generate report and handover|



### **7. Connected Gate C scenario state machine** 

###### NORMAL 

- -> RISING_DENSITY        when arrivalRate and density cross warning threshold 

- -> PREDICTED_CONGESTION  when forecast exceeds threshold within 15 minutes 

- -> PLAN_PROPOSED         when AI generates redirect and staffing recommendation 

- -> PLAN_APPROVED         when operator approves or modifies plan 

- -> EXECUTING             when gate status, tasks, alerts, and routes update 

- -> STABILIZING           when measured density trend decreases 

-> RESOLVED              when density remains below threshold for configured period 

Any state -> ESCALATED when safety threshold or critical incident occurs Any nonfinal state -> CANCELLED only by authorized operator with reason 

#### **7.1 Cross-role consequences** 

- Fan: route, queue estimate, notification, and accessible alternative update. 

- Volunteer: two tasks appear with zone, priority, instructions, and acceptance state. 

- Operator: recommendation, confirmation, action status, predicted effect, and audit timeline update. 

- Simulation: path costs and spawn destinations change; density trends recalculate. 

- Reports: incident and response metrics update after resolution. 

### **8. Navigation and state preservation** 

- Use URL routes for durable screens; do not hide the entire application inside a single modal or dashboard state. 

- Preserve drafts, filters, map position, and selected incident when users navigate back. 

- Role switching is available only in demo mode and must clear or isolate privileged state. 

- Deep links to protected screens must redirect to the appropriate login and return after successful authentication. 

- Do not place secrets, raw ticket tokens, OTPs, or personal data in query strings. 

- Use route-level error boundaries and meaningful not-found and forbidden screens. 

### **9. Required edge cases** 

|**Area**|**Edge case**|**Expected behavior**|
|---|---|---|
|Ticket|Invalid, expired, duplicate, wrong venue,<br>ofline verifcation|Specifc safe error and guest/static fallback|
|Route|Gate closes mid-route, lift unavailable, no<br>safe alternate|Recalculate or request staf; never invent path|
|AI|Low confdence, no verifed source, unsafe<br>request|Say unavailable, escalate, or provide approved fallback|
|Incident|Duplicate reports, missing location,<br>malicious upload|Merge suggestion, validation, quarantine/reject upload|



Implementation-ready specification  |  Claude input pack Page 4 

|||**FANAXO AI  /  BUILD SPEC 03**|
|---|---|---|
|**Area**|**Edge case**|**Expected behavior**|
|Realtime|Disconnected or out-of-order events|Show stale state and reconcile by event version|
|Permissions|Volunteer attempts operator action|Server rejects, UI explains access limit, audit optional|
|Accessibility|Reduced motion, keyboard-only, screen<br>reader|Equivalent nonanimated and nonpointer fow|
|Performance|Low-end device or WebGL unavailable|2D simulation and reduced agent count|
|Localization|Long translated text and RTL language|Flexible layout and correct reading direction|



### **10. Screen-level completion rule** 

- A screen is incomplete if its main CTA is decorative. 

- A dashboard is incomplete if it shows data but cannot complete its primary job. 

- An AI screen is incomplete if responses are unstructured, ungrounded, or disconnected from actions. 

- A role flow is incomplete if the user cannot recover from an error or sign out. 

- The application is incomplete if cross-role state requires manual page refresh. 

- Every screen must have loading, empty, error, success, and permission-aware states as applicable. 

##### **CLAUDE EXECUTION RULE** 

Treat every MUST statement as an acceptance criterion. Do not replace functional workflows with static mockups. Do not claim completion until the relevant tests, security checks, accessibility checks, linting, type-checking, and production build all pass. 

Implementation-ready specification  |  Claude input pack Page 5 

