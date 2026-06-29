import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AttemptStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { CreateMockDto } from './dto/mocks.dto';

@Injectable()
export class MocksService {
  constructor(private readonly prisma: PrismaService, private readonly redis: RedisService) {}

  private lbKey(mockId: string) {
    return `mock:leaderboard:${mockId}`;
  }

  list() {
    return this.prisma.mockTest.findMany({
      orderBy: { scheduledAt: 'desc' },
      include: { exam: { select: { title: true, totalMarks: true, durationSec: true } } },
    });
  }

  create(dto: CreateMockDto) {
    return this.prisma.mockTest.create({
      data: {
        examId: dto.examId,
        scope: dto.scope,
        university: dto.university,
        scheduledAt: new Date(dto.scheduledAt),
        closeAt: new Date(dto.closeAt),
      },
    });
  }

  /**
   * Finalize a student's mock result from their underlying exam attempt, push the
   * score to a Redis sorted set, and compute live rank + percentile.
   */
  async recordResult(mockId: string, userId: string) {
    const mock = await this.prisma.mockTest.findUnique({ where: { id: mockId } });
    if (!mock) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Mock not found' });

    const attempt = await this.prisma.examAttempt.findUnique({
      where: { examId_userId: { examId: mock.examId, userId } },
    });
    if (!attempt || attempt.status === AttemptStatus.IN_PROGRESS)
      throw new BadRequestException({ code: 'NO_ATTEMPT', message: 'Submit the mock exam first' });

    await this.prisma.mockResult.upsert({
      where: { mockTestId_userId: { mockTestId: mockId, userId } },
      create: { mockTestId: mockId, userId, score: attempt.score },
      update: { score: attempt.score },
    });

    // Prefer Redis sorted set for fast live ranking; fall back to PostgreSQL
    // when Redis is unavailable so mocks still work without it.
    let rank: number | null;
    let total: number;
    if (this.redis.isReady()) {
      await this.redis.zaddScore(this.lbKey(mockId), attempt.score, userId);
      rank = await this.redis.rank(this.lbKey(mockId), userId);
      total = await this.redis.zcard(this.lbKey(mockId));
    } else {
      total = await this.prisma.mockResult.count({ where: { mockTestId: mockId } });
      const ahead = await this.prisma.mockResult.count({ where: { mockTestId: mockId, score: { gt: attempt.score } } });
      rank = ahead + 1;
    }
    const percentile = total > 1 ? Number((((total - (rank ?? total)) / (total - 1)) * 100).toFixed(2)) : 100;

    await this.prisma.mockResult.update({
      where: { mockTestId_userId: { mockTestId: mockId, userId } },
      data: { rank, percentile },
    });
    return { score: attempt.score, rank, percentile, total };
  }

  async leaderboard(mockId: string, page = 1, limit = 50) {
    const start = (page - 1) * limit;
    const rows = await this.redis.leaderboard(this.lbKey(mockId), start, start + limit - 1);
    if (rows.length === 0) {
      // Fallback to DB if Redis was flushed
      const dbRows = await this.prisma.mockResult.findMany({
        where: { mockTestId: mockId },
        orderBy: { score: 'desc' },
        skip: start,
        take: limit,
        include: { user: { select: { name: true } } },
      });
      return dbRows.map((r, i) => ({ rank: start + i + 1, name: r.user.name, score: r.score }));
    }
    const users = await this.prisma.user.findMany({
      where: { id: { in: rows.map((r) => r.member) } },
      select: { id: true, name: true },
    });
    const nameById = new Map(users.map((u) => [u.id, u.name]));
    return rows.map((r, i) => ({ rank: start + i + 1, userId: r.member, name: nameById.get(r.member) ?? 'Unknown', score: r.score }));
  }

  async myResult(mockId: string, userId: string) {
    const result = await this.prisma.mockResult.findUnique({ where: { mockTestId_userId: { mockTestId: mockId, userId } } });
    if (!result) throw new NotFoundException({ code: 'NOT_FOUND', message: 'No result yet' });
    return result;
  }
}
