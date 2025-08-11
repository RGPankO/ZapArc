import type { Request, Response } from 'express';
import { adService } from '../services/adService';
import type { AdConfigData, AdAnalyticsData } from '../services/adService';
import { AdType, AdAction } from '../generated/prisma';
import { logger } from '../utils/logger';

export class AdController {
  /**
   * Get ad configurations
   */
  async getAdConfigs(req: Request, res: Response) {
    try {
      const { adType } = req.query;
      
      const configs = await adService.getActiveAdConfigs(
        adType as AdType | undefined
      );

      res.json({
        success: true,
        data: configs
      });
    } catch (error) {
      logger.error('Error in getAdConfigs:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'AD_CONFIG_FETCH_ERROR',
          message: 'Failed to fetch ad configurations'
        }
      });
    }
  }

  /**
   * Create or update ad configuration (admin endpoint)
   */
  async upsertAdConfig(req: Request, res: Response) {
    try {
      const { adType, adNetworkId, isActive, displayFrequency } = req.body;

      if (!adType || !adNetworkId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'adType and adNetworkId are required'
          }
        });
      }

      if (!Object.values(AdType).includes(adType)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_AD_TYPE',
            message: 'Invalid ad type'
          }
        });
      }

      const configData: AdConfigData = {
        adType,
        adNetworkId,
        isActive,
        displayFrequency
      };

      const config = await adService.upsertAdConfig(configData);

      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      logger.error('Error in upsertAdConfig:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'AD_CONFIG_SAVE_ERROR',
          message: 'Failed to save ad configuration'
        }
      });
    }
  }

  /**
   * Get ad for serving to client
   */
  async serveAd(req: Request, res: Response) {
    try {
      const { adType } = req.params;
      const userId = req.user?.id; // From auth middleware

      if (!Object.values(AdType).includes(adType as AdType)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_AD_TYPE',
            message: 'Invalid ad type'
          }
        });
      }

      const ad = await adService.getAdForServing(adType as AdType, userId);

      if (!ad) {
        return res.json({
          success: true,
          data: null,
          message: 'No ad available'
        });
      }

      res.json({
        success: true,
        data: ad
      });
    } catch (error) {
      logger.error('Error in serveAd:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'AD_SERVE_ERROR',
          message: 'Failed to serve ad'
        }
      });
    }
  }

  /**
   * Track ad analytics
   */
  async trackAnalytics(req: Request, res: Response) {
    try {
      const { adType, action, adNetworkId } = req.body;
      const userId = req.user?.id; // From auth middleware

      if (!adType || !action || !adNetworkId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'adType, action, and adNetworkId are required'
          }
        });
      }

      if (!Object.values(AdType).includes(adType)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_AD_TYPE',
            message: 'Invalid ad type'
          }
        });
      }

      if (!Object.values(AdAction).includes(action)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_AD_ACTION',
            message: 'Invalid ad action'
          }
        });
      }

      const analyticsData: AdAnalyticsData = {
        userId,
        adType,
        action,
        adNetworkId
      };

      await adService.trackAdAnalytics(analyticsData);

      res.json({
        success: true,
        message: 'Analytics tracked successfully'
      });
    } catch (error) {
      logger.error('Error in trackAnalytics:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'ANALYTICS_TRACK_ERROR',
          message: 'Failed to track analytics'
        }
      });
    }
  }

  /**
   * Get ad analytics (admin endpoint)
   */
  async getAnalytics(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const analytics = await adService.getAdAnalytics(start, end);

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      logger.error('Error in getAnalytics:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'ANALYTICS_FETCH_ERROR',
          message: 'Failed to fetch analytics'
        }
      });
    }
  }

  /**
   * Disable ad configuration (admin endpoint)
   */
  async disableAdConfig(req: Request, res: Response) {
    try {
      const { configId } = req.params;

      if (!configId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'configId is required'
          }
        });
      }

      const config = await adService.disableAdConfig(configId);

      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      logger.error('Error in disableAdConfig:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'AD_CONFIG_DISABLE_ERROR',
          message: 'Failed to disable ad configuration'
        }
      });
    }
  }
}

export const adController = new AdController();