// Shared state and constants for popup modules
// This module centralizes all state to avoid circular dependencies

import type { BreezSdk } from '@breeztech/breez-sdk-spark/web';
import type { WalletMetadata, MasterKeyMetadata, SubWalletEntry } from '../types';
import * as bip39 from 'bip39';

// ========================================
// Constants
// ========================================

export const POPUP_INSTANCE_KEY = 'activePopupInstance';
export const BREEZ_API_KEY = 'MIIBfjCCATCgAwIBAgIHPoqCRCUxZzAFBgMrZXAwEDEOMAwGA1UEAxMFQnJlZXowHhcNMjUxMDEzMTY0NzQ0WhcNMzUxMDExMTY0NzQ0WjAwMRUwEwYDVQQKEwxCVEMgSE9ETCBMdGQxFzAVBgNVBAMTDlBsYW1lbiBBbmRvbm92MCowBQYDK2VwAyEA0IP1y98gPByiIMoph1P0G6cctLb864rNXw1LRLOpXXejgYgwgYUwDgYDVR0PAQH/BAQDAgWgMAwGA1UdEwEB/wQCMAAwHQYDVR0OBBYEFNo5o+5ea0sNMlW/75VgGJCv2AcJMB8GA1UdIwQYMBaAFN6q1pJW843ndJIW/Ey2ILJrKJhrMCUGA1UdEQQeMByBGnBsYW1lbkBjcnlwdG9yZXZvbHV0aW9uLmJnMAUGAytlcANBAOxPxCDCzt/batCHrDuIMNsZL0lqBpk/dG+MzqseJRS8UjhJsSpOO4jTtsMqS7DWJE64THyIV+FTCbt1XhUM2A4=';
export const SESSION_KEY_IS_ADDING_WALLET = 'tipmaster_isAddingWallet';
export const SESSION_KEY_IS_IMPORTING_WALLET = 'tipmaster_isImportingWallet';
export const BIP39_WORDS: string[] = bip39.wordlists.english;

// ========================================
// Popup Instance
// ========================================

export const popupInstanceId = `popup_${Date.now()}_${Math.random().toString(36).substring(7)}`;

// ========================================
// State Variables
// ========================================

// DOM elements (set dynamically)
export let balanceElement: HTMLElement | null = null;
export let depositBtn: HTMLButtonElement | null = null;
export let withdrawBtn: HTMLButtonElement | null = null;
export let settingsBtn: HTMLButtonElement | null = null;

// Core wallet state
export let currentBalance = 0;
export let isWalletUnlocked = false;
export let preparedPayment: any = null;

// Multi-wallet state (v1 - flat list, kept for backward compatibility)
export let currentWallets: WalletMetadata[] = [];
export let activeWalletId: string | null = null;
export let isWalletSelectorOpen = false;

// Hierarchical multi-wallet state (v2 - master keys with sub-wallets)
export let masterKeys: MasterKeyMetadata[] = [];
export let activeMasterKeyId: string | null = null;
export let activeSubWalletIndex: number = 0;
export let expandedMasterKeys: Set<string> = new Set();
export let isHierarchicalMode: boolean = false; // true when using v2 storage

// Breez SDK state
export let breezSDK: BreezSdk | null = null;
export let isSDKInitialized = false;

// Wizard state
export let generatedMnemonic: string = '';
export let mnemonicWords: string[] = [];
export let selectedWords: string[] = [];
export let userPin: string = '';
export let sessionPin: string | null = null;
export let isAddingWallet: boolean = false;
export let isImportingWallet: boolean = false;

// Event listener guard
export let eventListenersSetup = false;

// Wallet management state
export let renameWalletId: string | null = null;
export let renameWalletCurrentName: string | null = null;
export let isRenameSaving = false;

// Payment monitoring
export let paymentMonitoringInterval: NodeJS.Timeout | null = null;
export let invoiceExpiryTime: number = 0;

// Auto-lock
export let autoLockController: AbortController | null = null;

// ========================================
// State Setters (for mutable state)
// ========================================

export function setBalanceElement(el: HTMLElement | null): void {
    balanceElement = el;
}

export function setDepositBtn(btn: HTMLButtonElement | null): void {
    depositBtn = btn;
}

export function setWithdrawBtn(btn: HTMLButtonElement | null): void {
    withdrawBtn = btn;
}

export function setSettingsBtn(btn: HTMLButtonElement | null): void {
    settingsBtn = btn;
}

export function setCurrentBalance(balance: number): void {
    currentBalance = balance;
}

export function setIsWalletUnlocked(unlocked: boolean): void {
    isWalletUnlocked = unlocked;
}

export function setPreparedPayment(payment: any): void {
    preparedPayment = payment;
}

export function setCurrentWallets(wallets: WalletMetadata[]): void {
    currentWallets = wallets;
}

export function setActiveWalletId(id: string | null): void {
    activeWalletId = id;
}

export function setIsWalletSelectorOpen(open: boolean): void {
    isWalletSelectorOpen = open;
}

// Hierarchical wallet setters
export function setMasterKeys(keys: MasterKeyMetadata[]): void {
    masterKeys = keys;
}

export function getMasterKeys(): MasterKeyMetadata[] {
    return masterKeys;
}

export function setActiveMasterKeyId(id: string | null): void {
    activeMasterKeyId = id;
}

export function setActiveSubWalletIndex(index: number): void {
    activeSubWalletIndex = index;
}

export function setExpandedMasterKeys(keys: Set<string>): void {
    expandedMasterKeys = keys;
}

export function toggleMasterKeyExpanded(keyId: string): void {
    if (expandedMasterKeys.has(keyId)) {
        expandedMasterKeys.delete(keyId);
    } else {
        expandedMasterKeys.add(keyId);
    }
    // Create new Set to trigger reactivity if needed
    expandedMasterKeys = new Set(expandedMasterKeys);
}

export function setIsHierarchicalMode(mode: boolean): void {
    isHierarchicalMode = mode;
}

export function setBreezSDK(sdk: BreezSdk | null): void {
    breezSDK = sdk;
}

export function setIsSDKInitialized(initialized: boolean): void {
    isSDKInitialized = initialized;
}

export function setGeneratedMnemonic(mnemonic: string): void {
    generatedMnemonic = mnemonic;
}

export function setMnemonicWords(words: string[]): void {
    mnemonicWords = words;
}

export function setSelectedWords(words: string[]): void {
    selectedWords = words;
}

export function setUserPin(pin: string): void {
    userPin = pin;
}

export function setSessionPin(pin: string | null): void {
    sessionPin = pin;
}

export function setEventListenersSetup(setup: boolean): void {
    eventListenersSetup = setup;
}

export function setRenameWalletId(id: string | null): void {
    renameWalletId = id;
}

export function setRenameWalletCurrentName(name: string | null): void {
    renameWalletCurrentName = name;
}

export function setIsRenameSaving(saving: boolean): void {
    isRenameSaving = saving;
}

export function setPaymentMonitoringInterval(interval: NodeJS.Timeout | null): void {
    paymentMonitoringInterval = interval;
}

export function setInvoiceExpiryTime(time: number): void {
    invoiceExpiryTime = time;
}

export function setAutoLockController(controller: AbortController | null): void {
    autoLockController = controller;
}

// ========================================
// Session Storage Helpers
// ========================================

export function getIsAddingWallet(): boolean {
    return sessionStorage.getItem(SESSION_KEY_IS_ADDING_WALLET) === 'true';
}

export function setIsAddingWallet(value: boolean): void {
    if (value) {
        sessionStorage.setItem(SESSION_KEY_IS_ADDING_WALLET, 'true');
    } else {
        sessionStorage.removeItem(SESSION_KEY_IS_ADDING_WALLET);
    }
    isAddingWallet = value;
}

export function getIsImportingWallet(): boolean {
    return sessionStorage.getItem(SESSION_KEY_IS_IMPORTING_WALLET) === 'true';
}

export function setIsImportingWallet(value: boolean): void {
    if (value) {
        sessionStorage.setItem(SESSION_KEY_IS_IMPORTING_WALLET, 'true');
    } else {
        sessionStorage.removeItem(SESSION_KEY_IS_IMPORTING_WALLET);
    }
    isImportingWallet = value;
}

// ========================================
// Hierarchical Wallet Helpers
// ========================================

/**
 * Gets the currently active master key metadata
 * @returns MasterKeyMetadata or null if none active
 */
export function getActiveMasterKey(): MasterKeyMetadata | null {
    if (!activeMasterKeyId || masterKeys.length === 0) {
        return null;
    }
    return masterKeys.find(mk => mk.id === activeMasterKeyId) || null;
}

/**
 * Gets the display name for the currently active wallet
 * Format: "Master Key Name > Sub-Wallet Name" or just "Master Key Name" if only one sub-wallet
 */
export function getActiveWalletDisplayName(): string {
    const masterKey = getActiveMasterKey();
    if (!masterKey) {
        // Fallback to v1 display
        if (activeWalletId && currentWallets.length > 0) {
            const wallet = currentWallets.find(w => w.id === activeWalletId);
            return wallet?.nickname || 'Wallet';
        }
        return 'No Wallet';
    }

    // For now, just return the master key name
    // Sub-wallet names will be fetched from storage when needed
    return masterKey.nickname;
}

/**
 * Gets info about the active wallet for SDK operations
 */
export function getActiveWalletInfo(): { masterKeyId: string; subWalletIndex: number } | null {
    if (!activeMasterKeyId) {
        return null;
    }
    return {
        masterKeyId: activeMasterKeyId,
        subWalletIndex: activeSubWalletIndex,
    };
}

/**
 * Checks if a master key is expanded in the UI
 */
export function isMasterKeyExpanded(keyId: string): boolean {
    return expandedMasterKeys.has(keyId);
}

/**
 * Gets the total number of sub-wallets across all master keys
 */
export function getTotalSubWalletCount(): number {
    return masterKeys.reduce((sum, mk) => sum + mk.subWalletCount, 0);
}
