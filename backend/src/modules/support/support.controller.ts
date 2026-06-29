import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { SupportService } from './support.service';
import { AssignTicketDto, CreateTicketDto, TicketMessageDto, UpdateStatusDto } from './dto/support.dto';

@ApiTags('Support Tickets')
@ApiBearerAuth()
@Controller('support/tickets')
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Post()
  create(@Body() dto: CreateTicketDto, @CurrentUser('id') userId: string) {
    return this.support.create(dto, userId);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.support.list(user as any);
  }

  @Get(':id')
  detail(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.support.detail(id, user as any);
  }

  @Patch(':id/assign') @Roles(Role.MODERATOR, Role.ADMIN)
  assign(@Param('id') id: string, @Body() dto: AssignTicketDto) {
    return this.support.assign(id, dto);
  }

  @Patch(':id/status') @Roles(Role.MODERATOR, Role.ADMIN)
  status(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.support.updateStatus(id, dto);
  }

  @Post(':id/messages')
  message(@Param('id') id: string, @Body() dto: TicketMessageDto, @CurrentUser('id') userId: string) {
    return this.support.addMessage(id, dto, userId);
  }
}
