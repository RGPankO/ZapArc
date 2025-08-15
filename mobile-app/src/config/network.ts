import { Platform } from 'react-native';

/**
 * Network configuration for different environments
 * Update CURRENT_NETWORK_IP when your network changes
 */
const CURRENT_NETWORK_IP = '192.168.6.199'; // Update this when your IP changes

export const NetworkConfig = {
  // Current network IP (update when network changes)
  NETWORK_IP: CURRENT_NETWORK_IP,

  // Backend port
  BACKEND_PORT: 3000,

  // Get base URLs for API calls based on platform
  getApiBaseUrls(): string[] {
    const urls = Platform.OS === 'web' ? [
      'http://localhost:3000/api',
      'http://127.0.0.1:3000/api',
      `http://${CURRENT_NETWORK_IP}:3000/api`
    ] : Platform.OS === 'android' ? [
      'http://10.0.2.2:3000/api', // Android emulator localhost
      `http://${CURRENT_NETWORK_IP}:3000/api`
    ] : [
      // iOS simulator and physical devices - prioritize network IP
      `http://${CURRENT_NETWORK_IP}:3000/api`,
      'http://localhost:3000/api'
    ];

    console.log('NetworkConfig: Platform:', Platform.OS);
    console.log('NetworkConfig: Available URLs:', urls);
    return urls;
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