# 04 — REST API Design

**Base URL:** `/api/v1` · **Format:** JSON · **Auth:** `Authorization: Bearer <accessToken>` · **Docs:** Swagger/OpenAPI at `/docs`.

---

## 1. Conventions

- **Versioned** path prefix `/api/v1`.
- **Resource-oriented** nouns, plural; nesting max 2 levels.
- **Verbs:** `GET` (read), `POST` (create/action), `PATCH` (partial update), `PUT` (replace), `DELETE`.
- **Pagination:** `?page=1&limit=20` → response `meta: { page, limit, total, totalPages }`.
- **Filtering/sort:** `?status=ACTIVE&sort=-createdAt&q=search`.
- **Idempotency:** mutating payment endpoints accept `Idempotency-Key` header.
- **Rate limits:** global + per-route (Redis); `429` with `Retry-After`.

### Standard envelopes
```jsonc
// success
{ "data": { ... }, "meta": { ... } }
// error
{ "error": { "code": "VALIDATION_ERROR", "message": "…", "details": [ … ], "traceId": "…" } }
```

### Status codes
`200` OK · `201` Created · `204` No Content · `400` Bad Request · `401` Unauthorized · `403` Forbidden · `404` Not Found · `409` Conflict · `422` Unprocessable · `429` Too Many Requests · `500` Server Error.

---

## 2. Auth & Account

| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | public | Register (name, email/phone, password) → sends OTP |
| POST | `/auth/verify-otp` | public | Verify OTP (purpose: signup/reset) |
| POST | `/auth/login` | public | Credentials → access + refresh |
| POST | `/auth/oauth/google` | public | Google ID token → tokens |
| POST | `/auth/refresh` | public | Refresh token → new access |
| POST | `/auth/logout` | auth | Revoke current session |
| POST | `/auth/forgot-password` | public | Send reset OTP |
| POST | `/auth/reset-password` | public | OTP + new password |
| GET | `/auth/me` | auth | Current user profile |
| GET | `/auth/sessions` | auth | List active devices |
| DELETE | `/auth/sessions/:id` | auth | Revoke a device |

**Login response**
```json
{ "data": { "user": { "id": "...", "name": "...", "role": "STUDENT" },
            "accessToken": "jwt...", "refreshToken": "jwt...", "expiresIn": 900 } }
```

---

## 3. Users (Admin)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/users` | ADMIN, MODERATOR | List/filter users |
| POST | `/users` | ADMIN | Create user (any role) |
| GET | `/users/:id` | ADMIN, MODERATOR | Get user |
| PATCH | `/users/:id` | ADMIN | Update / change role / ban |
| DELETE | `/users/:id` | ADMIN | Soft-delete |

---

## 4. Courses & Enrollment

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/courses` | public | List courses (the Crash Course) |
| GET | `/courses/:slug` | public | Course detail + curriculum (gated content hidden) |
| POST | `/courses` | TEACHER, ADMIN | Create (DRAFT) |
| PATCH | `/courses/:id` | TEACHER(owner), ADMIN | Update |
| POST | `/courses/:id/submit-review` | TEACHER | DRAFT → PENDING_REVIEW |
| POST | `/courses/:id/approve` | ADMIN | → PUBLISHED |
| POST | `/courses/:id/enroll` | STUDENT | Begins payment flow (returns payment session) |
| GET | `/courses/:id/progress` | STUDENT | My progress |
| Modules/Lessons | `/courses/:id/modules`, `/modules/:id/lessons` | TEACHER/ADMIN write | CRUD |
| PATCH | `/lessons/:id/progress` | STUDENT | Save position / mark complete |
| GET | `/lessons/:id/stream-url` | STUDENT(enrolled) | Signed CDN URL |

---

## 5. Live Classes

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/live-classes` | auth | Upcoming/past list |
| POST | `/live-classes` | TEACHER, ADMIN | Schedule (provider) |
| POST | `/live-classes/:id/join-token` | STUDENT, TEACHER | LiveKit token (window-gated) |
| POST | `/live-classes/:id/attendance` | system/auth | Log join/leave (also via webhook) |
| POST | `/live-classes/:id/end` | TEACHER | End + trigger recording ingest |
| GET | `/live-classes/:id/recording` | STUDENT(enrolled) | Recording URL |

---

## 6. Lecture Sheets & Resources

| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | `/uploads/presign` | TEACHER, ADMIN | Get S3 presigned PUT URL |
| GET | `/sheets` | STUDENT(enrolled) | List by topic/chapter |
| POST | `/sheets` | TEACHER, ADMIN | Register uploaded sheet |
| GET | `/sheets/:id/download` | STUDENT(enrolled) | Signed download URL |
| GET | `/resources` | auth | Search/filter library (`?q=&category=&type=`) |
| POST | `/resources` | TEACHER, MODERATOR | Upload (PENDING) |
| POST | `/resources/:id/approve` | MODERATOR, ADMIN | Publish |

---

## 7. Exams

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/exams` | auth | List (filtered by enrollment) |
| POST | `/exams` | TEACHER, ADMIN | Create exam + config |
| POST | `/exams/:id/questions` | TEACHER, ADMIN | Attach questions/marks |
| GET | `/exams/:id` | STUDENT(enrolled) | Metadata (no answers) |
| POST | `/exams/:id/attempts` | STUDENT | Start attempt → shuffled questions |
| GET | `/attempts/:id` | STUDENT(owner) | Resume state + server time left |
| PATCH | `/attempts/:id/answers` | STUDENT(owner) | Autosave one answer |
| POST | `/attempts/:id/submit` | STUDENT(owner) | Submit → grading |
| POST | `/attempts/:id/violations` | STUDENT(owner) | Report secure-mode violation |
| GET | `/attempts/:id/result` | STUDENT(owner) | Result after publish |
| POST | `/attempts/:id/grade` | TEACHER | Manual grade written answers |

### Question Bank
| GET/POST/PATCH/DELETE | `/questions` | TEACHER, ADMIN | Bank CRUD, filter by subject/topic/difficulty |

---

## 8. Mock Tests

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/mocks` | auth | Schedule (full/university/weekly/monthly) |
| POST | `/mocks` | TEACHER, ADMIN | Create from exam |
| GET | `/mocks/:id/leaderboard` | auth | Ranked (paginated, from Redis) |
| GET | `/mocks/:id/my-result` | STUDENT | Score, rank, percentile, subject breakdown |

---

## 9. Assignments

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET/POST | `/assignments` | list/auth; create TEACHER | — |
| POST | `/assignments/:id/submissions` | STUDENT | Submit file/text |
| GET | `/assignments/:id/submissions` | TEACHER | List submissions |
| PATCH | `/submissions/:id/grade` | TEACHER | Marks + feedback |

---

## 10. Forum

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET/POST | `/forum/threads` | auth | List/create |
| GET | `/forum/threads/:id` | auth | Thread + posts |
| POST | `/forum/threads/:id/posts` | auth | Reply |
| POST | `/forum/posts/:id/vote` | auth | Upvote/downvote |
| POST | `/forum/posts/:id/mark-answer` | TEACHER | Verified answer |
| POST | `/forum/posts/:id/hide` | MODERATOR | Moderate |

---

## 11. Announcements & Notifications

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET/POST | `/announcements` | read auth; create ADMIN/TEACHER/MOD | Targeted notices |
| GET | `/notifications` | auth | My feed |
| PATCH | `/notifications/:id/read` | auth | Mark read |
| POST | `/notifications/device-tokens` | auth | Register FCM token |

---

## 12. Payments & Subscriptions

| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | `/payments/initiate` | STUDENT | Create payment session (gateway, courseId) |
| POST | `/payments/webhook/:gateway` | public(signed) | IPN/callback → verify → activate |
| GET | `/payments` | ADMIN | Monitor all |
| GET | `/payments/my` | STUDENT | My history |
| POST | `/payments/:id/refund` | ADMIN | Refund |
| GET | `/subscriptions/my` | STUDENT | My access status |

**Initiate response**
```json
{ "data": { "paymentId": "...", "redirectUrl": "https://gateway/...", "status": "PENDING" } }
```

---

## 13. Admin Analytics & Support

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/admin/analytics/overview` | ADMIN | Signups, revenue, DAU/MAU, popularity, exam stats |
| GET | `/admin/analytics/revenue?from&to` | ADMIN | Revenue series + CSV |
| GET/POST | `/support/tickets` | auth create; MOD/ADMIN list | Tickets |
| PATCH | `/support/tickets/:id/assign` | MODERATOR, ADMIN | Assign |
| PATCH | `/support/tickets/:id/status` | MOD, ADMIN | Status transition |
| POST | `/support/tickets/:id/messages` | auth | Reply |

---

## 14. Adaptive Learning

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/adaptive/recommendations` | STUDENT | Next practice set + difficulty |
| GET | `/adaptive/mastery` | STUDENT | Topic mastery map |
| GET | `/adaptive/revision-today` | STUDENT | Due spaced-revision items |

---

## 15. Error Catalog (sample)
| Code | HTTP | Meaning |
|------|------|---------|
| `VALIDATION_ERROR` | 400 | DTO failed validation |
| `UNAUTHENTICATED` | 401 | Missing/invalid token |
| `FORBIDDEN_ROLE` | 403 | Role lacks permission |
| `NOT_ENROLLED` | 403 | No active subscription |
| `EXAM_CLOSED` | 409 | Outside window |
| `ATTEMPT_EXISTS` | 409 | Graded attempt already taken |
| `PAYMENT_DUPLICATE` | 409 | Idempotency hit |
| `RATE_LIMITED` | 429 | Too many requests |

---

Next: [05 — Modules →](05-MODULES.md)
