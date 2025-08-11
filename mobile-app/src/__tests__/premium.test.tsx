import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import PremiumScreen from '../../app/(main)/premium';
import { paymentService } from '../services/paymentService';
import { PaymentPlan, PremiumStatus } from '../types';

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    push: jest.fn(),
  },
}));

// Mock payment service
jest.mock('../services/paymentService', () => ({
  paymentService: {
    getPaymentPlans: jest.fn(),
    getPaymentStatus: jest.fn(),
    processSubscription: jest.fn(),
    processOneTimePurchase: jest.fn(),
  },
}));

// Mock components
jest.mock('../components', () => ({
  PaymentConfirmationModal: ({ visible, onConfirm, onCancel }: any) =>
    visible ? (
      <>
        <button testID="confirm-payment" onPress={onConfirm}>
          Confirm
        </button>
        <button testID="cancel-payment" onPress={onCancel}>
          Cancel
        </button>
      </>
    ) : null,
  PaymentErrorModal: ({ visible, onClose, onRetry }: any) =>
    visible ? (
      <>
        <button testID="close-error" onPress={onClose}>
          Close
        </button>
        <button testID="retry-payment" onPress={onRetry}>
          Retry
        </button>
      </>
    ) : null,
  PaymentSuccessModal: ({ visible, onClose }: any) =>
    visible ? (
      <button testID="close-success" onPress={onClose}>
        Close Success
      </button>
    ) : null,
}));

const mockPaymentService = paymentService as jest.Mocked<typeof paymentService>;

describe('PremiumScreen', () => {
  const mockPlans: PaymentPlan[] = [
    {
      id: 'subscription',
      type: 'subscription',
      price: 9.99,
      currency: 'USD',
      duration: 'monthly',
      features: ['Ad-free experience', 'Premium features', 'Priority support'],
    },
    {
      id: 'lifetime',
      type: 'one-time',
      price: 49.99,
      currency: 'USD',
      duration: 'lifetime',
      features: ['Ad-free experience', 'Lifetime access', 'Priority support'],
    },
  ];

  const mockFreeStatus = {
    hasPremium: false,
    premiumStatus: PremiumStatus.FREE,
    activePayments: [],
  };

  const mockPremiumStatus = {
    hasPremium: true,
    premiumStatus: PremiumStatus.PREMIUM_SUBSCRIPTION,
    premiumExpiry: new Date('2024-12-31'),
    activePayments: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state initially', () => {
    mockPaymentService.getPaymentPlans.mockReturnValue(new Promise(() => {}));
    mockPaymentService.getPaymentStatus.mockReturnValue(new Promise(() => {}));

    render(<PremiumScreen />);

    expect(screen.getByText('Loading premium options...')).toBeTruthy();
  });

  it('should render payment plans for free users', async () => {
    mockPaymentService.getPaymentPlans.mockResolvedValue({
      success: true,
      data: mockPlans,
    });
    mockPaymentService.getPaymentStatus.mockResolvedValue({
      success: true,
      data: mockFreeStatus,
    });

    render(<PremiumScreen />);

    await waitFor(() => {
      expect(screen.getByText('Premium Plans')).toBeTruthy();
      expect(screen.getByText('Monthly Premium')).toBeTruthy();
      expect(screen.getByText('Lifetime Premium')).toBeTruthy();
      expect(screen.getByText('$9.99')).toBeTruthy();
      expect(screen.getByText('$49.99')).toBeTruthy();
    });
  });

  it('should show premium status for premium users', async () => {
    mockPaymentService.getPaymentPlans.mockResolvedValue({
      success: true,
      data: mockPlans,
    });
    mockPaymentService.getPaymentStatus.mockResolvedValue({
      success: true,
      data: mockPremiumStatus,
    });

    render(<PremiumScreen />);

    await waitFor(() => {
      expect(screen.getByText('🎉 You have Premium Access!')).toBeTruthy();
      expect(screen.getByText('Premium (Subscription)')).toBeTruthy();
      expect(screen.getByText('Back to Profile')).toBeTruthy();
    });
  });

  it('should handle subscription purchase flow', async () => {
    mockPaymentService.getPaymentPlans.mockResolvedValue({
      success: true,
      data: mockPlans,
    });
    mockPaymentService.getPaymentStatus.mockResolvedValue({
      success: true,
      data: mockFreeStatus,
    });
    mockPaymentService.processSubscription.mockResolvedValue({
      success: true,
      data: { success: true, message: 'Subscription activated' },
    });

    render(<PremiumScreen />);

    await waitFor(() => {
      expect(screen.getByText('Subscribe Now')).toBeTruthy();
    });

    // Click subscribe button
    fireEvent.press(screen.getByText('Subscribe Now'));

    // Should show confirmation modal
    await waitFor(() => {
      expect(screen.getByTestId('confirm-payment')).toBeTruthy();
    });

    // Confirm purchase
    fireEvent.press(screen.getByTestId('confirm-payment'));

    // Should process subscription
    await waitFor(() => {
      expect(mockPaymentService.processSubscription).toHaveBeenCalledWith('subscription');
    });
  });

  it('should handle one-time purchase flow', async () => {
    mockPaymentService.getPaymentPlans.mockResolvedValue({
      success: true,
      data: mockPlans,
    });
    mockPaymentService.getPaymentStatus.mockResolvedValue({
      success: true,
      data: mockFreeStatus,
    });
    mockPaymentService.processOneTimePurchase.mockResolvedValue({
      success: true,
      data: { success: true, message: 'Purchase completed' },
    });

    render(<PremiumScreen />);

    await waitFor(() => {
      expect(screen.getByText('Buy Lifetime Access')).toBeTruthy();
    });

    // Click purchase button
    fireEvent.press(screen.getByText('Buy Lifetime Access'));

    // Should show confirmation modal
    await waitFor(() => {
      expect(screen.getByTestId('confirm-payment')).toBeTruthy();
    });

    // Confirm purchase
    fireEvent.press(screen.getByTestId('confirm-payment'));

    // Should process purchase
    await waitFor(() => {
      expect(mockPaymentService.processOneTimePurchase).toHaveBeenCalledWith('lifetime');
    });
  });

  it('should handle payment errors', async () => {
    mockPaymentService.getPaymentPlans.mockResolvedValue({
      success: true,
      data: mockPlans,
    });
    mockPaymentService.getPaymentStatus.mockResolvedValue({
      success: true,
      data: mockFreeStatus,
    });
    mockPaymentService.processSubscription.mockResolvedValue({
      success: false,
      error: { code: 'PAYMENT_FAILED', message: 'Payment method declined' },
    });

    render(<PremiumScreen />);

    await waitFor(() => {
      expect(screen.getByText('Subscribe Now')).toBeTruthy();
    });

    // Click subscribe button
    fireEvent.press(screen.getByText('Subscribe Now'));

    // Confirm purchase
    await waitFor(() => {
      expect(screen.getByTestId('confirm-payment')).toBeTruthy();
    });
    fireEvent.press(screen.getByTestId('confirm-payment'));

    // Should show error modal
    await waitFor(() => {
      expect(screen.getByTestId('close-error')).toBeTruthy();
      expect(screen.getByTestId('retry-payment')).toBeTruthy();
    });
  });

  it('should handle API errors when loading data', async () => {
    mockPaymentService.getPaymentPlans.mockResolvedValue({
      success: false,
      error: { code: 'API_ERROR', message: 'Failed to load plans' },
    });
    mockPaymentService.getPaymentStatus.mockResolvedValue({
      success: true,
      data: mockFreeStatus,
    });

    render(<PremiumScreen />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load plans')).toBeTruthy();
    });
  });

  it('should show no plans message when no plans available', async () => {
    mockPaymentService.getPaymentPlans.mockResolvedValue({
      success: true,
      data: [],
    });
    mockPaymentService.getPaymentStatus.mockResolvedValue({
      success: true,
      data: mockFreeStatus,
    });

    render(<PremiumScreen />);

    await waitFor(() => {
      expect(screen.getByText('No Premium Plans Available')).toBeTruthy();
      expect(screen.getByText('Premium plans are not currently configured for this app.')).toBeTruthy();
    });
  });

  it('should navigate back when back button is pressed for premium users', async () => {
    mockPaymentService.getPaymentPlans.mockResolvedValue({
      success: true,
      data: mockPlans,
    });
    mockPaymentService.getPaymentStatus.mockResolvedValue({
      success: true,
      data: mockPremiumStatus,
    });

    render(<PremiumScreen />);

    await waitFor(() => {
      expect(screen.getByText('Back to Profile')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Back to Profile'));

    expect(router.back).toHaveBeenCalled();
  });
});