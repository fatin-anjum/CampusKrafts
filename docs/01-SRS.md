# 01 — Software Requirement Specification (SRS)

**Product:** CampusKrafts — Online University Admission Preparation Platform
**Version:** 1.0
**Audience:** Engineering, Product, QA, DevOps

---

## 1. Introduction

### 1.1 Purpose
CampusKrafts is a web + mobile EdTech platform that prepares Bangladeshi students for university admission tests. The platform delivers **one flagship Crash Course** containing live classes, recorded lectures, lecture sheets, online exams, mock admission tests, a resource library, and a discussion forum, with progress tracking, an adaptive learning engine, and local payment gateways.

### 1.2 Scope
- Single paid **Crash Course** as the enrollment product (course-wise subscription).
- Four roles: **Student, Teacher, Moderator, Admin**.
- Web app (Next.js), mobile app (React Native), backend API (NestJS), PostgreSQL, Redis, S3.
- Payments via bKash, Nagad, Rocket, SSLCommerz, and cards.
- Designed for **thousands of concurrent students** (peak during live classes & mock tests).

### 1.3 Definitions
| Term | Meaning |
|------|---------|
| MCQ | Multiple Choice Question |
| Mock Test | Simulated full admission exam with ranking |
| SEB | Secure Exam Browser mode (lockdown) |
| RBAC | Role-Based Access Control |
| FTS | Full-Text Search |
| BKash/Nagad/Rocket | Bangladeshi mobile financial services |
| SSLCommerz | Bangladeshi payment aggregator (cards + MFS) |

---

## 2. Overall Description

### 2.1 Product Perspective
A cloud-native modular monolith (NestJS) exposing a versioned REST API, consumed by a Next.js web client and a React Native mobile client. External integrations: payment gateways, Zoom/Google Meet, LiveKit (built-in WebRTC classroom), email/SMS, push notifications.

### 2.2 User Classes
| Role | Description | Key Goals |
|------|-------------|-----------|
| **Student** | Enrolled learner | Learn, practice, sit mocks, track rank |
| **Teacher** | Subject instructor | Teach live, upload content, set exams, grade |
| **Moderator** | Community + content gatekeeper | Moderate forum, approve resources, handle tickets |
| **Admin** | Platform owner/operator | Manage users, payments, analytics, configuration |

### 2.3 Operating Environment
- Clients: modern browsers (Chrome, Edge, Firefox, Safari), Android 8+, iOS 14+.
- Server: Linux containers on AWS (ECS Fargate / EKS).
- Network: optimized for 3G/4G in Bangladesh; CDN-fronted media.

### 2.4 Constraints
- Localization-ready (English + Bengali); currency BDT.
- Mobile-first, low-bandwidth aware (adaptive video bitrate).
- Compliance: PCI-DSS scope minimized (no raw card storage), data privacy.

### 2.5 Assumptions
- Payment gateway sandbox/live credentials are provisioned.
- Zoom/Google Meet developer accounts available; LiveKit cluster for built-in classroom.
- One active course version at launch; schema supports many.

---

## 3. Functional Requirements (FR)

Each FR is referenced by feature module in [05-MODULES.md](05-MODULES.md).

### 3.1 Authentication & Accounts
- **FR-1** Users register with phone/email + password; OTP verification (SMS/email).
- **FR-2** Login via credentials or Google OAuth; issue JWT access + refresh tokens.
- **FR-3** Password reset via OTP; forced re-login on password change (token revocation).
- **FR-4** Role assignment at creation; Admin can change roles.
- **FR-5** Session management: list/revoke active devices.

### 3.2 Student Dashboard
- **FR-6** Show enrolled course, upcoming live classes, mock schedule, recent activity, progress %, unread notifications.
- **FR-7** Continue-watching for recorded lectures (resume position).

### 3.3 Course Management
- **FR-8** Admin/Teacher create course → modules → lessons (live/recorded/sheet).
- **FR-9** Course approval workflow (Teacher creates → Admin approves → published).
- **FR-10** Enrollment gated by active subscription/payment.
- **FR-11** Completion tracking per lesson; auto-compute course progress.

### 3.4 Live Class System
- **FR-12** Schedule live class with provider (Zoom / Meet / built-in).
- **FR-13** Join button active in a time window; screen share, whiteboard, chat, raise-hand (built-in).
- **FR-14** Attendance auto-recorded (join/leave timestamps).
- **FR-15** Recording stored to S3 and auto-attached as a recorded lesson.

### 3.5 Lecture Sheets / Notes
- **FR-16** Upload PDFs categorized by topic/chapter (sheets, notes, handouts, formula sheets).
- **FR-17** Secure, access-controlled download (signed URLs) for enrolled students.

### 3.6 Online Exam Engine
- **FR-17a** Create MCQ and written exams from question bank.
- **FR-18** Per-exam config: duration, negative marking, randomization, shuffling, secure mode.
- **FR-19** Auto-submit on timeout; save answers progressively (no data loss).
- **FR-20** Auto-grade MCQ; manual grade written; publish results.

### 3.7 Mock Exam Platform
- **FR-21** Full / university-specific / weekly / monthly grand mocks.
- **FR-22** National ranking + percentile + subject-wise comparison.
- **FR-23** Leaderboard with pagination and filters.

### 3.8 Resource Library
- **FR-24** Books, PDFs, short notes, formula/cheat sheets, admission guidelines.
- **FR-25** Categorization, tags, full-text search, filters.

### 3.9 Discussion Forum
- **FR-26** Ask questions, reply, threaded discussion, upvote.
- **FR-27** Teacher answers flagged as "verified"; moderation (hide/lock/delete/ban).

### 3.10 Announcements & Notifications
- **FR-28** Admin/Teacher/Moderator publish announcements by audience.
- **FR-29** Multi-channel delivery: in-app, push (FCM), email, SMS (critical only).

### 3.11 Teacher Panel
- **FR-30** Manage classes, upload notes/videos, create exams, publish mocks, view results, monitor students.

### 3.12 Assignment Management
- **FR-31** Create assignment; students submit files/text; auto + manual grading; feedback.

### 3.13 Admin Panel
- **FR-32** User CRUD + role management; course approval; question bank; exam scheduling; result management.
- **FR-33** Payment monitoring, subscription management, refunds.
- **FR-34** Content approval/moderation.
- **FR-35** Analytics dashboard (growth, revenue, active users, course popularity, exam stats).
- **FR-36** Support ticket system (create, assign, track, resolve).

### 3.14 Payments & Subscription
- **FR-37** Initiate payment via bKash/Nagad/Rocket/SSLCommerz/card; verify via webhook/IPN.
- **FR-38** On success, activate subscription → grant course access.
- **FR-39** Refund workflow with audit trail.

### 3.15 Adaptive Learning
- **FR-40** Collect per-question performance; compute mastery per topic.
- **FR-41** Recommend next practice set & difficulty; schedule spaced revision.

---

## 4. Non-Functional Requirements (NFR)

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-1 | Performance | API p95 latency < 300 ms (non-media); page LCP < 2.5 s on 4G. |
| NFR-2 | Scalability | Handle 10,000+ concurrent users; 50,000+ during scheduled mock tests via horizontal scaling. |
| NFR-3 | Availability | 99.9% uptime; multi-AZ; graceful degradation (e.g., live class fallback to Zoom). |
| NFR-4 | Reliability | Exam answers persisted ≤2 s after each change; zero answer loss on disconnect. |
| NFR-5 | Security | TLS 1.2+, JWT, RBAC, OWASP Top 10 mitigations, encryption at rest. |
| NFR-6 | Privacy | PII encrypted; consent + data export/delete; no raw card data stored. |
| NFR-7 | Usability | Mobile-first, WCAG 2.1 AA, Bengali/English i18n. |
| NFR-8 | Maintainability | Modular code, >70% test coverage on core domains, typed end-to-end. |
| NFR-9 | Portability | Containerized; IaC; environment parity (dev/stage/prod). |
| NFR-10 | Observability | Centralized logs, metrics, traces, alerting. |
| NFR-11 | Compliance | PCI-DSS SAQ-A scope, local data residency where required. |
| NFR-12 | Recoverability | RPO ≤ 15 min, RTO ≤ 1 hour. |

---

## 5. User Stories (selected, with acceptance criteria)

> Format: *As a `<role>`, I want `<goal>` so that `<benefit>`.*

**US-1 (Student) — Enroll**
As a student, I want to pay and enroll in the Crash Course so that I get full access.
*AC:* Given a verified account and successful bKash payment, when the IPN confirms, then my subscription is `ACTIVE` and the course unlocks within 10 s; a receipt is emailed.

**US-2 (Student) — Sit a mock**
As a student, I want to take a weekly mock test so that I can gauge my rank.
*AC:* Timer auto-submits at 0:00; answers saved on each selection; result + national rank + percentile shown within 1 min of close.

**US-3 (Student) — Resume lecture**
As a student, I want recorded lectures to resume where I left off.
*AC:* Re-opening a lesson seeks to last saved position (±5 s).

**US-4 (Teacher) — Run live class**
As a teacher, I want to start a built-in live class with whiteboard & screen share.
*AC:* Students in the window can join; raise-hand notifies teacher; attendance auto-logged; recording appears as a lesson after the class ends.

**US-5 (Teacher) — Create exam**
As a teacher, I want to build an MCQ exam with negative marking and shuffled options.
*AC:* Each student sees randomized question/option order; negative marks applied per config; results auto-graded.

**US-6 (Moderator) — Moderate forum**
As a moderator, I want to hide an abusive post and warn the user.
*AC:* Hidden post is invisible to students; action logged in audit trail; author notified.

**US-7 (Admin) — Approve course**
As an admin, I want to approve a teacher's course before it goes live.
*AC:* Status transitions `PENDING_REVIEW → PUBLISHED`; teacher notified; students can enroll only when `PUBLISHED`.

**US-8 (Admin) — View analytics**
As an admin, I want a revenue & active-user dashboard.
*AC:* Charts for daily signups, revenue, DAU/MAU, course popularity, exam pass rates; date-range filter; CSV export.

**US-9 (Student) — Adaptive practice**
As a student, I want recommended practice that matches my weak topics.
*AC:* After ≥20 answered questions, the system recommends a practice set weighted toward low-mastery topics with appropriate difficulty.

**US-10 (Student) — Support ticket**
As a student, I want to raise a payment issue ticket.
*AC:* Ticket created with category `PAYMENT`; auto-assigned to support queue; status tracked; resolution notified.

---

## 6. Use Cases (detailed)

### UC-1: Take Online Exam
- **Actor:** Student
- **Preconditions:** Enrolled + active subscription; exam is `OPEN`.
- **Main flow:**
  1. Student opens exam → system validates eligibility & window.
  2. System creates an `ExamAttempt`, loads randomized/shuffled questions.
  3. Student answers; each answer auto-saved (debounced) to server + local cache.
  4. Timer counts down (server-authoritative).
  5. Student submits OR timer hits zero → auto-submit.
  6. MCQ auto-graded; written queued for manual grading.
  7. Result generated; student notified.
- **Alternate flows:**
  - *A1 Disconnect:* On reconnect, attempt resumes from server state; remaining time from server clock.
  - *A2 Secure mode violation:* Tab switch/blur logged; configurable warning or auto-submit.
- **Postconditions:** Attempt `SUBMITTED/GRADED`; analytics + mastery updated.

### UC-2: Process Payment & Enrollment
- **Actor:** Student, Payment Gateway
- **Main flow:**
  1. Student clicks Enroll → chooses gateway.
  2. Backend creates `Payment(PENDING)` + gateway session; returns redirect/URL.
  3. Student completes payment on gateway.
  4. Gateway → backend webhook/IPN with status.
  5. Backend verifies signature/amount → `Payment(SUCCESS)` → `Subscription(ACTIVE)` → grant access.
  6. Receipt + notification sent.
- **Alternate:** *A1 Failure/timeout:* `Payment(FAILED)`; student retried; no access granted. *A2 Duplicate IPN:* Idempotency key prevents double-activation.

### UC-3: Conduct Built-in Live Class
- **Actor:** Teacher, Students
- **Main flow:** Teacher starts class → LiveKit room created → students join (token-gated) → screen share/whiteboard/chat/raise-hand → attendance logged → teacher ends → recording egress to S3 → attached as recorded lesson.
- **Alternate:** Provider outage → fallback link (Zoom/Meet) surfaced automatically.

### UC-4: Generate Mock Ranking
- **Actor:** System (scheduled job)
- **Flow:** On mock close → aggregate scores → compute rank, percentile, subject breakdown → persist `MockResult` + leaderboard cache (Redis sorted set) → notify students.

---

## 7. Traceability (sample)

| Requirement | Module | API | DB Tables |
|-------------|--------|-----|-----------|
| FR-18 (exam config) | Exam Engine | `POST /exams` | `exams`, `exam_questions` |
| FR-22 (ranking) | Mock Platform | `GET /mocks/:id/leaderboard` | `mock_results` |
| FR-37 (payments) | Payments | `POST /payments/initiate` | `payments`, `subscriptions` |
| FR-40 (adaptive) | Adaptive Learning | `GET /adaptive/recommendations` | `topic_mastery`, `question_attempts` |

---

Next: [02 — System Architecture →](02-SYSTEM-ARCHITECTURE.md)
