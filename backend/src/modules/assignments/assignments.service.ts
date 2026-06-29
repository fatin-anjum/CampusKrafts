import { Injectable, NotFoundException } from '@nestjs/common';
import { SubmissionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAssignmentDto, GradeSubmissionDto, SubmitDto } from './dto/assignments.dto';

@Injectable()
export class AssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  list(courseId?: string) {
    return this.prisma.assignment.findMany({
      where: courseId ? { courseId } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  create(dto: CreateAssignmentDto, createdById: string) {
    return this.prisma.assignment.create({
      data: {
        courseId: dto.courseId,
        createdById,
        title: dto.title,
        instructions: dto.instructions,
        attachmentS3Key: dto.attachmentS3Key,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
        maxMarks: dto.maxMarks ?? 100,
        autoGrade: dto.autoGrade ?? false,
      },
    });
  }

  async submit(assignmentId: string, dto: SubmitDto, userId: string) {
    const assignment = await this.prisma.assignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Assignment not found' });

    const submission = await this.prisma.assignmentSubmission.upsert({
      where: { assignmentId_userId: { assignmentId, userId } },
      create: { assignmentId, userId, fileS3Key: dto.fileS3Key, text: dto.text },
      update: { fileS3Key: dto.fileS3Key, text: dto.text, submittedAt: new Date(), status: SubmissionStatus.SUBMITTED },
    });

    // Simple auto-grade hook: keyword-match scoring when enabled.
    if (assignment.autoGrade && dto.text) {
      const marks = Math.min(assignment.maxMarks, dto.text.trim().split(/\s+/).length); // demo heuristic
      return this.prisma.assignmentSubmission.update({
        where: { id: submission.id },
        data: { marks, status: SubmissionStatus.GRADED, feedback: 'Auto-graded.' },
      });
    }
    return submission;
  }

  mySubmission(assignmentId: string, userId: string) {
    return this.prisma.assignmentSubmission.findUnique({
      where: { assignmentId_userId: { assignmentId, userId } },
    });
  }

  listSubmissions(assignmentId: string) {
    return this.prisma.assignmentSubmission.findMany({
      where: { assignmentId },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { submittedAt: 'desc' },
    });
  }

  grade(submissionId: string, dto: GradeSubmissionDto, gradedById: string) {
    return this.prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: { marks: dto.marks, feedback: dto.feedback, gradedById, status: SubmissionStatus.GRADED },
    });
  }
}
