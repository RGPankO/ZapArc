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
        // Add subtle opacity to indicate loading without clearing content
        transactionList.style.opacity = '0.5';
    }
}

export function hideTransactionsLoading(): void {
    const transactionList = document.getElementById('transaction-list');
    if (transactionList) {
        transactionList.style.opacity = '1';
    }
}
