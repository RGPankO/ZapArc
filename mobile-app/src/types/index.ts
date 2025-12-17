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
