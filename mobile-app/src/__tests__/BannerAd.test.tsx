import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { BannerAd } from '../components/BannerAd';
import { adManager } from '../services/adManager';
import { AdType } from '../types';

// Mock the ad manager
jest.mock('../services/adManager', () => ({
  adManager: {
    loadAd: jest.fn(),
    trackImpression: jest.fn(),
    trackClick: jest.fn(),
  },
}));

const mockAdManager = adManager as jest.Mocked<typeof adManager>;

describe('BannerAd', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state initially', async () => {
    mockAdManager.loadAd.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        isLoading: false,
        adConfig: null,
        error: null,
        shouldShow: false,
      }), 100))
    );

    const { getByText } = render(<BannerAd />);
    
    expect(getByText('Loading ad...')).toBeTruthy();
  });

  it('should render ad when loaded successfully', async () => {
    const mockAdConfig = {
      id: '1',
      adType: AdType.BANNER,
      adNetworkId: 'test-network',
      displayFrequency: 1,
    };

    mockAdManager.loadAd.mockResolvedValue({
      isLoading: false,
      adConfig: mockAdConfig,
      error: null,
      shouldShow: true,
    });

    const { getByText } = render(<BannerAd />);

    await waitFor(() => {
      expect(getByText('Advertisement')).toBeTruthy();
      expect(getByText('Sample Banner Ad - Network: test-network')).toBeTruthy();
    });

    expect(mockAdManager.loadAd).toHaveBeenCalledWith(AdType.BANNER);
    expect(mockAdManager.trackImpression).toHaveBeenCalledWith(mockAdConfig);
  });

  it('should not render when user should not see ads', async () => {
    mockAdManager.loadAd.mockResolvedValue({
      isLoading: false,
      adConfig: null,
      error: null,
      shouldShow: false,
    });

    const { queryByText } = render(<BannerAd />);

    await waitFor(() => {
      expect(queryByText('Advertisement')).toBeNull();
    });
  });

  it('should not render when there is an error', async () => {
    mockAdManager.loadAd.mockResolvedValue({
      isLoading: false,
      adConfig: null,
      error: 'Failed to load ad',
      shouldShow: false,
    });

    const { queryByText } = render(<BannerAd />);

    await waitFor(() => {
      expect(queryByText('Advertisement')).toBeNull();
    });
  });

  it('should call onAdLoaded callback when ad loads successfully', async () => {
    const onAdLoaded = jest.fn();
    const mockAdConfig = {
      id: '1',
      adType: AdType.BANNER,
      adNetworkId: 'test-network',
      displayFrequency: 1,
    };

    mockAdManager.loadAd.mockResolvedValue({
      isLoading: false,
      adConfig: mockAdConfig,
      error: null,
      shouldShow: true,
    });

    render(<BannerAd onAdLoaded={onAdLoaded} />);

    await waitFor(() => {
      expect(onAdLoaded).toHaveBeenCalled();
    });
  });

  it('should call onAdError callback when ad fails to load', async () => {
    const onAdError = jest.fn();

    mockAdManager.loadAd.mockResolvedValue({
      isLoading: false,
      adConfig: null,
      error: 'Failed to load ad',
      shouldShow: false,
    });

    render(<BannerAd onAdError={onAdError} />);

    await waitFor(() => {
      expect(onAdError).toHaveBeenCalledWith('Failed to load ad');
    });
  });
});