import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CourseStatus, Prisma, Role, SubStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCourseDto, CreateLessonDto, CreateModuleDto, SaveProgressDto, UpdateCourseDto } from './dto/courses.dto';

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Public catalog ─────────────────────────────────────────────────────
  listPublished() {
    return this.prisma.course.findMany({
      where: { status: CourseStatus.PUBLISHED },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** A teacher's own courses (any status) for the authoring dashboard. */
  listMine(createdById: string) {
    return this.prisma.course.findMany({
      where: { createdById },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { modules: true, subscriptions: true } } },
    });
  }

  /** Admin/moderator catalog — every course regardless of status, for approval & oversight. */
  listAll() {
    return this.prisma.course.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { name: true } },
        _count: { select: { modules: true, subscriptions: true } },
      },
    });
  }

  async getBySlug(slug: string, userId?: string) {
    const course = await this.prisma.course.findUnique({
      where: { slug },
      include: { modules: { orderBy: { order: 'asc' }, include: { lessons: { orderBy: { order: 'asc' } } } } },
    });
    if (!course) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Course not found' });

    const enrolled = userId ? await this.hasAccess(userId, course.id) : false;
    // Hide video URLs for non-enrolled users (except free previews)
    if (!enrolled) {
      for (const m of course.modules)
        for (const l of m.lessons) if (!l.isFreePreview) l.videoUrl = null;
    }
    return { ...course, enrolled };
  }

  // ── Authoring ──────────────────────────────────────────────────────────
  create(dto: CreateCourseDto, createdById: string) {
    return this.prisma.course.create({
      data: { ...dto, slug: this.slugify(dto.title), createdById, status: CourseStatus.DRAFT },
    });
  }

  async update(id: string, dto: UpdateCourseDto, user: { id: string; role: Role }) {
    const course = await this.requireCourse(id);
    if (user.role === Role.TEACHER && course.createdById !== user.id)
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Not your course' });
    return this.prisma.course.update({ where: { id }, data: dto });
  }

  async submitForReview(id: string, user: { id: string; role: Role }) {
    const course = await this.requireCourse(id);
    if (user.role === Role.TEACHER && course.createdById !== user.id)
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Not your course' });
    return this.prisma.course.update({ where: { id }, data: { status: CourseStatus.PENDING_REVIEW } });
  }

  approve(id: string) {
    return this.prisma.course.update({ where: { id }, data: { status: CourseStatus.PUBLISHED } });
  }

  async addModule(courseId: string, dto: CreateModuleDto) {
    await this.requireCourse(courseId);
    return this.prisma.courseModule.create({ data: { courseId, ...dto } });
  }

  addLesson(moduleId: string, dto: CreateLessonDto) {
    return this.prisma.lesson.create({ data: { moduleId, ...dto } });
  }

  // ── Progress ───────────────────────────────────────────────────────────
  async saveProgress(lessonId: string, userId: string, dto: SaveProgressDto) {
    return this.prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: { userId, lessonId, lastPositionSec: dto.lastPositionSec ?? 0, completed: dto.completed ?? false },
      update: { lastPositionSec: dto.lastPositionSec, completed: dto.completed },
    });
  }

  async courseProgress(userId: string, courseId: string) {
    const totalLessons = await this.prisma.lesson.count({ where: { module: { courseId } } });
    const completed = await this.prisma.lessonProgress.count({
      where: { userId, completed: true, lesson: { module: { courseId } } },
    });
    return { totalLessons, completed, percent: totalLessons ? Math.round((completed / totalLessons) * 100) : 0 };
  }

  // ── Streaming (signed URL) ─────────────────────────────────────────────
  async streamUrl(lessonId: string, userId: string) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId }, include: { module: true } });
    if (!lesson) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Lesson not found' });

    if (!lesson.isFreePreview) {
      const ok = await this.hasAccess(userId, lesson.module.courseId);
      if (!ok) throw new ForbiddenException({ code: 'NOT_ENROLLED', message: 'Active subscription required' });
    }
    // In production: generate an S3/CloudFront signed URL from lesson.videoUrl (S3 key).
    // Here we return the stored URL plus a short TTL marker so the wiring is demonstrable.
    return { url: lesson.videoUrl ?? null, expiresInSec: 900 };
  }

  // ── Student dashboard (FR-6) ───────────────────────────────────────────
  async studentDashboard(userId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { userId, status: SubStatus.ACTIVE },
      include: { course: { select: { id: true, title: true, slug: true } } },
    });

    const courseId = subscription?.course.id;
    const [upcomingClasses, upcomingMocks, recentNotifications, progress] = await Promise.all([
      this.prisma.liveClass.findMany({
        where: { ...(courseId ? { courseId } : {}), startAt: { gte: new Date() } },
        orderBy: { startAt: 'asc' }, take: 5,
        select: { id: true, title: true, startAt: true, provider: true },
      }),
      this.prisma.mockTest.findMany({
        where: { scheduledAt: { gte: new Date() } },
        orderBy: { scheduledAt: 'asc' }, take: 5,
        include: { exam: { select: { title: true } } },
      }),
      this.prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 10 }),
      courseId ? this.courseProgress(userId, courseId) : Promise.resolve({ totalLessons: 0, completed: 0, percent: 0 }),
    ]);

    return {
      enrolledCourse: subscription?.course ?? null,
      subscriptionStatus: subscription?.status ?? 'NONE',
      progress,
      upcomingClasses,
      upcomingMocks,
      recentNotifications,
    };
  }

  // ── Shared access check (reused by exams, content, etc.) ───────────────
  async hasAccess(userId: string, courseId: string): Promise<boolean> {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (!sub) return false;
    if (sub.status !== SubStatus.ACTIVE) return false;
    if (sub.endAt && sub.endAt < new Date()) return false;
    return true;
  }

  /** Throws NOT_ENROLLED unless the user has active access. */
  async assertAccess(userId: string, courseId: string) {
    if (!(await this.hasAccess(userId, courseId)))
      throw new ForbiddenException({ code: 'NOT_ENROLLED', message: 'Active subscription required' });
  }

  private async requireCourse(id: string) {
    const c = await this.prisma.course.findUnique({ where: { id } });
    if (!c) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Course not found' });
    return c;
  }

  private slugify(title: string) {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60);
  }
}
