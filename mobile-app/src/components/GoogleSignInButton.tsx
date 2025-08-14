import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { googleAuthService } from '../services/googleAuthService';
import { tokenService } from '../services/tokenService';
import { router } from 'expo-router';

interface GoogleSignInButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  mode?: 'contained' | 'outlined' | 'text';
  style?: any;
}

export default function GoogleSignInButton({
  onSuccess,
  onError,
  mode = 'outlined',
  style,
}: GoogleSignInButtonProps): React.JSX.Element {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async (): Promise<void> => {
    setIsLoading(true);
    
    try {
      const response = await googleAuthService.signIn();
      
      if (response.success && response.data) {
        // Store tokens
        const tokenResult = await tokenService.storeTokens(
          response.data.tokens.accessToken,
          response.data.tokens.refreshToken
        );
        
        if (tokenResult.success) {
          console.log('✅ Google login successful, tokens stored');
          onSuccess?.();
          // Navigate to main app
          router.replace('/(main)');
        } else {
          console.error('Error storing tokens:', tokenResult.error);
          // Still navigate even if token storage had issues
          router.replace('/(main)');
        }
      } else {
        const errorMessage = response.error?.message || 'Google sign-in failed';
        console.error('Google sign-in error:', errorMessage);
        
        // Don't show alert for user cancellation
        if (response.error?.code !== 'SIGN_IN_CANCELLED') {
          Alert.alert('Sign-in Error', errorMessage);
        }
        
        onError?.(errorMessage);
      }
    } catch (error: any) {
      const errorMessage = error.message || 'An unexpected error occurred';
      console.error('Google sign-in error:', error);
      Alert.alert('Sign-in Error', errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      mode={mode}
      onPress={handleGoogleSignIn}
      loading={isLoading}
      disabled={isLoading}
      style={[styles.button, style]}
      icon="google"
    >
      {isLoading ? 'Signing in...' : 'Continue with Google'}
    </Button>
  );
}

const styles = StyleSheet.create({
  button: {
    marginVertical: 8,
  },
});