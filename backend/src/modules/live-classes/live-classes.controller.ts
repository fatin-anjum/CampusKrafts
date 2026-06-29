import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { LiveClassesService } from './live-classes.service';
import { AttendanceDto, EndClassDto, ScheduleLiveClassDto } from './dto/live-classes.dto';

@ApiTags('Live Classes')
@ApiBearerAuth()
@Controller('live-classes')
export class LiveClassesController {
  constructor(private readonly live: LiveClassesService) {}

  @Get()
  list() {
    return this.live.list();
  }

  @Post() @Roles(Role.TEACHER, Role.ADMIN)
  schedule(@Body() dto: ScheduleLiveClassDto, @CurrentUser('id') userId: string) {
    return this.live.schedule(dto, userId);
  }

  @Post(':id/join-token') @Roles(Role.STUDENT, Role.TEACHER, Role.ADMIN)
  join(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.live.joinToken(id, user as any);
  }

  @Post(':id/attendance')
  attendance(@Param('id') id: string, @Body() dto: AttendanceDto, @CurrentUser('id') userId: string) {
    return this.live.logAttendance(id, userId, !!dto.leaving);
  }

  @Post(':id/end') @Roles(Role.TEACHER, Role.ADMIN)
  end(@Param('id') id: string, @Body() dto: EndClassDto, @CurrentUser('id') userId: string) {
    return this.live.end(id, userId, dto.recordingUrl);
  }

  @Get(':id/recording') @Roles(Role.STUDENT, Role.TEACHER, Role.ADMIN)
  recording(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.live.recording(id, user as any);
  }
}
