# CampusKrafts — Backend (NestJS)

Fully-connected REST API for the CampusKrafts admission-prep platform.
PostgreSQL (Prisma) + Redis + JWT/RBAC. See the full walkthrough in
[`../docs/SETUP-GUIDE.md`](../docs/SETUP-GUIDE.md).

## Run (TL;DR)

```bash
cp .env.example .env          # edit secrets
docker compose up -d          # Postgres + Redis
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed                  # admin/teacher/mod/student + the Crash Course
npm run start:dev             # http://localhost:4000/api/v1  ·  docs at /docs
```

## Seeded logins

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@campuskrafts.com | `Admin@12345` |
| Teacher | teacher@campuskrafts.com | `Admin@12345` |
| Moderator | moderator@campuskrafts.com | `Admin@12345` |
| Student | student@campuskrafts.com | `Student@123` |

## Layout

```
src/
├── main.ts                 # bootstrap: prefix, CORS, validation, Swagger
├── app.module.ts           # wires every module + global guards
├── config/                 # typed env configuration
├── prisma/                 # PrismaService (PostgreSQL connection)
├── redis/                  # RedisService (cache + leaderboards)
├── common/                 # guards (JWT, RBAC), decorators, filter, interceptor
└── modules/
    ├── auth/               # register, OTP, login, refresh, sessions
    ├── users/              # admin user management
    ├── courses/            # catalog, curriculum, progress, student dashboard
    ├── live-classes/       # schedule, join tokens, attendance, recordings
    ├── content/            # lecture sheets + resource library
    ├── exams/              # exam engine + attempts + grading + question bank
    ├── mocks/              # mock tests + Redis leaderboard
    ├── assignments/        # submit + grade
    ├── forum/              # threads, posts, votes, moderation
    ├── comms/              # announcements + notifications + device tokens
    ├── payments/           # initiate, webhook, refund, subscriptions
    ├── support/            # tickets
    ├── adaptive/           # mastery, recommendations, spaced revision
    ├── admin/              # analytics
    ├── uploads/            # S3 presign
    └── health/             # liveness + DB/Redis checks
```

## Useful scripts

| Script | Purpose |
|--------|---------|
| `npm run start:dev` | Watch-mode dev server |
| `npm run build` | Compile to `dist/` |
| `npm run prisma:studio` | Browse the DB in a GUI |
| `npm run seed` | Re-seed baseline data (idempotent) |
