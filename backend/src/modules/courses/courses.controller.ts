import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { CoursesService } from './courses.service';
import { PaymentsService } from '../payments/payments.service';
import { CreateCourseDto, CreateLessonDto, CreateModuleDto, SaveProgressDto, UpdateCourseDto } from './dto/courses.dto';
import { InitiatePaymentDto } from '../payments/dto/payments.dto';

@ApiTags('Courses & Enrollment')
@Controller()
export class CoursesController {
  constructor(
    private readonly courses: CoursesService,
    private readonly payments: PaymentsService,
  ) {}

  @Public() @Get('courses')
  list() {
    return this.courses.listPublished();
  }

  // Declared before `courses/:slug` so the literal path wins the match.
  @ApiBearerAuth() @Get('courses/all') @Roles(Role.ADMIN, Role.MODERATOR)
  listAll() {
    return this.courses.listAll();
  }

  @ApiBearerAuth() @Get('courses/mine') @Roles(Role.TEACHER, Role.ADMIN)
  listMine(@CurrentUser('id') userId: string) {
    return this.courses.listMine(userId);
  }

  @Public() @Get('courses/:slug')
  detail(@Param('slug') slug: string, @CurrentUser('id') userId?: string) {
    return this.courses.getBySlug(slug, userId);
  }

  @ApiBearerAuth() @Post('courses') @Roles(Role.TEACHER, Role.ADMIN)
  create(@Body() dto: CreateCourseDto, @CurrentUser('id') userId: string) {
    return this.courses.create(dto, userId);
  }

  @ApiBearerAuth() @Patch('courses/:id') @Roles(Role.TEACHER, Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateCourseDto, @CurrentUser() user: AuthUser) {
    return this.courses.update(id, dto, user as any);
  }

  @ApiBearerAuth() @Post('courses/:id/submit-review') @Roles(Role.TEACHER)
  submit(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.courses.submitForReview(id, user as any);
  }

  @ApiBearerAuth() @Post('courses/:id/approve') @Roles(Role.ADMIN)
  approve(@Param('id') id: string) {
    return this.courses.approve(id);
  }

  // Enrollment begins the payment flow (single Crash Course).
  @ApiBearerAuth() @Post('courses/:id/enroll') @Roles(Role.STUDENT)
  enroll(@Param('id') courseId: string, @Body() dto: InitiatePaymentDto, @CurrentUser('id') userId: string) {
    return this.payments.initiate(userId, { ...dto, courseId });
  }

  @ApiBearerAuth() @Get('courses/:id/progress') @Roles(Role.STUDENT)
  progress(@Param('id') courseId: string, @CurrentUser('id') userId: string) {
    return this.courses.courseProgress(userId, courseId);
  }

  @ApiBearerAuth() @Get('dashboard/student') @Roles(Role.STUDENT)
  dashboard(@CurrentUser('id') userId: string) {
    return this.courses.studentDashboard(userId);
  }

  // Modules & lessons
  @ApiBearerAuth() @Post('courses/:id/modules') @Roles(Role.TEACHER, Role.ADMIN)
  addModule(@Param('id') courseId: string, @Body() dto: CreateModuleDto) {
    return this.courses.addModule(courseId, dto);
  }

  @ApiBearerAuth() @Post('modules/:id/lessons') @Roles(Role.TEACHER, Role.ADMIN)
  addLesson(@Param('id') moduleId: string, @Body() dto: CreateLessonDto) {
    return this.courses.addLesson(moduleId, dto);
  }

  @ApiBearerAuth() @Patch('lessons/:id/progress') @Roles(Role.STUDENT)
  saveProgress(@Param('id') lessonId: string, @Body() dto: SaveProgressDto, @CurrentUser('id') userId: string) {
    return this.courses.saveProgress(lessonId, userId, dto);
  }

  @ApiBearerAuth() @Get('lessons/:id/stream-url') @Roles(Role.STUDENT, Role.TEACHER, Role.ADMIN)
  stream(@Param('id') lessonId: string, @CurrentUser('id') userId: string) {
    return this.courses.streamUrl(lessonId, userId);
  }
}
