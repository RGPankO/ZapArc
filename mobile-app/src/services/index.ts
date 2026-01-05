// Services index - exports all services for the mobile app

// Crypto utilities
export {
  generateUUID,
  generateRandomBytes,
  deriveKeyFromPin,
  encryptData,
  decryptData,
  validatePayloadIntegrity,
  verifyPin,
} from './crypto';

// Storage service (SecureStore for wallet data)
export { storageService, StorageService } from './storageService';

// Settings service (AsyncStorage for app settings)
export { settingsService, SettingsService } from './settingsService';

// Breez SDK service (Lightning Network operations)
export {
  breezSDKService,
  BreezSDKService,
  type BreezConfig,
  type InvoiceRequest,
  type PaymentRequest,
  type LnurlPayRequest,
  type LnurlPayResult,
  type NodeInfo,
  type WalletActivityCheck,
} from './breezSDKService';

// Location service (country detection)
export {
  locationService,
  LocationService,
  type LocationInfo,
  type LocationPermissionResult,
} from './locationService';

// i18n service (translations)
export {
  i18n,
  I18nService,
  t,
  type SupportedLanguage,
  type TranslationParams,
} from './i18nService';

// Offline cache service
export {
  offlineCacheService,
  type CachedBalance,
  type CachedTransactions,
  type SyncStatus,
  type PendingAction,
} from './offlineCacheService';

// Security service
export {
  securityService,
  type SecurityConfig,
  type BiometricInfo,
  type AutoLockState,
} from './securityService';

// Error handling service
export {
  errorHandlingService,
  classifyError,
  ErrorType,
  type AppError,
  type RetryConfig,
} from './errorHandlingService';

// Token service (existing)
export * from './tokenService';
