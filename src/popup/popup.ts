// Popup script for Lightning Network Tipping Extension
// Handles wallet dashboard, deposits, withdrawals, and settings

import { ExtensionMessaging } from '../utils/messaging';

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

        // Generate Lightning invoice for deposit
        const amount = await promptForAmount('Enter deposit amount (sats):');
        if (!amount) return;

        const description = `Deposit ${amount} sats to Lightning Tipping Wallet`;
        const invoiceResponse = await ExtensionMessaging.generateInvoice(amount, description);

        if (invoiceResponse.success && invoiceResponse.data) {
            showInvoiceQR(invoiceResponse.data, amount);
        } else {
            showError(invoiceResponse.error || 'Failed to generate invoice');
        }
    } catch (error) {
        console.error('Deposit error:', error);
        showError('Failed to generate deposit invoice');
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

        // Prompt for withdrawal details
        const bolt11 = await promptForBolt11();
        if (!bolt11) return;

        const confirmed = confirm('Confirm withdrawal?');
        if (!confirmed) return;

        const paymentResponse = await ExtensionMessaging.sendPayment(bolt11);
        if (paymentResponse.success) {
            showSuccess('Payment sent successfully!');
            await loadWalletData(); // Refresh balance
        } else {
            showError(paymentResponse.error || 'Payment failed');
        }
    } catch (error) {
        console.error('Withdrawal error:', error);
        showError('Failed to send payment');
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