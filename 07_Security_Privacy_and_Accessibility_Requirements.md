**FANAXO AI  /  BUILD SPEC 07** 

# **07** 

## **Security, Privacy and Accessibility Requirements** 

**Provides the threat model and non-negotiable controls needed for a safe, inclusive production-style prototype.** 

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

**FANAXO AI  /  BUILD SPEC 07** 

Problem Statement Alignment 

### **1. Security objectives** 

- Prevent unauthorized access across fan, volunteer, operator, venue, and resource scopes. 

- Protect ticket tokens, sessions, personal preferences, operational data, credentials, and AI keys. 

- Ensure operational actions are authenticated, authorized, validated, confirmed, and auditable. 

- Maintain service availability under malformed inputs, abuse, AI cost attacks, and realtime load. 

- Limit blast radius through least privilege and separation of client, server, AI, data, and simulation components. 

- Fail safely when authentication, feeds, AI, database, or realtime delivery is unavailable. 

### **2. Threat model** 

|**Asset or surface**|**Example threat**|**Required control**|
|---|---|---|
|Fan ticket QR|Enumeration, replay, token theft, malicious<br>payload|Opaque token, hash at rest, rate limit, short session, safe parser|
|Volunteer login|Credential stufing or stolen badge|OTP/MFA simulation, lockout/rate limit, session rotation|
|Operator actions|Privilege escalation or CSRF|Server RBAC/ABAC, secure cookies, CSRF defense,<br>reauth/confrmation|
|APIs|IDOR, injection, mass assignment|Ownership checks, Zod validation, ORM parameterization, explicit<br>felds|
|File uploads|Malware, oversized fles, SVG/script, metadata<br>leakage|Allowlist, size limits, scan, isolate, re-encode, delete|
|AI tools|Prompt injection and unauthorized action|Tool allowlist, policy gate, role checks, structured output|
|Realtime channel|Cross-venue leakage, spoofng, replay|Authenticated subscriptions, topic scope, event IDs and versions|
|Browser|XSS, clickjacking, insecure dependency|CSP, output encoding, frame policy, dependency scanning|
|Logs|Secret or PII exposure|Structured redaction, access control, retention|
|Supply chain|Compromised package or CI secret|Lockfle, pinning, provenance where possible, secret scanning|



### **3. Authentication and session controls** 

- Use a maintained authentication library or provider; do not create custom password cryptography. 

- Use Secure, HttpOnly, SameSite cookies in deployed environments. 

- Rotate session identifiers after authentication and privilege changes. 

- Apply short expiration to fan ticket sessions and appropriate inactivity/absolute timeouts to staff sessions. 

- Require MFA or simulated MFA for operators and privileged demo accounts. 

- Do not store access tokens in localStorage. 

- Provide logout that invalidates server session, not only client state. 

- Protect demo credentials from production deployment and clearly separate demo mode. 

### **4. Authorization model** 

- Use role plus venue scope plus resource ownership and action policy. 

- Deny by default and permit only explicit actions. 

- Check authorization on every server mutation and sensitive read. 

- Never trust hidden UI, route guards, client role fields, or disabled buttons as enforcement. 

- Add negative tests for IDOR: change venueId, ticketId, taskId, incidentId, and userId. 

- Separate operator roles if time permits: viewer, dispatcher, supervisor, administrator. 

Implementation-ready specification  |  Claude input pack Page 2 

**FANAXO AI  /  BUILD SPEC 07** 

- 

- Require reason and confirmation for gate state changes, mass notifications, and incident overrides. 

### **5. Web and API security controls** 

|**Control**|**Implementation expectation**|
|---|---|
|Validation|Zod schemas, length/range limits, enum allowlists, reject unknown felds where appropriate|
|XSS|React escaping, no unsafe HTML, sanitize approved rich content, never render untrusted SVG|
|CSP|Restrictive default-src, script nonces/hashes as needed, connect-src allowlist, frame-ancestors none|
|CSRF|SameSite cookies plus origin check and CSRF token for applicable mutations|
|CORS|Exact origin allowlist; no wildcard with credentials|
|Injection|Parameterized ORM/database queries; no shell interpolation|
|SSRF|No arbitrary user URL fetch; allowlisted feed adapters and private-network protection|
|Rate limits|Ticket verify, login, OTP, AI prompts, incident creation, uploads, notifcations|
|Headers|HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy|
|Errors|No stack traces or internal IDs exposed in production responses|
|Dependencies|Automated audit, lockfle, no abandoned packages, remove unused packages|
|Secrets|Environment/secret manager, never NEXT_PUBLIC for sensitive values, scanning in CI|



### **6. File and media upload security** 

- Allow only required MIME types and verify magic bytes; extensions are insufficient. 

- Set strict size, count, and image-dimension limits. 

- Reject or safely rasterize SVG and other active formats. 

- Strip metadata from images before long-term storage. 

- Use randomly generated object keys and private storage. 

- Scan files before they become accessible to staff. 

- Serve downloads with safe Content-Type and Content-Disposition. 

- Delete temporary ticket images promptly and document retention. 

### **7. Privacy and data minimization** 

- Do not use facial recognition or identify individuals from crowd imagery. 

- Use aggregated anonymous counts for crowd intelligence. 

- Store only ticket fields needed to personalize the route and verify access. 

- Make accessibility preferences optional, purpose-limited, and removable. 

- Do not expose precise volunteer locations to fans; show assistance availability or assigned helper only. 

- Avoid sending personal or sensitive fields to the language model. 

- Define retention for sessions, uploads, incidents, audits, and analytics. 

- Provide a demo privacy notice that explains what data is used and why. 

### **8. Accessibility target** 

##### **Target standard** 

Meet WCAG 2.2 Level AA for all critical user flows. Automated testing is necessary but not sufficient; include manual keyboard, screen-reader, zoom, contrast, and reduced-motion checks. 

Implementation-ready specification  |  Claude input pack Page 3 

**FANAXO AI  /  BUILD SPEC 07** 

### **9. Accessibility implementation requirements** 

|**Area**|**Required behavior**|
|---|---|
|Semantics|Landmarks, headings in order, native controls, labels, feld instructions, table headers|
|Keyboard|All actions reachable, logical focus order, visible focus, no traps except managed modal focus|
|Screen reader|Meaningful names, status announcements, map alternatives, live region restraint|
|Color|AA contrast; status also shown with text/icon/pattern|
|Motion|Honor reduced motion, pause animation, no essential information only in motion|
|Touch|Large controls and spacing suitable for fan/volunteer mobile use|
|Forms|Programmatic errors, summary and inline messages, preserved input, clear required felds|
|Maps|Search/list alternative for facilities, route steps in text, keyboard-selectable markers|
|Charts|Data table or textual summary and non-color series distinctions|
|Language|Page lang and direction, locale-aware date/time/number, fexible layouts for long text|
|Zoom|Usable at 200 percent zoom and responsive refow without two-dimensional scrolling except maps/tables|
|Cognitive|Plain language, consistent navigation, confrmation for high-impact actions, no time pressure without extension|



### **10. Accessibility-specific product features** 

- Step-free and wheelchair-accessible route constraints. 

- Lift and ramp status with alternatives. 

- Voice guidance and text equivalent. 

- Low-vision high-contrast mode without losing brand meaning. 

- Hearing assistance and text translation for announcements. 

- Quiet-zone and low-sensory route preference. 

- Volunteer assistance request with clear acknowledgement. 

- Accessible transport and drop-off information. 

### **11. Security and accessibility testing gates** 

|**Gate**|**Tool or method**|**Pass condition**|
|---|---|---|
|SAST|Maintained code scanner|No high or critical fndings|
|Dependency audit|Package manager audit and update review|No known high or critical production vulnerability|
|Secret scan|Gitleaks or equivalent|No secrets in repository/history submitted|
|DAST smoke|OWASP ZAP baseline or equivalent|No high-risk issue; fndings reviewed|
|Authorization tests|Integration and E2E negative cases|All unauthorized access denied|
|axe automated|Component and E2E scans|Zero critical/serious violations in core routes|
|Keyboard manual|Complete each core fow without mouse|No unreachable control or focus trap|
|Screen reader smoke|NVDA/VoiceOver or equivalent|Critical content and status understandable|
|Contrast|Token and page checks|Text and controls meet target ratios|
|Reduced motion|OS preference and app toggle|No essential loss or unsafe animation|



Implementation-ready specification  |  Claude input pack Page 4 

**FANAXO AI  /  BUILD SPEC 07** 

### **12. Incident response and secure failure** 

- Add a security contact and runbook for suspected credential, data, or operational abuse. 

- Support rapid session invalidation and demo credential rotation. 

- Use circuit breakers to disable risky integration while preserving static safe guidance. 

- Show a clear stale/offline state instead of silently presenting old data as live. 

- Preserve immutable audit evidence for privileged actions. 

- Do not expose technical security details to ordinary users during an incident. 

### **13. Release checklist** 

- [ ] Threat model reviewed against final architecture. 

- [ ] No secret in source, client bundle, screenshots, logs, or sample environment file. 

- [ ] Server-side authorization tests cover every protected route and mutation. 

- [ ] CSP and security headers verified in deployed environment. 

- [ ] Upload route rejects active and oversized content. 

- [ ] AI tools cannot bypass permission or approval policy. 

- [ ] Privacy notice and retention assumptions are documented. 

- [ ] Core flows pass keyboard and screen-reader checks. 

- [ ] Core pages pass automated accessibility scans. 

- [ ] Logo and media are original or properly licensed. 

##### **CLAUDE EXECUTION RULE** 

Treat every MUST statement as an acceptance criterion. Do not replace functional workflows with static mockups. Do not claim completion until the relevant tests, security checks, accessibility checks, linting, type-checking, and production build all pass. 

### **Security Submission Gate** 

- Run dependency vulnerability scanning, static application security testing, secret scanning, and license checks in CI. 

- Threat-model ticket replay, privilege escalation, cross-venue access, malicious uploads, prompt injection, WebSocket spoofing, denial of service, and sensitive log leakage. 

- Use deny-by-default authorization policies and test every privileged command with wrong role, wrong venue, wrong resource, expired session, and tampered payload cases. 

- Apply CSP with nonces or hashes, secure headers, origin checks, CSRF defenses for cookie-authenticated mutations, and strict upload MIME/signature/size validation. 

- Redact ticket tokens, session identifiers, personal data, prompts containing sensitive content, and internal stack traces from logs. 

- Keep a security exception register. No unresolved critical or high issue is acceptable for submission. 

Implementation-ready specification  |  Claude input pack Page 5 

