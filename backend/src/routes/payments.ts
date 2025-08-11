import { Router } from 'express';
import { paymentController } from '../controllers/paymentController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Get available payment plans (public endpoint)
router.get('/plans', paymentController.getPaymentPlans.bind(paymentController));

// Create a new payment (authenticated)
router.post('/', authenticateToken, paymentController.createPayment.bind(paymentController));

// Get payment by ID (authenticated)
router.get('/:paymentId', authenticateToken, paymentController.getPayment.bind(paymentController));

// Update payment status (authenticated)
router.put('/:paymentId/status', authenticateToken, paymentController.updatePaymentStatus.bind(paymentController));

// Get user's payments (authenticated)
router.get('/user/payments', authenticateToken, paymentController.getUserPayments.bind(paymentController));

// Get user's payment status (authenticated)
router.get('/user/status', authenticateToken, paymentController.getUserPaymentStatus.bind(paymentController));

// Cancel user subscription (authenticated)
router.post('/user/cancel-subscription', authenticateToken, paymentController.cancelSubscription.bind(paymentController));

// Webhook endpoint for payment confirmations (public, but should be secured with webhook signatures in production)
router.post('/webhook', paymentController.handleWebhook.bind(paymentController));

export default router;