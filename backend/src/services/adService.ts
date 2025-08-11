import { PrismaClient, AdType, AdAction, PremiumStatus } from '../generated/prisma';
import { logger } from '../utils/logger';

export interface AdConfigData {
  adType: AdType;
  adNetworkId: string;
  isActive?: boolean;
  displayFrequency?: number;
}

export interface AdAnalyticsData {
  userId?: string | undefined;
  adType: AdType;
  action: AdAction;
  adNetworkId: string;
}

export class AdService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }
  /**
   * Get active ad configurations
   */
  async getActiveAdConfigs(adType?: AdType) {
    try {
      const where = {
        isActive: true,
        ...(adType && { adType })
      };

      const configs = await this.prisma.adConfig.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      });

      return configs;
    } catch (error) {
      logger.error('Error fetching ad configurations:', error);
      throw new Error('Failed to fetch ad configurations');
    }
  }

  /**
   * Create or update ad configuration
   */
  async upsertAdConfig(data: AdConfigData) {
    try {
      const existingConfig = await this.prisma.adConfig.findFirst({
        where: {
          adType: data.adType,
          adNetworkId: data.adNetworkId
        }
      });

      if (existingConfig) {
        return await this.prisma.adConfig.update({
          where: { id: existingConfig.id },
          data: {
            isActive: data.isActive ?? true,
            displayFrequency: data.displayFrequency ?? 1,
            updatedAt: new Date()
          }
        });
      } else {
        return await this.prisma.adConfig.create({
          data: {
            adType: data.adType,
            adNetworkId: data.adNetworkId,
            isActive: data.isActive ?? true,
            displayFrequency: data.displayFrequency ?? 1
          }
        });
      }
    } catch (error) {
      logger.error('Error upserting ad configuration:', error);
      throw new Error('Failed to save ad configuration');
    }
  }

  /**
   * Check if user should see ads (premium users don't see ads)
   */
  async shouldShowAds(userId: string): Promise<boolean> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { premiumStatus: true, premiumExpiry: true }
      });

      if (!user) {
        return true; // Show ads for non-existent users
      }

      // Premium users don't see ads
      if (user.premiumStatus === PremiumStatus.PREMIUM_LIFETIME) {
        return false;
      }

      if (user.premiumStatus === PremiumStatus.PREMIUM_SUBSCRIPTION) {
        // Check if subscription is still active
        if (user.premiumExpiry && user.premiumExpiry > new Date()) {
          return false;
        }
      }

      return true;
    } catch (error) {
      logger.error('Error checking user premium status:', error);
      // Default to showing ads if there's an error
      return true;
    }
  }

  /**
   * Get ad configuration for serving
   */
  async getAdForServing(adType: AdType, userId?: string): Promise<any> {
    try {
      // Check if user should see ads
      if (userId) {
        const shouldShow = await this.shouldShowAds(userId);
        if (!shouldShow) {
          return null;
        }
      }

      // Get active ad configuration
      const adConfigs = await this.getActiveAdConfigs(adType);
      
      if (adConfigs.length === 0) {
        return null;
      }

      // For now, return the first active config
      // In a real implementation, you might implement rotation logic
      const selectedConfig = adConfigs[0];

      if (!selectedConfig) {
        return null;
      }

      return {
        id: selectedConfig.id,
        adType: selectedConfig.adType,
        adNetworkId: selectedConfig.adNetworkId,
        displayFrequency: selectedConfig.displayFrequency
      };
    } catch (error) {
      logger.error('Error serving ad:', error);
      throw new Error('Failed to serve ad');
    }
  }

  /**
   * Track ad analytics
   */
  async trackAdAnalytics(data: AdAnalyticsData) {
    try {
      await this.prisma.adAnalytics.create({
        data: {
          userId: data.userId || null,
          adType: data.adType,
          action: data.action,
          adNetworkId: data.adNetworkId
        }
      });

      logger.info(`Ad analytics tracked: ${data.action} for ${data.adType} ad`);
    } catch (error) {
      logger.error('Error tracking ad analytics:', error);
      // Don't throw error for analytics tracking failures
      // as it shouldn't break the main flow
    }
  }

  /**
   * Get ad analytics summary
   */
  async getAdAnalytics(startDate?: Date, endDate?: Date) {
    try {
      const where: any = {};
      
      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) where.timestamp.gte = startDate;
        if (endDate) where.timestamp.lte = endDate;
      }

      const analytics = await this.prisma.adAnalytics.groupBy({
        by: ['adType', 'action'],
        where,
        _count: {
          id: true
        },
        orderBy: {
          adType: 'asc'
        }
      });

      return analytics.map(item => ({
        adType: item.adType,
        action: item.action,
        count: item._count.id
      }));
    } catch (error) {
      logger.error('Error fetching ad analytics:', error);
      throw new Error('Failed to fetch ad analytics');
    }
  }

  /**
   * Disable ad configuration
   */
  async disableAdConfig(configId: string) {
    try {
      return await this.prisma.adConfig.update({
        where: { id: configId },
        data: { isActive: false, updatedAt: new Date() }
      });
    } catch (error) {
      logger.error('Error disabling ad configuration:', error);
      throw new Error('Failed to disable ad configuration');
    }
  }
}

export const adService = new AdService();