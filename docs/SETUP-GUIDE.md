# Setup & Storage Guide — CampusKrafts

**Everything you need to open the project, connect the backend, run it, and understand where every piece of data is stored.** Written for Windows (works the same on macOS/Linux).

---

## 0. What you have

```
CampusKraft/
├── README.md            ← project overview + doc index
├── docs/                ← all engineering documentation (01–09 + this guide)
└── backend/             ← the runnable NestJS API (PostgreSQL + Redis + JWT/RBAC)
```

The **backend is fully connected**: it boots, connects to PostgreSQL (via Prisma) and Redis, exposes a versioned REST API with Swagger, and ships seed data (admin/teacher/moderator/student + the flagship Crash Course). A web/mobile frontend is fully *specified* in [`06-UIUX.md`](06-UIUX.md) and [`02-SYSTEM-ARCHITECTURE.md`](02-SYSTEM-ARCHITECTURE.md); see [§9](#9-adding-the-frontend) to scaffold it.

---

## 1. Prerequisites (install once)

| Tool | Version | Why | Check |
|------|---------|-----|-------|
| **Node.js** | 20 LTS+ | runs the API | `node -v` |
| **npm** | 9+ | installs packages | `npm -v` |
| **Docker Desktop** | latest | one-command Postgres + Redis | `docker -v` |
| **Git** | any | version control (optional) | `git --version` |

> No Docker? See [§3B](#3b-without-docker) to install PostgreSQL + Redis directly.

Download: Node.js → https://nodejs.org · Docker Desktop → https://www.docker.com/products/docker-desktop

---

## 2. Open the project

- **VS Code**: File → Open Folder → select `CampusKraft`. Open an integrated terminal (`` Ctrl+` ``).
- Recommended VS Code extensions: **Prisma**, **ESLint**, **REST Client** (or use Swagger).
- All backend commands below run **inside the `backend/` folder**:

```bash
cd "f:/COding/Code/Final Boss/CampusKraft/backend"
```

---

## 3. Start the database & cache

### 3A. With Docker (recommended)

```bash
docker compose up -d        # starts PostgreSQL (5432) + Redis (6379)
docker compose ps           # both should be "healthy"
```

This uses [`backend/docker-compose.yml`](../backend/docker-compose.yml). Defaults:
- Postgres: user `campus`, password `campus_pass`, db `campuskrafts`
- Data persists in Docker **named volumes** `pgdata` and `redisdata` (survives restarts).

Stop later with `docker compose down` (keeps data) or `docker compose down -v` (**deletes** data).

### 3B. Without Docker

Install **PostgreSQL 16** and **Redis 7** locally, then create the database:

```sql
-- in psql
CREATE USER campus WITH PASSWORD 'campus_pass';
CREATE DATABASE campuskrafts OWNER campus;
```

On Windows, Redis is easiest via Docker or **Memurai** (Redis-compatible). Update `DATABASE_URL`/`REDIS_URL` in `.env` to match your local install.

---

## 4. Configure environment

```bash
cp .env.example .env        # Windows PowerShell: copy .env.example .env
```

Open `.env` and at minimum set strong JWT secrets:

```bash
# generate secrets (Git Bash / WSL):
openssl rand -hex 32        # paste into JWT_ACCESS_SECRET
openssl rand -hex 32        # paste into JWT_REFRESH_SECRET
```

The default `DATABASE_URL` and `REDIS_URL` already match the Docker setup. Gateway/AWS/LiveKit keys are optional for local dev — those features run in mock mode until filled in. See the full variable list in [`.env.example`](../backend/.env.example).

---

## 5. Install, migrate, seed, run

```bash
npm install                         # install dependencies
npx prisma generate                 # generate the typed DB client
npx prisma migrate dev --name init  # create all tables in PostgreSQL
npm run seed                        # baseline data (users + Crash Course + sample exam)
npm run start:dev                   # start the API in watch mode
```

You should see:

```
🚀 API ready at http://localhost:4000/api/v1
📘 Swagger at  http://localhost:4000/docs
```

**Seeded logins:**

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@campuskrafts.com` | `Admin@12345` |
| Teacher | `teacher@campuskrafts.com` | `Admin@12345` |
| Moderator | `moderator@campuskrafts.com` | `Admin@12345` |
| Student | `student@campuskrafts.com` | `Student@123` |

---

## 6. Verify it's connected (end-to-end)

### 6A. Health check
```bash
curl http://localhost:4000/api/v1/health
# → { "data": { "status": "healthy", "checks": { "api":"ok","postgres":"ok","redis":"ok" } } }
```
All three `ok` ⇒ the backend is fully wired to Postgres and Redis.

### 6B. Log in & call a protected route
```bash
# 1) login (returns accessToken)
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student@campuskrafts.com","password":"Student@123"}'

# 2) copy the accessToken, then:
curl http://localhost:4000/api/v1/auth/me \
  -H "Authorization: Bearer <accessToken>"

# 3) browse the public catalog (the single Crash Course)
curl http://localhost:4000/api/v1/courses
```

### 6C. Try the full enrollment + exam flow (mock payment)
```bash
# Initiate enrollment (student) → returns paymentId
curl -X POST http://localhost:4000/api/v1/courses/<courseId>/enroll \
  -H "Authorization: Bearer <studentToken>" -H "Content-Type: application/json" \
  -d '{"gateway":"BKASH"}'

# Simulate the gateway IPN confirming payment → activates the subscription
curl -X POST http://localhost:4000/api/v1/payments/webhook/BKASH \
  -H "Content-Type: application/json" \
  -d '{"paymentId":"<paymentId>","status":"SUCCESS","gatewayRef":"TEST123"}'

# Now the student can start the seeded exam, autosave, submit, and get a result.
```

> Easiest of all: open **http://localhost:4000/docs** (Swagger), click **Authorize**, paste a token, and try every endpoint interactively.

---

## 7. Where everything is stored (the data map)

| Data | Lives in | How |
|------|----------|-----|
| Users, roles, sessions, OTPs, audit log | **PostgreSQL** (`users`, `sessions`, `otp_tokens`, `audit_logs`) | Prisma models; passwords bcrypt-hashed; refresh tokens stored **hashed** |
| Course, modules, lessons, enrollment, progress | **PostgreSQL** | `courses`, `course_modules`, `lessons`, `subscriptions`, `lesson_progress` |
| Exams, questions, attempts, answers, results | **PostgreSQL** | answers autosaved per keystroke (debounced) into `answer_responses` |
| Mock results | **PostgreSQL** (durable) + **Redis** (live leaderboard ZSET) | Redis is rebuildable from `mock_results` |
| Forum, assignments, support tickets, notifications | **PostgreSQL** | relational tables |
| Payments, subscriptions, refunds | **PostgreSQL** | idempotent; raw gateway payload kept in `rawPayload` JSONB |
| Adaptive signals & mastery | **PostgreSQL** | `question_attempts`, `topic_mastery`, `revision_items` |
| Cache, rate limits, leaderboards, queues | **Redis** | ephemeral / rebuildable |
| **Videos, lecture-sheet PDFs, resources, recordings, attachments** | **AWS S3** (prod) | DB stores only the **`s3Key`**; bytes never sit in Postgres. Locally these are mock URLs until S3 keys are set. |
| App configuration & secrets | **`.env`** (local) / AWS Secrets Manager (prod) | never committed to git |
| Physical Postgres files (Docker) | Docker volume **`pgdata`** | `docker volume inspect campuskraft_pgdata` |
| Physical Redis files (Docker) | Docker volume **`redisdata`** | AOF persistence |

**Rule of thumb:** *structured/relational data → PostgreSQL; hot/ephemeral data → Redis; large binary files → S3 (only the key is in Postgres).*

### Browse the data
```bash
npm run prisma:studio       # opens a GUI at http://localhost:5555 to view/edit every table
```
Or connect any SQL client to `postgresql://campus:campus_pass@localhost:5432/campuskrafts`.

---

## 8. Common commands

| Task | Command |
|------|---------|
| Start infra | `docker compose up -d` |
| Stop infra (keep data) | `docker compose down` |
| Reset DB (wipe + re-migrate + re-seed) | `npx prisma migrate reset` |
| New migration after editing `schema.prisma` | `npx prisma migrate dev --name <change>` |
| Regenerate client | `npx prisma generate` |
| Re-seed | `npm run seed` |
| Inspect data (GUI) | `npm run prisma:studio` |
| Production build | `npm run build` then `npm run start:prod` |

---

## 9. Running the frontend

The web client is already built in [`../frontend`](../frontend) (Next.js 14 + React + TypeScript + Tailwind). With the **backend running**, start it in a second terminal:

```bash
cd "f:/COding/Code/Final Boss/CampusKraft/frontend"
cp .env.local.example .env.local     # points at http://localhost:4000/api/v1
npm install
npm run dev                          # http://localhost:3000
```

Open **http://localhost:3000** and log in (the login page has one-click demo buttons, or use `student@campuskrafts.com` / `Student@123`). You can then:

- browse the **course catalog** and **enroll** (the demo runs the full payment → IPN → subscription flow),
- open the **student dashboard**, take an **exam** in the live runner (timer, autosave, auto-submit),
- view a **mock leaderboard**, search **resources**, post in the **forum**,
- log in as `admin@campuskrafts.com` / `Admin@12345` to see the **admin analytics** dashboard.

The backend already enables CORS for `http://localhost:3000` (`CORS_ORIGIN` in `.env`). Frontend details are in [`../frontend/README.md`](../frontend/README.md); screens map to [`06-UIUX.md`](06-UIUX.md) and endpoints to [`04-API.md`](04-API.md).

---

## 10. Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Can't reach database server` | Is Docker up? `docker compose ps`. Does `.env` `DATABASE_URL` match? |
| `redis` shows `down` in `/health` | `docker compose up -d redis`; check `REDIS_URL`. |
| `prisma migrate` fails | Ensure Postgres is healthy; for a clean slate run `npx prisma migrate reset`. |
| Port 4000/5432/6379 in use | Stop the conflicting app or change the port in `.env` / `docker-compose.yml`. |
| `npm install` fails on a native package | We use pure-JS deps (bcryptjs) specifically to avoid this on Windows; ensure Node 20+. |
| 401 on protected routes | Send `Authorization: Bearer <accessToken>`; tokens expire in 15 min — use `/auth/refresh`. |
| 403 `FORBIDDEN_ROLE` / `NOT_ENROLLED` | The route needs a different role, or the student isn't enrolled — run the §6C flow. |
| Want to start over completely | `docker compose down -v` then repeat [§3](#3-start-the-database--cache)–[§5](#5-install-migrate-seed-run). |

---

## 11. Going to production (checklist)
- Replace all secrets; set real gateway (bKash/Nagad/SSLCommerz), AWS S3, and LiveKit credentials.
- Use managed Postgres (RDS Multi-AZ) + Redis (ElastiCache) + S3/CloudFront — see [`08-DEVOPS.md`](08-DEVOPS.md).
- Run `prisma migrate deploy` (not `dev`) in CI/CD.
- Enable WAF, HTTPS/TLS, backups (RDS PITR), and monitoring (Sentry/Grafana).

---

You're done — the backend is connected end-to-end, the data has a home, and the docs cover everything from SRS to deployment. Start the API, open **/docs**, and build.
