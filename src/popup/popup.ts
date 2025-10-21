// Popup script for Lightning Network Tipping Extension
// Handles wallet dashboard, deposits, withdrawals, and settings

/**
 * ARCHITECTURE NOTE: Popup-Centric SDK Design
 *
 * WHY: Chrome extension service workers (background.js) cannot run WebAssembly (WASM).
 * Breez SDK requires WASM to function.
 *
 * THEREFORE:
 * - ALL Breez SDK operations MUST occur in popup context (popup.ts)
 * - Background service worker is STORAGE-ONLY (no SDK access)
 * - Never route SDK operations through background messaging
 *
 * OPERATIONS IN POPUP:
 * - Wallet unlock (connects SDK)
 * - Generate invoice (SDK.receivePayment)
 * - Send payment (SDK.sendPayment)
 * - Check balance (SDK.nodeInfo)
 * - List payments (SDK.listPayments)
 *
 * OPERATIONS IN BACKGROUND:
 * - Save/load encrypted wallet (storage only)
 * - Save/load settings (storage only)
 * - Generate mnemonic (crypto only, no network)
 */

import './popup.css';
import { ExtensionMessaging } from '../utils/messaging';
import * as QRCode from 'qrcode';
import init, { connect, defaultConfig, type BreezSdk, type Config, type ConnectRequest, type EventListener, type SdkEvent } from '@breeztech/breez-sdk-spark/web';
// @ts-ignore - parse function exists but TypeScript can't find it in re-exports
import { parse as parseInput } from '@breeztech/breez-sdk-spark/web';
import * as bip39 from 'bip39';
import type { WalletMetadata } from '../types';
import { ChromeStorageManager } from '../utils/storage';

console.log('Lightning Tipping Extension popup loaded');

// DOM elements (will be set dynamically)
let balanceElement: HTMLElement | null = null;
let depositBtn: HTMLButtonElement | null = null;
let withdrawBtn: HTMLButtonElement | null = null;
let settingsBtn: HTMLButtonElement | null = null;

// State
let currentBalance = 0;
let isWalletUnlocked = false;
let preparedPayment: any = null; // Store prepared payment for sending

// Multi-wallet state
let currentWallets: WalletMetadata[] = [];
let activeWalletId: string | null = null;
let isWalletSelectorOpen = false;

// Breez SDK state
let breezSDK: BreezSdk | null = null;
let isSDKInitialized = false;
const BREEZ_API_KEY = 'MIIBfjCCATCgAwIBAgIHPoqCRCUxZzAFBgMrZXAwEDEOMAwGA1UEAxMFQnJlZXowHhcNMjUxMDEzMTY0NzQ0WhcNMzUxMDExMTY0NzQ0WjAwMRUwEwYDVQQKEwxCVEMgSE9ETCBMdGQxFzAVBgNVBAMTDlBsYW1lbiBBbmRvbm92MCowBQYDK2VwAyEA0IP1y98gPByiIMoph1P0G6cctLb864rNXw1LRLOpXXejgYgwgYUwDgYDVR0PAQH/BAQDAgWgMAwGA1UdEwEB/wQCMAAwHQYDVR0OBBYEFNo5o+5ea0sNMlW/75VgGJCv2AcJMB8GA1UdIwQYMBaAFN6q1pJW843ndJIW/Ey2ILJrKJhrMCUGA1UdEQQeMByBGnBsYW1lbkBjcnlwdG9yZXZvbHV0aW9uLmJnMAUGAytlcANBAOxPxCDCzt/batCHrDuIMNsZL0lqBpk/dG+MzqseJRS8UjhJsSpOO4jTtsMqS7DWJE64THyIV+FTCbt1XhUM2A4=';

// Auto-lock is now handled by background worker using chrome.alarms
// Popup only updates activity timestamps in chrome.storage.local
// No need for local timeout variables

// Wizard state
let generatedMnemonic: string = '';
let mnemonicWords: string[] = [];
let selectedWords: string[] = [];
let userPin: string = '';
let sessionPin: string | null = null; // Stored PIN during active session - cleared on lock
let isAddingWallet: boolean = false; // Track if we're adding a wallet (not initial setup)
let isImportingWallet: boolean = false; // Track if import flow vs create flow

// BIP39 wordlist
const BIP39_WORDS: string[] = bip39.wordlists.english;

// SessionStorage keys for persistent flags across popup reloads
const SESSION_KEY_IS_ADDING_WALLET = 'tipmaster_isAddingWallet';
const SESSION_KEY_IS_IMPORTING_WALLET = 'tipmaster_isImportingWallet';

// Helper functions to manage persistent flags in sessionStorage
function getIsAddingWallet(): boolean {
    return sessionStorage.getItem(SESSION_KEY_IS_ADDING_WALLET) === 'true';
}

function setIsAddingWallet(value: boolean): void {
    if (value) {
        sessionStorage.setItem(SESSION_KEY_IS_ADDING_WALLET, 'true');
    } else {
        sessionStorage.removeItem(SESSION_KEY_IS_ADDING_WALLET);
    }
    isAddingWallet = value;
}

function getIsImportingWallet(): boolean {
    return sessionStorage.getItem(SESSION_KEY_IS_IMPORTING_WALLET) === 'true';
}

function setIsImportingWallet(value: boolean): void {
    if (value) {
        sessionStorage.setItem(SESSION_KEY_IS_IMPORTING_WALLET, 'true');
    } else {
        sessionStorage.removeItem(SESSION_KEY_IS_IMPORTING_WALLET);
    }
    isImportingWallet = value;
}

// Breez SDK initialization helpers
async function connectBreezSDK(mnemonic: string): Promise<BreezSdk> {
    console.log('🔵 [Popup-SDK] CONNECT_BREEZ_SDK ENTRY', {
        timestamp: new Date().toISOString(),
        mnemonicWordCount: mnemonic.split(' ').length,
        apiKeyLength: BREEZ_API_KEY.length
    });

    try {
        // CRITICAL: Initialize WASM module FIRST (required for web/browser environments)
        console.log('🔍 [Popup-SDK] Initializing Breez WASM module...');
        await init();
        console.log('✅ [Popup-SDK] WASM initialized successfully');

        // Now create configuration (WASM must be initialized first)
        console.log('🔍 [Popup-SDK] Creating default config...');
        const config: Config = defaultConfig('mainnet');
        config.apiKey = BREEZ_API_KEY;
        config.syncIntervalSecs = 60;
        console.log('🔍 [Popup-SDK] Config created', {
            network: 'mainnet',
            hasApiKey: !!config.apiKey,
            syncInterval: config.syncIntervalSecs
        });

        // Connect request
        const connectRequest: ConnectRequest = {
            config: config,
            mnemonic: mnemonic,
            storageDir: 'breez-sdk-tipmaster'  // IndexedDB database name
        };
        console.log('🔍 [Popup-SDK] ConnectRequest prepared', {
            storageDir: connectRequest.storageDir,
            hasMnemonic: !!connectRequest.mnemonic
        });

        console.log('🔍 [Popup-SDK] Calling Breez SDK connect()...');
        const sdk = await connect(connectRequest);
        console.log('✅ [Popup-SDK] CONNECT_BREEZ_SDK SUCCESS', {
            timestamp: new Date().toISOString(),
            sdkConnected: !!sdk
        });

        // Set up event listener for SDK events (sync, payments, etc.)
        console.log('🔔 [Breez-SDK] Setting up event listener for sync and payment events');
        sdk.addEventListener({
            onEvent: (event: SdkEvent) => {
                console.log('🔔 [Breez-SDK] Event received:', event.type);

                if (event.type === 'synced') {
                    console.log('✅ [Breez-SDK] Wallet synced with Lightning Network');

                    // Hide loading indicators now that sync is complete
                    const balanceLoading = document.getElementById('balance-loading');
                    if (balanceLoading) {
                        balanceLoading.classList.add('hidden');
                        console.log('✅ [Breez-SDK] Hiding balance loading indicator');
                    }

                    // Reload transaction history after sync completes
                    loadTransactionHistory().catch(err => {
                        console.error('❌ [Breez-SDK] Failed to load transactions after sync:', err);
                    });
                    // Reload balance after sync - query SDK directly for fresh balance
                    updateBalanceDisplay().catch(err => {
                        console.error('❌ [Breez-SDK] Failed to load balance after sync:', err);
                    });
                } else if (event.type === 'paymentSucceeded') {
                    console.log('💰 [Breez-SDK] Payment received');
                    // Reload transaction history and balance when payment received
                    loadTransactionHistory().catch(err => {
                        console.error('❌ [Breez-SDK] Failed to load transactions after payment:', err);
                    });
                    updateBalanceDisplay().catch(err => {
                        console.error('❌ [Breez-SDK] Failed to load balance after payment:', err);
                    });
                }
            }
        });

        return sdk;
    } catch (error) {
        console.error('❌ [Popup-SDK] CONNECT_BREEZ_SDK FAILED', {
            error: error instanceof Error ? error.message : String(error),
            errorName: error instanceof Error ? error.name : undefined,
            stack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString()
        });
        throw error;
    }
}

async function disconnectBreezSDK(): Promise<void> {
    if (breezSDK) {
        try {
            await breezSDK.disconnect();
            console.log('Breez SDK disconnected');
        } catch (error) {
            console.error('Error disconnecting SDK:', error);
        }
        breezSDK = null;
    }
}

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
    initializePopup();
    setupEventListeners();
    setupModalListeners(); // Initialize modal system
});

// Clear session PIN when popup closes (security measure)
window.addEventListener('beforeunload', () => {
    sessionPin = null;
    console.log('🔐 [Session] PIN cleared on popup close');
});

async function initializePopup() {
    try {
        // Restore persistent flags from sessionStorage (survives popup reloads)
        isAddingWallet = getIsAddingWallet();
        isImportingWallet = getIsImportingWallet();
        console.log('🔄 [Popup Init] Restored session flags:', { isAddingWallet, isImportingWallet });

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

        // Wallet exists, check if it's unlocked AND if auto-lock timeout has expired
        const unlockResponse = await ExtensionMessaging.isWalletUnlocked();
        let isUnlockedInStorage = unlockResponse.success && (unlockResponse.data || false);

        if (isUnlockedInStorage) {
            // CRITICAL: Check if 15 minutes have elapsed since last activity
            const data = await chrome.storage.local.get(['lastActivity']);
            const lastActivity = data.lastActivity || 0;
            const elapsed = Date.now() - lastActivity;
            const AUTO_LOCK_DELAY = 15 * 60 * 1000; // 15 minutes

            if (elapsed > AUTO_LOCK_DELAY) {
                // Auto-lock timeout expired - lock the wallet immediately
                console.log(`⏰ [Popup Init] Auto-lock timeout expired (${Math.floor(elapsed / 1000)}s elapsed) - locking wallet`);
                await chrome.storage.local.set({ isUnlocked: false });
                isUnlockedInStorage = false;
                isWalletUnlocked = false;
            } else {
                console.log(`✅ [Popup Init] Wallet still unlocked (${Math.floor(elapsed / 1000)}s / ${AUTO_LOCK_DELAY / 1000}s)`);
            }
        }

        isWalletUnlocked = isUnlockedInStorage;

        // Both locked and unlocked states need PIN to connect SDK
        // The existing showUnlockPrompt() handles everything:
        // - Shows PIN input
        // - Decrypts mnemonic
        // - Connects SDK
        // - Loads balance and transactions
        // - Shows main interface
        console.log(`🔑 [Popup Init] Showing unlock prompt (wallet ${isWalletUnlocked ? 'unlocked but SDK disconnected' : 'locked'})`);
        showUnlockPrompt();

        if (isWalletUnlocked) {
            // Restart auto-lock alarm since wallet is still unlocked
            await chrome.runtime.sendMessage({ type: 'START_AUTO_LOCK_ALARM' });
            await chrome.storage.local.set({ lastActivity: Date.now() });
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

// CRITICAL FIX: Guard against duplicate event listener registration
let eventListenersSetup = false;

function setupEventListeners() {
    // Prevent duplicate event listener registration
    if (eventListenersSetup) {
        console.log('🔄 [EventListeners] Already setup - skipping duplicate registration');
        return;
    }

    console.log('🔵 [EventListeners] Setting up event listeners (first time)');

    // Get current DOM elements
    depositBtn = document.getElementById('deposit-btn') as HTMLButtonElement;
    withdrawBtn = document.getElementById('withdraw-btn') as HTMLButtonElement;
    settingsBtn = document.getElementById('settings-btn') as HTMLButtonElement;
    balanceElement = document.getElementById('balance') as HTMLElement;

    // Setup event listeners if elements exist
    if (depositBtn) depositBtn.addEventListener('click', handleDeposit);
    if (withdrawBtn) withdrawBtn.addEventListener('click', handleWithdraw);
    if (settingsBtn) settingsBtn.addEventListener('click', handleSettings);
    document.getElementById('delete-wallet-btn')?.addEventListener('click', showForgotPinModal);

    // Rename wallet interface event listeners
    const backBtn = document.getElementById('rename-back-btn');
    const saveBtnEl = document.getElementById('rename-save-btn');
    const nameInputEl = document.getElementById('rename-wallet-name-input');
    console.log('?? [EventListeners][Rename] Wiring listeners', {
        hasBackBtn: !!backBtn,
        hasSaveBtn: !!saveBtnEl,
        hasNameInput: !!nameInputEl
    });

    backBtn?.addEventListener('click', hideRenameInterface);
    saveBtnEl?.addEventListener('click', (e) => {
        e.preventDefault();
        if (isRenameSaving) return;
        handleRenameSave();
    });

    // Enter key to save in rename interface
    nameInputEl?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const renameInterface = document.getElementById('rename-wallet-interface');
            const isHidden = renameInterface?.classList.contains('hidden');
            if (isRenameSaving || !renameWalletId || isHidden) return;
            handleRenameSave();
        }
    });

    // Mark as setup to prevent duplicates
    eventListenersSetup = true;
    console.log('✅ [EventListeners] Event listeners setup complete');
}

function updateBalance(balance: number) {
    const currentBalanceElement = document.getElementById('balance') as HTMLElement;
    if (currentBalanceElement) {
        currentBalanceElement.textContent = `${balance.toLocaleString()} sats`;
    }
}

async function updateBalanceDisplay() {
    try {
        if (!breezSDK) {
            console.warn('[Popup] Cannot update balance - SDK not connected');
            const balanceElement = document.getElementById('balance');
            if (balanceElement) balanceElement.textContent = '0 sats';
            return;
        }

        console.log('🔍 [Popup] Fetching balance from SDK...');

        // Get node info which includes balance (Breez SDK Spark uses getInfo not nodeInfo)
        // Use ensureSynced: true to force SDK to sync with network for fresh balance
        const nodeInfo = await breezSDK.getInfo({ ensureSynced: true });
        const balanceSats = nodeInfo.balanceSats || 0;

        console.log('✅ [Popup] Balance fetched:', balanceSats, 'sats');

        // Update UI
        const balanceElement = document.getElementById('balance');
        if (balanceElement) {
            balanceElement.textContent = `${balanceSats.toLocaleString()} sats`;
        }

        currentBalance = balanceSats;

        // Also cache in storage for offline display
        await chrome.storage.local.set({
            cachedBalance: balanceSats,
            balanceLastUpdated: Date.now()
        });

    } catch (error) {
        console.error('❌ [Popup] Balance fetch error:', error);
        // Try to show cached balance
        const cached = await chrome.storage.local.get(['cachedBalance']);
        if (cached.cachedBalance !== undefined) {
            const balanceElement = document.getElementById('balance');
            if (balanceElement) {
                balanceElement.textContent = `${cached.cachedBalance.toLocaleString()} sats`;
            }
        }
    }
}

async function loadTransactionHistory() {
    try {
        if (!breezSDK) {
            console.warn('[Popup] Cannot load transactions - SDK not connected');
            return;
        }

        console.log('🔍 [Popup] Fetching transaction history...');

        const response = await breezSDK.listPayments({});
        const payments = response?.payments || [];

        console.log(`✅ [Popup] Found ${payments.length} transactions`);

        const transactionList = document.getElementById('transaction-list');
        if (!transactionList) {
            console.warn('[Popup] Transaction list element not found');
            return;
        }

        if (payments.length === 0) {
            transactionList.innerHTML = '<div class="no-transactions">No transactions yet</div>';
            return;
        }

        // Sort by timestamp, newest first, show last 5
        const recentPayments = payments
            .sort((a: any, b: any) => (b.timestamp || b.paymentTime || 0) - (a.timestamp || a.paymentTime || 0))
            .slice(0, 5);

        transactionList.innerHTML = recentPayments.map((payment: any) => {
            const isReceive = payment.paymentType === 'receive';
            const amount = payment.amount || payment.amountSats || 0;
            const fees = payment.fees || 0;
            const total = isReceive ? amount : (amount + fees);
            const timestamp = payment.timestamp || payment.paymentTime || 0;
            const date = new Date(timestamp * 1000).toLocaleDateString();
            const time = new Date(timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return `
                <div class="transaction-item">
                    <div class="transaction-info">
                        <div class="transaction-type">${isReceive ? '📥 Received' : '📤 Sent'}</div>
                        <div class="transaction-date">${date} ${time}</div>
                    </div>
                    <div class="transaction-amount ${isReceive ? 'positive' : 'negative'}">
                        ${isReceive ? '+' : '-'}${amount.toLocaleString()} sats
                        ${!isReceive && fees > 0 ? `<div style="font-size: 11px; opacity: 0.7; margin-top: 2px;">+${fees} fee = ${total} total</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        console.log('✅ [Popup] Transaction history displayed');

    } catch (error) {
        console.error('❌ [Popup] Transaction history load error:', error);
    }
}

async function handleDeposit() {
    console.log('🔵 [Deposit] BUTTON CLICKED', {
        isWalletUnlocked,
        hasBreezSDK: !!breezSDK,
        timestamp: new Date().toISOString()
    });

    try {
        if (!isWalletUnlocked) {
            console.warn('⚠️ [Deposit] Wallet is LOCKED - showing unlock prompt');
            showUnlockPrompt();
            return;
        }

        console.log('✅ [Deposit] Wallet is UNLOCKED - showing deposit interface');
        showDepositInterface();
    } catch (error) {
        console.error('❌ [Deposit] Error:', error);
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
    // Show the onboarding wizard
    const wizard = document.getElementById('onboarding-wizard');
    const mainInterface = document.getElementById('main-interface');

    if (wizard && mainInterface) {
        wizard.classList.remove('hidden');
        mainInterface.classList.add('hidden');

        // Show welcome step
        showWizardStep('welcome-step');

        // Setup all wizard event listeners
        setupWizardListeners();
    }
}

// Wizard Navigation
function showWizardStep(stepId: string) {
    console.log('[Wizard Navigation] Showing step:', stepId, '| isAddingWallet:', isAddingWallet, '| isImportingWallet:', isImportingWallet);

    // Hide all wizard steps
    const steps = document.querySelectorAll('.wizard-step');
    steps.forEach(step => {
        step.classList.add('hidden');
    });

    // Show the requested step
    const targetStep = document.getElementById(stepId);
    if (targetStep) {
        targetStep.classList.remove('hidden');
    }

    // Special handling for PIN step - different UI for add wallet vs initial setup
    if (stepId === 'pin-step') {
        const header = document.querySelector('#pin-step .wizard-header h2');
        const description = document.querySelector('#pin-step .wizard-header p');
        const continueBtn = document.getElementById('pin-continue-btn') as HTMLButtonElement;

        if (isAddingWallet) {
            // PIN VERIFICATION mode (adding wallet)
            if (header) header.textContent = '🔐 Verify Your PIN';
            if (description) description.textContent = 'Enter your PIN to encrypt this wallet';

            // Hide ONLY the confirm PIN input (not its parent) and clear its value
            const pinConfirmInput = document.getElementById('pin-confirm') as HTMLInputElement;
            if (pinConfirmInput) {
                pinConfirmInput.style.display = 'none';
                pinConfirmInput.value = ''; // Clear value to prevent validation issues
            }

            if (continueBtn) continueBtn.textContent = 'Add Wallet';
        } else {
            // PIN CREATION mode (initial setup)
            if (header) header.textContent = '🔐 Create Your PIN';
            if (description) description.textContent = 'Create a 6+ digit PIN to secure your wallet';

            // Ensure confirm PIN field is visible
            const pinConfirmInput = document.getElementById('pin-confirm') as HTMLInputElement;
            if (pinConfirmInput) {
                pinConfirmInput.style.display = 'block';
            }

            if (continueBtn) continueBtn.textContent = 'Continue';
        }
    }
}

// Setup all wizard event listeners
function setupWizardListeners() {
    // Welcome Step - Start Setup Button
    const startSetupBtn = document.getElementById('start-setup-btn');
    if (startSetupBtn) {
        startSetupBtn.onclick = () => {
            showWizardStep('setup-choice-step');
        };
    }

    // Setup Choice Step - Back Button
    const choiceBackBtn = document.getElementById('choice-back-btn');
    if (choiceBackBtn) {
        choiceBackBtn.onclick = () => {
            console.log('[Wizard Navigation] Choice back button clicked - isAddingWallet:', isAddingWallet);

            // If adding wallet (not initial setup), close wizard and return to main interface
            if (isAddingWallet) {
                console.log('[Add Wallet] Back from choice step - closing wizard, returning to main interface');

                // Hide wizard
                const wizard = document.getElementById('onboarding-wizard');
                if (wizard) {
                    wizard.classList.add('hidden');
                }

                // Show main interface
                const mainInterface = document.getElementById('main-interface');
                if (mainInterface) {
                    mainInterface.classList.remove('hidden');
                }

                // Reset wizard state
                setIsAddingWallet(false);
                setIsImportingWallet(false);
                generatedMnemonic = '';
                mnemonicWords = [];
                selectedWords = [];

                console.log('[Wizard] Closed, main interface restored');
            } else {
                // Initial setup flow - go back to welcome
                console.log('[Initial Setup] Back to welcome step');
                showWizardStep('welcome-step');
            }
        };
    }

    // Setup Choice Step - Create New Wallet Button
    const createNewWalletBtn = document.getElementById('create-new-wallet-btn');
    if (createNewWalletBtn) {
        createNewWalletBtn.onclick = async () => {
            setIsImportingWallet(false); // Creating, not importing
            await handleStartSetup();
        };
    }

    // Setup Choice Step - Import Wallet Button
    const importWalletBtn = document.getElementById('import-wallet-btn');
    if (importWalletBtn) {
        importWalletBtn.onclick = () => {
            setIsImportingWallet(true); // Importing, not creating
            initializeImportWallet();
            showWizardStep('import-wallet-step');
        };
    }

    // Import Wallet Step - Back Button
    const importBackBtn = document.getElementById('import-back-btn');
    if (importBackBtn) {
        importBackBtn.onclick = () => {
            console.log('[Wizard Navigation] Import back button clicked - isAddingWallet:', isAddingWallet);
            showWizardStep('setup-choice-step');
        };
    }

    // Import Wallet Step - Continue Button
    const importConfirmBtn = document.getElementById('import-confirm-btn');
    if (importConfirmBtn) {
        importConfirmBtn.onclick = () => {
            handleImportContinue();
        };
    }

    // Welcome Step - Skip Setup Button (keep existing functionality)
    const skipSetupBtn = document.getElementById('skip-setup-btn');
    if (skipSetupBtn) {
        skipSetupBtn.onclick = () => {
            const wizard = document.getElementById('onboarding-wizard');
            if (wizard) {
                console.log('[Wizard] Hiding wizard (skip setup) - isAddingWallet:', isAddingWallet);
                wizard.classList.add('hidden');
            }

            // Set a flag that wallet setup was skipped
            chrome.storage.local.set({ walletSkipped: true });

            // Show QR-only interface
            showQROnlyInterface();
            showInfo('Wallet setup skipped. You can detect tips and use QR codes with external wallets.');
        };
    }

    // Mnemonic Step - Back Button
    const mnemonicBackBtn = document.getElementById('mnemonic-back-btn');
    if (mnemonicBackBtn) {
        mnemonicBackBtn.onclick = () => {
            console.log('[Wizard Navigation] Mnemonic back button clicked - isAddingWallet:', isAddingWallet);

            // If adding wallet (not initial setup), close wizard and return to main interface
            if (isAddingWallet) {
                console.log('[Add Wallet] Back from mnemonic step - closing wizard, returning to main interface');

                // Hide wizard
                const wizard = document.getElementById('onboarding-wizard');
                if (wizard) {
                    wizard.classList.add('hidden');
                }

                // Show main interface
                const mainInterface = document.getElementById('main-interface');
                if (mainInterface) {
                    mainInterface.classList.remove('hidden');
                }

                // Reset wizard state
                setIsAddingWallet(false);
                setIsImportingWallet(false);
                generatedMnemonic = '';
                mnemonicWords = [];
                selectedWords = [];

                console.log('[Wizard] Closed, main interface restored');
            } else {
                // Initial setup flow - go back to welcome
                console.log('[Initial Setup] Back to welcome step');
                showWizardStep('welcome-step');
            }
        };
    }

    // Mnemonic Step - Continue Button
    const mnemonicContinueBtn = document.getElementById('mnemonic-continue-btn');
    if (mnemonicContinueBtn) {
        mnemonicContinueBtn.onclick = () => {
            handleMnemonicContinue();
        };
    }

    // Confirm Step - Back Button
    const confirmBackBtn = document.getElementById('confirm-back-btn');
    if (confirmBackBtn) {
        confirmBackBtn.onclick = () => {
            showWizardStep('mnemonic-step');
        };
    }

    // Confirm Step - Continue Button
    const confirmContinueBtn = document.getElementById('confirm-continue-btn');
    if (confirmContinueBtn) {
        confirmContinueBtn.onclick = () => {
            handleConfirmContinue();
        };
    }

    // PIN Step - Back Button
    const pinBackBtn = document.getElementById('pin-back-btn');
    if (pinBackBtn) {
        pinBackBtn.onclick = () => {
            // Navigate back to appropriate step based on wizard flow
            if (isImportingWallet) {
                showWizardStep('import-wallet-step');
                console.log('[PIN] Navigating back to import step');
            } else {
                showWizardStep('confirm-step');
                console.log('[PIN] Navigating back to confirm step');
            }
        };
    }

    // PIN Step - Continue Button
    const pinContinueBtn = document.getElementById('pin-continue-btn');
    if (pinContinueBtn) {
        pinContinueBtn.onclick = async () => {
            await handlePinContinue();
        };
    }

    // PIN Step - Input validation
    const pinInput = document.getElementById('pin-input') as HTMLInputElement;
    const pinConfirm = document.getElementById('pin-confirm') as HTMLInputElement;

    if (pinInput && pinConfirm) {
        const validatePinInputs = () => {
            const pin = pinInput.value;
            const confirmPin = pinConfirm.value;
            const pinContinueBtn = document.getElementById('pin-continue-btn') as HTMLButtonElement;
            const pinStrength = document.getElementById('pin-strength');

            // Check PIN length
            if (pin.length < 6) {
                if (pinStrength) {
                    pinStrength.textContent = 'PIN must be at least 6 characters';
                    pinStrength.style.color = '#dc3545';
                }
                if (pinContinueBtn) {
                    pinContinueBtn.disabled = true;
                }
                return;
            }

            // Check PIN match ONLY when NOT adding wallet (initial setup requires confirmation)
            if (!isAddingWallet && pin !== confirmPin) {
                if (pinStrength) {
                    pinStrength.textContent = 'PINs do not match';
                    pinStrength.style.color = '#dc3545';
                }
                if (pinContinueBtn) {
                    pinContinueBtn.disabled = true;
                }
                return;
            }

            // PINs are valid
            if (pinStrength) {
                if (isAddingWallet) {
                    pinStrength.textContent = 'Enter your PIN';
                    pinStrength.style.color = '#6c757d';
                } else {
                    pinStrength.textContent = 'PIN is valid';
                    pinStrength.style.color = '#28a745';
                }
            }
            if (pinContinueBtn) {
                pinContinueBtn.disabled = false;
            }
        };

        pinInput.addEventListener('input', validatePinInputs);
        pinConfirm.addEventListener('input', validatePinInputs);
    }

    // Complete Step - Finish Button
    const completeSetupBtn = document.getElementById('complete-setup-btn');
    if (completeSetupBtn) {
        completeSetupBtn.onclick = () => {
            handleSetupComplete();
        };
    }
}

// Handle Start Setup - Generate and Display Mnemonic
async function handleStartSetup() {
    try {
        const startBtn = document.getElementById('start-setup-btn') as HTMLButtonElement;
        if (startBtn) {
            startBtn.disabled = true;
            startBtn.textContent = 'Generating...';
        }

        // Generate mnemonic
        const response = await ExtensionMessaging.generateMnemonic();

        if (response.success && response.data) {
            generatedMnemonic = response.data;
            mnemonicWords = generatedMnemonic.split(' ');

            // Display mnemonic
            displayMnemonic(generatedMnemonic);

            // Show mnemonic step
            showWizardStep('mnemonic-step');
        } else {
            showError(response.error || 'Failed to generate mnemonic');
        }
    } catch (error) {
        console.error('Mnemonic generation error:', error);
        showError('Failed to generate recovery phrase');
    } finally {
        const startBtn = document.getElementById('start-setup-btn') as HTMLButtonElement;
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.textContent = 'Set Up Wallet';
        }
    }
}

// Display Mnemonic in Grid
function displayMnemonic(mnemonic: string) {
    const words = mnemonic.split(' ');
    const mnemonicGrid = document.getElementById('mnemonic-display');

    if (!mnemonicGrid) return;

    mnemonicGrid.innerHTML = '';

    words.forEach((word, index) => {
        const wordDiv = document.createElement('div');
        wordDiv.className = 'mnemonic-word';
        wordDiv.innerHTML = `<span class="word-number">${index + 1}.</span> ${word}`;
        mnemonicGrid.appendChild(wordDiv);
    });
}

// Handle Mnemonic Continue - Setup Confirmation
function handleMnemonicContinue() {
    // Setup confirmation step with shuffled words
    setupConfirmationStep();
    showWizardStep('confirm-step');
}

// Setup Confirmation Step with Shuffled Words
function setupConfirmationStep() {
    // Reset selected words
    selectedWords = [];

    // Shuffle words
    const shuffledWords = [...mnemonicWords].sort(() => Math.random() - 0.5);

    // Display selected words area
    const selectedWordsDiv = document.getElementById('selected-words');
    if (selectedWordsDiv) {
        selectedWordsDiv.innerHTML = '<p style="color: #666; font-size: 14px;">Select words in order:</p>';
    }

    // Display word options
    const wordOptionsDiv = document.getElementById('word-options');
    if (!wordOptionsDiv) return;

    wordOptionsDiv.innerHTML = '';

    shuffledWords.forEach((word, index) => {
        const wordBtn = document.createElement('button');
        wordBtn.className = 'word-button';
        wordBtn.textContent = word;
        wordBtn.dataset.word = word;

        wordBtn.onclick = () => {
            handleWordSelection(word, wordBtn);
        };

        wordOptionsDiv.appendChild(wordBtn);
    });

    // Disable continue button initially
    const confirmContinueBtn = document.getElementById('confirm-continue-btn') as HTMLButtonElement;
    if (confirmContinueBtn) {
        confirmContinueBtn.disabled = true;
    }
}

// Handle Word Selection
function handleWordSelection(word: string, button: HTMLButtonElement) {
    // Add word to selected list
    selectedWords.push(word);

    // Disable the button
    button.disabled = true;
    button.style.opacity = '0.5';

    // Update selected words display
    updateSelectedWordsDisplay();

    // Check if all words selected
    if (selectedWords.length === mnemonicWords.length) {
        checkConfirmation();
    }
}

// Update Selected Words Display
function updateSelectedWordsDisplay() {
    const selectedWordsDiv = document.getElementById('selected-words');
    if (!selectedWordsDiv) return;

    selectedWordsDiv.innerHTML = '<p style="color: #666; font-size: 14px; margin-bottom: 10px;">Selected words:</p>';

    const wordsContainer = document.createElement('div');
    wordsContainer.style.display = 'flex';
    wordsContainer.style.flexWrap = 'wrap';
    wordsContainer.style.gap = '8px';
    wordsContainer.style.marginBottom = '16px';

    selectedWords.forEach((word, index) => {
        const wordSpan = document.createElement('span');
        wordSpan.style.padding = '6px 12px';
        wordSpan.style.background = '#f0f0f0';
        wordSpan.style.borderRadius = '4px';
        wordSpan.style.fontSize = '14px';
        wordSpan.textContent = `${index + 1}. ${word}`;
        wordsContainer.appendChild(wordSpan);
    });

    selectedWordsDiv.appendChild(wordsContainer);
}

// Check if confirmation is correct
function checkConfirmation() {
    const isCorrect = selectedWords.every((word, index) => word === mnemonicWords[index]);

    const confirmContinueBtn = document.getElementById('confirm-continue-btn') as HTMLButtonElement;
    const selectedWordsDiv = document.getElementById('selected-words');

    if (isCorrect) {
        if (confirmContinueBtn) {
            confirmContinueBtn.disabled = false;
        }

        if (selectedWordsDiv) {
            const successMsg = document.createElement('p');
            successMsg.style.color = '#28a745';
            successMsg.style.fontWeight = 'bold';
            successMsg.style.marginTop = '10px';
            successMsg.textContent = 'Correct! You can continue.';
            selectedWordsDiv.appendChild(successMsg);
        }
    } else {
        if (selectedWordsDiv) {
            const errorMsg = document.createElement('p');
            errorMsg.style.color = '#dc3545';
            errorMsg.style.fontWeight = 'bold';
            errorMsg.style.marginTop = '10px';
            errorMsg.textContent = 'Incorrect order. Please try again.';
            selectedWordsDiv.appendChild(errorMsg);

            // Reset after 2 seconds
            setTimeout(() => {
                setupConfirmationStep();
            }, 2000);
        }
    }
}

// Handle Confirmation Continue
function handleConfirmContinue() {
    showWizardStep('pin-step');
}

// Handle PIN Continue - Complete Setup
async function handlePinContinue() {
    const pinInput = document.getElementById('pin-input') as HTMLInputElement;

    if (!pinInput) return;

    const pin = pinInput.value;

    console.log('🔍 [PIN Continue] isAddingWallet:', isAddingWallet, 'PIN length:', pin.length);

    if (isAddingWallet) {
        // Adding wallet - verify existing PIN
        console.log('🔵 [PIN Continue] Add wallet mode - verifying PIN');
        await handleAddWalletWithPin(pin);
    } else {
        // Initial setup - create new PIN with confirmation
        console.log('🔵 [PIN Continue] Initial setup mode - validating PIN match');
        const pinConfirm = document.getElementById('pin-confirm') as HTMLInputElement;
        if (!pinConfirm) return;

        const confirmPin = pinConfirm.value;

        console.log('🔍 [PIN Continue] Confirm PIN length:', confirmPin.length);

        // Validate PIN length and match
        if (pin.length < 6) {
            showError('PIN must be at least 6 characters');
            return;
        }

        if (pin !== confirmPin) {
            showError('PINs do not match');
            return;
        }

        await handleInitialSetupWithPin(pin);
    }
}

/**
 * Handle adding wallet with PIN verification
 * Verifies the entered PIN is correct by attempting to load existing wallets
 */
async function handleAddWalletWithPin(pin: string): Promise<void> {
    try {
        // Validate PIN length
        if (pin.length < 6) {
            showError('PIN must be at least 6 digits');
            return;
        }

        // Verify PIN is correct by loading existing wallets
        console.log('🔍 [Add Wallet] Verifying PIN...');
        const verifyResponse = await ExtensionMessaging.loadWallet(pin);

        if (!verifyResponse.success || !verifyResponse.data) {
            showError('Incorrect PIN. Please try again.');
            console.error('❌ [Add Wallet] PIN verification failed');
            return;
        }

        console.log('✅ [Add Wallet] PIN verified successfully');

        // Store PIN for wallet creation
        userPin = pin;

        // Show loading state
        const continueBtn = document.getElementById('pin-continue-btn') as HTMLButtonElement;
        if (continueBtn) {
            continueBtn.disabled = true;
            continueBtn.textContent = 'Adding Wallet...';
        }

        // Create or import wallet with verified PIN
        let response;
        if (isImportingWallet) {
            console.log('🔵 [Add Wallet] Importing wallet...');
            response = await ExtensionMessaging.importWallet(generatedMnemonic, '', pin);
        } else {
            console.log('🔵 [Add Wallet] Creating wallet...');
            response = await ExtensionMessaging.createWallet('', pin);
        }

        if (response.success && response.data) {
            console.log('✅ [Add Wallet] Wallet added successfully');
            if (response.data.mnemonic) {
                generatedMnemonic = response.data.mnemonic; // Store for display if needed
            }
            showWizardStep('setup-complete-step');

            // Auto-close after 2 seconds
            setTimeout(() => {
                handleSetupComplete();
            }, 2000);
        } else {
            throw new Error(response.error || 'Failed to add wallet');
        }

    } catch (error) {
        console.error('❌ [Add Wallet] Error:', error);
        showError(error instanceof Error ? error.message : 'Failed to add wallet');

        // Navigate back to appropriate step after error
        if (isImportingWallet) {
            showWizardStep('import-wallet-step');
            console.log('[Add Wallet] Error occurred, navigating back to import step');
        } else {
            showWizardStep('mnemonic-step');
            console.log('[Add Wallet] Error occurred, navigating back to mnemonic step');
        }

        // Reset button state
        const continueBtn = document.getElementById('pin-continue-btn') as HTMLButtonElement;
        if (continueBtn) {
            continueBtn.disabled = false;
            continueBtn.textContent = 'Add Wallet';
        }
    }
}

/**
 * Handle initial wallet setup with new PIN
 */
async function handleInitialSetupWithPin(pin: string): Promise<void> {
    try {
        // Store PIN
        userPin = pin;

        console.log('🔑 [Setup] PIN CREATED:', {
            pinLength: userPin.length,
            pinValue: userPin,
            timestamp: new Date().toISOString()
        });

        // Show loading state
        const continueBtn = document.getElementById('pin-continue-btn') as HTMLButtonElement;
        if (continueBtn) {
            continueBtn.disabled = true;
            continueBtn.textContent = 'Creating Wallet...';
        }

        console.log('🔵 [Setup] Setting up wallet with PIN...');

        // Setup wallet via messaging
        const response = await ExtensionMessaging.setupWallet(generatedMnemonic, pin);

        if (response.success) {
            console.log('✅ [Setup] Wallet setup successful');
            showWizardStep('setup-complete-step');

            // Auto-close after 2 seconds
            setTimeout(() => {
                handleSetupComplete();
            }, 2000);
        } else {
            throw new Error(response.error || 'Wallet setup failed');
        }

    } catch (error) {
        console.error('❌ [Setup] Wallet setup error:', error);
        showError(error instanceof Error ? error.message : 'Wallet setup failed');

        // Reset button
        const continueBtn = document.getElementById('pin-continue-btn') as HTMLButtonElement;
        if (continueBtn) {
            continueBtn.disabled = false;
            continueBtn.textContent = 'Continue';
        }
    }
}

// Handle Setup Complete
async function handleSetupComplete() {
    console.log('🔵 [Setup] handleSetupComplete ENTRY', {
        timestamp: new Date().toISOString(),
        isWalletUnlocked_before: isWalletUnlocked,
        isAddingWallet: isAddingWallet
    });

    // Hide wizard
    const wizard = document.getElementById('onboarding-wizard');
    if (wizard) {
        console.log('[Wizard] Hiding wizard (setup complete) - isAddingWallet:', isAddingWallet);
        wizard.classList.add('hidden');
    }

    // Show main interface
    const mainInterface = document.getElementById('main-interface');
    if (mainInterface) {
        mainInterface.classList.remove('hidden');
    }

    // Check if we're adding a wallet or completing initial setup
    if (isAddingWallet) {
        // Multi-wallet flow: Wallet was added successfully
        console.log('✅ [Add Wallet] Wallet added successfully - switching to new wallet');

        try {
            // Get all wallets to find the newly added one
            const walletsResponse = await ExtensionMessaging.getAllWallets();
            if (!walletsResponse.success || !walletsResponse.data || walletsResponse.data.length === 0) {
                showError('Failed to load wallets');
                return;
            }

            // Find newest wallet (highest lastUsedAt)
            const newestWallet = walletsResponse.data.reduce((newest, wallet) =>
                wallet.lastUsedAt > newest.lastUsedAt ? wallet : newest
            );

            console.log(`[Add Wallet] Switching to new wallet: ${newestWallet.nickname} (${newestWallet.id})`);

            // Disconnect current SDK if connected
            if (breezSDK) {
                console.log('[Add Wallet] Disconnecting current SDK');
                await breezSDK.disconnect();
                breezSDK = null;
            }

            // Get PIN (should be stored in userPin from handleAddWalletWithPin)
            const pin = userPin || '';
            if (!pin) {
                console.warn('[Add Wallet] No PIN available - wallet switch may fail');
            }

            // Switch to the new wallet
            const switchResponse = await ExtensionMessaging.switchWallet(newestWallet.id, pin);
            if (!switchResponse.success || !switchResponse.data) {
                showError('Failed to switch to new wallet');
                return;
            }

            // Connect SDK to new wallet
            console.log('[Add Wallet] Connecting SDK to new wallet');
            breezSDK = await connectBreezSDK(switchResponse.data.mnemonic);
            isWalletUnlocked = true;

            // Store PIN in session for multi-wallet operations
            sessionPin = userPin;
            console.log('🔐 [Session] PIN stored after wallet setup');

            // Get initial balance from SDK directly (not cached)
            await updateBalanceDisplay();

            // Enable wallet controls now that wallet is loaded
            enableWalletControls();

            // Show loading states while waiting for sync to complete
            const balanceLoading = document.getElementById('balance-loading');
            if (balanceLoading) {
                balanceLoading.classList.remove('hidden');
                console.log('🔄 [Add Wallet] Showing balance loading indicator');
            }

            const transactionList = document.getElementById('transaction-list');
            if (transactionList) {
                transactionList.innerHTML = '<div class="no-transactions">⏳ Loading transaction history...</div>';
                console.log('🔄 [Add Wallet] Showing transaction loading text');
            }

            // Transaction history will load automatically when SDK sync completes (via event listener)
            showInfo('Syncing wallet data...');
            console.log('⏳ [Add Wallet] Waiting for SDK sync to complete before loading transactions');

            // Refresh the wallet list UI
            await initializeMultiWalletUI();

            showSuccess(`Switched to ${newestWallet.nickname}!`);

        } catch (error) {
            console.error('[Add Wallet] Error switching to new wallet:', error);
            showError('Wallet added but failed to switch. Please select it from the dropdown.');
        } finally {
            // Reset flags and clear wizard state
            // Clear from both memory and sessionStorage
            setIsAddingWallet(false);
            setIsImportingWallet(false);
            generatedMnemonic = '';
            mnemonicWords = [];
            selectedWords = [];
            userPin = '';
        }
        return;
    }

    // Initial setup flow
    // CRITICAL: Set state to unlocked FIRST (before any async operations)
    // This prevents race condition where user clicks Deposit before async SDK connection completes
    isWalletUnlocked = true;
    console.log('✅ [Setup] isWalletUnlocked set to TRUE immediately');

    // Initialize balance to 0 immediately (new wallet has no funds)
    updateBalance(0);

    // Initialize Breez SDK in popup context (has DOM access)
    console.log('Popup: Initializing Breez SDK in popup context...');
    showInfo('Connecting to Lightning Network...');

    try {
        // Initialize and connect Breez SDK with mnemonic
        breezSDK = await connectBreezSDK(generatedMnemonic);
        console.log('Popup: Breez SDK connected successfully');

        // Get initial balance from SDK
        const nodeInfo = await breezSDK.getInfo({});
        const balanceSats = nodeInfo.balanceSats || 0;
        currentBalance = Number(balanceSats);
        updateBalance(currentBalance);

        // Show loading states while waiting for sync to complete
        const balanceLoading = document.getElementById('balance-loading');
        if (balanceLoading) {
            balanceLoading.classList.remove('hidden');
            console.log('🔄 [Setup] Showing balance loading indicator');
        }

        const transactionList = document.getElementById('transaction-list');
        if (transactionList) {
            transactionList.innerHTML = '<div class="no-transactions">⏳ Loading transaction history...</div>';
            console.log('🔄 [Setup] Showing transaction loading text');
        }

        // Transaction history will load automatically when SDK sync completes (via event listener)
        showInfo('Syncing wallet data...');
        console.log('⏳ [Setup] Waiting for SDK sync to complete before loading transactions');

        showSuccess('Wallet created and connected to Lightning Network!');

        // Start background alarm for auto-lock
        console.log('🔔 [Setup] Starting background auto-lock alarm');
        await chrome.runtime.sendMessage({ type: 'START_AUTO_LOCK_ALARM' });
        await chrome.storage.local.set({ lastActivity: Date.now() });

        // Initialize multi-wallet UI (shows + button to add more wallets)
        await initializeMultiWalletUI();
        console.log('✅ [Setup] Multi-wallet UI initialized');

        console.log('✅ [Setup] handleSetupComplete EXIT - wallet fully initialized', {
            timestamp: new Date().toISOString(),
            isWalletUnlocked_after: isWalletUnlocked,
            hasBreezSDK: !!breezSDK
        });
    } catch (error) {
        console.error('Breez SDK initialization error:', error);
        showError('Wallet created, but Lightning Network connection failed. Please try reopening the wallet.');
        // Ensure balance shows 0 even on error
        updateBalance(0);
    }
}

// Initialize Import Wallet Step
function initializeImportWallet() {
    const container = document.getElementById('import-words-container');
    if (!container) return;

    // Clear existing inputs
    container.innerHTML = '';

    // Create 12 input fields
    for (let i = 1; i <= 12; i++) {
        const wrapper = document.createElement('div');
        wrapper.className = 'word-input-wrapper';
        wrapper.innerHTML = `
            <span class="word-number">${i}</span>
            <input
                type="text"
                id="import-word-${i}"
                autocomplete="off"
                autocorrect="off"
                autocapitalize="off"
                spellcheck="false"
                data-word-index="${i-1}"
                placeholder="word ${i}"
            />
        `;
        container.appendChild(wrapper);

        const input = wrapper.querySelector('input') as HTMLInputElement;
        setupWordAutocomplete(input);
        setupWordPasteHandler(input);
    }
}

// Setup Word Autocomplete
function setupWordAutocomplete(input: HTMLInputElement) {
    const suggestionsDiv = document.getElementById('word-suggestions');
    if (!suggestionsDiv) return;

    input.addEventListener('input', () => {
        const value = input.value.toLowerCase().trim();

        // Hide suggestions if less than 2 characters
        if (value.length < 2) {
            suggestionsDiv.style.display = 'none';
            validateWordInput(input);
            checkImportComplete();
            return;
        }

        // Filter BIP39 words
        const matches = BIP39_WORDS.filter(word =>
            word.startsWith(value)
        ).slice(0, 10); // Limit to 10 suggestions

        if (matches.length === 0) {
            suggestionsDiv.style.display = 'none';
            validateWordInput(input);
            checkImportComplete();
            return;
        }

        // Show suggestions
        suggestionsDiv.innerHTML = '';
        matches.forEach(word => {
            const div = document.createElement('div');
            div.className = 'word-suggestion';
            div.textContent = word;
            div.addEventListener('click', () => {
                input.value = word;
                suggestionsDiv.style.display = 'none';
                validateWordInput(input);

                // Focus next input
                const wordIndex = parseInt(input.dataset.wordIndex || '0');
                if (wordIndex < 11) {
                    const nextInput = document.getElementById(`import-word-${wordIndex + 2}`) as HTMLInputElement;
                    if (nextInput) nextInput.focus();
                }

                checkImportComplete();
            });
            suggestionsDiv.appendChild(div);
        });

        // Position suggestions below input
        const rect = input.getBoundingClientRect();
        suggestionsDiv.style.display = 'block';
        suggestionsDiv.style.left = rect.left + 'px';
        suggestionsDiv.style.top = (rect.bottom + 4) + 'px';
        suggestionsDiv.style.width = rect.width + 'px';

        validateWordInput(input);
        checkImportComplete();
    });

    // Hide suggestions when clicking outside
    input.addEventListener('blur', () => {
        setTimeout(() => {
            suggestionsDiv.style.display = 'none';
        }, 200);
    });

    // Handle Enter key to accept first suggestion or move to next field
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const firstSuggestion = suggestionsDiv.querySelector('.word-suggestion') as HTMLElement;
            if (firstSuggestion && suggestionsDiv.style.display === 'block') {
                firstSuggestion.click();
            } else {
                // Move to next field if word is valid
                const value = input.value.toLowerCase().trim();
                if (BIP39_WORDS.includes(value)) {
                    const wordIndex = parseInt(input.dataset.wordIndex || '0');
                    if (wordIndex < 11) {
                        const nextInput = document.getElementById(`import-word-${wordIndex + 2}`) as HTMLInputElement;
                        if (nextInput) nextInput.focus();
                    }
                }
            }
        }
    });
}

// Setup Paste Handler for Word Input
function setupWordPasteHandler(input: HTMLInputElement) {
    input.addEventListener('paste', (e: ClipboardEvent) => {
        e.preventDefault();

        // Get pasted text
        const pastedText = e.clipboardData?.getData('text');
        if (!pastedText) {
            console.log('[Import] No text in paste event');
            return;
        }

        console.log('[Import] Paste detected:', {
            length: pastedText.length,
            preview: pastedText.substring(0, 50)
        });

        // Parse pasted text by splitting on whitespace
        const words = pastedText.trim().split(/\s+/).filter(word => word.length > 0);

        console.log('[Import] Parsed words:', {
            count: words.length,
            words: words
        });

        // Validate we have exactly 12 words
        if (words.length !== 12) {
            showError(`Invalid paste: Expected 12 words, got ${words.length}. Please paste a complete 12-word recovery phrase.`);
            console.error('[Import] Invalid word count:', words.length);
            return;
        }

        // Validate each word against BIP39 wordlist
        const invalidWords: string[] = [];
        const lowerWords = words.map(w => w.toLowerCase());

        lowerWords.forEach((word, index) => {
            if (!BIP39_WORDS.includes(word)) {
                invalidWords.push(`"${word}" at position ${index + 1}`);
            }
        });

        if (invalidWords.length > 0) {
            showError(`Invalid paste: The following words are not in the BIP39 wordlist: ${invalidWords.join(', ')}`);
            console.error('[Import] Invalid words found:', invalidWords);
            return;
        }

        console.log('[Import] All words valid, filling fields...');

        // All words are valid - fill all input fields
        lowerWords.forEach((word, index) => {
            const wordInput = document.getElementById(`import-word-${index + 1}`) as HTMLInputElement;
            if (wordInput) {
                wordInput.value = word;
                validateWordInput(wordInput);
            }
        });

        // Check if import is complete (should enable the button)
        checkImportComplete();

        showSuccess('Recovery phrase pasted successfully! All 12 words are valid.');
        console.log('[Import] Paste operation complete');
    });
}

// Validate Word Input
function validateWordInput(input: HTMLInputElement) {
    const value = input.value.toLowerCase().trim();

    if (value === '') {
        input.classList.remove('valid', 'invalid');
    } else if (BIP39_WORDS.includes(value)) {
        input.classList.add('valid');
        input.classList.remove('invalid');
    } else {
        input.classList.add('invalid');
        input.classList.remove('valid');
    }
}

// Check if All Import Words are Valid
function checkImportComplete() {
    const allWords: string[] = [];
    let allValid = true;

    for (let i = 1; i <= 12; i++) {
        const input = document.getElementById(`import-word-${i}`) as HTMLInputElement;
        if (!input) {
            allValid = false;
            break;
        }

        const word = input.value.toLowerCase().trim();
        if (!word || !BIP39_WORDS.includes(word)) {
            allValid = false;
            break;
        }

        allWords.push(word);
    }

    const importConfirmBtn = document.getElementById('import-confirm-btn') as HTMLButtonElement;
    if (importConfirmBtn) {
        importConfirmBtn.disabled = !allValid;
    }

    // Store the mnemonic if all words are valid
    if (allValid) {
        generatedMnemonic = allWords.join(' ');
        mnemonicWords = allWords;
    }
}

// Handle Import Continue
function handleImportContinue() {
    // Skip mnemonic display and confirmation steps, go directly to PIN
    showWizardStep('pin-step');
}

// ========================================
// Multi-Wallet UI Functions
// ========================================

/**
 * Initialize multi-wallet UI if user has multiple wallets
 */
async function initializeMultiWalletUI(): Promise<void> {
    try {
        console.log('🔄 [Multi-Wallet] Initializing wallet selector');

        // Get all wallets
        const walletsResponse = await ExtensionMessaging.getAllWallets();
        if (!walletsResponse.success || !walletsResponse.data) {
            console.log('[Multi-Wallet] No wallets found or error');
            return;
        }

        currentWallets = walletsResponse.data;
        console.log(`[Multi-Wallet] Found ${currentWallets.length} wallet(s)`);

        // Show wallet selector if one or more wallets exist (shows "+" button to add more)
        const walletSelector = document.getElementById('wallet-selector');
        if (currentWallets.length >= 1 && walletSelector) {
            walletSelector.classList.remove('hidden');
            updateWalletSelectorUI();
            setupWalletSelectorListeners();
        }
    } catch (error) {
        console.error('[Multi-Wallet] Initialization error:', error);
    }
}

/**
 * Update wallet selector UI with current wallets
 */
function updateWalletSelectorUI(): void {
    // Find active wallet
    const activeWallet = currentWallets.find(w => {
        // Determine active wallet (for now, assume first wallet or marked active)
        // This will be properly set after unlocking
        return w.lastUsedAt === Math.max(...currentWallets.map(w => w.lastUsedAt));
    });

    if (!activeWallet) return;

    // Update current wallet button
    const currentWalletName = document.getElementById('current-wallet-name');
    if (currentWalletName) {
        currentWalletName.textContent = activeWallet.nickname;
    }

    // Update wallet count badge
    const walletCountBadge = document.getElementById('wallet-count-badge');
    if (walletCountBadge) {
        walletCountBadge.textContent = currentWallets.length.toString();
    }

    // Populate wallet dropdown list
    populateWalletDropdown();
}

/**
 * Populate wallet dropdown with all wallets
 */
function populateWalletDropdown(): void {
    const walletList = document.getElementById('wallet-list');
    if (!walletList) return;

    walletList.innerHTML = '';

    currentWallets.forEach(wallet => {
        const isActive = wallet.lastUsedAt === Math.max(...currentWallets.map(w => w.lastUsedAt));

        const walletItem = document.createElement('div');
        walletItem.className = `wallet-item${isActive ? ' active' : ''}`;
        walletItem.dataset.walletId = wallet.id;

        walletItem.innerHTML = `
      <span class="wallet-item-check">${isActive ? '✓' : ''}</span>
      <div class="wallet-item-info">
        <div class="wallet-item-name">${wallet.nickname}</div>
        <div class="wallet-item-balance">Last used: ${new Date(wallet.lastUsedAt).toLocaleDateString()}</div>
      </div>
    `;

        walletItem.onclick = () => handleWalletSwitch(wallet.id);
        walletList.appendChild(walletItem);
    });
}

/**
 * Setup wallet selector event listeners
 */
function setupWalletSelectorListeners(): void {
    const currentWalletBtn = document.getElementById('current-wallet-btn');
    const addWalletBtn = document.getElementById('add-wallet-btn');
    const manageWalletsBtn = document.getElementById('manage-wallets-btn');
    const walletDropdown = document.getElementById('wallet-dropdown');
    const walletSelector = document.getElementById('wallet-selector');

    // Toggle dropdown
    if (currentWalletBtn) {
        currentWalletBtn.onclick = () => {
            isWalletSelectorOpen = !isWalletSelectorOpen;
            currentWalletBtn.classList.toggle('open', isWalletSelectorOpen);
            walletDropdown?.classList.toggle('hidden', !isWalletSelectorOpen);
        };
    }

    // Add wallet
    if (addWalletBtn) {
        addWalletBtn.onclick = () => {
            showAddWalletModal();
        };
    }

    // Manage wallets
    if (manageWalletsBtn) {
        manageWalletsBtn.onclick = async () => {
            // Close the dropdown first
            isWalletSelectorOpen = false;
            currentWalletBtn?.classList.remove('open');
            walletDropdown?.classList.add('hidden');

            // Show in-popup wallet management interface
            await showWalletManagementInterface();
        };
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (walletSelector && !walletSelector.contains(e.target as Node) && isWalletSelectorOpen) {
            isWalletSelectorOpen = false;
            currentWalletBtn?.classList.remove('open');
            walletDropdown?.classList.add('hidden');
        }
    });
}

/**
 * Handle wallet switch
 */
async function handleWalletSwitch(walletId: string): Promise<void> {
    try {
        console.log(`[Multi-Wallet] Switching to wallet: ${walletId}`);

        // Close dropdown
        const walletDropdown = document.getElementById('wallet-dropdown');
        walletDropdown?.classList.add('hidden');
        isWalletSelectorOpen = false;

        // Show switching indicator
        showWalletSwitchingIndicator(true);

        // Use session PIN for decryption (stored during unlock)
        const pin = sessionPin || '';
        if (!pin) {
            console.error('[Multi-Wallet] No session PIN available');
            showError('Session expired. Please unlock wallet again.');
            // Show unlock screen
            const unlockScreen = document.getElementById('unlock-screen');
            const mainInterface = document.getElementById('main-interface');
            if (unlockScreen && mainInterface) {
                unlockScreen.classList.remove('hidden');
                mainInterface.classList.add('hidden');
                isWalletUnlocked = false;
            }
            return;
        }
        console.log('🔐 [Multi-Wallet] Using session PIN for wallet switch');

        // CRITICAL FIX: Clear cached balance before switching wallets
        // Balance cache is global and not wallet-specific
        await chrome.storage.local.remove(['cachedBalance']);
        console.log('🔄 [Multi-Wallet] Cleared global balance cache before switch');

        // Disconnect current SDK
        if (breezSDK) {
            console.log('[Multi-Wallet] Disconnecting current SDK');
            await breezSDK.disconnect();
            breezSDK = null;
        }

        // Switch wallet
        const switchResponse = await ExtensionMessaging.switchWallet(walletId, pin);
        if (!switchResponse.success || !switchResponse.data) {
            throw new Error(switchResponse.error || 'Wallet switch failed');
        }

        // Connect new SDK
        console.log('[Multi-Wallet] Connecting to new wallet SDK');
        breezSDK = await connectBreezSDK(switchResponse.data.mnemonic);

        // CRITICAL FIX: Query fresh balance from SDK instead of using cached value
        // loadWalletData() uses cached balance which is stale after wallet switch
        await updateBalanceDisplay();
        console.log('🔄 [Multi-Wallet] Queried fresh balance from new wallet SDK');

        // Show loading states while waiting for sync to complete
        const balanceLoading = document.getElementById('balance-loading');
        if (balanceLoading) {
            balanceLoading.classList.remove('hidden');
            console.log('🔄 [Wallet Switch] Showing balance loading indicator');
        }

        const transactionList = document.getElementById('transaction-list');
        if (transactionList) {
            transactionList.innerHTML = '<div class="no-transactions">⏳ Loading transaction history...</div>';
            console.log('🔄 [Wallet Switch] Showing transaction loading text');
        }

        // Transaction history will load automatically when SDK sync completes (via event listener)
        showInfo('Syncing wallet data...');
        console.log('⏳ [Wallet Switch] Waiting for SDK sync to complete before loading transactions');

        // Update UI
        await initializeMultiWalletUI();

        showSuccess('Switched to ' + currentWallets.find(w => w.id === walletId)?.nickname);
        showWalletSwitchingIndicator(false);

    } catch (error) {
        console.error('[Multi-Wallet] Wallet switch failed:', error);
        showError('Failed to switch wallet: ' + (error instanceof Error ? error.message : 'Unknown error'));
        showWalletSwitchingIndicator(false);
    }
}

/**
 * Show/hide wallet switching indicator
 */
function showWalletSwitchingIndicator(show: boolean): void {
    let overlay = document.getElementById('wallet-switching-overlay');

    if (show && !overlay) {
        overlay = document.createElement('div');
        overlay.id = 'wallet-switching-overlay';
        overlay.className = 'wallet-switching-overlay';
        overlay.innerHTML = `
      <div class="switching-spinner"></div>
      <div class="switching-text">Switching wallet...</div>
    `;
        document.body.appendChild(overlay);
    } else if (!show && overlay) {
        overlay.remove();
    }
}

// ========================================
// Modal System - Phase 4
// ========================================

/**
 * Modal state management
 */
interface ModalState {
    currentModal: string | null;
    resolveCallback: ((value: any) => void) | null;
    rejectCallback: ((error: any) => void) | null;
}

const modalState: ModalState = {
    currentModal: null,
    resolveCallback: null,
    rejectCallback: null
};

/**
 * Generic modal show/hide functions
 */
function showModalOverlay(): void {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) {
        overlay.classList.remove('hidden');
        document.body.classList.add('modal-open');
    }
}

function hideModalOverlay(): void {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
        document.body.classList.remove('modal-open');
    }
}

function showModal(modalId: string): void {
    hideAllModals();
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        showModalOverlay();
        modalState.currentModal = modalId;

        // Focus first input if exists
        const firstInput = modal.querySelector('input') as HTMLInputElement;
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }
}

function hideModal(modalId: string): void {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
    }
    if (modalState.currentModal === modalId) {
        hideModalOverlay();
        modalState.currentModal = null;
    }
}

function hideAllModals(): void {
    const allModals = document.querySelectorAll('.modal');
    allModals.forEach(modal => modal.classList.add('hidden'));
}

/**
 * Setup modal event listeners (call once on DOMContentLoaded)
 */
function setupModalListeners(): void {
    // Close on overlay click
    const overlay = document.getElementById('modal-overlay');
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeCurrentModal(null);
            }
        });
    }

    // ESC key to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalState.currentModal) {
            closeCurrentModal(null);
        }
    });

    // Setup all modal close buttons
    const closeButtons = document.querySelectorAll('.modal-close');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            closeCurrentModal(null);
        });
    });
}

/**
 * Close current modal and resolve with value
 */
function closeCurrentModal(value: any): void {
    if (modalState.resolveCallback) {
        modalState.resolveCallback(value);
        modalState.resolveCallback = null;
        modalState.rejectCallback = null;
    }
    if (modalState.currentModal) {
        hideModal(modalState.currentModal);
    }
}

/**
 * PIN Entry Modal
 */
async function showPINModal(message: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
        modalState.resolveCallback = resolve;
        modalState.rejectCallback = reject;

        const messageEl = document.getElementById('pin-modal-message');
        const inputEl = document.getElementById('pin-modal-input') as HTMLInputElement;
        const errorEl = document.getElementById('pin-modal-error');
        const confirmBtn = document.getElementById('pin-modal-confirm');
        const cancelBtn = document.getElementById('pin-modal-cancel');

        if (!messageEl || !inputEl || !confirmBtn || !cancelBtn) {
            resolve(null);
            return;
        }

        // Setup modal
        messageEl.textContent = message;
        inputEl.value = '';
        errorEl?.classList.add('hidden');

        // Remove old listeners
        const newConfirmBtn = confirmBtn.cloneNode(true) as HTMLButtonElement;
        const newCancelBtn = cancelBtn.cloneNode(true) as HTMLButtonElement;
        confirmBtn.replaceWith(newConfirmBtn);
        cancelBtn.replaceWith(newCancelBtn);

        // Confirm button
        newConfirmBtn.addEventListener('click', () => {
            const pin = inputEl.value.trim();
            if (!pin || pin.length < 4) {
                if (errorEl) {
                    errorEl.textContent = 'PIN must be at least 4 digits';
                    errorEl.classList.remove('hidden');
                }
                return;
            }
            closeCurrentModal(pin);
        });

        // Cancel button
        newCancelBtn.addEventListener('click', () => {
            closeCurrentModal(null);
        });

        // Enter key to confirm
        inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                newConfirmBtn.click();
            }
        });

        showModal('pin-modal');
    });
}

/**
 * Add Wallet - Use onboarding wizard instead of modals
 */
async function showAddWalletModal(): Promise<void> {
    console.log('[Add Wallet] Showing onboarding wizard for add wallet flow');

    // Set flag to indicate we're adding a wallet (not initial setup)
    // Using sessionStorage to persist across popup reloads
    console.log('[Add Wallet] Opening wizard - setting isAddingWallet=true');
    setIsAddingWallet(true);

    // Hide main interface
    const mainInterface = document.getElementById('main-interface');
    if (mainInterface) {
        mainInterface.classList.add('hidden');
    }

    // Hide wallet management interface (if visible)
    const managementInterface = document.getElementById('wallet-management-interface');
    if (managementInterface) {
        managementInterface.classList.add('hidden');
    }

    // Show wizard
    const wizard = document.getElementById('onboarding-wizard');
    if (wizard) {
        wizard.classList.remove('hidden');
    }

    // Go directly to choice step (skip welcome)
    showWizardStep('setup-choice-step');

    // Setup wizard event listeners for the buttons
    setupWizardListeners();
}

/**
 * Step 1: Choose create or import
 */
async function showAddWalletChoiceModal(): Promise<'create' | 'import' | null> {
    return new Promise((resolve) => {
        modalState.resolveCallback = resolve;

        const createBtn = document.getElementById('modal-create-new-wallet-btn');
        const importBtn = document.getElementById('modal-import-wallet-btn');
        const cancelBtn = document.getElementById('add-wallet-choice-cancel');

        if (!createBtn || !importBtn || !cancelBtn) {
            resolve(null);
            return;
        }

        // Remove old listeners
        const newCreateBtn = createBtn.cloneNode(true) as HTMLButtonElement;
        const newImportBtn = importBtn.cloneNode(true) as HTMLButtonElement;
        const newCancelBtn = cancelBtn.cloneNode(true) as HTMLButtonElement;
        createBtn.replaceWith(newCreateBtn);
        importBtn.replaceWith(newImportBtn);
        cancelBtn.replaceWith(newCancelBtn);

        newCreateBtn.addEventListener('click', () => {
            closeCurrentModal('create');
        });

        newImportBtn.addEventListener('click', () => {
            closeCurrentModal('import');
        });

        newCancelBtn.addEventListener('click', () => {
            closeCurrentModal(null);
        });

        showModal('add-wallet-choice-modal');
    });
}

/**
 * Handle Create Wallet Flow
 */
async function handleCreateWalletFlow(): Promise<void> {
    // Step 1: Get nickname
    const nickname = await showCreateWalletNicknameModal();
    if (!nickname) return;

    // Step 2: Get PIN
    const pin = await showPINModal('Enter your PIN to create wallet');
    if (!pin) return;

    // Step 3: Generate wallet
    try {
        showWalletSwitchingIndicator(true);
        const response = await ExtensionMessaging.createWallet(nickname, pin);

        if (!response.success || !response.data) {
            throw new Error(response.error || 'Wallet creation failed');
        }

        // Step 4: Show mnemonic
        const confirmed = await showMnemonicDisplayModal(response.data.mnemonic);

        if (confirmed) {
            await initializeMultiWalletUI();
            showSuccess(`Wallet "${nickname}" created successfully`);
        }

        showWalletSwitchingIndicator(false);
    } catch (error) {
        console.error('[Multi-Wallet] Create wallet failed:', error);
        showError('Failed to create wallet');
        showWalletSwitchingIndicator(false);
    }
}

/**
 * Show nickname input for create wallet
 */
async function showCreateWalletNicknameModal(): Promise<string | null> {
    return new Promise((resolve) => {
        modalState.resolveCallback = resolve;

        const inputEl = document.getElementById('create-wallet-nickname') as HTMLInputElement;
        const errorEl = document.getElementById('create-wallet-error');
        const backBtn = document.getElementById('create-wallet-back');
        const nextBtn = document.getElementById('create-wallet-next');

        if (!inputEl || !backBtn || !nextBtn) {
            resolve(null);
            return;
        }

        inputEl.value = '';
        errorEl?.classList.add('hidden');

        // Remove old listeners
        const newBackBtn = backBtn.cloneNode(true) as HTMLButtonElement;
        const newNextBtn = nextBtn.cloneNode(true) as HTMLButtonElement;
        backBtn.replaceWith(newBackBtn);
        nextBtn.replaceWith(newNextBtn);

        newBackBtn.addEventListener('click', () => {
            hideModal('add-wallet-create-modal');
            showAddWalletModal(); // Go back to choice
        });

        newNextBtn.addEventListener('click', () => {
            const nickname = inputEl.value.trim();
            if (!nickname) {
                if (errorEl) {
                    errorEl.textContent = 'Please enter a wallet nickname';
                    errorEl.classList.remove('hidden');
                }
                return;
            }
            closeCurrentModal(nickname);
        });

        inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                newNextBtn.click();
            }
        });

        showModal('add-wallet-create-modal');
    });
}

/**
 * Show mnemonic display modal
 */
async function showMnemonicDisplayModal(mnemonic: string): Promise<boolean> {
    return new Promise((resolve) => {
        modalState.resolveCallback = resolve;

        const displayEl = document.getElementById('modal-mnemonic-display');
        const copyBtn = document.getElementById('copy-mnemonic-btn');
        const backBtn = document.getElementById('mnemonic-modal-back');
        const confirmBtn = document.getElementById('mnemonic-modal-confirm');

        if (!displayEl || !copyBtn || !backBtn || !confirmBtn) {
            resolve(false);
            return;
        }

        // Display mnemonic in grid
        const words = mnemonic.split(' ');
        displayEl.innerHTML = '';
        words.forEach((word, index) => {
            const wordDiv = document.createElement('div');
            wordDiv.className = 'mnemonic-word';
            wordDiv.innerHTML = `<span class="word-number">${index + 1}.</span> ${word}`;
            displayEl.appendChild(wordDiv);
        });

        // Remove old listeners
        const newCopyBtn = copyBtn.cloneNode(true) as HTMLButtonElement;
        const newBackBtn = backBtn.cloneNode(true) as HTMLButtonElement;
        const newConfirmBtn = confirmBtn.cloneNode(true) as HTMLButtonElement;
        copyBtn.replaceWith(newCopyBtn);
        backBtn.replaceWith(newBackBtn);
        confirmBtn.replaceWith(newConfirmBtn);

        newCopyBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(mnemonic);
                newCopyBtn.textContent = '✓ Copied!';
                setTimeout(() => {
                    newCopyBtn.textContent = '📋 Copy to Clipboard';
                }, 2000);
            } catch (err) {
                console.error('Failed to copy:', err);
            }
        });

        newBackBtn.addEventListener('click', () => {
            closeCurrentModal(false);
        });

        newConfirmBtn.addEventListener('click', () => {
            closeCurrentModal(true);
        });

        showModal('add-wallet-mnemonic-modal');
    });
}

/**
 * Handle Import Wallet Flow
 */
async function handleImportWalletFlow(): Promise<void> {
    // Step 1: Get nickname
    const nickname = await showImportWalletNicknameModal();
    if (!nickname) return;

    // Step 2: Get mnemonic
    const mnemonic = await showImportMnemonicModal();
    if (!mnemonic) return;

    // Step 3: Get PIN
    const pin = await showPINModal('Enter your PIN to import wallet');
    if (!pin) return;

    // Step 4: Import wallet
    try {
        showWalletSwitchingIndicator(true);
        const response = await ExtensionMessaging.importWallet(mnemonic, nickname, pin);

        if (!response.success) {
            throw new Error(response.error || 'Wallet import failed');
        }

        await initializeMultiWalletUI();
        showSuccess(`Wallet "${nickname}" imported successfully`);
        showWalletSwitchingIndicator(false);
    } catch (error) {
        console.error('[Multi-Wallet] Import wallet failed:', error);
        showError('Failed to import wallet: ' + (error instanceof Error ? error.message : 'Unknown error'));
        showWalletSwitchingIndicator(false);
    }
}

/**
 * Show nickname input for import wallet
 */
async function showImportWalletNicknameModal(): Promise<string | null> {
    return new Promise((resolve) => {
        modalState.resolveCallback = resolve;

        const inputEl = document.getElementById('import-wallet-nickname') as HTMLInputElement;
        const errorEl = document.getElementById('import-nickname-error');
        const backBtn = document.getElementById('import-nickname-back');
        const nextBtn = document.getElementById('import-nickname-next');

        if (!inputEl || !backBtn || !nextBtn) {
            resolve(null);
            return;
        }

        inputEl.value = '';
        errorEl?.classList.add('hidden');

        // Remove old listeners
        const newBackBtn = backBtn.cloneNode(true) as HTMLButtonElement;
        const newNextBtn = nextBtn.cloneNode(true) as HTMLButtonElement;
        backBtn.replaceWith(newBackBtn);
        nextBtn.replaceWith(newNextBtn);

        newBackBtn.addEventListener('click', () => {
            hideModal('add-wallet-import-nickname-modal');
            showAddWalletModal(); // Go back to choice
        });

        newNextBtn.addEventListener('click', () => {
            const nickname = inputEl.value.trim();
            if (!nickname) {
                if (errorEl) {
                    errorEl.textContent = 'Please enter a wallet nickname';
                    errorEl.classList.remove('hidden');
                }
                return;
            }
            closeCurrentModal(nickname);
        });

        inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                newNextBtn.click();
            }
        });

        showModal('add-wallet-import-nickname-modal');
    });
}

/**
 * Show mnemonic import modal with word input grid
 */
async function showImportMnemonicModal(): Promise<string | null> {
    return new Promise((resolve) => {
        modalState.resolveCallback = resolve;

        const container = document.getElementById('modal-import-words-container');
        const suggestionsDiv = document.getElementById('modal-word-suggestions');
        const errorEl = document.getElementById('import-mnemonic-error');
        const backBtn = document.getElementById('import-modal-back');
        const confirmBtn = document.getElementById('import-modal-confirm');

        if (!container || !suggestionsDiv || !backBtn || !confirmBtn) {
            resolve(null);
            return;
        }

        // Setup word input grid
        container.innerHTML = '';
        errorEl?.classList.add('hidden');

        // Clone buttons first
        const newBackBtn = backBtn.cloneNode(true) as HTMLButtonElement;
        const newConfirmBtn = confirmBtn.cloneNode(true) as HTMLButtonElement;
        backBtn.replaceWith(newBackBtn);
        confirmBtn.replaceWith(newConfirmBtn);

        // Create word inputs
        for (let i = 1; i <= 12; i++) {
            const wrapper = document.createElement('div');
            wrapper.className = 'word-input-wrapper';
            wrapper.innerHTML = `
                <span class="word-number">${i}</span>
                <input
                    type="text"
                    id="modal-import-word-${i}"
                    autocomplete="off"
                    autocorrect="off"
                    autocapitalize="off"
                    spellcheck="false"
                    data-word-index="${i-1}"
                    placeholder="word ${i}"
                />
            `;
            container.appendChild(wrapper);

            const input = wrapper.querySelector('input') as HTMLInputElement;
            setupModalWordAutocomplete(input, suggestionsDiv, newConfirmBtn);
        }

        newBackBtn.addEventListener('click', () => {
            hideModal('add-wallet-import-modal');
            handleImportWalletFlow(); // Restart flow
        });

        newConfirmBtn.addEventListener('click', () => {
            const words: string[] = [];
            for (let i = 1; i <= 12; i++) {
                const input = document.getElementById(`modal-import-word-${i}`) as HTMLInputElement;
                if (input) {
                    words.push(input.value.toLowerCase().trim());
                }
            }

            // Validate all words
            const invalidWords = words.filter(word => !BIP39_WORDS.includes(word));
            if (invalidWords.length > 0) {
                if (errorEl) {
                    errorEl.textContent = 'Invalid words detected. Please check your input.';
                    errorEl.classList.remove('hidden');
                }
                return;
            }

            closeCurrentModal(words.join(' '));
        });

        showModal('add-wallet-import-modal');
    });
}

/**
 * Setup word autocomplete for modal word inputs
 */
function setupModalWordAutocomplete(input: HTMLInputElement, suggestionsDiv: HTMLElement, confirmBtn: HTMLButtonElement): void {
    input.addEventListener('input', () => {
        const value = input.value.toLowerCase().trim();

        if (value.length < 2) {
            suggestionsDiv.style.display = 'none';
            validateModalWordInput(input);
            checkModalImportComplete(confirmBtn);
            return;
        }

        const matches = BIP39_WORDS.filter(word => word.startsWith(value)).slice(0, 10);

        if (matches.length === 0) {
            suggestionsDiv.style.display = 'none';
            validateModalWordInput(input);
            checkModalImportComplete(confirmBtn);
            return;
        }

        // Show suggestions
        suggestionsDiv.innerHTML = '';
        matches.forEach(word => {
            const div = document.createElement('div');
            div.className = 'word-suggestion';
            div.textContent = word;
            div.addEventListener('click', () => {
                input.value = word;
                suggestionsDiv.style.display = 'none';
                validateModalWordInput(input);

                // Focus next input
                const wordIndex = parseInt(input.dataset.wordIndex || '0');
                if (wordIndex < 11) {
                    const nextInput = document.getElementById(`modal-import-word-${wordIndex + 2}`) as HTMLInputElement;
                    if (nextInput) nextInput.focus();
                }

                checkModalImportComplete(confirmBtn);
            });
            suggestionsDiv.appendChild(div);
        });

        // Position suggestions below input
        const rect = input.getBoundingClientRect();
        suggestionsDiv.style.display = 'block';
        suggestionsDiv.style.left = rect.left + 'px';
        suggestionsDiv.style.top = (rect.bottom + 4) + 'px';
        suggestionsDiv.style.width = rect.width + 'px';

        validateModalWordInput(input);
        checkModalImportComplete(confirmBtn);
    });

    // Hide suggestions on blur
    input.addEventListener('blur', () => {
        setTimeout(() => {
            suggestionsDiv.style.display = 'none';
        }, 200);
    });

    // Enter key handler
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const firstSuggestion = suggestionsDiv.querySelector('.word-suggestion') as HTMLElement;
            if (firstSuggestion && suggestionsDiv.style.display === 'block') {
                firstSuggestion.click();
            } else {
                const value = input.value.toLowerCase().trim();
                if (BIP39_WORDS.includes(value)) {
                    const wordIndex = parseInt(input.dataset.wordIndex || '0');
                    if (wordIndex < 11) {
                        const nextInput = document.getElementById(`modal-import-word-${wordIndex + 2}`) as HTMLInputElement;
                        if (nextInput) nextInput.focus();
                    }
                }
            }
        }
    });
}

function validateModalWordInput(input: HTMLInputElement): void {
    const value = input.value.toLowerCase().trim();
    if (value.length === 0) {
        input.classList.remove('valid', 'invalid');
    } else if (BIP39_WORDS.includes(value)) {
        input.classList.add('valid');
        input.classList.remove('invalid');
    } else {
        input.classList.add('invalid');
        input.classList.remove('valid');
    }
}

function checkModalImportComplete(confirmBtn: HTMLButtonElement): void {
    let allValid = true;
    for (let i = 1; i <= 12; i++) {
        const input = document.getElementById(`modal-import-word-${i}`) as HTMLInputElement;
        if (input) {
            const value = input.value.toLowerCase().trim();
            if (!BIP39_WORDS.includes(value)) {
                allValid = false;
                break;
            }
        }
    }
    confirmBtn.disabled = !allValid;
}

/**
 * REMOVED: Old showRenameWalletModal() function
 * Replaced with full-screen rename interface (showRenameInterface)
 */

/**
 * Legacy function for backward compatibility
 */
async function promptForPIN(message: string): Promise<string | null> {
    return showPINModal(message);
}

// ========================================
// Wallet Management Interface Functions
// ========================================

/**
 * Show wallet management interface (in-popup)
 */
async function showWalletManagementInterface(): Promise<void> {
    console.log('[Wallet Management] Showing management interface');

    // Hide main interface
    const mainInterface = document.getElementById('main-interface');
    if (mainInterface) {
        mainInterface.classList.add('hidden');
    }

    // Show wallet management interface
    const managementInterface = document.getElementById('wallet-management-interface');
    if (managementInterface) {
        managementInterface.classList.remove('hidden');
    }

    // Load and display wallets
    await loadWalletManagementList();

    // Setup back button
    const backBtn = document.getElementById('wallet-mgmt-back-btn');
    if (backBtn) {
        backBtn.onclick = () => {
            hideWalletManagementInterface();
        };
    }

    // Setup add wallet button
    const addBtn = document.getElementById('wallet-mgmt-add-btn');
    if (addBtn) {
        addBtn.onclick = () => {
            console.log('[Wallet Management] Add wallet button clicked');
            showAddWalletModal();
        };
    }
}

/**
 * Hide wallet management interface and return to main interface
 */
function hideWalletManagementInterface(): void {
    console.log('[Wallet Management] Hiding management interface');

    // Hide wallet management interface
    const managementInterface = document.getElementById('wallet-management-interface');
    if (managementInterface) {
        managementInterface.classList.add('hidden');
    }

    // Show main interface
    const mainInterface = document.getElementById('main-interface');
    if (mainInterface) {
        mainInterface.classList.remove('hidden');
    }
}

/**
 * Load and display wallet list in management interface
 */
async function loadWalletManagementList(): Promise<void> {
    try {
        console.log('[Wallet Management] Loading wallet list');

        // Get all wallets
        const walletsResponse = await ExtensionMessaging.getAllWallets();
        if (!walletsResponse.success || !walletsResponse.data) {
            showError('Failed to load wallets');
            return;
        }

        const wallets = walletsResponse.data;
        console.log(`[Wallet Management] Loaded ${wallets.length} wallet(s)`);

        // Get current active wallet ID
        const activeWalletData = await chrome.storage.local.get(['activeWalletId']);
        const activeWalletId = activeWalletData.activeWalletId;

        // Render wallet list
        const listContainer = document.getElementById('wallet-management-list');
        if (!listContainer) {
            console.error('[Wallet Management] List container not found');
            return;
        }

        if (wallets.length === 0) {
            listContainer.innerHTML = '<div class="no-transactions" style="padding: 40px 20px;">No wallets found</div>';
            return;
        }

        listContainer.innerHTML = wallets.map(wallet => {
            const isActive = wallet.id === activeWalletId;
            const canDelete = wallets.length > 1; // Can't delete if it's the only wallet

            // Format creation date
            const createdDate = new Date(wallet.createdAt).toLocaleDateString();

            return `
                <div class="wallet-mgmt-item ${isActive ? 'active' : ''}" data-wallet-id="${wallet.id}">
                    <div class="wallet-mgmt-header">
                        <div class="wallet-mgmt-name">
                            ${wallet.nickname}
                            ${isActive ? '<span class="active-badge">Active</span>' : ''}
                        </div>
                    </div>
                    <div class="wallet-mgmt-balance">
                        Created: ${createdDate}
                    </div>
                    <div class="wallet-mgmt-actions">
                        <button class="wallet-mgmt-btn rename-btn" data-wallet-id="${wallet.id}" data-wallet-name="${wallet.nickname}">
                            Rename
                        </button>
                        <button class="wallet-mgmt-btn delete-btn" data-wallet-id="${wallet.id}" ${!canDelete ? 'disabled' : ''}>
                            Delete
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Attach event listeners to buttons
        attachWalletManagementListeners();

    } catch (error) {
        console.error('[Wallet Management] Failed to load wallet list:', error);
        showError('Failed to load wallets');
    }
}

/**
 * Attach event listeners to wallet management buttons
 */
function attachWalletManagementListeners(): void {
    // Rename buttons
    const renameButtons = document.querySelectorAll('.wallet-mgmt-btn.rename-btn');
    renameButtons.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const target = e.target as HTMLElement;
            const walletId = target.getAttribute('data-wallet-id');
            const currentName = target.getAttribute('data-wallet-name');

            if (walletId && currentName) {
                await handleRenameWallet(walletId, currentName);
            }
        });
    });

    // Delete buttons
    const deleteButtons = document.querySelectorAll('.wallet-mgmt-btn.delete-btn');
    deleteButtons.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const target = e.target as HTMLElement;
            const walletId = target.getAttribute('data-wallet-id');

            if (walletId) {
                await handleDeleteWallet(walletId);
            }
        });
    });
}

// Global state for rename flow
let renameWalletId: string | null = null;
let renameWalletCurrentName: string | null = null;

/**
 * Handle rename wallet action - show full-screen rename interface
 */
async function handleRenameWallet(walletId: string, currentName: string): Promise<void> {
    try {
        console.log(`[Wallet Management] Renaming wallet ${walletId}`);

        // Store wallet info for rename flow
        renameWalletId = walletId;
        renameWalletCurrentName = currentName;

        // Show rename interface
        showRenameInterface(currentName);
    } catch (error) {
        console.error('[Wallet Management] Failed to show rename interface:', error);
        showError('Failed to open rename screen');
    }
}

/**
 * Show rename wallet full-screen interface
 */
function showRenameInterface(currentName: string): void {
    console.log('[Rename] Showing rename interface');

    // Hide wallet management interface
    const managementInterface = document.getElementById('wallet-management-interface');
    if (managementInterface) {
        managementInterface.classList.add('hidden');
    }

    // Show rename interface
    const renameInterface = document.getElementById('rename-wallet-interface');
    if (renameInterface) {
        renameInterface.classList.remove('hidden');
    }

    // Set current wallet name in input
    const input = document.getElementById('rename-wallet-name-input') as HTMLInputElement;
    if (input) {
        input.value = currentName;
        input.focus();
        input.select(); // Select all text for easy overwriting
    }

    // Focus and select input text for easy editing
    // (No longer need 350ms delay workaround - duplicate listener issue fixed)

    // Clear any previous error
    const errorEl = document.getElementById('rename-error-message');
    if (errorEl) {
        errorEl.classList.add('hidden');
        errorEl.textContent = '';
    }
}

// CRITICAL FIX: Prevent duplicate rename save calls
let isRenameSaving = false;

/**
 * Handle rename save action
 */
async function handleRenameSave(): Promise<void> {
    try {
        console.log('🔵 [Rename] handleRenameSave() CALLED', {
            timestamp: new Date().toISOString(),
            renameWalletId: renameWalletId,
            renameWalletCurrentName: renameWalletCurrentName,
            isRenameSaving: isRenameSaving
        });

        // Prevent duplicate calls
        if (isRenameSaving) {
            console.log('🔄 [Rename] Save already in progress - ignoring duplicate call');
            return;
        }

        // Set lock before validation
        isRenameSaving = true;
        console.log('🔒 [Rename] Locking save operation');

        // Now validate - if validation fails, lock will be released in finally
        if (!renameWalletId) {
            console.error('[Rename] No wallet ID set - ABORTING');
            console.error('[Rename] State at error:', {
                renameWalletId: renameWalletId,
                renameWalletCurrentName: renameWalletCurrentName,
                timestamp: new Date().toISOString()
            });
            console.warn('[Rename] Ignoring save with no wallet ID');
            return;
        }

        const input = document.getElementById('rename-wallet-name-input') as HTMLInputElement;
        const errorEl = document.getElementById('rename-error-message');
        const newName = input?.value.trim();
        console.log('?? [Rename] Input captured', { newNameLength: newName?.length, preview: newName });

        // Validate input
        if (!newName) {
            if (errorEl) {
                errorEl.textContent = 'Please enter a wallet name';
                errorEl.classList.remove('hidden');
            }
            console.warn('[Rename] Validation failed: empty name');
            return;
        }

        // Use session PIN (wallet is already unlocked)
        const pin = sessionPin || '';
        if (!pin) {
            console.error('[Rename] No session PIN available');
            showError('Session expired. Please unlock wallet again.');
            return;
        }

        console.log('[Rename] Saving new wallet name', { walletId: renameWalletId, newName });

        // Rename wallet
        const response = await ExtensionMessaging.renameWallet(renameWalletId, newName, pin);
        console.log('?? [Rename] Background response received', { success: response.success, error: response.error });

        if (response.success) {
            showSuccess('Wallet renamed successfully!');

            // Clear rename state
            renameWalletId = null;
            renameWalletCurrentName = null;

            // Hide rename interface
            hideRenameInterface();

            // Reload wallet list in management interface
            await loadWalletManagementList();

            // Update main interface if this is the active wallet
            await initializeMultiWalletUI();
        } else {
            if (errorEl) {
                errorEl.textContent = response.error || 'Failed to rename wallet';
                errorEl.classList.remove('hidden');
            }
        }
    } catch (error) {
        console.error('[Rename] Save failed:', error);
        const errorEl = document.getElementById('rename-error-message');
        if (errorEl) {
            errorEl.textContent = 'Failed to rename wallet';
            errorEl.classList.remove('hidden');
        }
    } finally {
        // CRITICAL FIX: Always reset the save lock, even on error
        isRenameSaving = false;
        console.log('🔓 [Rename] Unlocking save operation');
    }
}

/**
 * Hide rename interface and return to wallet management
 */
function hideRenameInterface(): void {
    console.log('[Rename] Hiding rename interface');

    // Hide rename interface
    const renameInterface = document.getElementById('rename-wallet-interface');
    if (renameInterface) {
        renameInterface.classList.add('hidden');
    }

    // Show wallet management interface
    const managementInterface = document.getElementById('wallet-management-interface');
    if (managementInterface) {
        managementInterface.classList.remove('hidden');
    }

    // Clear rename state
    renameWalletId = null;
    renameWalletCurrentName = null;
}

/**
 * Handle delete wallet action
 */
async function handleDeleteWallet(walletId: string): Promise<void> {
    try {
        console.log(`[Wallet Management] Deleting wallet ${walletId}`);

        // Confirm deletion
        const confirmed = confirm('Are you sure you want to delete this wallet? This action cannot be undone. Make sure you have backed up your recovery phrase!');
        if (!confirmed) return;

        // Get PIN
        const pin = await showPINModal('Enter your PIN to delete wallet');
        if (!pin) return;

        // Delete wallet
        const response = await ExtensionMessaging.deleteWallet(walletId, pin);
        if (response.success) {
            showSuccess('Wallet deleted successfully!');

            // Reload wallet list
            await loadWalletManagementList();

            // Update main interface
            await initializeMultiWalletUI();
        } else {
            showError(response.error || 'Failed to delete wallet');
        }
    } catch (error) {
        console.error('[Wallet Management] Delete failed:', error);
        showError('Failed to delete wallet');
    }
}

// ========================================
// End Multi-Wallet UI Functions & Modal System
// ========================================

function showUnlockPrompt() {
    console.log('🔵 [Unlock] showUnlockPrompt ENTRY');

    // CRITICAL FIX: DO NOT destroy the DOM with innerHTML = ''
    // Instead, use the existing #unlock-interface from popup.html

    const wizard = document.getElementById('onboarding-wizard');
    const mainInterface = document.getElementById('main-interface');
    const unlockInterface = document.getElementById('unlock-interface');

    // Hide wizard and main interface
    if (wizard) {
        console.log('[Wizard] Hiding wizard (unlock interface) - isAddingWallet:', isAddingWallet);
        wizard.classList.add('hidden');
        console.log('🔍 [Unlock] Hidden onboarding-wizard');
    }
    if (mainInterface) {
        mainInterface.classList.add('hidden');
        console.log('🔍 [Unlock] Hidden main-interface');
    }

    // Show unlock interface (from popup.html lines 195-205)
    if (unlockInterface) {
        unlockInterface.classList.remove('hidden');
        console.log('✅ [Unlock] Showing unlock-interface from popup.html');
    } else {
        console.error('❌ [Unlock] unlock-interface not found in popup.html!');
        return;
    }

    // Get elements from popup.html unlock interface
    const pinInput = document.getElementById('unlock-pin') as HTMLInputElement;
    const unlockBtn = document.getElementById('unlock-btn') as HTMLButtonElement;
    const unlockError = document.getElementById('unlock-error');

    if (!pinInput || !unlockBtn) {
        console.error('❌ [Unlock] Unlock form elements not found!');
        return;
    }

    console.log('✅ [Unlock] Unlock form elements found, setting up listeners');

    // CRITICAL FIX: Clear PIN input and reset button state
    pinInput.value = '';
    pinInput.focus();
    unlockBtn.disabled = false;
    unlockBtn.textContent = 'Unlock';
    if (unlockError) {
        unlockError.classList.add('hidden');
        unlockError.textContent = '';
    }
    console.log('🔄 [Unlock] Reset input field, button state, and error message');

    // CRITICAL FIX: Remove old event handlers by cloning and replacing element
    const newUnlockBtn = unlockBtn.cloneNode(true) as HTMLButtonElement;
    unlockBtn.parentNode?.replaceChild(newUnlockBtn, unlockBtn);
    console.log('🔄 [Unlock] Replaced unlock button to remove duplicate handlers');

    // Set up unlock button listener on the NEW element
    newUnlockBtn.onclick = async () => {
        const pin = pinInput.value;
        console.log('🔑 [Unlock] PIN ENTERED:', {
            pinLength: pin.length,
            pinValue: pin,
            timestamp: new Date().toISOString()
        });

        if (!pin || pin.length < 4) {
            showError('Please enter your PIN');
            if (unlockError) {
                unlockError.textContent = 'Please enter your PIN';
                unlockError.classList.remove('hidden');
            }
            return;
        }

        try {
            newUnlockBtn.disabled = true;
            newUnlockBtn.textContent = 'Unlocking...';
            if (unlockError) unlockError.classList.add('hidden');

            console.log('🔵 [Popup] Starting unlock process...');
            console.log('🔍 [Unlock] isWalletUnlocked BEFORE unlock:', isWalletUnlocked);

            // Check if migration from single-wallet to multi-wallet is needed
            const storage = new ChromeStorageManager();
            if (await storage.needsMigration()) {
                console.log('🔄 [Unlock] Migrating single wallet to multi-wallet format...');
                await storage.migrateToMultiWallet(pin);
                console.log('✅ [Unlock] Migration complete');
            }

            // Load and decrypt wallet data from storage
            const walletDataResponse = await ExtensionMessaging.loadWallet(pin);
            console.log('🔍 [Unlock] Response received:', {
                success: walletDataResponse.success,
                hasData: !!walletDataResponse.data,
                hasError: !!walletDataResponse.error
            });

            if (!walletDataResponse.success || !walletDataResponse.data) {
                const errorMsg = walletDataResponse.error || 'Invalid PIN';
                showError(errorMsg);
                if (unlockError) {
                    unlockError.textContent = errorMsg;
                    unlockError.classList.remove('hidden');
                }
                newUnlockBtn.disabled = false;
                newUnlockBtn.textContent = 'Unlock';
                return;
            }

            console.log('✅ [Popup] Wallet data decrypted successfully');

            // Update storage to mark wallet as unlocked (storage-only operation)
            await chrome.storage.local.set({
                isUnlocked: true,
                lastActivity: Date.now()
            });

            console.log('🔍 [Popup] Connecting to Breez SDK in popup...');

            // Connect Breez SDK in POPUP context (not background)
            const mnemonic = walletDataResponse.data.mnemonic;
            if (!mnemonic) {
                throw new Error('No mnemonic found in wallet data');
            }

            // Disconnect any existing SDK instance to clear IndexedDB cache
            // This prevents reading stale data from previous wallet sessions
            if (breezSDK) {
                console.log('🔌 [Unlock] Disconnecting existing SDK to clear cache');
                await breezSDK.disconnect();
                breezSDK = null;
                console.log('✅ [Unlock] SDK disconnected successfully');
            }

            // Initialize SDK connection in popup
            console.log('🔌 [Unlock] Connecting SDK to active wallet');
            breezSDK = await connectBreezSDK(mnemonic);
            isWalletUnlocked = true;
            console.log('✅ [Unlock] SDK connected successfully');

            // Store PIN in session for wallet switching
            sessionPin = pin;
            console.log('🔐 [Session] PIN stored in session memory');

            console.log('✅ [Popup] Wallet unlocked and SDK connected');
            console.log('🔍 [Unlock] isWalletUnlocked AFTER unlock:', isWalletUnlocked);

            // Hide unlock interface, show main interface
            console.log('🔍 [Unlock] Hiding unlock interface, showing main...');
            if (unlockInterface) {
                unlockInterface.classList.add('hidden');
            }

            // Restore the main interface
            restoreMainInterface();

            // Update balance display
            showSuccess('Wallet unlocked successfully!');
            await updateBalanceDisplay();

            // Show loading states while waiting for sync to complete
            const balanceLoading = document.getElementById('balance-loading');
            if (balanceLoading) {
                balanceLoading.classList.remove('hidden');
                console.log('🔄 [Unlock] Showing balance loading indicator');
            }

            const transactionList = document.getElementById('transaction-list');
            if (transactionList) {
                transactionList.innerHTML = '<div class="no-transactions">⏳ Loading transaction history...</div>';
                console.log('🔄 [Unlock] Showing transaction loading text');
            }

            // Transaction history will load automatically when SDK sync completes (via event listener)
            showInfo('Syncing wallet data...');
            console.log('⏳ [Unlock] Waiting for SDK sync to complete before loading transactions');

            // Enable wallet controls
            enableWalletControls();

            // Initialize multi-wallet UI if multiple wallets exist
            await initializeMultiWalletUI();

            // Start background alarm for auto-lock
            console.log('🔔 [Unlock] Starting background auto-lock alarm');
            await chrome.runtime.sendMessage({ type: 'START_AUTO_LOCK_ALARM' });

            // Update activity timestamp
            await chrome.storage.local.set({ lastActivity: Date.now() });

        } catch (error) {
            console.error('❌ [Popup] Unlock failed:', error);
            const errorMsg = error instanceof Error ? error.message : 'Failed to unlock wallet';
            showError(errorMsg);
            if (unlockError) {
                unlockError.textContent = errorMsg;
                unlockError.classList.remove('hidden');
            }
            newUnlockBtn.disabled = false;
            newUnlockBtn.textContent = 'Unlock';
            // Clear PIN input on error
            pinInput.value = '';
            pinInput.focus();
        }
    };

    // Allow Enter key to unlock
    pinInput.onkeypress = (e) => {
        if (e.key === 'Enter') {
            newUnlockBtn.click();
        }
    };

    // Add forgot PIN link handler
    const forgotPinLink = document.getElementById('forgot-pin-link');
    if (forgotPinLink) {
        forgotPinLink.onclick = (e) => {
            e.preventDefault();
            showForgotPinModal();
        };
    }
}

// Show Forgot PIN Modal
function showForgotPinModal() {
    console.log('[Wallet] Forgot PIN modal opened');

    // Remove any existing forgot-pin modal (prevents duplicate IDs)
    const existingModal = document.getElementById('forgot-pin-modal');
    if (existingModal) {
        existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'forgot-pin-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        box-sizing: border-box;
    `;

    modal.innerHTML = `
        <div style="
            background: white;
            border-radius: 8px;
            max-width: 350px;
            width: 100%;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        ">
            <div style="
                padding: 20px;
                border-bottom: 1px solid #eee;
            ">
                <h3 style="margin: 0; font-size: 18px; color: #333;">⚠️ Reset Wallet</h3>
            </div>

            <div style="padding: 20px;">
                <div style="
                    background: #fff3cd;
                    border: 1px solid #ffeaa7;
                    border-radius: 6px;
                    padding: 12px;
                    margin-bottom: 16px;
                ">
                    <p style="margin: 0 0 8px 0; font-weight: 600; color: #856404; font-size: 14px;">
                        ⚠️ Warning: This action cannot be undone!
                    </p>
                    <p style="margin: 0; font-size: 13px; color: #856404; line-height: 1.4;">
                        This will <strong>DELETE your current wallet permanently</strong>, including all funds.
                    </p>
                </div>

                <p style="margin: 0 0 16px 0; font-size: 14px; color: #666; line-height: 1.5;">
                    You'll need your <strong>12-word recovery phrase</strong> to restore access to your funds.
                </p>

                <p style="margin: 0; font-size: 13px; color: #999; line-height: 1.4;">
                    If you don't have your recovery phrase backed up, your funds will be permanently lost.
                </p>
            </div>

            <div style="
                display: flex;
                gap: 12px;
                padding: 16px 20px;
                border-top: 1px solid #eee;
            ">
                <button id="cancel-reset-btn" style="
                    flex: 1;
                    padding: 10px 16px;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    background: white;
                    color: #333;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                ">Cancel</button>
                <button id="confirm-reset-btn" style="
                    flex: 1;
                    padding: 10px 16px;
                    border: none;
                    border-radius: 6px;
                    background: #dc3545;
                    color: white;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                ">Delete Wallet & Start Over</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const cancelBtn = document.getElementById('cancel-reset-btn');
    const confirmBtn = document.getElementById('confirm-reset-btn');

    // Cancel button handler
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            console.log('[Wallet] Reset cancelled');
            modal.remove();
        });
    }

    // Confirm reset button handler
    if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
            console.log('[Wallet] Reset confirmed - deleting wallet...');
            await handleWalletReset(modal);
        });
    }

    // Close modal on overlay click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            console.log('[Wallet] Reset cancelled (overlay click)');
            modal.remove();
        }
    });
}

// Handle Wallet Reset
async function handleWalletReset(modal: HTMLElement) {
    try {
        const confirmBtn = document.getElementById('confirm-reset-btn') as HTMLButtonElement;

        if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Deleting...';
        }

        console.log('[Wallet] Clearing chrome.storage.local...');

        // Disconnect SDK if connected
        if (breezSDK) {
            try {
                await breezSDK.disconnect();
                console.log('[Wallet] SDK disconnected');
            } catch (error) {
                console.error('[Wallet] Error disconnecting SDK:', error);
            }
            breezSDK = null;
        }

        // Clear ALL storage (wallet data, settings, everything)
        await chrome.storage.local.clear();
        console.log('✅ [Wallet] Storage cleared successfully');

        // Reset state
        isWalletUnlocked = false;
        currentBalance = 0;
        generatedMnemonic = '';
        mnemonicWords = [];
        selectedWords = [];
        userPin = '';

        // Remove modal
        modal.remove();

        // Show success notification
        showNotification('Wallet deleted. Set up a new wallet or import existing one.', 'info', 5000);

        console.log('[Wallet] Redirecting to setup wizard...');

        // Hide unlock interface and show wizard (don't destroy DOM)
        const unlockInterface = document.getElementById('unlock-interface');
        if (unlockInterface) {
            unlockInterface.classList.add('hidden');
        }

        // Re-initialize to show setup prompt (wizard still exists in DOM)
        showWalletSetupPrompt();

    } catch (error) {
        console.error('❌ [Wallet] Reset failed:', error);
        showError(error instanceof Error ? error.message : 'Failed to reset wallet');

        const confirmBtn = document.getElementById('confirm-reset-btn') as HTMLButtonElement;
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Delete Wallet & Start Over';
        }
    }
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
            const pin = await showPinInputDialog('Enter your PIN to reconnect:');
            if (!pin) return;

            const unlockResponse = await ExtensionMessaging.unlockWallet(pin);
            if (unlockResponse.success) {
                reconnectDiv.remove();
                isWalletUnlocked = true;

                // Restore the main interface
                restoreMainInterface();
                await updateBalanceDisplay();

                // Enable wallet controls after reconnect
                enableWalletControls();
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
    console.log('🔵 [Restore] Restoring main interface...');

    // IMPORTANT: Instead of recreating HTML, toggle visibility of existing elements
    // This preserves all styles, event listeners, and proper structure

    const wizard = document.getElementById('onboarding-wizard');
    const mainInterface = document.getElementById('main-interface');

    if (wizard && mainInterface) {
        // Hide wizard, show main interface
        console.log('[Wizard] Hiding wizard (restore interface) - isAddingWallet:', isAddingWallet);
        wizard.classList.add('hidden');
        mainInterface.classList.remove('hidden');

        console.log('✅ [Restore] Main interface visibility restored');

        // Event listeners already setup on DOMContentLoaded - no need to re-setup
        // setupEventListeners() was causing duplicate event listener registration
    } else {
        // Fallback: If elements don't exist, reload the page
        console.warn('⚠️ [Restore] Main interface elements not found - reloading popup');
        window.location.reload();
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

function showNotification(message: string, type: 'info' | 'success' | 'error', duration = 4000) {
    console.log(`[${type.toUpperCase()}] ${message}`);

    const container = document.getElementById('notification-container');
    if (!container) {
        // Fallback to console if container not found
        console.warn('Notification container not found, message:', message);
        return;
    }

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    container.appendChild(notification);

    // Auto-remove after duration
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => notification.remove(), 300);
    }, duration);
}

function showError(message: string) {
    showNotification(message, 'error', 5000); // Errors stay longer
}

function showSuccess(message: string) {
    showNotification(message, 'success', 3000);
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
    showNotification(message, 'info', 3000);
}

function showPinInputDialog(message: string): Promise<string | null> {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center;';

        const dialog = document.createElement('div');
        dialog.style.cssText = 'background: white; padding: 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); max-width: 300px; width: 90%;';

        dialog.innerHTML = `
            <h3 style="margin: 0 0 16px 0; color: #333;">${message}</h3>
            <input type="password" id="pin-dialog-input" placeholder="Enter PIN" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 16px; box-sizing: border-box;">
            <div style="display: flex; gap: 8px; justify-content: flex-end;">
                <button id="pin-dialog-cancel" style="padding: 8px 16px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">Cancel</button>
                <button id="pin-dialog-ok" style="padding: 8px 16px; border: none; background: #f7931a; color: white; border-radius: 4px; cursor: pointer;">OK</button>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        const input = document.getElementById('pin-dialog-input') as HTMLInputElement;
        const okBtn = document.getElementById('pin-dialog-ok');
        const cancelBtn = document.getElementById('pin-dialog-cancel');

        input.focus();

        const cleanup = (value: string | null) => {
            overlay.remove();
            resolve(value);
        };

        okBtn?.addEventListener('click', () => cleanup(input.value));
        cancelBtn?.addEventListener('click', () => cleanup(null));
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') cleanup(input.value);
        });
    });
}

function showConfirmDialog(title: string, message: string): Promise<boolean> {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        // Z-index 10001 to appear above withdraw modal (z-index 10000)
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10001; display: flex; align-items: center; justify-content: center;';

        const dialog = document.createElement('div');
        dialog.style.cssText = 'background: white; padding: 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); max-width: 350px; width: 90%;';

        dialog.innerHTML = `
            <h3 style="margin: 0 0 12px 0; color: #333;">${title}</h3>
            <p style="margin: 0 0 20px 0; color: #666; font-size: 14px;">${message}</p>
            <div style="display: flex; gap: 8px; justify-content: flex-end;">
                <button id="confirm-dialog-no" style="padding: 8px 16px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">Cancel</button>
                <button id="confirm-dialog-yes" style="padding: 8px 16px; border: none; background: #f7931a; color: white; border-radius: 4px; cursor: pointer;">Confirm</button>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // Query buttons from the dialog element (not document) to avoid race condition
        const yesBtn = dialog.querySelector('#confirm-dialog-yes') as HTMLButtonElement;
        const noBtn = dialog.querySelector('#confirm-dialog-no') as HTMLButtonElement;

        console.log('🔍 [Dialog] Buttons attached:', { yesBtn: !!yesBtn, noBtn: !!noBtn });

        const cleanup = (value: boolean) => {
            console.log('🔵 [Dialog] Cleanup called with:', value);
            overlay.remove();
            resolve(value);
        };

        if (yesBtn && noBtn) {
            yesBtn.addEventListener('click', () => cleanup(true));
            noBtn.addEventListener('click', () => cleanup(false));
            console.log('✅ [Dialog] Event listeners attached successfully');
        } else {
            console.error('❌ [Dialog] Failed to attach event listeners - buttons not found');
        }
    });
}

// Enhanced Deposit Interface
function showDepositInterface() {
    const modal = createModal('deposit-modal', 'Deposit Funds');
    modal.className = 'modal-overlay';

    modal.innerHTML = `
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
        showDepositStep('invoice-step');
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

    // Log for debugging
    console.log('🔍 [Popup] Invoice generation request completed', {
        timestamp: new Date().toISOString()
    });
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
        // Use popup's breezSDK directly instead of routing through background
        if (!breezSDK) {
            console.warn('SDK not connected during payment check');
            return;
        }

        console.log('🔍 [Popup] Checking payment status...');

        // Get all payments from SDK
        // CRITICAL: listPayments() returns a ListPaymentsResponse object with a .payments array property
        // NOT a plain array! We need to access response.payments
        const response = await breezSDK.listPayments({});
        const payments = response?.payments || [];

        console.log(`🔍 [Popup] Found ${payments.length} payments`, {
            responseType: typeof response,
            hasPaymentsProperty: response && 'payments' in response,
            paymentsCount: payments.length,
            firstPayment: payments[0] || null
        });

        // Find payment matching this invoice
        const matchingPayment = payments.find((p: any) => {
            // CRITICAL: Breez SDK Spark returns 'receive' (without 'd'), NOT 'received'
            // Payment types from SDK: 'receive' for incoming, 'send' for outgoing
            if (p.paymentType !== 'receive') return false;

            // Match by invoice string
            const paymentInvoice = p.details?.bolt11 || p.details?.invoice || '';
            return paymentInvoice.includes(invoice.substring(0, 30));
        });

        if (matchingPayment) {
            console.log('✅ [Popup] Payment received!', matchingPayment);

            // Update UI
            // CRITICAL: SDK uses 'amount' property, NOT 'amountSats'
            const amountSats = matchingPayment.amount || matchingPayment.amountSats || 0;
            showSuccess(`Received ${amountSats.toLocaleString()} sats!`);

            // Stop monitoring
            if (paymentMonitoringInterval) {
                clearInterval(paymentMonitoringInterval);
                paymentMonitoringInterval = null;
            }

            // Refresh balance
            await updateBalanceDisplay();

            // Refresh transaction history
            await loadTransactionHistory();

            // Close deposit modal
            const modal = document.getElementById('deposit-modal');
            if (modal) modal.remove();
        }
    } catch (error) {
        console.error('❌ [Popup] Payment status check error:', error);
        // Don't show error to user - this is background polling
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

    // Refresh wallet data - query SDK for fresh balance
    updateBalanceDisplay();
    
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
    modal.className = 'modal-overlay';

    modal.innerHTML = `
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
        sendBtn.addEventListener('click', () => {
            console.log('🟢 [Withdraw] Send button CLICKED', { timestamp: new Date().toISOString() });
            sendPayment();
        });
        console.log('✅ [Withdraw] Send button event listener attached');
    } else {
        console.error('❌ [Withdraw] Send button not found - event listener NOT attached');
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
        // CRITICAL: Verify SDK is available (WASM must be in popup context)
        if (!breezSDK) {
            showError('Wallet not connected. Please unlock wallet first.');
            return;
        }

        previewBtn.disabled = true;
        previewBtn.textContent = 'Analyzing...';

        const input = paymentInput.value.trim();
        const amount = amountInput ? parseInt(amountInput.value) || 0 : 0;

        console.log('🔍 [Withdraw] Analyzing input:', { input: input.substring(0, 50), inputType: input.startsWith('lnbc') ? 'bolt11' : 'lnurl/address' });

        // Breez SDK Spark API - Different methods for different input types:
        // - BOLT11 invoices: prepareSendPayment()
        // - LNURL/Lightning addresses: parse()

        const isInvoice = input.toLowerCase().startsWith('lnbc') || input.toLowerCase().startsWith('lntb');

        if (isInvoice) {
            // For BOLT11 invoices, use prepareSendPayment to get payment details
            console.log('🔍 [Withdraw] Using prepareSendPayment for BOLT11 invoice');
            preparedPayment = await breezSDK.prepareSendPayment({
                paymentRequest: input,
                amountSats: amount > 0 ? amount : undefined
            });

            console.log('✅ [Withdraw] Payment prepared:', preparedPayment);

            // Extract preview data from prepare response
            // Breez SDK Spark returns: { amountSats, paymentMethod: { lightningFeeSats, ... } }
            const previewData = {
                recipient: 'Lightning Payment',
                amount: preparedPayment.amountSats || amount || 0,
                fee: preparedPayment.paymentMethod?.lightningFeeSats || 0,
                type: 'bolt11',
                prepareResponse: preparedPayment // Keep for sending
            };

            displayPaymentPreview(previewData);
        } else {
            // For LNURL/Lightning addresses, use parseLnurl() instead of parse()
            // Convert Lightning address to LNURL if needed
            let lnurlInput = input;
            if (input.includes('@') && !input.toLowerCase().startsWith('lnurl')) {
                // Lightning address format: user@domain.com
                // Convert to LNURL: https://domain/.well-known/lnurlp/user
                const [username, domain] = input.split('@');
                lnurlInput = `https://${domain}/.well-known/lnurlp/${username}`;
                console.log(`[Withdraw] Converted Lightning address to LNURL: ${lnurlInput}`);
            }

            // Parse the LNURL to get payment request details
            console.log(`[Withdraw] Parsing LNURL: ${lnurlInput}`);
            const parsed = await parseInput(lnurlInput);
            console.log('[Withdraw] Parsed LNURL result:', parsed);

            // parse() returns InputType union - check for lnurlPay or lightningAddress
            if (parsed.type !== 'lnurlPay' && parsed.type !== 'lightningAddress') {
                throw new Error(`Unsupported input type: ${parsed.type}. Expected LNURL pay request or Lightning address.`);
            }

            // Extract payment request details from the parsed result
            const payRequest = parsed.type === 'lightningAddress' ? parsed.payRequest : parsed;

            // Validate amount is provided
            if (!amount || amount <= 0) {
                throw new Error('Amount is required for Lightning addresses and LNURL payments');
            }

            // Validate amount is within sendable range (amounts are in msat, convert to sats)
            const minSendableSats = Math.ceil((payRequest.minSendable || 0) / 1000);
            const maxSendableSats = Math.floor((payRequest.maxSendable || Number.MAX_SAFE_INTEGER) / 1000);

            console.log(`[Withdraw] LNURL amount range: ${minSendableSats}-${maxSendableSats} sats`);

            if (amount < minSendableSats) {
                throw new Error(`Amount must be at least ${minSendableSats} sats`);
            }
            if (amount > maxSendableSats) {
                throw new Error(`Amount cannot exceed ${maxSendableSats} sats`);
            }

            // Get comment if provided
            const commentInput = document.getElementById('withdrawal-comment') as HTMLInputElement;
            const comment = commentInput?.value?.trim() || undefined;

            // Prepare the LNURL payment
            console.log('[Withdraw] Preparing LNURL payment with prepareLnurlPay');
            const prepareResponse = await breezSDK.prepareLnurlPay({
                amountSats: amount,
                payRequest: payRequest,
                comment: comment,
                validateSuccessActionUrl: true
            });

            console.log('[Withdraw] LNURL payment prepared:', prepareResponse);

            // Store prepared response for sending
            preparedPayment = prepareResponse;

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
    console.log('🔵 [Withdraw] sendPayment() ENTRY', { timestamp: new Date().toISOString() });

    const paymentInput = document.getElementById('payment-input') as HTMLTextAreaElement;
    const amountInput = document.getElementById('withdrawal-amount') as HTMLInputElement;
    const commentInput = document.getElementById('withdrawal-comment') as HTMLInputElement;
    const sendBtn = document.getElementById('send-payment-btn') as HTMLButtonElement;
    const statusDiv = document.getElementById('withdrawal-status');
    const statusText = document.getElementById('withdrawal-status-text');

    console.log('🔍 [Withdraw] Elements check:', {
        hasPaymentInput: !!paymentInput,
        hasSendBtn: !!sendBtn,
        hasStatusDiv: !!statusDiv,
        hasStatusText: !!statusText
    });

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

        console.log('🔵 [Withdraw] Sending payment via SDK...', { hasPrepareResponse: !!preparedPayment });

        // Check payment type and route to appropriate SDK method
        // LNURL payments have feeSats property, BOLT11 have paymentMethod property
        const isLnurlPayment = preparedPayment && 'feeSats' in preparedPayment && !('paymentMethod' in preparedPayment);

        if (isLnurlPayment) {
            // LNURL payment flow - use lnurlPay()
            console.log('🔵 [Withdraw] Executing LNURL payment');
            const result = await breezSDK.lnurlPay({
                prepareResponse: preparedPayment
            });

            console.log('✅ [Withdraw] LNURL payment sent successfully', result);

            // Log fee breakdown for transparency
            const feeAmount = preparedPayment.feeSats || 0;
            const paymentAmount = preparedPayment.amountSats || 0;
            const totalDeducted = paymentAmount + feeAmount;
            console.log(`💰 [Withdraw] Payment breakdown: ${paymentAmount} sats sent + ${feeAmount} sats fee = ${totalDeducted} sats total deducted from balance`);

            // Handle success action if present
            if (result.successAction) {
                console.log('🎉 [Withdraw] Success action:', result.successAction);
            }
        } else {
            // BOLT11 invoice payment flow - use sendPayment()
            console.log('🔵 [Withdraw] Executing BOLT11 payment');
            await breezSDK.sendPayment({
                prepareResponse: preparedPayment
            });

            console.log('✅ [Withdraw] Payment sent successfully');

            // Log fee breakdown for transparency
            const feeAmount = preparedPayment?.paymentMethod?.lightningFeeSats || 0;
            const paymentAmount = preparedPayment?.amountSats || 0;
            const totalDeducted = paymentAmount + feeAmount;
            console.log(`💰 [Withdraw] Payment breakdown: ${paymentAmount} sats sent + ${feeAmount} sats fee = ${totalDeducted} sats total deducted from balance`);
        }

        // Clear prepared payment
        preparedPayment = null;

        if (statusText) {
            statusText.textContent = '✅ Payment sent successfully!';
            statusText.className = 'status-indicator success';
        }

        showSuccess('Payment sent successfully!');

        // Refresh balance
        await updateBalanceDisplay();

        // Refresh transaction history to show the new withdraw transaction
        await loadTransactionHistory();

        // Auto-close modal after 3 seconds
        setTimeout(() => {
            const modal = document.getElementById('withdrawal-modal');
            if (modal) {
                modal.remove();
            }
        }, 3000);

    } catch (error) {
        console.error('❌ [Popup] Send payment error:', error);
        if (statusText) {
            statusText.textContent = `❌ ${error instanceof Error ? error.message : 'Payment failed'}`;
            statusText.className = 'status-indicator error';
        }
        showError(error instanceof Error ? error.message : 'Failed to send payment');
    } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send Payment';
    }
}

// Update activity timestamp for auto-lock
// Background worker will check this timestamp periodically via chrome.alarms
function updateActivityTimestamp() {
    chrome.storage.local.set({ lastActivity: Date.now() });
}

async function lockWallet() {
    // Get call stack to see WHO called lockWallet
    const stack = new Error().stack;
    console.log('🔒 [Lock] LOCK_WALLET CALLED', {
        callStack: stack,
        isWalletUnlocked_before: isWalletUnlocked,
        timestamp: new Date().toISOString()
    });

    // Stop background auto-lock alarm
    console.log('🔕 [Lock] Stopping background auto-lock alarm');
    try {
        await chrome.runtime.sendMessage({ type: 'STOP_AUTO_LOCK_ALARM' });
    } catch (error) {
        console.error('[Lock] Error stopping alarm:', error);
    }

    // Disconnect SDK
    if (breezSDK) {
        try {
            await breezSDK.disconnect();
            console.log('🔍 [Lock] SDK disconnected');
        } catch (error) {
            console.error('[Lock] Error disconnecting SDK:', error);
        }
        breezSDK = null;
    }

    // Update state
    isWalletUnlocked = false;
    console.log('🔍 [Lock] isWalletUnlocked set to FALSE');

    // Update storage
    await chrome.storage.local.set({ isUnlocked: false });
    console.log('🔍 [Lock] Storage updated: isUnlocked = false');

    // Clear sensitive data
    currentBalance = 0;

    // Clear session PIN on lock
    sessionPin = null;
    console.log('🔐 [Session] PIN cleared from session memory');

    // Show lock screen
    showUnlockPrompt();

    showInfo('Wallet locked due to inactivity');

    console.log('✅ [Lock] Wallet locked successfully');
}

// Auto-lock event listeners - update activity timestamp on user interaction
let autoLockController: AbortController | null = null;

function setupAutoLockListeners() {
    // Cleanup old listeners if they exist
    if (autoLockController) {
        autoLockController.abort();
    }

    // Create new controller for this popup instance
    autoLockController = new AbortController();
    const signal = autoLockController.signal;

    // Register listeners to update activity timestamp (background alarm checks it)
    document.addEventListener('click', updateActivityTimestamp, { signal });
    document.addEventListener('keypress', updateActivityTimestamp, { signal });
}

// Call setup once during initialization
setupAutoLockListeners();

// Listen for auto-lock message from background worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'WALLET_LOCKED_AUTO') {
        console.log('🔔 [Popup] Received auto-lock notification from background');
        lockWallet();
        sendResponse({ success: true });
    }
    return true;
});

// Cleanup on popup close
window.addEventListener('beforeunload', () => {
    if (breezSDK) {
        disconnectBreezSDK();
    }
});

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
