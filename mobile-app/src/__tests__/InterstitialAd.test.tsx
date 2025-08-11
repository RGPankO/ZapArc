import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { InterstitialAd } from '../components/InterstitialAd';
import { adManager } from '../services/adManager';
import { AdType } from '../types';

// Mock the ad manager
jest.mock('../services/adManager', () => ({
  adManager: {
    loadAd: jest.fn(),
    trackImpression: jest.fn(),
    trackClick: jest.fn(),
    trackClose: jest.fn(),
  },
}));

const mockAdManager = adManager as jest.Mocked<typeof adManager>;

describe('InterstitialAd', () => {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    onAdLoaded: jest.fn(),
    onAdError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render loading state initially when visible', async () => {
    mockAdManager.loadAd.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        isLoading: false,
        adConfig: null,
        error: null,
        shouldShow: false,
      }), 100))
    );

    const { getByText } = render(<InterstitialAd {...defaultProps} />);
    
    expect(getByText('Loading advertisement...')).toBeTruthy();
  });

  it('should render ad when loaded successfully', async () => {
    const mockAdConfig = {
      id: '1',
      adType: AdType.INTERSTITIAL,
      adNetworkId: 'test-network',
      displayFrequency: 1,
    };

    mockAdManager.loadAd.mockResolvedValue({
      isLoading: false,
      adConfig: mockAdConfig,
      error: null,
      shouldShow: true,
    });

    const { getByText } = render(<InterstitialAd {...defaultProps} />);

    await waitFor(() => {
      expect(getByText('Sample Video Advertisement')).toBeTruthy();
      expect(getByText('Network: test-network')).toBeTruthy();
    });

    expect(mockAdManager.loadAd).toHaveBeenCalledWith(AdType.INTERSTITIAL);
    expect(mockAdManager.trackImpression).toHaveBeenCalledWith(mockAdConfig);
  });

  it('should show close button after video completes', async () => {
    const mockAdConfig = {
      id: '1',
      adType: AdType.INTERSTITIAL,
      adNetworkId: 'test-network',
      displayFrequency: 1,
    };

    mockAdManager.loadAd.mockResolvedValue({
      isLoading: false,
      adConfig: mockAdConfig,
      error: null,
      shouldShow: true,
    });

    const { getByText, queryByText } = render(<InterstitialAd {...defaultProps} />);

    await waitFor(() => {
      expect(getByText('Sample Video Advertisement')).toBeTruthy();
    });

    // Initially, close button should not be visible
    expect(queryByText('✕')).toBeNull();

    // Fast forward time to complete the video
    jest.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(getByText('✕')).toBeTruthy();
    });
  });

  it('should call onClose when close button is pressed', async () => {
    const onClose = jest.fn();
    const mockAdConfig = {
      id: '1',
      adType: AdType.INTERSTITIAL,
      adNetworkId: 'test-network',
      displayFrequency: 1,
    };

    mockAdManager.loadAd.mockResolvedValue({
      isLoading: false,
      adConfig: mockAdConfig,
      error: null,
      shouldShow: true,
    });

    const { getByText } = render(
      <InterstitialAd {...defaultProps} onClose={onClose} />
    );

    await waitFor(() => {
      expect(getByText('Sample Video Advertisement')).toBeTruthy();
    });

    // Fast forward time to show close button
    jest.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(getByText('✕')).toBeTruthy();
    });

    fireEvent.press(getByText('✕'));

    expect(mockAdManager.trackClose).toHaveBeenCalledWith(mockAdConfig);
    expect(onClose).toHaveBeenCalled();
  });

  it('should call onClose when user should not see ads', async () => {
    const onClose = jest.fn();

    mockAdManager.loadAd.mockResolvedValue({
      isLoading: false,
      adConfig: null,
      error: null,
      shouldShow: false,
    });

    render(<InterstitialAd {...defaultProps} onClose={onClose} />);

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('should call onAdError and onClose when ad fails to load', async () => {
    const onClose = jest.fn();
    const onAdError = jest.fn();

    mockAdManager.loadAd.mockResolvedValue({
      isLoading: false,
      adConfig: null,
      error: 'Failed to load ad',
      shouldShow: false,
    });

    render(
      <InterstitialAd {...defaultProps} onClose={onClose} onAdError={onAdError} />
    );

    await waitFor(() => {
      expect(onAdError).toHaveBeenCalledWith('Failed to load ad');
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('should not render when not visible', () => {
    const { queryByText } = render(
      <InterstitialAd {...defaultProps} visible={false} />
    );

    expect(queryByText('Loading advertisement...')).toBeNull();
    expect(mockAdManager.loadAd).not.toHaveBeenCalled();
  });
});