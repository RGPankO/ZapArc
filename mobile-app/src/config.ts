// App Configuration
// Environment variables and constants

// Breez SDK Configuration
// Re-export from dedicated breez config file
export { BREEZ_API_KEY, BREEZ_STORAGE_DIR } from './config/breezConfig';

// Network Configuration
export const DEFAULT_NETWORK = 'mainnet';

// API Configuration
export const API_URL = process.env.EXPO_PUBLIC_API_URL || '';

// Feature Flags
export const ENABLE_BIOMETRICS = true;
export const ENABLE_ONCHAIN = false; // Spark only supports Lightning for now
