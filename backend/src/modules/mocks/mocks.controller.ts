import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MocksService } from './mocks.service';
import { CreateMockDto } from './dto/mocks.dto';

@ApiTags('Mock Tests')
@ApiBearerAuth()
@Controller('mocks')
export class MocksController {
  constructor(private readonly mocks: MocksService) {}

  @Get()
  list() {
    return this.mocks.list();
  }

  @Post() @Roles(Role.TEACHER, Role.ADMIN)
  create(@Body() dto: CreateMockDto) {
    return this.mocks.create(dto);
  }

  @Post(':id/record') @Roles(Role.STUDENT)
  record(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.mocks.recordResult(id, userId);
  }

  @Get(':id/leaderboard')
  leaderboard(@Param('id') id: string, @Query('page') page = 1, @Query('limit') limit = 50) {
    return this.mocks.leaderboard(id, Number(page), Number(limit));
  }

  @Get(':id/my-result') @Roles(Role.STUDENT)
  myResult(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.mocks.myResult(id, userId);
  }
}
