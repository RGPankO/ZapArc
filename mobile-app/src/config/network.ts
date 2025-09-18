import { Platform } from 'react-native';

/**
 * Network configuration for different environments
 * Update CURRENT_NETWORK_IP when your network changes
 */
const CURRENT_NETWORK_IP = '10.0.0.184'; // Update this when your IP changes

export const NetworkConfig = {
  // Current network IP (update when network changes)
  NETWORK_IP: CURRENT_NETWORK_IP,

  // Backend port
  BACKEND_PORT: 3000,

  // Get base URLs for API calls based on platform
  getApiBaseUrls(): string[] {
    if (Platform.OS === 'web') {
      return [
        'http://localhost:3000/api',
        'http://127.0.0.1:3000/api',
        `http://${CURRENT_NETWORK_IP}:3000/api`
      ];
    }
    
    if (Platform.OS === 'android') {
      // For Android, prioritize network IP for physical devices
      // Only use emulator IP as fallback
      return [
        `http://${CURRENT_NETWORK_IP}:3000/api`, // Network IP first (works for physical devices)
        'http://10.0.2.2:3000/api', // Android emulator localhost as fallback
      ];
    }
    
    // iOS simulator and physical devices - prioritize network IP
    return [
      `http://${CURRENT_NETWORK_IP}:3000/api`,
      'http://localhost:3000/api'
    ];
  },

  // Get single API base URL (first preference)
  getApiBaseUrl(): string {
    return this.getApiBaseUrls()[0];
  },

  // Get network API URL specifically
  getNetworkApiUrl(): string {
    return `http://${CURRENT_NETWORK_IP}:3000/api`;
  }
};

export default NetworkConfig;