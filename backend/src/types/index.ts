export interface User {
  id: string;
  email: string;
  nickname: string;
  passwordHash: string;
  isVerified: boolean;
  verificationToken?: string;
  premiumStatus: PremiumStatus;
  premiumExpiry?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum PremiumStatus {
  FREE = 'FREE',
  PREMIUM_SUBSCRIPTION = 'PREMIUM_SUBSCRIPTION',
  PREMIUM_LIFETIME = 'PREMIUM_LIFETIME',
}

export enum PaymentType {
  SUBSCRIPTION = 'SUBSCRIPTION',
  ONE_TIME = 'ONE_TIME',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentModel {
  SUBSCRIPTION_ONLY = 'SUBSCRIPTION_ONLY',
  ONE_TIME_ONLY = 'ONE_TIME_ONLY',
  BOTH = 'BOTH',
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}