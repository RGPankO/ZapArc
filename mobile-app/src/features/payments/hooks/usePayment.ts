import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/apiClient';
import { PaymentPlan } from '../types';

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
  activePayments: unknown[];
}

const PAYMENT_KEYS = {
  plans: ['payments', 'plans'] as const,
  status: ['payments', 'status'] as const,
};

/**
 * Hook to fetch available payment plans
 * Note: apiClient interceptor extracts response.data, so we cast the result
 */
export function usePaymentPlans() {
  return useQuery<PaymentPlan[]>({
    queryKey: PAYMENT_KEYS.plans,
    queryFn: async () => {
      const response = await apiClient.get('/payments/plans');
      return response as unknown as PaymentPlan[];
    },
  });
}

/**
 * Hook to get user's payment/premium status
 * Note: apiClient interceptor extracts response.data, so we cast the result
 */
export function usePaymentStatus() {
  return useQuery<PaymentStatus>({
    queryKey: PAYMENT_KEYS.status,
    queryFn: async () => {
      const response = await apiClient.get('/payments/user/status');
      return response as unknown as PaymentStatus;
    },
  });
}

/**
 * Hook to create a payment
 */
export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePaymentRequest) =>
      apiClient.post<{ paymentId: string }>('/payments', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYMENT_KEYS.status });
    },
  });
}

/**
 * Hook to process a subscription
 */
export function useProcessSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (planId: string) =>
      apiClient.post<{ success: boolean; message: string }>('/payments/subscribe', { planId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYMENT_KEYS.status });
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
}

/**
 * Hook to process a one-time purchase
 */
export function useProcessPurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (planId: string) =>
      apiClient.post<{ success: boolean; message: string }>('/payments/purchase', { planId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYMENT_KEYS.status });
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
}

/**
 * Hook to cancel subscription
 */
export function useCancelSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.post<{ message: string }>('/payments/user/cancel-subscription'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYMENT_KEYS.status });
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
}
