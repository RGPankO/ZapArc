import { IsEnum, IsString, IsOptional, IsNumber, IsBoolean, Min } from 'class-validator';
import { AdType, AdAction } from '../../../../generated/prisma';

export class UpsertAdConfigDto {
  @IsEnum(AdType)
  adType: AdType;

  @IsString()
  adNetworkId: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  displayFrequency?: number;
}

export class TrackAnalyticsDto {
  @IsEnum(AdType)
  adType: AdType;

  @IsEnum(AdAction)
  action: AdAction;

  @IsString()
  adNetworkId: string;
}
