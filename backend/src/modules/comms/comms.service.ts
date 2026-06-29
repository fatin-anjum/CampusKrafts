import { Injectable, Logger } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAnnouncementDto } from './dto/comms.dto';

@Injectable()
export class CommsService {
  private readonly logger = new Logger(CommsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Announcements ──────────────────────────────────────────────────────
  async createAnnouncement(dto: CreateAnnouncementDto, authorId: string) {
    const announcement = await this.prisma.announcement.create({
      data: {
        authorId,
        title: dto.title,
        body: dto.body,
        audience: (dto.audience ?? { all: true }) as Prisma.InputJsonValue,
      },
    });
    // Fan out to in-app notifications for the targeted audience.
    await this.fanOut(dto, announcement.title, announcement.body);
    return announcement;
  }

  listAnnouncements() {
    return this.prisma.announcement.findMany({ orderBy: { publishedAt: 'desc' }, take: 50 });
  }

  private async fanOut(dto: CreateAnnouncementDto, title: string, body: string) {
    const audience = dto.audience ?? { all: true };
    const where = audience.all ? {} : audience.roles?.length ? { role: { in: audience.roles as Role[] } } : {};
    const targets = await this.prisma.user.findMany({ where: { ...where, deletedAt: null }, select: { id: true } });
    if (targets.length === 0) return;
    await this.prisma.notification.createMany({
      data: targets.map((u) => ({ userId: u.id, type: 'ANNOUNCEMENT', title, body })),
    });
    // Production: enqueue FCM push + email/SMS for critical notices via BullMQ here.
    this.logger.log(`Announcement fanned out to ${targets.length} users`);
  }

  // ── Notifications ──────────────────────────────────────────────────────
  myNotifications(userId: string) {
    return this.prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 });
  }

  markRead(userId: string, id: string) {
    return this.prisma.notification.updateMany({ where: { id, userId }, data: { readAt: new Date() } });
  }

  registerDeviceToken(userId: string, token: string, platform: string) {
    return this.prisma.deviceToken.upsert({
      where: { token },
      create: { userId, token, platform },
      update: { userId, platform },
    });
  }
}
