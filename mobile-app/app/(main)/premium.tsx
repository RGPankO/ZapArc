import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, ActivityIndicator, Chip, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { paymentService, PaymentStatus } from '../../src/services/paymentService';
import { PaymentPlan, PremiumStatus } from '../../src/types';
import { PaymentConfirmationModal, PaymentErrorModal, PaymentSuccessModal } from '../../src/components';

export default function PremiumScreen(): React.JSX.Element {
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const [plansResult, statusResult] = await Promise.all([
        paymentService.getPaymentPlans(),
        paymentService.getPaymentStatus(),
      ]);

      if (plansResult.success && plansResult.data) {
        setPlans(plansResult.data);
      } else {
        setError(plansResult.error?.message || 'Failed to load payment plans');
      }

      if (statusResult.success && statusResult.data) {
        setPaymentStatus(statusResult.data);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscriptionPurchase = async (): Promise<void> => {
    if (!selectedPlan) return;

    setIsProcessing(true);
    setProcessingPlanId(selectedPlan.id);
    setError(null);

    try {
      const result = await paymentService.processSubscription(selectedPlan.id);
      
      if (result.success) {
        setShowConfirmationModal(false);
        setShowSuccessModal(true);
        // Refresh data
        await loadData();
      } else {
        setPaymentError(result.error?.message || 'Failed to process subscription');
        setShowConfirmationModal(false);
        setShowErrorModal(true);
      }
    } catch (err) {
      setPaymentError('An unexpected error occurred during subscription');
      setShowConfirmationModal(false);
      setShowErrorModal(true);
    } finally {
      setIsProcessing(false);
      setProcessingPlanId(null);
    }
  };

  const handleOneTimePurchase = async (): Promise<void> => {
    if (!selectedPlan) return;

    setIsProcessing(true);
    setProcessingPlanId(selectedPlan.id);
    setError(null);

    try {
      const result = await paymentService.processOneTimePurchase(selectedPlan.id);
      
      if (result.success) {
        setShowConfirmationModal(false);
        setShowSuccessModal(true);
        // Refresh data
        await loadData();
      } else {
        setPaymentError(result.error?.message || 'Failed to process purchase');
        setShowConfirmationModal(false);
        setShowErrorModal(true);
      }
    } catch (err) {
      setPaymentError('An unexpected error occurred during purchase');
      setShowConfirmationModal(false);
      setShowErrorModal(true);
    } finally {
      setIsProcessing(false);
      setProcessingPlanId(null);
    }
  };

  const handlePurchase = (plan: PaymentPlan): void => {
    setSelectedPlan(plan);
    setShowConfirmationModal(true);
  };

  const handleConfirmPurchase = (): void => {
    if (!selectedPlan) return;

    if (selectedPlan.type === 'subscription') {
      handleSubscriptionPurchase();
    } else {
      handleOneTimePurchase();
    }
  };

  const handleCancelPurchase = (): void => {
    setShowConfirmationModal(false);
    setSelectedPlan(null);
  };

  const handleCloseError = (): void => {
    setShowErrorModal(false);
    setPaymentError(null);
  };

  const handleRetryPayment = (): void => {
    setShowErrorModal(false);
    if (selectedPlan) {
      setShowConfirmationModal(true);
    }
  };

  const handleCloseSuccess = (): void => {
    setShowSuccessModal(false);
    setSelectedPlan(null);
    router.back();
  };

  const getPremiumStatusText = (status: string): string => {
    switch (status) {
      case PremiumStatus.PREMIUM_LIFETIME:
        return 'Premium (Lifetime)';
      case PremiumStatus.PREMIUM_SUBSCRIPTION:
        return 'Premium (Subscription)';
      default:
        return 'Free';
    }
  };

  const getPremiumStatusColor = (status: string): string => {
    switch (status) {
      case PremiumStatus.PREMIUM_LIFETIME:
        return '#4CAF50';
      case PremiumStatus.PREMIUM_SUBSCRIPTION:
        return '#2196F3';
      default:
        return '#9E9E9E';
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading premium options...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text variant="headlineMedium" style={styles.title}>
            Premium Plans
          </Text>

          {paymentStatus && (
            <Card style={styles.statusCard}>
              <Card.Content>
                <View style={styles.statusRow}>
                  <Text variant="titleMedium">Current Status</Text>
                  <Chip 
                    style={[styles.statusChip, { backgroundColor: getPremiumStatusColor(paymentStatus.premiumStatus) }]}
                    textStyle={{ color: 'white' }}
                  >
                    {getPremiumStatusText(paymentStatus.premiumStatus)}
                  </Chip>
                </View>
                {paymentStatus.premiumExpiry && (
                  <Text variant="bodyMedium" style={styles.expiryText}>
                    Expires: {new Date(paymentStatus.premiumExpiry).toLocaleDateString()}
                  </Text>
                )}
              </Card.Content>
            </Card>
          )}

          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}

          {paymentStatus?.hasPremium ? (
            <Card style={styles.premiumCard}>
              <Card.Content>
                <Text variant="titleLarge" style={styles.premiumTitle}>
                  🎉 You have Premium Access!
                </Text>
                <Text variant="bodyMedium" style={styles.premiumDescription}>
                  Enjoy your ad-free experience and premium features.
                </Text>
                <Button
                  mode="outlined"
                  onPress={() => router.back()}
                  style={styles.backButton}
                >
                  Back to Profile
                </Button>
              </Card.Content>
            </Card>
          ) : (
            <>
              <Text variant="bodyLarge" style={styles.description}>
                Upgrade to Premium to enjoy an ad-free experience and unlock exclusive features.
              </Text>

              {plans.map((plan) => (
                <Card key={plan.id} style={styles.planCard}>
                  <Card.Content>
                    <View style={styles.planHeader}>
                      <Text variant="titleLarge" style={styles.planTitle}>
                        {plan.type === 'subscription' ? 'Monthly Premium' : 'Lifetime Premium'}
                      </Text>
                      <View style={styles.priceContainer}>
                        <Text variant="headlineSmall" style={styles.price}>
                          ${plan.price}
                        </Text>
                        <Text variant="bodyMedium" style={styles.pricePeriod}>
                          {plan.duration === 'lifetime' ? 'one-time' : `/${plan.duration}`}
                        </Text>
                      </View>
                    </View>

                    <Divider style={styles.divider} />

                    <Text variant="titleMedium" style={styles.featuresTitle}>
                      Features included:
                    </Text>
                    {plan.features.map((feature, index) => (
                      <View key={index} style={styles.featureRow}>
                        <Text style={styles.checkmark}>✓</Text>
                        <Text variant="bodyMedium" style={styles.featureText}>
                          {feature}
                        </Text>
                      </View>
                    ))}

                    <Button
                      mode="contained"
                      onPress={() => handlePurchase(plan)}
                      loading={isProcessing && processingPlanId === plan.id}
                      disabled={isProcessing}
                      style={[
                        styles.purchaseButton,
                        plan.type === 'one-time' && styles.lifetimeButton,
                      ]}
                      contentStyle={styles.buttonContent}
                    >
                      {plan.type === 'subscription' ? 'Subscribe Now' : 'Buy Lifetime Access'}
                    </Button>
                  </Card.Content>
                </Card>
              ))}

              {plans.length === 0 && !error && (
                <Card style={styles.noPlanCard}>
                  <Card.Content>
                    <Text variant="titleMedium" style={styles.noPlanTitle}>
                      No Premium Plans Available
                    </Text>
                    <Text variant="bodyMedium" style={styles.noPlanDescription}>
                      Premium plans are not currently configured for this app.
                    </Text>
                  </Card.Content>
                </Card>
              )}
            </>
          )}
        </View>
      </ScrollView>

      <PaymentConfirmationModal
        visible={showConfirmationModal}
        plan={selectedPlan}
        onConfirm={handleConfirmPurchase}
        onCancel={handleCancelPurchase}
        isProcessing={isProcessing}
      />

      <PaymentErrorModal
        visible={showErrorModal}
        error={paymentError}
        onRetry={handleRetryPayment}
        onClose={handleCloseError}
        showRetry={true}
      />

      <PaymentSuccessModal
        visible={showSuccessModal}
        isSubscription={selectedPlan?.type === 'subscription'}
        onClose={handleCloseSuccess}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  title: {
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: 'bold',
  },
  description: {
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
    paddingHorizontal: 16,
  },
  statusCard: {
    marginBottom: 16,
    backgroundColor: 'white',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusChip: {
    marginLeft: 4,
  },
  expiryText: {
    marginTop: 8,
    color: '#666',
  },
  errorBanner: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  errorBannerText: {
    color: '#c62828',
    fontSize: 14,
  },
  premiumCard: {
    marginBottom: 16,
    backgroundColor: '#e8f5e8',
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  premiumTitle: {
    textAlign: 'center',
    color: '#2e7d32',
    marginBottom: 8,
  },
  premiumDescription: {
    textAlign: 'center',
    color: '#388e3c',
    marginBottom: 16,
  },
  backButton: {
    borderColor: '#4CAF50',
  },
  planCard: {
    marginBottom: 16,
    backgroundColor: 'white',
    elevation: 2,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  planTitle: {
    flex: 1,
    fontWeight: 'bold',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  price: {
    fontWeight: 'bold',
    color: '#2196F3',
  },
  pricePeriod: {
    color: '#666',
    fontSize: 12,
  },
  divider: {
    marginBottom: 16,
  },
  featuresTitle: {
    marginBottom: 12,
    fontWeight: 'bold',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkmark: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  featureText: {
    flex: 1,
  },
  purchaseButton: {
    marginTop: 16,
    borderRadius: 8,
  },
  lifetimeButton: {
    backgroundColor: '#4CAF50',
  },
  buttonContent: {
    paddingVertical: 8,
  },
  noPlanCard: {
    backgroundColor: 'white',
    marginBottom: 16,
  },
  noPlanTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  noPlanDescription: {
    textAlign: 'center',
    color: '#666',
  },
});