// App Configuration
// Environment variables and constants

// Breez SDK Configuration
// Note: Get your API key from https://breez.technology
export const BREEZ_API_KEY = process.env.EXPO_PUBLIC_BREEZ_API_KEY || '';
export const BREEZ_STORAGE_DIR = 'breez_spark';

// Network Configuration
export const DEFAULT_NETWORK = 'mainnet';

// API Configuration
export const API_URL = process.env.EXPO_PUBLIC_API_URL || '';

// Feature Flags
export const ENABLE_BIOMETRICS = true;
export const ENABLE_ONCHAIN = false; // Spark only supports Lightning for now
