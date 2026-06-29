# CampusKrafts — Frontend (Next.js)

Professional web client for the CampusKrafts admission-prep platform. Built with
**Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS**, wired to the
NestJS backend in [`../backend`](../backend).

## Run (TL;DR)

```bash
cp .env.local.example .env.local      # points at http://localhost:4000/api/v1
npm install
npm run dev                           # http://localhost:3000
```

> Start the **backend first** (see [`../docs/SETUP-GUIDE.md`](../docs/SETUP-GUIDE.md)).
> Then log in with a seeded account — e.g. `student@campuskrafts.com` / `Student@123`
> (the login page also has one-click demo buttons).

## What's included

| Area | Route | Notes |
|------|-------|-------|
| Landing | `/` | Hero, features, curriculum, pricing, testimonials |
| Auth | `/login`, `/register` | JWT login, OTP-verified signup, demo logins |
| Student dashboard | `/dashboard` | Progress, upcoming classes & mocks, notifications |
| Course catalog | `/courses` | Public catalog of the Crash Course |
| Course detail | `/courses/[slug]` | Curriculum, gated lessons, **enroll + payment flow** |
| Exams | `/exams` | List of exams |
| Exam runner | `/exam/[id]` | Live timer, question palette, autosave, secure-mode, result |
| Mock tests | `/mocks`, `/mocks/[id]` | Schedule + **live leaderboard**, rank & percentile |
| Resources | `/resources` | Searchable library with type filters |
| Forum | `/forum` | Threads + ask-a-question |
| Admin | `/admin` | KPI analytics dashboard |
| Teacher | `/teacher` | Quick-access teaching tools |

The end-to-end **enrollment flow works against the real backend**: choose a gateway →
a `PENDING` payment is created → the demo confirms the gateway IPN → your subscription
activates and the course unlocks.

## Architecture

```
app/
├── layout.tsx              # fonts + AuthProvider + ToastProvider
├── page.tsx                # landing
├── login, register/        # auth
├── courses/                # public catalog + detail (SiteHeader shell)
├── exam/[id]/              # full-screen exam runner (guarded)
└── (app)/                  # authenticated shell (sidebar + topbar)
    ├── dashboard, exams, mocks, resources, forum, admin, teacher
components/
├── ui/                     # design-system primitives (button, card, dialog, toast…)
├── marketing/              # site header/footer, auth shell
└── app/                    # app shell, page header, enroll dialog
lib/
├── api.ts                  # fetch wrapper: tokens, envelope unwrap, auto-refresh
├── auth.tsx                # AuthProvider + useAuth + role routing
├── use-api.ts              # client data hook (loading/error/refetch)
├── types.ts                # shared API types
└── utils.ts                # cn(), formatBdt(), fromNow()…
```

## Design system
Indigo→Emerald brand, HSL theme tokens (light + dark ready) in `app/globals.css`,
Tailwind config maps them to semantic colors. Components follow the shadcn/ui style
(class-variance-authority variants) but are self-contained — no CLI/init required.

## Connecting to the backend
All requests go through `lib/api.ts`, which reads `NEXT_PUBLIC_API_BASE`, attaches the
Bearer access token, unwraps the `{ data }` envelope, surfaces `{ error }` as a thrown
`ApiError`, and transparently refreshes the access token on a `401`. CORS is already
enabled on the backend for `http://localhost:3000`.
