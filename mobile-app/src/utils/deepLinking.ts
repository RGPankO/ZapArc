import { Linking } from 'react-native';
import { router } from 'expo-router';

export interface DeepLinkParams {
  token?: string;
  [key: string]: string | undefined;
}

/**
 * Parse URL parameters from a deep link
 */
export function parseDeepLinkParams(url: string): DeepLinkParams {
  try {
    const urlObj = new URL(url);
    const params: DeepLinkParams = {};
    
    urlObj.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    
    return params;
  } catch (error) {
    console.error('Error parsing deep link params:', error);
    return {};
  }
}

/**
 * Handle deep link navigation
 */
export function handleDeepLink(url: string): boolean {
  try {
    console.log('Handling deep link:', url);
    
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    const params = parseDeepLinkParams(url);
    
    switch (path) {
      case '/verify-email':
        if (params.token) {
          console.log('Navigating to email verification with token:', params.token);
          router.push({
            pathname: '/auth/verify-email',
            params: { token: params.token }
          });
          return true;
        }
        break;
        
      case '/reset-password':
        if (params.token) {
          console.log('Navigating to password reset with token:', params.token);
          router.push({
            pathname: '/auth/reset-password',
            params: { token: params.token }
          });
          return true;
        }
        break;
        
      default:
        console.log('Unknown deep link path:', path);
        // Navigate to home screen for unknown paths
        router.push('/');
        return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error handling deep link:', error);
    return false;
  }
}

/**
 * Initialize deep link handling
 */
export function initializeDeepLinking(): void {
  // Handle deep links when app is already running
  Linking.addEventListener('url', (event) => {
    console.log('Deep link received while app running:', event.url);
    handleDeepLink(event.url);
  });

  // Handle deep links when app is launched from closed state
  Linking.getInitialURL().then((url) => {
    if (url) {
      console.log('Deep link received on app launch:', url);
      // Add a small delay to ensure the app is fully loaded
      setTimeout(() => {
        handleDeepLink(url);
      }, 1000);
    }
  }).catch((error) => {
    console.error('Error getting initial deep link URL:', error);
  });
}

/**
 * Check if a URL is a valid deep link for this app
 */
export function isValidDeepLink(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'mobile-app:';
  } catch {
    return false;
  }
}