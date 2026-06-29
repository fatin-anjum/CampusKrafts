import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ForumService } from './forum.service';
import { CreatePostDto, CreateThreadDto, VoteDto } from './dto/forum.dto';

@ApiTags('Discussion Forum')
@ApiBearerAuth()
@Controller('forum')
export class ForumController {
  constructor(private readonly forum: ForumService) {}

  @Get('threads')
  threads() {
    return this.forum.listThreads();
  }

  @Post('threads')
  createThread(@Body() dto: CreateThreadDto, @CurrentUser('id') userId: string) {
    return this.forum.createThread(dto, userId);
  }

  @Get('threads/:id')
  thread(@Param('id') id: string) {
    return this.forum.getThread(id);
  }

  @Post('threads/:id/posts')
  reply(@Param('id') id: string, @Body() dto: CreatePostDto, @CurrentUser('id') userId: string) {
    return this.forum.reply(id, dto, userId);
  }

  @Post('posts/:id/vote')
  vote(@Param('id') id: string, @Body() dto: VoteDto, @CurrentUser('id') userId: string) {
    return this.forum.vote(id, dto, userId);
  }

  @Post('posts/:id/mark-answer') @Roles(Role.TEACHER, Role.ADMIN)
  markAnswer(@Param('id') id: string) {
    return this.forum.markAnswer(id);
  }

  @Post('posts/:id/hide') @Roles(Role.MODERATOR, Role.ADMIN)
  hide(@Param('id') id: string) {
    return this.forum.hide(id);
  }
}
