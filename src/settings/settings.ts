// Settings page for Lightning Network Tipping Extension

import './settings.css';
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
        customLNURL: undefined,
        facebookPostingMode: 'global',
        allowedFacebookGroups: [],
        deniedFacebookGroups: []
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
    
    // Facebook settings
    const globalRadio = document.getElementById('facebook-global') as HTMLInputElement;
    const selectiveRadio = document.getElementById('facebook-selective') as HTMLInputElement;
    
    if (currentSettings.facebookPostingMode === 'global') {
        globalRadio.checked = true;
    } else {
        selectiveRadio.checked = true;
    }
    
    updateFacebookGroupManagementVisibility();
    populateFacebookGroupsList();
    
    // UI settings
    (document.getElementById('floating-menu-enabled') as HTMLInputElement).checked = currentSettings.floatingMenuEnabled;
    (document.getElementById('autolock-timeout') as HTMLSelectElement).value = currentSettings.autoLockTimeout.toString();
}

function updateFacebookGroupManagementVisibility(): void {
    const selectiveRadio = document.getElementById('facebook-selective') as HTMLInputElement;
    const groupManagement = document.getElementById('facebook-group-management') as HTMLElement;
    
    if (selectiveRadio.checked) {
        groupManagement.style.display = 'block';
    } else {
        groupManagement.style.display = 'none';
    }
}

function populateFacebookGroupsList(): void {
    const container = document.getElementById('facebook-groups-list') as HTMLElement;
    const groups = currentSettings.allowedFacebookGroups || [];
    
    if (groups.length === 0) {
        container.innerHTML = `
            <div class="facebook-groups-empty">
                <div class="empty-icon">👥</div>
                <div>No Facebook groups configured</div>
                <div style="font-size: 11px; margin-top: 4px;">Add groups manually or visit Facebook groups to be prompted automatically</div>
            </div>
        `;
        return;
    }
    
    // Add header with count and bulk actions
    const headerHtml = `
        <div class="facebook-bulk-actions">
            <span class="facebook-groups-count">${groups.length} group${groups.length !== 1 ? 's' : ''} configured</span>
            <button type="button" id="clear-all-groups">Clear All</button>
        </div>
    `;
    
    const groupsHtml = groups.map(groupId => `
        <div class="facebook-group-item" data-group-id="${groupId}">
            <div class="facebook-group-info">
                <div class="facebook-group-id">${groupId}</div>
                <div class="facebook-group-url">facebook.com/groups/${groupId}</div>
            </div>
            <div class="facebook-group-actions">
                <button type="button" class="remove-group-btn" data-group-id="${groupId}">Remove</button>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = headerHtml + groupsHtml;
    
    // Add event listeners for remove buttons
    container.querySelectorAll('.remove-group-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const groupId = (e.target as HTMLElement).getAttribute('data-group-id');
            if (groupId) {
                removeFacebookGroup(groupId);
            }
        });
    });
    
    // Add event listener for clear all button
    const clearAllBtn = container.querySelector('#clear-all-groups');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', clearAllFacebookGroups);
    }
}

function addFacebookGroup(): void {
    const input = document.getElementById('facebook-group-id') as HTMLInputElement;
    const value = input.value.trim();
    
    if (!value) {
        showFieldError('facebook-group-id', 'Please enter a Facebook group ID or URL');
        return;
    }
    
    const groupId = extractFacebookGroupId(value);
    if (!groupId) {
        showFieldError('facebook-group-id', 'Invalid Facebook group ID or URL format');
        return;
    }
    
    // Check if group already exists
    if (currentSettings.allowedFacebookGroups.includes(groupId)) {
        showFieldError('facebook-group-id', 'This group is already in your list');
        return;
    }
    
    // Add group to settings
    currentSettings.allowedFacebookGroups.push(groupId);
    
    // Clear input and refresh list
    input.value = '';
    input.classList.remove('error', 'success');
    populateFacebookGroupsList();
    
    // Show success feedback
    input.classList.add('success');
    setTimeout(() => {
        input.classList.remove('success');
    }, 2000);
    
    showSuccess(`Facebook group ${groupId} added successfully`);
}

function removeFacebookGroup(groupId: string): void {
    const index = currentSettings.allowedFacebookGroups.indexOf(groupId);
    if (index > -1) {
        currentSettings.allowedFacebookGroups.splice(index, 1);
        populateFacebookGroupsList();
        showSuccess(`Facebook group ${groupId} removed`);
    }
}

function clearAllFacebookGroups(): void {
    if (confirm('Remove all Facebook groups from the allowed list?')) {
        currentSettings.allowedFacebookGroups = [];
        populateFacebookGroupsList();
        showSuccess('All Facebook groups cleared');
    }
}

function extractFacebookGroupId(input: string): string | null {
    // Remove whitespace
    const trimmed = input.trim();
    
    // If it's just numbers, assume it's a group ID
    if (/^\d+$/.test(trimmed)) {
        return trimmed;
    }
    
    // Try to extract from Facebook URL patterns
    const urlPatterns = [
        /facebook\.com\/groups\/(\d+)/i,
        /fb\.com\/groups\/(\d+)/i,
        /m\.facebook\.com\/groups\/(\d+)/i,
        /www\.facebook\.com\/groups\/(\d+)/i
    ];
    
    for (const pattern of urlPatterns) {
        const match = trimmed.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }
    
    return null;
}

function validateFacebookGroupId(groupId: string): boolean {
    // Facebook group IDs are typically 15-16 digit numbers
    return /^\d{10,20}$/.test(groupId);
}

function setupEventListeners(): void {
    // Wallet type radio buttons
    const builtinRadio = document.getElementById('builtin-wallet') as HTMLInputElement;
    const customRadio = document.getElementById('custom-wallet') as HTMLInputElement;
    const customLnurlInput = document.getElementById('custom-lnurl') as HTMLInputElement;
    
    builtinRadio.addEventListener('change', () => {
        customLnurlInput.disabled = true;
        customLnurlInput.value = '';
        customLnurlInput.classList.remove('error');
    });
    
    customRadio.addEventListener('change', () => {
        customLnurlInput.disabled = false;
        customLnurlInput.focus();
    });
    
    // Real-time LNURL validation
    customLnurlInput.addEventListener('input', () => {
        const value = customLnurlInput.value.trim();
        if (value && !customRadio.checked) return; // Only validate if custom wallet is selected
        
        if (value && !isValidLNURL(value)) {
            customLnurlInput.classList.add('error');
            customLnurlInput.title = 'Invalid LNURL format';
        } else {
            customLnurlInput.classList.remove('error');
            customLnurlInput.title = '';
        }
    });
    
    // Real-time amount validation
    setupAmountValidation('post');
    setupAmountValidation('tip');
    
    // Save settings button
    const saveBtn = document.getElementById('save-settings') as HTMLButtonElement;
    saveBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        // Disable button during save
        saveBtn.disabled = true;
        saveBtn.classList.add('loading');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = 'Saving...';
        
        try {
            await saveSettings();
        } finally {
            // Re-enable button
            saveBtn.disabled = false;
            saveBtn.classList.remove('loading');
            saveBtn.textContent = originalText;
        }
    });
    
    // Reset settings button
    const resetBtn = document.getElementById('reset-settings') as HTMLButtonElement;
    resetBtn.addEventListener('click', resetSettings);
    
    // Help button
    const helpBtn = document.getElementById('help-button') as HTMLButtonElement;
    helpBtn.addEventListener('click', showSettingsHelp);
    
    // Facebook group management
    const globalRadio = document.getElementById('facebook-global') as HTMLInputElement;
    const selectiveRadio = document.getElementById('facebook-selective') as HTMLInputElement;
    const addGroupBtn = document.getElementById('add-facebook-group') as HTMLButtonElement;
    const groupIdInput = document.getElementById('facebook-group-id') as HTMLInputElement;
    
    globalRadio.addEventListener('change', updateFacebookGroupManagementVisibility);
    selectiveRadio.addEventListener('change', updateFacebookGroupManagementVisibility);
    
    addGroupBtn.addEventListener('click', addFacebookGroup);
    
    groupIdInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addFacebookGroup();
        }
    });
    
    groupIdInput.addEventListener('input', () => {
        const value = groupIdInput.value.trim();
        groupIdInput.classList.remove('error', 'success');
        
        if (value) {
            const groupId = extractFacebookGroupId(value);
            if (groupId && validateFacebookGroupId(groupId)) {
                if (!currentSettings.allowedFacebookGroups.includes(groupId)) {
                    groupIdInput.classList.add('success');
                    groupIdInput.title = `Valid group ID: ${groupId}`;
                } else {
                    groupIdInput.classList.add('error');
                    groupIdInput.title = 'This group is already in your list';
                }
            } else if (value.length > 5) {
                groupIdInput.classList.add('error');
                groupIdInput.title = 'Invalid Facebook group ID or URL format';
            }
        } else {
            groupIdInput.title = '';
        }
    });
    
    // Auto-save on certain changes (optional)
    const autoSaveElements = [
        'floating-menu-enabled',
        'autolock-timeout'
    ];
    
    autoSaveElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', () => {
                // Debounce auto-save
                clearTimeout((window as any).autoSaveTimeout);
                (window as any).autoSaveTimeout = setTimeout(() => {
                    console.log('Auto-saving settings...');
                    saveSettings();
                }, 1000);
            });
        }
    });
}

function setupAmountValidation(type: 'post' | 'tip'): void {
    for (let i = 1; i <= 3; i++) {
        const input = document.getElementById(`${type}-amount-${i}`) as HTMLInputElement;
        
        input.addEventListener('input', () => {
            const value = input.value.trim();
            input.classList.remove('error');
            
            if (value) {
                const numValue = parseInt(value);
                
                if (isNaN(numValue) || numValue <= 0) {
                    input.classList.add('error');
                    input.title = 'Must be a positive number';
                } else if (numValue > 100000000) {
                    input.classList.add('error');
                    input.title = 'Maximum 100,000,000 sats';
                } else {
                    input.title = '';
                }
            }
        });
        
        // Prevent invalid characters
        input.addEventListener('keypress', (e) => {
            // Allow: backspace, delete, tab, escape, enter, decimal point
            if ([46, 8, 9, 27, 13, 110, 190].indexOf(e.keyCode) !== -1 ||
                // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
                (e.keyCode === 65 && e.ctrlKey === true) ||
                (e.keyCode === 67 && e.ctrlKey === true) ||
                (e.keyCode === 86 && e.ctrlKey === true) ||
                (e.keyCode === 88 && e.ctrlKey === true)) {
                return;
            }
            // Ensure that it is a number and stop the keypress
            if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
                e.preventDefault();
            }
        });
    }
}

async function saveSettings(): Promise<void> {
    try {
        const builtinRadio = document.getElementById('builtin-wallet') as HTMLInputElement;
        const customLnurlInput = document.getElementById('custom-lnurl') as HTMLInputElement;
        
        // Clear any existing error states
        clearFieldErrors();
        
        // Validate wallet configuration
        const walletValidation = validateWalletConfiguration(builtinRadio.checked, customLnurlInput.value);
        if (!walletValidation.isValid) {
            showFieldError('custom-lnurl', walletValidation.error!);
            showError(walletValidation.error!);
            return;
        }
        
        // Validate and collect posting amounts
        const postingAmounts = validateAmounts('posting');
        if (!postingAmounts.isValid) {
            showError(postingAmounts.error!);
            return;
        }
        
        // Validate and collect tipping amounts
        const tippingAmounts = validateAmounts('tipping');
        if (!tippingAmounts.isValid) {
            showError(tippingAmounts.error!);
            return;
        }
        
        // Validate auto-lock timeout
        const autoLockTimeout = validateAutoLockTimeout();
        if (!autoLockTimeout.isValid) {
            showError(autoLockTimeout.error!);
            return;
        }
        
        // Get Facebook settings
        const facebookGlobalRadio = document.getElementById('facebook-global') as HTMLInputElement;
        
        // Collect settings
        const newSettings: UserSettings = {
            useBuiltInWallet: builtinRadio.checked,
            customLNURL: builtinRadio.checked ? undefined : customLnurlInput.value.trim() || undefined,
            defaultPostingAmounts: postingAmounts.amounts!,
            defaultTippingAmounts: tippingAmounts.amounts!,
            floatingMenuEnabled: (document.getElementById('floating-menu-enabled') as HTMLInputElement).checked,
            autoLockTimeout: autoLockTimeout.timeout!,
            facebookPostingMode: facebookGlobalRadio.checked ? 'global' : 'selective',
            allowedFacebookGroups: [...currentSettings.allowedFacebookGroups],
            deniedFacebookGroups: [...currentSettings.deniedFacebookGroups]
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
        showError('Failed to save settings: ' + (error instanceof Error ? error.message : 'Unknown error'));
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
    // Enhanced LNURL validation
    if (!lnurl || typeof lnurl !== 'string') {
        return false;
    }
    
    const trimmed = lnurl.trim();
    
    // Check if it starts with lnurl (case insensitive)
    if (!trimmed.toLowerCase().startsWith('lnurl')) {
        return false;
    }
    
    // Check minimum length (LNURL should be at least 50+ characters)
    if (trimmed.length < 50) {
        return false;
    }
    
    // Check if it contains only valid bech32 characters after 'lnurl'
    const lnurlPart = trimmed.substring(5); // Remove 'lnurl' prefix
    const validBech32Chars = /^[023456789acdefghjklmnpqrstuvwxyz]+$/;
    
    return validBech32Chars.test(lnurlPart);
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

// Enhanced validation functions
interface ValidationResult {
    isValid: boolean;
    error?: string;
    amounts?: [number, number, number];
    timeout?: number;
}

function validateWalletConfiguration(useBuiltIn: boolean, customLnurl: string): ValidationResult {
    if (useBuiltIn) {
        return { isValid: true };
    }
    
    // Custom LNURL is required when not using built-in wallet
    if (!customLnurl || !customLnurl.trim()) {
        return { 
            isValid: false, 
            error: 'Custom LNURL is required when not using built-in wallet' 
        };
    }
    
    const trimmedLnurl = customLnurl.trim();
    
    if (!isValidLNURL(trimmedLnurl)) {
        return { 
            isValid: false, 
            error: 'Invalid LNURL format. Please enter a valid LNURL starting with "lnurl" and containing valid bech32 characters.' 
        };
    }
    
    return { isValid: true };
}

function validateAmounts(type: 'posting' | 'tipping'): ValidationResult {
    const prefix = type === 'posting' ? 'post' : 'tip';
    const amounts: number[] = [];
    
    for (let i = 1; i <= 3; i++) {
        const input = document.getElementById(`${prefix}-amount-${i}`) as HTMLInputElement;
        const value = input.value.trim();
        
        // Clear any existing error state
        input.classList.remove('error');
        
        if (!value) {
            showFieldError(`${prefix}-amount-${i}`, 'Amount is required');
            return { 
                isValid: false, 
                error: `${type === 'posting' ? 'Posting' : 'Tipping'} amount ${i} is required` 
            };
        }
        
        const numValue = parseInt(value);
        
        if (isNaN(numValue)) {
            showFieldError(`${prefix}-amount-${i}`, 'Must be a valid number');
            return { 
                isValid: false, 
                error: `${type === 'posting' ? 'Posting' : 'Tipping'} amount ${i} must be a valid number` 
            };
        }
        
        if (numValue <= 0) {
            showFieldError(`${prefix}-amount-${i}`, 'Must be greater than 0');
            return { 
                isValid: false, 
                error: `${type === 'posting' ? 'Posting' : 'Tipping'} amount ${i} must be greater than 0` 
            };
        }
        
        if (numValue > 100000000) { // 1 BTC in sats
            showFieldError(`${prefix}-amount-${i}`, 'Amount too large (max 100M sats)');
            return { 
                isValid: false, 
                error: `${type === 'posting' ? 'Posting' : 'Tipping'} amount ${i} is too large (maximum 100,000,000 sats)` 
            };
        }
        
        amounts.push(numValue);
    }
    
    // Check for duplicate amounts
    const uniqueAmounts = new Set(amounts);
    if (uniqueAmounts.size !== amounts.length) {
        // Highlight duplicate fields
        const duplicates = amounts.filter((amount, index) => amounts.indexOf(amount) !== index);
        duplicates.forEach(duplicate => {
            const duplicateIndex = amounts.indexOf(duplicate);
            if (duplicateIndex !== -1) {
                showFieldError(`${prefix}-amount-${duplicateIndex + 1}`, 'Duplicate amount');
            }
        });
        
        return { 
            isValid: false, 
            error: `${type === 'posting' ? 'Posting' : 'Tipping'} amounts must be unique` 
        };
    }
    
    // Check if amounts are in ascending order (recommended)
    const sortedAmounts = [...amounts].sort((a, b) => a - b);
    if (JSON.stringify(amounts) !== JSON.stringify(sortedAmounts)) {
        // This is just a warning, not an error
        console.warn(`${type} amounts are not in ascending order. Consider ordering them from smallest to largest for better UX.`);
    }
    
    return { 
        isValid: true, 
        amounts: amounts as [number, number, number] 
    };
}

function validateAutoLockTimeout(): ValidationResult {
    const select = document.getElementById('autolock-timeout') as HTMLSelectElement;
    const value = select.value;
    
    if (!value && value !== '0') {
        return { 
            isValid: false, 
            error: 'Auto-lock timeout is required' 
        };
    }
    
    const timeout = parseInt(value);
    
    if (isNaN(timeout)) {
        return { 
            isValid: false, 
            error: 'Auto-lock timeout must be a valid number' 
        };
    }
    
    if (timeout < 0) {
        return { 
            isValid: false, 
            error: 'Auto-lock timeout cannot be negative' 
        };
    }
    
    // Maximum 24 hours (86400 seconds)
    if (timeout > 86400) {
        return { 
            isValid: false, 
            error: 'Auto-lock timeout cannot exceed 24 hours' 
        };
    }
    
    return { 
        isValid: true, 
        timeout 
    };
}

function showFieldError(fieldId: string, message: string): void {
    const field = document.getElementById(fieldId) as HTMLInputElement;
    if (field) {
        field.classList.add('error');
        field.title = message;
        
        // Remove error state after user starts typing
        const clearError = () => {
            field.classList.remove('error');
            field.title = '';
            field.removeEventListener('input', clearError);
        };
        field.addEventListener('input', clearError);
    }
}

function clearFieldErrors(): void {
    const errorFields = document.querySelectorAll('.error');
    errorFields.forEach(field => {
        field.classList.remove('error');
        (field as HTMLElement).title = '';
    });
}

// Additional helper functions
function formatSatsAmount(sats: number): string {
    if (sats >= 100000000) {
        return `${(sats / 100000000).toFixed(2)} BTC`;
    } else if (sats >= 1000) {
        return `${(sats / 1000).toFixed(1)}k sats`;
    } else {
        return `${sats} sats`;
    }
}

function addAmountFormatting(): void {
    const amountInputs = document.querySelectorAll('input[type="number"][id*="amount"]');
    
    amountInputs.forEach(input => {
        const inputEl = input as HTMLInputElement;
        
        inputEl.addEventListener('blur', () => {
            const value = parseInt(inputEl.value);
            if (!isNaN(value) && value > 0) {
                // Add formatted display next to input
                let display = inputEl.nextElementSibling;
                if (!display || !display.classList.contains('amount-display')) {
                    display = document.createElement('span');
                    display.className = 'amount-display';
                    (display as HTMLElement).style.cssText = 'font-size: 11px; color: #666; margin-left: 8px;';
                    inputEl.parentNode?.insertBefore(display, inputEl.nextSibling);
                }
                display.textContent = `(${formatSatsAmount(value)})`;
            }
        });
    });
}

function showSettingsHelp(): void {
    const helpText = `
Settings Help:

WALLET CONFIGURATION:
• Built-in Wallet: Recommended for most users. Uses Breez SDK for full Lightning functionality.
• Custom LNURL: For advanced users with existing Lightning wallets or services.

AMOUNTS:
• Posting Amounts: Suggested tip amounts included in your posts/comments.
• Tipping Amounts: Your preferred amounts when tipping others.
• All amounts are in satoshis (sats). 1 BTC = 100,000,000 sats.

SECURITY:
• Auto-lock: Automatically locks wallet after inactivity.
• Shorter timeouts are more secure but less convenient.

Need help? Check the extension documentation or contact support.
    `;
    
    alert(helpText);
}

// Enhanced debug functions
(window as any).debugSettings = {
    getCurrentSettings: () => currentSettings,
    loadSettings: loadSettings,
    validateCurrentForm: () => {
        const builtinRadio = document.getElementById('builtin-wallet') as HTMLInputElement;
        const customLnurlInput = document.getElementById('custom-lnurl') as HTMLInputElement;
        
        console.log('Wallet validation:', validateWalletConfiguration(builtinRadio.checked, customLnurlInput.value));
        console.log('Posting amounts validation:', validateAmounts('posting'));
        console.log('Tipping amounts validation:', validateAmounts('tipping'));
        console.log('Auto-lock validation:', validateAutoLockTimeout());
    },
    testStorage: async () => {
        const result = await chrome.storage.local.get(['userSettings']);
        console.log('Raw storage result:', result);
        return result;
    },
    showHelp: showSettingsHelp,
    formatSats: formatSatsAmount
};

// Initialize amount formatting when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(addAmountFormatting, 100);
});