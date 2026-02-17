// Deposit Interface
// Handles Lightning invoice generation + on-chain address generation

import * as QRCode from 'qrcode';
import {
    breezSDK,
    paymentMonitoringInterval,
    setPaymentMonitoringInterval,
    invoiceExpiryTime,
    setInvoiceExpiryTime
} from './state';
import { showError, showSuccess } from './notifications';

function updateDepositEstimate(amount: number): void {
    const row = document.getElementById('deposit-estimate-row');
    const valueEl = document.getElementById('deposit-estimate-value');
    const generateBtn = document.getElementById('generate-invoice-btn') as HTMLButtonElement;
    if (generateBtn) generateBtn.disabled = !amount || amount <= 0;
    if (!row || !valueEl) return;
    if (!amount || amount <= 0) {
        row.classList.add('hidden');
        return;
    }
    // Rough estimate: 1 BTC ≈ $100,000 (placeholder, could be dynamic)
    const btcAmount = amount / 100_000_000;
    const usdEstimate = btcAmount * 100_000;
    if (usdEstimate >= 0.01) {
        valueEl.textContent = `≈ $${usdEstimate.toFixed(2)} USD`;
        row.classList.remove('hidden');
    } else {
        row.classList.add('hidden');
    }
}

export type DepositCallbacks = {
    updateBalanceDisplay: () => Promise<void>;
    loadTransactionHistory: () => Promise<void>;
    onPaymentReceived?: () => Promise<void>;
};

let callbacks: DepositCallbacks | null = null;
let currentMonitoredInvoice: string | null = null;
let depositListenersInitialized = false;
let depositTab: 'lightning' | 'onchain' = 'lightning';
let onchainDepositPollingInterval: ReturnType<typeof setInterval> | null = null;
const claimedOnchainDeposits = new Set<string>();

export function setDepositCallbacks(cb: DepositCallbacks): void {
    callbacks = cb;
}

export function setCurrentMonitoredInvoice(invoice: string | null): void {
    currentMonitoredInvoice = invoice;
}

export async function handlePaymentReceivedFromSDK(): Promise<void> {
    console.log('[Deposit] Payment received event from SDK - checking immediately');
    if (currentMonitoredInvoice) {
        await checkPaymentStatus(currentMonitoredInvoice);
    }
}

function stopOnchainDepositPolling(): void {
    if (onchainDepositPollingInterval) {
        clearInterval(onchainDepositPollingInterval);
        onchainDepositPollingInterval = null;
    }
}

function setOnchainDepositStatus(message: string): void {
    const statusEl = document.getElementById('onchain-deposit-status');
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.classList.remove('hidden');
}

async function checkAndClaimOnchainDeposits(): Promise<void> {
    if (!breezSDK || depositTab !== 'onchain') return;

    try {
        const deposits = await breezSDK.listDeposits();
        for (const deposit of deposits || []) {
            const key = `${deposit.txid}:${deposit.vout}`;
            if (claimedOnchainDeposits.has(key)) continue;

            setOnchainDepositStatus(`⏳ Deposit detected: ${deposit.amountSats.toLocaleString()} sats — claiming...`);
            await breezSDK.claimDeposit({ txid: deposit.txid, vout: deposit.vout });
            claimedOnchainDeposits.add(key);

            setOnchainDepositStatus('✅ Deposit claimed!');
            await callbacks?.updateBalanceDisplay();
            await callbacks?.loadTransactionHistory();
            showSuccess('Deposit claimed successfully!');
        }
    } catch (error) {
        console.warn('[Deposit] Failed to poll/claim on-chain deposits:', error);
    }
}

function startOnchainDepositPolling(): void {
    stopOnchainDepositPolling();
    void checkAndClaimOnchainDeposits();
    onchainDepositPollingInterval = setInterval(() => {
        void checkAndClaimOnchainDeposits();
    }, 15000);
}

export function showDepositInterface(): void {
    const mainInterface = document.getElementById('main-interface');
    const depositInterface = document.getElementById('deposit-interface');

    mainInterface?.classList.add('hidden');
    depositInterface?.classList.remove('hidden');

    showDepositTab('lightning');
    showDepositStep('deposit-amount-step');

    const amountInput = document.getElementById('deposit-amount') as HTMLInputElement;
    if (amountInput) amountInput.value = '';

    setupDepositListeners();
}

export function hideDepositInterface(): void {
    if (paymentMonitoringInterval) {
        clearInterval(paymentMonitoringInterval);
        setPaymentMonitoringInterval(null);
    }
    stopOnchainDepositPolling();

    setCurrentMonitoredInvoice(null);

    const depositInterface = document.getElementById('deposit-interface');
    const mainInterface = document.getElementById('main-interface');

    depositInterface?.classList.add('hidden');
    mainInterface?.classList.remove('hidden');

    const amountInput = document.getElementById('deposit-amount') as HTMLInputElement;
    if (amountInput) amountInput.value = '';

    showDepositStep('deposit-amount-step');
    showDepositTab('lightning');
}

function showDepositTab(tab: 'lightning' | 'onchain'): void {
    depositTab = tab;

    const lightningBtn = document.getElementById('deposit-tab-lightning');
    const onchainBtn = document.getElementById('deposit-tab-onchain');
    const lightningContent = document.getElementById('deposit-lightning-content');
    const onchainContent = document.getElementById('deposit-onchain-content');

    lightningBtn?.classList.toggle('active', tab === 'lightning');
    onchainBtn?.classList.toggle('active', tab === 'onchain');
    lightningContent?.classList.toggle('hidden', tab !== 'lightning');
    onchainContent?.classList.toggle('hidden', tab !== 'onchain');

    if (tab === 'onchain') {
        void generateOnchainAddress();
    } else {
        stopOnchainDepositPolling();
    }
}

async function generateOnchainAddress(): Promise<void> {
    const loadingEl = document.getElementById('onchain-address-loading');
    const addressEl = document.getElementById('onchain-address-display');
    const copyBtn = document.getElementById('copy-onchain-address-btn') as HTMLButtonElement | null;
    const minDepositNoteEl = document.getElementById('onchain-min-deposit-note');
    const confNoteEl = document.getElementById('onchain-confirmation-note');

    if (!loadingEl || !addressEl || !copyBtn) return;

    loadingEl.classList.remove('hidden');
    addressEl.classList.add('hidden');
    copyBtn.classList.add('hidden');
    addressEl.textContent = '';
    setOnchainDepositStatus('Waiting for on-chain deposit...');

    try {
        if (!breezSDK) {
            throw new Error('Wallet not connected. Please unlock your wallet first.');
        }

        const response = await breezSDK.receivePayment({
            paymentMethod: { type: 'bitcoinAddress' }
        } as any);

        const address = (response as any)?.paymentRequest || (response as any)?.bitcoinAddress || (response as any)?.address;
        if (!address) {
            throw new Error('Failed to generate Bitcoin address');
        }

        const minDepositSats = (response as any)?.paymentMethod?.minAmountSats || (response as any)?.minAmountSats;
        if (minDepositNoteEl) {
            minDepositNoteEl.textContent = minDepositSats
                ? `Minimum recommended deposit: ${Number(minDepositSats).toLocaleString()} sats.`
                : 'Minimum deposit depends on current network and swap conditions.';
        }
        if (confNoteEl) {
            confNoteEl.textContent = 'It may take 1-3 confirmations before funds appear.';
        }

        addressEl.textContent = address;
        addressEl.classList.remove('hidden');
        copyBtn.classList.remove('hidden');

        startOnchainDepositPolling();
    } catch (error) {
        showError(error instanceof Error ? error.message : 'Failed to generate Bitcoin address');
    } finally {
        loadingEl.classList.add('hidden');
    }
}

export function setupDepositListeners(): void {
    if (depositListenersInitialized) return;
    depositListenersInitialized = true;

    const backBtn = document.getElementById('deposit-back-btn');
    if (backBtn) backBtn.onclick = () => hideDepositInterface();

    const tabLightning = document.getElementById('deposit-tab-lightning');
    const tabOnchain = document.getElementById('deposit-tab-onchain');
    tabLightning?.addEventListener('click', () => showDepositTab('lightning'));
    tabOnchain?.addEventListener('click', () => showDepositTab('onchain'));

    const depositAmount = document.getElementById('deposit-amount') as HTMLInputElement;
    const generateBtn = document.getElementById('generate-invoice-btn') as HTMLButtonElement;
    const copyBtn = document.getElementById('copy-invoice-btn');
    const newInvoiceBtn = document.getElementById('new-invoice-btn');

    document.querySelectorAll('.quick-amount-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const amount = target.dataset.amount;
            if (depositAmount && amount) {
                depositAmount.value = amount;
                if (generateBtn) generateBtn.disabled = false;
                // Update selected state
                document.querySelectorAll('.quick-amount-btn').forEach(b => b.classList.remove('selected'));
                target.classList.add('selected');
                // Update estimate
                updateDepositEstimate(parseInt(amount));
            }
        });
    });

    if (depositAmount) {
        depositAmount.addEventListener('input', () => {
            const amount = parseInt(depositAmount.value);
            // Clear quick amount selection
            document.querySelectorAll('.quick-amount-btn').forEach(b => b.classList.remove('selected'));
            updateDepositEstimate(amount);
        });
    }

    generateBtn?.addEventListener('click', async () => {
        const amount = parseInt(depositAmount.value);
        if (amount > 0) await generateDepositInvoice(amount);
    });

    copyBtn?.addEventListener('click', () => {
        const invoiceText = document.getElementById('invoice-text') as HTMLTextAreaElement;
        if (invoiceText) {
            navigator.clipboard.writeText(invoiceText.value);
            showSuccess('Invoice copied to clipboard!');
        }
    });

    newInvoiceBtn?.addEventListener('click', () => showDepositStep('deposit-amount-step'));

    const onchainCopyBtn = document.getElementById('copy-onchain-address-btn');
    onchainCopyBtn?.addEventListener('click', async () => {
        const address = document.getElementById('onchain-address-display')?.textContent?.trim();
        if (!address) return;
        await navigator.clipboard.writeText(address);
        showSuccess('Bitcoin address copied to clipboard!');
    });
}

export async function generateDepositInvoice(amount: number): Promise<void> {
    const generateBtn = document.getElementById('generate-invoice-btn') as HTMLButtonElement;

    try {
        if (generateBtn) {
            generateBtn.disabled = true;
            generateBtn.textContent = 'Generating...';
        }

        if (!breezSDK) {
            showError('Wallet not connected. Please unlock your wallet first.');
            return;
        }

        const description = `Deposit ${amount.toLocaleString()} sats to ZapArc Wallet`;
        const response = await breezSDK.receivePayment({
            paymentMethod: {
                type: 'bolt11Invoice',
                description,
                amountSats: amount
            }
        });

        const invoice = response.paymentRequest;
        await displayInvoice(invoice, amount);
        showDepositStep('deposit-invoice-step');
        startPaymentMonitoring(invoice);
    } catch (error) {
        showError(error instanceof Error ? error.message : 'Failed to generate invoice');
    } finally {
        if (generateBtn) {
            generateBtn.disabled = false;
            generateBtn.textContent = 'Generate Invoice';
        }
    }
}

export async function displayInvoice(invoice: string, amount: number): Promise<void> {
    const amountDisplay = document.getElementById('invoice-amount-display');
    if (amountDisplay) amountDisplay.textContent = amount.toLocaleString();

    const invoiceText = document.getElementById('invoice-text') as HTMLTextAreaElement;
    if (invoiceText) invoiceText.value = invoice;

    const qrCanvas = document.getElementById('deposit-qr-canvas') as HTMLCanvasElement;
    if (qrCanvas) {
        try {
            await QRCode.toCanvas(qrCanvas, invoice, {
                width: 200,
                margin: 2,
                color: { dark: '#000000', light: '#FFFFFF' }
            });
        } catch (error) {
            console.error('QR code generation error:', error);
            qrCanvas.style.display = 'none';
        }
    }
}

export function showDepositStep(stepId: string): void {
    const steps = ['deposit-amount-step', 'deposit-invoice-step'];
    steps.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.classList.toggle('hidden', id !== stepId);
    });
}

export function startPaymentMonitoring(invoice: string): void {
    setCurrentMonitoredInvoice(invoice);
    setInvoiceExpiryTime(Date.now() + (15 * 60 * 1000));

    if (paymentMonitoringInterval) clearInterval(paymentMonitoringInterval);

    const interval = setInterval(async () => {
        await checkPaymentStatus(invoice);
        updateInvoiceTimer();
    }, 2000);

    setPaymentMonitoringInterval(interval);
    void checkPaymentStatus(invoice);
}

export async function checkPaymentStatus(invoice: string): Promise<void> {
    try {
        if (!breezSDK) return;

        const response = await breezSDK.listPayments({});
        const payments = response?.payments || [];

        const matchingPayment = payments.find((p: any) => {
            if (p.paymentType !== 'receive') return false;
            const paymentInvoice = p.details?.bolt11 || p.details?.invoice || '';
            return paymentInvoice.includes(invoice.substring(0, 30));
        });

        if (matchingPayment) {
            const amountSats = matchingPayment.amount || matchingPayment.amountSats || 0;
            showSuccess(`Received ${amountSats.toLocaleString()} sats!`);

            if (paymentMonitoringInterval) {
                clearInterval(paymentMonitoringInterval);
                setPaymentMonitoringInterval(null);
            }

            await callbacks?.updateBalanceDisplay();
            await callbacks?.loadTransactionHistory();
            hideDepositInterface();
        }
    } catch (error) {
        console.error('Payment status check error:', error);
    }
}

export function updateInvoiceTimer(): void {
    const timerElement = document.getElementById('invoice-timer');
    if (!timerElement) return;

    const remaining = Math.max(0, invoiceExpiryTime - Date.now());
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);

    timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    if (remaining <= 0) handlePaymentExpired();
}

export function handlePaymentReceived(): void {
    if (paymentMonitoringInterval) {
        clearInterval(paymentMonitoringInterval);
        setPaymentMonitoringInterval(null);
    }

    const statusIndicator = document.querySelector('.status-indicator');
    if (statusIndicator) {
        statusIndicator.textContent = '✅ Payment received!';
        statusIndicator.className = 'status-indicator success';
    }

    const timerElement = document.getElementById('invoice-timer');
    if (timerElement) timerElement.textContent = 'Completed';

    callbacks?.updateBalanceDisplay();
    showSuccess('Deposit received successfully!');

    setTimeout(() => hideDepositInterface(), 3000);
}

export function handlePaymentExpired(): void {
    if (paymentMonitoringInterval) {
        clearInterval(paymentMonitoringInterval);
        setPaymentMonitoringInterval(null);
    }

    const statusIndicator = document.querySelector('.status-indicator');
    if (statusIndicator) {
        statusIndicator.textContent = '⏰ Invoice expired';
        statusIndicator.className = 'status-indicator expired';
    }
}
