// Withdrawal Interface
// Handles payment preview and sending via Lightning

// @ts-ignore - parse function exists but TypeScript can't find it in re-exports
import { parse as parseInput } from '@breeztech/breez-sdk-spark/web';
import { 
    breezSDK, 
    currentBalance,
    preparedPayment,
    setPreparedPayment
} from './state';
import { showError, showSuccess, showConfirmDialog } from './notifications';

// Callback type for withdrawal operations that need main popup functions
export type WithdrawalCallbacks = {
    updateBalanceDisplay: () => Promise<void>;
    loadTransactionHistory: () => Promise<void>;
};

let callbacks: WithdrawalCallbacks | null = null;

export function setWithdrawalCallbacks(cb: WithdrawalCallbacks): void {
    callbacks = cb;
}

// ========================================
// Withdrawal Interface
// ========================================

export function showWithdrawalInterface(): void {
    console.log('[Withdraw] Showing withdraw interface');

    // Hide main interface
    const mainInterface = document.getElementById('main-interface');
    if (mainInterface) {
        mainInterface.classList.add('hidden');
    }

    // Show withdraw interface
    const withdrawInterface = document.getElementById('withdraw-interface');
    if (withdrawInterface) {
        withdrawInterface.classList.remove('hidden');
    }

    // Update balance display
    const balanceDisplay = document.getElementById('withdraw-balance-display');
    if (balanceDisplay) {
        balanceDisplay.textContent = `${currentBalance.toLocaleString()}`;
    }

    // Reset form
    resetWithdrawForm();

    // Setup listeners
    setupWithdrawalListeners();
}

export function hideWithdrawInterface(): void {
    console.log('[Withdraw] Hiding withdraw interface');

    // Hide withdraw interface
    const withdrawInterface = document.getElementById('withdraw-interface');
    if (withdrawInterface) {
        withdrawInterface.classList.add('hidden');
    }

    // Show main interface
    const mainInterface = document.getElementById('main-interface');
    if (mainInterface) {
        mainInterface.classList.remove('hidden');
    }

    // Reset form and state
    resetWithdrawForm();
    setPreparedPayment(null);
}

export function resetWithdrawForm(): void {
    const paymentInput = document.getElementById('payment-input') as HTMLTextAreaElement;
    const amountInput = document.getElementById('withdrawal-amount') as HTMLInputElement;
    const commentInput = document.getElementById('withdrawal-comment') as HTMLInputElement;
    const previewDiv = document.getElementById('payment-preview');
    const sendBtn = document.getElementById('send-payment-btn') as HTMLButtonElement;
    const previewBtn = document.getElementById('preview-payment-btn') as HTMLButtonElement;
    const statusDiv = document.getElementById('withdrawal-status');

    if (paymentInput) paymentInput.value = '';
    if (amountInput) amountInput.value = '';
    if (commentInput) commentInput.value = '';
    if (previewDiv) previewDiv.classList.add('hidden');
    if (sendBtn) {
        sendBtn.classList.add('hidden');
        sendBtn.disabled = true;
    }
    if (previewBtn) previewBtn.disabled = true;
    if (statusDiv) statusDiv.classList.add('hidden');
}

export function setupWithdrawalListeners(): void {
    console.log('[Withdraw] Setting up listeners');

    // Add back button listener
    const backBtn = document.getElementById('withdraw-back-btn');
    if (backBtn && !backBtn.onclick) {
        backBtn.onclick = () => {
            console.log('[Withdraw] Back button clicked');
            hideWithdrawInterface();
        };
    }

    const paymentInput = document.getElementById('payment-input') as HTMLTextAreaElement;
    const amountInput = document.getElementById('withdrawal-amount') as HTMLInputElement;
    const previewBtn = document.getElementById('preview-payment-btn') as HTMLButtonElement;
    const sendBtn = document.getElementById('send-payment-btn') as HTMLButtonElement;

    // Input validation
    if (paymentInput) {
        paymentInput.addEventListener('input', validateWithdrawalForm);
    }

    if (amountInput) {
        amountInput.addEventListener('input', validateWithdrawalForm);
    }

    // Preview payment
    if (previewBtn) {
        previewBtn.addEventListener('click', previewPayment);
    }

    // Send payment
    if (sendBtn) {
        sendBtn.addEventListener('click', () => {
            console.log('🟢 [Withdraw] Send button CLICKED', { timestamp: new Date().toISOString() });
            sendPayment();
        });
        console.log('✅ [Withdraw] Send button event listener attached');
    } else {
        console.error('❌ [Withdraw] Send button not found - event listener NOT attached');
    }
}

export function validateWithdrawalForm(): void {
    const paymentInput = document.getElementById('payment-input') as HTMLTextAreaElement;
    const previewBtn = document.getElementById('preview-payment-btn') as HTMLButtonElement;
    
    if (!paymentInput || !previewBtn) return;
    
    const input = paymentInput.value.trim();
    const isValidInvoice = input.toLowerCase().startsWith('lnbc') || input.toLowerCase().startsWith('lntb');
    const isValidAddress = input.includes('@') && input.includes('.');
    
    previewBtn.disabled = !(isValidInvoice || isValidAddress);
}

export async function previewPayment(): Promise<void> {
    const paymentInput = document.getElementById('payment-input') as HTMLTextAreaElement;
    const amountInput = document.getElementById('withdrawal-amount') as HTMLInputElement;
    const previewBtn = document.getElementById('preview-payment-btn') as HTMLButtonElement;

    if (!paymentInput) return;

    try {
        if (!breezSDK) {
            showError('Wallet not connected. Please unlock wallet first.');
            return;
        }

        previewBtn.disabled = true;
        previewBtn.textContent = 'Analyzing...';

        const input = paymentInput.value.trim();
        const amount = amountInput ? parseInt(amountInput.value) || 0 : 0;

        console.log('🔍 [Withdraw] Analyzing input:', { input: input.substring(0, 50) });

        const isInvoice = input.toLowerCase().startsWith('lnbc') || input.toLowerCase().startsWith('lntb');

        if (isInvoice) {
            // For BOLT11 invoices, use prepareSendPayment
            console.log('🔍 [Withdraw] Using prepareSendPayment for BOLT11 invoice');
            const prepared = await breezSDK.prepareSendPayment({
                paymentRequest: input,
                amountSats: amount > 0 ? amount : undefined
            });

            setPreparedPayment(prepared);
            console.log('✅ [Withdraw] Payment prepared:', prepared);

            const previewData = {
                recipient: 'Lightning Payment',
                amount: prepared.amountSats || amount || 0,
                fee: prepared.paymentMethod?.lightningFeeSats || 0,
                type: 'bolt11',
                prepareResponse: prepared
            };

            displayPaymentPreview(previewData);
        } else {
            // For LNURL/Lightning addresses
            let lnurlInput = input;
            if (input.includes('@') && !input.toLowerCase().startsWith('lnurl')) {
                const [username, domain] = input.split('@');
                lnurlInput = `https://${domain}/.well-known/lnurlp/${username}`;
                console.log(`[Withdraw] Converted Lightning address to LNURL: ${lnurlInput}`);
            }

            console.log(`[Withdraw] Parsing LNURL: ${lnurlInput}`);
            const parsed = await parseInput(lnurlInput);
            console.log('[Withdraw] Parsed LNURL result:', parsed);

            if (parsed.type !== 'lnurlPay' && parsed.type !== 'lightningAddress') {
                throw new Error(`Unsupported input type: ${parsed.type}`);
            }

            const payRequest = parsed.type === 'lightningAddress' ? parsed.payRequest : parsed;

            if (!amount || amount <= 0) {
                throw new Error('Amount is required for Lightning addresses and LNURL payments');
            }

            const minSendableSats = Math.ceil((payRequest.minSendable || 0) / 1000);
            const maxSendableSats = Math.floor((payRequest.maxSendable || Number.MAX_SAFE_INTEGER) / 1000);

            if (amount < minSendableSats) {
                throw new Error(`Amount must be at least ${minSendableSats} sats`);
            }
            if (amount > maxSendableSats) {
                throw new Error(`Amount cannot exceed ${maxSendableSats} sats`);
            }

            const commentInput = document.getElementById('withdrawal-comment') as HTMLInputElement;
            const comment = commentInput?.value?.trim() || undefined;

            console.log('[Withdraw] Preparing LNURL payment with prepareLnurlPay');
            const prepareResponse = await breezSDK.prepareLnurlPay({
                amountSats: amount,
                payRequest: payRequest,
                comment: comment,
                validateSuccessActionUrl: true
            });

            console.log('[Withdraw] LNURL payment prepared:', prepareResponse);

            setPreparedPayment(prepareResponse);

            const previewData = {
                recipient: input,
                amount: amount,
                fee: prepareResponse.feeSats,
                type: 'lnurl',
                prepareResponse: prepareResponse
            };

            displayPaymentPreview(previewData);
        }
    } catch (error) {
        console.error('❌ [Withdraw] Payment preview error:', error);
        showError(error instanceof Error ? error.message : 'Failed to preview payment');
    } finally {
        previewBtn.disabled = false;
        previewBtn.textContent = 'Preview Payment';
    }
}

export function displayPaymentPreview(previewData: any): void {
    const previewDiv = document.getElementById('payment-preview');
    const sendBtn = document.getElementById('send-payment-btn') as HTMLButtonElement;
    
    if (!previewDiv || !sendBtn) return;
    
    const recipientEl = document.getElementById('preview-recipient');
    const amountEl = document.getElementById('preview-amount');
    const feeEl = document.getElementById('preview-fee');
    const totalEl = document.getElementById('preview-total');
    
    if (recipientEl) recipientEl.textContent = previewData.recipient || 'Lightning Payment';
    if (amountEl) amountEl.textContent = `${previewData.amount.toLocaleString()} sats`;
    if (feeEl) feeEl.textContent = `${previewData.fee.toLocaleString()} sats`;
    if (totalEl) totalEl.textContent = `${(previewData.amount + previewData.fee).toLocaleString()} sats`;
    
    previewDiv.classList.remove('hidden');
    sendBtn.classList.remove('hidden');
    sendBtn.disabled = false;
}

export async function sendPayment(): Promise<void> {
    console.log('🔵 [Withdraw] sendPayment() ENTRY');

    const paymentInput = document.getElementById('payment-input') as HTMLTextAreaElement;
    const sendBtn = document.getElementById('send-payment-btn') as HTMLButtonElement;
    const statusDiv = document.getElementById('withdrawal-status');
    const statusText = document.getElementById('withdrawal-status-text');

    if (!paymentInput || !sendBtn) {
        console.error('❌ [Withdraw] Missing required elements');
        return;
    }

    // Confirm payment
    console.log('🔵 [Withdraw] Showing confirmation dialog...');
    const confirmed = await showConfirmDialog('Confirm Payment', 'Are you sure you want to send this payment? This action cannot be undone.');
    console.log('🔍 [Withdraw] Dialog result:', { confirmed });

    if (!confirmed) {
        console.log('🔍 [Withdraw] Payment cancelled by user');
        return;
    }

    try {
        if (!breezSDK) {
            showError('Wallet not connected. Please unlock wallet first.');
            return;
        }

        sendBtn.disabled = true;
        sendBtn.textContent = 'Sending...';

        if (statusDiv) statusDiv.classList.remove('hidden');
        if (statusText) statusText.textContent = 'Processing payment...';

        if (!preparedPayment) {
            showError('Please preview payment first');
            return;
        }

        console.log('🔵 [Withdraw] Sending payment via SDK...');

        // Check payment type
        const isLnurlPayment = preparedPayment && 'feeSats' in preparedPayment && !('paymentMethod' in preparedPayment);

        if (isLnurlPayment) {
            console.log('🔵 [Withdraw] Executing LNURL payment');
            const result = await breezSDK.lnurlPay({
                prepareResponse: preparedPayment
            });

            console.log('✅ [Withdraw] LNURL payment sent successfully', result);

            if (result.successAction) {
                console.log('🎉 [Withdraw] Success action:', result.successAction);
            }
        } else {
            console.log('🔵 [Withdraw] Executing BOLT11 payment');
            await breezSDK.sendPayment({
                prepareResponse: preparedPayment
            });

            console.log('✅ [Withdraw] Payment sent successfully');
        }

        // Clear prepared payment
        setPreparedPayment(null);

        // Cleanup stale dialogs
        document.querySelectorAll('.confirm-dialog-overlay').forEach(el => el.remove());

        if (statusText) {
            statusText.textContent = '✅ Payment sent successfully!';
            statusText.className = 'status-indicator success';
        }

        showSuccess('Payment sent successfully!');

        // Refresh balance and transactions
        await callbacks?.updateBalanceDisplay();
        await callbacks?.loadTransactionHistory();

        // Auto-close interface after 2 seconds
        setTimeout(() => {
            hideWithdrawInterface();
        }, 2000);

    } catch (error) {
        console.error('❌ [Popup] Send payment error:', error);

        document.querySelectorAll('.confirm-dialog-overlay').forEach(el => el.remove());

        if (statusText) {
            statusText.textContent = `❌ ${error instanceof Error ? error.message : 'Payment failed'}`;
            statusText.className = 'status-indicator error';
        }
        showError(error instanceof Error ? error.message : 'Failed to send payment');
    } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send Payment';

        document.querySelectorAll('.confirm-dialog-overlay').forEach(el => el.remove());
    }
}
