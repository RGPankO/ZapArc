// Test file for Payment Processor
// Simple tests to verify payment processing workflow functionality

import { PaymentProcessor, PaymentOptions } from './payment-processor';

// Mock ExtensionMessaging for testing
const mockMessaging = {
  isWalletConnected: jest.fn(),
  getBalance: jest.fn(),
  parseLnurl: jest.fn(),
  processPayment: jest.fn(),
  payLnurl: jest.fn()
};

// Mock the messaging module
jest.mock('./messaging', () => ({
  ExtensionMessaging: mockMessaging
}));

describe('PaymentProcessor', () => {
  let paymentProcessor: PaymentProcessor;

  beforeEach(() => {
    paymentProcessor = new PaymentProcessor();
    jest.clearAllMocks();
  });

  describe('processPayment', () => {
    const mockPaymentOptions: PaymentOptions = {
      lnurl: 'lnurl1dp68gurn8ghj7um9wfmxjcm99e3k7mf0v9cxj0m385ekvcenxc6r2c35xvukxefcv5mkvv34x5ekzd3ev56nyd3hxqurzepexejxxepnxscrvwfnv9nxzcn9xq6xyefhvgcxxcmyxymnserxfq5fns',
      amount: 1000,
      comment: 'Test payment',
      useBuiltInWallet: true
    };

    it('should successfully process a valid payment', async () => {
      // Mock successful responses
      mockMessaging.isWalletConnected.mockResolvedValue({ success: true, data: true });
      mockMessaging.getBalance.mockResolvedValue({ success: true, data: 5000 });
      mockMessaging.parseLnurl.mockResolvedValue({
        success: true,
        data: {
          type: 'pay',
          data: {
            callback: 'https://example.com/callback',
            minSendable: 1000,
            maxSendable: 100000000,
            metadata: '[]'
          }
        }
      });
      mockMessaging.payLnurl.mockResolvedValue({ success: true });

      const result = await paymentProcessor.processPayment(mockPaymentOptions);

      expect(result.success).toBe(true);
      expect(mockMessaging.isWalletConnected).toHaveBeenCalled();
      expect(mockMessaging.getBalance).toHaveBeenCalled();
      expect(mockMessaging.parseLnurl).toHaveBeenCalledWith(mockPaymentOptions.lnurl);
    });

    it('should fail when wallet is not connected', async () => {
      mockMessaging.isWalletConnected.mockResolvedValue({ success: true, data: false });

      const result = await paymentProcessor.processPayment(mockPaymentOptions);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Wallet not connected');
      expect(result.retryable).toBe(true);
    });

    it('should fail when balance is insufficient', async () => {
      mockMessaging.isWalletConnected.mockResolvedValue({ success: true, data: true });
      mockMessaging.getBalance.mockResolvedValue({ success: true, data: 500 }); // Less than required

      const result = await paymentProcessor.processPayment(mockPaymentOptions);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient balance');
      expect(result.retryable).toBe(false);
    });

    it('should validate payment amount against LNURL limits', async () => {
      mockMessaging.isWalletConnected.mockResolvedValue({ success: true, data: true });
      mockMessaging.getBalance.mockResolvedValue({ success: true, data: 5000 });
      mockMessaging.parseLnurl.mockResolvedValue({
        success: true,
        data: {
          type: 'pay',
          data: {
            callback: 'https://example.com/callback',
            minSendable: 2000000, // 2000 sats minimum
            maxSendable: 100000000,
            metadata: '[]'
          }
        }
      });

      const result = await paymentProcessor.processPayment({
        ...mockPaymentOptions,
        amount: 1000 // Below minimum
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Amount too small');
    });

    it('should handle LNURL parsing errors', async () => {
      mockMessaging.isWalletConnected.mockResolvedValue({ success: true, data: true });
      mockMessaging.getBalance.mockResolvedValue({ success: true, data: 5000 });
      mockMessaging.parseLnurl.mockResolvedValue({
        success: false,
        error: 'Invalid LNURL'
      });

      const result = await paymentProcessor.processPayment(mockPaymentOptions);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid LNURL');
    });

    it('should retry failed payments up to max retries', async () => {
      mockMessaging.isWalletConnected.mockResolvedValue({ success: true, data: true });
      mockMessaging.getBalance.mockResolvedValue({ success: true, data: 5000 });
      mockMessaging.parseLnurl.mockResolvedValue({
        success: true,
        data: {
          type: 'pay',
          data: {
            callback: 'https://example.com/callback',
            minSendable: 1000,
            maxSendable: 100000000,
            metadata: '[]'
          }
        }
      });
      
      // Mock payment failure with retryable error
      mockMessaging.payLnurl.mockResolvedValue({
        success: false,
        error: 'Network timeout'
      });

      const result = await paymentProcessor.processPayment(mockPaymentOptions);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Payment failed after');
      // Should have tried multiple times (original + retries)
      expect(mockMessaging.payLnurl).toHaveBeenCalledTimes(4); // 1 + 3 retries
    });
  });

  describe('generatePaymentQR', () => {
    it('should generate QR code data for valid LNURL', async () => {
      const mockOptions: PaymentOptions = {
        lnurl: 'lnurl1dp68gurn8ghj7um9wfmxjcm99e3k7mf0v9cxj0m385ekvcenxc6r2c35xvukxefcv5mkvv34x5ekzd3ev56nyd3hxqurzepexejxxepnxscrvwfnv9nxzcn9xq6xyefhvgcxxcmyxymnserxfq5fns',
        amount: 1000
      };

      mockMessaging.parseLnurl.mockResolvedValue({
        success: true,
        data: {
          type: 'pay',
          data: {
            callback: 'https://example.com/callback',
            minSendable: 1000,
            maxSendable: 100000000,
            metadata: '[]'
          }
        }
      });

      const result = await paymentProcessor.generatePaymentQR(mockOptions);

      expect(result.success).toBe(true);
      expect(result.data).toBe(mockOptions.lnurl);
    });

    it('should fail for invalid LNURL', async () => {
      const mockOptions: PaymentOptions = {
        lnurl: 'invalid-lnurl',
        amount: 1000
      };

      mockMessaging.parseLnurl.mockResolvedValue({
        success: false,
        error: 'Invalid LNURL format'
      });

      const result = await paymentProcessor.generatePaymentQR(mockOptions);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to parse LNURL');
    });
  });

  describe('payment status tracking', () => {
    it('should track payment status throughout lifecycle', async () => {
      const mockOptions: PaymentOptions = {
        lnurl: 'lnurl1dp68gurn8ghj7um9wfmxjcm99e3k7mf0v9cxj0m385ekvcenxc6r2c35xvukxefcv5mkvv34x5ekzd3ev56nyd3hxqurzepexejxxepnxscrvwfnv9nxzcn9xq6xyefhvgcxxcmyxymnserxfq5fns',
        amount: 1000
      };

      // Mock successful flow
      mockMessaging.isWalletConnected.mockResolvedValue({ success: true, data: true });
      mockMessaging.getBalance.mockResolvedValue({ success: true, data: 5000 });
      mockMessaging.parseLnurl.mockResolvedValue({
        success: true,
        data: {
          type: 'pay',
          data: {
            callback: 'https://example.com/callback',
            minSendable: 1000,
            maxSendable: 100000000,
            metadata: '[]'
          }
        }
      });
      mockMessaging.payLnurl.mockResolvedValue({ success: true });

      let statusUpdates: any[] = [];
      
      // Start payment and track status
      const paymentPromise = paymentProcessor.processPayment(mockOptions);
      
      // Get active payments to check status
      const activePayments = paymentProcessor.getActivePayments();
      expect(activePayments.length).toBe(1);
      
      const payment = activePayments[0];
      expect(payment.status).toBe('pending');
      expect(payment.amount).toBe(1000);
      expect(payment.lnurl).toBe(mockOptions.lnurl);

      const result = await paymentPromise;
      expect(result.success).toBe(true);
    });

    it('should allow payment cancellation', () => {
      const mockOptions: PaymentOptions = {
        lnurl: 'lnurl1dp68gurn8ghj7um9wfmxjcm99e3k7mf0v9cxj0m385ekvcenxc6r2c35xvukxefcv5mkvv34x5ekzd3ev56nyd3hxqurzepexejxxepnxscrvwfnv9nxzcn9xq6xyefhvgcxxcmyxymnserxfq5fns',
        amount: 1000
      };

      // Start payment but don't await
      paymentProcessor.processPayment(mockOptions);
      
      const activePayments = paymentProcessor.getActivePayments();
      expect(activePayments.length).toBe(1);
      
      const paymentId = activePayments[0].id;
      const cancelled = paymentProcessor.cancelPayment(paymentId);
      
      expect(cancelled).toBe(true);
      
      const payment = paymentProcessor.getPaymentStatus(paymentId);
      expect(payment?.status).toBe('cancelled');
    });
  });
});

// Export for potential integration testing
export { mockMessaging };