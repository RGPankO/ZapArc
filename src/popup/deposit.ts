// Deposit Interface
// Handles invoice generation, QR display, and payment monitoring

import * as QRCode from 'qrcode';
import { 
    breezSDK, 
    paymentMonitoringInterval, 
    setPaymentMonitoringInterval,
    invoiceExpiryTime,
    setInvoiceExpiryTime
} from './state';
import { showError, showSuccess } from './notifications';

// Callback type for deposit operations that need main popup functions
export type DepositCallbacks = {
    updateBalanceDisplay: () => Promise<void>;
    loadTransactionHistory: () => Promise<void>;
    onPaymentReceived?: () => Promise<void>; // Optional callback for when payment is received
};

let callbacks: DepositCallbacks | null = null;

export function setDepositCallbacks(cb: DepositCallbacks): void {
    callbacks = cb;
}

// Track current invoice being monitored
let currentMonitoredInvoice: string | null = null;

export function setCurrentMonitoredInvoice(invoice: string | null): void {
    currentMonitoredInvoice = invoice;
}

// Export function to handle payment received event from SDK
export async function handlePaymentReceivedFromSDK(): Promise<void> {
    console.log('[Deposit] Payment received event from SDK - checking immediately');
    // If we're monitoring an invoice, check it immediately instead of waiting for next poll
    if (currentMonitoredInvoice) {
        await checkPaymentStatus(currentMonitoredInvoice);
    }
}
// ========================================
// Deposit Interface
// ========================================

export function showDepositInterface(): void {
    console.log('[Deposit] Showing deposit interface');

    // Hide main interface
    const mainInterface = document.getElementById('main-interface');
    if (mainInterface) {
        mainInterface.classList.add('hidden');
    }

    // Show deposit interface
    const depositInterface = document.getElementById('deposit-interface');
    if (depositInterface) {
        depositInterface.classList.remove('hidden');
    }

    // Reset to amount step
    showDepositStep('deposit-amount-step');

    // Reset amount input
    const amountInput = document.getElementById('deposit-amount') as HTMLInputElement;
    if (amountInput) {
        amountInput.value = '';
    }

    // Setup listeners
    setupDepositListeners();
}

export function hideDepositInterface(): void {
    console.log('[Deposit] Hiding deposit interface');

    // Stop payment monitoring if active
    if (paymentMonitoringInterval) {
        clearInterval(paymentMonitoringInterval);
        setPaymentMonitoringInterval(null);
    }
    
    // Clear monitored invoice
    setCurrentMonitoredInvoice(null);

    // Hide deposit interface
    const depositInterface = document.getElementById('deposit-interface');
    if (depositInterface) {
        depositInterface.classList.add('hidden');
    }

    // Show main interface
    const mainInterface = document.getElementById('main-interface');
    if (mainInterface) {
        mainInterface.classList.remove('hidden');
    }

    // Reset form
    const amountInput = document.getElementById('deposit-amount') as HTMLInputElement;
    if (amountInput) amountInput.value = '';

    // Reset to amount step
    showDepositStep('deposit-amount-step');
}

export function setupDepositListeners(): void {
    console.log('[Deposit] Setting up listeners');

    // Add back button listener
    const backBtn = document.getElementById('deposit-back-btn');
    if (backBtn && !backBtn.onclick) {
        backBtn.onclick = () => {
            console.log('[Deposit] Back button clicked');
            hideDepositInterface();
        };
    }

    const depositAmount = document.getElementById('deposit-amount') as HTMLInputElement;
    const generateBtn = document.getElementById('generate-invoice-btn') as HTMLButtonElement;
    const copyBtn = document.getElementById('copy-invoice-btn');
    const newInvoiceBtn = document.getElementById('new-invoice-btn');

    // Amount input validation
    if (depositAmount) {
        depositAmount.addEventListener('input', () => {
            const amount = parseInt(depositAmount.value);
            if (generateBtn) {
                generateBtn.disabled = !amount || amount <= 0;
            }
        });
    }

    // Quick amount buttons
    document.querySelectorAll('.quick-amount-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const amount = (e.target as HTMLElement).dataset.amount;
            if (depositAmount && amount) {
                depositAmount.value = amount;
                if (generateBtn) {
                    generateBtn.disabled = false;
                }
            }
        });
    });

    // Generate invoice
    if (generateBtn) {
        generateBtn.addEventListener('click', async () => {
            const amount = parseInt(depositAmount.value);
            if (amount > 0) {
                await generateDepositInvoice(amount);
            }
        });
    }

    // Copy invoice
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const invoiceText = document.getElementById('invoice-text') as HTMLTextAreaElement;
            if (invoiceText) {
                navigator.clipboard.writeText(invoiceText.value);
                showSuccess('Invoice copied to clipboard!');
            }
        });
    }

    // New invoice
    if (newInvoiceBtn) {
        newInvoiceBtn.addEventListener('click', () => {
            showDepositStep('deposit-amount-step');
        });
    }
}

export async function generateDepositInvoice(amount: number): Promise<void> {
    try {
        const generateBtn = document.getElementById('generate-invoice-btn') as HTMLButtonElement;
        if (generateBtn) {
            generateBtn.disabled = true;
            generateBtn.textContent = 'Generating...';
        }

        // Check if SDK is connected
        if (!breezSDK) {
            showError('Wallet not connected. Please unlock your wallet first.');
            return;
        }

        // Generate invoice directly using Breez SDK in popup context
        const description = `Deposit ${amount.toLocaleString()} sats to Lightning Tipping Wallet`;

        console.log('🔵 [Popup] Generating invoice via Breez SDK...', {
            amount,
            description
        });

        // Use Breez SDK's receivePayment method with bolt11Invoice type
        const response = await breezSDK.receivePayment({
            paymentMethod: {
                type: 'bolt11Invoice',
                description: description,
                amountSats: amount
            }
        });

        const invoice = response.paymentRequest;

        console.log('✅ [Popup] Invoice generated successfully', {
            invoiceLength: invoice.length,
            invoicePrefix: invoice.substring(0, 20),
            feeSats: response.feeSats
        });

        await displayInvoice(invoice, amount);
        showDepositStep('deposit-invoice-step');
        startPaymentMonitoring(invoice);

    } catch (error) {
        console.error('❌ [Popup] Invoice generation error:', error);
        showError(error instanceof Error ? error.message : 'Failed to generate invoice');
    } finally {
        const generateBtn = document.getElementById('generate-invoice-btn') as HTMLButtonElement;
        if (generateBtn) {
            generateBtn.disabled = false;
            generateBtn.textContent = 'Generate Invoice';
        }
    }
}

export async function displayInvoice(invoice: string, amount: number): Promise<void> {
    // Display amount
    const amountDisplay = document.getElementById('invoice-amount-display');
    if (amountDisplay) {
        amountDisplay.textContent = amount.toLocaleString();
    }
    
    // Display invoice text
    const invoiceText = document.getElementById('invoice-text') as HTMLTextAreaElement;
    if (invoiceText) {
        invoiceText.value = invoice;
    }
    
    // Generate QR code
    const qrCanvas = document.getElementById('deposit-qr-canvas') as HTMLCanvasElement;
    if (qrCanvas) {
        try {
            await QRCode.toCanvas(qrCanvas, invoice, {
                width: 200,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
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
        if (element) {
            element.classList.toggle('hidden', id !== stepId);
        }
    });
}

// ========================================
// Payment Monitoring
// ========================================

export function startPaymentMonitoring(invoice: string): void {
    // Track the invoice we're monitoring
    setCurrentMonitoredInvoice(invoice);
    
    // Set expiry time (15 minutes from now)
    setInvoiceExpiryTime(Date.now() + (15 * 60 * 1000));
    
    // Clear any existing interval
    if (paymentMonitoringInterval) {
        clearInterval(paymentMonitoringInterval);
    }
    
    // Start monitoring
    const interval = setInterval(async () => {
        await checkPaymentStatus(invoice);
        updateInvoiceTimer();
    }, 2000);
    setPaymentMonitoringInterval(interval);
    
    // Initial check
    checkPaymentStatus(invoice);
}

export async function checkPaymentStatus(invoice: string): Promise<void> {
    try {
        if (!breezSDK) {
            console.warn('SDK not connected during payment check');
            return;
        }

        console.log('🔍 [Popup] Checking payment status...');

        const response = await breezSDK.listPayments({});
        const payments = response?.payments || [];

        console.log(`🔍 [Popup] Found ${payments.length} payments`);

        // Find payment matching this invoice
        const matchingPayment = payments.find((p: any) => {
            if (p.paymentType !== 'receive') return false;
            const paymentInvoice = p.details?.bolt11 || p.details?.invoice || '';
            return paymentInvoice.includes(invoice.substring(0, 30));
        });

        if (matchingPayment) {
            console.log('✅ [Popup] Payment received!', matchingPayment);

            const amountSats = matchingPayment.amount || matchingPayment.amountSats || 0;
            showSuccess(`Received ${amountSats.toLocaleString()} sats!`);

            // Stop monitoring
            if (paymentMonitoringInterval) {
                clearInterval(paymentMonitoringInterval);
                setPaymentMonitoringInterval(null);
            }

            // Refresh balance and transactions
            await callbacks?.updateBalanceDisplay();
            await callbacks?.loadTransactionHistory();

            // Close deposit interface
            hideDepositInterface();
        }
    } catch (error) {
        console.error('❌ [Popup] Payment status check error:', error);
    }
}

export function updateInvoiceTimer(): void {
    const timerElement = document.getElementById('invoice-timer');
    if (!timerElement) return;
    
    const remaining = Math.max(0, invoiceExpiryTime - Date.now());
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    
    timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    if (remaining <= 0) {
        handlePaymentExpired();
    }
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
    if (timerElement) {
        timerElement.textContent = 'Completed';
    }

    // Refresh wallet data
    callbacks?.updateBalanceDisplay();
    
    showSuccess('Deposit received successfully!');
    
    // Auto-close interface after 3 seconds
    setTimeout(() => {
        hideDepositInterface();
    }, 3000);
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
