import { Platform } from 'react-native';
import { ApiResponse, PaymentPlan } from '../types';
import { NetworkConfig } from '../config/network';

export interface CreatePaymentRequest {
  planId: string;
  type: 'subscription' | 'one-time';
  amount: number;
  currency: string;
  platformId?: string;
}

export interface PaymentStatus {
  hasPremium: boolean;
  premiumStatus: string;
  premiumExpiry?: Date;
  activePayments: any[];
}

class PaymentService {
  private getBaseUrl(): string {
    return NetworkConfig.getApiBaseUrl();
  }

  private get baseUrl(): string {
    return this.getBaseUrl();
  }

  private async getAuthToken(): Promise<string | null> {
    try {
      const { tokenService } = await import('./tokenService');
      return await tokenService.getAccessToken();
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    return headers;
  }

  async getPaymentPlans(): Promise<ApiResponse<PaymentPlan[]>> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/payments/plans`, {
        method: 'GET',
        headers,
      });

      const result = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: result.error || { code: 'PLANS_FETCH_FAILED', message: 'Failed to fetch payment plans' },
        };
      }

      return {
        success: true,
        data: result.data,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Network error occurred',
          details: error,
        },
      };
    }
  }

  async createPayment(data: CreatePaymentRequest): Promise<ApiResponse<{ paymentId: string }>> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/payments/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });

      const result = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: result.error || { code: 'PAYMENT_CREATE_FAILED', message: 'Failed to create payment' },
        };
      }

      return {
        success: true,
        data: result.data,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Network error occurred',
          details: error,
        },
      };
    }
  }

  async processSubscription(planId: string): Promise<ApiResponse<{ success: boolean; message: string }>> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/payments/subscribe`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ planId }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: result.error || { code: 'SUBSCRIPTION_FAILED', message: 'Failed to process subscription' },
        };
      }

      return {
        success: true,
        data: result.data,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Network error occurred',
          details: error,
        },
      };
    }
  }

  async processOneTimePurchase(planId: string): Promise<ApiResponse<{ success: boolean; message: string }>> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/payments/purchase`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ planId }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: result.error || { code: 'PURCHASE_FAILED', message: 'Failed to process purchase' },
        };
      }

      return {
        success: true,
        data: result.data,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Network error occurred',
          details: error,
        },
      };
    }
  }

  async getPaymentStatus(): Promise<ApiResponse<PaymentStatus>> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/payments/status`, {
        method: 'GET',
        headers,
      });

      const result = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: result.error || { code: 'STATUS_FETCH_FAILED', message: 'Failed to fetch payment status' },
        };
      }

      return {
        success: true,
        data: result.data,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Network error occurred',
          details: error,
        },
      };
    }
  }
}

export const paymentService = new PaymentService();