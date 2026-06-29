# 03 — Database Design

**Engine:** PostgreSQL 16 · **ORM:** Prisma · **IDs:** `cuid()` (string) · **Soft delete:** `deletedAt` where needed · **Audit:** `createdAt`, `updatedAt`.

The canonical, runnable schema is at [`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma). This document explains it.

---

## 1. Schema Domains

1. **Identity & Access** — `User`, `Role` (enum), `Session`, `OAuthAccount`, `OtpToken`, `AuditLog`.
2. **Catalog & Enrollment** — `Course`, `CourseModule`, `Lesson`, `Subscription`, `LessonProgress`.
3. **Live Classes** — `LiveClass`, `Attendance`.
4. **Content** — `LectureSheet`, `Resource`, `ResourceCategory`.
5. **Assessment** — `Question`, `QuestionOption`, `Exam`, `ExamQuestion`, `ExamAttempt`, `AnswerResponse`, `ExamResult`.
6. **Mock & Ranking** — `MockTest`, `MockResult`.
7. **Assignments** — `Assignment`, `AssignmentSubmission`.
8. **Community** — `ForumThread`, `ForumPost`, `Vote`.
9. **Comms** — `Announcement`, `Notification`, `DeviceToken`.
10. **Commerce** — `Payment`, `Refund`.
11. **Support** — `SupportTicket`, `TicketMessage`.
12. **Adaptive** — `QuestionAttempt`, `TopicMastery`, `RevisionItem`.

---

## 2. Key Enums

```
Role:            STUDENT | TEACHER | MODERATOR | ADMIN
LessonType:      LIVE | RECORDED | SHEET
LiveProvider:    BUILT_IN | ZOOM | GOOGLE_MEET
CourseStatus:    DRAFT | PENDING_REVIEW | PUBLISHED | ARCHIVED
SubStatus:       PENDING | ACTIVE | EXPIRED | CANCELLED
ExamType:        MCQ | WRITTEN | MIXED
ExamMode:        PRACTICE | GRADED | MOCK
MockScope:       FULL | UNIVERSITY | WEEKLY | MONTHLY_GRAND
AttemptStatus:   IN_PROGRESS | SUBMITTED | AUTO_SUBMITTED | GRADED
PaymentStatus:   PENDING | SUCCESS | FAILED | REFUNDED
Gateway:         BKASH | NAGAD | ROCKET | SSLCOMMERZ | CARD
TicketStatus:    OPEN | ASSIGNED | IN_PROGRESS | RESOLVED | CLOSED
NotifChannel:    IN_APP | PUSH | EMAIL | SMS
```

---

## 3. Table-by-Table Reference (essentials)

### Identity & Access
| Table | Key columns | Notes |
|-------|-------------|-------|
| `users` | id, name, email(unique), phone(unique), passwordHash, role, isVerified, avatarUrl, createdAt | Core principal. Index on email, phone, role. |
| `sessions` | id, userId, refreshTokenHash, userAgent, ip, expiresAt, revokedAt | One row per device/login; revocation = logout. |
| `oauth_accounts` | id, userId, provider, providerUserId(unique) | Google login linkage. |
| `otp_tokens` | id, userId, purpose, codeHash, expiresAt, consumedAt | Verify/reset; short TTL. |
| `audit_logs` | id, actorId, action, entity, entityId, meta(JSONB), ip, createdAt | Every privileged action. |

### Catalog & Enrollment
| Table | Key columns | Notes |
|-------|-------------|-------|
| `courses` | id, title, slug(unique), description, priceBdt, status, thumbnailUrl, createdById | The single Crash Course lives here (extensible). |
| `course_modules` | id, courseId, title, order | Ordered sections. |
| `lessons` | id, moduleId, title, type(LessonType), order, videoUrl, durationSec, sheetId, liveClassId, isFreePreview | Polymorphic by `type`. |
| `subscriptions` | id, userId, courseId, status, startAt, endAt, paymentId | Grants access; unique(userId,courseId active). |
| `lesson_progress` | id, userId, lessonId, completed, lastPositionSec, updatedAt | Resume + progress %. Unique(userId,lessonId). |

### Live Classes
| Table | Key columns | Notes |
|-------|-------------|-------|
| `live_classes` | id, courseId, teacherId, title, provider, startAt, endAt, joinUrl, roomName, recordingUrl, status | Provider + built-in. |
| `attendances` | id, liveClassId, userId, joinedAt, leftAt, durationSec | Auto-logged. Unique(liveClassId,userId). |

### Content
| Table | Key columns | Notes |
|-------|-------------|-------|
| `lecture_sheets` | id, courseId, uploaderId, title, type, topic, chapter, s3Key, sizeBytes, downloads | Signed-URL download. |
| `resources` | id, categoryId, uploaderId, title, type, s3Key, tags(String[]), status, searchVector(tsvector) | Library item + FTS. |
| `resource_categories` | id, name, parentId | Tree categorization. |

### Assessment
| Table | Key columns | Notes |
|-------|-------------|-------|
| `questions` | id, subject, topic, difficulty(1–5), stem, type, explanation, correctText, createdById | Question bank. |
| `question_options` | id, questionId, label, text, isCorrect | MCQ options. |
| `exams` | id, courseId, createdById, title, type, mode, durationSec, negativeMarkRatio, shuffleQuestions, shuffleOptions, secureMode, opensAt, closesAt, totalMarks | Config-driven. |
| `exam_questions` | id, examId, questionId, marks, order | Join + per-exam marks. |
| `exam_attempts` | id, examId, userId, status, startedAt, submittedAt, remainingSecSnapshot, score, violationsCount | Server-authoritative timing. Unique(examId,userId) for graded. |
| `answer_responses` | id, attemptId, questionId, selectedOptionId, answerText, isCorrect, awardedMarks, answeredAt | Progressive autosave. Unique(attemptId,questionId). |
| `exam_results` | id, attemptId(unique), correct, wrong, skipped, score, percentile, publishedAt | Generated. |

### Mock & Ranking
| Table | Key columns | Notes |
|-------|-------------|-------|
| `mock_tests` | id, examId(unique), scope, university, scheduledAt, closeAt | Wraps an Exam. |
| `mock_results` | id, mockTestId, userId, score, rank, percentile, subjectBreakdown(JSONB) | Leaderboard source; Redis sorted set mirrors live ranking. Unique(mockTestId,userId). |

### Assignments
| Table | Key columns | Notes |
|-------|-------------|-------|
| `assignments` | id, courseId, createdById, title, instructions, attachmentS3Key, dueAt, maxMarks, autoGrade | — |
| `assignment_submissions` | id, assignmentId, userId, fileS3Key, text, submittedAt, marks, feedback, gradedById, status | Unique(assignmentId,userId). |

### Community
| Table | Key columns | Notes |
|-------|-------------|-------|
| `forum_threads` | id, authorId, courseId, title, body, isLocked, isHidden, viewCount, createdAt | — |
| `forum_posts` | id, threadId, authorId, parentId(self-ref), body, isAnswer, isHidden | Threaded replies + verified answer. |
| `votes` | id, userId, postId, value(+1/-1) | Unique(userId,postId). |

### Comms
| Table | Key columns | Notes |
|-------|-------------|-------|
| `announcements` | id, authorId, title, body, audience(JSONB), publishedAt | Targeted. |
| `notifications` | id, userId, type, title, body, data(JSONB), readAt, createdAt | In-app feed. |
| `device_tokens` | id, userId, token(unique), platform | FCM push. |

### Commerce
| Table | Key columns | Notes |
|-------|-------------|-------|
| `payments` | id, userId, courseId, gateway, amountBdt, status, gatewayRef, idempotencyKey(unique), rawPayload(JSONB), createdAt | One per attempt; idempotent IPN. |
| `refunds` | id, paymentId, amountBdt, reason, status, processedById, createdAt | Audit trail. |

### Support
| Table | Key columns | Notes |
|-------|-------------|-------|
| `support_tickets` | id, requesterId, category, subject, status, priority, assigneeId, createdAt | Queue + assignment. |
| `ticket_messages` | id, ticketId, senderId, body, attachmentS3Key, createdAt | Thread. |

### Adaptive
| Table | Key columns | Notes |
|-------|-------------|-------|
| `question_attempts` | id, userId, questionId, isCorrect, timeMs, difficulty, source, createdAt | Raw signal (also from exams/practice). |
| `topic_mastery` | id, userId, subject, topic, mastery(0–1), attempts, lastSeenAt | EWMA per topic. Unique(userId,subject,topic). |
| `revision_items` | id, userId, topic, dueAt, intervalDays, easeFactor | Spaced repetition (SM-2 style). |

---

## 4. Indexing & Performance

- B-tree indexes on all FKs and frequent filters: `users(role)`, `subscriptions(userId,status)`, `lessons(moduleId,order)`, `exam_attempts(examId,userId)`, `answer_responses(attemptId)`, `payments(status,createdAt)`, `notifications(userId,readAt)`.
- **GIN** index on `resources.searchVector` (FTS) and `resources.tags`.
- **Composite unique** constraints enforce business rules (one active subscription, one answer per question, one mock result per user).
- **Partitioning** (future): `answer_responses` and `question_attempts` by month at high volume.
- **Materialized views** for analytics (daily revenue, DAU) refreshed by cron worker.

---

## 5. Data Integrity & Transactions
- Enrollment activation (`Payment.SUCCESS → Subscription.ACTIVE`) runs in a single Prisma `$transaction` guarded by `payments.idempotencyKey`.
- Exam submit + result + mastery update wrapped in a transaction inside the grading worker.
- Foreign keys with `ON DELETE RESTRICT` for financial/audit tables; `CASCADE` only for owned children (e.g., `question_options`).

---

## 6. ER Diagram (textual)

```
User 1───* Subscription *───1 Course 1───* CourseModule 1───* Lesson
User 1───* LessonProgress *───1 Lesson
Course 1───* LiveClass 1───* Attendance *───1 User
Course 1───* LectureSheet
Exam 1───* ExamQuestion *───1 Question 1───* QuestionOption
Exam 1───* ExamAttempt *───1 User ; ExamAttempt 1───* AnswerResponse
ExamAttempt 1───1 ExamResult
Exam 1───1 MockTest 1───* MockResult *───1 User
Course 1───* Assignment 1───* AssignmentSubmission *───1 User
User 1───* ForumThread 1───* ForumPost *───1 User ; ForumPost 1───* Vote
User 1───* Payment 1───1 Subscription ; Payment 1───* Refund
User 1───* SupportTicket 1───* TicketMessage
User 1───* QuestionAttempt ; User 1───* TopicMastery ; User 1───* RevisionItem
```

---

Next: [04 — REST API Design →](04-API.md)
