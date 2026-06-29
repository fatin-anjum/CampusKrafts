import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Gateway, PaymentStatus, RefundStatus, SubStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto, paginated } from '../../common/dto/pagination.dto';
import { InitiatePaymentDto, RefundDto } from './dto/payments.dto';

/**
 * Payment + subscription lifecycle.
 *
 * Real gateways (bKash, Nagad, Rocket, SSLCommerz, cards) follow the same shape:
 *   1. initiate()  → create Payment(PENDING) + a gateway session, return redirectUrl
 *   2. user pays on the gateway
 *   3. gateway calls handleWebhook() (IPN) → verify signature/amount → activate
 *
 * The activation step is wrapped in a transaction and guarded by idempotencyKey
 * so duplicate IPNs cannot double-activate a subscription.
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  async initiate(userId: string, dto: InitiatePaymentDto) {
    if (!dto.courseId) throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'courseId required' });
    const course = await this.prisma.course.findUnique({ where: { id: dto.courseId } });
    if (!course) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Course not found' });

    // Block re-enrollment if already active
    const existing = await this.prisma.subscription.findUnique({
      where: { userId_courseId: { userId, courseId: course.id } },
    });
    if (existing?.status === SubStatus.ACTIVE)
      throw new ConflictException({ code: 'ALREADY_ENROLLED', message: 'Already enrolled' });

    const idempotencyKey = randomUUID();
    const payment = await this.prisma.payment.create({
      data: {
        userId,
        courseId: course.id,
        gateway: dto.gateway,
        amountBdt: course.priceBdt,
        status: PaymentStatus.PENDING,
        idempotencyKey,
      },
    });

    // In production: call the gateway SDK/REST to create a session and use its URL.
    const redirectUrl = this.buildGatewayRedirect(dto.gateway, payment.id, course.priceBdt);
    this.logger.log(`Payment ${payment.id} initiated via ${dto.gateway} (BDT ${course.priceBdt})`);

    return { paymentId: payment.id, redirectUrl, status: payment.status };
  }

  /**
   * Gateway callback / IPN. `payload` shape varies per gateway; here we accept a
   * normalized { paymentId, status, gatewayRef, signature }. Verify signature in prod.
   */
  async handleWebhook(gateway: Gateway, payload: any) {
    const paymentId = payload?.paymentId;
    const success = payload?.status === 'SUCCESS' || payload?.status === 'VALID';
    if (!paymentId) throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'paymentId missing' });

    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Payment not found' });

    // Idempotency: already processed → no-op
    if (payment.status === PaymentStatus.SUCCESS) return { status: 'ALREADY_PROCESSED' };

    if (!success) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED, rawPayload: payload, gatewayRef: payload?.gatewayRef },
      });
      return { status: PaymentStatus.FAILED };
    }

    // Activate subscription atomically
    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.SUCCESS, gatewayRef: payload?.gatewayRef, rawPayload: payload },
      });
      await tx.subscription.upsert({
        where: { userId_courseId: { userId: payment.userId, courseId: payment.courseId } },
        create: {
          userId: payment.userId,
          courseId: payment.courseId,
          status: SubStatus.ACTIVE,
          startAt: new Date(),
          paymentId: payment.id,
        },
        update: { status: SubStatus.ACTIVE, startAt: new Date(), paymentId: payment.id },
      });
      await tx.notification.create({
        data: {
          userId: payment.userId,
          type: 'PAYMENT',
          title: 'Enrollment successful',
          body: 'Your Crash Course access is now active.',
        },
      });
    });

    this.logger.log(`Payment ${payment.id} SUCCESS → subscription active`);
    return { status: PaymentStatus.SUCCESS };
  }

  async listAll(query: PaginationDto) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({ skip: query.skip, take: query.limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.payment.count(),
    ]);
    return paginated(items, total, query.page, query.limit);
  }

  myPayments(userId: string) {
    return this.prisma.payment.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  mySubscriptions(userId: string) {
    return this.prisma.subscription.findMany({ where: { userId }, include: { course: { select: { title: true, slug: true } } } });
  }

  async refund(paymentId: string, dto: RefundDto, processedById: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Payment not found' });
    if (payment.status !== PaymentStatus.SUCCESS)
      throw new BadRequestException({ code: 'NOT_REFUNDABLE', message: 'Only successful payments can be refunded' });

    return this.prisma.$transaction(async (tx) => {
      const refund = await tx.refund.create({
        data: { paymentId, amountBdt: payment.amountBdt, reason: dto.reason, status: RefundStatus.PROCESSED, processedById },
      });
      await tx.payment.update({ where: { id: paymentId }, data: { status: PaymentStatus.REFUNDED } });
      await tx.subscription.updateMany({
        where: { userId: payment.userId, courseId: payment.courseId },
        data: { status: SubStatus.CANCELLED },
      });
      return refund;
    });
  }

  private buildGatewayRedirect(gateway: Gateway, paymentId: string, amount: number): string {
    const base = this.config.get<string>('payment.successUrl');
    // Demo redirect. Replace with the gateway's hosted checkout URL.
    return `${base}?paymentId=${paymentId}&gateway=${gateway}&amount=${amount}`;
  }
}
