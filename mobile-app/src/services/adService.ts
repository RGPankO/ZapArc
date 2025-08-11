import { API_BASE_URL } from '../utils/constants';
import { tokenService } from './tokenService';
import type { AdConfig, AdAnalyticsData, ApiResponse } from '../types';
import { AdType } from '../types';

class AdService {
  private baseUrl = `${API_BASE_URL}/api/ads`;

  /**
   * Get ad configuration for serving
   */
  async getAd(adType: AdType): Promise<AdConfig | null> {
    try {
      const response = await fetch(`${this.baseUrl}/serve/${adType}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result: ApiResponse<AdConfig> = await response.json();

      if (!result.success) {
        console.error('Failed to get ad:', result.error);
        return null;
      }

      return result.data || null;
    } catch (error) {
      console.error('Error fetching ad:', error);
      return null;
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
      const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
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