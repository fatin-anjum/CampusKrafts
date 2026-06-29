import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role, TicketStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AssignTicketDto, CreateTicketDto, TicketMessageDto, UpdateStatusDto } from './dto/support.dto';

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateTicketDto, requesterId: string) {
    return this.prisma.supportTicket.create({
      data: { requesterId, category: dto.category, subject: dto.subject, priority: dto.priority ?? 'NORMAL' },
    });
  }

  list(user: { id: string; role: Role }) {
    // Staff see all; requesters see their own.
    const where = user.role === Role.STUDENT || user.role === Role.TEACHER ? { requesterId: user.id } : {};
    return this.prisma.supportTicket.findMany({ where, orderBy: { createdAt: 'desc' }, include: { assignee: { select: { name: true } } } });
  }

  async detail(id: string, user: { id: string; role: Role }) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: 'asc' }, include: { sender: { select: { name: true, role: true } } } } },
    });
    if (!ticket) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Ticket not found' });
    const isStaff = [Role.ADMIN, Role.MODERATOR].includes(user.role as any);
    if (!isStaff && ticket.requesterId !== user.id) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Not your ticket' });
    return ticket;
  }

  assign(id: string, dto: AssignTicketDto) {
    return this.prisma.supportTicket.update({
      where: { id },
      data: { assigneeId: dto.assigneeId, status: TicketStatus.ASSIGNED },
    });
  }

  updateStatus(id: string, dto: UpdateStatusDto) {
    return this.prisma.supportTicket.update({ where: { id }, data: { status: dto.status } });
  }

  addMessage(id: string, dto: TicketMessageDto, senderId: string) {
    return this.prisma.ticketMessage.create({
      data: { ticketId: id, senderId, body: dto.body, attachmentS3Key: dto.attachmentS3Key },
    });
  }
}
