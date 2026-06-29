import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ContentService } from './content.service';
import { CreateResourceDto, CreateSheetDto } from './dto/content.dto';

@ApiTags('Lecture Sheets & Resources')
@ApiBearerAuth()
@Controller()
export class ContentController {
  constructor(private readonly content: ContentService) {}

  // Lecture sheets
  @Get('sheets') @Roles(Role.STUDENT, Role.TEACHER, Role.ADMIN)
  sheets(@Query('courseId') courseId: string, @CurrentUser('id') userId: string, @Query('topic') topic?: string, @Query('chapter') chapter?: string) {
    return this.content.listSheets(courseId, userId, topic, chapter);
  }

  @Post('sheets') @Roles(Role.TEACHER, Role.ADMIN)
  createSheet(@Body() dto: CreateSheetDto, @CurrentUser('id') userId: string) {
    return this.content.createSheet(dto, userId);
  }

  @Get('sheets/:id/download') @Roles(Role.STUDENT, Role.TEACHER, Role.ADMIN)
  download(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.content.downloadSheet(id, userId);
  }

  // Resource library
  @Get('resources')
  resources(@Query() query: { q?: string; categoryId?: string; type?: string }) {
    return this.content.listResources(query);
  }

  // Moderation queue — declared before any `resources/:id` style routes.
  @Get('resources/pending') @Roles(Role.MODERATOR, Role.ADMIN)
  pending() {
    return this.content.listPending();
  }

  @Post('resources') @Roles(Role.TEACHER, Role.MODERATOR, Role.ADMIN)
  createResource(@Body() dto: CreateResourceDto, @CurrentUser('id') userId: string) {
    return this.content.createResource(dto, userId);
  }

  @Post('resources/:id/approve') @Roles(Role.MODERATOR, Role.ADMIN)
  approve(@Param('id') id: string) {
    return this.content.approveResource(id);
  }

  @Post('resources/:id/reject') @Roles(Role.MODERATOR, Role.ADMIN)
  reject(@Param('id') id: string) {
    return this.content.rejectResource(id);
  }

  @Get('resource-categories')
  categories() {
    return this.content.listCategories();
  }

  @Post('resource-categories') @Roles(Role.ADMIN)
  createCategory(@Body() body: { name: string }) {
    return this.content.createCategory(body.name);
  }
}
