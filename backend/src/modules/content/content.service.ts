import { Injectable, NotFoundException } from '@nestjs/common';
import { ContentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CoursesService } from '../courses/courses.service';
import { CreateResourceDto, CreateSheetDto } from './dto/content.dto';

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService, private readonly courses: CoursesService) {}

  // ── Lecture sheets (course-gated) ──────────────────────────────────────
  async listSheets(courseId: string, userId: string, topic?: string, chapter?: string) {
    await this.courses.assertAccess(userId, courseId);
    return this.prisma.lectureSheet.findMany({
      where: { courseId, ...(topic ? { topic } : {}), ...(chapter ? { chapter } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  createSheet(dto: CreateSheetDto, uploaderId: string) {
    return this.prisma.lectureSheet.create({
      data: {
        courseId: dto.courseId, uploaderId, title: dto.title, type: dto.type,
        topic: dto.topic, chapter: dto.chapter, s3Key: dto.s3Key, sizeBytes: dto.sizeBytes ?? 0,
      },
    });
  }

  async downloadSheet(id: string, userId: string) {
    const sheet = await this.prisma.lectureSheet.findUnique({ where: { id } });
    if (!sheet) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Sheet not found' });
    await this.courses.assertAccess(userId, sheet.courseId);
    await this.prisma.lectureSheet.update({ where: { id }, data: { downloads: { increment: 1 } } });
    // Production: return an S3 presigned GET URL for sheet.s3Key (short TTL).
    const url = `https://cdn.campuskrafts.com/${sheet.s3Key}`;
    return { url, expiresInSec: 900 };
  }

  // ── Resource library (searchable, moderated) ───────────────────────────
  listResources(query: { q?: string; categoryId?: string; type?: string }) {
    const where: Prisma.ResourceWhereInput = {
      status: ContentStatus.APPROVED,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.type ? { type: query.type as any } : {}),
      ...(query.q
        ? { OR: [{ title: { contains: query.q, mode: 'insensitive' } }, { tags: { has: query.q } }] }
        : {}),
    };
    return this.prisma.resource.findMany({ where, orderBy: { createdAt: 'desc' }, take: 50 });
  }

  createResource(dto: CreateResourceDto, uploaderId: string) {
    return this.prisma.resource.create({
      data: {
        uploaderId, title: dto.title, description: dto.description, type: dto.type,
        s3Key: dto.s3Key, tags: dto.tags ?? [], categoryId: dto.categoryId, status: ContentStatus.PENDING,
      },
    });
  }

  approveResource(id: string) {
    return this.prisma.resource.update({ where: { id }, data: { status: ContentStatus.APPROVED } });
  }

  rejectResource(id: string) {
    return this.prisma.resource.update({ where: { id }, data: { status: ContentStatus.REJECTED } });
  }

  /** Moderation queue: everything awaiting review, newest first. */
  listPending() {
    return this.prisma.resource.findMany({
      where: { status: ContentStatus.PENDING },
      orderBy: { createdAt: 'desc' },
      include: { uploader: { select: { name: true } }, category: { select: { name: true } } },
    });
  }

  listCategories() {
    return this.prisma.resourceCategory.findMany({ orderBy: { name: 'asc' } });
  }

  createCategory(name: string) {
    return this.prisma.resourceCategory.create({ data: { name } });
  }
}
