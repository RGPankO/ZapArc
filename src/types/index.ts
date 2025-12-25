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
 * Multi-wallet storage structure (v1 - flat wallet list)
 */
export interface MultiWalletStorage {
  wallets: EncryptedWalletEntry[];  // All wallet entries
  activeWalletId: string;           // Currently selected wallet UUID
  walletOrder: string[];            // User-defined wallet ordering (UUIDs)
  version: number;                  // Schema version (1 for multi-wallet)
}

// =============================================================================
// Hierarchical Multi-Key Multi-Wallet Types (v2)
// =============================================================================

/**
 * Encrypted data structure for storing sensitive information
 */
export interface EncryptedData {
  data: number[];      // AES-GCM encrypted data
  iv: number[];        // Initialization vector (12 bytes)
  timestamp: number;   // Encryption timestamp for integrity check
}

/**
 * Sub-wallet entry within a master key
 * Mnemonic is derived by modifying the master key's 11th word
 */
export interface SubWalletEntry {
  index: number;       // Sub-wallet index (0-19), determines 11th word offset
  nickname: string;    // User-friendly name (e.g., "Sub-Wallet 1", "Savings")
  createdAt: number;   // Timestamp of sub-wallet creation
  lastUsedAt: number;  // Timestamp of last usage
  // Note: Mnemonic is derived by incrementing master key's 11th word by `index`
  //       and recalculating the 12th word (checksum)
}

/**
 * Master key entry containing the root mnemonic and derived sub-wallets
 */
export interface MasterKeyEntry {
  id: string;                        // UUID for stable identification
  nickname: string;                  // User-friendly name (e.g., "Main Wallet")
  encryptedMnemonic: EncryptedData;  // The master mnemonic (encrypted)
  createdAt: number;                 // Timestamp of master key creation
  lastUsedAt: number;                // Timestamp of last usage
  subWallets: SubWalletEntry[];      // Array of derived sub-wallets
  isExpanded: boolean;               // UI state: is this master key expanded in dropdown?
}

/**
 * Hierarchical multi-key multi-wallet storage structure (v2)
 *
 * Architecture:
 * - Multiple master keys (each with its own mnemonic)
 * - Each master key can have multiple sub-wallets (max 20)
 * - Sub-wallets are derived by modifying the 11th word and recalculating checksum
 */
export interface HierarchicalWalletStorage {
  version: 2;                        // Schema version (2 for hierarchical)
  masterKeys: MasterKeyEntry[];      // All master key entries
  activeMasterKeyId: string;         // Currently selected master key UUID
  activeSubWalletIndex: number;      // Which sub-wallet within the master key (0-19)
  masterKeyOrder: string[];          // User-defined master key ordering (UUIDs)
}

/**
 * Metadata for a master key (for UI display without decryption)
 */
export interface MasterKeyMetadata {
  id: string;
  nickname: string;
  createdAt: number;
  lastUsedAt: number;
  subWalletCount: number;
  isExpanded: boolean;
}

/**
 * Combined metadata for active wallet identification
 */
export interface ActiveWalletInfo {
  masterKeyId: string;
  masterKeyNickname: string;
  subWalletIndex: number;
  subWalletNickname: string;
}

/**
 * Result of sub-wallet discovery scan
 */
export interface DiscoveryResult {
  index: number;           // Sub-wallet index (0-19)
  balance: number;         // Balance in sats
  isAlreadyAdded: boolean; // Whether this index is already in subWallets array
}

/**
 * Progress update during sub-wallet discovery
 */
export interface DiscoveryProgress {
  currentIndex: number;    // Currently scanning index
  totalToScan: number;     // Total indices to scan (20)
  results: DiscoveryResult[];
}

// Constants for hierarchical wallet system
export const HIERARCHICAL_WALLET_CONSTANTS = {
  MAX_MASTER_KEYS: 10,
  MAX_SUB_WALLETS: 20,
  BIP39_WORDLIST_SIZE: 2048,
  STORAGE_VERSION: 2,
} as const;

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