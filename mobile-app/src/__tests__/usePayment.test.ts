import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  usePaymentPlans,
  usePaymentStatus,
  useCreatePayment,
  useProcessSubscription,
  useProcessPurchase,
  useCancelSubscription,
} from '../features/payments';
import { apiClient } from '../lib/apiClient';

// Mock the apiClient
jest.mock('../lib/apiClient', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

// Create a wrapper with QueryClientProvider
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('usePaymentPlans', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch payment plans successfully', async () => {
    const mockPlans = [
      {
        id: 'plan-1',
        type: 'subscription',
        price: 9.99,
        duration: 'month',
        features: ['No ads', 'Premium support'],
      },
      {
        id: 'plan-2',
        type: 'one-time',
        price: 49.99,
        duration: 'lifetime',
        features: ['No ads', 'Premium support', 'Lifetime access'],
      },
    ];

    mockApiClient.get.mockResolvedValueOnce(mockPlans);

    const { result } = renderHook(() => usePaymentPlans(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockPlans);
    expect(mockApiClient.get).toHaveBeenCalledWith('/payments/plans');
  });

  it('should handle error when fetching plans fails', async () => {
    mockApiClient.get.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => usePaymentPlans(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('Network error');
  });
});

describe('usePaymentStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch payment status for free user', async () => {
    const mockStatus = {
      hasPremium: false,
      premiumStatus: 'FREE',
      activePayments: [],
    };

    mockApiClient.get.mockResolvedValueOnce(mockStatus);

    const { result } = renderHook(() => usePaymentStatus(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockStatus);
    expect(mockApiClient.get).toHaveBeenCalledWith('/payments/user/status');
  });

  it('should fetch payment status for premium user', async () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    const mockStatus = {
      hasPremium: true,
      premiumStatus: 'PREMIUM_SUBSCRIPTION',
      premiumExpiry: futureDate,
      activePayments: [{ id: 'payment-1', status: 'active' }],
    };

    mockApiClient.get.mockResolvedValueOnce(mockStatus);

    const { result } = renderHook(() => usePaymentStatus(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.hasPremium).toBe(true);
    expect(result.current.data?.premiumStatus).toBe('PREMIUM_SUBSCRIPTION');
  });
});

describe('useCreatePayment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a payment successfully', async () => {
    const mockResponse = { paymentId: 'payment-123' };
    mockApiClient.post.mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useCreatePayment(), {
      wrapper: createWrapper(),
    });

    const paymentData = {
      planId: 'plan-1',
      type: 'subscription' as const,
      amount: 9.99,
      currency: 'USD',
    };

    result.current.mutate(paymentData);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockApiClient.post).toHaveBeenCalledWith('/payments', paymentData);
  });

  it('should handle payment creation failure', async () => {
    mockApiClient.post.mockRejectedValueOnce(new Error('Payment failed'));

    const { result } = renderHook(() => useCreatePayment(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      planId: 'plan-1',
      type: 'subscription',
      amount: 9.99,
      currency: 'USD',
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('Payment failed');
  });
});

describe('useProcessSubscription', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should process subscription successfully', async () => {
    const mockResponse = { success: true, message: 'Subscription activated' };
    mockApiClient.post.mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useProcessSubscription(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('plan-monthly');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockApiClient.post).toHaveBeenCalledWith('/payments/subscribe', {
      planId: 'plan-monthly',
    });
  });

  it('should handle subscription processing failure', async () => {
    mockApiClient.post.mockRejectedValueOnce(new Error('Subscription failed'));

    const { result } = renderHook(() => useProcessSubscription(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('plan-monthly');

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('Subscription failed');
  });
});

describe('useProcessPurchase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should process one-time purchase successfully', async () => {
    const mockResponse = { success: true, message: 'Purchase completed' };
    mockApiClient.post.mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useProcessPurchase(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('plan-lifetime');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockApiClient.post).toHaveBeenCalledWith('/payments/purchase', {
      planId: 'plan-lifetime',
    });
  });

  it('should handle purchase processing failure', async () => {
    mockApiClient.post.mockRejectedValueOnce(new Error('Purchase failed'));

    const { result } = renderHook(() => useProcessPurchase(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('plan-lifetime');

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('Purchase failed');
  });
});

describe('useCancelSubscription', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should cancel subscription successfully', async () => {
    const mockResponse = { message: 'Subscription cancelled' };
    mockApiClient.post.mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useCancelSubscription(), {
      wrapper: createWrapper(),
    });

    result.current.mutate();

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockApiClient.post).toHaveBeenCalledWith('/payments/user/cancel-subscription');
  });

  it('should handle cancellation failure', async () => {
    mockApiClient.post.mockRejectedValueOnce(new Error('Cancellation failed'));

    const { result } = renderHook(() => useCancelSubscription(), {
      wrapper: createWrapper(),
    });

    result.current.mutate();

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('Cancellation failed');
  });
});
