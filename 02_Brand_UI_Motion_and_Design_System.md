**FANAXO AI  /  BUILD SPEC 02** 

# **02** 

## **Brand, UI, Motion and Design System** 

**Defines an original colorful identity and the complete responsive interaction language.** 

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

|**Product**|
|---|



Fanaxo AI - GenAI stadium operations and matchday experience platform 

|**Primary quality gates**|
|---|



Code Quality | Security | Efficiency | Testing | Accessibility | Problem Statement Alignment 

Implementation-ready specification  |  Claude input pack Page 1 





<!-- Start of picture text -->
7 Ss<br>aa,<br>=<br>F<br><!-- End of picture text -->

**FANAXO AI  /  BUILD SPEC 02** 

#### **3.1 Suggested logo geometry** 

Concept only - do not imitate FIFA mark: 

- Outer frame: two rounded vertical gates 

- Inner path: one continuous line forms a subtle F 

- Center: circular node represents the stadium control core 

- Three exits: fan, volunteer, operator 

- Motion state: paths expand into a color tunnel on page transition 

### **4. Color system** 

|**Token**|**Hex**|**Meaning**|**Usage**|
|---|---|---|---|
|neutral.black|#050505|Primary canvas|Hero, command center, modal backdrops|
|neutral.cream|#FFF4D8|Warm editorial contrast|Story sections and accessible light panels|
|brand.blue|#304BFF|Navigation and fan fow|Routes, selected fan controls|
|brand.cyan|#00D9FF|Accessibility and live signal|Accessible routes, data links|
|brand.purple|#6D35FF|GenAI intelligence|Copilot, confdence and explanation|
|status.green|#00C878|Safe or resolved|Clear paths and completed tasks|
|status.lime|#B7FF00|Active and high-energy|Primary marketing accent, noncritical live states|
|status.orange|#FF6A00|Congestion or attention|Moderate queue and warning|
|status.red|#F2382A|Critical only|High-risk incidents and destructive actions|



Never communicate status through color alone. Every state must also include a label, icon, pattern, or textual description. 

### **5. Typography and iconography** 

- Display font: a licensed/open wide geometric sans such as Space Grotesk, Sora, or equivalent. Do not use or imitate official FIFA typography. 

- Interface font: Inter, Geist, or equivalent with strong numeral legibility. 

- Use uppercase only for short headings, labels, and live indicators; use sentence case for task text and instructions. 

- Minimum body size: 16 CSS pixels on fan/volunteer mobile screens; 14 CSS pixels on dense operator panels. 

- Use a consistent icon library such as Lucide. Do not mix icon families. 

- Pair every icon-only action with an accessible name and tooltip where appropriate. 

### **6. Responsive layout system** 

|**Context**|**Primary device**|**Layout rule**|**Navigation**|
|---|---|---|---|
|Public site|Desktop and mobile|Cinematic sections with readable fallbacks|Top bar and contextual CTAs|
|Fan|Mobile web frst|Map-dominant view with bottom sheets|Bottom navigation plus back stack|
|Volunteer|Mobile/tablet frst|Task list and zone map with large controls|Bottom or compact rail|
|Operator|Desktop frst|Digital twin center with collapsible panels|Left rail plus command palette|
|Kiosk|Large touch display|Single-purpose fows and timeout reset|No hidden gestures|



Implementation-ready specification  |  Claude input pack Page 3 

**FANAXO AI  /  BUILD SPEC 02** 

### **7. Complete screen inventory** 

|**Route**|**Screen**|**Primary visual**|
|---|---|---|
|/|Animated landing page|Color tunnel and stadium engine reveal|
|/select-role|Role selection|Three spatial portals|
|/fan/ticket|Ticket entry|QR scanner and verifcation sequence|
|/fan/preferences|Fan preferences|Language and accessibility setup|
|/fan/dashboard|Fan home|Ticket plus live stadium map|
|/fan/navigation|Turn-by-turn route|Full-screen fow path|
|/fan/assistant|Fan AI|Context cards linked to map actions|
|/volunteer/login|Volunteer access|Badge and OTP login|
|/volunteer/dashboard|Volunteer home|Tasks plus zone conditions|
|/volunteer/report|Incident report|Large guided mobile form|
|/volunteer/copilot|Procedure copilot|Verifed workfow cards|
|/operator/login|Operator access|Secure professional login|
|/operator/dashboard|Command center|Digital twin plus foating panels|
|/operator/simulation|Simulation lab|Crowd engine and controls|
|/operator/incidents|Incident command|Map, feed, and timeline|
|/operator/volunteers|Workforce management|Deployment map and roster|
|/operator/copilot|Operations AI|Command bar and explainable plans|
|/operator/reports|Analytics|Operational and impact reports|



### **8. Landing page and motion sequence** 

1. Begin on black with a small original Fanaxo symbol. 

2. Expand the symbol into layered colorful rounded frames. 

3. Move through a short perspective tunnel with labels such as FANS, FLOW, ACCESS, SAFETY, TRANSIT, and LIVE. 

4. Reveal the stadium engine and moving crowd agents. 

5. Explain the product in one sentence and expose two clear actions: Enter Live Engine and Watch Connected Demo. 

6. On role selection, use a 700 to 1000 ms color transition, with a reduced-motion fade alternative. 

Do not use autoplay audio or a video background. Motion should be generated from web components and degrade gracefully. 

### **9. Component design specifications** 

|**Component**|**Design behavior**|**Accessibility behavior**|
|---|---|---|
|Live status chip|Pulsing dot, timestamp, compact metric|Text says Live, Stale, Paused, or Ofline|
|Crowd zone|Color, density texture, count, trend arrow|Pattern and descriptive label|
|AI response card|Purple intelligence accent and action footer|Source, confdence, and approval state announced|
|Incident card|Severity edge, location, age, owner, status|Urgency not represented by animation alone|
|Task card|Priority, distance, action, SLA, status|Large controls and logical focus order|



Implementation-ready specification  |  Claude input pack Page 4 

**FANAXO AI  /  BUILD SPEC 02** 

|**Component**|**Design behavior**|**Accessibility behavior**|
|---|---|---|
|Map marker|Role-specifc symbol and selection halo|Keyboard selectable with label|
|Bottom sheet|Snap points with drag and buttons|Equivalent buttons; no drag-only operation|
|Command palette|Searchable actions and AI prompts|Focus trapped correctly and Escape closes|



### **10. Physics-engine visual behavior** 

- Agents move along a graph toward destinations and avoid blocked edges. 

- Density influences speed and route cost. 

- Closed routes animate as unavailable and immediately stop receiving new agents. 

- Critical events create an avoidance radius and visible localized alert. 

- Operator actions visibly change fan flow, but simulation updates must not obscure controls. 

- On mobile or reduced-performance devices, replace 3D agents with a 2D Canvas flow layer. 

- Provide a Pause animation control and honor prefers-reduced-motion. 

### **11. State, feedback, and error design** 

- Every asynchronous action has idle, loading, success, retryable error, and nonretryable error states. 

- Use skeletons only where layout is known; use progress text for ticket verification and AI generation. 

- Do not silently fail. Provide a short explanation and recovery action. 

- Use toasts for confirmations, not for critical or lengthy information. 

- Preserve form input when a request fails. 

- Provide offline or stale-data banners when live feeds stop. 

### **12. Visual acceptance checklist** 

- [ ] The interface is not monochromatic. 

- [ ] Each role has a distinct but coherent visual identity. 

- [ ] Operator density does not reduce legibility. 

- [ ] Color tunnel motion has a reduced-motion alternative. 

- [ ] All text meets contrast requirements. 

- [ ] Focus states are clearly visible on dark and light surfaces. 

- [ ] Status is never represented by color alone. 

- [ ] The logo and motion system are original and do not reproduce protected marks. 

- [ ] Mobile fan and volunteer workflows are usable at 320 CSS pixels width. 

- [ ] Important controls remain available when WebGL is unavailable. 

##### **CLAUDE EXECUTION RULE** 

Treat every MUST statement as an acceptance criterion. Do not replace functional workflows with static mockups. Do not claim completion until the relevant tests, security checks, accessibility checks, linting, type-checking, and production build all pass. 

Implementation-ready specification  |  Claude input pack Page 5 

