import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Modal, Portal, Card, Text, Button } from 'react-native-paper';

interface PaymentErrorModalProps {
  visible: boolean;
  error: string | null;
  onRetry?: () => void;
  onClose: () => void;
  showRetry?: boolean;
}

export default function PaymentErrorModal({
  visible,
  error,
  onRetry,
  onClose,
  showRetry = false,
}: PaymentErrorModalProps): React.JSX.Element {
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
              <Text style={styles.errorIcon}>⚠️</Text>
            </View>

            <Text variant="headlineSmall" style={styles.title}>
              Payment Failed
            </Text>

            <Text variant="bodyMedium" style={styles.errorMessage}>
              {error || 'An unexpected error occurred during payment processing.'}
            </Text>

            <Text variant="bodySmall" style={styles.helpText}>
              Please check your payment method and try again. If the problem persists, contact support.
            </Text>

            <View style={styles.buttonContainer}>
              {showRetry && onRetry && (
                <Button
                  mode="outlined"
                  onPress={onRetry}
                  style={styles.retryButton}
                >
                  Try Again
                </Button>
              )}
              <Button
                mode="contained"
                onPress={onClose}
                style={[
                  styles.closeButton,
                  !showRetry && styles.singleButton,
                ]}
              >
                Close
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
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  errorIcon: {
    fontSize: 48,
  },
  title: {
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: 'bold',
    color: '#f44336',
  },
  errorMessage: {
    textAlign: 'center',
    marginBottom: 16,
    color: '#666',
  },
  helpText: {
    textAlign: 'center',
    marginBottom: 24,
    color: '#999',
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  retryButton: {
    flex: 1,
  },
  closeButton: {
    flex: 1,
    backgroundColor: '#f44336',
  },
  singleButton: {
    flex: 0,
    minWidth: 120,
    alignSelf: 'center',
  },
});
