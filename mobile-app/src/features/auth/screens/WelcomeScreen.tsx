import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BannerAd } from '../../ads';

export function WelcomeScreen(): React.JSX.Element {
  const handleLogin = (): void => {
    router.push('/auth/login');
  };

  const handleRegister = (): void => {
    router.push('/auth/register');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoText}>LOGO</Text>
          </View>
        </View>

        <View style={styles.titleContainer}>
          <Text variant="headlineLarge" style={styles.title}>
            Welcome to App
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Your customizable mobile experience
          </Text>
        </View>

        <BannerAd
          style={styles.bannerAd}
          onAdLoaded={() => console.log('Banner ad loaded')}
          onAdError={(error) => console.log('Banner ad error:', error)}
        />

        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={handleLogin}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            Login
          </Button>

          <Button
            mode="outlined"
            onPress={handleRegister}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            Register
          </Button>
        </View>

        <View style={styles.brandingContainer}>
          <Text variant="bodySmall" style={styles.brandingText}>
            Powered by White-Label Framework
          </Text>
        </View>
      </View>
    </SafeAreaView>
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
    paddingHorizontal: 32,
  },
  logoContainer: {
    marginBottom: 48,
  },
  logoPlaceholder: {
    width: 120,
    height: 120,
    backgroundColor: '#e0e0e0',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#bdbdbd',
    borderStyle: 'dashed',
  },
  logoText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#757575',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  subtitle: {
    textAlign: 'center',
    color: '#666',
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  button: {
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  brandingContainer: {
    position: 'absolute',
    bottom: 32,
    alignItems: 'center',
  },
  brandingText: {
    color: '#999',
    textAlign: 'center',
  },
  bannerAd: {
    width: '100%',
    marginBottom: 24,
  },
});
