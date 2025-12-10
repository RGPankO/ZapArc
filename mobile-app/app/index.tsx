import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { InterstitialAd } from '../src/components';
import { useInterstitialAd } from '../src/hooks/useInterstitialAd';
import { useAuth } from '../src/hooks/useAuth';
import { useUsers } from '../src/hooks/useUsers';

export default function Index(): React.JSX.Element {
  const interstitialAd = useInterstitialAd();
  const { isAuthenticated, isLoading, checkAuth } = useAuth();
  const users = useUsers();

  // Log when component mounts and hook is initialized
  useEffect(() => {
    console.log('🚀 Index component mounted - useUsers hook initialized');
    console.log('Initial hook state:', {
      isLoading: users.isLoading,
      hasUser: !!users.user,
      isError: users.isError,
    });
  }, []);

  // Log useUsers hook state changes
  useEffect(() => {
    console.log('=== useUsers Hook State ===');
    console.log('isLoading:', users.isLoading);
    console.log('isError:', users.isError);
    console.log('user data:', users.user);
    console.log('error:', users.error);
    console.log('isUpdating:', users.isUpdating);
    console.log('isChangingPassword:', users.isChangingPassword);
    console.log('isDeleting:', users.isDeleting);
    console.log('==========================');
  }, [
    users.isLoading,
    users.isError,
    users.user,
    users.error,
    users.isUpdating,
    users.isChangingPassword,
    users.isDeleting,
  ]);

  // Log when user data changes
  useEffect(() => {
    if (users.user) {
      console.log('✅ User profile loaded successfully:', {
        id: users.user.id,
        nickname: users.user.nickname,
        email: users.user.email,
        isVerified: users.user.isVerified,
        premiumStatus: users.user.premiumStatus,
      });
    }
  }, [users.user]);

  // Log errors
  useEffect(() => {
    if (users.error) {
      console.error('❌ useUsers error:', users.error);
    }
  }, [users.error]);

  // Redirect to welcome page if not authenticated (without animation)
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Use replace with no animation to prevent slide effect
      router.replace('/auth/welcome');
    }
  }, [isAuthenticated, isLoading]);

  const handleLogout = async (): Promise<void> => {
    try {
      const { tokenService } = await import('../src/services/tokenService');
      await tokenService.clearAuth();
      // Refresh auth state
      await checkAuth();
    } catch (error) {
      console.error('Logout error:', error);
      // Even if there's an error, try to refresh auth state
      await checkAuth();
    }
  };

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

  // If not authenticated, show nothing while redirecting
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Only show the main app if authenticated
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text variant="headlineMedium" style={styles.title}>
          Mobile App Skeleton
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Welcome back!
        </Text>

        {/* User Profile Info from useUsers hook */}
        {users.user && (
          <View style={styles.userInfoContainer}>
            <Text variant="bodySmall" style={styles.userInfoText}>
              Logged in as: {users.user.nickname} ({users.user.email})
            </Text>
            {users.isLoading && (
              <Text variant="bodySmall" style={styles.userInfoText}>
                Refreshing profile...
              </Text>
            )}
          </View>
        )}

        <View style={styles.buttonContainer}>
          <Button
            mode="outlined"
            onPress={() => {
              console.log('🔄 Manual refetch triggered');
              users.refetch();
            }}
            style={styles.button}
            disabled={users.isLoading}
          >
            {users.isLoading ? 'Loading...' : 'Refresh Profile'}
          </Button>
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

          <Button
            mode="outlined"
            onPress={interstitialAd.showAd}
            style={styles.button}
          >
            Show Interstitial Ad
          </Button>

          <Button
            mode="outlined"
            onPress={handleLogout}
            style={styles.button}
          >
            Logout
          </Button>
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
    marginBottom: 16,
  },
  userInfoContainer: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    alignItems: 'center',
  },
  userInfoText: {
    color: '#1976d2',
    textAlign: 'center',
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