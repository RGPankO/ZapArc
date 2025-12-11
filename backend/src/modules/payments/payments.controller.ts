import { Controller, Get, Post, Put, Param, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { CreatePaymentDto, UpdatePaymentStatusDto, PaymentWebhookDto } from './dto/payments.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('plans')
  async getPaymentPlans() {
    try {
      const plans = await this.paymentsService.getPaymentPlans();
      return { success: true, data: plans };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PAYMENT_PLANS_ERROR',
          message: 'Failed to fetch payment plans',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createPayment(@Request() req: any, @Body() dto: CreatePaymentDto) {
    const userId = req.user?.id;

    if (!dto.type || !dto.amount || !dto.currency) {
      return {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Missing required fields: type, amount, currency',
        },
      };
    }

    try {
      const payment = await this.paymentsService.createPayment({
        userId,
        type: dto.type as any,
        amount: dto.amount,
        currency: dto.currency,
        platformId: dto.platformId,
      });
      return { success: true, data: payment };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PAYMENT_CREATION_ERROR',
          message: 'Failed to create payment',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  @Get(':paymentId')
  @UseGuards(JwtAuthGuard)
  async getPayment(@Param('paymentId') paymentId: string) {
    try {
      const payment = await this.paymentsService.getPaymentById(paymentId);
      if (!payment) {
        return {
          success: false,
          error: {
            code: 'PAYMENT_NOT_FOUND',
            message: 'Payment not found',
          },
        };
      }
      return { success: true, data: payment };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PAYMENT_FETCH_ERROR',
          message: 'Failed to fetch payment',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  @Put(':paymentId/status')
  @UseGuards(JwtAuthGuard)
  async updatePaymentStatus(
    @Param('paymentId') paymentId: string,
    @Body() dto: UpdatePaymentStatusDto,
  ) {
    if (!dto.status) {
      return {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Missing required field: status',
        },
      };
    }

    try {
      const payment = await this.paymentsService.updatePaymentStatus({
        paymentId,
        status: dto.status as any,
        platformId: dto.platformId,
      });
      return { success: true, data: payment };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PAYMENT_UPDATE_ERROR',
          message: 'Failed to update payment status',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  @Get('user/payments')
  @UseGuards(JwtAuthGuard)
  async getUserPayments(@Request() req: any) {
    try {
      const payments = await this.paymentsService.getUserPayments(req.user.id);
      return { success: true, data: payments };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'USER_PAYMENTS_ERROR',
          message: 'Failed to fetch user payments',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  @Get('user/status')
  @UseGuards(JwtAuthGuard)
  async getUserPaymentStatus(@Request() req: any) {
    try {
      const status = await this.paymentsService.getUserPaymentStatus(req.user.id);
      return { success: true, data: status };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PAYMENT_STATUS_ERROR',
          message: 'Failed to fetch payment status',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  @Post('user/cancel-subscription')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async cancelSubscription(@Request() req: any) {
    try {
      await this.paymentsService.cancelSubscription(req.user.id);
      return { success: true, data: { message: 'Subscription cancelled successfully' } };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SUBSCRIPTION_CANCEL_ERROR',
          message: 'Failed to cancel subscription',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() dto: PaymentWebhookDto) {
    if (!dto.paymentId || !dto.status) {
      return {
        success: false,
        error: {
          code: 'INVALID_WEBHOOK',
          message: 'Invalid webhook data',
        },
      };
    }

    try {
      await this.paymentsService.updatePaymentStatus({
        paymentId: dto.paymentId,
        status: dto.status as any,
        platformId: dto.platformId,
      });

      if (dto.status === 'COMPLETED' && dto.type === 'SUBSCRIPTION') {
        await this.paymentsService.processSubscriptionRenewal(dto.userId, dto.paymentId);
      }

      return { success: true, data: { message: 'Webhook processed successfully' } };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'WEBHOOK_ERROR',
          message: 'Failed to process webhook',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }
}
