import { paymentService } from '../services/paymentService';
import { logger } from './logger';

/**
 * Scheduled job to check and update expired subscriptions
 * This should be run periodically (e.g., daily) to ensure expired subscriptions are handled
 */
export async function checkExpiredSubscriptionsJob(): Promise<void> {
  try {
    logger.info('Starting expired subscriptions check job');
    await paymentService.checkExpiredSubscriptions();
    logger.info('Expired subscriptions check job completed');
  } catch (error) {
    logger.error('Error in expired subscriptions check job:', error);
  }
}

/**
 * Start periodic subscription expiry checks
 * @param intervalMs - Interval in milliseconds (default: 24 hours)
 */
export function startSubscriptionExpiryScheduler(intervalMs: number = 24 * 60 * 60 * 1000): void {
  logger.info(`Starting subscription expiry scheduler with interval: ${intervalMs}ms`);
  
  // Run immediately on startup
  checkExpiredSubscriptionsJob();
  
  // Schedule periodic runs
  setInterval(checkExpiredSubscriptionsJob, intervalMs);
}