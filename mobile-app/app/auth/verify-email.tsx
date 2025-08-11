import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card, ActivityIndicator, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { authService } from '../../src/services/authService';
import { NetworkConfig } from '../../src/config/network';

export default function VerifyEmailScreen(): React.JSX.Element {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (token) {
      verifyEmail(token);
    } else {
      setVerificationResult({
        success: false,
        message: 'Invalid verification link. No token provided.',
      });
    }
  }, [token]);

  const verifyEmail = async (verificationToken: string): Promise<void> => {
    setIsVerifying(true);

    try {
      console.log('Verifying email with token:', verificationToken);

      // Call the backend verification endpoint
      const response = await fetch(`${NetworkConfig.getNetworkApiUrl()}/auth/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: verificationToken }),
      });

      const result = await response.json();
      console.log('Verification result:', result);

      if (response.ok && result.success) {
        setVerificationResult({
          success: true,
          message: result.data?.message || 'Email verified successfully!',
        });
      } else {
        setVerificationResult({
          success: false,
          message: result.error?.message || 'Email verification failed. Please try again.',
        });
      }
    } catch (error) {
      console.error('Email verification error:', error);
      setVerificationResult({
        success: false,
        message: 'Network error occurred. Please check your connection and try again.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleContinue = (): void => {
    if (verificationResult?.success) {
      // Navigate to login screen after successful verification
      router.replace('/auth/login');
    } else {
      // Navigate back to registration or home
      router.replace('/');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="headlineSmall" style={styles.title}>
              Email Verification
            </Text>

            {isVerifying ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" />
                <Text style={styles.loadingText}>Verifying your email...</Text>
              </View>
            ) : verificationResult ? (
              <View style={styles.resultContainer}>
                <View style={styles.iconContainer}>
                  <Text style={styles.resultIcon}>
                    {verificationResult.success ? '✅' : '❌'}
                  </Text>
                </View>

                <Text
                  variant="titleMedium"
                  style={[
                    styles.resultTitle,
                    verificationResult.success ? styles.successTitle : styles.errorTitle
                  ]}
                >
                  {verificationResult.success ? 'Verification Successful!' : 'Verification Failed'}
                </Text>

                <Text variant="bodyMedium" style={styles.resultMessage}>
                  {verificationResult.message}
                </Text>

                <Button
                  mode="contained"
                  onPress={handleContinue}
                  style={[
                    styles.continueButton,
                    verificationResult.success ? styles.successButton : styles.errorButton
                  ]}
                  contentStyle={styles.buttonContent}
                >
                  {verificationResult.success ? 'Continue to Login' : 'Go Back'}
                </Button>
              </View>
            ) : (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Preparing verification...</Text>
              </View>
            )}
          </Card.Content>
        </Card>
      </View>
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
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: 'white',
    elevation: 4,
  },
  title: {
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
    textAlign: 'center',
  },
  resultContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  iconContainer: {
    marginBottom: 16,
  },
  resultIcon: {
    fontSize: 48,
  },
  resultTitle: {
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: 'bold',
  },
  successTitle: {
    color: '#4CAF50',
  },
  errorTitle: {
    color: '#f44336',
  },
  resultMessage: {
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
    lineHeight: 20,
  },
  continueButton: {
    borderRadius: 8,
    minWidth: 200,
  },
  successButton: {
    backgroundColor: '#4CAF50',
  },
  errorButton: {
    backgroundColor: '#f44336',
  },
  buttonContent: {
    paddingVertical: 8,
  },
});