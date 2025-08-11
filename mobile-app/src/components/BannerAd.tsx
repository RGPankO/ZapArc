import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable, Dimensions } from 'react-native';
import { adManager, AdDisplayState } from '../services/adManager';
import { AdType } from '../types';
import { COLORS, SPACING } from '../utils/constants';

interface BannerAdProps {
  style?: any;
  onAdLoaded?: () => void;
  onAdError?: (error: string) => void;
}

export const BannerAd: React.FC<BannerAdProps> = ({
  style,
  onAdLoaded,
  onAdError,
}) => {
  const [adState, setAdState] = useState<AdDisplayState>({
    isLoading: true,
    adConfig: null,
    error: null,
    shouldShow: false,
  });

  useEffect(() => {
    loadAd();
  }, []);

  const loadAd = async () => {
    try {
      const state = await adManager.loadAd(AdType.BANNER);
      setAdState(state);

      if (state.adConfig && state.shouldShow) {
        // Track impression
        await adManager.trackImpression(state.adConfig);
        onAdLoaded?.();
      } else if (state.error) {
        onAdError?.(state.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load ad';
      setAdState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        shouldShow: false,
      }));
      onAdError?.(errorMessage);
    }
  };

  const handleAdPress = async () => {
    if (adState.adConfig) {
      await adManager.trackClick(adState.adConfig);
      // In a real implementation, this would open the ad URL or perform the ad action
      console.log('Banner ad clicked:', adState.adConfig.adNetworkId);
    }
  };

  // Don't render anything if user shouldn't see ads or there's no ad
  if (!adState.shouldShow || !adState.adConfig) {
    return null;
  }

  if (adState.isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, style]}>
        <ActivityIndicator size="small" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading ad...</Text>
      </View>
    );
  }

  if (adState.error) {
    return null; // Silently fail for better user experience
  }

  return (
    <View style={[styles.container, style]}>
      <Pressable
        style={styles.adContainer}
        onPress={handleAdPress}
        android_ripple={{ color: COLORS.primary + '20' }}
      >
        <View style={styles.adContent}>
          <Text style={styles.adLabel}>Advertisement</Text>
          <Text style={styles.adText}>
            Sample Banner Ad - Network: {adState.adConfig.adNetworkId}
          </Text>
          <Text style={styles.adSubtext}>
            Tap to learn more
          </Text>
        </View>
      </Pressable>
    </View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: SPACING.sm,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.textSecondary + '30',
  },
  loadingText: {
    marginLeft: SPACING.sm,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  adContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.textSecondary + '30',
    overflow: 'hidden',
  },
  adContent: {
    padding: SPACING.md,
    minHeight: 80,
    justifyContent: 'center',
  },
  adLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.xs,
  },
  adText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  adSubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});