export class UpsertAdConfigDto {
  adType: 'BANNER' | 'INTERSTITIAL';
  adNetworkId: string;
  isActive?: boolean;
  displayFrequency?: number;
}

export class TrackAnalyticsDto {
  adType: 'BANNER' | 'INTERSTITIAL';
  action: 'IMPRESSION' | 'CLICK' | 'CLOSE' | 'ERROR';
  adNetworkId: string;
}
