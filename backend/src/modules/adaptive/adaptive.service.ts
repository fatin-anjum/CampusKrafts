import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Adaptive learning engine.
 *
 *  • Mastery per (subject, topic) is an EWMA of correctness in [0,1].
 *  • Recommendations pick weak topics (low mastery) and set a target difficulty
 *    that rises with mastery (keeps the learner in the "desirable difficulty" zone).
 *  • Spaced revision uses a simplified SM-2: correct → interval grows by ease;
 *    incorrect → reset to 1 day.
 */
@Injectable()
export class AdaptiveService {
  private readonly ALPHA = 0.3; // EWMA weight for the newest signal

  constructor(private readonly prisma: PrismaService) {}

  /** Called by the exam grader after each submission. */
  async recordExamSignals(userId: string, signals: { questionId: string; isCorrect: boolean; difficulty: number }[]) {
    for (const s of signals) {
      const q = await this.prisma.question.findUnique({ where: { id: s.questionId }, select: { subject: true, topic: true } });
      if (!q) continue;
      await this.updateMastery(userId, q.subject, q.topic, s.isCorrect);
      await this.scheduleRevision(userId, q.topic, s.isCorrect);
      await this.prisma.questionAttempt.create({
        data: { userId, questionId: s.questionId, isCorrect: s.isCorrect, difficulty: s.difficulty, source: 'EXAM' },
      });
    }
  }

  async updateMastery(userId: string, subject: string, topic: string, isCorrect: boolean) {
    const prev = await this.prisma.topicMastery.findUnique({ where: { userId_subject_topic: { userId, subject, topic } } });
    const target = isCorrect ? 1 : 0;
    const newMastery = prev ? prev.mastery + this.ALPHA * (target - prev.mastery) : this.ALPHA * target;
    await this.prisma.topicMastery.upsert({
      where: { userId_subject_topic: { userId, subject, topic } },
      create: { userId, subject, topic, mastery: Number(newMastery.toFixed(4)), attempts: 1, lastSeenAt: new Date() },
      update: { mastery: Number(newMastery.toFixed(4)), attempts: { increment: 1 }, lastSeenAt: new Date() },
    });
  }

  async scheduleRevision(userId: string, topic: string, isCorrect: boolean) {
    const item = await this.prisma.revisionItem.findFirst({ where: { userId, topic } });
    if (!isCorrect) {
      const dueAt = new Date(Date.now() + 24 * 3600 * 1000);
      if (item) await this.prisma.revisionItem.update({ where: { id: item.id }, data: { intervalDays: 1, dueAt } });
      else await this.prisma.revisionItem.create({ data: { userId, topic, intervalDays: 1, dueAt } });
      return;
    }
    const ease = item?.easeFactor ?? 2.5;
    const interval = item ? Math.round(item.intervalDays * ease) : 1;
    const dueAt = new Date(Date.now() + interval * 24 * 3600 * 1000);
    if (item) await this.prisma.revisionItem.update({ where: { id: item.id }, data: { intervalDays: interval, dueAt } });
    else await this.prisma.revisionItem.create({ data: { userId, topic, intervalDays: interval, dueAt } });
  }

  /** Recommend a practice set weighted toward the weakest topics. */
  async recommendations(userId: string) {
    const mastery = await this.prisma.topicMastery.findMany({ where: { userId }, orderBy: { mastery: 'asc' }, take: 3 });
    if (mastery.length === 0) {
      // Cold start: recommend easy questions across the bank
      const questions = await this.prisma.question.findMany({ where: { difficulty: { lte: 2 } }, take: 10, select: { id: true, subject: true, topic: true, difficulty: true } });
      return { reason: 'cold-start', targetDifficulty: 2, questions };
    }
    const weak = mastery[0];
    const targetDifficulty = Math.min(5, Math.max(1, Math.round(1 + weak.mastery * 4)));
    const questions = await this.prisma.question.findMany({
      where: { topic: { in: mastery.map((m) => m.topic) }, difficulty: { lte: targetDifficulty + 1 } },
      take: 10,
      select: { id: true, subject: true, topic: true, difficulty: true },
    });
    return { reason: 'weak-topics', weakTopics: mastery.map((m) => ({ topic: m.topic, mastery: m.mastery })), targetDifficulty, questions };
  }

  masteryMap(userId: string) {
    return this.prisma.topicMastery.findMany({ where: { userId }, orderBy: [{ subject: 'asc' }, { topic: 'asc' }] });
  }

  revisionToday(userId: string) {
    return this.prisma.revisionItem.findMany({ where: { userId, dueAt: { lte: new Date() } }, orderBy: { dueAt: 'asc' } });
  }
}
