// Payment Integration Example
// Demonstrates how all payment processing components work together

import { paymentProcessor, PaymentOptions } from './payment-processor';
import { qrGenerator } from './qr-generator';
import { paymentStatusTracker } from './payment-status-tracker';
import { TippingUI } from './tipping-ui';
import { ExtensionMessaging } from './messaging';

/**
 * Complete payment workflow example
 * This shows how to integrate all payment processing components
 */
export class PaymentIntegrationExample {
  
  /**
   * Example: Process a tip payment with full workflow
   */
  static async processTipPayment(
    lnurl: string,
    amount: number,
    comment?: string
  ): Promise<void> {
    try {
      console.log('Starting tip payment workflow...');

      // Step 1: Create payment options
      const paymentOptions: PaymentOptions = {
        lnurl,
        amount,
        comment,
        useBuiltInWallet: true
      };

      // Step 2: Check if wallet is available
      const walletStatus = await ExtensionMessaging.isWalletConnected();
      if (!walletStatus.success || !walletStatus.data) {
        // Show wallet setup prompt
        this.showWalletSetupPrompt();
        return;
      }

      // Step 3: Validate payment amount and get user confirmation
      const confirmed = await this.showPaymentConfirmation(paymentOptions);
      if (!confirmed) {
        console.log('Payment cancelled by user');
        return;
      }

      // Step 4: Process payment with status tracking
      const paymentResult = await paymentProcessor.processPayment(paymentOptions);

      // Step 5: Handle result
      if (paymentResult.success) {
        paymentStatusTracker.showToast({
          id: `success_${Date.now()}`,
          type: 'success',
          title: 'Payment Successful! ⚡',
          message: `Successfully sent ${amount.toLocaleString()} sats`,
          duration: 3000
        });
        
        console.log('Payment completed successfully:', paymentResult.transactionId);
      } else {
        // Show error with retry option if applicable
        paymentStatusTracker.showToast({
          id: `error_${Date.now()}`,
          type: 'error',
          title: 'Payment Failed',
          message: paymentResult.error || 'Payment could not be completed',
          duration: 8000,
          actions: paymentResult.retryable ? [{
            label: 'Retry',
            action: () => this.processTipPayment(lnurl, amount, comment),
            style: 'primary'
          }] : []
        });
        
        console.error('Payment failed:', paymentResult.error);
      }

    } catch (error) {
      console.error('Payment workflow error:', error);
      paymentStatusTracker.showToast({
        id: `error_${Date.now()}`,
        type: 'error',
        title: 'Payment Error',
        message: 'An unexpected error occurred during payment processing',
        duration: 5000
      });
    }
  }

  /**
   * Example: Generate and display QR code for external wallet
   */
  static async generateQRCodeForExternalWallet(
    lnurl: string,
    amount: number,
    comment?: string
  ): Promise<void> {
    try {
      console.log('Generating QR code for external wallet...');

      // Step 1: Generate QR code with Lightning URI
      const qrResult = await qrGenerator.generateLightningURI(lnurl, amount, comment);

      if (!qrResult.success) {
        paymentStatusTracker.showToast({
          id: `qr_error_${Date.now()}`,
          type: 'error',
          title: 'QR Generation Failed',
          message: qrResult.error || 'Could not generate QR code',
          duration: 5000
        });
        return;
      }

      // Step 2: Display QR code modal
      TippingUI.showQRCodeModal(lnurl, amount, comment, qrResult.dataUrl);

      console.log('QR code displayed successfully');

    } catch (error) {
      console.error('QR code generation error:', error);
      paymentStatusTracker.showToast({
        id: `qr_error_${Date.now()}`,
        type: 'error',
        title: 'QR Code Error',
        message: 'Failed to generate QR code for external wallet',
        duration: 5000
      });
    }
  }

  /**
   * Example: Handle payment with both built-in and external wallet options
   */
  static async handlePaymentWithOptions(
    lnurl: string,
    amount: number,
    comment?: string
  ): Promise<void> {
    try {
      // Check wallet availability
      const walletStatus = await ExtensionMessaging.isWalletConnected();
      const hasBuiltInWallet = walletStatus.success && walletStatus.data;

      if (hasBuiltInWallet) {
        // Show payment method selection
        const useBuiltIn = await this.showPaymentMethodSelection();
        
        if (useBuiltIn) {
          // Use built-in wallet
          await this.processTipPayment(lnurl, amount, comment);
        } else {
          // Generate QR for external wallet
          await this.generateQRCodeForExternalWallet(lnurl, amount, comment);
        }
      } else {
        // Only external wallet option available
        await this.generateQRCodeForExternalWallet(lnurl, amount, comment);
      }

    } catch (error) {
      console.error('Payment handling error:', error);
    }
  }

  /**
   * Example: Monitor payment status with real-time updates
   */
  static monitorPaymentStatus(paymentId: string): void {
    // Subscribe to payment status updates
    paymentStatusTracker.onPaymentStatusChange(paymentId, (status) => {
      console.log(`Payment ${paymentId} status update:`, status);

      // Create status display
      const statusDisplay = paymentStatusTracker.createStatusDisplay(status, {
        showProgress: true,
        showRetryButton: true,
        showCancelButton: status.status === 'pending'
      });

      // Add to page (example positioning)
      const container = document.getElementById('payment-status-container');
      if (container) {
        container.appendChild(statusDisplay);
      }

      // Handle completion
      if (status.status === 'completed') {
        paymentStatusTracker.showToast({
          id: `completed_${Date.now()}`,
          type: 'success',
          title: 'Payment Completed',
          message: `Successfully sent ${status.amount.toLocaleString()} sats`,
          duration: 3000
        });
      }

      // Handle failure with retry option
      if (status.status === 'failed') {
        paymentStatusTracker.showToast({
          id: `failed_${Date.now()}`,
          type: 'error',
          title: 'Payment Failed',
          message: status.error || 'Payment could not be completed',
          duration: 8000,
          actions: status.retryCount < status.maxRetries ? [{
            label: 'Retry Payment',
            action: () => {
              paymentProcessor.retryPayment(paymentId);
            },
            style: 'primary'
          }] : []
        });
      }
    });
  }

  /**
   * Example: Batch payment processing with error handling
   */
  static async processBatchPayments(
    payments: Array<{ lnurl: string; amount: number; comment?: string }>
  ): Promise<void> {
    console.log(`Processing ${payments.length} payments...`);

    const results = [];
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < payments.length; i++) {
      const payment = payments[i];
      
      try {
        console.log(`Processing payment ${i + 1}/${payments.length}...`);
        
        const result = await paymentProcessor.processPayment({
          lnurl: payment.lnurl,
          amount: payment.amount,
          comment: payment.comment,
          useBuiltInWallet: true
        });

        results.push({ ...payment, result });

        if (result.success) {
          successCount++;
        } else {
          failureCount++;
        }

        // Add delay between payments to avoid rate limiting
        if (i < payments.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        console.error(`Payment ${i + 1} failed:`, error);
        failureCount++;
        results.push({ 
          ...payment, 
          result: { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          } 
        });
      }
    }

    // Show batch results
    paymentStatusTracker.showToast({
      id: `batch_${Date.now()}`,
      type: failureCount === 0 ? 'success' : successCount === 0 ? 'error' : 'warning',
      title: 'Batch Payment Results',
      message: `${successCount} successful, ${failureCount} failed out of ${payments.length} payments`,
      duration: 8000
    });

    console.log('Batch payment results:', { successCount, failureCount, results });
  }

  /**
   * Private helper: Show wallet setup prompt
   */
  private static showWalletSetupPrompt(): void {
    paymentStatusTracker.showToast({
      id: `setup_${Date.now()}`,
      type: 'info',
      title: 'Wallet Setup Required',
      message: 'Please set up your Lightning wallet to send payments',
      duration: 8000,
      actions: [{
        label: 'Setup Wallet',
        action: () => {
          // Open extension popup for wallet setup
          chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
        },
        style: 'primary'
      }]
    });
  }

  /**
   * Private helper: Show payment confirmation
   */
  private static async showPaymentConfirmation(options: PaymentOptions): Promise<boolean> {
    return new Promise((resolve) => {
      // Get current balance
      ExtensionMessaging.getBalance().then(balanceResponse => {
        const balance = balanceResponse.success ? balanceResponse.data || 0 : 0;
        
        TippingUI.showEnhancedPaymentConfirmation({
          amount: options.amount,
          lnurl: options.lnurl,
          comment: options.comment,
          balance,
          onConfirm: async () => {
            resolve(true);
          },
          onCancel: () => {
            resolve(false);
          }
        });
      });
    });
  }

  /**
   * Private helper: Show payment method selection
   */
  private static async showPaymentMethodSelection(): Promise<boolean> {
    return new Promise((resolve) => {
      // Create simple modal for method selection
      const modal = document.createElement('div');
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        z-index: 10002;
        display: flex;
        align-items: center;
        justify-content: center;
      `;

      modal.innerHTML = `
        <div style="
          background: white;
          border-radius: 12px;
          padding: 24px;
          max-width: 400px;
          text-align: center;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        ">
          <h3 style="margin: 0 0 16px 0;">Choose Payment Method</h3>
          <p style="margin: 0 0 24px 0; color: #666;">
            How would you like to send this Lightning payment?
          </p>
          <div style="display: flex; gap: 12px;">
            <button class="built-in-wallet" style="
              flex: 1;
              padding: 12px 16px;
              border: none;
              border-radius: 6px;
              background: #f7931a;
              color: white;
              cursor: pointer;
              font-weight: bold;
            ">Built-in Wallet</button>
            <button class="external-wallet" style="
              flex: 1;
              padding: 12px 16px;
              border: 1px solid #ddd;
              border-radius: 6px;
              background: white;
              color: #666;
              cursor: pointer;
            ">External Wallet</button>
          </div>
        </div>
      `;

      modal.querySelector('.built-in-wallet')?.addEventListener('click', () => {
        modal.remove();
        resolve(true);
      });

      modal.querySelector('.external-wallet')?.addEventListener('click', () => {
        modal.remove();
        resolve(false);
      });

      document.body.appendChild(modal);
    });
  }
}

// Example usage functions for testing
export const examples = {
  // Simple tip payment
  async tipCreator() {
    await PaymentIntegrationExample.processTipPayment(
      'lnurl1dp68gurn8ghj7um9wfmxjcm99e3k7mf0v9cxj0m385ekvcenxc6r2c35xvukxefcv5mkvv34x5ekzd3ev56nyd3hxqurzepexejxxepnxscrvwfnv9nxzcn9xq6xyefhvgcxxcmyxymnserxfq5fns',
      1000,
      'Great content!'
    );
  },

  // QR code generation
  async showQRCode() {
    await PaymentIntegrationExample.generateQRCodeForExternalWallet(
      'lnurl1dp68gurn8ghj7um9wfmxjcm99e3k7mf0v9cxj0m385ekvcenxc6r2c35xvukxefcv5mkvv34x5ekzd3ev56nyd3hxqurzepexejxxepnxscrvwfnv9nxzcn9xq6xyefhvgcxxcmyxymnserxfq5fns',
      500,
      'Thanks for sharing!'
    );
  },

  // Payment with options
  async paymentWithOptions() {
    await PaymentIntegrationExample.handlePaymentWithOptions(
      'lnurl1dp68gurn8ghj7um9wfmxjcm99e3k7mf0v9cxj0m385ekvcenxc6r2c35xvukxefcv5mkvv34x5ekzd3ev56nyd3hxqurzepexejxxepnxscrvwfnv9nxzcn9xq6xyefhvgcxxcmyxymnserxfq5fns',
      2000
    );
  },

  // Batch payments
  async batchPayments() {
    await PaymentIntegrationExample.processBatchPayments([
      { lnurl: 'lnurl1...', amount: 100, comment: 'Tip 1' },
      { lnurl: 'lnurl2...', amount: 200, comment: 'Tip 2' },
      { lnurl: 'lnurl3...', amount: 300, comment: 'Tip 3' }
    ]);
  }
};

// Make examples available globally for testing
(window as any).lightningPaymentExamples = examples;