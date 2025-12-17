import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useGoogleLogin } from './useAuth';

// Configure WebBrowser for better OAuth handling
WebBrowser.maybeCompleteAuthSession();

export interface GoogleSignInError {
  code: string;
  message: string;
}

/**
 * Hook to handle Google Sign-In OAuth flow
 * Uses Expo AuthSession for OAuth and the useGoogleLogin hook for backend authentication
 */
export function useGoogleSignIn() {
  const queryClient = useQueryClient();
  const googleLogin = useGoogleLogin();

  return useMutation({
    mutationFn: async () => {
      try {
        const clientId = '925893032932-h51upcipo0iufoovp432c2tgd6ichei7.apps.googleusercontent.com';
        const redirectUri = 'https://auth.expo.io/@feef1bg/mobile-app';

        console.log('🔗 Redirect URI:', redirectUri);

        // Use Google's discovery document
        const discovery = {
          authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
          tokenEndpoint: 'https://oauth2.googleapis.com/token',
          revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
        };

        // Debug: Log the full OAuth URL
        const authUrl = `${discovery.authorizationEndpoint}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent('openid profile email')}&prompt=select_account`;
        console.log('🔗 Full OAuth URL:', authUrl);

        // Configure the auth request
        const request = new AuthSession.AuthRequest({
          clientId: clientId,
          scopes: ['openid', 'profile', 'email'],
          responseType: AuthSession.ResponseType.Code,
          redirectUri: redirectUri,
          prompt: AuthSession.Prompt.SelectAccount,
        });

        // Start the auth session
        const result = await request.promptAsync(discovery, {
          preferEphemeralSession: true,
        });

        console.log('🔍 Auth result:', result);
        console.log('🔍 Auth result type:', result.type);
        console.log('🔍 Auth result params:', 'params' in result ? result.params : 'N/A');

        if (result.type === 'success') {
          // Exchange the authorization code for tokens
          console.log('🔄 Starting token exchange with code:', 'params' in result ? result.params.code : 'N/A');

          const tokenResult = await AuthSession.exchangeCodeAsync(
            {
              clientId: clientId,
              code: 'params' in result ? result.params.code : '',
              redirectUri: redirectUri,
            },
            discovery
          );

          console.log('🎫 Token result:', tokenResult);
          console.log('🎫 ID Token present:', !!tokenResult.idToken);

          if (tokenResult.idToken) {
            // Send the ID token to backend using useGoogleLogin hook
            const authResponse = await googleLogin.mutateAsync(tokenResult.idToken);
            console.log('✅ Google Sign-In successful');
            return authResponse;
          } else {
            const error: GoogleSignInError = {
              code: 'NO_ID_TOKEN',
              message: 'Failed to get ID token from Google',
            };
            throw error;
          }
        } else if (result.type === 'cancel') {
          const error: GoogleSignInError = {
            code: 'SIGN_IN_CANCELLED',
            message: 'User cancelled the sign-in process',
          };
          throw error;
        } else {
          console.log('❌ Auth failed:', result);
          const error: GoogleSignInError = {
            code: 'GOOGLE_SIGN_IN_ERROR',
            message: `Authentication failed: ${result.type}`,
          };
          throw error;
        }
      } catch (error: unknown) {
        console.error('Google Sign-In error:', error);
        
        // Re-throw if it's already our error format
        if (typeof error === 'object' && error !== null && 'code' in error && 'message' in error) {
          throw error;
        }
        
        // Otherwise wrap it
        const wrappedError: GoogleSignInError = {
          code: 'GOOGLE_SIGN_IN_ERROR',
          message: (error as Error).message || 'An error occurred during Google Sign-In',
        };
        throw wrappedError;
      }
    },
    onSuccess: () => {
      // Invalidate relevant queries on success
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
}
