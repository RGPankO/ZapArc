import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import PaymentConfirmationModal from '../components/PaymentConfirmationModal';
import { PaymentPlan } from '../types';

describe('PaymentConfirmationModal', () => {
  const mockSubscriptionPlan: PaymentPlan = {
    id: 'subscription',
    type: 'subscription',
    price: 9.99,
    currency: 'USD',
    duration: 'monthly',
    features: ['Ad-free experience', 'Premium features', 'Priority support'],
  };

  const mockLifetimePlan: PaymentPlan = {
    id: 'lifetime',
    type: 'one-time',
    price: 49.99,
    currency: 'USD',
    duration: 'lifetime',
    features: ['Ad-free experience', 'Lifetime access', 'Priority support'],
  };

  const defaultProps = {
    visible: true,
    plan: mockSubscriptionPlan,
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
    isProcessing: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render when not visible', () => {
    render(<PaymentConfirmationModal {...defaultProps} visible={false} />);
    
    expect(screen.queryByText('Confirm Subscribe')).toBeNull();
  });

  it('should not render when plan is null', () => {
    render(<PaymentConfirmationModal {...defaultProps} plan={null} />);
    
    expect(screen.queryByText('Confirm Subscribe')).toBeNull();
  });

  it('should render subscription plan confirmation', () => {
    render(<PaymentConfirmationModal {...defaultProps} />);

    expect(screen.getByText('Confirm Subscribe')).toBeTruthy();
    expect(screen.getByText('Monthly Premium')).toBeTruthy();
    expect(screen.getByText('$9.99')).toBeTruthy();
    expect(screen.getByText('/monthly')).toBeTruthy();
    expect(screen.getByText('You will get monthly subscription with the following features:')).toBeTruthy();
    expect(screen.getByText('Ad-free experience')).toBeTruthy();
    expect(screen.getByText('Premium features')).toBeTruthy();
    expect(screen.getByText('Priority support')).toBeTruthy();
    expect(screen.getByText('Subscribe Now')).toBeTruthy();
  });

  it('should render lifetime plan confirmation', () => {
    render(<PaymentConfirmationModal {...defaultProps} plan={mockLifetimePlan} />);

    expect(screen.getByText('Confirm Purchase')).toBeTruthy();
    expect(screen.getByText('Lifetime Premium')).toBeTruthy();
    expect(screen.getByText('$49.99')).toBeTruthy();
    expect(screen.getByText('one-time')).toBeTruthy();
    expect(screen.getByText('You will get lifetime access with the following features:')).toBeTruthy();
    expect(screen.getByText('Lifetime access')).toBeTruthy();
    expect(screen.getByText('Purchase Now')).toBeTruthy();
  });

  it('should show subscription disclaimer', () => {
    render(<PaymentConfirmationModal {...defaultProps} />);

    expect(
      screen.getByText(
        'Your subscription will automatically renew monthly. You can cancel anytime from your account settings.'
      )
    ).toBeTruthy();
  });

  it('should show lifetime disclaimer', () => {
    render(<PaymentConfirmationModal {...defaultProps} plan={mockLifetimePlan} />);

    expect(
      screen.getByText('This is a one-time purchase that gives you lifetime premium access.')
    ).toBeTruthy();
  });

  it('should call onConfirm when confirm button is pressed', () => {
    const onConfirm = jest.fn();
    render(<PaymentConfirmationModal {...defaultProps} onConfirm={onConfirm} />);

    fireEvent.press(screen.getByText('Subscribe Now'));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('should call onCancel when cancel button is pressed', () => {
    const onCancel = jest.fn();
    render(<PaymentConfirmationModal {...defaultProps} onCancel={onCancel} />);

    fireEvent.press(screen.getByText('Cancel'));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('should show processing state', () => {
    render(<PaymentConfirmationModal {...defaultProps} isProcessing={true} />);

    expect(screen.getByText('Processing...')).toBeTruthy();
    
    // Buttons should be disabled during processing
    const confirmButton = screen.getByText('Processing...');
    const cancelButton = screen.getByText('Cancel');
    
    expect(confirmButton.props.accessibilityState?.disabled).toBe(true);
    expect(cancelButton.props.accessibilityState?.disabled).toBe(true);
  });

  it('should disable buttons during processing', () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    
    render(
      <PaymentConfirmationModal
        {...defaultProps}
        onConfirm={onConfirm}
        onCancel={onCancel}
        isProcessing={true}
      />
    );

    fireEvent.press(screen.getByText('Processing...'));
    fireEvent.press(screen.getByText('Cancel'));

    // Should not call handlers when disabled
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('should render all plan features', () => {
    const planWithManyFeatures: PaymentPlan = {
      ...mockSubscriptionPlan,
      features: [
        'Ad-free experience',
        'Premium features',
        'Priority support',
        'Exclusive content',
        'Advanced analytics',
      ],
    };

    render(<PaymentConfirmationModal {...defaultProps} plan={planWithManyFeatures} />);

    planWithManyFeatures.features.forEach((feature) => {
      expect(screen.getByText(feature)).toBeTruthy();
    });
  });
});