# CampusKrafts

> Online University Admission Preparation Platform for Bangladeshi students.

CampusKrafts is a modern, scalable, mobile-friendly EdTech platform that runs **one flagship Crash Course** for university admission preparation. Students attend live classes, watch recorded lectures, download lecture sheets, sit online & mock exams, discuss topics, track progress, and pay via Bangladeshi gateways (bKash, Nagad, Rocket, SSLCommerz, cards).

This repository contains:

1. **Complete software-engineering documentation** (`/docs`) — SRS, architecture, DB design, API, security, DevOps, UI/UX, adaptive learning.
2. **A fully-connected backend** (`/backend`) — NestJS + PostgreSQL (Prisma) + Redis, with auth, RBAC, and all feature modules wired end-to-end.
3. **A professional web frontend** (`/frontend`) — Next.js 14 + React + TypeScript + Tailwind, wired to the backend (landing, auth, dashboards, course pages, live exam runner, mock leaderboard, resources, forum, admin).
4. **A step-by-step setup & storage guide** (`/docs/SETUP-GUIDE.md`) — how to open the project, connect the database, and where every piece of data is stored.

---

## Documentation Index

| # | Document | Covers |
|---|----------|--------|
| 1 | [SRS](docs/01-SRS.md) | Scope, functional + non-functional requirements, user stories, use cases |
| 2 | [System Architecture](docs/02-SYSTEM-ARCHITECTURE.md) | High-level + deployment architecture, diagram descriptions (ER, class, sequence, activity), tech stack justification |
| 3 | [Database Design](docs/03-DATABASE.md) | Full Prisma schema, table-by-table reference, ER diagram description, indexing |
| 4 | [REST API Design](docs/04-API.md) | Conventions, endpoints per module, request/response contracts, errors |
| 5 | [Modules](docs/05-MODULES.md) | Every feature module: purpose, features, flow, tables, endpoints, security, scalability |
| 6 | [UI/UX](docs/06-UIUX.md) | Wireframe descriptions for all key screens, design system |
| 7 | [Security](docs/07-SECURITY.md) | Auth, RBAC, anti-cheating, exam secure mode, payment security, OWASP |
| 8 | [DevOps](docs/08-DEVOPS.md) | AWS deployment, CI/CD, scalability, caching, monitoring, backup/recovery |
| 9 | [Adaptive Learning](docs/09-ADAPTIVE-LEARNING.md) | AI-powered difficulty adjustment, recommendation algorithm, learning analytics |
| 10 | [Setup & Storage Guide](docs/SETUP-GUIDE.md) | **How to open the project, connect everything, and store all data** |

---

## Tech Stack (summary)

| Layer | Technology |
|-------|-----------|
| Web Frontend | Next.js 14 (App Router) + React 18 + TypeScript + Tailwind + shadcn/ui |
| Mobile | React Native (Expo) + TypeScript |
| Backend | Node.js 20+ / NestJS 10 (modular monolith → microservice-ready) |
| Database | PostgreSQL 16 (primary) + Prisma ORM |
| Cache / Queue | Redis 7 + BullMQ |
| Search | PostgreSQL FTS (v1) → OpenSearch (scale) |
| Object Storage | AWS S3 (+ CloudFront CDN) |
| Live Class | Zoom + Google Meet integration, built-in classroom via LiveKit (WebRTC) |
| Auth | JWT (access + refresh) + OAuth (Google) + RBAC |
| Payments | bKash, Nagad, Rocket, SSLCommerz, cards (via SSLCommerz) |
| Deployment | AWS (ECS Fargate / EKS), RDS, ElastiCache, S3, CloudFront |
| CI/CD | GitHub Actions → ECR → ECS |
| Observability | Prometheus + Grafana, Loki, Sentry, OpenTelemetry |

Full justification: [docs/02-SYSTEM-ARCHITECTURE.md](docs/02-SYSTEM-ARCHITECTURE.md#technology-stack--justification).

---

## Quick Start (TL;DR)

```bash
# 1. Start infrastructure (PostgreSQL + Redis)
cd backend
cp .env.example .env            # then edit secrets
docker compose up -d            # or use a local Postgres/Redis — see SETUP-GUIDE

# 2. Install & generate
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed                    # creates roles, admin user, the crash course

# 3. Run the API
npm run start:dev               # API at http://localhost:4000/api/v1
                                # Swagger at http://localhost:4000/docs

# 4. Run the web app (new terminal)
cd ../frontend
cp .env.local.example .env.local
npm install
npm run dev                     # Web at http://localhost:3000
```

Then open **http://localhost:3000** and log in with a seeded account
(e.g. `student@campuskrafts.com` / `Student@123` — the login page has one-click demo buttons).

Full instructions (Docker **and** non-Docker), troubleshooting, and a data-storage map are in **[docs/SETUP-GUIDE.md](docs/SETUP-GUIDE.md)**.

---

## Repository Layout

```
CampusKraft/
├── README.md
├── docs/                      # All engineering documentation
│   ├── 01-SRS.md
│   ├── 02-SYSTEM-ARCHITECTURE.md
│   ├── 03-DATABASE.md
│   ├── 04-API.md
│   ├── 05-MODULES.md
│   ├── 06-UIUX.md
│   ├── 07-SECURITY.md
│   ├── 08-DEVOPS.md
│   ├── 09-ADAPTIVE-LEARNING.md
│   └── SETUP-GUIDE.md
├── backend/                   # Connected NestJS backend
│   ├── docker-compose.yml
│   ├── .env.example
│   ├── prisma/
│   │   ├── schema.prisma      # FULL database schema (source of truth)
│   │   └── seed.ts
│   └── src/
│       ├── main.ts
│       ├── app.module.ts
│       ├── common/            # guards, decorators, filters, interceptors
│       ├── prisma/            # PrismaService (DB connection)
│       ├── redis/            # RedisService (cache connection)
│       └── modules/          # auth, users, courses, exams, payments, ...
└── frontend/                  # Next.js 14 web client (App Router)
    ├── app/                  # routes: landing, auth, dashboard, courses,
    │   │                     #         exam runner, mocks, resources, forum, admin
    │   ├── (app)/            # authenticated shell (sidebar + topbar)
    │   ├── courses/          # public catalog + course detail
    │   └── exam/[id]/        # full-screen exam runner
    ├── components/           # ui primitives + marketing + app shell
    └── lib/                  # api client, auth context, hooks, utils
```

---

## License & Status

Internal product documentation & reference implementation for **CampusKrafts**. Treat the backend scaffold as a production-grade starting point — it is fully wired (DB, cache, auth, RBAC) and ready for the development team to extend module by module per [docs/05-MODULES.md](docs/05-MODULES.md).
