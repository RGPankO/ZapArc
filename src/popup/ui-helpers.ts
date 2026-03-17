// UI helper functions for popup
// Handles loading indicators and other DOM state helpers

// ========================================
// Loading Indicators
// ========================================

export function showBalanceLoading(): void {
    const balanceLoading = document.getElementById('balance-loading');
    if (balanceLoading) {
        balanceLoading.classList.remove('hidden');
    }
}

export function hideBalanceLoading(): void {
    const balanceLoading = document.getElementById('balance-loading');
    if (balanceLoading) {
        balanceLoading.classList.add('hidden');
    }
}

export function showTransactionsLoading(): void {
    const transactionList = document.getElementById('transaction-list');
    if (transactionList) {
        transactionList.innerHTML = '<div class="no-transactions">⏳ Loading transactions...</div>';
    }
}

/**
 * Clear wallet display data (balance and transactions)
 * Use when switching wallets to remove stale data before fetching new data
 */
export function clearWalletDisplay(): void {
    // Clear balance
    const balanceElement = document.getElementById('balance');
    if (balanceElement) {
        balanceElement.textContent = '-- sats';
    }

    // Clear transactions
    const transactionList = document.getElementById('transaction-list');
    if (transactionList) {
        transactionList.style.opacity = '1';
        transactionList.innerHTML = '';
    }

    // Clear Lightning Address display
    const homeLnAddress = document.getElementById('home-ln-address');
    if (homeLnAddress) homeLnAddress.classList.add('hidden');

    const settingsRegistered = document.getElementById('lightning-address-registered');
    const settingsUnregistered = document.getElementById('lightning-address-unregistered');
    if (settingsRegistered) settingsRegistered.classList.add('hidden');
    if (settingsUnregistered) settingsUnregistered.classList.add('hidden');
}
