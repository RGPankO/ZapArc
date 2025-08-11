import { useState, useCallback } from 'react';

export interface InterstitialAdState {
  isVisible: boolean;
  isLoading: boolean;
}

export const useInterstitialAd = () => {
  const [state, setState] = useState<InterstitialAdState>({
    isVisible: false,
    isLoading: false,
  });

  const showAd = useCallback(() => {
    setState(prev => ({
      ...prev,
      isVisible: true,
      isLoading: true,
    }));
  }, []);

  const hideAd = useCallback(() => {
    setState(prev => ({
      ...prev,
      isVisible: false,
      isLoading: false,
    }));
  }, []);

  const onAdLoaded = useCallback(() => {
    setState(prev => ({
      ...prev,
      isLoading: false,
    }));
  }, []);

  const onAdError = useCallback((error: string) => {
    console.error('Interstitial ad error:', error);
    setState(prev => ({
      ...prev,
      isVisible: false,
      isLoading: false,
    }));
  }, []);

  return {
    ...state,
    showAd,
    hideAd,
    onAdLoaded,
    onAdError,
  };
};