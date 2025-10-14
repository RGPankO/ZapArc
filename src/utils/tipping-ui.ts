// Tipping UI Manager for Lightning Network Tipping Extension
// Handles enhanced tip prompt creation, QR code display, and payment interfaces

import { TipRequest, UserSettings } from '../types';
import { ExtensionMessaging } from './messaging';
import { paymentProcessor, PaymentOptions } from './payment-processor';
import { qrGenerator } from './qr-generator';
import { paymentStatusTracker } from './payment-status-tracker';

export interface TipPromptOptions {
  tip: TipRequest;
  userSettings: UserSettings;
  onPayment: (amount: number, comment?: string) => Promise<void>;
  onQRCode: (amount: number, comment?: string) => void;
  onBlock: () => Promise<void>;
  onClose: () => void;
}

export interface PaymentConfirmationOptions {
  amount: number;
  lnurl: string;
  comment?: string;
  balance: number;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export class TippingUI {
  private static readonly ANIMATION_DURATION = 300;

  /**
   * Create enhanced tip prompt with 6 amount buttons and comment field
   */
  static createEnhancedTipPrompt(options: TipPromptOptions): HTMLElement {
    const prompt = document.createElement('div');
    prompt.className = 'lightning-tip-prompt-enhanced';
    prompt.setAttribute('data-lnurl', options.tip.lnurl);
    prompt.style.cssText = `
      position: absolute;
      background: white;
      border: 2px solid #f7931a;
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      max-width: 380px;
      min-width: 320px;
      opacity: 0;
      transform: translateY(-10px);
      transition: all ${this.ANIMATION_DURATION}ms ease;
    `;

    const { tip, userSettings } = options;
    const authorAmounts = tip.suggestedAmounts;
    const userAmounts = userSettings.defaultTippingAmounts;

    prompt.innerHTML = `
      <div class="tip-header" style="display: flex; align-items: center; margin-bottom: 12px;">
        <span style="color: #f7931a; font-size: 20px; margin-right: 8px;">⚡</span>
        <span style="font-weight: bold; color: #333;">Lightning Tip Available</span>
        <button class="close-btn" style="margin-left: auto; background: none; border: none; font-size: 18px; cursor: pointer; color: #666; padding: 4px;">×</button>
      </div>
      
      <div class="tip-description" style="margin-bottom: 16px; color: #666; font-size: 13px;">
        Choose an amount to tip this content creator:
      </div>
      
      <div class="amount-section" style="margin-bottom: 16px;">
        <div class="author-amounts" style="margin-bottom: 12px;">
          <div style="font-size: 12px; color: #888; margin-bottom: 6px; font-weight: 500;">Author Suggested:</div>
          <div style="display: flex; gap: 8px;">
            ${authorAmounts.map(amount => `
              <button class="tip-amount-btn author-amount" data-amount="${amount}" style="
                flex: 1;
                padding: 10px 8px;
                border: 2px solid #f7931a;
                border-radius: 6px;
                background: white;
                color: #f7931a;
                cursor: pointer;
                font-size: 13px;
                font-weight: bold;
                transition: all 0.2s ease;
              ">${amount.toLocaleString()}<br><span style="font-size: 10px; opacity: 0.8;">sats</span></button>
            `).join('')}
          </div>
        </div>
        
        <div class="user-amounts">
          <div style="font-size: 12px; color: #888; margin-bottom: 6px; font-weight: 500;">Your Defaults:</div>
          <div style="display: flex; gap: 8px;">
            ${userAmounts.map(amount => `
              <button class="tip-amount-btn user-amount" data-amount="${amount}" style="
                flex: 1;
                padding: 10px 8px;
                border: 2px solid #2196F3;
                border-radius: 6px;
                background: white;
                color: #2196F3;
                cursor: pointer;
                font-size: 13px;
                font-weight: bold;
                transition: all 0.2s ease;
              ">${amount.toLocaleString()}<br><span style="font-size: 10px; opacity: 0.8;">sats</span></button>
            `).join('')}
          </div>
        </div>
      </div>
      
      <div class="custom-section" style="margin-bottom: 16px;">
        <div style="display: flex; gap: 8px; margin-bottom: 8px;">
          <input type="number" class="custom-amount-input" placeholder="Custom amount" min="1" style="
            flex: 1;
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 13px;
          ">
          <button class="custom-amount-btn" style="
            padding: 8px 16px;
            border: 1px solid #666;
            border-radius: 4px;
            background: white;
            color: #666;
            cursor: pointer;
            font-size: 13px;
            font-weight: bold;
          ">Tip Custom</button>
        </div>
      </div>
      
      <div class="comment-section" style="margin-bottom: 16px;">
        <textarea class="comment-input" placeholder="Add a comment (optional)" maxlength="200" style="
          width: 100%;
          height: 60px;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 13px;
          font-family: inherit;
          resize: vertical;
          box-sizing: border-box;
        "></textarea>
        <div class="comment-counter" style="text-align: right; font-size: 11px; color: #999; margin-top: 4px;">0/200</div>
      </div>
      
      <div class="action-buttons" style="display: flex; gap: 8px;">
        <button class="qr-code-btn" style="
          flex: 1;
          padding: 10px 12px;
          border: 1px solid #4CAF50;
          border-radius: 4px;
          background: white;
          color: #4CAF50;
          cursor: pointer;
          font-size: 13px;
          font-weight: bold;
        ">📱 Show QR</button>
        
        <button class="block-btn" style="
          padding: 10px 12px;
          border: 1px solid #f44336;
          border-radius: 4px;
          background: white;
          color: #f44336;
          cursor: pointer;
          font-size: 13px;
        ">🚫 Block</button>
      </div>
    `;

    // Add event listeners
    this.setupTipPromptEventListeners(prompt, options);

    // Animate in
    setTimeout(() => {
      prompt.style.opacity = '1';
      prompt.style.transform = 'translateY(0)';
    }, 10);

    return prompt;
  }

  /**
   * Set up event listeners for tip prompt
   */
  private static setupTipPromptEventListeners(prompt: HTMLElement, options: TipPromptOptions): void {
    const { onPayment, onQRCode, onBlock, onClose } = options;

    // Close button
    prompt.querySelector('.close-btn')?.addEventListener('click', () => {
      this.animateOut(prompt, onClose);
    });

    // Amount buttons
    const amountBtns = prompt.querySelectorAll('.tip-amount-btn');
    amountBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const amount = parseInt(btn.getAttribute('data-amount') || '0');
        const comment = (prompt.querySelector('.comment-input') as HTMLTextAreaElement)?.value || undefined;
        this.handlePayment(prompt, amount, comment, onPayment);
      });

      // Hover effects
      btn.addEventListener('mouseenter', () => {
        const btnElement = btn as HTMLElement;
        btnElement.style.transform = 'scale(1.05)';
        if (btn.classList.contains('author-amount')) {
          btnElement.style.background = '#f7931a';
          btnElement.style.color = 'white';
        } else {
          btnElement.style.background = '#2196F3';
          btnElement.style.color = 'white';
        }
      });

      btn.addEventListener('mouseleave', () => {
        const btnElement = btn as HTMLElement;
        btnElement.style.transform = 'scale(1)';
        btnElement.style.background = 'white';
        if (btn.classList.contains('author-amount')) {
          btnElement.style.color = '#f7931a';
        } else {
          btnElement.style.color = '#2196F3';
        }
      });
    });

    // Custom amount button
    const customBtn = prompt.querySelector('.custom-amount-btn');
    const customInput = prompt.querySelector('.custom-amount-input') as HTMLInputElement;
    
    customBtn?.addEventListener('click', () => {
      const amount = parseInt(customInput.value);
      if (isNaN(amount) || amount <= 0) {
        this.showInputError(customInput, 'Please enter a valid amount');
        return;
      }
      const comment = (prompt.querySelector('.comment-input') as HTMLTextAreaElement)?.value || undefined;
      this.handlePayment(prompt, amount, comment, onPayment);
    });

    // Enter key on custom input
    customInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        (customBtn as HTMLButtonElement)?.click();
      }
    });

    // Comment counter
    const commentInput = prompt.querySelector('.comment-input') as HTMLTextAreaElement;
    const commentCounter = prompt.querySelector('.comment-counter');
    
    commentInput?.addEventListener('input', () => {
      const length = commentInput.value.length;
      if (commentCounter) {
        commentCounter.textContent = `${length}/200`;
        (commentCounter as HTMLElement).style.color = length > 180 ? '#f44336' : '#999';
      }
    });

    // QR code button with enhanced generation
    prompt.querySelector('.qr-code-btn')?.addEventListener('click', async () => {
      // Get selected amount or custom amount
      let amount = 0;
      const customAmount = parseInt(customInput.value);
      
      if (customAmount > 0) {
        amount = customAmount;
      } else {
        // Use first author suggested amount as default
        amount = options.tip.suggestedAmounts[0];
      }
      
      const comment = commentInput?.value || undefined;
      const lnurl = options.tip.lnurl;
      
      // Generate and show QR code
      await this.showEnhancedQRCode(lnurl, amount, comment);
    });

    // Block button
    prompt.querySelector('.block-btn')?.addEventListener('click', () => {
      this.animateOut(prompt, async () => {
        await onBlock();
        onClose();
      });
    });

    // Click outside to close
    setTimeout(() => {
      const clickOutsideHandler = (event: Event) => {
        if (!prompt.contains(event.target as Node)) {
          this.animateOut(prompt, onClose);
          document.removeEventListener('click', clickOutsideHandler);
        }
      };
      document.addEventListener('click', clickOutsideHandler);
    }, 100);
  }

  /**
   * Handle payment with confirmation and processing
   */
  private static async handlePayment(
    prompt: HTMLElement, 
    amount: number, 
    comment: string | undefined, 
    onPayment: (amount: number, comment?: string) => Promise<void>
  ): Promise<void> {
    try {
      // Check if wallet is connected first
      const walletResponse = await ExtensionMessaging.isWalletConnected();
      if (!walletResponse.success || !walletResponse.data) {
        this.showWalletSetupPrompt(prompt);
        return;
      }

      // Check balance
      const balanceResponse = await ExtensionMessaging.getBalance();
      if (!balanceResponse.success) {
        this.showError(prompt, 'Failed to check wallet balance');
        return;
      }

      const balance = balanceResponse.data || 0;
      const estimatedFee = Math.max(1, Math.floor(amount * 0.001));
      const totalRequired = amount + estimatedFee;

      if (balance < totalRequired) {
        this.showInsufficientBalancePrompt(prompt, amount, balance);
        return;
      }

      // Get LNURL from the tip request (this would be passed from the tip prompt)
      const lnurl = prompt.getAttribute('data-lnurl') || '';
      if (!lnurl) {
        this.showError(prompt, 'Invalid tip request - missing LNURL');
        return;
      }

      // Show confirmation dialog with enhanced payment processing
      this.showEnhancedPaymentConfirmation({
        amount,
        lnurl,
        comment,
        balance,
        onConfirm: async () => {
          await this.processPaymentWithTracking(prompt, {
            lnurl,
            amount,
            comment,
            useBuiltInWallet: true
          });
        },
        onCancel: () => {
          // Just close confirmation, keep tip prompt open
        }
      });

    } catch (error) {
      console.error('Payment handling error:', error);
      this.showError(prompt, 'Payment failed. Please try again.');
    }
  }

  /**
   * Process payment with full status tracking and user feedback
   */
  private static async processPaymentWithTracking(
    prompt: HTMLElement,
    options: PaymentOptions
  ): Promise<void> {
    try {
      // Create status display in the prompt
      const statusContainer = document.createElement('div');
      statusContainer.className = 'payment-status-container';
      statusContainer.style.cssText = `
        margin-top: 12px;
        padding: 12px;
        background: #f8f9fa;
        border-radius: 6px;
        border: 1px solid #e9ecef;
      `;
      
      prompt.appendChild(statusContainer);

      // Start payment processing
      const result = await paymentProcessor.processPayment(options);

      if (result.success) {
        // Show success message
        paymentStatusTracker.showToast({
          id: `success_${Date.now()}`,
          type: 'success',
          title: 'Payment Successful! ⚡',
          message: `Successfully sent ${options.amount.toLocaleString()} sats`,
          duration: 3000
        });

        // Close the tip prompt after success
        setTimeout(() => {
          this.animateOut(prompt, () => {});
        }, 1500);

      } else {
        // Show error with retry option
        paymentStatusTracker.showToast({
          id: `error_${Date.now()}`,
          type: 'error',
          title: 'Payment Failed',
          message: result.error || 'Payment could not be completed',
          duration: 8000,
          actions: result.retryable ? [{
            label: 'Retry',
            action: () => this.processPaymentWithTracking(prompt, options),
            style: 'primary'
          }] : []
        });

        // Update status container with error
        statusContainer.innerHTML = `
          <div style="color: #f44336; font-size: 13px; text-align: center;">
            <div style="font-weight: bold; margin-bottom: 4px;">Payment Failed</div>
            <div>${result.error}</div>
            ${result.retryable ? `
              <button class="retry-payment-btn" style="
                margin-top: 8px;
                padding: 6px 12px;
                border: 1px solid #f44336;
                border-radius: 4px;
                background: white;
                color: #f44336;
                cursor: pointer;
                font-size: 12px;
                font-weight: bold;
              ">Try Again</button>
            ` : ''}
          </div>
        `;

        // Add retry button listener
        const retryBtn = statusContainer.querySelector('.retry-payment-btn');
        if (retryBtn) {
          retryBtn.addEventListener('click', () => {
            statusContainer.remove();
            this.processPaymentWithTracking(prompt, options);
          });
        }
      }

    } catch (error) {
      console.error('Payment processing error:', error);
      this.showError(prompt, 'Payment processing failed. Please try again.');
    }
  }

  /**
   * Show enhanced payment confirmation dialog with better error handling
   */
  static showEnhancedPaymentConfirmation(options: PaymentConfirmationOptions): void {
    const { amount, comment, balance, onConfirm, onCancel } = options;
    
    const modal = document.createElement('div');
    modal.className = 'lightning-payment-confirmation';
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
      opacity: 0;
      transition: opacity ${this.ANIMATION_DURATION}ms ease;
    `;

    const estimatedFee = Math.max(1, Math.floor(amount * 0.001)); // Rough estimate

    modal.innerHTML = `
      <div style="
        background: white;
        border-radius: 12px;
        padding: 24px;
        max-width: 400px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        transform: scale(0.9);
        transition: transform ${this.ANIMATION_DURATION}ms ease;
      ">
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="font-size: 48px; margin-bottom: 8px;">⚡</div>
          <h3 style="margin: 0 0 8px 0; color: #333;">Confirm Lightning Payment</h3>
        </div>
        
        <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #666;">Amount:</span>
            <span style="font-weight: bold; color: #f7931a;">${amount.toLocaleString()} sats</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #666;">Est. Fee:</span>
            <span style="color: #666;">~${estimatedFee} sats</span>
          </div>
          <div style="border-top: 1px solid #ddd; margin: 8px 0; padding-top: 8px;">
            <div style="display: flex; justify-content: space-between;">
              <span style="font-weight: bold;">Total:</span>
              <span style="font-weight: bold; color: #333;">${(amount + estimatedFee).toLocaleString()} sats</span>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 8px;">
            <span style="color: #666;">Your Balance:</span>
            <span style="color: ${balance >= (amount + estimatedFee) ? '#4CAF50' : '#f44336'};">${balance.toLocaleString()} sats</span>
          </div>
        </div>
        
        ${comment ? `
          <div style="background: #f0f7ff; border-radius: 8px; padding: 12px; margin-bottom: 20px;">
            <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Comment:</div>
            <div style="font-style: italic; color: #333;">"${comment}"</div>
          </div>
        ` : ''}
        
        <div style="display: flex; gap: 12px;">
          <button class="cancel-payment" style="
            flex: 1;
            padding: 12px 16px;
            border: 1px solid #ddd;
            border-radius: 6px;
            background: white;
            color: #666;
            cursor: pointer;
            font-size: 14px;
          ">Cancel</button>
          
          <button class="confirm-payment" style="
            flex: 1;
            padding: 12px 16px;
            border: none;
            border-radius: 6px;
            background: #f7931a;
            color: white;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
          ">Send Payment</button>
        </div>
      </div>
    `;

    // Add event listeners
    modal.querySelector('.cancel-payment')?.addEventListener('click', () => {
      this.animateOut(modal, onCancel);
    });

    modal.querySelector('.confirm-payment')?.addEventListener('click', async () => {
      const confirmBtn = modal.querySelector('.confirm-payment') as HTMLButtonElement;
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Sending...';
      
      try {
        await onConfirm();
        this.animateOut(modal, () => {});
      } catch (error) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Send Payment';
        console.error('Payment confirmation error:', error);
      }
    });

    // Close on outside click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.animateOut(modal, onCancel);
      }
    });

    document.body.appendChild(modal);

    // Animate in
    setTimeout(() => {
      modal.style.opacity = '1';
      const content = modal.querySelector('div > div') as HTMLElement;
      if (content) {
        content.style.transform = 'scale(1)';
      }
    }, 10);
  }

  /**
   * Show enhanced QR code modal with actual QR generation
   */
  static async showEnhancedQRCode(lnurl: string, amount: number, comment?: string): Promise<void> {
    try {
      // Generate Lightning URI (works without Breez SDK)
      const lightningURI = ExtensionMessaging.generateLightningURI(lnurl, amount, comment);
      
      // Generate QR code from the Lightning URI
      const qrResult = await qrGenerator.generateLightningURI(lightningURI);
      
      if (!qrResult.success) {
        paymentStatusTracker.showToast({
          id: `qr_error_${Date.now()}`,
          type: 'error',
          title: 'QR Code Generation Failed',
          message: qrResult.error || 'Could not generate QR code',
          duration: 5000
        });
        return;
      }

      this.showQRCodeModal(lightningURI, amount, comment, qrResult.dataUrl);

    } catch (error) {
      console.error('QR code generation error:', error);
      paymentStatusTracker.showToast({
        id: `qr_error_${Date.now()}`,
        type: 'error',
        title: 'QR Code Error',
        message: 'Failed to generate QR code',
        duration: 5000
      });
    }
  }

  /**
   * Show QR code modal with generated QR image
   */
  static showQRCodeModal(lnurl: string, amount: number, comment?: string, qrDataUrl?: string): void {
    const modal = document.createElement('div');
    modal.className = 'lightning-qr-modal';
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
      opacity: 0;
      transition: opacity ${this.ANIMATION_DURATION}ms ease;
    `;

    modal.innerHTML = `
      <div style="
        background: white;
        border-radius: 12px;
        padding: 24px;
        max-width: 400px;
        text-align: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        transform: scale(0.9);
        transition: transform ${this.ANIMATION_DURATION}ms ease;
      ">
        <div style="margin-bottom: 20px;">
          <h3 style="margin: 0 0 8px 0; color: #333;">Scan with Lightning Wallet</h3>
          <p style="margin: 0; color: #666; font-size: 14px;">Amount: ${amount.toLocaleString()} sats</p>
        </div>
        
        <div style="
          width: 200px;
          height: 200px;
          background: #f0f0f0;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px auto;
          border: 2px dashed #ddd;
          overflow: hidden;
        ">
          ${qrDataUrl ? `
            <img src="${qrDataUrl}" alt="Lightning Payment QR Code" style="
              width: 100%;
              height: 100%;
              object-fit: contain;
            ">
          ` : `
            <div style="text-align: center; color: #999;">
              <div style="font-size: 48px; margin-bottom: 8px;">📱</div>
              <div style="font-size: 12px;">QR Code<br>Generation Failed</div>
            </div>
          `}
        </div>
        
        <div style="background: #f8f9fa; border-radius: 8px; padding: 12px; margin-bottom: 20px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">LNURL:</div>
          <div style="font-family: monospace; font-size: 10px; word-break: break-all; color: #333;">
            ${lnurl.substring(0, 50)}...
          </div>
        </div>
        
        ${comment ? `
          <div style="background: #f0f7ff; border-radius: 8px; padding: 12px; margin-bottom: 20px;">
            <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Comment:</div>
            <div style="font-style: italic; color: #333;">"${comment}"</div>
          </div>
        ` : ''}
        
        <div style="display: flex; gap: 12px;">
          <button class="copy-lnurl" style="
            flex: 1;
            padding: 10px 16px;
            border: 1px solid #2196F3;
            border-radius: 6px;
            background: white;
            color: #2196F3;
            cursor: pointer;
            font-size: 14px;
          ">Copy LNURL</button>
          
          <button class="close-qr" style="
            flex: 1;
            padding: 10px 16px;
            border: 1px solid #ddd;
            border-radius: 6px;
            background: white;
            color: #666;
            cursor: pointer;
            font-size: 14px;
          ">Close</button>
        </div>
      </div>
    `;

    // Add event listeners
    modal.querySelector('.copy-lnurl')?.addEventListener('click', () => {
      navigator.clipboard.writeText(lnurl);
      const btn = modal.querySelector('.copy-lnurl') as HTMLButtonElement;
      const originalText = btn.textContent;
      btn.textContent = 'Copied!';
      btn.style.background = '#4CAF50';
      btn.style.color = 'white';
      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = 'white';
        btn.style.color = '#2196F3';
      }, 2000);
    });

    modal.querySelector('.close-qr')?.addEventListener('click', () => {
      this.animateOut(modal, () => {});
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.animateOut(modal, () => {});
      }
    });

    document.body.appendChild(modal);

    // Animate in
    setTimeout(() => {
      modal.style.opacity = '1';
      const content = modal.querySelector('div > div') as HTMLElement;
      if (content) {
        content.style.transform = 'scale(1)';
      }
    }, 10);
  }

  /**
   * Show wallet setup prompt
   */
  private static showWalletSetupPrompt(parentElement: HTMLElement): void {
    this.showError(parentElement, 'Please set up your wallet first. Click the extension icon to get started.');
  }

  /**
   * Show insufficient balance prompt
   */
  private static showInsufficientBalancePrompt(parentElement: HTMLElement, amount: number, balance: number): void {
    this.showError(parentElement, `Insufficient balance. Need ${amount.toLocaleString()} sats, have ${balance.toLocaleString()} sats.`);
  }

  /**
   * Show input error
   */
  private static showInputError(input: HTMLInputElement, message: string): void {
    input.style.borderColor = '#f44336';
    input.style.background = '#ffebee';
    
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      color: #f44336;
      font-size: 12px;
      margin-top: 4px;
    `;
    errorDiv.textContent = message;
    
    input.parentNode?.insertBefore(errorDiv, input.nextSibling);
    
    setTimeout(() => {
      input.style.borderColor = '';
      input.style.background = '';
      errorDiv.remove();
    }, 3000);
  }

  /**
   * Show error message
   */
  private static showError(parentElement: HTMLElement, message: string): void {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      background: #ffebee;
      color: #f44336;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      margin-top: 8px;
      border-left: 3px solid #f44336;
    `;
    errorDiv.textContent = message;
    
    parentElement.appendChild(errorDiv);
    
    setTimeout(() => {
      errorDiv.remove();
    }, 5000);
  }

  /**
   * Animate element out and call callback
   */
  private static animateOut(element: HTMLElement, callback: () => void): void {
    element.style.opacity = '0';
    element.style.transform = 'translateY(-10px) scale(0.95)';
    
    setTimeout(() => {
      element.remove();
      callback();
    }, this.ANIMATION_DURATION);
  }
}