import React, { useState } from 'react';
import { StyleSheet, Alert, ViewStyle } from 'react-native';
import { Button } from 'react-native-paper';
import { useGoogleSignIn, GoogleSignInError } from '../hooks/useGoogleAuth';
import { router } from 'expo-router';

interface GoogleSignInButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  mode?: 'contained' | 'outlined' | 'text';
  style?: ViewStyle;
}

export default function GoogleSignInButton({
  onSuccess,
  onError,
  mode = 'outlined',
  style,
}: GoogleSignInButtonProps): React.JSX.Element {
  const { signIn, isReady, isLoading } = useGoogleSignIn();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleGoogleSignIn = async (): Promise<void> => {
    setIsSigningIn(true);
    try {
      await signIn();

      console.log('Google login successful');
      onSuccess?.();
      // Navigate to main app
      router.replace('/(main)');
    } catch (error: unknown) {
      const googleError = error as GoogleSignInError;
      const errorMessage = googleError.message || 'Google sign-in failed';
      console.error('Google sign-in error:', error);

      // Don't show alert for user cancellation
      if (googleError.code !== 'SIGN_IN_CANCELLED') {
        Alert.alert('Sign-in Error', errorMessage);
      }

      onError?.(errorMessage);
    } finally {
      setIsSigningIn(false);
    }
  };

  const loading = isLoading || isSigningIn;

  return (
    <Button
      mode={mode}
      onPress={handleGoogleSignIn}
      loading={loading}
      disabled={loading || !isReady}
      style={[styles.button, style]}
      icon="google"
    >
      {loading ? 'Signing in...' : 'Continue with Google'}
    </Button>
  );
}

const styles = StyleSheet.create({
  button: {
    marginVertical: 8,
  },
});
