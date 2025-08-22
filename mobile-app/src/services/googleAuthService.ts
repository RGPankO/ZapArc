import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import { ApiResponse } from '../types';
import { authService } from './authService';

// Configure WebBrowser for better OAuth handling
WebBrowser.maybeCompleteAuthSession();

interface GoogleUser {
  id: string;
  name: string | null;
  email: string;
  picture: string | null;
  given_name: string | null;
  family_name: string | null;
}

class GoogleAuthService {
  private clientId = '925893032932-h51upcipo0iufoovp432c2tgd6ichei7.apps.googleusercontent.com';

  async signIn(): Promise<ApiResponse<any>> {
    try {
      // Use your actual Expo username for better redirect handling
      const redirectUri = 'https://auth.expo.io/@feef1bg/mobile-app';

      console.log('🔗 Redirect URI:', redirectUri);

      // Use Google's discovery document
      const discovery = {
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenEndpoint: 'https://oauth2.googleapis.com/token',
        revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
      };
      
      // Debug: Log the full OAuth URL
      const authUrl = `${discovery.authorizationEndpoint}?client_id=${this.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent('openid profile email')}&prompt=select_account`;
      console.log('🔗 Full OAuth URL:', authUrl);

      // Configure the auth request (without PKCE for now)
      const request = new AuthSession.AuthRequest({
        clientId: this.clientId,
        scopes: ['openid', 'profile', 'email'],
        responseType: AuthSession.ResponseType.Code,
        redirectUri: redirectUri,
        prompt: AuthSession.Prompt.SelectAccount,
      });

      // Start the auth session with explicit browser options
      const result = await request.promptAsync(discovery, {
        preferEphemeralSession: true,
      });

      console.log('🔍 Auth result:', result);
      console.log('🔍 Auth result type:', result.type);
      console.log('🔍 Auth result params:', result.params);

      if (result.type === 'success') {
        // Exchange the authorization code for tokens
        console.log('🔄 Starting token exchange with code:', result.params.code);
        
        const tokenResult = await AuthSession.exchangeCodeAsync(
          {
            clientId: this.clientId,
            code: result.params.code,
            redirectUri: redirectUri,
          },
          discovery
        );

        console.log('🎫 Token result:', tokenResult);
        console.log('🎫 ID Token present:', !!tokenResult.idToken);

        if (tokenResult.idToken) {
          // Send the ID token to your backend for verification
          const response = await authService.loginWithGoogle(tokenResult.idToken);
          return response;
        } else {
          return {
            success: false,
            error: {
              code: 'NO_ID_TOKEN',
              message: 'Failed to get ID token from Google'
            }
          };
        }
      } else if (result.type === 'cancel') {
        return {
          success: false,
          error: {
            code: 'SIGN_IN_CANCELLED',
            message: 'User cancelled the sign-in process'
          }
        };
      } else {
        console.log('❌ Auth failed:', result);
        return {
          success: false,
          error: {
            code: 'GOOGLE_SIGN_IN_ERROR',
            message: `Authentication failed: ${result.type}`
          }
        };
      }
    } catch (error: any) {
      console.error('Google Sign-In error:', error);
      return {
        success: false,
        error: {
          code: 'GOOGLE_SIGN_IN_ERROR',
          message: error.message || 'An error occurred during Google Sign-In'
        }
      };
    }
  }

  async signOut(): Promise<void> {
    // For Expo AuthSession, we don't need to do anything special for sign out
    console.log('Google Sign-Out completed');
  }

  async isSignedIn(): Promise<boolean> {
    // For Expo AuthSession, we rely on our backend token storage
    return false;
  }

  async getCurrentUser(): Promise<GoogleUser | null> {
    // For Expo AuthSession, we rely on our backend user data
    return null;
  }
}

export const googleAuthService = new GoogleAuthService();