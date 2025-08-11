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

export enum AdType {
  BANNER = 'BANNER',
  INTERSTITIAL = 'INTERSTITIAL',
}

export enum AdAction {
  IMPRESSION = 'IMPRESSION',
  CLICK = 'CLICK',
  CLOSE = 'CLOSE',
  ERROR = 'ERROR',
}

export interface AdConfig {
  id: string;
  adType: AdType;
  adNetworkId: string;
  isActive: boolean;
  displayFrequency: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdAnalytics {
  id: string;
  userId?: string;
  adType: AdType;
  action: AdAction;
  adNetworkId: string;
  timestamp: Date;
}

export interface Payment {
  id: string;
  userId: string;
  type: PaymentType;
  amount: number;
  currency: string;
  status: PaymentStatus;
  platformId?: string;
  createdAt: Date;
}

export interface AppConfig {
  id: string;
  appName: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
  paymentModel: PaymentModel;
  subscriptionPrice?: number;
  oneTimePrice?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentPlan {
  id: string;
  type: PaymentType;
  price: number;
  currency: string;
  duration?: string;
  features: string[];
}

export interface PaymentWebhookData {
  paymentId: string;
  platformId: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  userId: string;
  type: PaymentType;
}

export interface CreatePaymentRequest {
  userId: string;
  type: PaymentType;
  amount: number;
  currency: string;
  platformId?: string;
}

export interface UpdatePaymentStatusRequest {
  paymentId: string;
  status: PaymentStatus;
  platformId?: string;
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