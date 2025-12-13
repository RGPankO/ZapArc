import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentType, PaymentStatus, PremiumStatus, PaymentModel } from '../../../generated/prisma';

interface CreatePaymentRequest {
  userId: string;
  type: PaymentType;
  amount: number;
  currency: string;
  platformId?: string;
}

interface UpdatePaymentStatusRequest {
  paymentId: string;
  status: PaymentStatus;
  platformId?: string;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getPaymentPlans() {
    const appConfig = await this.prisma.appConfig.findFirst();

    if (!appConfig) {
      throw new NotFoundException('App configuration not found');
    }

    const plans: any[] = [];

    if (
      (appConfig.paymentModel === PaymentModel.SUBSCRIPTION_ONLY ||
        appConfig.paymentModel === PaymentModel.BOTH) &&
      appConfig.subscriptionPrice
    ) {
      plans.push({
        id: 'subscription',
        type: PaymentType.SUBSCRIPTION,
        price: appConfig.subscriptionPrice,
        currency: 'USD',
        duration: 'monthly',
        features: [
          'Ad-free experience',
          'Premium features access',
          'Priority support',
        ],
      });
    }

    if (
      (appConfig.paymentModel === PaymentModel.ONE_TIME_ONLY ||
        appConfig.paymentModel === PaymentModel.BOTH) &&
      appConfig.oneTimePrice
    ) {
      plans.push({
        id: 'lifetime',
        type: PaymentType.ONE_TIME,
        price: appConfig.oneTimePrice,
        currency: 'USD',
        duration: 'lifetime',
        features: [
          'Ad-free experience',
          'Premium features access',
          'Lifetime access',
          'Priority support',
        ],
      });
    }

    return plans;
  }

  async createPayment(request: CreatePaymentRequest) {
    const payment = await this.prisma.payment.create({
      data: {
        userId: request.userId,
        type: request.type,
        amount: request.amount,
        currency: request.currency,
        status: PaymentStatus.PENDING,
        platformId: request.platformId || null,
      },
    });

    this.logger.log(`Payment created: ${payment.id} for user: ${request.userId}`);
    return payment;
  }

  async updatePaymentStatus(request: UpdatePaymentStatusRequest) {
    const payment = await this.prisma.payment.update({
      where: { id: request.paymentId },
      data: {
        status: request.status,
        platformId: request.platformId || null,
      },
    });

    if (request.status === PaymentStatus.COMPLETED) {
      await this.updateUserPremiumStatus(payment.userId, payment.type);
    }

    this.logger.log(`Payment status updated: ${payment.id} to ${request.status}`);
    return payment;
  }

  async getPaymentById(paymentId: string) {
    return this.prisma.payment.findUniqueOrThrow({
      where: { id: paymentId },
    });
  }

  async getUserPayments(userId: string) {
    return this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getUserPaymentStatus(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        payments: {
          where: { status: PaymentStatus.COMPLETED },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    const hasPremium = user.premiumStatus !== PremiumStatus.FREE;
    const isExpired = user.premiumExpiry && user.premiumExpiry < new Date();

    return {
      hasPremium: hasPremium && !isExpired,
      premiumStatus: user.premiumStatus,
      ...(user.premiumExpiry && { premiumExpiry: user.premiumExpiry }),
      activePayments: user.payments,
    };
  }

  private async updateUserPremiumStatus(userId: string, paymentType: PaymentType) {
    let premiumStatus: PremiumStatus;
    let premiumExpiry: Date | null = null;

    if (paymentType === PaymentType.SUBSCRIPTION) {
      premiumStatus = PremiumStatus.PREMIUM_SUBSCRIPTION;
      premiumExpiry = new Date();
      premiumExpiry.setDate(premiumExpiry.getDate() + 30);
    } else {
      premiumStatus = PremiumStatus.PREMIUM_LIFETIME;
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        premiumStatus,
        premiumExpiry,
      },
    });

    this.logger.log(`User premium status updated: ${userId} to ${premiumStatus}`);
  }

  async processSubscriptionRenewal(userId: string, paymentId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    const newExpiry = user.premiumExpiry || new Date();
    newExpiry.setDate(newExpiry.getDate() + 30);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        premiumStatus: PremiumStatus.PREMIUM_SUBSCRIPTION,
        premiumExpiry: newExpiry,
      },
    });

    this.logger.log(`Subscription renewed for user: ${userId} until ${newExpiry}`);
  }

  async cancelSubscription(userId: string) {
    this.logger.log(`Subscription cancellation processed for user: ${userId}`);
  }

  async checkExpiredSubscriptions() {
    const expiredUsers = await this.prisma.user.findMany({
      where: {
        premiumStatus: PremiumStatus.PREMIUM_SUBSCRIPTION,
        premiumExpiry: { lt: new Date() },
      },
    });

    for (const user of expiredUsers) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          premiumStatus: PremiumStatus.FREE,
          premiumExpiry: null,
        },
      });

      this.logger.log(`Premium subscription expired for user: ${user.id}`);
    }
  }
}
