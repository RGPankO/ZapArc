// Wallet Welcome/Onboarding Screen
// First launch screen for setting up the Lightning wallet

import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

// Lightning bolt icon placeholder - in production, use actual asset
const LIGHTNING_ICON = '⚡';

export function WalletWelcomeScreen(): React.JSX.Element {
  const theme = useTheme();

  const handleCreateWallet = (): void => {
    router.push('/wallet/create');
  };

  const handleImportWallet = (): void => {
    router.push('/wallet/import');
  };

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.iconContainer}>
              <Text style={styles.lightningIcon}>{LIGHTNING_ICON}</Text>
            </View>
            
            <Text style={styles.title}>Zap Arc</Text>
            <Text style={styles.subtitle}>
              Your Lightning Network Wallet
            </Text>
          </View>

          {/* Features List */}
          <View style={styles.featuresContainer}>
            <FeatureItem
              icon="🔐"
              title="Secure & Private"
              description="Your keys, your coins. Fully self-custodial."
            />
            <FeatureItem
              icon="⚡"
              title="Instant Payments"
              description="Send and receive Bitcoin instantly via Lightning."
            />
            <FeatureItem
              icon="💼"
              title="Multi-Wallet"
              description="Manage multiple wallets with ease."
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={handleCreateWallet}
              style={styles.createButton}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
            >
              Create New Wallet
            </Button>

            <Button
              mode="outlined"
              onPress={handleImportWallet}
              style={styles.importButton}
              contentStyle={styles.buttonContent}
              labelStyle={styles.importButtonLabel}
            >
              Import Existing Wallet
            </Button>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By continuing, you agree to our Terms of Service
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

// Feature Item Component
interface FeatureItemProps {
  icon: string;
  title: string;
  description: string;
}

function FeatureItem({ icon, title, description }: FeatureItemProps): React.JSX.Element {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <View style={styles.featureText}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingVertical: 32,
  },
  heroSection: {
    alignItems: 'center',
    marginTop: 40,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#FFC107',
  },
  lightningIcon: {
    fontSize: 48,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  featuresContainer: {
    marginVertical: 40,
    gap: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
  },
  featureIcon: {
    fontSize: 28,
    marginRight: 16,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  buttonContainer: {
    gap: 16,
  },
  createButton: {
    borderRadius: 12,
    backgroundColor: '#FFC107',
  },
  buttonContent: {
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  importButton: {
    borderRadius: 12,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 1,
  },
  importButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footer: {
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
  },
});
