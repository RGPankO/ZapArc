// Multi-Wallet Management UI
// Handles wallet selector, switching, rename, delete, and management interface

import { ExtensionMessaging } from '../utils/messaging';
import { 
    currentWallets, 
    setCurrentWallets, 
    isWalletSelectorOpen, 
    setIsWalletSelectorOpen,
    sessionPin,
    breezSDK,
    setBreezSDK,
    isWalletUnlocked,
    setIsWalletUnlocked,
    renameWalletId,
    setRenameWalletId,
    renameWalletCurrentName,
    setRenameWalletCurrentName,
    isRenameSaving,
    setIsRenameSaving
} from './state';
import { connectBreezSDK } from './sdk';
import { showError, showSuccess, showInfo } from './notifications';
import { showPINModal, showModal, hideModal } from './modals';

// Callback type for wallet operations that need main popup functions
export type WalletManagementCallbacks = {
    updateBalanceDisplay: () => Promise<void>;
    initializeMultiWalletUI: () => Promise<void>;
    showAddWalletModal: () => Promise<void>;
};

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
 * Populate wallet dropdown with all wallets
 */
export function populateWalletDropdown(): void {
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
            callbacks?.showAddWalletModal();
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

        // Use session PIN for decryption (stored during unlock)
        const pin = sessionPin || '';
        if (!pin) {
            console.error('[Multi-Wallet] No session PIN available');
            showError('Session expired. Please unlock wallet again.');
            const unlockScreen = document.getElementById('unlock-screen');
            const mainInterface = document.getElementById('main-interface');
            if (unlockScreen && mainInterface) {
                unlockScreen.classList.remove('hidden');
                mainInterface.classList.add('hidden');
                setIsWalletUnlocked(false);
            }
            return;
        }
        console.log('🔐 [Multi-Wallet] Using session PIN for wallet switch');

        // Clear cached balance before switching wallets
        await chrome.storage.local.remove(['cachedBalance']);
        console.log('🔄 [Multi-Wallet] Cleared global balance cache before switch');

        // Disconnect current SDK
        if (breezSDK) {
            console.log('[Multi-Wallet] Disconnecting current SDK');
            await breezSDK.disconnect();
            setBreezSDK(null);
        }

        // Switch wallet
        const switchResponse = await ExtensionMessaging.switchWallet(walletId, pin);
        if (!switchResponse.success || !switchResponse.data) {
            throw new Error(switchResponse.error || 'Wallet switch failed');
        }

        // Connect new SDK
        console.log('[Multi-Wallet] Connecting to new wallet SDK');
        const sdk = await connectBreezSDK(switchResponse.data.mnemonic);
        setBreezSDK(sdk);

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
            callbacks?.showAddWalletModal();
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
 */
export async function loadWalletManagementList(): Promise<void> {
    try {
        console.log('[Wallet Management] Loading wallet list');

        const walletsResponse = await ExtensionMessaging.getAllWallets();
        if (!walletsResponse.success || !walletsResponse.data) {
            showError('Failed to load wallets');
            return;
        }

        const wallets = walletsResponse.data;
        console.log(`[Wallet Management] Loaded ${wallets.length} wallet(s)`);

        const activeWalletData = await chrome.storage.local.get(['activeWalletId']);
        const activeWalletId = activeWalletData.activeWalletId;

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
            const canDelete = wallets.length > 1;
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

        attachWalletManagementListeners();

    } catch (error) {
        console.error('[Wallet Management] Failed to load wallet list:', error);
        showError('Failed to load wallets');
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
                errorEl.textContent = 'Please enter a wallet name';
                errorEl.classList.remove('hidden');
            }
            return;
        }

        const pin = sessionPin || '';
        if (!pin) {
            showError('Session expired. Please unlock wallet again.');
            return;
        }

        console.log('[Rename] Saving new wallet name', { walletId: renameWalletId, newName });

        const response = await ExtensionMessaging.renameWallet(renameWalletId, newName, pin);

        if (response.success) {
            showSuccess('Wallet renamed successfully!');

            setRenameWalletId(null);
            setRenameWalletCurrentName(null);

            hideRenameInterface();

            await loadWalletManagementList();
            await callbacks?.initializeMultiWalletUI();
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
            await callbacks?.initializeMultiWalletUI();
        } else {
            showError(response.error || 'Failed to delete wallet');
        }
    } catch (error) {
        console.error('[Wallet Management] Delete failed:', error);
        showError('Failed to delete wallet');
    }
}
