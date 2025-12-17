import React from 'react';
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
  const googleSignIn = useGoogleSignIn();

  const handleGoogleSignIn = async (): Promise<void> => {
    try {
      await googleSignIn.mutateAsync();
      
      console.log('✅ Google login successful');
      onSuccess?.();
      // Navigate to main app
      router.replace('/(main)');
    } catch (error: unknown) {
      const errorMessage = (error as GoogleSignInError).message || 'Google sign-in failed';
      console.error('Google sign-in error:', error);
      
      // Don't show alert for user cancellation
      if ((error as GoogleSignInError).code !== 'SIGN_IN_CANCELLED') {
        Alert.alert('Sign-in Error', errorMessage);
      }
      
      onError?.(errorMessage);
    }
  };

  return (
    <Button
      mode={mode}
      onPress={handleGoogleSignIn}
      loading={googleSignIn.isPending}
      disabled={googleSignIn.isPending}
      style={[styles.button, style]}
      icon="google"
    >
      {googleSignIn.isPending ? 'Signing in...' : 'Continue with Google'}
    </Button>
  );
}

const styles = StyleSheet.create({
  button: {
    marginVertical: 8,
  },
});