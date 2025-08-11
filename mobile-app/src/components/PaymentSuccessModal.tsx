import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Modal, Portal, Card, Text, Button } from 'react-native-paper';

interface PaymentSuccessModalProps {
  visible: boolean;
  isSubscription: boolean;
  onClose: () => void;
}

export default function PaymentSuccessModal({
  visible,
  isSubscription,
  onClose,
}: PaymentSuccessModalProps): React.JSX.Element {
  const title = isSubscription ? 'Subscription Activated!' : 'Purchase Successful!';
  const message = isSubscription
    ? 'Your monthly premium subscription has been activated. You now have access to all premium features and an ad-free experience.'
    : 'Your lifetime premium access has been activated. You now have permanent access to all premium features and an ad-free experience.';

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onClose}
        contentContainerStyle={styles.modalContainer}
      >
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.iconContainer}>
              <Text style={styles.successIcon}>🎉</Text>
            </View>

            <Text variant="headlineSmall" style={styles.title}>
              {title}
            </Text>

            <Text variant="bodyMedium" style={styles.message}>
              {message}
            </Text>

            <View style={styles.featuresList}>
              <Text variant="titleMedium" style={styles.featuresTitle}>
                You now have access to:
              </Text>
              <View style={styles.featureRow}>
                <Text style={styles.checkmark}>✓</Text>
                <Text variant="bodyMedium">Ad-free experience</Text>
              </View>
              <View style={styles.featureRow}>
                <Text style={styles.checkmark}>✓</Text>
                <Text variant="bodyMedium">Premium features</Text>
              </View>
              <View style={styles.featureRow}>
                <Text style={styles.checkmark}>✓</Text>
                <Text variant="bodyMedium">Priority support</Text>
              </View>
              {!isSubscription && (
                <View style={styles.featureRow}>
                  <Text style={styles.checkmark}>✓</Text>
                  <Text variant="bodyMedium">Lifetime access</Text>
                </View>
              )}
            </View>

            <Button
              mode="contained"
              onPress={onClose}
              style={styles.closeButton}
              contentStyle={styles.buttonContent}
            >
              Continue
            </Button>
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
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  successIcon: {
    fontSize: 48,
  },
  title: {
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  message: {
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
    lineHeight: 20,
  },
  featuresList: {
    marginBottom: 24,
  },
  featuresTitle: {
    marginBottom: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  checkmark: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  closeButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
});