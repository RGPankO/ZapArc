import React from 'react';
import { render, waitFor, fireEvent, cleanup, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { InterstitialAd } from '../features/ads';
import { apiClient } from '../lib/apiClient';
import { AdType } from '../types';

// Mock the apiClient
jest.mock('../lib/apiClient', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

// Mock expo-navigation-bar
jest.mock('expo-navigation-bar', () => ({
  setBackgroundColorAsync: jest.fn().mockResolvedValue(undefined),
  setButtonStyleAsync: jest.fn().mockResolvedValue(undefined),
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

// Helper to render with a fresh QueryClient for each test
const renderWithClient = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
  
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
};

describe('InterstitialAd', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers(); // Ensure timers are always real between tests
    cleanup();
  });

  it('should not render when not visible', () => {
    const onClose = jest.fn();
    const { queryByText } = renderWithClient(
      <InterstitialAd visible={false} onClose={onClose} />
    );

    expect(queryByText('Loading advertisement...')).toBeNull();
    expect(queryByText('Sample Video Advertisement')).toBeNull();
  });

  it('should render loading state when visible', async () => {
    const onClose = jest.fn();

    // Make both API calls hang to show loading state
    mockApiClient.get.mockImplementation(
      () => new Promise(() => {}) // Hang forever
    );

    const { getByText } = renderWithClient(
      <InterstitialAd visible={true} onClose={onClose} />
    );

    expect(getByText('Loading advertisement...')).toBeTruthy();
  });

  it('should render ad when loaded successfully', async () => {
    const onClose = jest.fn();
    const onAdLoaded = jest.fn();

    const mockAdConfig = {
      id: '1',
      adType: AdType.INTERSTITIAL,
      adNetworkId: 'test-network',
      displayFrequency: 1,
    };

    mockApiClient.get.mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('/users/profile')) {
        return Promise.resolve({ user: { premiumStatus: 'FREE' } });
      }
      if (typeof url === 'string' && url.includes('/ads/serve')) {
        return Promise.resolve(mockAdConfig);
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    mockApiClient.post.mockResolvedValue({ success: true });

    const { getByText } = renderWithClient(
      <InterstitialAd visible={true} onClose={onClose} onAdLoaded={onAdLoaded} />
    );

    await waitFor(() => {
      expect(getByText('Sample Video Advertisement')).toBeTruthy();
      expect(getByText('Network: test-network')).toBeTruthy();
    });

    expect(onAdLoaded).toHaveBeenCalled();
  });

  it('should close immediately for premium users', async () => {
    const onClose = jest.fn();

    mockApiClient.get.mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('/users/profile')) {
        return Promise.resolve({ user: { premiumStatus: 'PREMIUM_LIFETIME' } });
      }
      if (typeof url === 'string' && url.includes('/ads/serve')) {
        return Promise.resolve({ id: '1', adType: AdType.INTERSTITIAL, adNetworkId: 'test', displayFrequency: 1 });
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    renderWithClient(
      <InterstitialAd visible={true} onClose={onClose} />
    );

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('should track impression when ad is displayed', async () => {
    const onClose = jest.fn();

    const mockAdConfig = {
      id: '1',
      adType: AdType.INTERSTITIAL,
      adNetworkId: 'test-network',
      displayFrequency: 1,
    };

    mockApiClient.get.mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('/users/profile')) {
        return Promise.resolve({ user: { premiumStatus: 'FREE' } });
      }
      if (typeof url === 'string' && url.includes('/ads/serve')) {
        return Promise.resolve(mockAdConfig);
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });
    
    mockApiClient.post.mockResolvedValue({ success: true });

    renderWithClient(
      <InterstitialAd visible={true} onClose={onClose} />
    );

    await waitFor(() => {
      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/ads/track',
        expect.objectContaining({
          adType: AdType.INTERSTITIAL,
          action: 'IMPRESSION',
          adNetworkId: 'test-network',
        }),
        expect.any(Object)
      );
    });
  });

  it('should show close button after video completes', async () => {
    jest.useFakeTimers();
    
    const onClose = jest.fn();

    const mockAdConfig = {
      id: '1',
      adType: AdType.INTERSTITIAL,
      adNetworkId: 'test-network',
      displayFrequency: 1,
    };

    mockApiClient.get.mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('/users/profile')) {
        return Promise.resolve({ user: { premiumStatus: 'FREE' } });
      }
      if (typeof url === 'string' && url.includes('/ads/serve')) {
        return Promise.resolve(mockAdConfig);
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });
    
    mockApiClient.post.mockResolvedValue({ success: true });

    const { getByText, queryByText } = renderWithClient(
      <InterstitialAd visible={true} onClose={onClose} />
    );

    await waitFor(() => {
      expect(getByText('Sample Video Advertisement')).toBeTruthy();
    });

    // Initially, close button should not be visible
    expect(queryByText('✕')).toBeNull();

    // Fast-forward 5 seconds (video duration)
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(getByText('✕')).toBeTruthy();
    });
    
    jest.useRealTimers();
  });

  it('should track close when close button is pressed', async () => {
    jest.useFakeTimers();
    
    const onClose = jest.fn();

    const mockAdConfig = {
      id: '1',
      adType: AdType.INTERSTITIAL,
      adNetworkId: 'test-network',
      displayFrequency: 1,
    };

    mockApiClient.get.mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('/users/profile')) {
        return Promise.resolve({ user: { premiumStatus: 'FREE' } });
      }
      if (typeof url === 'string' && url.includes('/ads/serve')) {
        return Promise.resolve(mockAdConfig);
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    mockApiClient.post.mockResolvedValue({ success: true });

    const { getByText } = renderWithClient(
      <InterstitialAd visible={true} onClose={onClose} />
    );

    await waitFor(() => {
      expect(getByText('Sample Video Advertisement')).toBeTruthy();
    });

    // Fast-forward to show close button
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(getByText('✕')).toBeTruthy();
    });

    // Clear previous calls (impression)
    mockApiClient.post.mockClear();

    fireEvent.press(getByText('✕'));

    await waitFor(() => {
      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/ads/track',
        expect.objectContaining({
          adType: AdType.INTERSTITIAL,
          action: 'CLOSE',
          adNetworkId: 'test-network',
        }),
        expect.any(Object)
      );
    });

    expect(onClose).toHaveBeenCalled();
    
    jest.useRealTimers();
  });

  it('should track click when ad is pressed', async () => {
    const onClose = jest.fn();

    const mockAdConfig = {
      id: '1',
      adType: AdType.INTERSTITIAL,
      adNetworkId: 'test-network',
      displayFrequency: 1,
    };

    mockApiClient.get.mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('/users/profile')) {
        return Promise.resolve({ user: { premiumStatus: 'FREE' } });
      }
      if (typeof url === 'string' && url.includes('/ads/serve')) {
        return Promise.resolve(mockAdConfig);
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    mockApiClient.post.mockResolvedValue({ success: true });

    const { getByText } = renderWithClient(
      <InterstitialAd visible={true} onClose={onClose} />
    );

    await waitFor(() => {
      expect(getByText('Tap to learn more')).toBeTruthy();
    });

    // Clear previous calls
    mockApiClient.post.mockClear();

    fireEvent.press(getByText('Tap to learn more'));

    await waitFor(() => {
      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/ads/track',
        expect.objectContaining({
          adType: AdType.INTERSTITIAL,
          action: 'CLICK',
          adNetworkId: 'test-network',
        }),
        expect.any(Object)
      );
    });
  });

  it('should use sample ad when API fails', async () => {
    const onClose = jest.fn();

    mockApiClient.get.mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('/users/profile')) {
        return Promise.resolve({ user: { premiumStatus: 'FREE' } });
      }
      if (typeof url === 'string' && url.includes('/ads/serve')) {
        return Promise.reject(new Error('Network error'));
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });
    
    mockApiClient.post.mockResolvedValue({ success: true });

    const { getByText } = renderWithClient(
      <InterstitialAd visible={true} onClose={onClose} />
    );

    await waitFor(() => {
      expect(getByText('Network: sample-network-interstitial')).toBeTruthy();
    });
  });
});
