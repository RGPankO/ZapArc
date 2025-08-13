import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { InterstitialAd } from '../src/components';
import { useInterstitialAd } from '../src/hooks/useInterstitialAd';
import { useAuth } from '../src/hooks/useAuth';

export default function Index(): React.JSX.Element {
  const interstitialAd = useInterstitialAd();
  const { isAuthenticated, isLoading } = useAuth();

  // Remove the redirect logic to prevent sliding effect

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text variant="headlineMedium" style={styles.title}>
          Mobile App Skeleton
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          {isAuthenticated ? 'Welcome back!' : 'Choose a section to test:'}
        </Text>
        
        <View style={styles.buttonContainer}>
          {!isAuthenticated ? (
            <>
              <Button
                mode="contained"
                onPress={() => router.push('/auth/login')}
                style={styles.button}
              >
                Login
              </Button>
              <Button
                mode="outlined"
                onPress={() => router.push('/auth/register')}
                style={styles.button}
              >
                Register
              </Button>
            </>
          ) : (
            <>
              <Button
                mode="contained"
                onPress={() => router.push('/(main)/profile')}
                style={styles.button}
              >
                My Profile
              </Button>
              
              <Button
                mode="contained"
                onPress={() => router.push('/(main)/settings')}
                style={styles.button}
              >
                Settings
              </Button>
            </>
          )}
          
          <Button
            mode="outlined"
            onPress={interstitialAd.showAd}
            style={styles.button}
          >
            Show Interstitial Ad
          </Button>
          
          {isAuthenticated && (
            <Button
              mode="outlined"
              onPress={() => router.push('/auth/welcome')}
              style={styles.button}
            >
              Authentication Flow (Test)
            </Button>
          )}
        </View>
      </View>

      {/* Interstitial Ad */}
      <InterstitialAd
        visible={interstitialAd.isVisible}
        onClose={interstitialAd.hideAd}
        onAdLoaded={interstitialAd.onAdLoaded}
        onAdError={interstitialAd.onAdError}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  subtitle: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 32,
  },
  buttonContainer: {
    gap: 16,
  },
  button: {
    borderRadius: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
});