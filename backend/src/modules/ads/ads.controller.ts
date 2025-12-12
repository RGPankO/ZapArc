import { Controller, Get, Post, Put, Param, Body, Query, UseGuards, ParseEnumPipe } from '@nestjs/common';
import { AdsService } from './ads.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdType } from '../../../generated/prisma';
import { UpsertAdConfigDto, TrackAnalyticsDto } from './dto/ads.dto';
import { CurrentUser } from '../../decorators/current-user.decorator';

@Controller('ads')
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  @Get('configs')
  async getAdConfigs(@Query('adType') adType?: string) {
    const configs = await this.adsService.getActiveAdConfigs(adType as AdType | undefined);
    return { success: true, data: configs };
  }

  @Post('configs')
  async upsertAdConfig(@Body() dto: UpsertAdConfigDto) {
    const config = await this.adsService.upsertAdConfig({
      adType: dto.adType,
      adNetworkId: dto.adNetworkId,
      isActive: dto.isActive,
      displayFrequency: dto.displayFrequency,
    });
    return { success: true, data: config };
  }

  @Get('serve/:adType')
  async serveAd(
    @Param('adType', new ParseEnumPipe(AdType)) adType: AdType,
    @CurrentUser('id') userId: string | undefined,
  ) {
    const ad = await this.adsService.getAdForServing(adType, userId);

    if (!ad) {
      return { success: true, data: null, message: 'No ad available' };
    }

    return { success: true, data: ad };
  }

  @Post('track')
  @UseGuards(JwtAuthGuard)
  async trackAnalytics(@CurrentUser('id') userId: string, @Body() dto: TrackAnalyticsDto) {
    await this.adsService.trackAdAnalytics({
      userId,
      adType: dto.adType,
      action: dto.action,
      adNetworkId: dto.adNetworkId,
    });
    return { success: true, message: 'Analytics tracked successfully' };
  }

  @Get('analytics')
  async getAnalytics(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const analytics = await this.adsService.getAdAnalytics(start, end);
    return { success: true, data: analytics };
  }

  @Put('configs/:configId/disable')
  async disableAdConfig(@Param('configId') configId: string) {
    const config = await this.adsService.disableAdConfig(configId);
    return { success: true, data: config };
  }
}
