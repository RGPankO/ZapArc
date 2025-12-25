// Multi-Wallet Management UI
// Handles wallet selector, switching, rename, delete, and management interface

import { ExtensionMessaging } from '../utils/messaging';
import {
    currentWallets,
    setCurrentWallets,
    isWalletSelectorOpen,
    setIsWalletSelectorOpen,
    sessionPin,
    setSessionPin,
    breezSDK,
    setBreezSDK,
    isWalletUnlocked,
    setIsWalletUnlocked,
    renameWalletId,
    setRenameWalletId,
    renameWalletCurrentName,
    setRenameWalletCurrentName,
    isRenameSaving,
    setIsRenameSaving,
    setIsAddingWallet,
    // Hierarchical wallet state
    masterKeys,
    setMasterKeys,
    activeMasterKeyId,
    setActiveMasterKeyId,
    activeSubWalletIndex,
    setActiveSubWalletIndex,
    isHierarchicalMode,
    setIsHierarchicalMode,
    expandedMasterKeys,
    toggleMasterKeyExpanded as toggleMasterKeyExpandedState
} from './state';
import type { MasterKeyMetadata, SubWalletEntry } from '../types';
import { connectBreezSDK } from './sdk';
import { showError, showSuccess, showInfo } from './notifications';
import { showPINModal, promptForPIN, showModal, hideModal } from './modals';

// Callback type for wallet operations that need main popup functions
export type WalletManagementCallbacks = {
    updateBalanceDisplay: () => Promise<void>;
    loadTransactionHistory: () => Promise<void>;
    showWizardStep: (step: string) => void;
    setupWizardListeners: () => void;
    showSuccess: (message: string) => void;
    showError: (message: string) => void;
    showInfo: (message: string) => void;
};

// Show add wallet flow (sets isAddingWallet and shows wizard)
async function showAddWalletFlow(): Promise<void> {
    console.log('[Wallet Management] Starting add wallet flow');
    setIsAddingWallet(true);

    // Load master keys first so the sub-wallet button can show correctly
    const masterKeysResponse = await ExtensionMessaging.getMasterKeyMetadata();
    if (masterKeysResponse.success && masterKeysResponse.data) {
        setMasterKeys(masterKeysResponse.data);
        console.log(`[Wallet Management] Loaded ${masterKeysResponse.data.length} master key(s) for add wallet flow`);
    }

    // Hide management interface
    hideWalletManagementInterface();

    // Hide main interface, show wizard
    const mainInterface = document.getElementById('main-interface');
    const wizard = document.getElementById('onboarding-wizard');

    if (mainInterface) mainInterface.classList.add('hidden');
    if (wizard) {
        wizard.classList.remove('hidden');
        // Trigger the wizard to show setup-choice-step
        callbacks?.showWizardStep('setup-choice-step');
        callbacks?.setupWizardListeners();
    }
}

let callbacks: WalletManagementCallbacks | null = null;

export function setWalletManagementCallbacks(cb: WalletManagementCallbacks): void {
    callbacks = cb;
}

// ========================================
// Multi-Wallet Selector UI
// ========================================

/**
 * Initialize multi-wallet UI if user has multiple wallets
 */
export async function initializeMultiWalletUI(): Promise<void> {
    try {
        console.log('🔄 [Multi-Wallet] Initializing wallet selector');

        // Get all wallets
        const walletsResponse = await ExtensionMessaging.getAllWallets();
        if (!walletsResponse.success || !walletsResponse.data) {
            console.log('[Multi-Wallet] No wallets found or error');
            return;
        }

        setCurrentWallets(walletsResponse.data);
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
export function updateWalletSelectorUI(): void {
    // Find active wallet
    const activeWallet = currentWallets.find(w => {
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
 * Populate wallet dropdown with hierarchical wallet structure
 * Shows master keys (wallets) with their sub-wallets nested underneath
 */
export async function populateWalletDropdown(): Promise<void> {
    const walletList = document.getElementById('wallet-list');
    if (!walletList) return;

    walletList.innerHTML = '<div class="loading-wallets">Loading...</div>';

    try {
        // Get current active wallet info from storage
        const storageResult = await chrome.storage.local.get(['multiWalletData']);
        if (!storageResult.multiWalletData) {
            walletList.innerHTML = '<div class="no-wallets">No wallets found</div>';
            return;
        }

        const data = JSON.parse(storageResult.multiWalletData);
        const activeWalletId = data.activeWalletId;
        const activeSubWalletIndex = data.activeSubWalletIndex || 0;

        let html = '';

        // Each wallet is a master key
        for (const wallet of currentWallets) {
            const isActiveWallet = wallet.id === activeWalletId;
            const subWallets = (data.wallets?.find((w: any) => w.metadata.id === wallet.id)?.subWallets) || [];
            const hasSubWallets = subWallets.length > 0;
            const createdDate = new Date(wallet.createdAt).toLocaleDateString();

            if (hasSubWallets) {
                // Wallet with sub-wallets - show hierarchical structure
                // Master wallet is clickable at top level (index 0), sub-wallets shown below (index 1+)
                const isMasterActive = isActiveWallet && activeSubWalletIndex === 0;

                html += `
                    <div class="master-key-dropdown-item expanded" data-master-id="${wallet.id}">
                        <div class="master-key-dropdown-header ${isMasterActive ? 'active' : ''}"
                             data-master-id="${wallet.id}" data-sub-index="0">
                            <span class="dropdown-expand-icon">▼</span>
                            <span class="master-key-icon">🔑</span>
                            <div class="master-key-dropdown-info">
                                <div class="master-key-dropdown-name">
                                    ${wallet.nickname}
                                </div>
                                <div class="master-key-dropdown-meta">Last used: ${createdDate}</div>
                            </div>
                        </div>

                        <!-- Sub-wallets only (index 1+), master wallet is at the header level -->
                        ${subWallets.map((sw: any, i: number) => {
                            const isActiveSubWallet = isActiveWallet && sw.index === activeSubWalletIndex;
                            const isLast = i === subWallets.length - 1;
                            return `
                                <div class="sub-wallet-dropdown-item ${isActiveSubWallet ? 'active' : ''}"
                                     data-master-id="${wallet.id}" data-sub-index="${sw.index}">
                                    <span class="sub-wallet-indent">${isLast ? '└──' : '├──'}</span>
                                    <span class="sub-wallet-name">${sw.nickname}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;
            } else {
                // Wallet without sub-wallets - show as simple clickable item (like before)
                html += `
                    <div class="wallet-item ${isActiveWallet ? 'active' : ''}" 
                         data-wallet-id="${wallet.id}" data-master-id="${wallet.id}" data-sub-index="0">
                        <div class="wallet-item-info">
                            <div class="wallet-item-name">${wallet.nickname}</div>
                            <div class="wallet-item-balance">Last used: ${createdDate}</div>
                        </div>
                    </div>
                `;
            }
        }

        walletList.innerHTML = html;
        attachDropdownListeners();
    } catch (error) {
        console.error('[Wallet Management] Error populating dropdown:', error);
        walletList.innerHTML = '<div class="error-wallets">Error loading wallets</div>';
    }
}

/**
 * Attach listeners to hierarchical dropdown items
 */
function attachDropdownListeners(): void {
    // Master wallet header click to switch to master (index 0)
    document.querySelectorAll('.master-key-dropdown-header[data-sub-index="0"]').forEach(header => {
        header.addEventListener('click', async (e) => {
            const target = e.currentTarget as HTMLElement;
            const masterId = target.getAttribute('data-master-id');

            if (masterId) {
                await handleHierarchicalWalletSwitch(masterId, 0);
            }
        });
    });

    // Sub-wallet click to switch
    document.querySelectorAll('.sub-wallet-dropdown-item').forEach(item => {
        item.addEventListener('click', async (e) => {
            const target = e.currentTarget as HTMLElement;
            const masterId = target.getAttribute('data-master-id');
            const subIndex = parseInt(target.getAttribute('data-sub-index') || '0', 10);

            if (masterId) {
                await handleHierarchicalWalletSwitch(masterId, subIndex);
            }
        });
    });

    // Simple wallet item click (wallets without sub-wallets)
    document.querySelectorAll('.wallet-item[data-master-id]').forEach(item => {
        item.addEventListener('click', async (e) => {
            const target = e.currentTarget as HTMLElement;
            const masterId = target.getAttribute('data-master-id');

            if (masterId) {
                await handleHierarchicalWalletSwitch(masterId, 0);
            }
        });
    });
}

/**
 * Handle switching to a specific sub-wallet
 * Prompts for PIN if switching to a different master wallet
 */
async function handleHierarchicalWalletSwitch(masterKeyId: string, subWalletIndex: number): Promise<void> {
    console.log('[Wallet Management] Switching to wallet:', { masterKeyId, subWalletIndex });
    
    try {
        // Close dropdown
        const walletDropdown = document.getElementById('wallet-dropdown');
        const currentWalletBtn = document.getElementById('current-wallet-btn');
        if (walletDropdown) walletDropdown.classList.add('hidden');
        if (currentWalletBtn) currentWalletBtn.classList.remove('open');
        setIsWalletSelectorOpen(false);

        // Get current active wallet from storage to determine if we're switching master wallets
        const storageResult = await chrome.storage.local.get(['multiWalletData']);
        let currentActiveMasterKeyId = '';
        
        if (storageResult.multiWalletData) {
            const data = JSON.parse(storageResult.multiWalletData);
            currentActiveMasterKeyId = data.activeWalletId || '';
        }

        // Check if switching to a different master wallet (different PIN required)
        const isDifferentMasterWallet = currentActiveMasterKeyId !== masterKeyId;
        let pin: string | null;

        if (isDifferentMasterWallet) {
            // Switching to a different master wallet - need to prompt for its PIN
            console.log('[Wallet Management] Different master wallet - prompting for PIN');
            
            pin = await promptForPIN('Enter PIN for the wallet you\'re switching to:');
            if (!pin) {
                console.log('[Wallet Management] PIN prompt cancelled');
                return; // User cancelled
            }
        } else {
            // Switching sub-wallet within same master wallet - use session PIN
            console.log('[Wallet Management] Same master wallet - using session PIN');
            pin = sessionPin;
            if (!pin) {
                showError('Session expired. Please unlock again.');
                return;
            }
        }

        // Switch to the hierarchical wallet
        const response = await ExtensionMessaging.switchHierarchicalWallet(masterKeyId, subWalletIndex, pin);
        
        if (response.success && response.data) {
            // Update local state
            setActiveMasterKeyId(masterKeyId);
            setActiveSubWalletIndex(subWalletIndex);

            // Update session PIN if we switched to a different master wallet
            if (isDifferentMasterWallet) {
                setSessionPin(pin);
                console.log('[Wallet Management] Updated session PIN for new master wallet');
            }

            // Dispatch custom event for popup.ts to handle SDK reconnection
            const event = new CustomEvent('hierarchical-wallet-switched', {
                detail: {
                    mnemonic: response.data.mnemonic,
                    masterKeyId: masterKeyId,
                    subWalletIndex: subWalletIndex,
                    masterKeyNickname: response.data.masterKeyNickname,
                    subWalletNickname: response.data.subWalletNickname
                }
            });
            window.dispatchEvent(event);

            // Show correct name: master wallet name for index 0, sub-wallet name for others
            const displayName = subWalletIndex === 0 
                ? response.data.masterKeyNickname 
                : response.data.subWalletNickname;
            showSuccess(`Switched to ${displayName}`);

            // Refresh UI
            await initializeMultiWalletUI();
        } else {
            // Provide user-friendly error message for common cases
            const errorMsg = response.error || 'Failed to switch wallet';
            if (errorMsg.includes('decrypt') || errorMsg.includes('mnemonic')) {
                showError('Incorrect PIN. Please try again.');
            } else {
                showError(errorMsg);
            }
        }
    } catch (error) {
        console.error('[Wallet Management] Switch error:', error);
        showError('Failed to switch wallet');
    }
}

/**
 * Setup wallet selector event listeners
 */
export function setupWalletSelectorListeners(): void {
    const currentWalletBtn = document.getElementById('current-wallet-btn');
    const addWalletBtn = document.getElementById('add-wallet-btn');
    const manageWalletsBtn = document.getElementById('manage-wallets-btn');
    const walletDropdown = document.getElementById('wallet-dropdown');
    const walletSelector = document.getElementById('wallet-selector');

    // Toggle dropdown
    if (currentWalletBtn) {
        currentWalletBtn.onclick = () => {
            setIsWalletSelectorOpen(!isWalletSelectorOpen);
            currentWalletBtn.classList.toggle('open', isWalletSelectorOpen);
            walletDropdown?.classList.toggle('hidden', !isWalletSelectorOpen);
        };
    }

    // Add wallet
    if (addWalletBtn) {
        addWalletBtn.onclick = () => {
            showAddWalletFlow();
        };
    }

    // Manage wallets
    if (manageWalletsBtn) {
        manageWalletsBtn.onclick = async () => {
            // Close the dropdown first
            setIsWalletSelectorOpen(false);
            currentWalletBtn?.classList.remove('open');
            walletDropdown?.classList.add('hidden');

            // Show in-popup wallet management interface
            await showWalletManagementInterface();
        };
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (walletSelector && !walletSelector.contains(e.target as Node) && isWalletSelectorOpen) {
            setIsWalletSelectorOpen(false);
            currentWalletBtn?.classList.remove('open');
            walletDropdown?.classList.add('hidden');
        }
    });
}

/**
 * Handle wallet switch
 */
export async function handleWalletSwitch(walletId: string): Promise<void> {
    try {
        console.log(`[Multi-Wallet] Switching to wallet: ${walletId}`);

        // Close dropdown
        const walletDropdown = document.getElementById('wallet-dropdown');
        walletDropdown?.classList.add('hidden');
        setIsWalletSelectorOpen(false);

        // Show switching indicator
        showWalletSwitchingIndicator(true);

        // Try with current session PIN first
        let pin = sessionPin || '';

        if (!pin) {
            // No session PIN - prompt for PIN
            showWalletSwitchingIndicator(false);
            pin = await promptForWalletPin(walletId);
            if (!pin) {
                return; // User cancelled
            }
            showWalletSwitchingIndicator(true);
        }

        // Clear cached balance before switching wallets
        await chrome.storage.local.remove(['cachedBalance']);
        console.log('🔄 [Multi-Wallet] Cleared global balance cache before switch');

        // Disconnect current SDK
        if (breezSDK) {
            console.log('[Multi-Wallet] Disconnecting current SDK');
            await breezSDK.disconnect();
            setBreezSDK(null);
        }

        // Try to switch wallet with current PIN
        let switchResponse = await ExtensionMessaging.switchWallet(walletId, pin);

        // If PIN doesn't match (decryption fails), prompt for the correct PIN
        if (!switchResponse.success && 
            (switchResponse.error?.includes('decrypt') || 
             switchResponse.error?.includes('Invalid PIN') ||
             switchResponse.error?.includes('Failed to load wallet'))) {
            console.log('[Multi-Wallet] PIN mismatch - prompting for wallet PIN');
            showWalletSwitchingIndicator(false);

            const walletName = currentWallets.find(w => w.id === walletId)?.nickname || 'this wallet';
            showInfo(`Current PIN is invalid for ${walletName}. Please enter the correct PIN.`);

            pin = await promptForWalletPin(walletId);
            if (!pin) {
                return; // User cancelled
            }

            showWalletSwitchingIndicator(true);
            switchResponse = await ExtensionMessaging.switchWallet(walletId, pin);
        }

        if (!switchResponse.success || !switchResponse.data) {
            // Check if this is a PIN-related error and show a clearer message
            const errorMsg = switchResponse.error || 'Wallet switch failed';
            if (errorMsg.includes('decrypt') || errorMsg.includes('Failed to load wallet')) {
                throw new Error('Incorrect PIN. Please try again.');
            }
            throw new Error(errorMsg);
        }

        // Update session PIN to the new wallet's PIN
        setSessionPin(pin);
        await chrome.storage.session.set({ walletSessionPin: pin });
        console.log('🔐 [Multi-Wallet] Updated session PIN for new wallet');

        // Connect new SDK and store in state
        console.log('[Multi-Wallet] Connecting to new wallet SDK');
        const sdk = await connectBreezSDK(switchResponse.data.mnemonic);
        setBreezSDK(sdk); // Store in shared state

        // Query fresh balance from SDK
        await callbacks?.updateBalanceDisplay();
        console.log('🔄 [Multi-Wallet] Queried fresh balance from new wallet SDK');

        // Show loading states while waiting for sync
        const balanceLoading = document.getElementById('balance-loading');
        if (balanceLoading) {
            balanceLoading.classList.remove('hidden');
        }

        const transactionList = document.getElementById('transaction-list');
        if (transactionList) {
            transactionList.innerHTML = '<div class="no-transactions">⏳ Loading transaction history...</div>';
        }

        showInfo('Syncing wallet data...');

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
 * Prompt user for wallet PIN
 */
async function promptForWalletPin(walletId: string): Promise<string> {
    const walletName = currentWallets.find(w => w.id === walletId)?.nickname || 'wallet';
    const pin = await promptForPIN(`Enter PIN for ${walletName}`);
    return pin || '';
}

/**
 * Show/hide wallet switching indicator
 */
export function showWalletSwitchingIndicator(show: boolean): void {
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
// Wallet Management Interface
// ========================================

/**
 * Show wallet management interface (in-popup)
 */
export async function showWalletManagementInterface(): Promise<void> {
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
            showAddWalletFlow();
        };
    }
}

/**
 * Hide wallet management interface and return to main interface
 */
export function hideWalletManagementInterface(): void {
    console.log('[Wallet Management] Hiding management interface');

    const managementInterface = document.getElementById('wallet-management-interface');
    if (managementInterface) {
        managementInterface.classList.add('hidden');
    }

    const mainInterface = document.getElementById('main-interface');
    if (mainInterface) {
        mainInterface.classList.remove('hidden');
    }
}

/**
 * Load and display wallet list in management interface
 * Always uses hierarchical view (master keys with sub-wallets)
 */
export async function loadWalletManagementList(): Promise<void> {
    try {
        console.log('[Wallet Management] Loading wallet list (hierarchical)');

        // Always use hierarchical mode - all wallets are master keys with sub-wallets
        setIsHierarchicalMode(true);
        await loadHierarchicalWalletList();

    } catch (error) {
        console.error('[Wallet Management] Failed to load wallet list:', error);
        showError('Failed to load wallets');
    }
}

/**
 * Load hierarchical wallet list (v2 mode - master keys with sub-wallets)
 */
async function loadHierarchicalWalletList(): Promise<void> {
    const masterKeysResponse = await ExtensionMessaging.getMasterKeyMetadata();
    if (!masterKeysResponse.success || !masterKeysResponse.data) {
        showError('Failed to load master keys');
        return;
    }

    const masterKeyList: MasterKeyMetadata[] = masterKeysResponse.data;
    setMasterKeys(masterKeyList);
    console.log(`[Wallet Management] Loaded ${masterKeyList.length} master key(s) (v2 hierarchical mode)`);

    // Get active wallet info
    const activeData = await chrome.storage.local.get(['multiWalletData']);
    let currentActiveMasterKeyId = '';
    let currentActiveSubWalletIndex = 0;

    if (activeData.multiWalletData) {
        try {
            const data = JSON.parse(activeData.multiWalletData);
            currentActiveMasterKeyId = data.activeMasterKeyId || '';
            currentActiveSubWalletIndex = data.activeSubWalletIndex || 0;
        } catch (e) {
            console.error('[Wallet Management] Failed to parse active wallet data');
        }
    }

    setActiveMasterKeyId(currentActiveMasterKeyId);
    setActiveSubWalletIndex(currentActiveSubWalletIndex);

    const listContainer = document.getElementById('wallet-management-list');
    if (!listContainer) {
        console.error('[Wallet Management] List container not found');
        return;
    }

    if (masterKeyList.length === 0) {
        listContainer.innerHTML = '<div class="no-transactions" style="padding: 40px 20px;">No wallets found</div>';
        return;
    }

    // Build hierarchical HTML
    let html = '';

    for (const mk of masterKeyList) {
        const isActiveMasterKey = mk.id === currentActiveMasterKeyId;
        const isExpanded = expandedMasterKeys.has(mk.id) || mk.isExpanded;
        const canDeleteMasterKey = masterKeyList.length > 1;
        const createdDate = new Date(mk.createdAt).toLocaleDateString();

        // Fetch sub-wallets for this master key
        const subWalletsResponse = await ExtensionMessaging.getSubWallets(mk.id);
        const subWallets: SubWalletEntry[] = subWalletsResponse.success && subWalletsResponse.data
            ? subWalletsResponse.data
            : [];

        html += `
            <div class="master-key-item ${isExpanded ? 'expanded' : 'collapsed'} ${isActiveMasterKey ? 'active' : ''}"
                 data-master-id="${mk.id}">
                <div class="master-key-header" data-master-id="${mk.id}">
                    <span class="master-key-icon">🔑</span>
                    <span class="master-key-name">${mk.nickname}</span>
                    <span class="sub-wallet-count">(${mk.subWalletCount})</span>
                    <span class="expand-icon">${isExpanded ? '▼' : '▶'}</span>
                </div>
                <div class="master-key-meta">Created: ${createdDate}</div>
                <div class="master-key-actions">
                    <button class="wallet-mgmt-btn rename-master-btn"
                            data-master-id="${mk.id}"
                            data-master-name="${mk.nickname}">
                        Rename
                    </button>
                    <button class="wallet-mgmt-btn delete-master-btn"
                            data-master-id="${mk.id}"
                            ${!canDeleteMasterKey ? 'disabled' : ''}>
                        Delete
                    </button>
                </div>

                <div class="sub-wallet-list ${isExpanded ? '' : 'hidden'}">
                    <div class="sub-wallet-actions-row">
                        <button class="add-sub-wallet-btn" data-master-id="${mk.id}">
                            + Add Sub-Wallet
                        </button>
                        <button class="scan-sub-wallets-btn" data-master-id="${mk.id}">
                            🔍 Scan
                        </button>
                    </div>
                    ${subWallets.map(sw => {
                        const isActiveSubWallet = isActiveMasterKey && sw.index === currentActiveSubWalletIndex;
                        const canDeleteSubWallet = subWallets.length > 1;

                        return `
                            <div class="sub-wallet-item ${isActiveSubWallet ? 'active' : ''}"
                                 data-master-id="${mk.id}"
                                 data-sub-index="${sw.index}">
                                <div class="sub-wallet-header">
                                    <span class="sub-wallet-icon">💼</span>
                                    <span class="sub-wallet-name">${sw.nickname}</span>
                                    ${isActiveSubWallet ? '<span class="active-badge">Active</span>' : ''}
                                </div>
                                <div class="sub-wallet-actions">
                                    <button class="wallet-mgmt-btn rename-sub-btn"
                                            data-master-id="${mk.id}"
                                            data-sub-index="${sw.index}"
                                            data-sub-name="${sw.nickname}">
                                        Rename
                                    </button>
                                    <button class="wallet-mgmt-btn delete-sub-btn"
                                            data-master-id="${mk.id}"
                                            data-sub-index="${sw.index}"
                                            ${!canDeleteSubWallet ? 'disabled' : ''}>
                                        Delete
                                    </button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    listContainer.innerHTML = html;
    attachHierarchicalWalletListeners();
}

/**
 * Attach event listeners for hierarchical wallet management
 */
function attachHierarchicalWalletListeners(): void {
    // Master key expand/collapse
    document.querySelectorAll('.master-key-header').forEach(header => {
        header.addEventListener('click', (e) => {
            const target = e.currentTarget as HTMLElement;
            const masterId = target.getAttribute('data-master-id');
            if (masterId) {
                handleToggleMasterKeyExpand(masterId);
            }
        });
    });

    // Rename master key
    document.querySelectorAll('.rename-master-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const target = e.target as HTMLElement;
            const masterId = target.getAttribute('data-master-id');
            const currentName = target.getAttribute('data-master-name');
            if (masterId && currentName) {
                await handleRenameMasterKey(masterId, currentName);
            }
        });
    });

    // Delete master key
    document.querySelectorAll('.delete-master-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const target = e.target as HTMLElement;
            const masterId = target.getAttribute('data-master-id');
            if (masterId) {
                await handleDeleteMasterKey(masterId);
            }
        });
    });

    // Add sub-wallet
    document.querySelectorAll('.add-sub-wallet-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const target = e.target as HTMLElement;
            const masterId = target.getAttribute('data-master-id');
            if (masterId) {
                await handleAddSubWallet(masterId);
            }
        });
    });

    // Scan for sub-wallets
    document.querySelectorAll('.scan-sub-wallets-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const target = e.target as HTMLElement;
            const masterId = target.getAttribute('data-master-id');
            if (masterId) {
                await handleScanSubWallets(masterId);
            }
        });
    });

    // Rename sub-wallet
    document.querySelectorAll('.rename-sub-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const target = e.target as HTMLElement;
            const masterId = target.getAttribute('data-master-id');
            const subIndex = target.getAttribute('data-sub-index');
            const currentName = target.getAttribute('data-sub-name');
            if (masterId && subIndex && currentName) {
                await handleRenameSubWallet(masterId, parseInt(subIndex, 10), currentName);
            }
        });
    });

    // Delete sub-wallet
    document.querySelectorAll('.delete-sub-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const target = e.target as HTMLElement;
            const masterId = target.getAttribute('data-master-id');
            const subIndex = target.getAttribute('data-sub-index');
            if (masterId && subIndex) {
                await handleDeleteSubWallet(masterId, parseInt(subIndex, 10));
            }
        });
    });

    // Select sub-wallet (switch to it)
    document.querySelectorAll('.sub-wallet-item').forEach(item => {
        item.addEventListener('click', async (e) => {
            // Don't trigger if clicking on action buttons
            const target = e.target as HTMLElement;
            if (target.closest('.sub-wallet-actions')) {
                return;
            }

            const itemEl = e.currentTarget as HTMLElement;
            const masterId = itemEl.getAttribute('data-master-id');
            const subIndex = itemEl.getAttribute('data-sub-index');
            if (masterId && subIndex) {
                await handleSelectSubWallet(masterId, parseInt(subIndex, 10));
            }
        });
    });
}

// ========================================
// Hierarchical Wallet Operations
// ========================================

/**
 * Toggle master key expand/collapse state
 */
function handleToggleMasterKeyExpand(masterId: string): void {
    console.log(`[Wallet Management] Toggling master key expansion: ${masterId}`);

    toggleMasterKeyExpandedState(masterId);

    // Update UI
    const masterKeyItem = document.querySelector(`.master-key-item[data-master-id="${masterId}"]`);
    const subWalletList = masterKeyItem?.querySelector('.sub-wallet-list');
    const expandIcon = masterKeyItem?.querySelector('.expand-icon');

    if (masterKeyItem && subWalletList && expandIcon) {
        const isNowExpanded = expandedMasterKeys.has(masterId);
        masterKeyItem.classList.toggle('expanded', isNowExpanded);
        masterKeyItem.classList.toggle('collapsed', !isNowExpanded);
        subWalletList.classList.toggle('hidden', !isNowExpanded);
        expandIcon.textContent = isNowExpanded ? '▼' : '▶';
    }

    // Persist expansion state
    ExtensionMessaging.toggleMasterKeyExpanded(masterId).catch(console.error);
}

/**
 * Handle rename master key
 */
async function handleRenameMasterKey(masterId: string, currentName: string): Promise<void> {
    try {
        console.log(`[Wallet Management] Renaming master key ${masterId}`);

        // Store context for rename
        setRenameWalletId(`master:${masterId}`);
        setRenameWalletCurrentName(currentName);

        showRenameInterface(currentName);
    } catch (error) {
        console.error('[Wallet Management] Failed to show rename interface:', error);
        showError('Failed to open rename screen');
    }
}

/**
 * Handle delete master key
 */
async function handleDeleteMasterKey(masterId: string): Promise<void> {
    try {
        console.log(`[Wallet Management] Deleting master key ${masterId}`);

        const masterKey = masterKeys.find(mk => mk.id === masterId);
        const masterName = masterKey?.nickname || 'this master key';
        const subWalletCount = masterKey?.subWalletCount || 0;

        const confirmed = confirm(
            `Are you sure you want to delete "${masterName}" and ALL ${subWalletCount} sub-wallet(s)?\n\n` +
            `This action cannot be undone. Make sure you have backed up your recovery phrase!`
        );
        if (!confirmed) return;

        const pin = await showPINModal('Enter your PIN to delete master key');
        if (!pin) return;

        const response = await ExtensionMessaging.removeMasterKey(masterId, pin);
        if (response.success) {
            showSuccess('Master key deleted successfully!');
            await loadWalletManagementList();
            await initializeMultiWalletUI();
        } else {
            showError(response.error || 'Failed to delete master key');
        }
    } catch (error) {
        console.error('[Wallet Management] Delete master key failed:', error);
        showError('Failed to delete master key');
    }
}

/**
 * Handle add sub-wallet to a master key
 */
async function handleAddSubWallet(masterId: string): Promise<void> {
    try {
        console.log(`[Wallet Management] Adding sub-wallet to master key ${masterId}`);

        // Prompt for nickname
        const nickname = prompt('Enter a name for the new sub-wallet:', 'Sub-Wallet');
        if (!nickname || !nickname.trim()) {
            return; // User cancelled
        }

        const response = await ExtensionMessaging.addSubWallet(masterId, nickname.trim());
        if (response.success) {
            showSuccess(`Sub-wallet "${nickname}" created!`);
            await loadWalletManagementList();
        } else {
            showError(response.error || 'Failed to create sub-wallet');
        }
    } catch (error) {
        console.error('[Wallet Management] Add sub-wallet failed:', error);
        showError('Failed to create sub-wallet');
    }
}

/**
 * Handle scanning for existing sub-wallets with activity
 * This connects to each derived sub-wallet and checks for balance
 */
async function handleScanSubWallets(masterId: string): Promise<void> {
    try {
        console.log(`[Wallet Management] Scanning for sub-wallets on master key ${masterId}`);

        // Get PIN for decryption
        const pin = sessionPin || await showPINModal('Enter your PIN to scan for sub-wallets');
        if (!pin) return;

        // Show scanning indicator
        showInfo('Scanning for sub-wallets... This may take a moment.');

        // Get the master key mnemonic
        const mnemonicResponse = await ExtensionMessaging.getHierarchicalWalletMnemonic(masterId, 0, pin);
        if (!mnemonicResponse.success || !mnemonicResponse.data) {
            showError('Failed to decrypt master key');
            return;
        }

        // Import discovery module dynamically (it uses Breez SDK which requires DOM context)
        const { discoverSubWallets, getDiscoveredWalletNames } = await import('../utils/sub-wallet-discovery');
        const { BREEZ_API_KEY } = await import('./state');

        // Run discovery
        const results = await discoverSubWallets(mnemonicResponse.data, {
            maxIndexToScan: 5, // Scan up to 5 sub-wallets
            stopAfterEmptyCount: 3, // Stop after 3 consecutive empty
            apiKey: BREEZ_API_KEY,
            onProgress: (progress) => {
                console.log(`[Discovery] Scanning index ${progress.currentIndex}/${progress.totalToScan}`);
            }
        });

        // Get discovered wallets (those with activity)
        const discoveredWallets = getDiscoveredWalletNames(results);

        if (discoveredWallets.length === 0) {
            showInfo('No additional sub-wallets with activity found.');
            return;
        }

        // Filter out index 0 (already exists as main wallet)
        const newWallets = discoveredWallets.filter(w => w.index > 0);

        if (newWallets.length === 0) {
            showInfo('No additional sub-wallets with activity found.');
            return;
        }

        // Confirm with user
        const walletList = newWallets.map(w => `  - Index ${w.index}: ${w.nickname}`).join('\n');
        const confirmed = confirm(
            `Found ${newWallets.length} sub-wallet(s) with activity:\n\n${walletList}\n\nAdd these sub-wallets?`
        );

        if (!confirmed) return;

        // Add discovered sub-wallets
        const addResponse = await ExtensionMessaging.addDiscoveredSubWallets(masterId, newWallets);

        if (addResponse.success) {
            showSuccess(`Added ${newWallets.length} discovered sub-wallet(s)!`);
            await loadWalletManagementList();
        } else {
            showError(addResponse.error || 'Failed to add discovered sub-wallets');
        }
    } catch (error) {
        console.error('[Wallet Management] Scan sub-wallets failed:', error);
        showError('Failed to scan for sub-wallets');
    }
}

/**
 * Handle rename sub-wallet
 */
async function handleRenameSubWallet(masterId: string, subIndex: number, currentName: string): Promise<void> {
    try {
        console.log(`[Wallet Management] Renaming sub-wallet ${masterId}:${subIndex}`);

        // Store context for rename
        setRenameWalletId(`sub:${masterId}:${subIndex}`);
        setRenameWalletCurrentName(currentName);

        showRenameInterface(currentName);
    } catch (error) {
        console.error('[Wallet Management] Failed to show rename interface:', error);
        showError('Failed to open rename screen');
    }
}

/**
 * Handle delete sub-wallet
 */
async function handleDeleteSubWallet(masterId: string, subIndex: number): Promise<void> {
    try {
        console.log(`[Wallet Management] Deleting sub-wallet ${masterId}:${subIndex}`);

        const confirmed = confirm(
            'Are you sure you want to delete this sub-wallet?\n\n' +
            'This action cannot be undone. Make sure you have backed up your recovery phrase!'
        );
        if (!confirmed) return;

        const pin = await showPINModal('Enter your PIN to delete sub-wallet');
        if (!pin) return;

        const response = await ExtensionMessaging.removeSubWallet(masterId, subIndex, pin);
        if (response.success) {
            showSuccess('Sub-wallet deleted successfully!');
            await loadWalletManagementList();
            await initializeMultiWalletUI();
        } else {
            showError(response.error || 'Failed to delete sub-wallet');
        }
    } catch (error) {
        console.error('[Wallet Management] Delete sub-wallet failed:', error);
        showError('Failed to delete sub-wallet');
    }
}

/**
 * Handle selecting/switching to a sub-wallet
 * This triggers SDK reconnection with the derived mnemonic
 */
async function handleSelectSubWallet(masterId: string, subIndex: number): Promise<void> {
    try {
        console.log(`[Wallet Management] Switching to sub-wallet ${masterId}:${subIndex}`);

        // Check if already active
        if (activeMasterKeyId === masterId && activeSubWalletIndex === subIndex) {
            console.log('[Wallet Management] Already active, skipping switch');
            return;
        }

        // Request PIN for switching (needed to derive mnemonic)
        const pin = sessionPin || await showPINModal('Enter your PIN to switch wallet');
        if (!pin) return;

        // Show loading state
        showInfo('Switching wallet...');

        // Switch wallet via background (this derives the sub-wallet mnemonic)
        const response = await ExtensionMessaging.switchHierarchicalWallet(masterId, subIndex, pin);

        if (response.success && response.data) {
            // Update local state
            setActiveMasterKeyId(masterId);
            setActiveSubWalletIndex(subIndex);

            // The popup will need to reconnect SDK with the new mnemonic
            // Dispatch custom event for popup.ts to handle SDK reconnection
            const event = new CustomEvent('hierarchical-wallet-switched', {
                detail: {
                    mnemonic: response.data.mnemonic,
                    masterKeyId: masterId,
                    subWalletIndex: subIndex,
                    masterKeyNickname: response.data.masterKeyNickname,
                    subWalletNickname: response.data.subWalletNickname
                }
            });
            window.dispatchEvent(event);

            showSuccess(`Switched to ${response.data.subWalletNickname}`);

            // Refresh the wallet list UI
            await loadWalletManagementList();
            await initializeMultiWalletUI();
        } else {
            showError(response.error || 'Failed to switch wallet');
        }
    } catch (error) {
        console.error('[Wallet Management] Switch sub-wallet failed:', error);
        showError('Failed to switch wallet');
    }
}

/**
 * Attach event listeners to wallet management buttons
 */
export function attachWalletManagementListeners(): void {
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

// ========================================
// Rename Wallet
// ========================================

/**
 * Handle rename wallet action - show full-screen rename interface
 */
export async function handleRenameWallet(walletId: string, currentName: string): Promise<void> {
    try {
        console.log(`[Wallet Management] Renaming wallet ${walletId}`);

        setRenameWalletId(walletId);
        setRenameWalletCurrentName(currentName);

        showRenameInterface(currentName);
    } catch (error) {
        console.error('[Wallet Management] Failed to show rename interface:', error);
        showError('Failed to open rename screen');
    }
}

/**
 * Show rename wallet full-screen interface
 */
export function showRenameInterface(currentName: string): void {
    console.log('[Rename] Showing rename interface');

    const managementInterface = document.getElementById('wallet-management-interface');
    if (managementInterface) {
        managementInterface.classList.add('hidden');
    }

    const renameInterface = document.getElementById('rename-wallet-interface');
    if (renameInterface) {
        renameInterface.classList.remove('hidden');
    }

    const input = document.getElementById('rename-wallet-name-input') as HTMLInputElement;
    if (input) {
        input.value = currentName;
        input.focus();
        input.select();
    }

    const errorEl = document.getElementById('rename-error-message');
    if (errorEl) {
        errorEl.classList.add('hidden');
        errorEl.textContent = '';
    }
}

/**
 * Handle rename save action
 * Supports v1 wallet renaming, v2 master key renaming, and v2 sub-wallet renaming
 * Format of renameWalletId:
 * - v1 wallet: "<walletId>"
 * - v2 master key: "master:<masterKeyId>"
 * - v2 sub-wallet: "sub:<masterKeyId>:<subWalletIndex>"
 */
export async function handleRenameSave(): Promise<void> {
    try {
        console.log('🔵 [Rename] handleRenameSave() CALLED');

        if (isRenameSaving) {
            console.log('🔄 [Rename] Save already in progress - ignoring');
            return;
        }

        setIsRenameSaving(true);

        if (!renameWalletId) {
            console.error('[Rename] No wallet ID set - ABORTING');
            return;
        }

        const input = document.getElementById('rename-wallet-name-input') as HTMLInputElement;
        const errorEl = document.getElementById('rename-error-message');
        const newName = input?.value.trim();

        if (!newName) {
            if (errorEl) {
                errorEl.textContent = 'Please enter a name';
                errorEl.classList.remove('hidden');
            }
            return;
        }

        console.log('[Rename] Saving new name', { id: renameWalletId, newName });

        let response;

        // Determine rename type based on ID format
        if (renameWalletId.startsWith('master:')) {
            // Renaming a master key (v2)
            const masterKeyId = renameWalletId.substring(7); // Remove "master:" prefix
            response = await ExtensionMessaging.renameMasterKey(masterKeyId, newName);
        } else if (renameWalletId.startsWith('sub:')) {
            // Renaming a sub-wallet (v2)
            const parts = renameWalletId.split(':');
            const masterKeyId = parts[1];
            const subWalletIndex = parseInt(parts[2], 10);
            response = await ExtensionMessaging.renameSubWallet(masterKeyId, subWalletIndex, newName);
        } else {
            // Renaming a v1 wallet
            const pin = sessionPin || '';
            if (!pin) {
                showError('Session expired. Please unlock wallet again.');
                return;
            }
            response = await ExtensionMessaging.renameWallet(renameWalletId, newName, pin);
        }

        if (response.success) {
            showSuccess('Renamed successfully!');

            setRenameWalletId(null);
            setRenameWalletCurrentName(null);

            hideRenameInterface();

            await loadWalletManagementList();
            await initializeMultiWalletUI();
        } else {
            if (errorEl) {
                errorEl.textContent = response.error || 'Failed to rename';
                errorEl.classList.remove('hidden');
            }
        }
    } catch (error) {
        console.error('[Rename] Save failed:', error);
        const errorEl = document.getElementById('rename-error-message');
        if (errorEl) {
            errorEl.textContent = 'Failed to rename';
            errorEl.classList.remove('hidden');
        }
    } finally {
        setIsRenameSaving(false);
    }
}

/**
 * Hide rename interface and return to wallet management
 */
export function hideRenameInterface(): void {
    console.log('[Rename] Hiding rename interface');

    const renameInterface = document.getElementById('rename-wallet-interface');
    if (renameInterface) {
        renameInterface.classList.add('hidden');
    }

    const managementInterface = document.getElementById('wallet-management-interface');
    if (managementInterface) {
        managementInterface.classList.remove('hidden');
    }

    setRenameWalletId(null);
    setRenameWalletCurrentName(null);
}

// ========================================
// Delete Wallet
// ========================================

/**
 * Handle delete wallet action
 */
export async function handleDeleteWallet(walletId: string): Promise<void> {
    try {
        console.log(`[Wallet Management] Deleting wallet ${walletId}`);

        const confirmed = confirm('Are you sure you want to delete this wallet? This action cannot be undone. Make sure you have backed up your recovery phrase!');
        if (!confirmed) return;

        const pin = await showPINModal('Enter your PIN to delete wallet');
        if (!pin) return;

        const response = await ExtensionMessaging.deleteWallet(walletId, pin);
        if (response.success) {
            showSuccess('Wallet deleted successfully!');

            await loadWalletManagementList();
            await initializeMultiWalletUI();
        } else {
            showError(response.error || 'Failed to delete wallet');
        }
    } catch (error) {
        console.error('[Wallet Management] Delete failed:', error);
        showError('Failed to delete wallet');
    }
}
