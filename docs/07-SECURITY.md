# 07 — Security Architecture

Defense-in-depth across network, application, data, and operations. Maps to NFR-5/6/11.

---

## 1. Authentication

- **Passwords**: bcrypt (cost 10) — never stored or logged in plaintext. (Argon2id is a drop-in upgrade for production.)
- **Tokens**: short-lived JWT **access** (15 min) + long-lived **refresh** (30 d). Access is stateless (signed, validated per request with no DB hit). Refresh is **hashed at rest** in `sessions`; the raw token is never stored.
- **Refresh flow**: `/auth/refresh` verifies signature → looks up the session → compares the presented token against the stored hash → checks not revoked/expired. Mismatch or revocation ⇒ 401.
- **Session/device management**: every login creates a `sessions` row (UA + IP). Users list/revoke devices; password change revokes **all** sessions.
- **OTP**: 6-digit, hashed, 10-min TTL, single-use; delivered via SMS/email (logged in dev). Throttled per identifier.
- **OAuth**: Google ID-token verified server-side, linked via `oauth_accounts`.
- **Anti-enumeration**: forgot-password always returns success.

## 2. Authorization (RBAC)

- Roles: `STUDENT | TEACHER | MODERATOR | ADMIN`.
- Global `JwtAuthGuard` authenticates every route unless `@Public()`.
- `RolesGuard` + `@Roles(...)` enforce least privilege per endpoint.
- **Resource ownership** checks beyond role: teachers edit only their courses; students access only their own attempts/submissions/tickets.
- **Enrollment gate**: `assertAccess(userId, courseId)` blocks premium content, streams, sheets, live joins, and graded exams for non-subscribers.

```
Request → JwtAuthGuard (authn) → ThrottlerGuard (rate) → RolesGuard (role) → Handler (ownership/enrollment)
```

## 3. Exam Integrity / Anti-Cheating

| Threat | Mitigation |
|--------|-----------|
| Answer key leakage | `isCorrect` never serialized to clients; grading is server-side only |
| Client clock tampering | Server-authoritative timer; remaining time computed from `startedAt`; saves after expiry auto-submit |
| Question sharing | Per-attempt deterministic shuffle of questions & options (resume-stable) |
| Multiple attempts | `unique(examId, userId)` for graded; resume returns the same attempt |
| Tab switching / external help | `visibilitychange`/blur reported to `/violations`; `violationsCount` tracked; configurable warn or auto-submit; secure-browser (lockdown) mode flag |
| Answer loss on disconnect | Progressive autosave (debounced) + server resume from authoritative state |
| Bulk scraping | Rate limiting + auth + signed media |

## 4. Payment Security

- **PCI scope minimized** (SAQ-A): card data handled entirely by SSLCommerz/gateway; **no raw card data** touches or is stored by CampusKrafts.
- **Webhook/IPN**: signature/secret verification per gateway before trusting status; amount cross-checked against the `Payment` record.
- **Idempotency**: `payments.idempotencyKey` unique → duplicate IPNs are no-ops; activation runs in a single DB transaction.
- **Refunds**: status-gated, audit-trailed (`refunds.processedById`).

## 5. Data Protection

- **In transit**: TLS 1.2+ everywhere (ALB/CloudFront); HSTS.
- **At rest**: RDS + S3 encryption (AWS KMS); EBS encrypted.
- **PII**: minimized; access via safe selects (password hash never returned); export/delete on request (privacy/NFR-6).
- **Secrets**: AWS Secrets Manager / SSM Parameter Store; never committed (`.env` git-ignored); rotation supported.
- **Media access**: S3 private buckets; time-boxed signed URLs (CloudFront signed URLs/cookies); no public objects.

## 6. Application Hardening (OWASP Top 10)

| Risk | Control |
|------|---------|
| Injection | Prisma parameterized queries; validated raw SQL params |
| Broken access control | Global guards + ownership checks + enrollment gate |
| Cryptographic failures | bcrypt, TLS, KMS, hashed refresh/OTP |
| Insecure design | Threat-modeled flows (exam, payment, auth) |
| Security misconfig | `helmet`, strict CORS allow-list, `ValidationPipe` (`whitelist` + `forbidNonWhitelisted`) |
| Vulnerable components | `npm audit`/Dependabot in CI; pinned deps |
| Auth failures | Lockout/throttle, short tokens, session revocation |
| Data integrity failures | Signed webhooks, idempotency, transactions |
| Logging/monitoring | Central logs, audit_logs, alerting (see 08) |
| SSRF | No user-controlled server-side fetch; allow-listed integrations |

Additional: global rate limiting (Redis-backed `@nestjs/throttler`, 120 req/min/IP default, tighter on auth/payment); request size limits; standardized error envelope with `traceId` (no stack traces to clients).

## 7. Auditing & Compliance

- `audit_logs` records privileged actions (role change, refund, moderation, approvals) with actor, entity, IP, metadata.
- Data residency: deploy in an AWS region close to users (e.g., `ap-south-1` Mumbai); configurable.
- Backups encrypted; access via IAM least-privilege; admin actions MFA-gated (ops policy).

## 8. Threat Model Summary

Primary assets: student PII, payment records, exam content/keys, recordings. Top adversaries: cheating students, credential stuffers, payment fraud, scrapers. Controls above address each; residual risk tracked in the security backlog.

---

Next: [08 — DevOps →](08-DEVOPS.md)
