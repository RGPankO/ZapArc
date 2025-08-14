import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { ApiResponse } from '../types';
import { authService } from './authService';

interface GoogleUser {
  id: string;
  name: string | null;
  email: string;
  photo: string | null;
  familyName: string | null;
  givenName: string | null;
}

interface GoogleAuthResponse {
  user: GoogleUser;
  idToken: string | null;
  serverAuthCode: string | null;
}

class GoogleAuthService {
  private isConfigured = false;

  async configure(): Promise<void> {
    if (this.isConfigured) return;

    try {
      await GoogleSignin.configure({
        webClientId: '1234567890-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com', // Replace with your web client ID
        offlineAccess: true,
        hostedDomain: '',
        forceCodeForRefreshToken: true,
      });
      this.isConfigured = true;
      console.log('Google Sign-In configured successfully');
    } catch (error) {
      console.error('Error configuring Google Sign-In:', error);
      throw error;
    }
  }

  async signIn(): Promise<ApiResponse<any>> {
    try {
      await this.configure();
      
      // Check if device supports Google Play Services
      await GoogleSignin.hasPlayServices();
      
      // Sign in with Google
      const userInfo = await GoogleSignin.signIn();
      
      if (!userInfo.idToken) {
        return {
          success: false,
          error: {
            code: 'NO_ID_TOKEN',
            message: 'Failed to get ID token from Google'
          }
        };
      }

      // Send the ID token to your backend for verification
      const response = await authService.loginWithGoogle(userInfo.idToken);
      
      return response;
    } catch (error: any) {
      console.error('Google Sign-In error:', error);
      
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        return {
          success: false,
          error: {
            code: 'SIGN_IN_CANCELLED',
            message: 'User cancelled the sign-in process'
          }
        };
      } else if (error.code === statusCodes.IN_PROGRESS) {
        return {
          success: false,
          error: {
            code: 'SIGN_IN_IN_PROGRESS',
            message: 'Sign-in is already in progress'
          }
        };
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        return {
          success: false,
          error: {
            code: 'PLAY_SERVICES_NOT_AVAILABLE',
            message: 'Google Play Services not available'
          }
        };
      } else {
        return {
          success: false,
          error: {
            code: 'GOOGLE_SIGN_IN_ERROR',
            message: error.message || 'An error occurred during Google Sign-In'
          }
        };
      }
    }
  }

  async signOut(): Promise<void> {
    try {
      await GoogleSignin.signOut();
      console.log('Google Sign-Out successful');
    } catch (error) {
      console.error('Google Sign-Out error:', error);
    }
  }

  async isSignedIn(): Promise<boolean> {
    try {
      return await GoogleSignin.isSignedIn();
    } catch (error) {
      console.error('Error checking Google sign-in status:', error);
      return false;
    }
  }

  async getCurrentUser(): Promise<GoogleUser | null> {
    try {
      const userInfo = await GoogleSignin.getCurrentUser();
      return userInfo?.user || null;
    } catch (error) {
      console.error('Error getting current Google user:', error);
      return null;
    }
  }
}

export const googleAuthService = new GoogleAuthService();