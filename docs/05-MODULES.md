# 05 — Feature Modules

Every module below follows the same template: **Purpose · Features · User Flow · Database Tables · API Endpoints · Security · Scalability.** Endpoints are detailed in [04-API.md](04-API.md); tables in [03-DATABASE.md](03-DATABASE.md). Backend code lives in `backend/src/modules/<name>`.

> The platform ships **one flagship Crash Course** as the enrollment product. The schema and code support many courses, but the product and seed expose a single course.

---

## 1. Authentication & Accounts (`auth`)

**Purpose** — Identity, sessions, and account recovery for all four roles.

**Features** — Register (email/phone + password), OTP verification, login, Google OAuth, JWT access+refresh, refresh rotation, password reset, multi-device session list/revoke.

**User Flow** — Register → receive OTP (SMS/email; logged in dev) → verify → login → receive `accessToken` (15 min) + `refreshToken` (30 d). Client stores refresh securely, calls `/auth/refresh` when access expires.

**Tables** — `users`, `sessions`, `oauth_accounts`, `otp_tokens`, `audit_logs`.

**Endpoints** — `POST /auth/register|verify-otp|login|refresh|forgot-password|reset-password|logout`, `GET /auth/me|sessions`, `DELETE /auth/sessions/:id`.

**Security** — Passwords hashed with bcrypt; refresh tokens hashed at rest (only the hash is stored); OTP hashed + 10-min TTL; password change revokes all sessions; no user enumeration on forgot-password; global JWT guard.

**Scalability** — Stateless access tokens → any API node validates without a DB hit. Session/refresh checks hit Postgres (indexed) only on refresh, not per request.

---

## 2. Users / Admin Management (`users`)

**Purpose** — Admin & moderator management of all accounts.

**Features** — List/filter/search users, create any role, update (role change, ban, verify), soft-delete.

**User Flow** — Admin opens user table → filters by role → edits/bans → change is audit-logged.

**Tables** — `users` (+ `audit_logs`).

**Endpoints** — `GET/POST /users`, `GET/PATCH/DELETE /users/:id`.

**Security** — `@Roles(ADMIN, MODERATOR)` for reads; `ADMIN` only for writes. Passwords never returned (safe select). Soft-delete keeps audit/financial integrity.

**Scalability** — Paginated queries; indexes on `role`, `createdAt`.

---

## 3. Course Management (`courses`)

**Purpose** — Catalog, curriculum, enrollment gating, progress, student dashboard.

**Features** — Public catalog + course detail (gated content hidden), authoring (course → modules → lessons), approval workflow (`DRAFT → PENDING_REVIEW → PUBLISHED`), lesson progress (resume position + completion), course progress %, **student dashboard** aggregation, signed stream URLs.

**User Flow** — Student views course → enrolls (payment) → consumes lessons → progress auto-updates → dashboard shows upcoming classes/mocks/notifications.

**Tables** — `courses`, `course_modules`, `lessons`, `subscriptions`, `lesson_progress`.

**Endpoints** — `GET /courses`, `GET /courses/:slug`, `POST /courses`, `PATCH /courses/:id`, `POST /courses/:id/{submit-review,approve,enroll}`, `GET /courses/:id/progress`, `GET /dashboard/student`, `POST /courses/:id/modules`, `POST /modules/:id/lessons`, `PATCH /lessons/:id/progress`, `GET /lessons/:id/stream-url`.

**Security** — Authoring restricted to `TEACHER`(owner)/`ADMIN`; publish to `ADMIN`. `assertAccess()` blocks non-enrolled students from premium content & stream URLs (free previews exempt).

**Scalability** — Curriculum cached in Redis; signed URLs served from CloudFront (origin offload); progress writes are single-row upserts.

---

## 4. Live Class System (`live-classes`)

**Purpose** — Live teaching via built-in WebRTC (LiveKit), Zoom, or Google Meet.

**Features** — Schedule (provider choice), time-gated join tokens, screen share + whiteboard + chat + raise-hand (built-in), attendance auto-logging (join/leave/duration), end-class → recording → S3 → recorded lesson, provider fallback.

**User Flow** — Teacher schedules → at start time students request a join token (gated: enrolled + within window) → built-in room via LiveKit or external URL → attendance logged → teacher ends → recording attached.

**Tables** — `live_classes`, `attendances`.

**Endpoints** — `GET/POST /live-classes`, `POST /live-classes/:id/join-token|attendance|end`, `GET /live-classes/:id/recording`.

**Security** — Join tokens are short-lived and identity-bound; students must hold an active subscription; recordings are signed-URL gated. LiveKit grants scoped per room.

**Scalability** — Media never traverses the API (LiveKit SFU / external providers handle A/V). The API only mints tokens and records metadata → trivially horizontal. Attendance writes are batched per user.

**Architecture (built-in classroom)** —
```
Teacher/Student browser ──WebRTC──> LiveKit SFU cluster (autoscaled)
        │  (token request)                     │ (egress on "end")
        └──────> NestJS API <── attendance ── webhooks ──> S3 recording ──> CloudFront
```

---

## 5. Lecture Sheets & Resource Library (`content`)

**Purpose** — Distribute PDFs/notes (course-gated) and a searchable public/enrolled library.

**Features** — Lecture sheets by topic/chapter/type (sheet, note, handout, formula); enrolled-only signed downloads with counters. Library: books, PDFs, short/formula/cheat sheets, guidelines; tags + search + moderation/approval; category tree.

**User Flow** — Teacher presigns an S3 upload → uploads file directly to S3 → registers the sheet/resource (`s3Key`). Student lists/searches → downloads via signed URL (access-checked).

**Tables** — `lecture_sheets`, `resources`, `resource_categories`.

**Endpoints** — `POST /uploads/presign`, `GET/POST /sheets`, `GET /sheets/:id/download`, `GET/POST /resources`, `POST /resources/:id/approve`, `GET /resource-categories`.

**Security** — Direct-to-S3 presigned PUT (API never proxies bytes); downloads access-checked + signed GET; resources require moderator/admin approval before they’re visible.

**Scalability** — S3 + CloudFront for storage/delivery; Postgres FTS (GIN) for search, upgradeable to OpenSearch; download counters are atomic increments.

---

## 6. Online Exam Engine (`exams`)

**Purpose** — MCQ/written exams with secure, server-authoritative attempts.

**Features** — Exam config (duration, negative marking, shuffle questions/options, secure mode, open/close window); question bank CRUD; start attempt → shuffled questions with answers stripped; progressive autosave; server-authoritative timer + auto-submit; MCQ auto-grade + written manual grade; result generation; secure-mode violation logging.

**User Flow** — see [01-SRS UC-1](01-SRS.md#uc-1-take-online-exam). Open → attempt created → answer (each save debounced to server) → submit / timeout → graded → result + adaptive signals.

**Tables** — `questions`, `question_options`, `exams`, `exam_questions`, `exam_attempts`, `answer_responses`, `exam_results`.

**Endpoints** — `GET/POST /exams`, `POST /exams/:id/questions`, `GET /exams/:id`, `POST /exams/:id/attempts`, `GET /attempts/:id`, `POST /attempts/:id/{answers,violations,submit}`, `GET /attempts/:id/result`, `POST /attempts/:id/grade`, `GET/POST /questions`.

**Security & anti-cheating** — Correct answers never sent to the client; deterministic per-attempt shuffle (resume-stable); server clock is the source of truth (client timer is cosmetic); tab-blur/visibility violations reported and counted (configurable warn/auto-submit); one graded attempt per exam (`unique(examId,userId)`); secure-browser/lockdown mode flag.

**Scalability** — Autosave is a single indexed upsert (`unique(attemptId,questionId)`); grading is O(questions) and can run in a worker; `answer_responses`/`question_attempts` partitionable by month at scale; exam metadata cached.

---

## 7. Mock Exam Platform (`mocks`)

**Purpose** — Full/university/weekly/monthly-grand mocks with national ranking.

**Features** — Wrap an exam as a mock; finalize a student’s result from their attempt; **Redis sorted-set leaderboard** (O(log N) insert, O(log N + k) page reads); rank + percentile; subject breakdown; DB fallback.

**User Flow** — Student takes the underlying mock exam → `POST /mocks/:id/record` finalizes score → rank & percentile computed live → leaderboard updates instantly.

**Tables** — `mock_tests`, `mock_results` (+ Redis `mock:leaderboard:<id>`).

**Endpoints** — `GET/POST /mocks`, `POST /mocks/:id/record`, `GET /mocks/:id/leaderboard|my-result`.

**Ranking algorithm** — Score = exam score (negative marking applied). Insert into Redis ZSET keyed by mock; `rank = ZREVRANK + 1`; `percentile = (N − rank) / (N − 1) × 100`. Ties share score, ordered by insert. Closing job persists final ranks to `mock_results`.

**Security** — Record requires a submitted attempt; leaderboard exposes name + score only.

**Scalability** — 50k+ concurrent finishers: ZSET ops are in-memory; reads paginated from Redis, not Postgres. Postgres holds durable results; Redis can be rebuilt from it.

---

## 8. Assignment Management (`assignments`)

**Purpose** — Coursework upload, submission, grading, feedback.

**Features** — Create assignment (instructions, attachment, due date, max marks, auto-grade flag); student submit (file `s3Key` and/or text); auto-grade hook; manual grade + feedback; one submission per student (resubmittable).

**User Flow** — Teacher creates → students submit before due → teacher grades (or auto) → feedback visible.

**Tables** — `assignments`, `assignment_submissions`.

**Endpoints** — `GET/POST /assignments`, `POST /assignments/:id/submissions`, `GET /assignments/:id/submissions`, `PATCH /submissions/:id/grade`.

**Security** — Submissions scoped to owner; grading restricted to teacher/admin; files via presigned S3.

**Scalability** — Upsert per student; submissions listed paginated; large files in S3.

---

## 9. Discussion Forum (`forum`)

**Purpose** — Q&A and academic discussion with teacher verification and moderation.

**Features** — Threads, threaded replies (self-referential `parentId`), upvote/downvote (one vote/user/post), teacher “verified answer”, moderation (hide/lock), view counts.

**User Flow** — Student asks → peers/teachers reply → upvotes surface best answers → teacher marks verified → moderator hides abuse.

**Tables** — `forum_threads`, `forum_posts`, `votes`.

**Endpoints** — `GET/POST /forum/threads`, `GET /forum/threads/:id`, `POST /forum/threads/:id/posts`, `POST /forum/posts/:id/{vote,mark-answer,hide}`.

**Security** — `mark-answer` teacher/admin; `hide` moderator/admin; hidden content filtered server-side; actions audit-logged.

**Scalability** — Vote score via aggregate (cache hot threads); pagination; verified/most-voted ordering.

---

## 10. Announcements & Notifications (`comms`)

**Purpose** — Targeted notices + multi-channel delivery.

**Features** — Create announcement with audience (`all` / roles / course); fan-out to in-app notifications; per-user feed + mark-read; FCM device-token registration. Production: BullMQ workers push FCM + email + SMS (critical only).

**User Flow** — Admin/teacher/mod publishes → audience resolved → notifications created + push enqueued → students see in-app badge / push.

**Tables** — `announcements`, `notifications`, `device_tokens`.

**Endpoints** — `GET/POST /announcements`, `GET /notifications`, `PATCH /notifications/:id/read`, `POST /notifications/device-tokens`.

**Security** — Publish restricted to staff roles; users only read/modify their own notifications.

**Scalability** — Fan-out via `createMany` + queue; large audiences chunked; push offloaded to FCM.

---

## 11. Payments & Subscriptions (`payments`)

**Purpose** — Collect payment via BD gateways and grant course access.

**Features** — Initiate (bKash/Nagad/Rocket/SSLCommerz/card) → `Payment(PENDING)` + redirect; signed webhook/IPN → verify → idempotent activation; refunds with audit; admin monitoring; student history + subscription status.

**User Flow** — see [01-SRS UC-2](01-SRS.md#uc-2-process-payment--enrollment). Enroll → gateway → IPN → `Subscription(ACTIVE)` in a transaction → receipt notification.

**Tables** — `payments`, `subscriptions`, `refunds`.

**Endpoints** — `POST /payments/initiate`, `POST /payments/webhook/:gateway`, `GET /payments`, `GET /payments/my`, `POST /payments/:id/refund`, `GET /subscriptions/my`.

**Security** — `idempotencyKey` unique → duplicate IPNs are no-ops; signature verification per gateway (production); no raw card data stored (PCI SAQ-A); activation in a single `$transaction`.

**Scalability** — Webhooks are idempotent and fast; activation is a 2-row transaction; reconciliation job re-checks stuck `PENDING`.

---

## 12. Support Tickets (`support`)

**Purpose** — Helpdesk for payment/technical/academic issues.

**Features** — Create ticket (category, priority), staff list/all, assign, status transitions (`OPEN→ASSIGNED→IN_PROGRESS→RESOLVED→CLOSED`), threaded messages with attachments.

**User Flow** — User raises ticket → moderator assigns → conversation → resolved → notified.

**Tables** — `support_tickets`, `ticket_messages`.

**Endpoints** — `POST/GET /support/tickets`, `GET /support/tickets/:id`, `PATCH /support/tickets/:id/{assign,status}`, `POST /support/tickets/:id/messages`.

**Security** — Requesters see only their tickets; staff see all; assignment/status staff-only.

**Scalability** — Indexed by `status`/`assignee`; paginated queues.

---

## 13. Admin Analytics (`admin`)

**Purpose** — Operational dashboards.

**Features** — Overview (users total/students/teachers, new-30d, revenue total, successful payments, active subs, exam attempts); daily revenue series (raw SQL `date_trunc`), CSV-exportable.

**Tables** — reads across `users`, `payments`, `subscriptions`, `exam_attempts`.

**Endpoints** — `GET /admin/analytics/overview|revenue`.

**Security** — `@Roles(ADMIN)`.

**Scalability** — Heavy aggregates moved to nightly **materialized views** at scale; dashboards read the views, not live tables.

---

## 14. Adaptive Learning (`adaptive`)

**Purpose** — Personalize practice and revision from performance signals.

**Features** — Per-`(subject,topic)` mastery via EWMA; weak-topic recommendations with target difficulty; spaced revision (SM-2-style intervals); cold-start handling. Fed automatically by the exam grader.

**User Flow** — see [09-ADAPTIVE-LEARNING.md](09-ADAPTIVE-LEARNING.md). Answer questions → mastery updates → recommendations weight weak topics → due revision surfaces daily.

**Tables** — `question_attempts`, `topic_mastery`, `revision_items`.

**Endpoints** — `GET /adaptive/recommendations|mastery|revision-today`.

**Security** — Student-scoped; data is per-user.

**Scalability** — Lightweight EWMA updates per answer; recommendation queries indexed by `(userId)` + mastery sort; heavy modeling can move to an offline batch later.

---

## 15. Uploads & Health (`uploads`, `health`)

- **Uploads** — `POST /uploads/presign` issues S3 presigned PUT URLs (teacher/admin/mod). Clients upload directly to S3; the returned `s3Key` is persisted on the owning record.
- **Health** — `GET /health` checks API + Postgres + Redis; used by load balancers and uptime monitors.

---

Next: [06 — UI/UX →](06-UIUX.md)
