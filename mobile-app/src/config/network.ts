import { Platform } from 'react-native';

/**
 * Network configuration using environment variables.
 * Configure API URLs in .env file (copy from .env.example).
 */
export const NetworkConfig = {
  /**
   * Get the API base URL for the current platform.
   * Uses EXPO_PUBLIC_API_URL_WEB, EXPO_PUBLIC_API_URL_ANDROID, or EXPO_PUBLIC_API_URL_IOS
   * based on the platform.
   */
  getApiBaseUrl(): string {
    if (Platform.OS === 'web') {
      return process.env.EXPO_PUBLIC_API_URL_WEB || 'http://127.0.0.1:3000/api';
    }

    if (Platform.OS === 'android') {
      return process.env.EXPO_PUBLIC_API_URL_ANDROID || 'http://10.0.2.2:3000/api';
    }

    // iOS
    return process.env.EXPO_PUBLIC_API_URL_IOS || 'http://localhost:3000/api';
  },
};

export default NetworkConfig;
