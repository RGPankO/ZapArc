import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdType, AdAction, PremiumStatus } from '../../../generated/prisma';

export interface AdConfigData {
  adType: AdType;
  adNetworkId: string;
  isActive?: boolean;
  displayFrequency?: number;
}

export interface AdAnalyticsData {
  userId?: string;
  adType: AdType;
  action: AdAction;
  adNetworkId: string;
}

@Injectable()
export class AdsService {
  private readonly logger = new Logger(AdsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getActiveAdConfigs(adType?: AdType) {
    const where = {
      isActive: true,
      ...(adType && { adType }),
    };

    return this.prisma.adConfig.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async upsertAdConfig(data: AdConfigData) {
    const existingConfig = await this.prisma.adConfig.findFirst({
      where: {
        adType: data.adType,
        adNetworkId: data.adNetworkId,
      },
    });

    if (existingConfig) {
      return this.prisma.adConfig.update({
        where: { id: existingConfig.id },
        data: {
          isActive: data.isActive ?? true,
          displayFrequency: data.displayFrequency ?? 1,
          updatedAt: new Date(),
        },
      });
    }

    return this.prisma.adConfig.create({
      data: {
        adType: data.adType,
        adNetworkId: data.adNetworkId,
        isActive: data.isActive ?? true,
        displayFrequency: data.displayFrequency ?? 1,
      },
    });
  }

  async shouldShowAds(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { premiumStatus: true, premiumExpiry: true },
    });

    if (!user) {
      return true;
    }

    if (user.premiumStatus === PremiumStatus.PREMIUM_LIFETIME) {
      return false;
    }

    if (user.premiumStatus === PremiumStatus.PREMIUM_SUBSCRIPTION) {
      if (user.premiumExpiry && user.premiumExpiry > new Date()) {
        return false;
      }
    }

    return true;
  }

  async getAdForServing(adType: AdType, userId?: string) {
    if (userId) {
      const shouldShow = await this.shouldShowAds(userId);
      if (!shouldShow) {
        return null;
      }
    }

    const adConfigs = await this.getActiveAdConfigs(adType);

    if (adConfigs.length === 0) {
      return null;
    }

    const selectedConfig = adConfigs[0];

    if (!selectedConfig) {
      return null;
    }

    return {
      id: selectedConfig.id,
      adType: selectedConfig.adType,
      adNetworkId: selectedConfig.adNetworkId,
      displayFrequency: selectedConfig.displayFrequency,
    };
  }

  async trackAdAnalytics(data: AdAnalyticsData) {
    await this.prisma.adAnalytics.create({
      data: {
        userId: data.userId || null,
        adType: data.adType,
        action: data.action,
        adNetworkId: data.adNetworkId,
      },
    });

    this.logger.log(`Ad analytics tracked: ${data.action} for ${data.adType} ad`);
  }

  async getAdAnalytics(startDate?: Date, endDate?: Date) {
    const where: any = {};

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    const analytics = await this.prisma.adAnalytics.groupBy({
      by: ['adType', 'action'],
      where,
      _count: { id: true },
      orderBy: { adType: 'asc' },
    });

    return analytics.map((item) => ({
      adType: item.adType,
      action: item.action,
      count: item._count.id,
    }));
  }

  async disableAdConfig(configId: string) {
    return this.prisma.adConfig.update({
      where: { id: configId },
      data: { isActive: false, updatedAt: new Date() },
    });
  }
}
