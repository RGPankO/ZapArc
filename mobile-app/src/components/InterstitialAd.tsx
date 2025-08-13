import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { adManager, AdDisplayState } from '../services/adManager';
import { AdType } from '../types';
import { COLORS, SPACING } from '../utils/constants';

interface InterstitialAdProps {
  visible: boolean;
  onClose: () => void;
  onAdLoaded?: () => void;
  onAdError?: (error: string) => void;
}

export const InterstitialAd: React.FC<InterstitialAdProps> = ({
  visible,
  onClose,
  onAdLoaded,
  onAdError,
}) => {
  const [adState, setAdState] = useState<AdDisplayState>({
    isLoading: true,
    adConfig: null,
    error: null,
    shouldShow: false,
  });
  const [showCloseButton, setShowCloseButton] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);

  useEffect(() => {
    if (visible) {
      loadAd();
    }
  }, [visible]);

  useEffect(() => {
    if (adState.adConfig && adState.shouldShow && visible) {
      // Simulate video ad duration (5 seconds)
      const duration = 5000;
      const interval = 100;
      let elapsed = 0;

      const timer = setInterval(() => {
        elapsed += interval;
        const progress = Math.min(elapsed / duration, 1);
        setVideoProgress(progress);

        if (progress >= 1) {
          setShowCloseButton(true);
          clearInterval(timer);
        }
      }, interval);

      return () => clearInterval(timer);
    }
  }, [adState.adConfig, adState.shouldShow, visible]);

  const loadAd = async () => {
    try {
      setAdState({
        isLoading: true,
        adConfig: null,
        error: null,
        shouldShow: false,
      });
      setShowCloseButton(false);
      setVideoProgress(0);

      const state = await adManager.loadAd(AdType.INTERSTITIAL);
      setAdState(state);

      if (state.adConfig && state.shouldShow) {
        // Track impression
        await adManager.trackImpression(state.adConfig);
        onAdLoaded?.();
      } else if (state.error) {
        console.log('InterstitialAd: Ad loading failed, but not showing error to user:', state.error);
        // Don't call onAdError to avoid showing error popups
        onClose(); // Close modal if no ad to show
      } else {
        console.log('InterstitialAd: User should not see ads (premium user)');
        onClose(); // Close modal if user shouldn't see ads
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
      onClose();
    }
  };

  const handleClose = async () => {
    if (adState.adConfig) {
      await adManager.trackClose(adState.adConfig);
    }
    onClose();
  };

  const handleAdPress = async () => {
    if (adState.adConfig) {
      await adManager.trackClick(adState.adConfig);
      // In a real implementation, this would open the ad URL or perform the ad action
      console.log('Interstitial ad clicked:', adState.adConfig.adNetworkId);
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={showCloseButton ? handleClose : undefined}
    >
      <View style={styles.container}>
        {/* Always reserve space for close button to prevent layout shift */}
        <View style={styles.closeButtonPlaceholder} />

        <View style={styles.contentArea}>
          {adState.isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading advertisement...</Text>
            </View>
          ) : adState.error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Failed to load advertisement</Text>
              <Pressable style={styles.retryButton} onPress={loadAd}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </Pressable>
            </View>
          ) : adState.adConfig && adState.shouldShow ? (
            <View style={styles.adContainer}>
              {/* Video placeholder */}
              <Pressable style={styles.videoContainer} onPress={handleAdPress}>
                <View style={styles.videoPlaceholder}>
                  <Text style={styles.videoText}>🎥</Text>
                  <Text style={styles.videoTitle}>Sample Video Advertisement</Text>
                  <Text style={styles.videoSubtitle}>
                    Network: {adState.adConfig.adNetworkId}
                  </Text>
                  <Text style={styles.tapToLearnMore}>Tap to learn more</Text>
                </View>
              </Pressable>

              {/* Progress bar */}
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${videoProgress * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {Math.round(videoProgress * 100)}%
                </Text>
              </View>

              {/* Ad info */}
              <View style={styles.adInfo}>
                <Text style={styles.adLabel}>Advertisement</Text>
                {/* Always reserve space for wait text to prevent layout shift */}
                <View style={styles.waitTextContainer}>
                  {!showCloseButton ? (
                    <Text style={styles.adWaitText}>
                      Please wait {Math.ceil((1 - videoProgress) * 5)} seconds...
                    </Text>
                  ) : (
                    <Text style={styles.adWaitTextPlaceholder}> </Text>
                  )}
                </View>
              </View>
            </View>
          ) : null}
        </View>

        {/* Close button - positioned absolutely outside SafeAreaView */}
        {showCloseButton && (
          <Pressable
            style={styles.closeButtonAbsolute}
            onPress={handleClose}
            android_ripple={{ color: COLORS.surface + '50' }}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </Pressable>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.text,
  },
  closeButtonPlaceholder: {
    height: 100, // Reserve space for close button area
    backgroundColor: 'transparent',
  },
  contentArea: {
    flex: 1,
  },
  closeButtonAbsolute: {
    position: 'absolute',
    top: 60,
    right: SPACING.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface + '90',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.text,
  },
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.surface,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.text,
    padding: SPACING.lg,
  },
  errorText: {
    color: COLORS.surface,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  adContainer: {
    flex: 1,
    backgroundColor: COLORS.text,
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlaceholder: {
    alignItems: 'center',
    padding: SPACING.xl,
  },
  videoText: {
    fontSize: 80,
    marginBottom: SPACING.lg,
  },
  videoTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.surface,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  videoSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  tapToLearnMore: {
    fontSize: 14,
    color: COLORS.primary,
    textAlign: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.textSecondary + '50',
    borderRadius: 2,
    marginRight: SPACING.md,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  progressText: {
    color: COLORS.surface,
    fontSize: 12,
    minWidth: 35,
    textAlign: 'right',
  },
  adInfo: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  adLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.xs,
  },
  waitTextContainer: {
    minHeight: 20, // Reserve minimum height for wait text
    justifyContent: 'center',
  },
  adWaitText: {
    fontSize: 14,
    color: COLORS.surface,
    textAlign: 'center',
  },
  adWaitTextPlaceholder: {
    fontSize: 14,
    color: 'transparent', // Invisible but takes up space
    textAlign: 'center',
  },
});