export enum AdType {
  BANNER = 'BANNER',
  INTERSTITIAL = 'INTERSTITIAL',
}

export enum AdAction {
  IMPRESSION = 'IMPRESSION',
  CLICK = 'CLICK',
  CLOSE = 'CLOSE',
  ERROR = 'ERROR',
}

export interface AdConfig {
  id: string;
  adType: AdType;
  adNetworkId: string;
  displayFrequency: number;
}

export interface AdAnalyticsData {
  adType: AdType;
  action: AdAction;
  adNetworkId: string;
}
