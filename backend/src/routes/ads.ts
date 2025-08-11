import { Router } from 'express';
import { adController } from '../controllers/adController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Public routes (no authentication required)
router.get('/serve/:adType', adController.serveAd.bind(adController));

// Protected routes (require authentication)
router.post('/track', authenticateToken, adController.trackAnalytics.bind(adController));

// Admin routes (in a real app, you'd add admin authentication middleware)
router.get('/configs', adController.getAdConfigs.bind(adController));
router.post('/configs', adController.upsertAdConfig.bind(adController));
router.put('/configs/:configId/disable', adController.disableAdConfig.bind(adController));
router.get('/analytics', adController.getAnalytics.bind(adController));

export default router;