export interface User {
  id: string;
  email: string;
  nickname: string;
  premiumStatus: PremiumStatus;
  premiumExpiry?: Date;
}

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

export interface PaymentPlan {
  id: string;
  type: 'subscription' | 'one-time';
  price: number;
  currency: string;
  duration?: string;
  features: string[];
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