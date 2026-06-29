# 02 — System Architecture

---

## 1. Architectural Style

CampusKrafts uses a **modular monolith** (NestJS) that is **microservice-ready**: each domain lives in its own module with a clear boundary, so high-load domains (Exams, Live Class signaling, Notifications) can later be extracted into independent services without rewrites. This balances **early velocity** (one deployable, one DB, simple transactions) with a **clean path to scale**.

```
                         ┌────────────────────────────────────────────┐
                         │                 CLIENTS                     │
                         │  Next.js Web │ React Native Mobile │ Admin  │
                         └───────┬─────────────┬───────────────┬───────┘
                                 │  HTTPS/WSS  │               │
                                 ▼             ▼               ▼
                         ┌────────────────────────────────────────────┐
                         │      CloudFront CDN  +  AWS WAF             │
                         └───────────────────┬────────────────────────┘
                                             ▼
                         ┌────────────────────────────────────────────┐
                         │   API Gateway / Application Load Balancer   │
                         └───────────────────┬────────────────────────┘
                                             ▼
              ┌────────────────────────────────────────────────────────────┐
              │             NestJS API (ECS Fargate, N tasks)              │
              │                                                            │
              │  Auth │ Users │ Courses │ Live │ Exams │ Mocks │ Forum     │
              │  Sheets │ Resources │ Payments │ Assignments │ Tickets     │
              │  Notifications │ Analytics │ Adaptive │ Admin              │
              └───┬───────┬────────┬─────────┬───────────┬────────┬───────┘
                  │       │        │         │           │        │
                  ▼       ▼        ▼         ▼           ▼        ▼
            PostgreSQL  Redis   BullMQ     S3 +       LiveKit   3rd-party
            (RDS,       (Elasti  Workers   CloudFront  (WebRTC)  Zoom/Meet
            multi-AZ)   Cache)   (ECS)                          bKash/Nagad
                                                               Rocket/SSLCommerz
                                                               FCM/Email/SMS
```

---

## 2. Logical Layers

| Layer | Responsibility | Tech |
|-------|----------------|------|
| **Presentation** | Web/mobile UI, SSR/ISR, client state | Next.js, React Native, TanStack Query |
| **API / Edge** | Routing, TLS, WAF, rate limiting | ALB, CloudFront, NestJS middleware |
| **Application** | Controllers, DTO validation, auth guards | NestJS controllers/guards/pipes |
| **Domain** | Business logic, services, policies | NestJS providers/services |
| **Data Access** | ORM, repositories, transactions | Prisma |
| **Infrastructure** | DB, cache, queue, storage, external APIs | PostgreSQL, Redis, BullMQ, S3 |
| **Async / Workers** | Recording ingest, grading, ranking, notifications, emails | BullMQ workers on ECS |

---

## 3. Request Lifecycle

1. Client sends HTTPS request with `Authorization: Bearer <access JWT>`.
2. CloudFront/WAF filter → ALB → NestJS task.
3. Middleware: request ID, logging, rate limit (Redis).
4. `JwtAuthGuard` validates token → `RolesGuard` checks RBAC → `PoliciesGuard` checks resource ownership.
5. Controller validates DTO (class-validator) → calls domain service.
6. Service runs business logic; reads/writes via Prisma; cache via Redis; enqueues async jobs to BullMQ.
7. Response shaped by interceptor (`{ data, meta }`), errors by global exception filter.

---

## 4. Async / Event-Driven Flows

Heavy or deferred work is offloaded to **BullMQ queues** (backed by Redis), processed by dedicated worker tasks:

| Queue | Producers | Worker job |
|-------|-----------|-----------|
| `exam-grading` | Exam submit | Auto-grade MCQ, compute scores, update mastery |
| `mock-ranking` | Mock close (cron) | Aggregate, rank, percentile, cache leaderboard |
| `media-ingest` | Live class end / upload | Transcode, thumbnail, attach recording |
| `notifications` | Many | Fan-out push/email/SMS |
| `payments-recon` | Webhook/cron | Verify, reconcile, retry IPN |
| `adaptive` | Question attempts | Recompute recommendations, revision schedule |

---

## 5. Technology Stack & Justification

| Concern | Choice | Why |
|---------|--------|-----|
| Web | **Next.js 14 + React + TS** | SSR/ISR for SEO landing + fast dashboards; one language across stack; huge ecosystem. |
| Mobile | **React Native (Expo)** | Reuse React skills/components; single codebase iOS+Android; OTA updates. |
| Backend | **NestJS (Node 20)** | Opinionated modular DI architecture → clean boundaries, testability, guards/interceptors fit RBAC + exam security; TS end-to-end. |
| DB | **PostgreSQL 16** | Relational integrity for enrollments/payments/exams; JSONB for flexible question payloads; mature, strong FTS, window functions for ranking. |
| ORM | **Prisma** | Type-safe queries, migrations, great DX; single schema as DB source of truth. |
| Cache/Queue | **Redis + BullMQ** | Sub-ms cache, rate limiting, leaderboards (sorted sets), reliable background jobs. |
| Storage/CDN | **S3 + CloudFront** | Durable, cheap object storage for PDFs/videos; signed URLs; global low-latency delivery. |
| Live class | **LiveKit (WebRTC)** + Zoom/Meet | Built-in classroom (whiteboard/screenshare/chat/raise-hand) with provider fallback. |
| Auth | **JWT + OAuth + RBAC** | Stateless scaling; Google social login; fine-grained roles. |
| Payments | **SSLCommerz + bKash/Nagad/Rocket** | Covers BD market: MFS + cards; minimal PCI scope. |
| Search | **Postgres FTS → OpenSearch** | Start simple, scale to dedicated search when needed. |
| Infra | **AWS ECS Fargate, RDS, ElastiCache** | Serverless containers, managed DB/cache, multi-AZ, autoscaling. |
| IaC | **Terraform** | Reproducible environments. |
| CI/CD | **GitHub Actions → ECR → ECS** | Native, simple, fast. |
| Observability | **Prometheus/Grafana, Loki, Sentry, OTel** | Metrics, logs, traces, error tracking. |

---

## 6. Deployment / Cloud Architecture (AWS)

```
Route 53 ──► CloudFront (static + media, WAF) ──► S3 (web export / media)
                                  │
                                  ▼
                      Application Load Balancer (HTTPS, ACM cert)
                                  │
        ┌─────────────────────────┴──────────────────────────┐
        ▼                                                     ▼
  ECS Service: api (Fargate, autoscaled 2..N)        ECS Service: workers
        │                                                     │
        ├──► RDS PostgreSQL (Multi-AZ, read replicas)        │
        ├──► ElastiCache Redis (cluster mode)  ◄─────────────┘
        ├──► S3 (private buckets: sheets, recordings, submissions)
        ├──► Secrets Manager (DB creds, gateway keys, JWT secrets)
        └──► LiveKit cluster (EC2/EKS) for WebRTC SFU
```

- **VPC**: public subnets (ALB, NAT) + private subnets (ECS, RDS, Redis).
- **Security groups**: ALB→API only on 443/4000; API→RDS 5432; API→Redis 6379; no public DB access.
- **Environments**: `dev`, `staging`, `prod` — isolated VPCs/accounts via Terraform workspaces.

Details: [08-DEVOPS.md](08-DEVOPS.md).

---

## 7. Diagram Descriptions

### 7.1 ER Diagram (description)
Central entity **User** (1)──(M) **Subscription** (M)──(1) **Course**. **Course** (1)──(M) **CourseModule** (1)──(M) **Lesson**; a Lesson is `LIVE | RECORDED | SHEET`. **LiveClass** (1)──(1) Lesson and (1)──(M) **Attendance** (M)──(1) User. **Exam** (1)──(M) **ExamQuestion** (M)──(1) **Question** (in **QuestionBank**); **Exam** (1)──(M) **ExamAttempt** (1)──(M) **AnswerResponse**. **MockTest** specializes Exam with (1)──(M) **MockResult** (M)──(1) User. **Payment** (M)──(1) User and (1)──(1) Subscription. **ForumThread** (1)──(M) **ForumPost** with self-referencing replies and **Vote** (M)──(1) User. Full schema: [03-DATABASE.md](03-DATABASE.md).

### 7.2 Class Diagram (description)
Domain services as classes: `AuthService(login, refresh, revoke)`, `CourseService(create, approve, enroll, progress)`, `ExamService(create, startAttempt, saveAnswer, submit, grade)`, `MockService(schedule, close, rank)`, `PaymentService(initiate, verifyWebhook, refund)`, `LiveClassService(createRoom, issueToken, recordAttendance, attachRecording)`, `AdaptiveService(recordAttempt, computeMastery, recommend)`. Entities map to Prisma models; DTOs validate input; Guards (`JwtAuthGuard`, `RolesGuard`, `PoliciesGuard`) enforce access. Each service depends on `PrismaService`, `RedisService`, and a `QueueService`.

### 7.3 Sequence Diagram (description) — Online Exam
`Student → API: POST /exams/:id/attempts` → `ExamService` validates window/eligibility → creates `ExamAttempt`, fetches shuffled questions from cache/DB → returns. `Student → API: PATCH /attempts/:id/answers` (per answer) → persisted + cached. On `POST /attempts/:id/submit` (or timer cron) → enqueue `exam-grading` → worker grades, writes `ExamResult`, updates `topic_mastery`, enqueues `notifications`. Student polls/receives result.

### 7.4 Activity Diagram (description) — Payment & Enrollment
Start → choose gateway → create `Payment(PENDING)` → redirect → [user completes?] —no→ `FAILED` → end; —yes→ gateway IPN → verify signature/amount → [valid?] —no→ flag/`FAILED` → end; —yes→ `Payment(SUCCESS)` → `Subscription(ACTIVE)` → grant access → send receipt → end.

### 7.5 Activity Diagram (description) — Live Class
Teacher schedules → at start, create room → students join (token) → interact (chat/whiteboard/raise-hand/screenshare) → attendance logged continuously → teacher ends → recording egress → media-ingest worker → attach as recorded lesson → notify students.

---

## 8. Scalability Strategy (overview)
- **Stateless API** tasks behind ALB → horizontal autoscaling on CPU/RPS.
- **Read replicas** for analytics/leaderboards; **PgBouncer** for connection pooling.
- **Redis** for hot reads, rate limits, leaderboards; **BullMQ** to absorb spikes (exam submits, mock close).
- **CDN** offloads all media/static; signed URLs keep it private.
- **Mock-test surge plan**: pre-scale tasks before scheduled mocks; queue-based grading prevents thundering-herd on DB.

Deep dive: [08-DEVOPS.md](08-DEVOPS.md).

---

Next: [03 — Database Design →](03-DATABASE.md)
