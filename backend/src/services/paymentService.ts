import { PrismaClient } from '../generated/prisma';
import type { 
  Payment, 
  CreatePaymentRequest,
  UpdatePaymentStatusRequest,
  PaymentPlan,
  AppConfig
} from '../types';
import { 
  PaymentType, 
  PaymentStatus, 
  PremiumStatus,
  PaymentModel
} from '../types';
import { logger } from '../utils/logger';

export class PaymentService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || new PrismaClient();
  }
  /**
   * Get available payment plans based on app configuration
   */
  async getPaymentPlans(): Promise<PaymentPlan[]> {
    try {
      const appConfig = await this.prisma.appConfig.findFirst();
      
      if (!appConfig) {
        throw new Error('App configuration not found');
      }

      const plans: PaymentPlan[] = [];

      // Add subscription plan if enabled
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
            'Priority support'
          ]
        });
      }

      // Add one-time plan if enabled
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
            'Priority support'
          ]
        });
      }

      return plans;
    } catch (error) {
      logger.error('Error fetching payment plans:', error);
      throw error;
    }
  }

  /**
   * Create a new payment record
   */
  async createPayment(request: CreatePaymentRequest): Promise<Payment> {
    try {
      const payment = await this.prisma.payment.create({
        data: {
          userId: request.userId,
          type: request.type as any,
          amount: request.amount,
          currency: request.currency,
          status: PaymentStatus.PENDING as any,
          platformId: request.platformId || null,
        },
      });

      logger.info(`Payment created: ${payment.id} for user: ${request.userId}`);
      return payment as Payment;
    } catch (error) {
      logger.error('Error creating payment:', error);
      throw error;
    }
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(request: UpdatePaymentStatusRequest): Promise<Payment> {
    try {
      const payment = await this.prisma.payment.update({
        where: { id: request.paymentId },
        data: {
          status: request.status as any,
          platformId: request.platformId || null,
        },
      });

      // If payment is completed, update user's premium status
      if (request.status === PaymentStatus.COMPLETED) {
        await this.updateUserPremiumStatus(payment.userId, payment.type as PaymentType);
      }

      logger.info(`Payment status updated: ${payment.id} to ${request.status}`);
      return payment as Payment;
    } catch (error) {
      logger.error('Error updating payment status:', error);
      throw error;
    }
  }

  /**
   * Get payment by ID
   */
  async getPaymentById(paymentId: string): Promise<Payment | null> {
    try {
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
      });

      return payment as Payment | null;
    } catch (error) {
      logger.error('Error fetching payment:', error);
      throw error;
    }
  }

  /**
   * Get payments for a user
   */
  async getUserPayments(userId: string): Promise<Payment[]> {
    try {
      const payments = await this.prisma.payment.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      return payments as Payment[];
    } catch (error) {
      logger.error('Error fetching user payments:', error);
      throw error;
    }
  }

  /**
   * Get payment status for a user
   */
  async getUserPaymentStatus(userId: string): Promise<{
    hasPremium: boolean;
    premiumStatus: PremiumStatus;
    premiumExpiry?: Date;
    activePayments: Payment[];
  }> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          payments: {
            where: { status: PaymentStatus.COMPLETED },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const hasPremium = user.premiumStatus !== PremiumStatus.FREE;
      const isExpired = user.premiumExpiry && user.premiumExpiry < new Date();

      return {
        hasPremium: hasPremium && !isExpired,
        premiumStatus: user.premiumStatus as PremiumStatus,
        ...(user.premiumExpiry && { premiumExpiry: user.premiumExpiry }),
        activePayments: user.payments as Payment[],
      };
    } catch (error) {
      logger.error('Error fetching user payment status:', error);
      throw error;
    }
  }

  /**
   * Update user's premium status based on payment type
   */
  private async updateUserPremiumStatus(userId: string, paymentType: PaymentType): Promise<void> {
    try {
      let premiumStatus: PremiumStatus;
      let premiumExpiry: Date | null = null;

      if (paymentType === PaymentType.SUBSCRIPTION) {
        premiumStatus = PremiumStatus.PREMIUM_SUBSCRIPTION;
        // Set expiry to 30 days from now for monthly subscription
        premiumExpiry = new Date();
        premiumExpiry.setDate(premiumExpiry.getDate() + 30);
      } else {
        premiumStatus = PremiumStatus.PREMIUM_LIFETIME;
        // No expiry for lifetime purchase
      }

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          premiumStatus: premiumStatus as any,
          premiumExpiry,
        },
      });

      logger.info(`User premium status updated: ${userId} to ${premiumStatus}`);
    } catch (error) {
      logger.error('Error updating user premium status:', error);
      throw error;
    }
  }

  /**
   * Process subscription renewal
   */
  async processSubscriptionRenewal(userId: string, paymentId: string): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Extend premium expiry by 30 days
      const newExpiry = user.premiumExpiry || new Date();
      newExpiry.setDate(newExpiry.getDate() + 30);

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          premiumStatus: PremiumStatus.PREMIUM_SUBSCRIPTION as any,
          premiumExpiry: newExpiry,
        },
      });

      logger.info(`Subscription renewed for user: ${userId} until ${newExpiry}`);
    } catch (error) {
      logger.error('Error processing subscription renewal:', error);
      throw error;
    }
  }

  /**
   * Handle subscription cancellation
   */
  async cancelSubscription(userId: string): Promise<void> {
    try {
      // Don't immediately revoke premium status, let it expire naturally
      // This allows users to continue using premium features until their current period ends
      
      logger.info(`Subscription cancellation processed for user: ${userId}`);
    } catch (error) {
      logger.error('Error cancelling subscription:', error);
      throw error;
    }
  }

  /**
   * Check and update expired subscriptions
   */
  async checkExpiredSubscriptions(): Promise<void> {
    try {
      const expiredUsers = await this.prisma.user.findMany({
        where: {
          premiumStatus: PremiumStatus.PREMIUM_SUBSCRIPTION,
          premiumExpiry: {
            lt: new Date(),
          },
        },
      });

      for (const user of expiredUsers) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            premiumStatus: PremiumStatus.FREE as any,
            premiumExpiry: null,
          },
        });

        logger.info(`Premium subscription expired for user: ${user.id}`);
      }
    } catch (error) {
      logger.error('Error checking expired subscriptions:', error);
      throw error;
    }
  }
}

export const paymentService = new PaymentService();