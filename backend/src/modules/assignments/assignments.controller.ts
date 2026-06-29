import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto, GradeSubmissionDto, SubmitDto } from './dto/assignments.dto';

@ApiTags('Assignments')
@ApiBearerAuth()
@Controller()
export class AssignmentsController {
  constructor(private readonly assignments: AssignmentsService) {}

  @Get('assignments')
  list(@Query('courseId') courseId?: string) {
    return this.assignments.list(courseId);
  }

  @Post('assignments') @Roles(Role.TEACHER, Role.ADMIN)
  create(@Body() dto: CreateAssignmentDto, @CurrentUser('id') userId: string) {
    return this.assignments.create(dto, userId);
  }

  @Post('assignments/:id/submissions') @Roles(Role.STUDENT)
  submit(@Param('id') id: string, @Body() dto: SubmitDto, @CurrentUser('id') userId: string) {
    return this.assignments.submit(id, dto, userId);
  }

  @Get('assignments/:id/my-submission') @Roles(Role.STUDENT)
  mySubmission(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.assignments.mySubmission(id, userId);
  }

  @Get('assignments/:id/submissions') @Roles(Role.TEACHER, Role.ADMIN)
  submissions(@Param('id') id: string) {
    return this.assignments.listSubmissions(id);
  }

  @Patch('submissions/:id/grade') @Roles(Role.TEACHER, Role.ADMIN)
  grade(@Param('id') id: string, @Body() dto: GradeSubmissionDto, @CurrentUser('id') userId: string) {
    return this.assignments.grade(id, dto, userId);
  }
}
