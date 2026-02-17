// Withdrawal Interface
// Handles Lightning + On-chain send flows

// @ts-ignore - parse function exists but TypeScript can't find it in re-exports
import { parse as parseInput } from '@breeztech/breez-sdk-spark/web';
import {
    breezSDK,
    currentBalance,
    preparedPayment,
    setPreparedPayment
} from './state';
import { showError, showSuccess, showConfirmDialog } from './notifications';
import { triggerPaymentNotification, extractPubkeyFromParsedInvoice } from '../utils/notification-trigger';
import { openContactPicker } from './contacts';

export type WithdrawalCallbacks = {
    updateBalanceDisplay: () => Promise<void>;
    loadTransactionHistory: () => Promise<void>;
};

let callbacks: WithdrawalCallbacks | null = null;
let withdrawalListenersInitialized = false;

let activeSendTab: 'lightning' | 'onchain' = 'lightning';
let onchainPreparedBySpeed: Partial<Record<'fast' | 'medium' | 'slow', any>> = {};
let onchainSelectedSpeed: 'fast' | 'medium' | 'slow' = 'medium';

export function setWithdrawalCallbacks(cb: WithdrawalCallbacks): void {
    callbacks = cb;
}

export function showWithdrawalInterface(): void {
    const mainInterface = document.getElementById('main-interface');
    const withdrawInterface = document.getElementById('withdraw-interface');

    mainInterface?.classList.add('hidden');
    withdrawInterface?.classList.remove('hidden');

    const balanceDisplay = document.getElementById('withdraw-balance-display');
    if (balanceDisplay) balanceDisplay.textContent = `${currentBalance.toLocaleString()}`;

    resetWithdrawForm();
    setupWithdrawalListeners();
    setSendTab('lightning');
}

export function hideWithdrawInterface(): void {
    const withdrawInterface = document.getElementById('withdraw-interface');
    const mainInterface = document.getElementById('main-interface');

    withdrawInterface?.classList.add('hidden');
    mainInterface?.classList.remove('hidden');

    resetWithdrawForm();
    setPreparedPayment(null);
}

function setSendTab(tab: 'lightning' | 'onchain'): void {
    activeSendTab = tab;

    const lightningBtn = document.getElementById('withdraw-tab-lightning');
    const onchainBtn = document.getElementById('withdraw-tab-onchain');
    const lightningContent = document.getElementById('withdraw-lightning-content');
    const onchainContent = document.getElementById('withdraw-onchain-content');

    lightningBtn?.classList.toggle('active', tab === 'lightning');
    onchainBtn?.classList.toggle('active', tab === 'onchain');
    lightningContent?.classList.toggle('hidden', tab !== 'lightning');
    onchainContent?.classList.toggle('hidden', tab !== 'onchain');

    const statusDiv = document.getElementById('withdrawal-status');
    statusDiv?.classList.add('hidden');
}

export function resetWithdrawForm(): void {
    const paymentInput = document.getElementById('payment-input') as HTMLTextAreaElement;
    const amountInput = document.getElementById('withdrawal-amount') as HTMLInputElement;
    const commentInput = document.getElementById('withdrawal-comment') as HTMLInputElement;
    const previewDiv = document.getElementById('payment-preview');
    const sendBtn = document.getElementById('send-payment-btn') as HTMLButtonElement;
    const previewBtn = document.getElementById('preview-payment-btn') as HTMLButtonElement;

    if (paymentInput) paymentInput.value = '';
    if (amountInput) amountInput.value = '';
    if (commentInput) commentInput.value = '';
    previewDiv?.classList.add('hidden');

    if (sendBtn) {
        sendBtn.classList.add('hidden');
        sendBtn.disabled = true;
        sendBtn.textContent = 'Send Payment';
    }
    if (previewBtn) {
        previewBtn.disabled = true;
        previewBtn.textContent = 'Preview Payment';
    }

    // On-chain reset
    const onchainAddressInput = document.getElementById('onchain-address-input') as HTMLInputElement;
    const onchainAmountInput = document.getElementById('onchain-amount-input') as HTMLInputElement;
    const onchainPreview = document.getElementById('onchain-payment-preview');
    const previewOnchainBtn = document.getElementById('preview-onchain-payment-btn') as HTMLButtonElement;
    const sendOnchainBtn = document.getElementById('send-onchain-payment-btn') as HTMLButtonElement;
    const feeSummary = document.getElementById('onchain-network-fee');
    const onchainValidation = document.getElementById('onchain-amount-validation');

    if (onchainAddressInput) onchainAddressInput.value = '';
    if (onchainAmountInput) onchainAmountInput.value = '';
    onchainPreview?.classList.add('hidden');

    if (previewOnchainBtn) {
        previewOnchainBtn.disabled = true;
        previewOnchainBtn.textContent = 'Preview On-chain Transaction';
    }

    if (sendOnchainBtn) {
        sendOnchainBtn.classList.add('hidden');
        sendOnchainBtn.disabled = true;
        sendOnchainBtn.textContent = 'Send';
    }

    if (feeSummary) feeSummary.textContent = '—';
    if (onchainValidation) {
        onchainValidation.textContent = '';
        onchainValidation.classList.add('hidden');
    }
    (['fast', 'medium', 'slow'] as const).forEach(speed => {
        const feeEl = document.getElementById(`speed-fee-${speed}`);
        if (feeEl) feeEl.textContent = 'Fee: —';
    });

    onchainPreparedBySpeed = {};
    onchainSelectedSpeed = 'medium';
    updateSpeedSelectionUI();
}

export function setupWithdrawalListeners(): void {
    if (withdrawalListenersInitialized) return;
    withdrawalListenersInitialized = true;

    const backBtn = document.getElementById('withdraw-back-btn');
    if (backBtn) backBtn.onclick = () => hideWithdrawInterface();

    const lightningTabBtn = document.getElementById('withdraw-tab-lightning');
    const onchainTabBtn = document.getElementById('withdraw-tab-onchain');
    lightningTabBtn?.addEventListener('click', () => setSendTab('lightning'));
    onchainTabBtn?.addEventListener('click', () => setSendTab('onchain'));

    const paymentInput = document.getElementById('payment-input') as HTMLTextAreaElement;
    const amountInput = document.getElementById('withdrawal-amount') as HTMLInputElement;
    const previewBtn = document.getElementById('preview-payment-btn') as HTMLButtonElement;
    const sendBtn = document.getElementById('send-payment-btn') as HTMLButtonElement;

    const contactsBtn = document.getElementById('withdraw-contacts-btn');
    contactsBtn?.addEventListener('click', () => {
        openContactPicker((contact) => {
            if (paymentInput) {
                paymentInput.value = contact.lightningAddress;
                validateWithdrawalForm();
            }
        });
    });

    paymentInput?.addEventListener('input', validateWithdrawalForm);
    amountInput?.addEventListener('input', validateWithdrawalForm);
    previewBtn?.addEventListener('click', previewPayment);
    sendBtn?.addEventListener('click', () => sendPayment());

    const onchainAddressInput = document.getElementById('onchain-address-input') as HTMLInputElement;
    const onchainAmountInput = document.getElementById('onchain-amount-input') as HTMLInputElement;
    const previewOnchainBtn = document.getElementById('preview-onchain-payment-btn') as HTMLButtonElement;
    const sendOnchainBtn = document.getElementById('send-onchain-payment-btn') as HTMLButtonElement;

    onchainAddressInput?.addEventListener('input', validateOnchainForm);
    onchainAmountInput?.addEventListener('input', validateOnchainForm);

    document.querySelectorAll('#onchain-speed-cards .speed-card').forEach((card) => {
        card.addEventListener('click', () => {
            const speed = (card as HTMLElement).dataset.speed as 'fast' | 'medium' | 'slow';
            if (!speed) return;
            onchainSelectedSpeed = speed;
            updateSpeedSelectionUI();
            updateOnchainPreviewFromSelection();
        });
    });

    previewOnchainBtn?.addEventListener('click', previewOnchainPayment);
    sendOnchainBtn?.addEventListener('click', sendOnchainPayment);
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

let onchainFeeDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function isValidBitcoinAddress(address: string): boolean {
    // Bech32 (native segwit): bc1q... (42 chars) or bc1p... (62 chars taproot)
    if (/^bc1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{25,87}$/i.test(address)) return true;
    // Legacy P2PKH: starts with 1, 25-34 chars
    if (/^1[1-9A-HJ-NP-Za-km-z]{24,33}$/.test(address)) return true;
    // P2SH: starts with 3, 25-34 chars
    if (/^3[1-9A-HJ-NP-Za-km-z]{24,33}$/.test(address)) return true;
    return false;
}

function validateOnchainForm(): void {
    const addressInput = document.getElementById('onchain-address-input') as HTMLInputElement;
    const amountInput = document.getElementById('onchain-amount-input') as HTMLInputElement;
    const previewBtn = document.getElementById('preview-onchain-payment-btn') as HTMLButtonElement;
    const validationMessage = document.getElementById('onchain-amount-validation');

    if (!addressInput || !amountInput || !previewBtn) return;

    const address = addressInput.value.trim();
    const amount = parseInt(amountInput.value) || 0;

    // Validate bitcoin address format
    if (address.length > 0 && !isValidBitcoinAddress(address)) {
        if (validationMessage) {
            validationMessage.textContent = 'Invalid Bitcoin address';
            validationMessage.classList.remove('hidden');
        }
        previewBtn.disabled = true;
    } else {
        if (validationMessage && !validationMessage.textContent?.includes('amount')) {
            validationMessage.textContent = '';
            validationMessage.classList.add('hidden');
        }
        previewBtn.disabled = !(isValidBitcoinAddress(address) && amount > 0);
    }

    // Auto-fetch fees when address + amount are valid
    if (onchainFeeDebounceTimer) clearTimeout(onchainFeeDebounceTimer);
    if (address.length >= 14 && amount > 0) {
        onchainFeeDebounceTimer = setTimeout(() => autoFetchOnchainFees(address, amount), 800);
    } else {
        // Clear fees when inputs are incomplete
        (['fast', 'medium', 'slow'] as const).forEach(speed => {
            const feeEl = document.getElementById(`speed-fee-${speed}`);
            if (feeEl) feeEl.textContent = 'Fee: —';
        });
        const feeSummary = document.getElementById('onchain-network-fee');
        if (feeSummary) feeSummary.textContent = '—';
    }
}

async function autoFetchOnchainFees(address: string, amount: number): Promise<void> {
    if (!breezSDK) return;

    // Show loading state
    (['fast', 'medium', 'slow'] as const).forEach(speed => {
        const feeEl = document.getElementById(`speed-fee-${speed}`);
        if (feeEl) feeEl.textContent = 'Fee: ...';
    });

    try {
        const prepared = await breezSDK.prepareSendPayment({
            paymentRequest: address,
            amountSats: amount
        });

        onchainPreparedBySpeed = { fast: prepared, medium: prepared, slow: prepared };

        const feeQuote = prepared?.paymentMethod?.feeQuote;
        const speedMap = { fast: feeQuote?.speedFast, medium: feeQuote?.speedMedium, slow: feeQuote?.speedSlow } as const;

        for (const speed of ['fast', 'medium', 'slow'] as const) {
            const quote = speedMap[speed];
            const feeSats = quote?.userFeeSat ?? 0;
            const feeEl = document.getElementById(`speed-fee-${speed}`);
            if (feeEl) feeEl.textContent = feeSats > 0 ? `Fee: ${feeSats.toLocaleString()} sats` : 'Fee: unavailable';
        }

        updateOnchainPreviewFromSelection();
    } catch (error) {
        console.error('Auto-fee estimation failed:', error);
        (['fast', 'medium', 'slow'] as const).forEach(speed => {
            const feeEl = document.getElementById(`speed-fee-${speed}`);
            if (feeEl) feeEl.textContent = 'Fee: —';
        });
    }
}

function updateSpeedSelectionUI(): void {
    document.querySelectorAll('#onchain-speed-cards .speed-card').forEach((card) => {
        const speed = (card as HTMLElement).dataset.speed;
        card.classList.toggle('selected', speed === onchainSelectedSpeed);
    });
}

async function previewOnchainPayment(): Promise<void> {
    const addressInput = document.getElementById('onchain-address-input') as HTMLInputElement;
    const amountInput = document.getElementById('onchain-amount-input') as HTMLInputElement;
    const previewBtn = document.getElementById('preview-onchain-payment-btn') as HTMLButtonElement;

    if (!addressInput || !amountInput || !previewBtn) return;

    const address = addressInput.value.trim();
    const amount = parseInt(amountInput.value) || 0;

    try {
        if (!breezSDK) {
            showError('Wallet not connected. Please unlock wallet first.');
            return;
        }

        previewBtn.disabled = true;
        previewBtn.textContent = 'Preparing...';

        onchainPreparedBySpeed = {};

        // Single prepare call — SDK returns fee quotes for all 3 speeds
        const prepared = await breezSDK.prepareSendPayment({
            paymentRequest: address,
            amountSats: amount
        });

        // Store the same prepared response for all speeds (fee selection happens at send time)
        onchainPreparedBySpeed = { fast: prepared, medium: prepared, slow: prepared };

        // Extract per-speed fees from feeQuote
        const feeQuote = prepared?.paymentMethod?.feeQuote;
        const speedMap = { fast: feeQuote?.speedFast, medium: feeQuote?.speedMedium, slow: feeQuote?.speedSlow } as const;

        for (const speed of ['fast', 'medium', 'slow'] as const) {
            const quote = speedMap[speed];
            const feeSats = quote?.userFeeSat ?? 0;
            const feeEl = document.getElementById(`speed-fee-${speed}`);
            if (feeEl) feeEl.textContent = feeSats > 0 ? `Fee: ${feeSats.toLocaleString()} sats` : 'Fee: unavailable';
        }

        updateOnchainPreviewFromSelection();
    } catch (error) {
        showError(error instanceof Error ? error.message : 'Failed to preview on-chain transaction');
    } finally {
        previewBtn.disabled = false;
        previewBtn.textContent = 'Preview On-chain Transaction';
    }
}

function updateOnchainPreviewFromSelection(): void {
    const prepared = onchainPreparedBySpeed[onchainSelectedSpeed];
    const previewDiv = document.getElementById('onchain-payment-preview');
    const sendBtn = document.getElementById('send-onchain-payment-btn') as HTMLButtonElement;

    const address = (document.getElementById('onchain-address-input') as HTMLInputElement)?.value?.trim() || '';
    const amount = parseInt((document.getElementById('onchain-amount-input') as HTMLInputElement)?.value || '0') || 0;

    if (!prepared || !previewDiv || !sendBtn) return;

    const feeQuote = prepared?.paymentMethod?.feeQuote;
    const speedKey = onchainSelectedSpeed === 'fast' ? 'speedFast' : onchainSelectedSpeed === 'slow' ? 'speedSlow' : 'speedMedium';
    const feeSats = Number(feeQuote?.[speedKey]?.userFeeSat ?? 0);
    const total = amount + feeSats;

    const networkFeeSummary = document.getElementById('onchain-network-fee');
    if (networkFeeSummary) networkFeeSummary.textContent = `${feeSats.toLocaleString()} sats`;

    const recipientEl = document.getElementById('onchain-preview-recipient');
    const amountEl = document.getElementById('onchain-preview-amount');
    const feeEl = document.getElementById('onchain-preview-fee');
    const speedEl = document.getElementById('onchain-preview-speed');
    const totalEl = document.getElementById('onchain-preview-total');

    if (recipientEl) recipientEl.textContent = address;
    if (amountEl) amountEl.textContent = `${amount.toLocaleString()} sats`;
    if (feeEl) feeEl.textContent = `${feeSats.toLocaleString()} sats`;
    if (speedEl) speedEl.textContent = onchainSelectedSpeed[0].toUpperCase() + onchainSelectedSpeed.slice(1);
    if (totalEl) totalEl.textContent = `${total.toLocaleString()} sats`;

    previewDiv.classList.remove('hidden');
    sendBtn.classList.remove('hidden');
    sendBtn.disabled = false;
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
        const isInvoice = input.toLowerCase().startsWith('lnbc') || input.toLowerCase().startsWith('lntb');

        if (isInvoice) {
            const prepared = await breezSDK.prepareSendPayment({
                paymentRequest: input,
                amountSats: amount > 0 ? amount : undefined
            });

            setPreparedPayment(prepared);
            displayPaymentPreview({
                recipient: 'Lightning Payment',
                amount: prepared.amountSats || amount || 0,
                fee: prepared.paymentMethod?.lightningFeeSats || 0,
                type: 'bolt11',
                prepareResponse: prepared
            });
        } else {
            let lnurlInput = input;
            if (input.includes('@') && !input.toLowerCase().startsWith('lnurl')) {
                const [username, domain] = input.split('@');
                lnurlInput = `https://${domain}/.well-known/lnurlp/${username}`;
            }

            const parsed = await parseInput(lnurlInput);
            if (parsed.type !== 'lnurlPay' && parsed.type !== 'lightningAddress') {
                throw new Error(`Unsupported input type: ${parsed.type}`);
            }

            const payRequest = parsed.type === 'lightningAddress' ? parsed.payRequest : parsed;
            if (!amount || amount <= 0) {
                throw new Error('Amount is required for Lightning addresses and LNURL payments');
            }

            const minSendableSats = Math.ceil((payRequest.minSendable || 0) / 1000);
            const maxSendableSats = Math.floor((payRequest.maxSendable || Number.MAX_SAFE_INTEGER) / 1000);

            if (amount < minSendableSats) throw new Error(`Amount must be at least ${minSendableSats} sats`);
            if (amount > maxSendableSats) throw new Error(`Amount cannot exceed ${maxSendableSats} sats`);

            const commentInput = document.getElementById('withdrawal-comment') as HTMLInputElement;
            const comment = commentInput?.value?.trim() || undefined;

            const prepareResponse = await breezSDK.prepareLnurlPay({
                amountSats: amount,
                payRequest,
                comment,
                validateSuccessActionUrl: true
            });

            setPreparedPayment(prepareResponse);
            displayPaymentPreview({
                recipient: input,
                amount,
                fee: prepareResponse.feeSats,
                type: 'lnurl',
                prepareResponse
            });
        }
    } catch (error) {
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
    const paymentInput = document.getElementById('payment-input') as HTMLTextAreaElement;
    const sendBtn = document.getElementById('send-payment-btn') as HTMLButtonElement;
    const statusDiv = document.getElementById('withdrawal-status');
    const statusText = document.getElementById('withdrawal-status-text');

    if (!paymentInput || !sendBtn) return;

    const confirmed = await showConfirmDialog('Confirm Payment', 'Are you sure you want to send this payment? This action cannot be undone.');
    if (!confirmed) return;

    try {
        if (!breezSDK) {
            showError('Wallet not connected. Please unlock wallet first.');
            return;
        }

        sendBtn.disabled = true;
        sendBtn.textContent = 'Sending...';

        statusDiv?.classList.remove('hidden');
        if (statusText) statusText.textContent = 'Processing payment...';

        if (!preparedPayment) {
            showError('Please preview payment first');
            return;
        }

        const isLnurlPayment = preparedPayment && 'feeSats' in preparedPayment && !('paymentMethod' in preparedPayment);

        if (isLnurlPayment) {
            const result = await breezSDK.lnurlPay({ prepareResponse: preparedPayment });

            try {
                let recipientPubkey: string | undefined;
                if (result.payment?.details?.destinationPubkey) recipientPubkey = result.payment.details.destinationPubkey;
                if (!recipientPubkey && preparedPayment.invoiceDetails) {
                    const invoiceDetails = preparedPayment.invoiceDetails as Record<string, unknown>;
                    const destPubkey = invoiceDetails.payeePubkey || invoiceDetails.destination || invoiceDetails.nodeId || invoiceDetails.destinationPubkey;
                    if (destPubkey && typeof destPubkey === 'string') recipientPubkey = destPubkey;
                }
                if (!recipientPubkey && preparedPayment.payRequest?.nostrPubkey) recipientPubkey = preparedPayment.payRequest.nostrPubkey;

                if (recipientPubkey) {
                    const amountEl = document.getElementById('preview-amount');
                    const amountText = amountEl?.textContent || '0';
                    const amount = parseInt(amountText.replace(/[^0-9]/g, '')) || 0;
                    triggerPaymentNotification({ pubKey: recipientPubkey }, amount).catch(() => {});
                }
            } catch {}
        } else {
            await breezSDK.sendPayment({ prepareResponse: preparedPayment });
        }

        setPreparedPayment(null);

        try {
            const input = paymentInput.value.trim();
            const isInvoice = input.toLowerCase().startsWith('lnbc') || input.toLowerCase().startsWith('lntb');
            if (isInvoice && breezSDK) {
                const parsed = await parseInput(input);
                const destPubkey = extractPubkeyFromParsedInvoice(parsed);
                if (destPubkey) {
                    const amountEl = document.getElementById('preview-amount');
                    const amountText = amountEl?.textContent || '0';
                    const amount = parseInt(amountText.replace(/[^0-9]/g, '')) || 0;
                    triggerPaymentNotification({ pubKey: destPubkey }, amount).catch(() => {});
                }
            }
        } catch {}

        document.querySelectorAll('.confirm-dialog-overlay').forEach(el => el.remove());

        if (statusText) {
            statusText.textContent = '✅ Payment sent successfully!';
            statusText.className = 'status-indicator success';
        }

        showSuccess('Payment sent successfully!');
        await callbacks?.updateBalanceDisplay();
        await callbacks?.loadTransactionHistory();
        setTimeout(() => hideWithdrawInterface(), 1500);
        // Retry in case tx doesn't appear immediately
        for (const delayMs of [2000, 5000]) {
            setTimeout(async () => {
                await callbacks?.updateBalanceDisplay();
                await callbacks?.loadTransactionHistory();
            }, delayMs);
        }
    } catch (error) {
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

async function sendOnchainPayment(): Promise<void> {
    const sendBtn = document.getElementById('send-onchain-payment-btn') as HTMLButtonElement;
    const statusDiv = document.getElementById('withdrawal-status');
    const statusText = document.getElementById('withdrawal-status-text');

    const prepared = onchainPreparedBySpeed[onchainSelectedSpeed];
    if (!prepared) {
        showError('Please preview the on-chain transaction first');
        return;
    }

    const confirmed = await showConfirmDialog('Confirm On-chain Transaction', 'Are you sure you want to send this on-chain transaction?');
    if (!confirmed) return;

    try {
        if (!breezSDK) {
            showError('Wallet not connected. Please unlock wallet first.');
            return;
        }

        sendBtn.disabled = true;
        sendBtn.textContent = 'Sending...';

        statusDiv?.classList.remove('hidden');
        if (statusText) statusText.textContent = 'Broadcasting on-chain transaction...';

        await breezSDK.sendPayment({
            prepareResponse: prepared,
            options: {
                type: 'bitcoinAddress',
                confirmationSpeed: onchainSelectedSpeed
            }
        });

        if (statusText) {
            statusText.textContent = '✅ On-chain transaction sent successfully!';
            statusText.className = 'status-indicator success';
        }

        showSuccess('On-chain transaction sent successfully!');
        await callbacks?.updateBalanceDisplay();
        // Return to main view first, then keep refreshing tx list
        setTimeout(() => hideWithdrawInterface(), 1500);
        // Retry tx list multiple times — SDK may not return the on-chain tx immediately
        for (const delayMs of [500, 2000, 5000, 10000]) {
            setTimeout(async () => {
                await callbacks?.updateBalanceDisplay();
                await callbacks?.loadTransactionHistory();
            }, delayMs);
        }
    } catch (error) {
        if (statusText) {
            statusText.textContent = `❌ ${error instanceof Error ? error.message : 'Transaction failed'}`;
            statusText.className = 'status-indicator error';
        }
        showError(error instanceof Error ? error.message : 'Failed to send on-chain transaction');
    } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send';
    }
}
