import { Controller, Get, Post, Put, Param, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreatePaymentDto, UpdatePaymentStatusDto, PaymentWebhookDto } from './dto/payments.dto';
import { PaymentStatus, PaymentType } from '../../../generated/prisma';
import { CurrentUser } from '../../decorators/current-user.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('plans')
  async getPaymentPlans() {
    const plans = await this.paymentsService.getPaymentPlans();
    return { success: true, data: plans };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createPayment(@CurrentUser('id') userId: string, @Body() dto: CreatePaymentDto) {
    const payment = await this.paymentsService.createPayment({
      userId,
      type: dto.type,
      amount: dto.amount,
      currency: dto.currency,
      platformId: dto.platformId,
    });
    return { success: true, data: payment };
  }

  @Get(':paymentId')
  @UseGuards(JwtAuthGuard)
  async getPayment(@Param('paymentId') paymentId: string) {
    const payment = await this.paymentsService.getPaymentById(paymentId);
    return { success: true, data: payment };
  }

  @Put(':paymentId/status')
  @UseGuards(JwtAuthGuard)
  async updatePaymentStatus(
    @Param('paymentId') paymentId: string,
    @Body() dto: UpdatePaymentStatusDto,
  ) {
    const payment = await this.paymentsService.updatePaymentStatus({
      paymentId,
      status: dto.status,
      platformId: dto.platformId,
    });
    return { success: true, data: payment };
  }

  @Get('user/payments')
  @UseGuards(JwtAuthGuard)
  async getUserPayments(@CurrentUser('id') userId: string) {
    const payments = await this.paymentsService.getUserPayments(userId);
    return { success: true, data: payments };
  }

  @Get('user/status')
  @UseGuards(JwtAuthGuard)
  async getUserPaymentStatus(@CurrentUser('id') userId: string) {
    const status = await this.paymentsService.getUserPaymentStatus(userId);
    return { success: true, data: status };
  }

  @Post('user/cancel-subscription')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async cancelSubscription(@CurrentUser('id') userId: string) {
    await this.paymentsService.cancelSubscription(userId);
    return { success: true, data: { message: 'Subscription cancelled successfully' } };
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() dto: PaymentWebhookDto) {
    await this.paymentsService.updatePaymentStatus({
      paymentId: dto.paymentId,
      status: dto.status,
      platformId: dto.platformId,
    });

    if (dto.status === PaymentStatus.COMPLETED && dto.type === PaymentType.SUBSCRIPTION) {
      await this.paymentsService.processSubscriptionRenewal(dto.userId, dto.paymentId);
    }

    return { success: true, data: { message: 'Webhook processed successfully' } };
  }
}
