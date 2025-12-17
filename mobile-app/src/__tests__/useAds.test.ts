import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useAd, useTrackAdAnalytics, useShouldShowAds, useAdManager } from '../features/ads';
import { apiClient } from '../lib/apiClient';
import { AdType, AdAction } from '../types';

// Mock the apiClient
jest.mock('../lib/apiClient', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

// Create a wrapper with QueryClientProvider
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useAd', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch ad config successfully', async () => {
    const mockAdConfig = {
      id: 'test-ad-1',
      adType: AdType.BANNER,
      adNetworkId: 'test-network',
      displayFrequency: 1,
    };

    mockApiClient.get.mockResolvedValueOnce(mockAdConfig);

    const { result } = renderHook(() => useAd(AdType.BANNER), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockAdConfig);
    expect(mockApiClient.get).toHaveBeenCalledWith(
      `/ads/serve/${AdType.BANNER}`,
      { timeout: 2000 }
    );
  });

  it('should return sample ad when API fails', async () => {
    mockApiClient.get.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useAd(AdType.BANNER), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should return sample ad
    expect(result.current.data).toEqual({
      id: 'sample-banner-001',
      adType: AdType.BANNER,
      adNetworkId: 'sample-network-banner',
      displayFrequency: 1,
    });
  });

  it('should not fetch when disabled', () => {
    const { result } = renderHook(() => useAd(AdType.BANNER, { enabled: false }), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(mockApiClient.get).not.toHaveBeenCalled();
  });
});

describe('useTrackAdAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should track ad analytics successfully', async () => {
    mockApiClient.post.mockResolvedValueOnce({ success: true });

    const { result } = renderHook(() => useTrackAdAnalytics(), {
      wrapper: createWrapper(),
    });

    const analyticsData = {
      adType: AdType.BANNER,
      action: AdAction.IMPRESSION,
      adNetworkId: 'test-network',
    };

    result.current.mutate(analyticsData);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockApiClient.post).toHaveBeenCalledWith(
      '/ads/track',
      analyticsData,
      { timeout: 2000 }
    );
  });

  it('should handle tracking errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockApiClient.post.mockRejectedValueOnce(new Error('Tracking failed'));

    const { result } = renderHook(() => useTrackAdAnalytics(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      adType: AdType.BANNER,
      action: AdAction.CLICK,
      adNetworkId: 'test-network',
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe('useShouldShowAds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return true for free users', async () => {
    mockApiClient.get.mockResolvedValueOnce({
      user: { premiumStatus: 'FREE' },
    });

    const { result } = renderHook(() => useShouldShowAds(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBe(true);
  });

  it('should return false for lifetime premium users', async () => {
    mockApiClient.get.mockResolvedValueOnce({
      user: { premiumStatus: 'PREMIUM_LIFETIME' },
    });

    const { result } = renderHook(() => useShouldShowAds(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBe(false);
  });

  it('should return false for active subscription users', async () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    mockApiClient.get.mockResolvedValueOnce({
      user: {
        premiumStatus: 'PREMIUM_SUBSCRIPTION',
        premiumExpiry: futureDate.toISOString(),
      },
    });

    const { result } = renderHook(() => useShouldShowAds(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBe(false);
  });

  it('should return true for expired subscription users', async () => {
    const pastDate = new Date();
    pastDate.setFullYear(pastDate.getFullYear() - 1);

    mockApiClient.get.mockResolvedValueOnce({
      user: {
        premiumStatus: 'PREMIUM_SUBSCRIPTION',
        premiumExpiry: pastDate.toISOString(),
      },
    });

    const { result } = renderHook(() => useShouldShowAds(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBe(true);
  });

  it('should return true when API fails', async () => {
    mockApiClient.get.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useShouldShowAds(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBe(true);
  });
});

describe('useAdManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should combine shouldShowAds and ad config', async () => {
    const mockAdConfig = {
      id: 'test-ad-1',
      adType: AdType.BANNER,
      adNetworkId: 'test-network',
      displayFrequency: 1,
    };

    // First call for shouldShowAds (gets user profile)
    mockApiClient.get.mockResolvedValueOnce({
      user: { premiumStatus: 'FREE' },
    });
    // Second call for ad config
    mockApiClient.get.mockResolvedValueOnce(mockAdConfig);

    const { result } = renderHook(() => useAdManager(AdType.BANNER), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.shouldShow).toBe(true);
    expect(result.current.adConfig).toEqual(mockAdConfig);
  });

  it('should not show ads for premium users', async () => {
    mockApiClient.get.mockResolvedValueOnce({
      user: { premiumStatus: 'PREMIUM_LIFETIME' },
    });

    const { result } = renderHook(() => useAdManager(AdType.BANNER), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.shouldShow).toBe(false);
  });

  it('should provide tracking functions', async () => {
    const mockAdConfig = {
      id: 'test-ad-1',
      adType: AdType.BANNER,
      adNetworkId: 'test-network',
      displayFrequency: 1,
    };

    mockApiClient.get.mockResolvedValueOnce({
      user: { premiumStatus: 'FREE' },
    });
    mockApiClient.get.mockResolvedValueOnce(mockAdConfig);
    mockApiClient.post.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useAdManager(AdType.BANNER), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.adConfig).toBeTruthy();
    });

    // Test tracking functions exist
    expect(typeof result.current.trackImpression).toBe('function');
    expect(typeof result.current.trackClick).toBe('function');
    expect(typeof result.current.trackClose).toBe('function');
    expect(typeof result.current.trackError).toBe('function');

    // Call trackImpression
    result.current.trackImpression();

    await waitFor(() => {
      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/ads/track',
        {
          adType: AdType.BANNER,
          action: AdAction.IMPRESSION,
          adNetworkId: 'test-network',
        },
        { timeout: 2000 }
      );
    });
  });
});
