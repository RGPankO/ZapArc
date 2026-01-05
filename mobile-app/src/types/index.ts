// Core shared types that are used across multiple features or are fundamental to the app

export enum PremiumStatus {
  FREE = 'FREE',
  PREMIUM_SUBSCRIPTION = 'PREMIUM_SUBSCRIPTION',
  PREMIUM_LIFETIME = 'PREMIUM_LIFETIME',
}

export interface AppTheme {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  logoUrl?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// Re-export feature-specific types for backwards compatibility
export { AdType, AdAction, AdConfig, AdAnalyticsData } from '../features/ads/types';
export { User } from '../features/profile/types';
export { PaymentPlan } from '../features/payments/types';

// Wallet feature types
export type {
  // Encrypted data
  EncryptedData,
  // Sub-wallet types
  SubWalletEntry,
  // Master key types
  MasterKeyMetadata,
  MasterKeyEntry,
  // Multi-wallet storage
  MultiWalletStorage,
  ActiveWalletInfo,
  // Wallet data
  WalletData,
  WalletMetadata,
  // Transaction types
  Transaction,
  PaymentResult,
  PaymentDetails,
  // Discovery types
  DiscoveryResult,
  DiscoveryProgress,
  // Wallet selection
  WalletSelectionInfo,
  WalletHierarchy,
} from '../features/wallet/types';
export { WALLET_CONSTANTS } from '../features/wallet/types';

// Settings feature types
export type {
  // User settings
  UserSettings,
  CurrencyCode,
  AutoLockTimeout,
  SocialPlatform,
  // Domain settings
  DomainSettings,
  // Blacklist
  BlacklistData,
  // Language
  LanguageOption,
  LocationData,
} from '../features/settings/types';
export {
  DomainStatus,
  DEFAULT_USER_SETTINGS,
  AVAILABLE_LANGUAGES,
  AUTO_LOCK_OPTIONS,
  SETTINGS_VALIDATION,
} from '../features/settings/types';
