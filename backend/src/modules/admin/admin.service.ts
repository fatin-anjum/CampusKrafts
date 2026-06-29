import { Injectable } from '@nestjs/common';
import { PaymentStatus, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const since30 = new Date(Date.now() - 30 * 24 * 3600 * 1000);

    const [students, teachers, totalUsers, newUsers30, activeSubs, examAttempts] = await this.prisma.$transaction([
      this.prisma.user.count({ where: { role: Role.STUDENT, deletedAt: null } }),
      this.prisma.user.count({ where: { role: Role.TEACHER, deletedAt: null } }),
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { createdAt: { gte: since30 } } }),
      this.prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      this.prisma.examAttempt.count(),
    ]);

    const revenueAgg = await this.prisma.payment.aggregate({
      where: { status: PaymentStatus.SUCCESS },
      _sum: { amountBdt: true },
      _count: true,
    });

    return {
      users: { total: totalUsers, students, teachers, newLast30Days: newUsers30 },
      revenue: { totalBdt: revenueAgg._sum.amountBdt ?? 0, successfulPayments: revenueAgg._count },
      engagement: { activeSubscriptions: activeSubs, examAttempts },
    };
  }

  async revenueSeries(from?: string, to?: string) {
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const toDate = to ? new Date(to) : new Date();

    // Daily revenue buckets via raw SQL (PostgreSQL date_trunc).
    const rows = await this.prisma.$queryRaw<{ day: Date; revenue: bigint }[]>`
      SELECT date_trunc('day', "createdAt") AS day, SUM("amountBdt") AS revenue
      FROM payments
      WHERE status = 'SUCCESS' AND "createdAt" BETWEEN ${fromDate} AND ${toDate}
      GROUP BY 1 ORDER BY 1`;

    return rows.map((r) => ({ day: r.day, revenueBdt: Number(r.revenue) }));
  }
}
