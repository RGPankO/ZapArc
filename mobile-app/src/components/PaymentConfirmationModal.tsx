import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Modal, Portal, Card, Text, Button, Divider } from 'react-native-paper';
import { PaymentPlan } from '../types';

interface PaymentConfirmationModalProps {
  visible: boolean;
  plan: PaymentPlan | null;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

export default function PaymentConfirmationModal({
  visible,
  plan,
  onConfirm,
  onCancel,
  isProcessing = false,
}: PaymentConfirmationModalProps): React.JSX.Element {
  if (!plan) return <></>;

  const isSubscription = plan.type === 'subscription';
  const actionText = isSubscription ? 'Subscribe' : 'Purchase';
  const durationText = isSubscription ? 'monthly subscription' : 'lifetime access';

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onCancel}
        contentContainerStyle={styles.modalContainer}
      >
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="headlineSmall" style={styles.title}>
              Confirm {actionText}
            </Text>

            <View style={styles.planDetails}>
              <Text variant="titleMedium" style={styles.planName}>
                {isSubscription ? 'Monthly Premium' : 'Lifetime Premium'}
              </Text>
              
              <View style={styles.priceRow}>
                <Text variant="headlineMedium" style={styles.price}>
                  ${plan.price}
                </Text>
                <Text variant="bodyMedium" style={styles.pricePeriod}>
                  {plan.duration === 'lifetime' ? 'one-time' : `/${plan.duration}`}
                </Text>
              </View>
            </View>

            <Divider style={styles.divider} />

            <Text variant="bodyMedium" style={styles.description}>
              You will get {durationText} with the following features:
            </Text>

            <View style={styles.featuresList}>
              {plan.features.map((feature, index) => (
                <View key={index} style={styles.featureRow}>
                  <Text style={styles.checkmark}>✓</Text>
                  <Text variant="bodyMedium" style={styles.featureText}>
                    {feature}
                  </Text>
                </View>
              ))}
            </View>

            <Divider style={styles.divider} />

            <Text variant="bodySmall" style={styles.disclaimer}>
              {isSubscription
                ? 'Your subscription will automatically renew monthly. You can cancel anytime from your account settings.'
                : 'This is a one-time purchase that gives you lifetime premium access.'}
            </Text>

            <View style={styles.buttonContainer}>
              <Button
                mode="outlined"
                onPress={onCancel}
                disabled={isProcessing}
                style={styles.cancelButton}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={onConfirm}
                loading={isProcessing}
                disabled={isProcessing}
                style={[
                  styles.confirmButton,
                  !isSubscription && styles.lifetimeButton,
                ]}
              >
                {isProcessing ? 'Processing...' : `${actionText} Now`}
              </Button>
            </View>
          </Card.Content>
        </Card>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    margin: 20,
  },
  card: {
    backgroundColor: 'white',
  },
  title: {
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: 'bold',
  },
  planDetails: {
    alignItems: 'center',
    marginBottom: 16,
  },
  planName: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontWeight: 'bold',
    color: '#2196F3',
  },
  pricePeriod: {
    color: '#666',
    marginLeft: 4,
  },
  divider: {
    marginVertical: 16,
  },
  description: {
    textAlign: 'center',
    marginBottom: 16,
    color: '#666',
  },
  featuresList: {
    marginBottom: 16,
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
  disclaimer: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  confirmButton: {
    flex: 1,
  },
  lifetimeButton: {
    backgroundColor: '#4CAF50',
  },
});