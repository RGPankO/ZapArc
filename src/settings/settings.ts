// Settings page for Lightning Network Tipping Extension

import { UserSettings } from '../types';
import { ExtensionMessaging } from '../utils/messaging';

console.log('Lightning Tipping Extension settings page loaded');

// DOM elements
let currentSettings: UserSettings;

// Initialize settings page
document.addEventListener('DOMContentLoaded', async () => {
    await loadSettings();
    setupEventListeners();
});

async function loadSettings(): Promise<void> {
    try {
        console.log('Loading settings...');
        const response = await ExtensionMessaging.getUserSettings();
        console.log('Settings response:', response);
        
        currentSettings = (response.success && response.data) ? response.data : getDefaultSettings();
        console.log('Current settings:', currentSettings);
        
        // Populate form with current settings
        populateForm();
    } catch (error) {
        console.error('Failed to load settings:', error);
        currentSettings = getDefaultSettings();
        populateForm();
    }
}

function getDefaultSettings(): UserSettings {
    return {
        defaultPostingAmounts: [100, 500, 1000],
        defaultTippingAmounts: [100, 500, 1000],
        useBuiltInWallet: true,
        floatingMenuEnabled: true,
        autoLockTimeout: 900,
        customLNURL: undefined
    };
}

function populateForm(): void {
    // Wallet type
    const builtinRadio = document.getElementById('builtin-wallet') as HTMLInputElement;
    const customRadio = document.getElementById('custom-wallet') as HTMLInputElement;
    const customLnurlInput = document.getElementById('custom-lnurl') as HTMLInputElement;
    
    if (currentSettings.useBuiltInWallet) {
        builtinRadio.checked = true;
        customLnurlInput.disabled = true;
    } else {
        customRadio.checked = true;
        customLnurlInput.disabled = false;
    }
    
    if (currentSettings.customLNURL) {
        customLnurlInput.value = currentSettings.customLNURL;
    }
    
    // Posting amounts
    (document.getElementById('post-amount-1') as HTMLInputElement).value = currentSettings.defaultPostingAmounts[0].toString();
    (document.getElementById('post-amount-2') as HTMLInputElement).value = currentSettings.defaultPostingAmounts[1].toString();
    (document.getElementById('post-amount-3') as HTMLInputElement).value = currentSettings.defaultPostingAmounts[2].toString();
    
    // Tipping amounts
    (document.getElementById('tip-amount-1') as HTMLInputElement).value = currentSettings.defaultTippingAmounts[0].toString();
    (document.getElementById('tip-amount-2') as HTMLInputElement).value = currentSettings.defaultTippingAmounts[1].toString();
    (document.getElementById('tip-amount-3') as HTMLInputElement).value = currentSettings.defaultTippingAmounts[2].toString();
    
    // UI settings
    (document.getElementById('floating-menu-enabled') as HTMLInputElement).checked = currentSettings.floatingMenuEnabled;
    (document.getElementById('autolock-timeout') as HTMLSelectElement).value = currentSettings.autoLockTimeout.toString();
}

function setupEventListeners(): void {
    // Wallet type radio buttons
    const builtinRadio = document.getElementById('builtin-wallet') as HTMLInputElement;
    const customRadio = document.getElementById('custom-wallet') as HTMLInputElement;
    const customLnurlInput = document.getElementById('custom-lnurl') as HTMLInputElement;
    
    builtinRadio.addEventListener('change', () => {
        customLnurlInput.disabled = true;
        customLnurlInput.value = '';
    });
    
    customRadio.addEventListener('change', () => {
        customLnurlInput.disabled = false;
        customLnurlInput.focus();
    });
    
    // Save settings button
    const saveBtn = document.getElementById('save-settings') as HTMLButtonElement;
    saveBtn.addEventListener('click', saveSettings);
    
    // Reset settings button
    const resetBtn = document.getElementById('reset-settings') as HTMLButtonElement;
    resetBtn.addEventListener('click', resetSettings);
}

async function saveSettings(): Promise<void> {
    try {
        const builtinRadio = document.getElementById('builtin-wallet') as HTMLInputElement;
        const customLnurlInput = document.getElementById('custom-lnurl') as HTMLInputElement;
        
        // Validate custom LNURL if provided
        if (!builtinRadio.checked && customLnurlInput.value) {
            if (!isValidLNURL(customLnurlInput.value)) {
                showError('Invalid LNURL format. Please enter a valid LNURL.');
                return;
            }
        }
        
        // Collect settings
        const newSettings: UserSettings = {
            useBuiltInWallet: builtinRadio.checked,
            customLNURL: builtinRadio.checked ? undefined : customLnurlInput.value || undefined,
            defaultPostingAmounts: [
                parseInt((document.getElementById('post-amount-1') as HTMLInputElement).value) || 100,
                parseInt((document.getElementById('post-amount-2') as HTMLInputElement).value) || 500,
                parseInt((document.getElementById('post-amount-3') as HTMLInputElement).value) || 1000
            ] as [number, number, number],
            defaultTippingAmounts: [
                parseInt((document.getElementById('tip-amount-1') as HTMLInputElement).value) || 100,
                parseInt((document.getElementById('tip-amount-2') as HTMLInputElement).value) || 500,
                parseInt((document.getElementById('tip-amount-3') as HTMLInputElement).value) || 1000
            ] as [number, number, number],
            floatingMenuEnabled: (document.getElementById('floating-menu-enabled') as HTMLInputElement).checked,
            autoLockTimeout: parseInt((document.getElementById('autolock-timeout') as HTMLSelectElement).value) || 900
        };
        
        // Save settings
        console.log('Saving settings:', newSettings);
        const response = await ExtensionMessaging.saveUserSettings(newSettings);
        console.log('Save response:', response);
        
        if (response.success) {
            showSuccess('Settings saved successfully!');
            currentSettings = newSettings;
            console.log('Settings saved and updated locally:', currentSettings);
        } else {
            showError('Failed to save settings: ' + (response.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Failed to save settings:', error);
        showError('Failed to save settings');
    }
}

async function resetSettings(): Promise<void> {
    if (confirm('Reset all settings to defaults?')) {
        currentSettings = getDefaultSettings();
        populateForm();
        
        try {
            const response = await ExtensionMessaging.saveUserSettings(currentSettings);
            if (response.success) {
                showSuccess('Settings reset to defaults');
            } else {
                showError('Failed to reset settings');
            }
        } catch (error) {
            console.error('Failed to reset settings:', error);
            showError('Failed to reset settings');
        }
    }
}

function isValidLNURL(lnurl: string): boolean {
    return lnurl.toLowerCase().startsWith('lnurl') && lnurl.length > 10;
}

function showSuccess(message: string): void {
    showMessage(message, 'success');
}

function showError(message: string): void {
    showMessage(message, 'error');
}

function showMessage(message: string, type: 'success' | 'error'): void {
    // Remove existing messages
    const existing = document.querySelector('.settings-message');
    if (existing) {
        existing.remove();
    }
    
    const messageEl = document.createElement('div');
    messageEl.className = 'settings-message';
    messageEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 16px;
        border-radius: 6px;
        color: white;
        font-weight: bold;
        z-index: 1000;
        background: ${type === 'success' ? '#4CAF50' : '#f44336'};
    `;
    messageEl.textContent = message;
    
    document.body.appendChild(messageEl);
    
    setTimeout(() => {
        messageEl.remove();
    }, 3000);
}

// Debug function - add to window for testing
(window as any).debugSettings = {
    getCurrentSettings: () => currentSettings,
    loadSettings: loadSettings,
    testStorage: async () => {
        const result = await chrome.storage.local.get(['userSettings']);
        console.log('Raw storage result:', result);
        return result;
    }
};