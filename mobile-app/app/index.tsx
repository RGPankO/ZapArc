// App Entry Point
// Checks wallet existence and routes to appropriate screen

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from 'react-native-paper';
import { storageService } from '../src/services/storageService';

export default function AppEntry(): React.JSX.Element {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkWalletAndRoute(): Promise<void> {
      try {
        console.log('🚀 [AppEntry] Checking wallet existence...');
        
        // Check if any wallet exists
        const hasWallet = await storageService.walletExists();
        
        console.log('🚀 [AppEntry] Wallet exists:', hasWallet);
        
        if (hasWallet) {
          // Wallet exists - go to unlock/PIN screen
          console.log('🚀 [AppEntry] Routing to unlock screen');
          router.replace('/wallet/unlock');
        } else {
          // No wallet - show welcome/onboarding
          console.log('🚀 [AppEntry] Routing to welcome screen');
          router.replace('/wallet/welcome');
        }
      } catch (error) {
        console.error('❌ [AppEntry] Error checking wallet:', error);
        // On error, default to welcome screen
        router.replace('/wallet/welcome');
      } finally {
        setIsLoading(false);
      }
    }

    checkWalletAndRoute();
  }, []);

  // Show loading screen while checking
  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.logo}>⚡</Text>
        <Text style={styles.title}>Zap Arc</Text>
        <ActivityIndicator size="large" color="#FFC107" style={styles.loader} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 32,
  },
  loader: {
    marginTop: 16,
  },
});
