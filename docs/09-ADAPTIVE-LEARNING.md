# 09 — Adaptive Learning Engine

Personalizes **difficulty**, **practice questions**, and **revision schedule** from each student's performance. Implemented in `backend/src/modules/adaptive`.

---

## 1. Data Collection

Every answered question emits a signal — from exams, mocks, and standalone practice:

```
QuestionAttempt { userId, questionId, isCorrect, timeMs, difficulty(1..5), source: EXAM|MOCK|PRACTICE, createdAt }
```

The exam grader calls `recordExamSignals()` on submit, which for each MCQ:
1. resolves the question's `(subject, topic)`,
2. updates `TopicMastery`,
3. updates the `RevisionItem` schedule,
4. appends a `QuestionAttempt` row.

This keeps signal collection automatic — no separate tracking calls from the client.

---

## 2. Mastery Model (EWMA)

Mastery per `(user, subject, topic)` is an **Exponentially Weighted Moving Average** of correctness in `[0,1]`:

```
mastery_new = mastery_old + α · (target − mastery_old)
   target = 1 if correct else 0
   α = 0.3   (recent answers weighted more; tunable)
```

- New topics cold-start at `α·target`.
- Stored in `topic_mastery (mastery, attempts, lastSeenAt)`, unique per `(userId, subject, topic)`.
- Cheap O(1) update per answer; no batch job required for the baseline.

Why EWMA: responsive to recent improvement/decline, bounded, explainable, and trivial to compute online — appropriate before investing in IRT/BKT.

> **Upgrade path:** swap EWMA for **Item Response Theory (2PL)** or **Bayesian Knowledge Tracing** once enough data accrues; the `question_attempts` table is the training set. The API contract stays identical.

---

## 3. Recommendation Algorithm

`GET /adaptive/recommendations`:

```
1. Load the 3 weakest topics (lowest mastery) for the user.
2. If none (cold start) → recommend easy questions (difficulty ≤ 2) across the bank.
3. Else:
     targetDifficulty = clamp(round(1 + mastery·4), 1..5)   // weak topic → easier
     pick ≤10 questions in those topics with difficulty ≤ targetDifficulty+1
4. Return { reason, weakTopics, targetDifficulty, questions }.
```

This keeps the learner in the **zone of desirable difficulty**: low mastery → easier reinforcement; rising mastery → harder items. Selection is weighted toward weak topics so practice time targets the biggest gains.

---

## 4. Spaced Revision (SM-2 style)

Each topic carries a `RevisionItem { dueAt, intervalDays, easeFactor }`:

```
correct   → intervalDays = round(intervalDays · easeFactor)   (grows: 1→3→7→…)
incorrect → intervalDays = 1   (reset; revisit tomorrow)
dueAt     = now + intervalDays
```

`GET /adaptive/revision-today` returns items with `dueAt ≤ now`, so the dashboard surfaces exactly what to revise each day. `easeFactor` (default 2.5) can adapt to performance for finer control.

---

## 5. Learning Analytics

| Surface | Source | Use |
|---------|--------|-----|
| Mastery map (`/adaptive/mastery`) | `topic_mastery` | Student sees strengths/weaknesses per topic |
| Today's revision | `revision_items` | Daily revisit list |
| Recommendations | mastery + `questions` | Targeted practice set |
| Teacher at-risk flags | aggregate low mastery + low attempts | Intervention (teacher dashboard) |
| Cohort heatmap | mastery aggregated by topic | Curriculum gaps |

---

## 6. End-to-End Flow

```
Student answers (exam/practice)
        │
        ▼
recordExamSignals() ──► TopicMastery (EWMA)  ──► /adaptive/mastery
        │           └──► RevisionItem (SM-2)  ──► /adaptive/revision-today
        │           └──► QuestionAttempt (log) ─► future IRT/BKT training
        ▼
/adaptive/recommendations  ──►  next practice set + target difficulty
        ▼
Dashboard: weak topics, due revisions, recommended practice
```

---

## 7. Privacy & Fairness
- All adaptive data is **per-user** and student-scoped by RBAC.
- No sensitive attributes feed the model — only question performance.
- Recommendations are explainable (`reason`, `weakTopics`) so students understand *why*.

---

Back to: [README](../README.md) · [Setup & Storage Guide →](SETUP-GUIDE.md)
