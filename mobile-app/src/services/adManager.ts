import { adService } from './adService';
import type { AdType, AdConfig } from '../types';
import { AdAction } from '../types';

export interface AdDisplayState {
  isLoading: boolean;
  adConfig: AdConfig | null;
  error: string | null;
  shouldShow: boolean;
}

class AdManager {
  private adCache: Map<AdType, AdConfig> = new Map();
  private lastAdCheck: Map<AdType, number> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Load ad configuration with caching
   */
  async loadAd(adType: AdType): Promise<AdDisplayState> {
    const state: AdDisplayState = {
      isLoading: true,
      adConfig: null,
      error: null,
      shouldShow: false,
    };

    try {
      // Check if user should see ads
      const shouldShowAds = await adService.shouldShowAds();
      
      if (!shouldShowAds) {
        return {
          ...state,
          isLoading: false,
          shouldShow: false,
        };
      }

      // Check cache first
      const cachedAd = this.getCachedAd(adType);
      if (cachedAd) {
        return {
          ...state,
          isLoading: false,
          adConfig: cachedAd,
          shouldShow: true,
        };
      }

      // Fetch new ad configuration
      const adConfig = await adService.getAd(adType);
      
      if (!adConfig) {
        return {
          ...state,
          isLoading: false,
          error: 'No ad available',
          shouldShow: false,
        };
      }

      // Cache the ad configuration
      this.cacheAd(adType, adConfig);

      return {
        ...state,
        isLoading: false,
        adConfig,
        shouldShow: true,
      };
    } catch (error) {
      console.error('Error loading ad:', error);
      return {
        ...state,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load ad',
        shouldShow: false,
      };
    }
  }

  /**
   * Track ad impression
   */
  async trackImpression(adConfig: AdConfig): Promise<void> {
    await adService.trackAnalytics({
      adType: adConfig.adType,
      action: AdAction.IMPRESSION,
      adNetworkId: adConfig.adNetworkId,
    });
  }

  /**
   * Track ad click
   */
  async trackClick(adConfig: AdConfig): Promise<void> {
    await adService.trackAnalytics({
      adType: adConfig.adType,
      action: AdAction.CLICK,
      adNetworkId: adConfig.adNetworkId,
    });
  }

  /**
   * Track ad close
   */
  async trackClose(adConfig: AdConfig): Promise<void> {
    await adService.trackAnalytics({
      adType: adConfig.adType,
      action: AdAction.CLOSE,
      adNetworkId: adConfig.adNetworkId,
    });
  }

  /**
   * Track ad error
   */
  async trackError(adConfig: AdConfig, error: string): Promise<void> {
    console.error('Ad error:', error);
    await adService.trackAnalytics({
      adType: adConfig.adType,
      action: AdAction.ERROR,
      adNetworkId: adConfig.adNetworkId,
    });
  }

  /**
   * Get cached ad if still valid
   */
  private getCachedAd(adType: AdType): AdConfig | null {
    const cachedAd = this.adCache.get(adType);
    const lastCheck = this.lastAdCheck.get(adType);

    if (!cachedAd || !lastCheck) {
      return null;
    }

    const now = Date.now();
    if (now - lastCheck > this.CACHE_DURATION) {
      // Cache expired
      this.adCache.delete(adType);
      this.lastAdCheck.delete(adType);
      return null;
    }

    return cachedAd;
  }

  /**
   * Cache ad configuration
   */
  private cacheAd(adType: AdType, adConfig: AdConfig): void {
    this.adCache.set(adType, adConfig);
    this.lastAdCheck.set(adType, Date.now());
  }

  /**
   * Clear ad cache
   */
  clearCache(): void {
    this.adCache.clear();
    this.lastAdCheck.clear();
  }

  /**
   * Clear cache for specific ad type
   */
  clearCacheForType(adType: AdType): void {
    this.adCache.delete(adType);
    this.lastAdCheck.delete(adType);
  }
}

export const adManager = new AdManager();