import type { Request, Response } from 'express';
import { paymentService } from '../services/paymentService';
import type { 
  ApiResponse, 
  CreatePaymentRequest, 
  UpdatePaymentStatusRequest,
  PaymentWebhookData
} from '../types';
import { PaymentStatus, PaymentType } from '../types';
import { logger } from '../utils/logger';

export class PaymentController {
  /**
   * Get available payment plans
   */
  async getPaymentPlans(req: Request, res: Response): Promise<void> {
    try {
      const plans = await paymentService.getPaymentPlans();
      
      const response: ApiResponse = {
        success: true,
        data: plans,
      };
      
      res.json(response);
    } catch (error) {
      logger.error('Error in getPaymentPlans:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'PAYMENT_PLANS_ERROR',
          message: 'Failed to fetch payment plans',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      };
      res.status(500).json(response);
    }
  }

  /**
   * Create a new payment
   */
  async createPayment(req: Request, res: Response): Promise<void> {
    try {
      const { type, amount, currency, platformId } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        };
        res.status(401).json(response);
        return;
      }

      if (!type || !amount || !currency) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Missing required fields: type, amount, currency',
          },
        };
        res.status(400).json(response);
        return;
      }

      const createRequest: CreatePaymentRequest = {
        userId,
        type,
        amount,
        currency,
        platformId,
      };

      const payment = await paymentService.createPayment(createRequest);
      
      const response: ApiResponse = {
        success: true,
        data: payment,
      };
      
      res.status(201).json(response);
    } catch (error) {
      logger.error('Error in createPayment:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'PAYMENT_CREATION_ERROR',
          message: 'Failed to create payment',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      };
      res.status(500).json(response);
    }
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(req: Request, res: Response): Promise<void> {
    try {
      const { paymentId } = req.params;
      const { status, platformId } = req.body;

      if (!status) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Missing required field: status',
          },
        };
        res.status(400).json(response);
        return;
      }

      if (!paymentId) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Missing payment ID',
          },
        };
        res.status(400).json(response);
        return;
      }

      const updateRequest: UpdatePaymentStatusRequest = {
        paymentId,
        status,
        platformId,
      };

      const payment = await paymentService.updatePaymentStatus(updateRequest);
      
      const response: ApiResponse = {
        success: true,
        data: payment,
      };
      
      res.json(response);
    } catch (error) {
      logger.error('Error in updatePaymentStatus:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'PAYMENT_UPDATE_ERROR',
          message: 'Failed to update payment status',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      };
      res.status(500).json(response);
    }
  }

  /**
   * Get payment by ID
   */
  async getPayment(req: Request, res: Response): Promise<void> {
    try {
      const { paymentId } = req.params;
      if (!paymentId) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Missing payment ID',
          },
        };
        res.status(400).json(response);
        return;
      }

      const payment = await paymentService.getPaymentById(paymentId);

      if (!payment) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'PAYMENT_NOT_FOUND',
            message: 'Payment not found',
          },
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: payment,
      };
      
      res.json(response);
    } catch (error) {
      logger.error('Error in getPayment:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'PAYMENT_FETCH_ERROR',
          message: 'Failed to fetch payment',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      };
      res.status(500).json(response);
    }
  }

  /**
   * Get user's payments
   */
  async getUserPayments(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        };
        res.status(401).json(response);
        return;
      }

      const payments = await paymentService.getUserPayments(userId);
      
      const response: ApiResponse = {
        success: true,
        data: payments,
      };
      
      res.json(response);
    } catch (error) {
      logger.error('Error in getUserPayments:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'USER_PAYMENTS_ERROR',
          message: 'Failed to fetch user payments',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      };
      res.status(500).json(response);
    }
  }

  /**
   * Get user's payment status
   */
  async getUserPaymentStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        };
        res.status(401).json(response);
        return;
      }

      const paymentStatus = await paymentService.getUserPaymentStatus(userId);
      
      const response: ApiResponse = {
        success: true,
        data: paymentStatus,
      };
      
      res.json(response);
    } catch (error) {
      logger.error('Error in getUserPaymentStatus:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'PAYMENT_STATUS_ERROR',
          message: 'Failed to fetch payment status',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      };
      res.status(500).json(response);
    }
  }

  /**
   * Handle payment webhooks from platform providers
   */
  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const webhookData: PaymentWebhookData = req.body;
      
      // Validate webhook data
      if (!webhookData.paymentId || !webhookData.status) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'INVALID_WEBHOOK',
            message: 'Invalid webhook data',
          },
        };
        res.status(400).json(response);
        return;
      }

      // Update payment status based on webhook
      const updateRequest: UpdatePaymentStatusRequest = {
        paymentId: webhookData.paymentId,
        status: webhookData.status,
        platformId: webhookData.platformId,
      };

      await paymentService.updatePaymentStatus(updateRequest);

      // Handle subscription renewal if applicable
      if (
        webhookData.status === PaymentStatus.COMPLETED && 
        webhookData.type === PaymentType.SUBSCRIPTION
      ) {
        await paymentService.processSubscriptionRenewal(
          webhookData.userId, 
          webhookData.paymentId
        );
      }

      const response: ApiResponse = {
        success: true,
        data: { message: 'Webhook processed successfully' },
      };
      
      res.json(response);
    } catch (error) {
      logger.error('Error in handleWebhook:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'WEBHOOK_ERROR',
          message: 'Failed to process webhook',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      };
      res.status(500).json(response);
    }
  }

  /**
   * Cancel user subscription
   */
  async cancelSubscription(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        };
        res.status(401).json(response);
        return;
      }

      await paymentService.cancelSubscription(userId);
      
      const response: ApiResponse = {
        success: true,
        data: { message: 'Subscription cancelled successfully' },
      };
      
      res.json(response);
    } catch (error) {
      logger.error('Error in cancelSubscription:', error);
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'SUBSCRIPTION_CANCEL_ERROR',
          message: 'Failed to cancel subscription',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      };
      res.status(500).json(response);
    }
  }
}

export const paymentController = new PaymentController();