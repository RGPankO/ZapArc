import { Controller, Get, Post, Put, Param, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreatePaymentDto, UpdatePaymentStatusDto, PaymentWebhookDto } from './dto/payments.dto';
import { PaymentStatus, PaymentType } from '../../../generated/prisma';

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
  async createPayment(@Request() req: any, @Body() dto: CreatePaymentDto) {
    const payment = await this.paymentsService.createPayment({
      userId: req.user.id,
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
  async getUserPayments(@Request() req: any) {
    const payments = await this.paymentsService.getUserPayments(req.user.id);
    return { success: true, data: payments };
  }

  @Get('user/status')
  @UseGuards(JwtAuthGuard)
  async getUserPaymentStatus(@Request() req: any) {
    const status = await this.paymentsService.getUserPaymentStatus(req.user.id);
    return { success: true, data: status };
  }

  @Post('user/cancel-subscription')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async cancelSubscription(@Request() req: any) {
    await this.paymentsService.cancelSubscription(req.user.id);
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
