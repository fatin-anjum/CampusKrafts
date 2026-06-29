# 06 — UI/UX Design

**Principles:** mobile-first, low-bandwidth aware (3G/4G in Bangladesh), Bengali/English (i18n), WCAG 2.1 AA, fast LCP (< 2.5 s on 4G). Web in Next.js 14 (App Router) + Tailwind + shadcn/ui; mobile in React Native (Expo).

## Design System

| Token | Value |
|-------|-------|
| Primary | Indigo 600 (`#4F46E5`) — trust/education |
| Accent | Emerald 500 (success, progress) |
| Danger | Rose 500 (exam timer, errors) |
| Font | Inter (Latin) + Hind Siliguri (Bengali) |
| Radius | 12px cards, 8px inputs |
| Spacing | 4-pt grid |
| Breakpoints | sm 640 · md 768 · lg 1024 · xl 1280 |
| Components | Button, Card, Tabs, Table, Dialog, Toast, Badge, Progress, Avatar, Skeleton |

Layout pattern: persistent left sidebar (collapses to bottom tab bar on mobile), top app bar (search, notifications bell, avatar menu).

---

## 1. Landing Page

```
┌───────────────────────────────────────────────────────────┐
│  CampusKrafts        Courses  Resources  Login   [Enroll]  │
├───────────────────────────────────────────────────────────┤
│   Crack University Admission 2026.                         │
│   Live classes · Mock tests · Adaptive practice.           │
│   [ Enroll in the Crash Course — ৳2,500 ]   [ Watch demo ] │
│   ───────────────────────────────────────────────────────  │
│   ✓ 200+ live + recorded lectures   ✓ Weekly & Grand mocks │
│   ✓ National ranking                ✓ Adaptive revision    │
├───────────────────────────────────────────────────────────┤
│  [Curriculum preview]  [Top teachers]  [Student results]   │
│  [Pricing card]        [FAQ]          [Footer + socials]   │
└───────────────────────────────────────────────────────────┘
```
Hero CTA → enroll/payment. Free-preview lessons playable without login. Social proof (rank improvements). Sticky enroll button on mobile.

---

## 2. Student Dashboard  (`GET /dashboard/student`)

```
┌─ Sidebar ─┬──────────────────────────────────────────────┐
│ Dashboard │  Welcome back, Rafi 👋        🔔3   ⚙        │
│ My Course │  ┌───────────── Progress ──────────────┐     │
│ Live      │  │ Crash Course      ▓▓▓▓▓▓░░░ 62%      │     │
│ Exams     │  └─────────────────────────────────────┘     │
│ Mocks     │  ┌ Upcoming Live ─┐ ┌ Next Mock ─────┐       │
│ Resources │  │ Vectors        │ │ Weekly Mock #7 │       │
│ Forum     │  │ Today 8:00 PM  │ │ Fri 9:00 PM    │       │
│ Progress  │  │ [Join in 2h]   │ │ [Details]      │       │
│ Support   │  └────────────────┘ └────────────────┘       │
│           │  Continue watching ▸ Newtonian Mechanics 45% │
│           │  Recent activity · Notifications feed         │
└───────────┴──────────────────────────────────────────────┘
```
Cards: progress ring, upcoming classes (countdown + join), mock schedule, continue-watching (resume), notifications. Empty states guide first actions.

---

## 3. Course Page

```
┌───────────────────────────────────────────────────────────┐
│  Crash Course 2026     [Enrolled ✓] / [Enroll ৳2,500]      │
│  Tabs: Overview | Curriculum | Live | Sheets | Reviews     │
├───────────────────────────────────────────────────────────┤
│  ▸ Module 1 · Physics Foundations         3/5 done         │
│     ● Vectors (Live)            🔴 live indicator           │
│     ▶ Newtonian Mechanics (Recorded)   free preview        │
│     📄 Mechanics Formula Sheet  [Download]                  │
│  ▸ Module 2 · Chemistry Core              0/4               │
└───────────────────────────────────────────────────────────┘
```
Locked lessons show a lock + “Enroll to unlock”. Free previews open the player. Sheet rows show size + download.

---

## 4. Live Class Page (built-in)

```
┌───────────────────────────── Stage ─────────────┬─ Side ──┐
│                                                   │ Chat    │
│           [ Teacher video / screen share ]        │ ─────── │
│                                                   │ Raise✋ │
│   [whiteboard canvas]                             │ People  │
├───────────────────────────────────────────────── ┤ 124 in  │
│  🎤 mute  📷 cam  🖥 share  ✋ raise  ⏺ rec  ⎋ leave│        │
└───────────────────────────────────────────────────┴────────┘
```
Teacher controls: mute-all, spotlight, start/stop recording, whiteboard tools. Student: raise-hand → teacher notified; chat; auto-attendance on join/leave. Provider banner if Zoom/Meet; fallback link if built-in degraded.

---

## 5. Exam Interface

```
┌───────────────────────────────────────────────────────────┐
│  Diagnostic MCQ Test         ⏱ 24:11   ⚠ Secure mode on   │
├──────────────────────────────────────────┬────────────────┤
│  Q7 / 30                                  │  Palette       │
│  The resultant of two equal vectors...    │  ● answered    │
│   ( ) F      (•) √2·F                      │  ○ unseen      │
│   ( ) 2F     ( ) F/√2                      │  ◐ marked      │
│                                           │ [1][2]..[30]   │
│  [Mark for review]      [Prev] [Next]     │                │
├──────────────────────────────────────────┴────────────────┤
│  Autosaved ✓     [ Submit ]  (confirm dialog)              │
└───────────────────────────────────────────────────────────┘
```
Server timer drives countdown (turns red < 2 min); each selection autosaves; question palette for navigation; tab-switch triggers a warning toast (violation logged). Auto-submit at 0:00. Disconnect → resume banner restores state + remaining time.

---

## 6. Mock Test Interface & Leaderboard

```
Pre-start:  [ Mock #7 · 100 marks · 60 min ]  Rules • [Begin]
In-test:    (same engine as Exam Interface, MOCK mode)
Result:     Score 78  ·  Rank 142 / 5,310  ·  92nd percentile
            Subject bars: Phy ▓▓▓▓ Chem ▓▓ Math ▓▓▓
            [ View leaderboard ]  [ Review answers ]
Leaderboard: rank · name · score   (paginated, your row pinned)
```

---

## 7. Resource Library

```
┌─ Filters ─┬────────────────────────────────────────────┐
│ Category  │  🔎 search resources…                       │
│ ▢ Physics │  ┌ PDF ┐ ┌ PDF ┐ ┌ PDF ┐                    │
│ ▢ Chem    │  │Short│ │Form.│ │Guide│   grid of cards    │
│ Type      │  │Notes│ │Sheet│ │lines│   tag chips         │
│ ▢ Formula │  └─────┘ └─────┘ └─────┘   [Download]        │
└───────────┴────────────────────────────────────────────┘
```
Search + category tree + type filter; cards show type badge, tags, size; approved-only visible.

---

## 8. Discussion Forum

```
Threads:  [Ask a question]   sort: Newest | Top | Unanswered
  ▸ How to solve projectile range?   12▲  3 replies  ✓answered
  ▸ Doubt in mole concept            4▲   1 reply
Thread view:
  Q: ...                                   author · 2h
   └ ✓ Verified answer (Teacher)           18▲
   └ reply…                                3▲   [Reply][▲][⚑]
```
Verified-answer badge pinned to top; vote arrows; moderator hide/lock; report flag.

---

## 9. Teacher Dashboard

```
┌─ Sidebar ─┬──────────────────────────────────────────────┐
│ Classes   │  My Classes  ·  [Schedule live]               │
│ Content   │  Upload: [Video] [Sheet] [Resource]           │
│ Exams     │  Exams: [Create] · grade queue (8 pending)    │
│ Mocks     │  Publish mock · Question bank                  │
│ Students  │  Roster · progress heatmap · at-risk flags    │
│ Grading   │  Assignment submissions to grade              │
└───────────┴──────────────────────────────────────────────┘
```

---

## 10. Admin Dashboard

```
┌─ Sidebar ─┬──────────────────────────────────────────────┐
│ Overview  │  KPIs: Students 5,310 · Revenue ৳13.2L ·      │
│ Users     │        DAU 1,240 · Active subs 4,980          │
│ Courses   │  [Revenue line chart]  [Signups bar]          │
│ Exams     │  [Course popularity]   [Exam pass rate]       │
│ Payments  │  Approvals queue · Refund requests            │
│ Content   │  Moderation queue · Support tickets           │
│ Analytics │  [Export CSV]   date-range picker             │
│ Support   │                                               │
└───────────┴──────────────────────────────────────────────┘
```

---

## Accessibility & Performance Notes
- Keyboard-navigable exam palette; ARIA live region for timer & autosave status.
- Color is never the only signal (icons + text for answered/violation states).
- Route-level code-splitting; image `next/image` + AVIF; skeletons over spinners.
- Video adaptive bitrate (HLS); sheets lazy-loaded; offline-friendly notification cache on mobile.

---

Next: [07 — Security →](07-SECURITY.md)
