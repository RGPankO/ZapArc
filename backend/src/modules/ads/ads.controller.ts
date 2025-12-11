import { Controller, Get, Post, Put, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { AdsService } from './ads.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdType, AdAction } from '../../../generated/prisma/index';
import type { UpsertAdConfigDto, TrackAnalyticsDto } from './dto/ads.dto';

@Controller('ads')
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  @Get('configs')
  async getAdConfigs(@Query('adType') adType?: string) {
    try {
      const configs = await this.adsService.getActiveAdConfigs(adType as AdType | undefined);
      return { success: true, data: configs };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'AD_CONFIG_FETCH_ERROR',
          message: 'Failed to fetch ad configurations',
        },
      };
    }
  }

  @Post('configs')
  async upsertAdConfig(@Body() dto: UpsertAdConfigDto) {
    if (!dto.adType || !dto.adNetworkId) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'adType and adNetworkId are required',
        },
      };
    }

    if (!Object.values(AdType).includes(dto.adType as AdType)) {
      return {
        success: false,
        error: {
          code: 'INVALID_AD_TYPE',
          message: 'Invalid ad type',
        },
      };
    }

    try {
      const config = await this.adsService.upsertAdConfig({
        adType: dto.adType as AdType,
        adNetworkId: dto.adNetworkId,
        isActive: dto.isActive,
        displayFrequency: dto.displayFrequency,
      });
      return { success: true, data: config };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'AD_CONFIG_SAVE_ERROR',
          message: 'Failed to save ad configuration',
        },
      };
    }
  }

  @Get('serve/:adType')
  async serveAd(@Param('adType') adType: string, @Request() req: any) {
    const userId = req.user?.id;

    if (!Object.values(AdType).includes(adType as AdType)) {
      return {
        success: false,
        error: {
          code: 'INVALID_AD_TYPE',
          message: 'Invalid ad type',
        },
      };
    }

    try {
      const ad = await this.adsService.getAdForServing(adType as AdType, userId);

      if (!ad) {
        return {
          success: true,
          data: null,
          message: 'No ad available',
        };
      }

      return { success: true, data: ad };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'AD_SERVE_ERROR',
          message: 'Failed to serve ad',
        },
      };
    }
  }

  @Post('track')
  @UseGuards(JwtAuthGuard)
  async trackAnalytics(@Request() req: any, @Body() dto: TrackAnalyticsDto) {
    const userId = req.user?.id;

    if (!dto.adType || !dto.action || !dto.adNetworkId) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'adType, action, and adNetworkId are required',
        },
      };
    }

    if (!Object.values(AdType).includes(dto.adType as AdType)) {
      return {
        success: false,
        error: {
          code: 'INVALID_AD_TYPE',
          message: 'Invalid ad type',
        },
      };
    }

    if (!Object.values(AdAction).includes(dto.action as AdAction)) {
      return {
        success: false,
        error: {
          code: 'INVALID_AD_ACTION',
          message: 'Invalid ad action',
        },
      };
    }

    try {
      await this.adsService.trackAdAnalytics({
        userId,
        adType: dto.adType as AdType,
        action: dto.action as AdAction,
        adNetworkId: dto.adNetworkId,
      });
      return { success: true, message: 'Analytics tracked successfully' };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ANALYTICS_TRACK_ERROR',
          message: 'Failed to track analytics',
        },
      };
    }
  }

  @Get('analytics')
  async getAnalytics(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    try {
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;

      const analytics = await this.adsService.getAdAnalytics(start, end);
      return { success: true, data: analytics };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ANALYTICS_FETCH_ERROR',
          message: 'Failed to fetch analytics',
        },
      };
    }
  }

  @Put('configs/:configId/disable')
  async disableAdConfig(@Param('configId') configId: string) {
    if (!configId) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'configId is required',
        },
      };
    }

    try {
      const config = await this.adsService.disableAdConfig(configId);
      return { success: true, data: config };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'AD_CONFIG_DISABLE_ERROR',
          message: 'Failed to disable ad configuration',
        },
      };
    }
  }
}
