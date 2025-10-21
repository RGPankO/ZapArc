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

// Multi-Wallet Support Interfaces
/**
 * Metadata for a wallet entry (unencrypted for fast UI access)
 */
export interface WalletMetadata {
  id: string;                    // UUID for stable identification
  nickname: string;              // User-friendly name ("Wallet 1", "Wallet 2")
  createdAt: number;            // Timestamp of wallet creation
  lastUsedAt: number;           // Timestamp of last wallet usage
  colorTag?: string;            // Optional UI color tag
}

/**
 * Encrypted wallet entry with metadata
 */
export interface EncryptedWalletEntry {
  metadata: WalletMetadata;     // Unencrypted metadata
  encryptedMnemonic: {
    data: number[];             // Encrypted mnemonic data
    iv: number[];               // Initialization vector
    timestamp: number;          // Encryption timestamp for integrity check
  };
}

/**
 * Multi-wallet storage structure
 */
export interface MultiWalletStorage {
  wallets: EncryptedWalletEntry[];  // All wallet entries
  activeWalletId: string;           // Currently selected wallet UUID
  walletOrder: string[];            // User-defined wallet ordering (UUIDs)
  version: number;                  // Schema version (1 for multi-wallet)
}

export interface UserSettings {
  defaultPostingAmounts: [number, number, number];
  defaultTippingAmounts: [number, number, number];
  customLNURL?: string;
  useBuiltInWallet: boolean;
  floatingMenuEnabled: boolean;
  autoLockTimeout: number;
  // Facebook group management settings
  facebookPostingMode: 'global' | 'selective';
  allowedFacebookGroups: string[];
  deniedFacebookGroups: string[];
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
  confidence?: number;
  groupId?: string;
  subreddit?: string;
}

// Chrome Storage Schema
export interface ChromeStorageSchema {
  encryptedWallet: string;       // Legacy single wallet (for migration)
  multiWalletData: string;       // New multi-wallet structure (JSON.stringify(MultiWalletStorage))
  walletVersion: number;         // Schema version (1 for multi-wallet)
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