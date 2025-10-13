// Popup script for Lightning Network Tipping Extension
// Handles wallet dashboard, deposits, withdrawals, and settings

console.log('Lightning Tipping Extension popup loaded');

// DOM elements
const balanceElement = document.getElementById('balance') as HTMLElement;
const depositBtn = document.getElementById('deposit-btn') as HTMLButtonElement;
const withdrawBtn = document.getElementById('withdraw-btn') as HTMLButtonElement;
const settingsBtn = document.getElementById('settings-btn') as HTMLButtonElement;

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
    initializePopup();
    setupEventListeners();
});

function initializePopup() {
    // TODO: Load wallet balance from background script
    // TODO: Load transaction history
    // TODO: Check wallet status
    updateBalance(0); // Placeholder
}

function setupEventListeners() {
    depositBtn.addEventListener('click', handleDeposit);
    withdrawBtn.addEventListener('click', handleWithdraw);
    settingsBtn.addEventListener('click', handleSettings);
}

function updateBalance(balance: number) {
    balanceElement.textContent = `${balance.toLocaleString()} sats`;
}

function handleDeposit() {
    // TODO: Generate Lightning invoice for deposits
    console.log('Deposit clicked');
}

function handleWithdraw() {
    // TODO: Open withdrawal interface
    console.log('Withdraw clicked');
}

function handleSettings() {
    // TODO: Open settings page
    console.log('Settings clicked');
}