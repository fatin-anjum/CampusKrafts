import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePostDto, CreateThreadDto, VoteDto } from './dto/forum.dto';

@Injectable()
export class ForumService {
  constructor(private readonly prisma: PrismaService) {}

  listThreads() {
    return this.prisma.forumThread.findMany({
      where: { isHidden: false },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { author: { select: { name: true, role: true } }, _count: { select: { posts: true } } },
    });
  }

  createThread(dto: CreateThreadDto, authorId: string) {
    return this.prisma.forumThread.create({ data: { authorId, title: dto.title, body: dto.body, courseId: dto.courseId } });
  }

  async getThread(id: string) {
    const thread = await this.prisma.forumThread.findUnique({
      where: { id },
      include: {
        author: { select: { name: true, role: true } },
        posts: {
          where: { isHidden: false },
          orderBy: [{ isAnswer: 'desc' }, { createdAt: 'asc' }],
          include: { author: { select: { name: true, role: true } }, _count: { select: { votes: true } } },
        },
      },
    });
    if (!thread) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Thread not found' });
    await this.prisma.forumThread.update({ where: { id }, data: { viewCount: { increment: 1 } } });
    return thread;
  }

  reply(threadId: string, dto: CreatePostDto, authorId: string) {
    return this.prisma.forumPost.create({
      data: { threadId, authorId, body: dto.body, parentId: dto.parentId },
    });
  }

  async vote(postId: string, dto: VoteDto, userId: string) {
    const value = dto.value > 0 ? 1 : -1;
    await this.prisma.vote.upsert({
      where: { userId_postId: { userId, postId } },
      create: { userId, postId, value },
      update: { value },
    });
    const agg = await this.prisma.vote.aggregate({ where: { postId }, _sum: { value: true } });
    return { score: agg._sum.value ?? 0 };
  }

  /** Teachers mark a reply as the verified answer. */
  markAnswer(postId: string) {
    return this.prisma.forumPost.update({ where: { id: postId }, data: { isAnswer: true } });
  }

  /** Moderators hide abusive content. */
  hide(postId: string) {
    return this.prisma.forumPost.update({ where: { id: postId }, data: { isHidden: true } });
  }
}
