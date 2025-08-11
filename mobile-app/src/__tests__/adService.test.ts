import { adService } from '../services/adService';
import { tokenService } from '../services/tokenService';
import { AdType, AdAction } from '../types';

// Mock fetch
global.fetch = jest.fn();

// Mock token service
jest.mock('../services/tokenService', () => ({
  tokenService: {
    getAccessToken: jest.fn(),
  },
}));

const mockTokenService = tokenService as jest.Mocked<typeof tokenService>;
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('AdService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAd', () => {
    it('should return ad configuration when successful', async () => {
      const mockAdConfig = {
        id: '1',
        adType: AdType.BANNER,
        adNetworkId: 'test-network',
        displayFrequency: 1,
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: mockAdConfig,
        }),
      } as Response);

      const result = await adService.getAd(AdType.BANNER);

      expect(result).toEqual(mockAdConfig);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/ads/serve/BANNER',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    });

    it('should return null when no ad is available', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: null,
        }),
      } as Response);

      const result = await adService.getAd(AdType.BANNER);

      expect(result).toBeNull();
    });

    it('should return null when API call fails', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          success: false,
          error: { code: 'AD_SERVE_ERROR', message: 'Failed to serve ad' },
        }),
      } as Response);

      const result = await adService.getAd(AdType.BANNER);

      expect(result).toBeNull();
    });

    it('should return null when fetch throws an error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await adService.getAd(AdType.BANNER);

      expect(result).toBeNull();
    });
  });

  describe('trackAnalytics', () => {
    it('should track analytics when token is available', async () => {
      mockTokenService.getAccessToken.mockResolvedValue('test-token');
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          success: true,
        }),
      } as Response);

      const analyticsData = {
        adType: AdType.BANNER,
        action: AdAction.IMPRESSION,
        adNetworkId: 'test-network',
      };

      await adService.trackAnalytics(analyticsData);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/ads/track',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
          },
          body: JSON.stringify(analyticsData),
        }
      );
    });

    it('should not track analytics when no token is available', async () => {
      mockTokenService.getAccessToken.mockResolvedValue(null);

      const analyticsData = {
        adType: AdType.BANNER,
        action: AdAction.IMPRESSION,
        adNetworkId: 'test-network',
      };

      await adService.trackAnalytics(analyticsData);

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle analytics tracking errors gracefully', async () => {
      mockTokenService.getAccessToken.mockResolvedValue('test-token');
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const analyticsData = {
        adType: AdType.BANNER,
        action: AdAction.IMPRESSION,
        adNetworkId: 'test-network',
      };

      // Should not throw error
      await expect(adService.trackAnalytics(analyticsData)).resolves.not.toThrow();
    });
  });

  describe('shouldShowAds', () => {
    it('should return false for premium lifetime users', async () => {
      mockTokenService.getAccessToken.mockResolvedValue('test-token');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            premiumStatus: 'PREMIUM_LIFETIME',
            premiumExpiry: null,
          },
        }),
      } as Response);

      const result = await adService.shouldShowAds();

      expect(result).toBe(false);
    });

    it('should return false for active premium subscription users', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      mockTokenService.getAccessToken.mockResolvedValue('test-token');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            premiumStatus: 'PREMIUM_SUBSCRIPTION',
            premiumExpiry: futureDate.toISOString(),
          },
        }),
      } as Response);

      const result = await adService.shouldShowAds();

      expect(result).toBe(false);
    });

    it('should return true for expired premium subscription users', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 30);

      mockTokenService.getAccessToken.mockResolvedValue('test-token');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            premiumStatus: 'PREMIUM_SUBSCRIPTION',
            premiumExpiry: pastDate.toISOString(),
          },
        }),
      } as Response);

      const result = await adService.shouldShowAds();

      expect(result).toBe(true);
    });

    it('should return true for free users', async () => {
      mockTokenService.getAccessToken.mockResolvedValue('test-token');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            premiumStatus: 'FREE',
            premiumExpiry: null,
          },
        }),
      } as Response);

      const result = await adService.shouldShowAds();

      expect(result).toBe(true);
    });

    it('should return true when no token is available', async () => {
      mockTokenService.getAccessToken.mockResolvedValue(null);

      const result = await adService.shouldShowAds();

      expect(result).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return true when API call fails', async () => {
      mockTokenService.getAccessToken.mockResolvedValue('test-token');
      mockFetch.mockResolvedValueOnce({
        ok: false,
      } as Response);

      const result = await adService.shouldShowAds();

      expect(result).toBe(true);
    });
  });
});