import { tokenService } from './tokenService';
import { NetworkConfig } from '../config/network';
import type { AdConfig, AdAnalyticsData, ApiResponse } from '../types';
import { AdType } from '../types';

class AdService {
  private get baseUrl(): string {
    return `${NetworkConfig.getApiBaseUrl()}/ads`;
  }

  // Sample ad configurations for when backend is unavailable
  private getSampleAdConfig(adType: AdType): AdConfig {
    const sampleAds = {
      [AdType.BANNER]: {
        id: 'sample-banner-001',
        adType: AdType.BANNER,
        adNetworkId: 'sample-network-banner',
        displayFrequency: 1,
      },
      [AdType.INTERSTITIAL]: {
        id: 'sample-interstitial-001',
        adType: AdType.INTERSTITIAL,
        adNetworkId: 'sample-network-interstitial',
        displayFrequency: 1,
      },
    };

    return sampleAds[adType];
  }

  /**
   * Get ad configuration for serving
   */
  async getAd(adType: AdType): Promise<AdConfig | null> {
    try {
      console.log('AdService: Fetching ad for type:', adType);
      console.log('AdService: Using base URL:', this.baseUrl);
      
      const response = await fetch(`${this.baseUrl}/serve/${adType}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result: ApiResponse<AdConfig> = await response.json();

      if (!result.success) {
        console.log('AdService: Backend returned error, using sample ad:', result.error);
        return this.getSampleAdConfig(adType);
      }

      console.log('AdService: Successfully fetched ad from backend');
      return result.data || this.getSampleAdConfig(adType);
    } catch (error) {
      console.log('AdService: Backend unavailable, using sample ad:', error);
      // Return sample ad instead of null when backend is unavailable
      return this.getSampleAdConfig(adType);
    }
  }

  /**
   * Track ad analytics
   */
  async trackAnalytics(data: AdAnalyticsData): Promise<void> {
    try {
      const token = await tokenService.getAccessToken();
      
      if (!token) {
        console.warn('No access token available for ad analytics tracking');
        return;
      }

      const response = await fetch(`${this.baseUrl}/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const result: ApiResponse = await response.json();

      if (!result.success) {
        console.error('Failed to track ad analytics:', result.error);
      }
    } catch (error) {
      console.error('Error tracking ad analytics:', error);
      // Don't throw error as analytics tracking shouldn't break the app
    }
  }

  /**
   * Check if user should see ads based on premium status
   */
  async shouldShowAds(): Promise<boolean> {
    try {
      const token = await tokenService.getAccessToken();
      
      if (!token) {
        // If no token, assume user should see ads
        return true;
      }

      // Get user profile to check premium status
      const response = await fetch(`${NetworkConfig.getApiBaseUrl()}/users/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // If can't get user profile, default to showing ads
        return true;
      }

      const result: ApiResponse<any> = await response.json();
      
      if (!result.success || !result.data) {
        return true;
      }

      const user = result.data;
      
      // Premium users don't see ads
      if (user.premiumStatus === 'PREMIUM_LIFETIME') {
        return false;
      }

      if (user.premiumStatus === 'PREMIUM_SUBSCRIPTION') {
        // Check if subscription is still active
        if (user.premiumExpiry && new Date(user.premiumExpiry) > new Date()) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error checking premium status:', error);
      // Default to showing ads if there's an error
      return true;
    }
  }
}

export const adService = new AdService();