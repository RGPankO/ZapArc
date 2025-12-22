// Popup Main Entry Point
// Coordinates all popup modules and handles initialization

// CSS import - required for webpack to bundle the styles
import './popup.css';

// State imports
import {
    breezSDK,
    setBreezSDK,
    isWalletUnlocked,
    setIsWalletUnlocked,
    currentBalance,
    setCurrentBalance,
    generatedMnemonic,
    setGeneratedMnemonic,
    mnemonicWords,
    setMnemonicWords,
    selectedWords,
    setSelectedWords,
    userPin,
    setUserPin,
    sessionPin,
    setSessionPin,
    isAddingWallet,
    setIsAddingWallet,
    isImportingWallet,
    setIsImportingWallet,
    currentWallets,
    setCurrentWallets,
    BIP39_WORDS,
} from './state';

// SDK imports
import { connectBreezSDK, disconnectBreezSDK, setSdkEventCallbacks } from './sdk';

// Notification imports
import { showNotification, showError, showSuccess, showInfo } from './notifications';

// Modal imports
import { setupModalListeners, showPINModal, promptForPIN } from './modals';

// Wallet Management imports
import {
    initializeMultiWalletUI,
    showWalletSwitchingIndicator,
    showWalletManagementInterface,
    hideWalletManagementInterface,
    loadWalletManagementList,
    handleRenameSave,
    hideRenameInterface,
    setWalletManagementCallbacks,
} from './wallet-management';

// Deposit imports
import {
    showDepositInterface,
    hideDepositInterface,
    setDepositCallbacks,
} from './deposit';

// Withdrawal imports
import {
    showWithdrawalInterface,
    hideWithdrawInterface,
    setWithdrawalCallbacks,
} from './withdrawal';

// Utility imports
import { ExtensionMessaging } from '../utils/messaging';
import { ChromeStorageManager } from '../utils/storage';
import * as bip39 from 'bip39';

// Helper to generate mnemonic
function generateMnemonic(): string {
    return bip39.generateMnemonic();
}

// Module callbacks will be setup in setupModuleCallbacks() after functions are defined

// ========================================
// Balance & Transaction Functions
// ========================================

async function updateBalanceDisplay() {
    console.log('🔍 [Popup] Updating balance display...');

    try {
        if (!breezSDK) {
            console.warn('[Popup] SDK not connected - cannot update balance');
            return;
        }

        // Get fresh balance from SDK
        const walletInfo = await breezSDK.getInfo({ ensureSynced: false });
        const balance = walletInfo?.balanceSats || 0;

        console.log('💰 [Popup] Fresh balance from SDK:', balance);

        // Update state
        setCurrentBalance(balance);

        // Update UI
        const balanceElement = document.getElementById('balance');
        if (balanceElement) {
            balanceElement.textContent = `${balance.toLocaleString()} sats`;
        }

        // Also update withdraw balance display if visible
        const withdrawBalanceElement = document.getElementById('withdraw-balance-display');
        if (withdrawBalanceElement) {
            withdrawBalanceElement.textContent = balance.toLocaleString();
        }

        // Cache balance for faster loading next time
        await chrome.storage.local.set({ cachedBalance: balance });

    } catch (error) {
        console.error('❌ [Popup] Error updating balance:', error);
    }
}

async function loadTransactionHistory() {
    console.log('🔍 [Popup] Loading transaction history...');

    const transactionList = document.getElementById('transaction-list');
    if (!transactionList) {
        console.warn('[Popup] Transaction list element not found');
        return;
    }

    try {
        if (!breezSDK) {
            transactionList.innerHTML = '<div class="no-transactions">Wallet not connected</div>';
            return;
        }

        // Get payments from SDK
        const response = await breezSDK.listPayments({});
        const payments = response?.payments || [];

        console.log(`📋 [Popup] Loaded ${payments.length} transactions`);

        if (payments.length === 0) {
            transactionList.innerHTML = '<div class="no-transactions">No transactions yet</div>';
            return;
        }

        // Sort by timestamp (most recent first)
        const sortedPayments = [...payments].sort((a: any, b: any) =>
            (b.timestamp || 0) - (a.timestamp || 0)
        );

        // Render transactions (show up to 10)
        const displayTransactions = sortedPayments.slice(0, 10).map((payment: any) => {
            const isReceive = payment.paymentType === 'receive';
            const amount = payment.amount || payment.amountSats || 0;
            const timestamp = payment.timestamp ? new Date(payment.timestamp * 1000).toLocaleString() : 'Unknown';
            const status = payment.status || 'completed';

            return {
                type: isReceive ? 'receive' : 'send',
                amount,
                timestamp: payment.timestamp * 1000, // Store as milliseconds
                status
            };
        });

        // Cache transactions for faster loading next time (wallet-specific)
        const multiWalletResult = await chrome.storage.local.get(['multiWalletData']);
        let activeWalletId = null;
        
        if (multiWalletResult.multiWalletData) {
            try {
                const multiWalletData = JSON.parse(multiWalletResult.multiWalletData);
                activeWalletId = multiWalletData.activeWalletId;
            } catch (e) {
                console.error('⚠️ [Popup] Failed to parse multiWalletData for caching:', e);
            }
        }
        
        if (activeWalletId) {
            const cacheKey = `cachedTransactions_${activeWalletId}`;
            await chrome.storage.local.set({ [cacheKey]: displayTransactions });
            console.log('💾 [Popup] Cached', displayTransactions.length, 'transactions for wallet:', activeWalletId);
        } else {
            console.warn('⚠️ [Popup] No active wallet ID - skipping transaction cache');
        }

        // Render to UI
        transactionList.innerHTML = displayTransactions.map(tx => {
            const isReceive = tx.type === 'receive';
            const timestamp = new Date(tx.timestamp).toLocaleString();
            
            return `
                <div class="transaction-item ${isReceive ? 'receive' : 'send'}">
                    <div class="transaction-icon">${isReceive ? '⬇️' : '⬆️'}</div>
                    <div class="transaction-details">
                        <div class="transaction-type">${isReceive ? 'Received' : 'Sent'}</div>
                        <div class="transaction-time">${timestamp}</div>
                    </div>
                    <div class="transaction-amount ${isReceive ? 'positive' : 'negative'}">
                        ${isReceive ? '+' : '-'}${tx.amount.toLocaleString()} sats
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('❌ [Popup] Error loading transactions:', error);
        transactionList.innerHTML = '<div class="no-transactions">Error loading transactions</div>';
    }
}

// ========================================
// Wizard Functions (kept in popup.ts as they're complex and state-heavy)
// ========================================

function showWizardStep(stepId: string) {
    console.log(`[Wizard] Showing step: ${stepId}`);

    const steps = [
        'welcome-step',
        'setup-choice-step',
        'create-step',
        'mnemonic-step',
        'confirm-step',
        'import-wallet-step',
        'pin-step',
        'setup-complete-step'
    ];

    steps.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.classList.toggle('hidden', id !== stepId);
        }
    });
}

function setupWizardListeners() {
    console.log('[Wizard] Setting up wizard listeners');

    // Welcome Step
    const startBtn = document.getElementById('start-setup-btn');
    if (startBtn) {
        startBtn.onclick = () => showWizardStep('setup-choice-step');
    }

    // Skip Setup - show QR-only interface for external wallet mode
    const skipSetupBtn = document.getElementById('skip-setup-btn');
    if (skipSetupBtn) {
        skipSetupBtn.onclick = async () => {
            await chrome.storage.local.set({ walletSkipped: true });
            showQROnlyInterface();
        };
    }

    // Setup Choice Step
    const choiceBackBtn = document.getElementById('choice-back-btn');
    const createWalletBtn = document.getElementById('create-new-wallet-btn');
    const importWalletBtn = document.getElementById('import-wallet-btn');

    if (choiceBackBtn) {
        choiceBackBtn.onclick = () => {
            // If adding wallet (already have one), return to main interface
            if (isAddingWallet) {
                const wizard = document.getElementById('onboarding-wizard');
                const mainInterface = document.getElementById('main-interface');
                
                if (wizard) wizard.classList.add('hidden');
                if (mainInterface) mainInterface.classList.remove('hidden');
                
                setIsAddingWallet(false);
            } else {
                // Initial setup - go back to welcome
                showWizardStep('welcome-step');
            }
        };
    }

    if (createWalletBtn) {
        createWalletBtn.onclick = () => {
            handleCreateWallet();
        };
    }

    if (importWalletBtn) {
        importWalletBtn.onclick = () => {
            setIsImportingWallet(true); // Importing, not creating
            initializeImportWallet();
            showWizardStep('import-wallet-step');
        };
    }

    // Mnemonic Step
    const mnemonicBackBtn = document.getElementById('mnemonic-back-btn');
    const copyMnemonicBtn = document.getElementById('copy-mnemonic-btn');
    const mnemonicContinueBtn = document.getElementById('mnemonic-continue-btn');

    if (mnemonicBackBtn) {
        mnemonicBackBtn.onclick = () => showWizardStep('setup-choice-step');
    }

    if (copyMnemonicBtn) {
        copyMnemonicBtn.onclick = async () => {
            if (generatedMnemonic) {
                await navigator.clipboard.writeText(generatedMnemonic);
                showSuccess('Recovery phrase copied to clipboard!');
                copyMnemonicBtn.textContent = '✓ Copied!';
                setTimeout(() => {
                    copyMnemonicBtn.textContent = '📋 Copy to Clipboard';
                }, 2000);
            }
        };
    }

    if (mnemonicContinueBtn) {
        mnemonicContinueBtn.onclick = () => {
            showWizardStep('confirm-step');
            setupWordConfirmation();
        };
    }

    // Confirm Step
    const confirmBackBtn = document.getElementById('confirm-back-btn');
    const confirmContinueBtn = document.getElementById('confirm-continue-btn');

    if (confirmBackBtn) {
        confirmBackBtn.onclick = () => showWizardStep('mnemonic-step');
    }

    if (confirmContinueBtn) {
        confirmContinueBtn.onclick = () => showWizardStep('pin-step');
    }

    // Import Step
    const importBackBtn = document.getElementById('import-back-btn');
    const importConfirmBtn = document.getElementById('import-confirm-btn');

    if (importBackBtn) {
        importBackBtn.onclick = () => showWizardStep('setup-choice-step');
    }

    if (importConfirmBtn) {
        importConfirmBtn.onclick = () => handleImportContinue();
    }

    // PIN Step
    const pinBackBtn = document.getElementById('pin-back-btn');
    const pinContinueBtn = document.getElementById('pin-continue-btn');

    if (pinBackBtn) {
        pinBackBtn.onclick = () => {
            // Go back to appropriate step based on flow
            if (isAddingWallet) {
                showWizardStep('setup-choice-step');
            } else {
                showWizardStep('confirm-step');
            }
        };
    }

    if (pinContinueBtn) {
        pinContinueBtn.onclick = () => handlePinConfirm();
    }

    // PIN Input listeners
    const pinInput = document.getElementById('pin-input') as HTMLInputElement;
    const confirmPinInput = document.getElementById('pin-confirm') as HTMLInputElement;

    if (pinInput) {
        pinInput.oninput = validatePinInputs;
    }
    if (confirmPinInput) {
        confirmPinInput.oninput = validatePinInputs;
    }

    // Completion Step
    const completeSetupBtn = document.getElementById('complete-setup-btn');
    if (completeSetupBtn) {
        completeSetupBtn.onclick = async () => {
            await finalizeWalletSetup();
        };
    }

    // Rename interface buttons
    const renameSaveBtn = document.getElementById('rename-save-btn');
    const renameBackBtn = document.getElementById('rename-back-btn');

    if (renameSaveBtn) {
        renameSaveBtn.onclick = () => handleRenameSave();
    }
    if (renameBackBtn) {
        renameBackBtn.onclick = () => hideRenameInterface();
    }
}

async function handleCreateWallet() {
    console.log('[Wizard] Creating new wallet');

    try {
        // Generate mnemonic
        const mnemonic = generateMnemonic();
        setGeneratedMnemonic(mnemonic);
        setMnemonicWords(mnemonic.split(' '));

        console.log('[Wizard] Mnemonic generated');

        // Display mnemonic
        const mnemonicDisplay = document.getElementById('mnemonic-display');
        if (mnemonicDisplay) {
            mnemonicDisplay.innerHTML = mnemonicWords.map((word, index) => `
                <div class="mnemonic-word">
                    <span class="word-number">${index + 1}.</span> ${word}
                </div>
            `).join('');
        }

        showWizardStep('mnemonic-step');
    } catch (error) {
        console.error('[Wizard] Error creating wallet:', error);
        showError('Failed to generate recovery phrase');
    }
}

// Setup Confirmation Step with Shuffled Words
function setupWordConfirmation() {
    // Reset selected words
    setSelectedWords([]);

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
    const newSelectedWords = [...selectedWords, word];
    setSelectedWords(newSelectedWords);

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
            successMsg.textContent = '✓ Correct! You can continue.';
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
                setupWordConfirmation();
            }, 2000);
        }
    }
}

function validatePinInputs() {
    const pinInput = document.getElementById('pin-input') as HTMLInputElement;
    const confirmPinInput = document.getElementById('pin-confirm') as HTMLInputElement;
    const pinConfirmBtn = document.getElementById('pin-continue-btn') as HTMLButtonElement;
    const pinError = document.getElementById('pin-strength');

    if (!pinInput || !confirmPinInput || !pinConfirmBtn) return;

    const pin = pinInput.value;
    const confirmPin = confirmPinInput.value;

    // Clear previous errors
    if (pinError) pinError.classList.add('hidden');

    // Validate PIN length (6+ digits as per HTML description)
    if (pin.length < 6) {
        pinConfirmBtn.disabled = true;
        if (pinError && pin.length > 0) {
            pinError.textContent = 'PIN must be at least 6 characters';
            pinError.classList.remove('hidden');
        }
        return;
    }

    // Check if PINs match
    if (pin !== confirmPin) {
        pinConfirmBtn.disabled = true;
        if (confirmPin.length >= 6 && pinError) {
            pinError.textContent = 'PINs do not match';
            pinError.classList.remove('hidden');
        }
        return;
    }

    // All valid
    if (pinError) {
        pinError.textContent = '✓ PIN is valid';
        pinError.classList.remove('hidden');
    }
    pinConfirmBtn.disabled = false;
}

async function handlePinConfirm() {
    const pinInput = document.getElementById('pin-input') as HTMLInputElement;
    const pinContinueBtn = document.getElementById('pin-continue-btn') as HTMLButtonElement;

    if (!pinInput) return;

    const pin = pinInput.value;
    setUserPin(pin);

    console.log('[Wizard] PIN set, moving to completion');

    try {
        if (pinContinueBtn) {
            pinContinueBtn.disabled = true;
            pinContinueBtn.textContent = 'Creating wallet...';
        }

        // Determine if we're adding a wallet or creating initial one
        const nickname = isAddingWallet ? `Wallet ${currentWallets.length + 1}` : 'Main Wallet';

        // Import the wallet with the generated/imported mnemonic
        // Note: createWallet generates its own mnemonic, but we already have one
        // from either creation flow (where we generated it) or import flow
        const response = await ExtensionMessaging.importWallet(generatedMnemonic, nickname, pin);

        if (!response.success) {
            throw new Error(response.error || 'Failed to save wallet');
        }

        console.log('[Wizard] Wallet saved successfully');

        showWizardStep('setup-complete-step');
    } catch (error) {
        console.error('[Wizard] Error saving wallet:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to create wallet';
        showError(errorMessage);
        if (pinContinueBtn) {
            pinContinueBtn.disabled = false;
            pinContinueBtn.textContent = 'Create Wallet';
        }
    }
}

async function finalizeWalletSetup() {
    console.log('[Wizard] Finalizing wallet setup');

    const completeSetupBtn = document.getElementById('complete-setup-btn') as HTMLButtonElement;
    if (completeSetupBtn) {
        completeSetupBtn.disabled = true;
        completeSetupBtn.textContent = 'Opening...';
    }

    try {
        // Load and connect wallet
        const walletResponse = await ExtensionMessaging.loadWallet(userPin);

        if (!walletResponse.success || !walletResponse.data) {
            throw new Error(walletResponse.error || 'Failed to load wallet');
        }

        // Connect SDK
        const sdk = await connectBreezSDK(walletResponse.data.mnemonic);
        setBreezSDK(sdk);

        // Store PIN in session
        setSessionPin(userPin);
        await chrome.storage.session.set({ walletSessionPin: userPin });

        // Mark as unlocked
        setIsWalletUnlocked(true);
        await chrome.storage.local.set({ isUnlocked: true, lastActivity: Date.now() });

        // Clear adding wallet flag
        setIsAddingWallet(false);

        // Hide wizard, show main interface
        const wizard = document.getElementById('onboarding-wizard');
        const mainInterface = document.getElementById('main-interface');

        if (wizard) wizard.classList.add('hidden');
        if (mainInterface) mainInterface.classList.remove('hidden');

        // Initialize UI
        await updateBalanceDisplay();
        await initializeMultiWalletUI();

        showSuccess('Wallet setup complete!');

        // Start auto-lock alarm
        await chrome.runtime.sendMessage({ type: 'START_AUTO_LOCK_ALARM' });

    } catch (error) {
        console.error('[Wizard] Error finalizing setup:', error);
        showError('Failed to open wallet');
        if (completeSetupBtn) {
            completeSetupBtn.disabled = false;
            completeSetupBtn.textContent = 'Start Using Wallet';
        }
    }
}


// ========================================
// Import Functions
// ========================================

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
        setupWordAutocomplete(input, document.getElementById('word-suggestions') as HTMLElement);
        setupWordEnterHandler(input, document.getElementById('word-suggestions') as HTMLElement);
        setupWordPasteHandler(input);
    }
}

function setupImportWordInputs() {
    const container = document.getElementById('import-words-container');
    const suggestionsDiv = document.getElementById('word-suggestions');

    if (!container || !suggestionsDiv) return;

    container.innerHTML = '';

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
                data-word-index="${i - 1}"
                placeholder="word ${i}"
            />
        `;
        container.appendChild(wrapper);

        const input = wrapper.querySelector('input') as HTMLInputElement;
        setupWordAutocomplete(input, suggestionsDiv);
        setupWordPasteHandler(input);
        setupWordEnterHandler(input, suggestionsDiv);
    }
}

function setupWordAutocomplete(input: HTMLInputElement, suggestionsDiv: HTMLElement) {
    input.addEventListener('input', () => {
        const value = input.value.toLowerCase().trim();

        if (value.length < 2) {
            suggestionsDiv.style.display = 'none';
            validateWordInput(input);
            checkImportComplete();
            return;
        }

        const matches = BIP39_WORDS.filter(word => word.startsWith(value)).slice(0, 10);

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

        // Position suggestions
        const rect = input.getBoundingClientRect();
        suggestionsDiv.style.display = 'block';
        suggestionsDiv.style.left = rect.left + 'px';
        suggestionsDiv.style.top = (rect.bottom + 4) + 'px';
        suggestionsDiv.style.width = rect.width + 'px';

        validateWordInput(input);
        checkImportComplete();
    });

    // Hide suggestions on blur
    input.addEventListener('blur', () => {
        setTimeout(() => {
            suggestionsDiv.style.display = 'none';
        }, 200);
    });
}

function setupWordEnterHandler(input: HTMLInputElement, suggestionsDiv: HTMLElement) {
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

function setupWordPasteHandler(input: HTMLInputElement) {
    input.addEventListener('paste', (e: ClipboardEvent) => {
        e.preventDefault();

        const pastedText = e.clipboardData?.getData('text');
        if (!pastedText) return;

        console.log('[Import] Paste detected:', pastedText.substring(0, 50));

        const words = pastedText.trim().split(/\s+/).filter(word => word.length > 0);

        if (words.length !== 12) {
            showError(`Invalid paste: Expected 12 words, got ${words.length}`);
            return;
        }

        // Validate words
        const lowerWords = words.map(w => w.toLowerCase());
        const invalidWords = lowerWords.filter(w => !BIP39_WORDS.includes(w));

        if (invalidWords.length > 0) {
            showError(`Invalid words: ${invalidWords.join(', ')}`);
            return;
        }

        // Fill all inputs
        lowerWords.forEach((word, index) => {
            const wordInput = document.getElementById(`import-word-${index + 1}`) as HTMLInputElement;
            if (wordInput) {
                wordInput.value = word;
                validateWordInput(wordInput);
            }
        });

        checkImportComplete();
        showSuccess('Recovery phrase pasted successfully!');
    });
}

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

    if (allValid) {
        setGeneratedMnemonic(allWords.join(' '));
        setMnemonicWords(allWords);
    }
}

function handleImportContinue() {
    showWizardStep('pin-step');
}

// ========================================
// Unlock & Lock Functions
// ========================================

function showUnlockPrompt() {
    console.log('🔵 [Unlock] showUnlockPrompt ENTRY');

    const wizard = document.getElementById('onboarding-wizard');
    const mainInterface = document.getElementById('main-interface');
    const unlockInterface = document.getElementById('unlock-interface');

    if (wizard) wizard.classList.add('hidden');
    if (mainInterface) mainInterface.classList.add('hidden');

    if (unlockInterface) {
        unlockInterface.classList.remove('hidden');
    } else {
        console.error('❌ [Unlock] unlock-interface not found!');
        return;
    }

    const pinInput = document.getElementById('unlock-pin') as HTMLInputElement;
    const unlockBtn = document.getElementById('unlock-btn') as HTMLButtonElement;
    const unlockError = document.getElementById('unlock-error');

    if (!pinInput || !unlockBtn) return;

    // Reset state
    pinInput.value = '';
    pinInput.focus();
    unlockBtn.disabled = false;
    unlockBtn.textContent = 'Unlock';
    if (unlockError) {
        unlockError.classList.add('hidden');
        unlockError.textContent = '';
    }

    // Clone button to remove old listeners
    const newUnlockBtn = unlockBtn.cloneNode(true) as HTMLButtonElement;
    unlockBtn.parentNode?.replaceChild(newUnlockBtn, unlockBtn);

    // Track if unlock is in progress to prevent multiple attempts
    let isUnlocking = false;

    // Core unlock logic - extracted so it can be called from button or auto-unlock
    async function attemptUnlock(pin: string, isAutoAttempt: boolean = false): Promise<boolean> {
        if (isUnlocking) return false;

        if (!pin || pin.length < 4) {
            if (!isAutoAttempt) {
                showError('Please enter your PIN');
                if (unlockError) {
                    unlockError.textContent = 'Please enter your PIN';
                    unlockError.classList.remove('hidden');
                }
            }
            return false;
        }

        try {
            isUnlocking = true;
            newUnlockBtn.disabled = true;
            newUnlockBtn.textContent = 'Unlocking...';
            if (unlockError) unlockError.classList.add('hidden');

            // Check for migration
            const storage = new ChromeStorageManager();
            if (await storage.needsMigration()) {
                console.log('🔄 [Unlock] Migrating to multi-wallet format...');
                await storage.migrateToMultiWallet(pin);
            }

            // Load wallet
            const walletResponse = await ExtensionMessaging.loadWallet(pin);

            if (!walletResponse.success || !walletResponse.data) {
                // Only show error for manual attempts or if PIN looks complete
                if (!isAutoAttempt) {
                    const errorMsg = walletResponse.error || 'Invalid PIN';
                    showError(errorMsg);
                    if (unlockError) {
                        unlockError.textContent = errorMsg;
                        unlockError.classList.remove('hidden');
                    }
                }
                newUnlockBtn.disabled = false;
                newUnlockBtn.textContent = 'Unlock';
                isUnlocking = false;
                return false;
            }

            // Disconnect existing SDK if any
            if (breezSDK) {
                await breezSDK.disconnect();
                setBreezSDK(null);
            }

            // Connect SDK
            const sdk = await connectBreezSDK(walletResponse.data.mnemonic);
            setBreezSDK(sdk);
            setIsWalletUnlocked(true);

            // Store session PIN
            setSessionPin(pin);
            await chrome.storage.session.set({ walletSessionPin: pin });

            // Update storage
            await chrome.storage.local.set({ isUnlocked: true, lastActivity: Date.now() });

            // Hide unlock, show main
            if (unlockInterface) unlockInterface.classList.add('hidden');
            restoreMainInterface();

            // Update UI
            showSuccess('Wallet unlocked!');
            await updateBalanceDisplay();

            // Show loading states
            const balanceLoading = document.getElementById('balance-loading');
            if (balanceLoading) balanceLoading.classList.remove('hidden');

            const transactionList = document.getElementById('transaction-list');
            if (transactionList) {
                transactionList.innerHTML = '<div class="no-transactions">⏳ Loading transaction history...</div>';
            }

            showInfo('Syncing wallet data...');

            enableWalletControls();
            await initializeMultiWalletUI();

            // Start auto-lock
            await chrome.runtime.sendMessage({ type: 'START_AUTO_LOCK_ALARM' });
            await chrome.storage.local.set({ lastActivity: Date.now() });

            isUnlocking = false;
            return true;

        } catch (error) {
            console.error('❌ [Unlock] Failed:', error);
            const errorMsg = error instanceof Error ? error.message : 'Failed to unlock';
            if (!isAutoAttempt) {
                showError(errorMsg);
                if (unlockError) {
                    unlockError.textContent = errorMsg;
                    unlockError.classList.remove('hidden');
                }
            }
            newUnlockBtn.disabled = false;
            newUnlockBtn.textContent = 'Unlock';
            if (!isAutoAttempt) {
                pinInput.value = '';
                pinInput.focus();
            }
            isUnlocking = false;
            return false;
        }
    }

    // Setup button click handler
    newUnlockBtn.onclick = () => attemptUnlock(pinInput.value, false);

    // Enter key to unlock
    pinInput.onkeypress = (e) => {
        if (e.key === 'Enter') attemptUnlock(pinInput.value, false);
    };

    // Auto-unlock: try to unlock when PIN reaches valid length (4+ digits)
    // Uses debounce to avoid attempting on every keystroke
    let autoUnlockTimeout: ReturnType<typeof setTimeout> | null = null;
    pinInput.oninput = () => {
        const pin = pinInput.value;

        // Clear any pending auto-unlock attempt
        if (autoUnlockTimeout) {
            clearTimeout(autoUnlockTimeout);
            autoUnlockTimeout = null;
        }

        // Only attempt auto-unlock if PIN is at least 4 characters
        if (pin.length >= 4) {
            // Small delay to let user finish typing
            autoUnlockTimeout = setTimeout(() => {
                attemptUnlock(pin, true);
            }, 150);
        }
    };

    // Forgot PIN handler
    const forgotPinLink = document.getElementById('forgot-pin-link');
    if (forgotPinLink) {
        forgotPinLink.onclick = (e) => {
            e.preventDefault();
            showForgotPinModal();
        };
    }
}

// ========================================
// QR-Only Interface (External Wallet Mode)
// ========================================

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
            // Reload to show wizard
            window.location.reload();
        });

        document.getElementById('settings-btn-qr')?.addEventListener('click', handleSettings);
    }
}

// ========================================
// Forgot PIN / Reset Wallet
// ========================================

function showForgotPinModal() {
    console.log('[Wallet] Forgot PIN modal opened');

    const existingModal = document.getElementById('forgot-pin-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'forgot-pin-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.7); z-index: 10000;
        display: flex; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box;
    `;

    modal.innerHTML = `
        <div style="background: white; border-radius: 8px; max-width: 350px; width: 100%; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
            <div style="padding: 20px; border-bottom: 1px solid #eee;">
                <h3 style="margin: 0; font-size: 18px; color: #333;">⚠️ Reset Wallet</h3>
            </div>
            <div style="padding: 20px;">
                <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 12px; margin-bottom: 16px;">
                    <p style="margin: 0 0 8px 0; font-weight: 600; color: #856404; font-size: 14px;">⚠️ Warning: This action cannot be undone!</p>
                    <p style="margin: 0; font-size: 13px; color: #856404; line-height: 1.4;">This will <strong>DELETE your current wallet permanently</strong>, including all funds.</p>
                </div>
                <p style="margin: 0 0 16px 0; font-size: 14px; color: #666; line-height: 1.5;">You'll need your <strong>12-word recovery phrase</strong> to restore access.</p>
                <p style="margin: 0; font-size: 13px; color: #999; line-height: 1.4;">Without your recovery phrase, funds will be permanently lost.</p>
            </div>
            <div style="display: flex; gap: 12px; padding: 16px 20px; border-top: 1px solid #eee;">
                <button id="cancel-reset-btn" style="flex: 1; padding: 10px 16px; border: 1px solid #ddd; border-radius: 6px; background: white; color: #333; cursor: pointer; font-size: 14px;">Cancel</button>
                <button id="confirm-reset-btn" style="flex: 1; padding: 10px 16px; border: none; border-radius: 6px; background: #dc3545; color: white; cursor: pointer; font-size: 14px;">Delete Wallet</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('cancel-reset-btn')?.addEventListener('click', () => modal.remove());
    document.getElementById('confirm-reset-btn')?.addEventListener('click', () => handleWalletReset(modal));
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

async function handleWalletReset(modal: HTMLElement) {
    try {
        const confirmBtn = document.getElementById('confirm-reset-btn') as HTMLButtonElement;
        if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Deleting...';
        }

        // Disconnect SDK
        if (breezSDK) {
            try {
                await breezSDK.disconnect();
            } catch (e) { }
            setBreezSDK(null);
        }

        // Clear storage
        await chrome.storage.local.clear();

        // Reset state
        setIsWalletUnlocked(false);
        setCurrentBalance(0);
        setGeneratedMnemonic('');
        setMnemonicWords([]);
        setSelectedWords([]);
        setUserPin('');

        modal.remove();

        showNotification('Wallet deleted. Set up a new wallet.', 'info', 5000);

        // Show wizard
        const unlockInterface = document.getElementById('unlock-interface');
        if (unlockInterface) unlockInterface.classList.add('hidden');

        showWalletSetupPrompt();

    } catch (error) {
        console.error('❌ [Wallet] Reset failed:', error);
        showError('Failed to reset wallet');

        const confirmBtn = document.getElementById('confirm-reset-btn') as HTMLButtonElement;
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Delete Wallet';
        }
    }
}

async function lockWallet() {
    console.log('🔒 [Lock] LOCK_WALLET CALLED');

    // Stop auto-lock alarm
    try {
        await chrome.runtime.sendMessage({ type: 'STOP_AUTO_LOCK_ALARM' });
    } catch (e) { }

    // Disconnect SDK
    if (breezSDK) {
        try {
            await breezSDK.disconnect();
        } catch (e) { }
        setBreezSDK(null);
    }

    // Update state
    setIsWalletUnlocked(false);
    await chrome.storage.local.set({ isUnlocked: false });

    // Clear sensitive data
    setCurrentBalance(0);
    setSessionPin(null);
    await chrome.storage.session.remove('walletSessionPin');

    // Show unlock screen
    showUnlockPrompt();
    showInfo('Wallet locked due to inactivity');
}

// ========================================
// UI Helper Functions
// ========================================

function restoreMainInterface() {
    console.log('🔵 [Restore] Restoring main interface');

    const wizard = document.getElementById('onboarding-wizard');
    const mainInterface = document.getElementById('main-interface');

    if (wizard && mainInterface) {
        wizard.classList.add('hidden');
        mainInterface.classList.remove('hidden');
    } else {
        console.warn('⚠️ [Restore] Elements not found - reloading');
        window.location.reload();
    }
}

function enableWalletControls() {
    const depositBtn = document.getElementById('deposit-btn') as HTMLButtonElement;
    const withdrawBtn = document.getElementById('withdraw-btn') as HTMLButtonElement;

    if (depositBtn) depositBtn.disabled = false;
    if (withdrawBtn) withdrawBtn.disabled = false;
}

function showWalletSetupPrompt() {
    console.log('[Setup] Showing wallet setup prompt');

    const mainInterface = document.getElementById('main-interface');
    const wizard = document.getElementById('onboarding-wizard');
    const unlockInterface = document.getElementById('unlock-interface');

    if (mainInterface) mainInterface.classList.add('hidden');
    if (unlockInterface) unlockInterface.classList.add('hidden');

    if (wizard) {
        wizard.classList.remove('hidden');
        showWizardStep('welcome-step');
        setupWizardListeners();
    }
}

// ========================================
// Event Listeners & Auto-lock
// ========================================

function updateActivityTimestamp() {
    chrome.storage.local.set({ lastActivity: Date.now() });
}

let autoLockController: AbortController | null = null;

function setupAutoLockListeners() {
    if (autoLockController) {
        autoLockController.abort();
    }

    autoLockController = new AbortController();
    const signal = autoLockController.signal;

    document.addEventListener('click', updateActivityTimestamp, { signal });
    document.addEventListener('keypress', updateActivityTimestamp, { signal });
}

setupAutoLockListeners();

// Listen for auto-lock from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'WALLET_LOCKED_AUTO') {
        console.log('🔔 [Popup] Auto-lock notification');
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

// ========================================
// Main Event Listeners Setup
// ========================================

function setupEventListeners() {
    console.log('[Popup] Setting up event listeners');

    // Deposit button
    const depositBtn = document.getElementById('deposit-btn');
    if (depositBtn) {
        depositBtn.onclick = () => showDepositInterface();
    }

    // Withdraw button
    const withdrawBtn = document.getElementById('withdraw-btn');
    if (withdrawBtn) {
        withdrawBtn.onclick = () => showWithdrawalInterface();
    }

    // Settings button
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
        settingsBtn.onclick = handleSettings;
    }

    // Lock button
    const lockBtn = document.getElementById('lock-btn');
    if (lockBtn) {
        lockBtn.onclick = lockWallet;
    }

    // Delete wallet button - shows reset/delete confirmation modal
    const deleteWalletBtn = document.getElementById('delete-wallet-btn');
    if (deleteWalletBtn) {
        deleteWalletBtn.onclick = showForgotPinModal;
    }

    // Modal listeners
    setupModalListeners();
}

function handleSettings() {
    chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
}

// ========================================
// Module Callbacks Setup
// ========================================

function setupModuleCallbacks(): void {
    // Setup SDK event callbacks
    setSdkEventCallbacks({
        onSync: async () => {
            await loadTransactionHistory();
            await updateBalanceDisplay();
        },
        onPaymentReceived: async () => {
            await updateBalanceDisplay();
            await loadTransactionHistory();
        }
    });

    // Setup wallet management callbacks
    setWalletManagementCallbacks({
        updateBalanceDisplay,
        loadTransactionHistory,
        showWizardStep,
        setupWizardListeners,
        showSuccess,
        showError,
        showInfo
    });

    // Setup deposit callbacks
    setDepositCallbacks({
        updateBalanceDisplay,
        loadTransactionHistory
    });

    // Setup withdrawal callbacks
    setWithdrawalCallbacks({
        updateBalanceDisplay,
        loadTransactionHistory
    });
}

// ========================================
// Initialization
// ========================================

async function initializePopup() {
    console.log('🔵 [Popup] Initializing...');

    try {
        // Setup module callbacks first
        setupModuleCallbacks();

        // Setup event listeners
        setupEventListeners();
        setupWizardListeners();

        // Check for existing wallet
        const storageData = await chrome.storage.local.get(['isUnlocked', 'cachedBalance']);
        const hasWallet = await ExtensionMessaging.getAllWallets().then(r => r.success && r.data && r.data.length > 0);

        console.log('[Popup] State:', { hasWallet, isUnlocked: storageData.isUnlocked });

        if (!hasWallet) {
            // No wallet - show setup
            showWalletSetupPrompt();
            return;
        }

        // Has wallet - check if locked
        if (!storageData.isUnlocked) {
            showUnlockPrompt();
            return;
        }

        // Try to auto-reconnect with session PIN
        const sessionData = await chrome.storage.session.get(['walletSessionPin']);
        if (sessionData.walletSessionPin) {
            try {
                console.log('🔐 [Popup] Attempting auto-reconnect...');

                const walletResponse = await ExtensionMessaging.loadWallet(sessionData.walletSessionPin);

                if (walletResponse.success && walletResponse.data) {
                    // Connect SDK
                    const sdk = await connectBreezSDK(walletResponse.data.mnemonic);
                    setBreezSDK(sdk);
                    setIsWalletUnlocked(true);
                    setSessionPin(sessionData.walletSessionPin);

                    // Show main interface
                    restoreMainInterface();

                    // Load cached balance immediately for instant UI
                    const hasCachedBalance = storageData.cachedBalance !== undefined && storageData.cachedBalance !== null;
                    if (hasCachedBalance) {
                        console.log('💾 [Popup] Using cached balance:', storageData.cachedBalance);
                        setCurrentBalance(storageData.cachedBalance);
                        const balanceElement = document.getElementById('balance');
                        if (balanceElement) {
                            balanceElement.textContent = `${storageData.cachedBalance.toLocaleString()} sats`;
                        }
                        
                        // Also update withdraw balance if visible
                        const withdrawBalanceElement = document.getElementById('withdraw-balance-display');
                        if (withdrawBalanceElement) {
                            withdrawBalanceElement.textContent = storageData.cachedBalance.toLocaleString();
                        }
                    } else {
                        console.log('⚠️ [Popup] No cached balance found - will fetch from SDK');
                    }

                    // Only show loading indicator if we don't have cached data
                    const balanceLoading = document.getElementById('balance-loading');
                    if (balanceLoading && !hasCachedBalance) {
                        balanceLoading.classList.remove('hidden');
                    }

                    // Load cached transactions or show loading
                    const transactionList = document.getElementById('transaction-list');
                    if (transactionList) {
                        // Get active wallet ID from multi-wallet data structure
                        const multiWalletResult = await chrome.storage.local.get(['multiWalletData']);
                        let activeWalletId = null;
                        
                        if (multiWalletResult.multiWalletData) {
                            try {
                                const multiWalletData = JSON.parse(multiWalletResult.multiWalletData);
                                activeWalletId = multiWalletData.activeWalletId;
                                console.log('🔍 [Popup] Active wallet ID from multiWalletData:', activeWalletId);
                            } catch (e) {
                                console.error('⚠️ [Popup] Failed to parse multiWalletData:', e);
                            }
                        }
                        
                        // Check if we have cached transactions for this specific wallet
                        let cachedTransactions = null;
                        if (activeWalletId) {
                            const cacheKey = `cachedTransactions_${activeWalletId}`;
                            const cachedTxData = await chrome.storage.local.get([cacheKey]);
                            cachedTransactions = cachedTxData[cacheKey];
                        }
                        
                        if (cachedTransactions && cachedTransactions.length > 0) {
                            console.log('💾 [Popup] Using cached transactions for wallet', activeWalletId, ':', cachedTransactions.length);
                            // Display cached transactions
                            transactionList.innerHTML = cachedTransactions.map((tx: any) => {
                                const isReceive = tx.type === 'receive';
                                const timestamp = new Date(tx.timestamp).toLocaleString();
                                const amount = tx.amount;
                                return `
                                    <div class="transaction-item ${isReceive ? 'receive' : 'send'}">
                                        <div class="transaction-icon">${isReceive ? '⬇️' : '⬆️'}</div>
                                        <div class="transaction-details">
                                            <div class="transaction-type">${isReceive ? 'Received' : 'Sent'}</div>
                                            <div class="transaction-time">${timestamp}</div>
                                        </div>
                                        <div class="transaction-amount ${isReceive ? 'positive' : 'negative'}">
                                            ${isReceive ? '+' : '-'}${amount.toLocaleString()} sats
                                        </div>
                                    </div>
                                `;
                            }).join('');
                        } else {
                            console.log('⚠️ [Popup] No cached transactions for wallet', activeWalletId);
                            transactionList.innerHTML = '<div class="no-transactions">⏳ Loading transactions...</div>';
                        }
                    }

                    enableWalletControls();
                    await initializeMultiWalletUI();

                    // Start auto-lock
                    await chrome.runtime.sendMessage({ type: 'START_AUTO_LOCK_ALARM' });

                    console.log('✅ [Popup] Auto-reconnect successful - SDK will sync in background');
                    return;
                }
            } catch (error) {
                console.error('[Popup] Auto-reconnect failed:', error);
            }
        }

        // Session expired - show unlock
        showUnlockPrompt();

    } catch (error) {
        console.error('❌ [Popup] Initialization error:', error);
        showError('Failed to initialize popup');
    }
}

// Start initialization when DOM is ready
document.addEventListener('DOMContentLoaded', initializePopup);
