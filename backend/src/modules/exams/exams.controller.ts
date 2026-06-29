import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ExamsService } from './exams.service';
import {
  AttachQuestionsDto, CreateExamDto, CreateQuestionDto, GradeWrittenDto, SaveAnswerDto,
} from './dto/exams.dto';

@ApiTags('Exams')
@ApiBearerAuth()
@Controller()
export class ExamsController {
  constructor(private readonly exams: ExamsService) {}

  @Get('exams')
  list(@CurrentUser('id') userId: string) {
    return this.exams.list(userId);
  }

  @Post('exams') @Roles(Role.TEACHER, Role.ADMIN)
  create(@Body() dto: CreateExamDto, @CurrentUser('id') userId: string) {
    return this.exams.createExam(dto, userId);
  }

  @Post('exams/:id/questions') @Roles(Role.TEACHER, Role.ADMIN)
  attach(@Param('id') id: string, @Body() dto: AttachQuestionsDto) {
    return this.exams.attachQuestions(id, dto);
  }

  @Get('exams/:id')
  meta(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.exams.metadata(id, userId);
  }

  @Post('exams/:id/attempts') @Roles(Role.STUDENT)
  start(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.exams.startAttempt(id, userId);
  }

  @Get('attempts/:id')
  state(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.exams.attemptState(id, userId);
  }

  @Post('attempts/:id/answers') @Roles(Role.STUDENT)
  save(@Param('id') id: string, @Body() dto: SaveAnswerDto, @CurrentUser('id') userId: string) {
    return this.exams.saveAnswer(id, userId, dto);
  }

  @Post('attempts/:id/violations') @Roles(Role.STUDENT)
  violation(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.exams.reportViolation(id, userId);
  }

  @Post('attempts/:id/submit') @Roles(Role.STUDENT)
  submit(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.exams.submit(id, userId, false);
  }

  @Get('attempts/:id/result')
  result(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.exams.result(id, userId);
  }

  @Post('attempts/:id/grade') @Roles(Role.TEACHER, Role.ADMIN)
  grade(@Param('id') id: string, @Body() dto: GradeWrittenDto) {
    return this.exams.gradeWritten(id, dto);
  }

  // Student practice — declared before the teacher-only bank list.
  @Get('questions/practice')
  practice(@Query() filter: { subject?: string; topic?: string }) {
    return this.exams.practiceQuestions(filter);
  }

  @Post('questions/check')
  check(@Body() dto: { questionId: string; selectedOptionId?: string }) {
    return this.exams.checkAnswer(dto.questionId, dto.selectedOptionId);
  }

  // Question bank
  @Get('questions') @Roles(Role.TEACHER, Role.ADMIN)
  questions(@Query() filter: { subject?: string; topic?: string; difficulty?: number }) {
    return this.exams.listQuestions(filter);
  }

  @Post('questions') @Roles(Role.TEACHER, Role.ADMIN)
  createQuestion(@Body() dto: CreateQuestionDto, @CurrentUser('id') userId: string) {
    return this.exams.createQuestion(dto, userId);
  }
}
