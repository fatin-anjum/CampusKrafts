import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { LiveProvider, LiveStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CoursesService } from '../courses/courses.service';
import { ScheduleLiveClassDto } from './dto/live-classes.dto';

@Injectable()
export class LiveClassesService {
  constructor(private readonly prisma: PrismaService, private readonly courses: CoursesService) {}

  list() {
    return this.prisma.liveClass.findMany({
      orderBy: { startAt: 'asc' },
      include: { teacher: { select: { name: true } } },
    });
  }

  schedule(dto: ScheduleLiveClassDto, teacherId: string) {
    const roomName = dto.provider === LiveProvider.BUILT_IN ? `room_${randomUUID().slice(0, 8)}` : null;
    return this.prisma.liveClass.create({
      data: {
        courseId: dto.courseId,
        teacherId,
        title: dto.title,
        provider: dto.provider,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        joinUrl: dto.joinUrl,
        roomName,
      },
    });
  }

  /**
   * Returns a join token. For BUILT_IN we mint a (mock) LiveKit token; for
   * Zoom/Meet we return the stored joinUrl. Gated to a time window + enrollment.
   */
  async joinToken(id: string, user: { id: string; role: string }) {
    const lc = await this.prisma.liveClass.findUnique({ where: { id } });
    if (!lc) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Live class not found' });

    // Students must be enrolled; teachers/admins bypass.
    if (user.role === 'STUDENT') await this.courses.assertAccess(user.id, lc.courseId);

    const now = Date.now();
    const opensFrom = lc.startAt.getTime() - 15 * 60 * 1000; // 15 min early
    if (now < opensFrom) throw new BadRequestException({ code: 'TOO_EARLY', message: 'Join opens 15 minutes before start' });
    if (now > lc.endAt.getTime()) throw new BadRequestException({ code: 'ENDED', message: 'Class has ended' });

    if (lc.provider === LiveProvider.BUILT_IN) {
      // Production: sign a LiveKit access token with the room + identity + grants.
      const token = `livekit_${lc.roomName}_${user.id}_${randomUUID().slice(0, 12)}`;
      return { provider: lc.provider, roomName: lc.roomName, token, wsUrl: process.env.LIVEKIT_URL ?? 'wss://livekit.example' };
    }
    return { provider: lc.provider, joinUrl: lc.joinUrl };
  }

  async logAttendance(id: string, userId: string, leaving = false) {
    const existing = await this.prisma.attendance.findUnique({ where: { liveClassId_userId: { liveClassId: id, userId } } });
    if (!existing) {
      return this.prisma.attendance.create({ data: { liveClassId: id, userId } });
    }
    if (leaving && !existing.leftAt) {
      const durationSec = Math.floor((Date.now() - existing.joinedAt.getTime()) / 1000);
      return this.prisma.attendance.update({ where: { id: existing.id }, data: { leftAt: new Date(), durationSec } });
    }
    return existing;
  }

  async end(id: string, teacherId: string, recordingUrl?: string) {
    const lc = await this.prisma.liveClass.findUnique({ where: { id } });
    if (!lc) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Live class not found' });
    if (lc.teacherId !== teacherId) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Not your class' });
    // Production: trigger recording egress → S3, then attach as a RECORDED lesson.
    return this.prisma.liveClass.update({
      where: { id },
      data: { status: LiveStatus.ENDED, recordingUrl: recordingUrl ?? lc.recordingUrl },
    });
  }

  async recording(id: string, user: { id: string; role: string }) {
    const lc = await this.prisma.liveClass.findUnique({ where: { id } });
    if (!lc) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Live class not found' });
    if (user.role === 'STUDENT') await this.courses.assertAccess(user.id, lc.courseId);
    return { recordingUrl: lc.recordingUrl, status: lc.status };
  }
}
