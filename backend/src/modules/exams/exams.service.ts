import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AttemptStatus, ExamMode, Prisma, QuestionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CoursesService } from '../courses/courses.service';
import { AdaptiveService } from '../adaptive/adaptive.service';
import {
  AttachQuestionsDto, CreateExamDto, CreateQuestionDto, GradeWrittenDto, SaveAnswerDto,
} from './dto/exams.dto';

@Injectable()
export class ExamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly courses: CoursesService,
    private readonly adaptive: AdaptiveService,
  ) {}

  // ── Authoring ──────────────────────────────────────────────────────────
  createExam(dto: CreateExamDto, createdById: string) {
    return this.prisma.exam.create({
      data: {
        courseId: dto.courseId,
        createdById,
        title: dto.title,
        type: dto.type,
        mode: dto.mode,
        durationSec: dto.durationSec,
        negativeMarkRatio: dto.negativeMarkRatio ?? 0,
        shuffleQuestions: dto.shuffleQuestions ?? true,
        shuffleOptions: dto.shuffleOptions ?? true,
        secureMode: dto.secureMode ?? false,
        opensAt: dto.opensAt ? new Date(dto.opensAt) : null,
        closesAt: dto.closesAt ? new Date(dto.closesAt) : null,
      },
    });
  }

  async attachQuestions(examId: string, dto: AttachQuestionsDto) {
    const exam = await this.requireExam(examId);
    let order = await this.prisma.examQuestion.count({ where: { examId } });
    let added = 0;
    for (const q of dto.questions) {
      await this.prisma.examQuestion.upsert({
        where: { examId_questionId: { examId, questionId: q.questionId } },
        create: { examId, questionId: q.questionId, marks: q.marks ?? 1, order: ++order },
        update: { marks: q.marks ?? 1 },
      });
      added++;
    }
    const total = await this.prisma.examQuestion.aggregate({ where: { examId }, _sum: { marks: true } });
    await this.prisma.exam.update({ where: { id: exam.id }, data: { totalMarks: total._sum.marks ?? 0 } });
    return { added, totalMarks: total._sum.marks ?? 0 };
  }

  list(userId: string) {
    return this.prisma.exam.findMany({
      select: { id: true, title: true, type: true, mode: true, durationSec: true, opensAt: true, closesAt: true, totalMarks: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async metadata(examId: string, userId: string) {
    const exam = await this.requireExam(examId);
    if (exam.courseId && exam.mode !== ExamMode.PRACTICE) await this.courses.assertAccess(userId, exam.courseId);
    const count = await this.prisma.examQuestion.count({ where: { examId } });
    const { ...meta } = exam;
    return { ...meta, questionCount: count };
  }

  // ── Attempt lifecycle ──────────────────────────────────────────────────
  async startAttempt(examId: string, userId: string) {
    const exam = await this.requireExam(examId);
    const now = new Date();
    if (exam.opensAt && now < exam.opensAt) throw new ConflictException({ code: 'EXAM_NOT_OPEN', message: 'Exam not open yet' });
    if (exam.closesAt && now > exam.closesAt) throw new ConflictException({ code: 'EXAM_CLOSED', message: 'Exam window closed' });
    if (exam.courseId && exam.mode !== ExamMode.PRACTICE) await this.courses.assertAccess(userId, exam.courseId);

    const existing = await this.prisma.examAttempt.findUnique({ where: { examId_userId: { examId, userId } } });
    if (existing) {
      if (existing.status !== AttemptStatus.IN_PROGRESS)
        throw new ConflictException({ code: 'ATTEMPT_EXISTS', message: 'You have already taken this exam' });
      return this.attemptState(existing.id, userId); // resume
    }

    const attempt = await this.prisma.examAttempt.create({
      data: { examId, userId, status: AttemptStatus.IN_PROGRESS, remainingSecSnapshot: exam.durationSec },
    });
    return this.attemptState(attempt.id, userId);
  }

  /** Returns attempt state with shuffled questions (answers stripped) + server time left. */
  async attemptState(attemptId: string, userId: string) {
    const attempt = await this.prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: { exam: true, responses: true },
    });
    if (!attempt) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Attempt not found' });
    if (attempt.userId !== userId) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Not your attempt' });

    const eqs = await this.prisma.examQuestion.findMany({
      where: { examId: attempt.examId },
      include: { question: { include: { options: { select: { id: true, label: true, text: true } } } } },
      orderBy: { order: 'asc' },
    });

    let questions = eqs.map((eq) => ({
      examQuestionId: eq.id,
      questionId: eq.questionId,
      marks: eq.marks,
      type: eq.question.type,
      stem: eq.question.stem,
      subject: eq.question.subject,
      options: eq.question.options, // no isCorrect — never sent to the client
    }));

    if (attempt.exam.shuffleQuestions) questions = this.shuffle(questions, attempt.id);
    if (attempt.exam.shuffleOptions) questions.forEach((q) => (q.options = this.shuffle(q.options, q.questionId)));

    // Server-authoritative remaining time
    const elapsed = Math.floor((Date.now() - attempt.startedAt.getTime()) / 1000);
    const remainingSec = Math.max(0, attempt.exam.durationSec - elapsed);

    const savedAnswers = Object.fromEntries(
      attempt.responses.map((r) => [r.questionId, { selectedOptionId: r.selectedOptionId, answerText: r.answerText }]),
    );

    return {
      attemptId: attempt.id,
      status: attempt.status,
      remainingSec,
      secureMode: attempt.exam.secureMode,
      questions,
      savedAnswers,
    };
  }

  async saveAnswer(attemptId: string, userId: string, dto: SaveAnswerDto) {
    const attempt = await this.ownedActiveAttempt(attemptId, userId);
    // Server-side time guard: reject saves after the window
    if (this.isExpired(attempt)) {
      await this.submit(attemptId, userId, true);
      throw new ConflictException({ code: 'EXAM_CLOSED', message: 'Time is up; attempt auto-submitted' });
    }
    await this.prisma.answerResponse.upsert({
      where: { attemptId_questionId: { attemptId, questionId: dto.questionId } },
      create: { attemptId, questionId: dto.questionId, selectedOptionId: dto.selectedOptionId, answerText: dto.answerText },
      update: { selectedOptionId: dto.selectedOptionId, answerText: dto.answerText, answeredAt: new Date() },
    });
    return { saved: true };
  }

  async reportViolation(attemptId: string, userId: string) {
    await this.ownedActiveAttempt(attemptId, userId);
    const updated = await this.prisma.examAttempt.update({
      where: { id: attemptId },
      data: { violationsCount: { increment: 1 } },
    });
    return { violations: updated.violationsCount };
  }

  async submit(attemptId: string, userId: string, auto = false) {
    const attempt = await this.prisma.examAttempt.findUnique({ where: { id: attemptId }, include: { exam: true, responses: true } });
    if (!attempt) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Attempt not found' });
    if (attempt.userId !== userId) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Not your attempt' });
    if (attempt.status !== AttemptStatus.IN_PROGRESS) return this.result(attemptId, userId);

    // Load correct options for grading
    const eqs = await this.prisma.examQuestion.findMany({
      where: { examId: attempt.examId },
      include: { question: { include: { options: true } } },
    });
    const marksByQ = new Map(eqs.map((e) => [e.questionId, e.marks]));
    const correctOptByQ = new Map(eqs.map((e) => [e.questionId, e.question.options.find((o) => o.isCorrect)?.id]));
    const typeByQ = new Map(eqs.map((e) => [e.questionId, e.question.type]));
    const responsesByQ = new Map(attempt.responses.map((r) => [r.questionId, r]));

    let score = 0, correct = 0, wrong = 0, skipped = 0;
    const neg = attempt.exam.negativeMarkRatio;
    const adaptiveSignals: { questionId: string; isCorrect: boolean; difficulty: number }[] = [];

    for (const eq of eqs) {
      const qId = eq.questionId;
      const marks = marksByQ.get(qId)!;
      const resp = responsesByQ.get(qId);
      const type = typeByQ.get(qId);

      if (type === QuestionType.WRITTEN) {
        // Manual grading later; leave isCorrect null, 0 marks for now
        continue;
      }
      if (!resp || !resp.selectedOptionId) {
        skipped++;
        continue;
      }
      const isCorrect = resp.selectedOptionId === correctOptByQ.get(qId);
      const awarded = isCorrect ? marks : -(neg * marks);
      score += awarded;
      if (isCorrect) correct++; else wrong++;
      adaptiveSignals.push({ questionId: qId, isCorrect, difficulty: eq.question.difficulty });
      await this.prisma.answerResponse.update({
        where: { attemptId_questionId: { attemptId, questionId: qId } },
        data: { isCorrect, awardedMarks: awarded },
      });
    }

    score = Math.max(0, Number(score.toFixed(2)));

    await this.prisma.$transaction(async (tx) => {
      await tx.examAttempt.update({
        where: { id: attemptId },
        data: { status: auto ? AttemptStatus.AUTO_SUBMITTED : AttemptStatus.SUBMITTED, submittedAt: new Date(), score },
      });
      await tx.examResult.upsert({
        where: { attemptId },
        create: { attemptId, correct, wrong, skipped, score, publishedAt: new Date() },
        update: { correct, wrong, skipped, score, publishedAt: new Date() },
      });
    });

    // Feed the adaptive engine (mastery + spaced revision)
    await this.adaptive.recordExamSignals(userId, adaptiveSignals);

    return this.result(attemptId, userId);
  }

  async result(attemptId: string, userId: string) {
    const attempt = await this.prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: { result: true, exam: { select: { title: true, totalMarks: true } } },
    });
    if (!attempt) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Attempt not found' });
    if (attempt.userId !== userId) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Not your attempt' });
    return { exam: attempt.exam, status: attempt.status, score: attempt.score, result: attempt.result };
  }

  async gradeWritten(attemptId: string, dto: GradeWrittenDto) {
    const resp = await this.prisma.answerResponse.update({
      where: { id: dto.responseId },
      data: { awardedMarks: dto.awardedMarks, isCorrect: dto.awardedMarks > 0 },
    });
    // Recompute attempt score
    const agg = await this.prisma.answerResponse.aggregate({ where: { attemptId }, _sum: { awardedMarks: true } });
    const score = Math.max(0, Number((agg._sum.awardedMarks ?? 0).toFixed(2)));
    await this.prisma.examAttempt.update({ where: { id: attemptId }, data: { status: AttemptStatus.GRADED, score } });
    await this.prisma.examResult.update({ where: { attemptId }, data: { score, publishedAt: new Date() } });
    return resp;
  }

  // ── Question bank ──────────────────────────────────────────────────────
  createQuestion(dto: CreateQuestionDto, createdById: string) {
    return this.prisma.question.create({
      data: {
        subject: dto.subject, topic: dto.topic, difficulty: dto.difficulty, stem: dto.stem,
        type: dto.type, explanation: dto.explanation, correctText: dto.correctText, createdById,
        options: dto.options ? { create: dto.options } : undefined,
      },
      include: { options: true },
    });
  }

  listQuestions(filter: { subject?: string; topic?: string; difficulty?: number }) {
    const where: Prisma.QuestionWhereInput = {
      ...(filter.subject ? { subject: filter.subject } : {}),
      ...(filter.topic ? { topic: filter.topic } : {}),
      ...(filter.difficulty ? { difficulty: Number(filter.difficulty) } : {}),
    };
    return this.prisma.question.findMany({ where, include: { options: true }, take: 100, orderBy: { createdAt: 'desc' } });
  }

  /**
   * Student-facing practice: surfaces the shared question bank WITHOUT the
   * correct-answer flags. Students answer freely and check one question at a
   * time via checkAnswer — so the full answer key is never dumped to the client.
   */
  practiceQuestions(filter: { subject?: string; topic?: string }) {
    const where: Prisma.QuestionWhereInput = {
      type: QuestionType.MCQ,
      ...(filter.subject ? { subject: { contains: filter.subject, mode: 'insensitive' } } : {}),
      ...(filter.topic ? { topic: { contains: filter.topic, mode: 'insensitive' } } : {}),
    };
    return this.prisma.question.findMany({
      where,
      take: 30,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, subject: true, topic: true, difficulty: true, stem: true, type: true,
        options: { select: { id: true, label: true, text: true } }, // no isCorrect
      },
    });
  }

  /** Reveal correctness + explanation for a single practiced question. */
  async checkAnswer(questionId: string, selectedOptionId?: string) {
    const q = await this.prisma.question.findUnique({ where: { id: questionId }, include: { options: true } });
    if (!q) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Question not found' });
    const correct = q.options.find((o) => o.isCorrect);
    return {
      correct: !!selectedOptionId && selectedOptionId === correct?.id,
      correctOptionId: correct?.id ?? null,
      explanation: q.explanation ?? null,
    };
  }

  // ── Helpers ────────────────────────────────────────────────────────────
  private async requireExam(id: string) {
    const e = await this.prisma.exam.findUnique({ where: { id } });
    if (!e) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Exam not found' });
    return e;
  }

  private async ownedActiveAttempt(attemptId: string, userId: string) {
    const a = await this.prisma.examAttempt.findUnique({ where: { id: attemptId }, include: { exam: true } });
    if (!a) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Attempt not found' });
    if (a.userId !== userId) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Not your attempt' });
    if (a.status !== AttemptStatus.IN_PROGRESS) throw new BadRequestException({ code: 'ATTEMPT_CLOSED', message: 'Attempt already submitted' });
    return a;
  }

  private isExpired(attempt: { startedAt: Date; exam: { durationSec: number } }) {
    return (Date.now() - attempt.startedAt.getTime()) / 1000 > attempt.exam.durationSec;
  }

  /** Deterministic shuffle seeded by a string so resume keeps the same order. */
  private shuffle<T>(arr: T[], seed: string): T[] {
    const a = [...arr];
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    const rand = () => ((h = (h * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}
