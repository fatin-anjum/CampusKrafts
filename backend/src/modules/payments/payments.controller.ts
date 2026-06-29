import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Gateway, Role } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto, RefundDto } from './dto/payments.dto';

@ApiTags('Payments & Subscriptions')
@Controller()
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @ApiBearerAuth() @Post('payments/initiate') @Roles(Role.STUDENT)
  initiate(@Body() dto: InitiatePaymentDto, @CurrentUser('id') userId: string) {
    return this.payments.initiate(userId, dto);
  }

  // Public but signature-verified in production (IPN from the gateway).
  @Public() @Post('payments/webhook/:gateway')
  webhook(@Param('gateway') gateway: Gateway, @Body() payload: any) {
    return this.payments.handleWebhook(gateway, payload);
  }

  @ApiBearerAuth() @Get('payments') @Roles(Role.ADMIN)
  all(@Query() query: PaginationDto) {
    return this.payments.listAll(query);
  }

  @ApiBearerAuth() @Get('payments/my') @Roles(Role.STUDENT)
  my(@CurrentUser('id') userId: string) {
    return this.payments.myPayments(userId);
  }

  @ApiBearerAuth() @Post('payments/:id/refund') @Roles(Role.ADMIN)
  refund(@Param('id') id: string, @Body() dto: RefundDto, @CurrentUser('id') adminId: string) {
    return this.payments.refund(id, dto, adminId);
  }

  @ApiBearerAuth() @Get('subscriptions/my') @Roles(Role.STUDENT)
  subs(@CurrentUser('id') userId: string) {
    return this.payments.mySubscriptions(userId);
  }
}
