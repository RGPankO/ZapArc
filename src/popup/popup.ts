// Popup script for Lightning Network Tipping Extension
// Handles wallet dashboard, deposits, withdrawals, and settings

import { ExtensionMessaging } from '../utils/messaging';
import * as QRCode from 'qrcode';

console.log('Lightning Tipping Extension popup loaded');

// DOM elements (will be set dynamically)
let balanceElement: HTMLElement | null = null;
let depositBtn: HTMLButtonElement | null = null;
let withdrawBtn: HTMLButtonElement | null = null;
let settingsBtn: HTMLButtonElement | null = null;

// State
let currentBalance = 0;
let isWalletUnlocked = false;

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
    initializePopup();
    setupEventListeners();
});

async function initializePopup() {
    try {
        // Check if wallet setup was skipped
        const skipResult = await chrome.storage.local.get(['walletSkipped']);
        if (skipResult.walletSkipped) {
            showQROnlyInterface();
            return;
        }

        // First check if a wallet exists
        const walletExistsResponse = await ExtensionMessaging.walletExists();
        const walletExists = walletExistsResponse.success && walletExistsResponse.data;

        if (!walletExists) {
            // No wallet exists, show setup prompt
            showWalletSetupPrompt();
            return;
        }

        // Wallet exists, check if it's unlocked
        const unlockResponse = await ExtensionMessaging.isWalletUnlocked();
        isWalletUnlocked = unlockResponse.success && (unlockResponse.data || false);

        if (isWalletUnlocked) {
            // Check if wallet is connected
            const connectedResponse = await ExtensionMessaging.isWalletConnected();
            const isConnected = connectedResponse.success && connectedResponse.data;

            if (isConnected) {
                await loadWalletData();
            } else {
                // Wallet exists and is unlocked but not connected, try to reconnect
                showWalletReconnectPrompt();
            }
        } else {
            // Wallet exists but is locked, show unlock prompt
            showUnlockPrompt();
        }
    } catch (error) {
        console.error('Failed to initialize popup:', error);
        showError('Failed to initialize wallet');
    }
}

async function loadWalletData() {
    try {
        // Load balance
        const balanceResponse = await ExtensionMessaging.getBalance();
        if (balanceResponse.success) {
            currentBalance = balanceResponse.data || 0;
            updateBalance(currentBalance);
        }

        // Enable wallet controls
        enableWalletControls();
    } catch (error) {
        console.error('Failed to load wallet data:', error);
        showError('Failed to load wallet data');
    }
}

function setupEventListeners() {
    // Get current DOM elements
    depositBtn = document.getElementById('deposit-btn') as HTMLButtonElement;
    withdrawBtn = document.getElementById('withdraw-btn') as HTMLButtonElement;
    settingsBtn = document.getElementById('settings-btn') as HTMLButtonElement;
    balanceElement = document.getElementById('balance') as HTMLElement;

    // Setup event listeners if elements exist
    if (depositBtn) depositBtn.addEventListener('click', handleDeposit);
    if (withdrawBtn) withdrawBtn.addEventListener('click', handleWithdraw);
    if (settingsBtn) settingsBtn.addEventListener('click', handleSettings);
}

function updateBalance(balance: number) {
    const currentBalanceElement = document.getElementById('balance') as HTMLElement;
    if (currentBalanceElement) {
        currentBalanceElement.textContent = `${balance.toLocaleString()} sats`;
    }
}

async function handleDeposit() {
    try {
        if (!isWalletUnlocked) {
            showUnlockPrompt();
            return;
        }

        showDepositInterface();
    } catch (error) {
        console.error('Deposit error:', error);
        showError('Failed to open deposit interface');
    }
}

async function handleWithdraw() {
    try {
        if (!isWalletUnlocked) {
            showUnlockPrompt();
            return;
        }

        if (currentBalance <= 0) {
            showError('Insufficient balance for withdrawal');
            return;
        }

        showWithdrawalInterface();
    } catch (error) {
        console.error('Withdrawal error:', error);
        showError('Failed to open withdrawal interface');
    }
}

function handleSettings() {
    // Open settings page in new tab
    chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
}

function showWalletSetupPrompt() {
    // Clear existing content
    const app = document.getElementById('app');
    if (app) {
        app.innerHTML = '';
    }

    const setupDiv = document.createElement('div');
    setupDiv.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <h3>⚡ Lightning Tipping</h3>
            <h4>Wallet Setup Required</h4>
            <p>Initialize your Lightning wallet to get started.</p>
            <button id="setup-wallet-btn" style="padding: 10px 20px; margin: 5px; background: #f7931a; color: white; border: none; border-radius: 4px; cursor: pointer;">Setup Wallet</button>
            <button id="skip-setup-btn" style="padding: 10px 20px; margin: 5px; background: #ccc; color: #333; border: none; border-radius: 4px; cursor: pointer;">Skip Setup</button>
        </div>
    `;

    app?.appendChild(setupDiv);

    document.getElementById('setup-wallet-btn')?.addEventListener('click', async () => {
        try {
            // Prompt for PIN
            const pin = prompt('Create a PIN for your wallet (6+ characters):');
            if (!pin || pin.length < 6) {
                showError('PIN must be at least 6 characters');
                return;
            }

            console.log('Starting wallet setup with PIN length:', pin.length);
            
            // Show loading state
            const setupBtn = document.getElementById('setup-wallet-btn') as HTMLButtonElement;
            if (setupBtn) {
                setupBtn.disabled = true;
                setupBtn.textContent = 'Setting up...';
            }

            // Add timeout to prevent hanging
            const setupPromise = ExtensionMessaging.setupWallet(undefined, pin);
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Wallet setup timeout after 30 seconds')), 30000);
            });

            const setupResponse = await Promise.race([setupPromise, timeoutPromise]) as any;
            console.log('Setup response:', setupResponse);
            
            if (setupResponse.success) {
                console.log('Wallet setup successful, restoring interface');
                setupDiv.remove();
                isWalletUnlocked = true;
                
                // Restore the main interface
                restoreMainInterface();
                await loadWalletData();
                showSuccess('Wallet setup completed successfully!');
            } else {
                console.error('Wallet setup failed:', setupResponse.error);
                showError(setupResponse.error || 'Wallet setup failed');
                
                // Restore button state
                if (setupBtn) {
                    setupBtn.disabled = false;
                    setupBtn.textContent = 'Setup Wallet';
                }
            }
        } catch (error) {
            console.error('Wallet setup error:', error);
            showError(`Failed to setup wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
            
            // Restore button state
            const setupBtn = document.getElementById('setup-wallet-btn') as HTMLButtonElement;
            if (setupBtn) {
                setupBtn.disabled = false;
                setupBtn.textContent = 'Setup Wallet';
            }
        }
    });

    document.getElementById('skip-setup-btn')?.addEventListener('click', () => {
        setupDiv.remove();
        
        // Set a flag that wallet setup was skipped
        chrome.storage.local.set({ walletSkipped: true });
        
        // Show QR-only interface
        showQROnlyInterface();
        showInfo('Wallet setup skipped. You can detect tips and use QR codes with external wallets.');
    });
}

function showUnlockPrompt() {
    // Clear existing content
    const app = document.getElementById('app');
    if (app) {
        app.innerHTML = '';
    }

    const unlockDiv = document.createElement('div');
    unlockDiv.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <h3>⚡ Lightning Tipping</h3>
            <h4>Wallet Locked</h4>
            <p>Enter your PIN to unlock the wallet.</p>
            <input type="password" id="pin-input" placeholder="Enter PIN" style="padding: 8px; margin: 10px; border: 1px solid #ddd; border-radius: 4px;">
            <br>
            <button id="unlock-btn" style="padding: 10px 20px; background: #f7931a; color: white; border: none; border-radius: 4px; cursor: pointer;">Unlock</button>
        </div>
    `;

    app?.appendChild(unlockDiv);

    const pinInput = document.getElementById('pin-input') as HTMLInputElement;
    const unlockBtn = document.getElementById('unlock-btn') as HTMLButtonElement;

    unlockBtn.addEventListener('click', async () => {
        const pin = pinInput.value;
        if (!pin) {
            showError('Please enter your PIN');
            return;
        }

        try {
            const unlockResponse = await ExtensionMessaging.unlockWallet(pin);
            if (unlockResponse.success) {
                unlockDiv.remove();
                isWalletUnlocked = true;
                
                // Restore the main interface
                restoreMainInterface();
                await loadWalletData();
            } else {
                showError(unlockResponse.error || 'Invalid PIN or wallet not found');
            }
        } catch (error) {
            console.error('Unlock error:', error);
            showError('Failed to unlock wallet');
        }
    });

    // Allow Enter key to unlock
    pinInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            unlockBtn.click();
        }
    });
}

function showWalletReconnectPrompt() {
    // Clear existing content
    const app = document.getElementById('app');
    if (app) {
        app.innerHTML = '';
    }

    const reconnectDiv = document.createElement('div');
    reconnectDiv.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <h3>⚡ Lightning Tipping</h3>
            <h4>Wallet Disconnected</h4>
            <p>Your wallet needs to reconnect to the Lightning Network.</p>
            <button id="reconnect-btn" style="padding: 10px 20px; margin: 5px; background: #f7931a; color: white; border: none; border-radius: 4px; cursor: pointer;">Reconnect Wallet</button>
            <button id="setup-new-btn" style="padding: 10px 20px; margin: 5px; background: #ccc; color: #333; border: none; border-radius: 4px; cursor: pointer;">Setup New Wallet</button>
        </div>
    `;

    app?.appendChild(reconnectDiv);

    const reconnectBtn = document.getElementById('reconnect-btn') as HTMLButtonElement;
    const setupNewBtn = document.getElementById('setup-new-btn') as HTMLButtonElement;

    reconnectBtn.addEventListener('click', async () => {
        try {
            // Try to reconnect by loading the existing wallet
            const pin = prompt('Enter your PIN to reconnect:');
            if (!pin) return;

            const unlockResponse = await ExtensionMessaging.unlockWallet(pin);
            if (unlockResponse.success) {
                reconnectDiv.remove();
                isWalletUnlocked = true;
                
                // Restore the main interface
                restoreMainInterface();
                await loadWalletData();
            } else {
                showError(unlockResponse.error || 'Failed to reconnect wallet');
            }
        } catch (error) {
            console.error('Reconnect error:', error);
            showError('Failed to reconnect wallet');
        }
    });

    setupNewBtn.addEventListener('click', () => {
        reconnectDiv.remove();
        showWalletSetupPrompt();
    });
}

function restoreMainInterface() {
    const app = document.getElementById('app');
    if (app) {
        app.innerHTML = `
            <header>
                <h1>Lightning Tipping</h1>
            </header>
            
            <main>
                <div id="wallet-section">
                    <div id="balance-display">
                        <span id="balance">-- sats</span>
                    </div>
                    
                    <div id="wallet-actions">
                        <button id="deposit-btn">Deposit</button>
                        <button id="withdraw-btn">Withdraw</button>
                    </div>
                </div>
                
                <div id="settings-section">
                    <button id="settings-btn">Settings</button>
                </div>
            </main>
        `;

        // Re-get DOM elements after restoring interface
        const newBalanceElement = document.getElementById('balance') as HTMLElement;
        const newDepositBtn = document.getElementById('deposit-btn') as HTMLButtonElement;
        const newWithdrawBtn = document.getElementById('withdraw-btn') as HTMLButtonElement;
        const newSettingsBtn = document.getElementById('settings-btn') as HTMLButtonElement;

        // Update global references
        (window as any).balanceElement = newBalanceElement;
        (window as any).depositBtn = newDepositBtn;
        (window as any).withdrawBtn = newWithdrawBtn;
        (window as any).settingsBtn = newSettingsBtn;

        // Re-setup event listeners
        newDepositBtn.addEventListener('click', handleDeposit);
        newWithdrawBtn.addEventListener('click', handleWithdraw);
        newSettingsBtn.addEventListener('click', handleSettings);
    }
}

function enableWalletControls() {
    const currentDepositBtn = document.getElementById('deposit-btn') as HTMLButtonElement;
    const currentWithdrawBtn = document.getElementById('withdraw-btn') as HTMLButtonElement;
    
    if (currentDepositBtn) currentDepositBtn.disabled = false;
    if (currentWithdrawBtn) currentWithdrawBtn.disabled = false;
}

function showInvoiceQR(invoice: string, amount: number) {
    const qrDiv = document.createElement('div');
    qrDiv.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 1000; display: flex; align-items: center; justify-content: center;">
            <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; max-width: 400px;">
                <h3>Deposit ${amount.toLocaleString()} sats</h3>
                <div id="qr-code" style="margin: 20px 0;"></div>
                <p style="font-size: 12px; word-break: break-all; margin: 10px 0;">${invoice}</p>
                <button id="copy-invoice-btn" style="padding: 8px 16px; margin: 5px;">Copy Invoice</button>
                <button id="close-qr-btn" style="padding: 8px 16px; margin: 5px;">Close</button>
            </div>
        </div>
    `;

    document.body.appendChild(qrDiv);

    // TODO: Generate actual QR code (would need QR code library)
    const qrCodeDiv = document.getElementById('qr-code');
    if (qrCodeDiv) {
        qrCodeDiv.innerHTML = '<div style="width: 200px; height: 200px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; margin: 0 auto;">QR Code Here</div>';
    }

    document.getElementById('copy-invoice-btn')?.addEventListener('click', () => {
        navigator.clipboard.writeText(invoice);
        showSuccess('Invoice copied to clipboard!');
    });

    document.getElementById('close-qr-btn')?.addEventListener('click', () => {
        qrDiv.remove();
    });
}

async function promptForAmount(message: string): Promise<number | null> {
    const input = prompt(message);
    if (!input) return null;
    
    const amount = parseInt(input);
    if (isNaN(amount) || amount <= 0) {
        showError('Please enter a valid amount');
        return null;
    }
    
    return amount;
}

async function promptForBolt11(): Promise<string | null> {
    const input = prompt('Enter Lightning invoice (bolt11):');
    if (!input) return null;
    
    if (!input.toLowerCase().startsWith('lnbc') && !input.toLowerCase().startsWith('lntb')) {
        showError('Please enter a valid Lightning invoice');
        return null;
    }
    
    return input;
}

function showError(message: string) {
    console.error(message);
    // TODO: Implement proper error UI
    alert(`Error: ${message}`);
}

function showSuccess(message: string) {
    console.log(message);
    // TODO: Implement proper success UI
    alert(message);
}

function showQROnlyInterface() {
    const app = document.getElementById('app');
    if (app) {
        app.innerHTML = `
            <header>
                <h1>⚡ Lightning Tipping</h1>
                <p style="font-size: 12px; color: #666; margin: 0;">QR Code Mode</p>
            </header>
            
            <main>
                <div style="text-align: center; padding: 20px;">
                    <div style="background: #f0f7ff; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                        <h3 style="margin: 0 0 8px 0; color: #2196F3;">External Wallet Mode</h3>
                        <p style="margin: 0; font-size: 13px; color: #666;">
                            Tip detection active. QR codes will be generated for your external Lightning wallet.
                        </p>
                    </div>
                    
                    <div style="display: flex; gap: 8px; justify-content: center;">
                        <button id="setup-wallet-later" style="
                            padding: 8px 16px;
                            border: 1px solid #f7931a;
                            border-radius: 4px;
                            background: white;
                            color: #f7931a;
                            cursor: pointer;
                            font-size: 12px;
                        ">Setup Wallet Later</button>
                        
                        <button id="settings-btn-qr" style="
                            padding: 8px 16px;
                            border: 1px solid #666;
                            border-radius: 4px;
                            background: white;
                            color: #666;
                            cursor: pointer;
                            font-size: 12px;
                        ">Settings</button>
                    </div>
                </div>
            </main>
        `;

        // Add event listeners
        document.getElementById('setup-wallet-later')?.addEventListener('click', () => {
            // Clear the skip flag and show setup again
            chrome.storage.local.remove(['walletSkipped']);
            showWalletSetupPrompt();
        });

        document.getElementById('settings-btn-qr')?.addEventListener('click', handleSettings);
    }
}

function showInfo(message: string) {
    console.log(message);
    // TODO: Implement proper info UI
    alert(message);
}

// Enhanced Deposit Interface
function showDepositInterface() {
    const modal = createModal('deposit-modal', 'Deposit Funds');
    
    modal.innerHTML = `
        <div class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>📥 Deposit Funds</h3>
                    <button class="modal-close" id="close-deposit">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="deposit-step" id="amount-step">
                        <p>Enter the amount you want to deposit:</p>
                        <div class="amount-input-group">
                            <input type="number" id="deposit-amount" placeholder="Amount in sats" min="1" max="100000000">
                            <span class="input-suffix">sats</span>
                        </div>
                        <div class="quick-amounts">
                            <button class="quick-amount-btn" data-amount="10000">10K</button>
                            <button class="quick-amount-btn" data-amount="50000">50K</button>
                            <button class="quick-amount-btn" data-amount="100000">100K</button>
                            <button class="quick-amount-btn" data-amount="500000">500K</button>
                        </div>
                        <div class="modal-actions">
                            <button id="generate-invoice-btn" class="btn-primary" disabled>Generate Invoice</button>
                        </div>
                    </div>
                    
                    <div class="deposit-step hidden" id="invoice-step">
                        <div class="invoice-container">
                            <div class="qr-container">
                                <canvas id="deposit-qr-canvas"></canvas>
                            </div>
                            <div class="invoice-details">
                                <p class="invoice-amount">Amount: <span id="invoice-amount-display"></span> sats</p>
                                <div class="invoice-text-container">
                                    <textarea id="invoice-text" readonly></textarea>
                                    <button id="copy-invoice-btn" class="copy-btn">📋 Copy</button>
                                </div>
                            </div>
                            <div class="payment-status" id="payment-status">
                                <div class="status-indicator">⏳ Waiting for payment...</div>
                                <div class="status-timer">Expires in: <span id="invoice-timer">15:00</span></div>
                            </div>
                        </div>
                        <div class="modal-actions">
                            <button id="new-invoice-btn" class="btn-secondary">New Invoice</button>
                            <button id="close-invoice-btn" class="btn-primary">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    setupDepositListeners();
}

function setupDepositListeners() {
    const depositAmount = document.getElementById('deposit-amount') as HTMLInputElement;
    const generateBtn = document.getElementById('generate-invoice-btn') as HTMLButtonElement;
    const closeBtn = document.getElementById('close-deposit');
    const copyBtn = document.getElementById('copy-invoice-btn');
    const newInvoiceBtn = document.getElementById('new-invoice-btn');
    const closeInvoiceBtn = document.getElementById('close-invoice-btn');
    
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
            showDepositStep('amount-step');
        });
    }
    
    // Close modal
    [closeBtn, closeInvoiceBtn].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                const modal = document.getElementById('deposit-modal');
                if (modal) {
                    modal.remove();
                }
            });
        }
    });
}

async function generateDepositInvoice(amount: number) {
    try {
        const generateBtn = document.getElementById('generate-invoice-btn') as HTMLButtonElement;
        if (generateBtn) {
            generateBtn.disabled = true;
            generateBtn.textContent = 'Generating...';
        }
        
        const description = `Deposit ${amount.toLocaleString()} sats to Lightning Tipping Wallet`;
        const invoiceResponse = await ExtensionMessaging.generateInvoice(amount, description);
        
        if (invoiceResponse.success && invoiceResponse.data) {
            await displayInvoice(invoiceResponse.data, amount);
            showDepositStep('invoice-step');
            startPaymentMonitoring(invoiceResponse.data);
        } else {
            showError(invoiceResponse.error || 'Failed to generate invoice');
        }
    } catch (error) {
        console.error('Invoice generation error:', error);
        showError('Failed to generate invoice');
    } finally {
        const generateBtn = document.getElementById('generate-invoice-btn') as HTMLButtonElement;
        if (generateBtn) {
            generateBtn.disabled = false;
            generateBtn.textContent = 'Generate Invoice';
        }
    }
}

async function displayInvoice(invoice: string, amount: number) {
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

function showDepositStep(stepId: string) {
    const steps = ['amount-step', 'invoice-step'];
    steps.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.classList.toggle('hidden', id !== stepId);
        }
    });
}

// Payment monitoring variables
let paymentMonitoringInterval: NodeJS.Timeout | null = null;
let invoiceExpiryTime: number = 0;

function startPaymentMonitoring(invoice: string) {
    // Set expiry time (15 minutes from now)
    invoiceExpiryTime = Date.now() + (15 * 60 * 1000);
    
    // Clear any existing interval
    if (paymentMonitoringInterval) {
        clearInterval(paymentMonitoringInterval);
    }
    
    // Start monitoring
    paymentMonitoringInterval = setInterval(async () => {
        await checkPaymentStatus(invoice);
        updateInvoiceTimer();
    }, 2000);
    
    // Initial check
    checkPaymentStatus(invoice);
}

async function checkPaymentStatus(invoice: string) {
    try {
        // Check payment status by looking at recent payments
        const paymentsResponse = await ExtensionMessaging.listPayments(true);
        if (paymentsResponse.success && paymentsResponse.data) {
            // Find payment matching this invoice
            const payment = paymentsResponse.data.find(p => 
                p.type === 'receive' && p.description?.includes(invoice.substring(0, 20))
            );
            
            if (payment && payment.status === 'completed') {
                handlePaymentReceived();
            }
            // Note: We don't have expiration detection in this simple implementation
        }
    } catch (error) {
        console.error('Payment status check error:', error);
    }
}

function updateInvoiceTimer() {
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

function handlePaymentReceived() {
    if (paymentMonitoringInterval) {
        clearInterval(paymentMonitoringInterval);
        paymentMonitoringInterval = null;
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
    loadWalletData();
    
    showSuccess('Deposit received successfully!');
    
    // Auto-close modal after 3 seconds
    setTimeout(() => {
        const modal = document.getElementById('deposit-modal');
        if (modal) {
            modal.remove();
        }
    }, 3000);
}

function handlePaymentExpired() {
    if (paymentMonitoringInterval) {
        clearInterval(paymentMonitoringInterval);
        paymentMonitoringInterval = null;
    }
    
    const statusIndicator = document.querySelector('.status-indicator');
    if (statusIndicator) {
        statusIndicator.textContent = '⏰ Invoice expired';
        statusIndicator.className = 'status-indicator expired';
    }
}

// Enhanced Withdrawal Interface
function showWithdrawalInterface() {
    const modal = createModal('withdrawal-modal', 'Withdraw Funds');
    
    modal.innerHTML = `
        <div class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>📤 Withdraw Funds</h3>
                    <button class="modal-close" id="close-withdrawal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="balance-info">
                        <p>Available Balance: <strong>${currentBalance.toLocaleString()} sats</strong></p>
                    </div>
                    
                    <div class="withdrawal-form">
                        <div class="form-group">
                            <label for="payment-input">Lightning Invoice or Address:</label>
                            <textarea id="payment-input" placeholder="Paste Lightning invoice (lnbc...) or Lightning address (user@domain.com)" rows="3"></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label for="withdrawal-amount">Amount (leave empty for invoice amount):</label>
                            <div class="amount-input-group">
                                <input type="number" id="withdrawal-amount" placeholder="Amount in sats" min="1" max="${currentBalance}">
                                <span class="input-suffix">sats</span>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="withdrawal-comment">Comment (optional):</label>
                            <input type="text" id="withdrawal-comment" placeholder="Payment description" maxlength="144">
                        </div>
                        
                        <div class="payment-preview hidden" id="payment-preview">
                            <h4>Payment Preview</h4>
                            <div class="preview-item">
                                <span>Recipient:</span>
                                <span id="preview-recipient"></span>
                            </div>
                            <div class="preview-item">
                                <span>Amount:</span>
                                <span id="preview-amount"></span>
                            </div>
                            <div class="preview-item">
                                <span>Fee Estimate:</span>
                                <span id="preview-fee"></span>
                            </div>
                            <div class="preview-item">
                                <span>Total:</span>
                                <span id="preview-total"></span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="modal-actions">
                        <button id="preview-payment-btn" class="btn-secondary" disabled>Preview Payment</button>
                        <button id="send-payment-btn" class="btn-primary hidden" disabled>Send Payment</button>
                    </div>
                    
                    <div class="payment-status hidden" id="withdrawal-status">
                        <div class="status-indicator" id="withdrawal-status-text">Processing payment...</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    setupWithdrawalListeners();
}

function setupWithdrawalListeners() {
    const paymentInput = document.getElementById('payment-input') as HTMLTextAreaElement;
    const amountInput = document.getElementById('withdrawal-amount') as HTMLInputElement;
    const previewBtn = document.getElementById('preview-payment-btn') as HTMLButtonElement;
    const sendBtn = document.getElementById('send-payment-btn') as HTMLButtonElement;
    const closeBtn = document.getElementById('close-withdrawal');
    
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
        sendBtn.addEventListener('click', sendPayment);
    }
    
    // Close modal
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            const modal = document.getElementById('withdrawal-modal');
            if (modal) {
                modal.remove();
            }
        });
    }
}

function validateWithdrawalForm() {
    const paymentInput = document.getElementById('payment-input') as HTMLTextAreaElement;
    const previewBtn = document.getElementById('preview-payment-btn') as HTMLButtonElement;
    
    if (!paymentInput || !previewBtn) return;
    
    const input = paymentInput.value.trim();
    const isValidInvoice = input.toLowerCase().startsWith('lnbc') || input.toLowerCase().startsWith('lntb');
    const isValidAddress = input.includes('@') && input.includes('.');
    
    previewBtn.disabled = !(isValidInvoice || isValidAddress);
}

async function previewPayment() {
    const paymentInput = document.getElementById('payment-input') as HTMLTextAreaElement;
    const amountInput = document.getElementById('withdrawal-amount') as HTMLInputElement;
    const previewBtn = document.getElementById('preview-payment-btn') as HTMLButtonElement;
    
    if (!paymentInput) return;
    
    try {
        previewBtn.disabled = true;
        previewBtn.textContent = 'Analyzing...';
        
        const input = paymentInput.value.trim();
        const amount = amountInput ? parseInt(amountInput.value) || 0 : 0;
        
        const previewResponse = await ExtensionMessaging.parseLnurl(input);
        
        if (previewResponse.success && previewResponse.data) {
            displayPaymentPreview(previewResponse.data);
        } else {
            showError(previewResponse.error || 'Failed to preview payment');
        }
    } catch (error) {
        console.error('Payment preview error:', error);
        showError('Failed to preview payment');
    } finally {
        previewBtn.disabled = false;
        previewBtn.textContent = 'Preview Payment';
    }
}

function displayPaymentPreview(previewData: any) {
    const previewDiv = document.getElementById('payment-preview');
    const sendBtn = document.getElementById('send-payment-btn') as HTMLButtonElement;
    
    if (!previewDiv || !sendBtn) return;
    
    // Update preview fields
    const recipientEl = document.getElementById('preview-recipient');
    const amountEl = document.getElementById('preview-amount');
    const feeEl = document.getElementById('preview-fee');
    const totalEl = document.getElementById('preview-total');
    
    if (recipientEl) recipientEl.textContent = previewData.recipient || 'Lightning Payment';
    if (amountEl) amountEl.textContent = `${previewData.amount.toLocaleString()} sats`;
    if (feeEl) feeEl.textContent = `${previewData.fee.toLocaleString()} sats`;
    if (totalEl) totalEl.textContent = `${(previewData.amount + previewData.fee).toLocaleString()} sats`;
    
    // Show preview and enable send button
    previewDiv.classList.remove('hidden');
    sendBtn.classList.remove('hidden');
    sendBtn.disabled = false;
}

async function sendPayment() {
    const paymentInput = document.getElementById('payment-input') as HTMLTextAreaElement;
    const amountInput = document.getElementById('withdrawal-amount') as HTMLInputElement;
    const commentInput = document.getElementById('withdrawal-comment') as HTMLInputElement;
    const sendBtn = document.getElementById('send-payment-btn') as HTMLButtonElement;
    const statusDiv = document.getElementById('withdrawal-status');
    const statusText = document.getElementById('withdrawal-status-text');
    
    if (!paymentInput || !sendBtn) return;
    
    // Confirm payment
    const confirmed = confirm('Are you sure you want to send this payment?');
    if (!confirmed) return;
    
    try {
        sendBtn.disabled = true;
        sendBtn.textContent = 'Sending...';
        
        if (statusDiv) statusDiv.classList.remove('hidden');
        if (statusText) statusText.textContent = 'Processing payment...';
        
        const input = paymentInput.value.trim();
        const amount = amountInput ? parseInt(amountInput.value) || 0 : 0;
        const comment = commentInput ? commentInput.value : '';
        
        const paymentResponse = await ExtensionMessaging.sendPayment(input);
        
        if (paymentResponse.success) {
            if (statusText) {
                statusText.textContent = '✅ Payment sent successfully!';
                statusText.className = 'status-indicator success';
            }
            
            showSuccess('Payment sent successfully!');
            await loadWalletData(); // Refresh balance
            
            // Auto-close modal after 3 seconds
            setTimeout(() => {
                const modal = document.getElementById('withdrawal-modal');
                if (modal) {
                    modal.remove();
                }
            }, 3000);
        } else {
            if (statusText) {
                statusText.textContent = `❌ ${paymentResponse.error || 'Payment failed'}`;
                statusText.className = 'status-indicator error';
            }
            showError(paymentResponse.error || 'Payment failed');
        }
    } catch (error) {
        console.error('Payment error:', error);
        if (statusText) {
            statusText.textContent = '❌ Payment failed';
            statusText.className = 'status-indicator error';
        }
        showError('Failed to send payment');
    } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send Payment';
    }
}

// Auto-lock functionality
let autoLockTimeout: NodeJS.Timeout | null = null;
let lastActivity: number = Date.now();

function resetAutoLockTimer() {
    lastActivity = Date.now();
    
    if (autoLockTimeout) {
        clearTimeout(autoLockTimeout);
    }
    
    // Set auto-lock for 15 minutes (900000 ms)
    autoLockTimeout = setTimeout(() => {
        if (isWalletUnlocked) {
            lockWallet();
        }
    }, 900000);
}

function lockWallet() {
    isWalletUnlocked = false;
    
    // Clear any sensitive data
    currentBalance = 0;
    
    // Lock wallet in background
    ExtensionMessaging.lockWallet();
    
    // Show unlock interface
    showUnlockPrompt();
    
    showInfo('Wallet locked due to inactivity');
}

// Track user activity for auto-lock
document.addEventListener('click', resetAutoLockTimer);
document.addEventListener('keypress', resetAutoLockTimer);
document.addEventListener('scroll', resetAutoLockTimer);

// Initialize auto-lock timer
resetAutoLockTimer();

// Utility function to create modal
function createModal(id: string, title: string): HTMLElement {
    // Remove existing modal if present
    const existing = document.getElementById(id);
    if (existing) {
        existing.remove();
    }
    
    const modal = document.createElement('div');
    modal.id = id;
    modal.className = 'modal';
    
    return modal;
}