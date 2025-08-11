import { paymentService } from '../services/paymentService';
import { PaymentPlan, PremiumStatus } from '../types';

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock tokenService
jest.mock('../services/tokenService', () => ({
  tokenService: {
    getAccessToken: jest.fn().mockResolvedValue('mock-token'),
  },
}));

describe('PaymentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPaymentPlans', () => {
    it('should fetch payment plans successfully', async () => {
      const mockPlans: PaymentPlan[] = [
        {
          id: 'subscription',
          type: 'subscription',
          price: 9.99,
          currency: 'USD',
          duration: 'monthly',
          features: ['Ad-free experience', 'Premium features'],
        },
        {
          id: 'lifetime',
          type: 'one-time',
          price: 49.99,
          currency: 'USD',
          duration: 'lifetime',
          features: ['Ad-free experience', 'Lifetime access'],
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockPlans }),
      } as Response);

      const result = await paymentService.getPaymentPlans();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPlans);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/payments/plans'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock-token',
          }),
        })
      );
    });

    it('should handle API error when fetching plans', async () => {
      const mockError = {
        code: 'PLANS_FETCH_FAILED',
        message: 'Failed to fetch plans',
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, error: mockError }),
      } as Response);

      const result = await paymentService.getPaymentPlans();

      expect(result.success).toBe(false);
      expect(result.error).toEqual(mockError);
    });

    it('should handle network error when fetching plans', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await paymentService.getPaymentPlans();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NETWORK_ERROR');
    });
  });

  describe('processSubscription', () => {
    it('should process subscription successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'Subscription activated',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockResponse }),
      } as Response);

      const result = await paymentService.processSubscription('subscription');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/payments/subscribe'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock-token',
          }),
          body: JSON.stringify({ planId: 'subscription' }),
        })
      );
    });

    it('should handle subscription error', async () => {
      const mockError = {
        code: 'SUBSCRIPTION_FAILED',
        message: 'Payment method declined',
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, error: mockError }),
      } as Response);

      const result = await paymentService.processSubscription('subscription');

      expect(result.success).toBe(false);
      expect(result.error).toEqual(mockError);
    });
  });

  describe('processOneTimePurchase', () => {
    it('should process one-time purchase successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'Purchase completed',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockResponse }),
      } as Response);

      const result = await paymentService.processOneTimePurchase('lifetime');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/payments/purchase'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ planId: 'lifetime' }),
        })
      );
    });

    it('should handle purchase error', async () => {
      const mockError = {
        code: 'PURCHASE_FAILED',
        message: 'Insufficient funds',
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, error: mockError }),
      } as Response);

      const result = await paymentService.processOneTimePurchase('lifetime');

      expect(result.success).toBe(false);
      expect(result.error).toEqual(mockError);
    });
  });

  describe('getPaymentStatus', () => {
    it('should fetch payment status successfully', async () => {
      const mockStatus = {
        hasPremium: true,
        premiumStatus: PremiumStatus.PREMIUM_SUBSCRIPTION,
        premiumExpiry: new Date('2024-12-31'),
        activePayments: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockStatus }),
      } as Response);

      const result = await paymentService.getPaymentStatus();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStatus);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/payments/status'),
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should handle status fetch error', async () => {
      const mockError = {
        code: 'STATUS_FETCH_FAILED',
        message: 'Failed to fetch status',
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, error: mockError }),
      } as Response);

      const result = await paymentService.getPaymentStatus();

      expect(result.success).toBe(false);
      expect(result.error).toEqual(mockError);
    });
  });

  describe('createPayment', () => {
    it('should create payment successfully', async () => {
      const mockPaymentData = {
        planId: 'subscription',
        type: 'subscription' as const,
        amount: 9.99,
        currency: 'USD',
      };

      const mockResponse = {
        paymentId: 'payment-123',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockResponse }),
      } as Response);

      const result = await paymentService.createPayment(mockPaymentData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/payments/create'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(mockPaymentData),
        })
      );
    });

    it('should handle payment creation error', async () => {
      const mockPaymentData = {
        planId: 'subscription',
        type: 'subscription' as const,
        amount: 9.99,
        currency: 'USD',
      };

      const mockError = {
        code: 'PAYMENT_CREATE_FAILED',
        message: 'Invalid payment data',
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, error: mockError }),
      } as Response);

      const result = await paymentService.createPayment(mockPaymentData);

      expect(result.success).toBe(false);
      expect(result.error).toEqual(mockError);
    });
  });
});