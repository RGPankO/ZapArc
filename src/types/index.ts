// Type definitions for Lightning Network Tipping Extension

export interface TipRequest {
  lnurl: string;
  suggestedAmounts: [number, number, number];
  source: 'text' | 'metadata';
  element?: HTMLElement;
  isBlacklisted: boolean;
}

export interface WalletData {
  mnemonic: string;
  lnurl?: string;
  customLNURL?: string;
  balance: number;
  transactions: Transaction[];
}

export interface UserSettings {
  defaultPostingAmounts: [number, number, number];
  defaultTippingAmounts: [number, number, number];
  customLNURL?: string;
  useBuiltInWallet: boolean;
  floatingMenuEnabled: boolean;
  autoLockTimeout: number;
}

export interface DomainSettings {
  [domain: string]: DomainStatus;
}

export enum DomainStatus {
  UNMANAGED = 'unmanaged',
  WHITELISTED = 'whitelisted',
  DISABLED = 'disabled'
}

export interface BlacklistData {
  lnurls: string[];
  lastUpdated: number;
}

export interface Transaction {
  id: string;
  type: 'send' | 'receive';
  amount: number;
  description?: string;
  timestamp: number;
  status: 'pending' | 'completed' | 'failed';
}

export interface PostingContext {
  element: HTMLElement;
  platform: string;
  type: 'post' | 'comment' | 'reply';
}

// Chrome Storage Schema
export interface ChromeStorageSchema {
  encryptedWallet: string;
  userSettings: UserSettings;
  domainSettings: DomainSettings;
  blacklistData: BlacklistData;
  isUnlocked: boolean;
  lastActivity: number;
}

// Message types for communication between components
export interface ContentMessage {
  type: 'TIP_DETECTED' | 'POSTING_CONTEXT' | 'DOMAIN_STATUS';
  data: any;
}

export interface PopupMessage {
  type: 'GET_BALANCE' | 'DEPOSIT' | 'WITHDRAW' | 'GET_SETTINGS';
  data: any;
}

export interface FloatingMessage {
  type: 'QUICK_DEPOSIT' | 'COPY_TIP_STRING' | 'DOMAIN_TOGGLE';
  data: any;
}