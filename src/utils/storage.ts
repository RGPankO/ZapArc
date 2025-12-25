// Storage utilities for Chrome Extension
// Handles encrypted storage, settings, and data management

import {
  WalletData,
  UserSettings,
  DomainSettings,
  BlacklistData,
  EncryptedWalletEntry,
  WalletMetadata,
  MultiWalletStorage,
  // Hierarchical wallet types (v2)
  HierarchicalWalletStorage,
  MasterKeyEntry,
  SubWalletEntry,
  MasterKeyMetadata,
  EncryptedData,
  HIERARCHICAL_WALLET_CONSTANTS
} from '../types';

/**
 * Generate a UUID v4 string
 * Uses crypto.randomUUID() with fallback to manual generation
 */
export function generateUUID(): string {
  // Modern browsers and Node.js 14.17+ support crypto.randomUUID()
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback for older environments
  // Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export class ChromeStorageManager {
  private static readonly SALT = 'lightning-tipping-salt';
  private static readonly ITERATIONS = 100000;

  /**
   * Encrypt and save wallet data using user PIN
   */
  async saveEncryptedWallet(data: WalletData, pin: string): Promise<void> {
    console.log('🔵 [Storage] SAVE_ENCRYPTED_WALLET ENTRY', {
      timestamp: new Date().toISOString(),
      pinLength: pin.length,
      dataKeys: Object.keys(data),
      hasMnemonic: !!data.mnemonic,
      mnemonicWordCount: data.mnemonic ? data.mnemonic.split(' ').length : 0
    });

    try {
      const key = await this.deriveKey(pin);
      console.log('🔍 [Storage] Encryption key derived successfully');

      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encodedData = new TextEncoder().encode(JSON.stringify(data));
      console.log('🔍 [Storage] Data encoded', {
        encodedSize: encodedData.length,
        ivLength: iv.length
      });

      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encodedData
      );
      console.log('🔍 [Storage] Data encrypted', {
        encryptedSize: encrypted.byteLength
      });

      const encryptedData = {
        data: Array.from(new Uint8Array(encrypted)),
        iv: Array.from(iv)
      };

      await chrome.storage.local.set({
        encryptedWallet: JSON.stringify(encryptedData)
      });
      console.log('✅ [Storage] SAVE_ENCRYPTED_WALLET SUCCESS', {
        timestamp: new Date().toISOString(),
        savedDataSize: JSON.stringify(encryptedData).length
      });

      // Verify immediately that it was saved
      const verification = await chrome.storage.local.get(['encryptedWallet']);
      console.log('🔍 [Storage] Save verification', {
        walletExists: !!verification.encryptedWallet,
        savedSize: verification.encryptedWallet?.length
      });
    } catch (error) {
      console.error('❌ [Storage] SAVE_ENCRYPTED_WALLET FAILED', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
      throw new Error('Wallet encryption failed');
    }
  }

  /**
   * Load and decrypt wallet data using user PIN
   */
  async loadEncryptedWallet(pin: string): Promise<WalletData | null> {
    console.log('🔵 [Storage] LOAD_ENCRYPTED_WALLET ENTRY', {
      timestamp: new Date().toISOString(),
      pinLength: pin.length
    });

    try {
      const result = await chrome.storage.local.get(['encryptedWallet']);
      console.log('🔍 [Storage] Retrieved from storage', {
        walletExists: !!result.encryptedWallet,
        storageSize: result.encryptedWallet?.length
      });

      if (!result.encryptedWallet) {
        console.warn('⚠️ [Storage] No encrypted wallet found in storage');
        return null;
      }

      const encryptedData = JSON.parse(result.encryptedWallet);
      console.log('🔍 [Storage] Parsed encrypted data', {
        hasData: !!encryptedData.data,
        hasIv: !!encryptedData.iv,
        dataLength: encryptedData.data?.length,
        ivLength: encryptedData.iv?.length
      });

      const key = await this.deriveKey(pin);
      console.log('🔍 [Storage] Decryption key derived successfully');

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(encryptedData.iv) },
        key,
        new Uint8Array(encryptedData.data)
      );
      console.log('🔍 [Storage] Data decrypted', {
        decryptedSize: decrypted.byteLength
      });

      const decoder = new TextDecoder();
      const walletData = JSON.parse(decoder.decode(decrypted));
      console.log('✅ [Storage] LOAD_ENCRYPTED_WALLET SUCCESS', {
        timestamp: new Date().toISOString(),
        hasMnemonic: !!walletData.mnemonic,
        mnemonicWordCount: walletData.mnemonic ? walletData.mnemonic.split(' ').length : 0,
        balance: walletData.balance
      });

      return walletData;
    } catch (error) {
      console.error('❌ [Storage] LOAD_ENCRYPTED_WALLET FAILED', {
        error: error instanceof Error ? error.message : String(error),
        errorName: error instanceof Error ? error.name : undefined,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
        likelyPinMismatch: error instanceof Error && error.name === 'OperationError'
      });
      return null;
    }
  }

  /**
   * Save domain settings (whitelist/blacklist status)
   */
  async saveDomainSettings(domain: string, status: string): Promise<void> {
    try {
      const result = await chrome.storage.local.get(['domainSettings']);
      const domainSettings: DomainSettings = result.domainSettings || {};
      domainSettings[domain] = status as any;
      await chrome.storage.local.set({ domainSettings });
    } catch (error) {
      console.error('Failed to save domain settings:', error);
      throw error;
    }
  }

  /**
   * Get domain settings
   */
  async getDomainSettings(): Promise<DomainSettings> {
    try {
      const result = await chrome.storage.local.get(['domainSettings']);
      return result.domainSettings || {};
    } catch (error) {
      console.error('Failed to get domain settings:', error);
      return {};
    }
  }

  /**
   * Save LNURL blacklist
   */
  async saveBlacklist(lnurls: string[]): Promise<void> {
    try {
      const blacklistData: BlacklistData = {
        lnurls,
        lastUpdated: Date.now()
      };
      await chrome.storage.local.set({ blacklistData });
    } catch (error) {
      console.error('Failed to save blacklist:', error);
      throw error;
    }
  }

  /**
   * Get LNURL blacklist
   */
  async getBlacklist(): Promise<BlacklistData> {
    try {
      const result = await chrome.storage.local.get(['blacklistData']);
      return result.blacklistData || { lnurls: [], lastUpdated: 0 };
    } catch (error) {
      console.error('Failed to get blacklist:', error);
      return { lnurls: [], lastUpdated: 0 };
    }
  }

  /**
   * Get user settings with defaults
   */
  async getUserSettings(): Promise<UserSettings> {
    try {
      const result = await chrome.storage.local.get(['userSettings']);
      const defaults = this.getDefaultSettings();
      
      // Merge stored settings with defaults to ensure all fields are present
      if (result.userSettings) {
        // Properly merge settings, preserving 0 values (like autoLockTimeout: 0 for "Never")
        const merged: UserSettings = {
          defaultPostingAmounts: result.userSettings.defaultPostingAmounts || defaults.defaultPostingAmounts,
          defaultTippingAmounts: result.userSettings.defaultTippingAmounts || defaults.defaultTippingAmounts,
          useBuiltInWallet: result.userSettings.useBuiltInWallet !== undefined ? result.userSettings.useBuiltInWallet : defaults.useBuiltInWallet,
          floatingMenuEnabled: result.userSettings.floatingMenuEnabled !== undefined ? result.userSettings.floatingMenuEnabled : defaults.floatingMenuEnabled,
          autoLockTimeout: result.userSettings.autoLockTimeout !== undefined ? result.userSettings.autoLockTimeout : defaults.autoLockTimeout,
          customLNURL: result.userSettings.customLNURL !== undefined ? result.userSettings.customLNURL : defaults.customLNURL,
          facebookPostingMode: result.userSettings.facebookPostingMode || defaults.facebookPostingMode,
          allowedFacebookGroups: result.userSettings.allowedFacebookGroups || defaults.allowedFacebookGroups,
          deniedFacebookGroups: result.userSettings.deniedFacebookGroups || defaults.deniedFacebookGroups
        };
        return merged;
      }
      
      return defaults;
    } catch (error) {
      console.error('Failed to get user settings:', error);
      return this.getDefaultSettings();
    }
  }

  /**
   * Save user settings
   */
  async saveUserSettings(settings: UserSettings): Promise<void> {
    try {
      await chrome.storage.local.set({ userSettings: settings });
    } catch (error) {
      console.error('Failed to save user settings:', error);
      throw error;
    }
  }

  /**
   * Check if a wallet exists (has been set up)
   * Checks multi-wallet storage format only
   */
  async walletExists(): Promise<boolean> {
    try {
      const result = await chrome.storage.local.get(['multiWalletData', 'walletVersion']);
      const exists = !!(result.multiWalletData || result.walletVersion === 1);
      console.log('🔍 [Storage] walletExists() check', {
        hasMultiWalletData: !!result.multiWalletData,
        walletVersion: result.walletVersion,
        exists
      });
      return exists;
    } catch (error) {
      console.error('Failed to check wallet existence:', error);
      return false;
    }
  }

  /**
   * Check if wallet is unlocked
   */
  async isWalletUnlocked(): Promise<boolean> {
    try {
      const result = await chrome.storage.local.get(['isUnlocked', 'lastActivity']);
      if (!result.isUnlocked) return false;

      const settings = await this.getUserSettings();
      const now = Date.now();
      const lastActivity = result.lastActivity || now;
      const timeoutMs = settings.autoLockTimeout * 1000;

      if (timeoutMs > 0 && (now - lastActivity) > timeoutMs) {
        await this.lockWallet();
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to check wallet unlock status:', error);
      return false;
    }
  }

  /**
   * Lock the wallet
   */
  async lockWallet(): Promise<void> {
    try {
      await chrome.storage.local.set({ 
        isUnlocked: false,
        lastActivity: 0
      });
    } catch (error) {
      console.error('Failed to lock wallet:', error);
    }
  }

  /**
   * Unlock the wallet
   */
  async unlockWallet(): Promise<void> {
    try {
      await chrome.storage.local.set({ 
        isUnlocked: true,
        lastActivity: Date.now()
      });
    } catch (error) {
      console.error('Failed to unlock wallet:', error);
    }
  }

  /**
   * Update last activity timestamp
   */
  async updateActivity(): Promise<void> {
    try {
      const isUnlocked = await this.isWalletUnlocked();
      if (isUnlocked) {
        await chrome.storage.local.set({ lastActivity: Date.now() });
      }
    } catch (error) {
      console.error('Failed to update activity:', error);
    }
  }

  /**
   * Derive encryption key from PIN
   */
  private async deriveKey(pin: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(pin),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode(ChromeStorageManager.SALT),
        iterations: ChromeStorageManager.ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Get default user settings
   */
  private getDefaultSettings(): UserSettings {
    return {
      defaultPostingAmounts: [100, 500, 1000],
      defaultTippingAmounts: [100, 500, 1000],
      useBuiltInWallet: true,
      floatingMenuEnabled: true,
      autoLockTimeout: 900, // 15 minutes
      customLNURL: undefined,
      facebookPostingMode: 'global',
      allowedFacebookGroups: [],
      deniedFacebookGroups: []
    };
  }

  // ========================================
  // Multi-Wallet Support Methods
  // ========================================

  /**
   * Validate encrypted payload integrity
   * Checks timestamp for suspicious age (potential rollback attack)
   */
  private validatePayloadIntegrity(timestamp: number): boolean {
    const now = Date.now();
    const maxAge = 90 * 24 * 60 * 60 * 1000; // 90 days
    const age = now - timestamp;

    if (age > maxAge) {
      console.warn('⚠️ [Storage] Wallet data timestamp is suspiciously old (>90 days)', {
        timestamp,
        age,
        ageInDays: Math.floor(age / (24 * 60 * 60 * 1000))
      });
      // Still return true but log warning for investigation
      return true;
    }

    if (age < 0) {
      console.warn('⚠️ [Storage] Wallet data timestamp is in the future (possible rollback attack)', {
        timestamp,
        now,
        difference: Math.abs(age)
      });
      // Still return true but log warning for investigation
      return true;
    }

    return true;
  }

  /**
   * Encrypt a single wallet mnemonic
   * Used for individual wallet encryption in multi-wallet structure
   */
  private async encryptMnemonic(mnemonic: string, pin: string): Promise<{ data: number[], iv: number[], timestamp: number }> {
    try {
      const key = await this.deriveKey(pin);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encodedData = new TextEncoder().encode(mnemonic);

      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encodedData
      );

      return {
        data: Array.from(new Uint8Array(encrypted)),
        iv: Array.from(iv),
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('❌ [Storage] Mnemonic encryption failed', error);
      throw new Error('Failed to encrypt wallet mnemonic');
    }
  }

  /**
   * Decrypt a single wallet mnemonic
   * Used for individual wallet decryption in multi-wallet structure
   */
  private async decryptMnemonic(
    encryptedData: { data: number[], iv: number[], timestamp: number },
    pin: string
  ): Promise<string> {
    try {
      // Validate integrity
      this.validatePayloadIntegrity(encryptedData.timestamp);

      const key = await this.deriveKey(pin);
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(encryptedData.iv) },
        key,
        new Uint8Array(encryptedData.data)
      );

      return new TextDecoder().decode(decrypted);
    } catch (error) {
      console.error('❌ [Storage] Mnemonic decryption failed', error);
      throw new Error('Failed to decrypt wallet mnemonic');
    }
  }

  /**
   * Save multiple wallets to storage
   * Each wallet is encrypted individually with unique IV
   */
  async saveWallets(wallets: EncryptedWalletEntry[], activeId: string, pin: string): Promise<void> {
    console.log('🔵 [Storage] SAVE_WALLETS ENTRY', {
      timestamp: new Date().toISOString(),
      walletCount: wallets.length,
      activeId
    });

    try {
      // Validate input
      if (!wallets || wallets.length === 0) {
        throw new Error('Cannot save empty wallet array');
      }

      if (!activeId || !wallets.some(w => w.metadata.id === activeId)) {
        throw new Error('Active wallet ID must match one of the wallet IDs');
      }

      // Create multi-wallet storage structure
      const multiWalletData: MultiWalletStorage = {
        wallets,
        activeWalletId: activeId,
        walletOrder: wallets.map(w => w.metadata.id),
        version: 1
      };

      // Save to storage
      await chrome.storage.local.set({
        multiWalletData: JSON.stringify(multiWalletData),
        walletVersion: 1
      });

      console.log('✅ [Storage] SAVE_WALLETS SUCCESS', {
        timestamp: new Date().toISOString(),
        walletCount: wallets.length,
        activeId
      });

      // Verify save
      const verification = await chrome.storage.local.get(['multiWalletData', 'walletVersion']);
      console.log('🔍 [Storage] Save verification', {
        dataExists: !!verification.multiWalletData,
        version: verification.walletVersion
      });
    } catch (error) {
      console.error('❌ [Storage] SAVE_WALLETS FAILED', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * Load multiple wallets from storage
   * Returns all wallet entries and active wallet ID
   */
  async loadWallets(pin: string): Promise<{ wallets: EncryptedWalletEntry[], activeId: string } | null> {
    console.log('🔵 [Storage] LOAD_WALLETS ENTRY', {
      timestamp: new Date().toISOString()
    });

    try {
      const result = await chrome.storage.local.get(['multiWalletData', 'walletVersion']);

      if (!result.multiWalletData) {
        console.warn('⚠️ [Storage] No multi-wallet data found in storage');
        return null;
      }

      const multiWalletData: MultiWalletStorage = JSON.parse(result.multiWalletData);

      // Validate schema version
      if (multiWalletData.version !== 1) {
        console.error('❌ [Storage] Unsupported wallet schema version', {
          expected: 1,
          actual: multiWalletData.version
        });
        throw new Error(`Unsupported wallet schema version: ${multiWalletData.version}`);
      }

      console.log('✅ [Storage] LOAD_WALLETS SUCCESS', {
        timestamp: new Date().toISOString(),
        walletCount: multiWalletData.wallets.length,
        activeId: multiWalletData.activeWalletId
      });

      return {
        wallets: multiWalletData.wallets,
        activeId: multiWalletData.activeWalletId
      };
    } catch (error) {
      console.error('❌ [Storage] LOAD_WALLETS FAILED', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
      return null;
    }
  }

  /**
   * Set the active wallet by ID
   * Updates the activeWalletId in storage
   */
  async setActiveWallet(id: string): Promise<void> {
    console.log('🔵 [Storage] SET_ACTIVE_WALLET', { id });

    try {
      const result = await chrome.storage.local.get(['multiWalletData']);

      if (!result.multiWalletData) {
        throw new Error('No multi-wallet data found');
      }

      const multiWalletData: MultiWalletStorage = JSON.parse(result.multiWalletData);

      // Validate wallet ID exists
      const wallet = multiWalletData.wallets.find(w => w.metadata.id === id);
      if (!wallet) {
        throw new Error(`Wallet with ID ${id} not found`);
      }

      // Update active wallet ID and lastUsedAt
      multiWalletData.activeWalletId = id;
      wallet.metadata.lastUsedAt = Date.now();

      await chrome.storage.local.set({
        multiWalletData: JSON.stringify(multiWalletData)
      });

      console.log('✅ [Storage] SET_ACTIVE_WALLET SUCCESS', { id });
    } catch (error) {
      console.error('❌ [Storage] SET_ACTIVE_WALLET FAILED', error);
      throw error;
    }
  }

  /**
   * Add a new wallet to the multi-wallet structure
   * Encrypts the mnemonic and adds to storage
   */
  async addWallet(wallet: WalletData, nickname: string, pin: string): Promise<string> {
    console.log('🔵 [Storage] ADD_WALLET', { nickname });

    try {
      // Load existing wallets or initialize empty array
      const result = await chrome.storage.local.get(['multiWalletData', 'walletVersion']);

      // Each wallet can have its own PIN - no need to verify against existing wallets
      console.log('✅ [Storage] ADD_WALLET - Adding wallet with its own PIN');

      // Generate new wallet entry
      const walletId = generateUUID();
      const encryptedMnemonic = await this.encryptMnemonic(wallet.mnemonic, pin);

      const newWallet: EncryptedWalletEntry = {
        metadata: {
          id: walletId,
          nickname,
          createdAt: Date.now(),
          lastUsedAt: Date.now()
        },
        encryptedMnemonic
      };

      let multiWalletData: MultiWalletStorage;

      if (result.multiWalletData) {
        multiWalletData = JSON.parse(result.multiWalletData);
        multiWalletData.wallets.push(newWallet);
        multiWalletData.walletOrder.push(walletId);
      } else {
        // First wallet in multi-wallet structure
        multiWalletData = {
          wallets: [newWallet],
          activeWalletId: walletId,
          walletOrder: [walletId],
          version: 1
        };
      }

      await chrome.storage.local.set({
        multiWalletData: JSON.stringify(multiWalletData),
        walletVersion: 1
      });

      console.log('✅ [Storage] ADD_WALLET SUCCESS', { walletId, nickname });
      return walletId;
    } catch (error) {
      console.error('❌ [Storage] ADD_WALLET FAILED', error);
      throw error;
    }
  }

  /**
   * Remove a wallet from the multi-wallet structure
   * Does not allow removing the last wallet (use deleteAllWallets for that)
   */
  async removeWallet(id: string, pin: string): Promise<void> {
    console.log('🔵 [Storage] REMOVE_WALLET', { id });

    try {
      const result = await chrome.storage.local.get(['multiWalletData']);

      if (!result.multiWalletData) {
        throw new Error('No multi-wallet data found');
      }

      const multiWalletData: MultiWalletStorage = JSON.parse(result.multiWalletData);

      // Prevent removing the last wallet
      if (multiWalletData.wallets.length === 1) {
        throw new Error('Cannot remove the last wallet. Use deleteAllWallets() instead.');
      }

      // Find and remove the wallet
      const walletIndex = multiWalletData.wallets.findIndex(w => w.metadata.id === id);
      if (walletIndex === -1) {
        throw new Error(`Wallet with ID ${id} not found`);
      }

      multiWalletData.wallets.splice(walletIndex, 1);
      multiWalletData.walletOrder = multiWalletData.walletOrder.filter(wId => wId !== id);

      // If removing active wallet, switch to first remaining wallet
      if (multiWalletData.activeWalletId === id) {
        multiWalletData.activeWalletId = multiWalletData.wallets[0].metadata.id;
        multiWalletData.wallets[0].metadata.lastUsedAt = Date.now();
        console.log('⚠️ [Storage] Removed active wallet, switched to', {
          newActiveId: multiWalletData.activeWalletId
        });
      }

      await chrome.storage.local.set({
        multiWalletData: JSON.stringify(multiWalletData)
      });

      console.log('✅ [Storage] REMOVE_WALLET SUCCESS', { id });
    } catch (error) {
      console.error('❌ [Storage] REMOVE_WALLET FAILED', error);
      throw error;
    }
  }

  /**
   * Decrypt and return the active wallet's full data
   * Used for unlocking and accessing wallet mnemonic
   */
  async getActiveWallet(pin: string): Promise<{ wallet: WalletData, metadata: WalletMetadata } | null> {
    console.log('🔵 [Storage] GET_ACTIVE_WALLET');

    try {
      const walletsData = await this.loadWallets(pin);
      if (!walletsData) {
        return null;
      }

      // Find active wallet
      const activeWallet = walletsData.wallets.find(w => w.metadata.id === walletsData.activeId);
      if (!activeWallet) {
        console.error('❌ [Storage] Active wallet not found in wallet list');
        return null;
      }

      // Decrypt mnemonic
      const mnemonic = await this.decryptMnemonic(activeWallet.encryptedMnemonic, pin);

      // Return wallet data with metadata
      const walletData: WalletData = {
        mnemonic,
        balance: 0,
        transactions: []
      };

      console.log('✅ [Storage] GET_ACTIVE_WALLET SUCCESS', {
        walletId: activeWallet.metadata.id,
        nickname: activeWallet.metadata.nickname
      });

      return {
        wallet: walletData,
        metadata: activeWallet.metadata
      };
    } catch (error) {
      console.error('❌ [Storage] GET_ACTIVE_WALLET FAILED', error);
      return null;
    }
  }

  /**
   * Try to unlock any wallet with the given PIN
   * Iterates through all wallets and returns the first one that successfully decrypts
   * Also sets that wallet as the active wallet
   */
  async tryUnlockAnyWallet(pin: string): Promise<{ wallet: WalletData, metadata: WalletMetadata } | null> {
    console.log('🔵 [Storage] TRY_UNLOCK_ANY_WALLET');

    try {
      const walletsData = await this.loadWallets(''); // Load wallet metadata without decryption
      if (!walletsData || walletsData.wallets.length === 0) {
        console.log('⚠️ [Storage] No wallets found');
        return null;
      }

      console.log(`🔍 [Storage] Trying PIN against ${walletsData.wallets.length} wallet(s)`);

      // Try to decrypt each wallet with the PIN
      for (const walletEntry of walletsData.wallets) {
        try {
          console.log(`🔐 [Storage] Trying wallet: ${walletEntry.metadata.nickname} (${walletEntry.metadata.id})`);
          
          // Attempt to decrypt the mnemonic
          const mnemonic = await this.decryptMnemonic(walletEntry.encryptedMnemonic, pin);
          
          // If we get here, decryption succeeded!
          console.log(`✅ [Storage] PIN matched wallet: ${walletEntry.metadata.nickname}`);
          
          // Set this wallet as active
          await this.setActiveWallet(walletEntry.metadata.id);
          
          const walletData: WalletData = {
            mnemonic,
            balance: 0,
            transactions: []
          };

          console.log('✅ [Storage] TRY_UNLOCK_ANY_WALLET SUCCESS', {
            walletId: walletEntry.metadata.id,
            nickname: walletEntry.metadata.nickname
          });

          return {
            wallet: walletData,
            metadata: walletEntry.metadata
          };
        } catch (decryptError) {
          // Decryption failed for this wallet, try the next one
          console.log(`❌ [Storage] PIN did not match wallet: ${walletEntry.metadata.nickname}`);
          continue;
        }
      }

      // No wallet matched the PIN
      console.log('❌ [Storage] PIN did not match any wallet');
      return null;
    } catch (error) {
      console.error('❌ [Storage] TRY_UNLOCK_ANY_WALLET FAILED', error);
      return null;
    }
  }

  /**
   * Decrypt and return a specific wallet's full data by ID
   */
  async getWalletById(id: string, pin: string): Promise<{ wallet: WalletData, metadata: WalletMetadata } | null> {
    console.log('🔵 [Storage] GET_WALLET_BY_ID', { id });

    try {
      const walletsData = await this.loadWallets(pin);
      if (!walletsData) {
        return null;
      }

      // Find wallet by ID
      const walletEntry = walletsData.wallets.find(w => w.metadata.id === id);
      if (!walletEntry) {
        console.error('❌ [Storage] Wallet not found', { id });
        return null;
      }

      // Decrypt mnemonic
      const mnemonic = await this.decryptMnemonic(walletEntry.encryptedMnemonic, pin);

      // Return wallet data with metadata
      const walletData: WalletData = {
        mnemonic,
        balance: 0,
        transactions: []
      };

      console.log('✅ [Storage] GET_WALLET_BY_ID SUCCESS', {
        walletId: walletEntry.metadata.id,
        nickname: walletEntry.metadata.nickname
      });

      return {
        wallet: walletData,
        metadata: walletEntry.metadata
      };
    } catch (error) {
      console.error('❌ [Storage] GET_WALLET_BY_ID FAILED', error);
      return null;
    }
  }

  // ========================================
  // Migration Methods
  // ========================================

  /**
   * Check if migration to multi-wallet is needed
   * Returns true if old single-wallet exists and multi-wallet doesn't
   */
  async needsMigration(): Promise<boolean> {
    try {
      const result = await chrome.storage.local.get(['encryptedWallet', 'walletVersion', 'multiWalletData']);

      // Already migrated if walletVersion is 1 or multi-wallet data exists
      if (result.walletVersion === 1 || result.multiWalletData) {
        return false;
      }

      // Needs migration if old single wallet exists
      return !!result.encryptedWallet;
    } catch (error) {
      console.error('❌ [Storage] Failed to check migration status', error);
      return false;
    }
  }

  /**
   * Migrate from single-wallet to multi-wallet structure
   * Converts old encryptedWallet to new multi-wallet format
   *
   * @param pin - User's PIN to decrypt and re-encrypt wallet
   */
  async migrateToMultiWallet(pin: string): Promise<void> {
    console.log('🔵 [Storage] MIGRATE_TO_MULTI_WALLET START', {
      timestamp: new Date().toISOString()
    });

    try {
      // 1. Check if already migrated
      const needsMigration = await this.needsMigration();
      if (!needsMigration) {
        console.log('⚠️ [Storage] Migration not needed or already completed');
        return;
      }

      // 2. Load old single wallet (decrypt it)
      const oldWallet = await this.loadEncryptedWallet(pin);
      if (!oldWallet) {
        throw new Error('Failed to load old wallet for migration');
      }

      console.log('🔍 [Storage] Old wallet loaded successfully', {
        hasMnemonic: !!oldWallet.mnemonic,
        mnemonicWordCount: oldWallet.mnemonic ? oldWallet.mnemonic.split(' ').length : 0
      });

      // 3. Create first wallet entry with encrypted mnemonic
      const walletId = generateUUID();
      const encryptedMnemonic = await this.encryptMnemonic(oldWallet.mnemonic, pin);

      const firstWallet: EncryptedWalletEntry = {
        metadata: {
          id: walletId,
          nickname: 'Wallet 1',
          createdAt: Date.now(),
          lastUsedAt: Date.now()
        },
        encryptedMnemonic
      };

      console.log('🔍 [Storage] First wallet entry created', {
        walletId,
        nickname: firstWallet.metadata.nickname
      });

      // 4. Create multi-wallet storage structure
      const multiWalletData: MultiWalletStorage = {
        wallets: [firstWallet],
        activeWalletId: walletId,
        walletOrder: [walletId],
        version: 1
      };

      // 5. Backup old wallet before migration
      const oldWalletBackup = await chrome.storage.local.get(['encryptedWallet']);

      // 6. Save new multi-wallet structure
      await chrome.storage.local.set({
        multiWalletData: JSON.stringify(multiWalletData),
        walletVersion: 1,
        backup_encryptedWallet: oldWalletBackup.encryptedWallet  // Keep backup for safety
      });

      console.log('✅ [Storage] MIGRATE_TO_MULTI_WALLET SUCCESS', {
        timestamp: new Date().toISOString(),
        walletId,
        backupCreated: true
      });

      // 7. Verify migration
      const verification = await chrome.storage.local.get(['multiWalletData', 'walletVersion']);
      if (!verification.multiWalletData || verification.walletVersion !== 1) {
        throw new Error('Migration verification failed');
      }

      console.log('🔍 [Storage] Migration verified successfully');

    } catch (error) {
      console.error('❌ [Storage] MIGRATE_TO_MULTI_WALLET FAILED', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
      throw new Error('Wallet migration failed: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  /**
   * Rollback migration and restore single wallet from backup
   * Emergency function in case migration causes issues
   */
  async rollbackMigration(): Promise<void> {
    console.log('🔵 [Storage] ROLLBACK_MIGRATION START', {
      timestamp: new Date().toISOString()
    });

    try {
      const result = await chrome.storage.local.get(['backup_encryptedWallet']);

      if (!result.backup_encryptedWallet) {
        throw new Error('No backup wallet found to restore');
      }

      // Restore old wallet
      await chrome.storage.local.set({
        encryptedWallet: result.backup_encryptedWallet
      });

      // Remove multi-wallet data
      await chrome.storage.local.remove(['multiWalletData', 'walletVersion']);

      console.log('✅ [Storage] ROLLBACK_MIGRATION SUCCESS', {
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ [Storage] ROLLBACK_MIGRATION FAILED', error);
      throw error;
    }
  }

  /**
   * Check which wallet storage version is active
   * Returns 0 for single-wallet (legacy), 1 for multi-wallet, 2 for hierarchical
   */
  async getWalletVersion(): Promise<number> {
    try {
      const result = await chrome.storage.local.get(['walletVersion', 'multiWalletData', 'encryptedWallet']);

      // Check for hierarchical (v2)
      if (result.multiWalletData) {
        const data = JSON.parse(result.multiWalletData);
        if (data.version === 2) {
          return 2;
        }
      }

      // Check for multi-wallet (v1)
      if (result.walletVersion === 1 || result.multiWalletData) {
        return 1;
      }

      // Check for single wallet (legacy)
      if (result.encryptedWallet) {
        return 0;
      }

      // No wallet exists
      return -1;
    } catch (error) {
      console.error('❌ [Storage] Failed to get wallet version', error);
      return -1;
    }
  }

  // ========================================
  // Hierarchical Multi-Wallet Methods (v2)
  // ========================================

  /**
   * Check if migration to hierarchical (v2) is needed
   * Returns true if v1 multi-wallet exists and v2 doesn't
   */
  async needsHierarchicalMigration(): Promise<boolean> {
    try {
      const result = await chrome.storage.local.get(['multiWalletData']);

      if (!result.multiWalletData) {
        return false;
      }

      const data = JSON.parse(result.multiWalletData);
      return data.version === 1;
    } catch (error) {
      console.error('❌ [Storage] Failed to check hierarchical migration status', error);
      return false;
    }
  }

  /**
   * Migrate from v1 (flat multi-wallet) to v2 (hierarchical)
   * Each existing wallet becomes a master key with one sub-wallet (index 0)
   * Note: PIN not needed as we're copying already-encrypted data
   */
  async migrateToHierarchical(_pin?: string): Promise<void> {
    console.log('🔵 [Storage] MIGRATE_TO_HIERARCHICAL START', {
      timestamp: new Date().toISOString()
    });

    try {
      // 1. Check if migration is needed
      const needsMigration = await this.needsHierarchicalMigration();
      if (!needsMigration) {
        console.log('⚠️ [Storage] Hierarchical migration not needed or already completed');
        return;
      }

      // 2. Load existing v1 data
      const result = await chrome.storage.local.get(['multiWalletData']);
      const v1Data: MultiWalletStorage = JSON.parse(result.multiWalletData);

      console.log('🔍 [Storage] Migrating v1 wallets to v2 hierarchical', {
        walletCount: v1Data.wallets.length,
        activeWalletId: v1Data.activeWalletId
      });

      // 3. Convert each wallet to a master key with one sub-wallet
      const masterKeys: MasterKeyEntry[] = v1Data.wallets.map(wallet => ({
        id: wallet.metadata.id,
        nickname: wallet.metadata.nickname,
        encryptedMnemonic: wallet.encryptedMnemonic as EncryptedData,
        createdAt: wallet.metadata.createdAt,
        lastUsedAt: wallet.metadata.lastUsedAt,
        subWallets: [{
          index: 0, // Original mnemonic unchanged
          nickname: 'Default',
          createdAt: wallet.metadata.createdAt,
          lastUsedAt: wallet.metadata.lastUsedAt
        }],
        isExpanded: false
      }));

      // 4. Create v2 hierarchical structure
      const v2Data: HierarchicalWalletStorage = {
        version: 2,
        masterKeys,
        activeMasterKeyId: v1Data.activeWalletId,
        activeSubWalletIndex: 0,
        masterKeyOrder: v1Data.walletOrder
      };

      // 5. Backup v1 data
      await chrome.storage.local.set({
        backup_v1_multiWalletData: result.multiWalletData
      });

      // 6. Save v2 data
      await chrome.storage.local.set({
        multiWalletData: JSON.stringify(v2Data),
        walletVersion: 2
      });

      console.log('✅ [Storage] MIGRATE_TO_HIERARCHICAL SUCCESS', {
        timestamp: new Date().toISOString(),
        masterKeyCount: masterKeys.length
      });

      // 7. Verify migration
      const verification = await chrome.storage.local.get(['multiWalletData']);
      const verifyData = JSON.parse(verification.multiWalletData);
      if (verifyData.version !== 2) {
        throw new Error('Migration verification failed');
      }

    } catch (error) {
      console.error('❌ [Storage] MIGRATE_TO_HIERARCHICAL FAILED', {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * Load hierarchical wallet data (v2)
   */
  async loadHierarchicalWallets(): Promise<HierarchicalWalletStorage | null> {
    console.log('🔵 [Storage] LOAD_HIERARCHICAL_WALLETS');

    try {
      const result = await chrome.storage.local.get(['multiWalletData']);

      if (!result.multiWalletData) {
        return null;
      }

      const data = JSON.parse(result.multiWalletData);

      if (data.version !== 2) {
        console.warn('⚠️ [Storage] Not hierarchical data (version !== 2)');
        return null;
      }

      console.log('✅ [Storage] LOAD_HIERARCHICAL_WALLETS SUCCESS', {
        masterKeyCount: data.masterKeys.length,
        activeMasterKeyId: data.activeMasterKeyId,
        activeSubWalletIndex: data.activeSubWalletIndex
      });

      return data as HierarchicalWalletStorage;
    } catch (error) {
      console.error('❌ [Storage] LOAD_HIERARCHICAL_WALLETS FAILED', error);
      return null;
    }
  }

  /**
   * Save hierarchical wallet data (v2)
   */
  async saveHierarchicalWallets(data: HierarchicalWalletStorage): Promise<void> {
    console.log('🔵 [Storage] SAVE_HIERARCHICAL_WALLETS', {
      masterKeyCount: data.masterKeys.length,
      activeMasterKeyId: data.activeMasterKeyId
    });

    try {
      await chrome.storage.local.set({
        multiWalletData: JSON.stringify(data),
        walletVersion: 2
      });

      console.log('✅ [Storage] SAVE_HIERARCHICAL_WALLETS SUCCESS');
    } catch (error) {
      console.error('❌ [Storage] SAVE_HIERARCHICAL_WALLETS FAILED', error);
      throw error;
    }
  }

  /**
   * Get all master key metadata (without decryption)
   */
  async getMasterKeyMetadata(): Promise<MasterKeyMetadata[]> {
    const data = await this.loadHierarchicalWallets();
    if (!data) {
      return [];
    }

    return data.masterKeys.map(mk => ({
      id: mk.id,
      nickname: mk.nickname,
      createdAt: mk.createdAt,
      lastUsedAt: mk.lastUsedAt,
      subWalletCount: mk.subWallets.length,
      isExpanded: mk.isExpanded
    }));
  }

  /**
   * Get sub-wallets for a specific master key
   */
  async getSubWallets(masterKeyId: string): Promise<SubWalletEntry[]> {
    const data = await this.loadHierarchicalWallets();
    if (!data) {
      return [];
    }

    const masterKey = data.masterKeys.find(mk => mk.id === masterKeyId);
    return masterKey?.subWallets || [];
  }

  /**
   * Add a new master key with optional first sub-wallet
   */
  async addMasterKey(
    mnemonic: string,
    nickname: string,
    pin: string,
    createDefaultSubWallet: boolean = true
  ): Promise<string> {
    console.log('🔵 [Storage] ADD_MASTER_KEY', { nickname, createDefaultSubWallet });

    try {
      let data = await this.loadHierarchicalWallets();

      // Initialize if no data exists
      if (!data) {
        data = {
          version: 2,
          masterKeys: [],
          activeMasterKeyId: '',
          activeSubWalletIndex: 0,
          masterKeyOrder: []
        };
      }

      // Check master key limit
      if (data.masterKeys.length >= HIERARCHICAL_WALLET_CONSTANTS.MAX_MASTER_KEYS) {
        throw new Error(`Maximum of ${HIERARCHICAL_WALLET_CONSTANTS.MAX_MASTER_KEYS} master keys allowed`);
      }

      // Create new master key
      const masterKeyId = generateUUID();
      const encryptedMnemonic = await this.encryptMnemonic(mnemonic, pin);
      const now = Date.now();

      const newMasterKey: MasterKeyEntry = {
        id: masterKeyId,
        nickname,
        encryptedMnemonic: encryptedMnemonic as EncryptedData,
        createdAt: now,
        lastUsedAt: now,
        subWallets: createDefaultSubWallet ? [{
          index: 0,
          nickname: 'Default',
          createdAt: now,
          lastUsedAt: now
        }] : [],
        isExpanded: true
      };

      data.masterKeys.push(newMasterKey);
      data.masterKeyOrder.push(masterKeyId);

      // Set as active if first master key
      if (data.masterKeys.length === 1) {
        data.activeMasterKeyId = masterKeyId;
        data.activeSubWalletIndex = 0;
      }

      await this.saveHierarchicalWallets(data);

      console.log('✅ [Storage] ADD_MASTER_KEY SUCCESS', { masterKeyId, nickname });
      return masterKeyId;
    } catch (error) {
      console.error('❌ [Storage] ADD_MASTER_KEY FAILED', error);
      throw error;
    }
  }

  /**
   * Add a sub-wallet to an existing master key
   */
  async addSubWallet(masterKeyId: string, nickname: string): Promise<number> {
    console.log('🔵 [Storage] ADD_SUB_WALLET', { masterKeyId, nickname });

    try {
      const data = await this.loadHierarchicalWallets();
      if (!data) {
        throw new Error('No hierarchical wallet data found');
      }

      const masterKey = data.masterKeys.find(mk => mk.id === masterKeyId);
      if (!masterKey) {
        throw new Error(`Master key ${masterKeyId} not found`);
      }

      // Check sub-wallet limit
      if (masterKey.subWallets.length >= HIERARCHICAL_WALLET_CONSTANTS.MAX_SUB_WALLETS) {
        throw new Error(`Maximum of ${HIERARCHICAL_WALLET_CONSTANTS.MAX_SUB_WALLETS} sub-wallets per master key`);
      }

      // Find next available index
      const usedIndices = new Set(masterKey.subWallets.map(sw => sw.index));
      let nextIndex = -1;
      for (let i = 0; i < HIERARCHICAL_WALLET_CONSTANTS.MAX_SUB_WALLETS; i++) {
        if (!usedIndices.has(i)) {
          nextIndex = i;
          break;
        }
      }

      if (nextIndex === -1) {
        throw new Error('No available sub-wallet indices');
      }

      const now = Date.now();
      const newSubWallet: SubWalletEntry = {
        index: nextIndex,
        nickname,
        createdAt: now,
        lastUsedAt: now
      };

      masterKey.subWallets.push(newSubWallet);
      masterKey.lastUsedAt = now;

      await this.saveHierarchicalWallets(data);

      console.log('✅ [Storage] ADD_SUB_WALLET SUCCESS', { masterKeyId, index: nextIndex, nickname });
      return nextIndex;
    } catch (error) {
      console.error('❌ [Storage] ADD_SUB_WALLET FAILED', error);
      throw error;
    }
  }

  /**
   * Remove a master key and all its sub-wallets
   */
  async removeMasterKey(masterKeyId: string): Promise<void> {
    console.log('🔵 [Storage] REMOVE_MASTER_KEY', { masterKeyId });

    try {
      const data = await this.loadHierarchicalWallets();
      if (!data) {
        throw new Error('No hierarchical wallet data found');
      }

      // Prevent removing last master key
      if (data.masterKeys.length === 1) {
        throw new Error('Cannot remove the last master key');
      }

      const index = data.masterKeys.findIndex(mk => mk.id === masterKeyId);
      if (index === -1) {
        throw new Error(`Master key ${masterKeyId} not found`);
      }

      data.masterKeys.splice(index, 1);
      data.masterKeyOrder = data.masterKeyOrder.filter(id => id !== masterKeyId);

      // If removing active master key, switch to first remaining
      if (data.activeMasterKeyId === masterKeyId) {
        data.activeMasterKeyId = data.masterKeys[0].id;
        data.activeSubWalletIndex = data.masterKeys[0].subWallets[0]?.index || 0;
        console.log('⚠️ [Storage] Removed active master key, switched to', {
          newActiveMasterKeyId: data.activeMasterKeyId
        });
      }

      await this.saveHierarchicalWallets(data);

      console.log('✅ [Storage] REMOVE_MASTER_KEY SUCCESS', { masterKeyId });
    } catch (error) {
      console.error('❌ [Storage] REMOVE_MASTER_KEY FAILED', error);
      throw error;
    }
  }

  /**
   * Remove a sub-wallet from a master key
   */
  async removeSubWallet(masterKeyId: string, subWalletIndex: number): Promise<void> {
    console.log('🔵 [Storage] REMOVE_SUB_WALLET', { masterKeyId, subWalletIndex });

    try {
      const data = await this.loadHierarchicalWallets();
      if (!data) {
        throw new Error('No hierarchical wallet data found');
      }

      const masterKey = data.masterKeys.find(mk => mk.id === masterKeyId);
      if (!masterKey) {
        throw new Error(`Master key ${masterKeyId} not found`);
      }

      // Prevent removing last sub-wallet
      if (masterKey.subWallets.length === 1) {
        throw new Error('Cannot remove the last sub-wallet from a master key');
      }

      const swIndex = masterKey.subWallets.findIndex(sw => sw.index === subWalletIndex);
      if (swIndex === -1) {
        throw new Error(`Sub-wallet with index ${subWalletIndex} not found`);
      }

      masterKey.subWallets.splice(swIndex, 1);

      // If removing active sub-wallet, switch to first remaining
      if (data.activeMasterKeyId === masterKeyId && data.activeSubWalletIndex === subWalletIndex) {
        data.activeSubWalletIndex = masterKey.subWallets[0].index;
        console.log('⚠️ [Storage] Removed active sub-wallet, switched to index', {
          newActiveSubWalletIndex: data.activeSubWalletIndex
        });
      }

      await this.saveHierarchicalWallets(data);

      console.log('✅ [Storage] REMOVE_SUB_WALLET SUCCESS', { masterKeyId, subWalletIndex });
    } catch (error) {
      console.error('❌ [Storage] REMOVE_SUB_WALLET FAILED', error);
      throw error;
    }
  }

  /**
   * Set the active wallet (master key + sub-wallet)
   */
  async setActiveHierarchicalWallet(masterKeyId: string, subWalletIndex: number): Promise<void> {
    console.log('🔵 [Storage] SET_ACTIVE_HIERARCHICAL_WALLET', { masterKeyId, subWalletIndex });

    try {
      const data = await this.loadHierarchicalWallets();
      if (!data) {
        throw new Error('No hierarchical wallet data found');
      }

      const masterKey = data.masterKeys.find(mk => mk.id === masterKeyId);
      if (!masterKey) {
        throw new Error(`Master key ${masterKeyId} not found`);
      }

      const subWallet = masterKey.subWallets.find(sw => sw.index === subWalletIndex);
      if (!subWallet) {
        throw new Error(`Sub-wallet with index ${subWalletIndex} not found`);
      }

      data.activeMasterKeyId = masterKeyId;
      data.activeSubWalletIndex = subWalletIndex;

      // Update lastUsedAt
      const now = Date.now();
      masterKey.lastUsedAt = now;
      subWallet.lastUsedAt = now;

      await this.saveHierarchicalWallets(data);

      console.log('✅ [Storage] SET_ACTIVE_HIERARCHICAL_WALLET SUCCESS');
    } catch (error) {
      console.error('❌ [Storage] SET_ACTIVE_HIERARCHICAL_WALLET FAILED', error);
      throw error;
    }
  }

  /**
   * Get the decrypted mnemonic for a master key
   */
  async getMasterKeyMnemonic(masterKeyId: string, pin: string): Promise<string> {
    console.log('🔵 [Storage] GET_MASTER_KEY_MNEMONIC', { masterKeyId });

    try {
      const data = await this.loadHierarchicalWallets();
      if (!data) {
        throw new Error('No hierarchical wallet data found');
      }

      const masterKey = data.masterKeys.find(mk => mk.id === masterKeyId);
      if (!masterKey) {
        throw new Error(`Master key ${masterKeyId} not found`);
      }

      const mnemonic = await this.decryptMnemonic(masterKey.encryptedMnemonic, pin);

      console.log('✅ [Storage] GET_MASTER_KEY_MNEMONIC SUCCESS');
      return mnemonic;
    } catch (error) {
      console.error('❌ [Storage] GET_MASTER_KEY_MNEMONIC FAILED', error);
      throw error;
    }
  }

  /**
   * Try to unlock any master key with the given PIN
   * Returns the first master key that successfully decrypts
   */
  async tryUnlockAnyMasterKey(pin: string): Promise<{ masterKeyId: string, mnemonic: string } | null> {
    console.log('🔵 [Storage] TRY_UNLOCK_ANY_MASTER_KEY');

    try {
      const data = await this.loadHierarchicalWallets();
      if (!data || data.masterKeys.length === 0) {
        return null;
      }

      for (const masterKey of data.masterKeys) {
        try {
          const mnemonic = await this.decryptMnemonic(masterKey.encryptedMnemonic, pin);
          console.log(`✅ [Storage] PIN matched master key: ${masterKey.nickname}`);

          // Set this as active
          await this.setActiveHierarchicalWallet(
            masterKey.id,
            masterKey.subWallets[0]?.index || 0
          );

          return { masterKeyId: masterKey.id, mnemonic };
        } catch {
          continue;
        }
      }

      return null;
    } catch (error) {
      console.error('❌ [Storage] TRY_UNLOCK_ANY_MASTER_KEY FAILED', error);
      return null;
    }
  }

  /**
   * Rename a master key
   */
  async renameMasterKey(masterKeyId: string, newNickname: string): Promise<void> {
    console.log('🔵 [Storage] RENAME_MASTER_KEY', { masterKeyId, newNickname });

    try {
      const data = await this.loadHierarchicalWallets();
      if (!data) {
        throw new Error('No hierarchical wallet data found');
      }

      const masterKey = data.masterKeys.find(mk => mk.id === masterKeyId);
      if (!masterKey) {
        throw new Error(`Master key ${masterKeyId} not found`);
      }

      masterKey.nickname = newNickname;
      await this.saveHierarchicalWallets(data);

      console.log('✅ [Storage] RENAME_MASTER_KEY SUCCESS');
    } catch (error) {
      console.error('❌ [Storage] RENAME_MASTER_KEY FAILED', error);
      throw error;
    }
  }

  /**
   * Rename a sub-wallet
   */
  async renameSubWallet(masterKeyId: string, subWalletIndex: number, newNickname: string): Promise<void> {
    console.log('🔵 [Storage] RENAME_SUB_WALLET', { masterKeyId, subWalletIndex, newNickname });

    try {
      const data = await this.loadHierarchicalWallets();
      if (!data) {
        throw new Error('No hierarchical wallet data found');
      }

      const masterKey = data.masterKeys.find(mk => mk.id === masterKeyId);
      if (!masterKey) {
        throw new Error(`Master key ${masterKeyId} not found`);
      }

      const subWallet = masterKey.subWallets.find(sw => sw.index === subWalletIndex);
      if (!subWallet) {
        throw new Error(`Sub-wallet with index ${subWalletIndex} not found`);
      }

      subWallet.nickname = newNickname;
      await this.saveHierarchicalWallets(data);

      console.log('✅ [Storage] RENAME_SUB_WALLET SUCCESS');
    } catch (error) {
      console.error('❌ [Storage] RENAME_SUB_WALLET FAILED', error);
      throw error;
    }
  }

  /**
   * Toggle master key expansion state in UI
   */
  async toggleMasterKeyExpanded(masterKeyId: string): Promise<void> {
    try {
      const data = await this.loadHierarchicalWallets();
      if (!data) return;

      const masterKey = data.masterKeys.find(mk => mk.id === masterKeyId);
      if (masterKey) {
        masterKey.isExpanded = !masterKey.isExpanded;
        await this.saveHierarchicalWallets(data);
      }
    } catch (error) {
      console.error('❌ [Storage] TOGGLE_MASTER_KEY_EXPANDED FAILED', error);
    }
  }

  /**
   * Add discovered sub-wallets to a master key
   * Used after sub-wallet discovery to add multiple sub-wallets at once
   *
   * @param masterKeyId - UUID of the master key
   * @param subWallets - Array of { index, nickname } for discovered wallets
   */
  async addDiscoveredSubWallets(
    masterKeyId: string,
    subWallets: { index: number; nickname: string }[]
  ): Promise<void> {
    console.log('🔵 [Storage] ADD_DISCOVERED_SUB_WALLETS', {
      masterKeyId,
      count: subWallets.length
    });

    try {
      const data = await this.loadHierarchicalWallets();
      if (!data) {
        throw new Error('No hierarchical wallet data found');
      }

      const masterKey = data.masterKeys.find(mk => mk.id === masterKeyId);
      if (!masterKey) {
        throw new Error(`Master key ${masterKeyId} not found`);
      }

      const now = Date.now();

      // Add each discovered sub-wallet if it doesn't already exist
      for (const sw of subWallets) {
        const exists = masterKey.subWallets.some(existing => existing.index === sw.index);
        if (!exists) {
          masterKey.subWallets.push({
            index: sw.index,
            nickname: sw.nickname,
            createdAt: now,
            lastUsedAt: now
          });
          console.log(`[Storage] Added discovered sub-wallet: index=${sw.index}, name="${sw.nickname}"`);
        } else {
          console.log(`[Storage] Sub-wallet index ${sw.index} already exists, skipping`);
        }
      }

      // Sort sub-wallets by index
      masterKey.subWallets.sort((a, b) => a.index - b.index);

      await this.saveHierarchicalWallets(data);

      console.log('✅ [Storage] ADD_DISCOVERED_SUB_WALLETS SUCCESS', {
        totalSubWallets: masterKey.subWallets.length
      });
    } catch (error) {
      console.error('❌ [Storage] ADD_DISCOVERED_SUB_WALLETS FAILED', error);
      throw error;
    }
  }

  /**
   * Get the active hierarchical wallet info
   * Returns masterKeyId and subWalletIndex of the currently active wallet
   */
  async getActiveHierarchicalWalletInfo(): Promise<{ masterKeyId: string, subWalletIndex: number } | null> {
    try {
      const data = await this.loadHierarchicalWallets();
      if (!data || !data.activeMasterKeyId) {
        return null;
      }

      return {
        masterKeyId: data.activeMasterKeyId,
        subWalletIndex: data.activeSubWalletIndex
      };
    } catch (error) {
      console.error('❌ [Storage] GET_ACTIVE_HIERARCHICAL_WALLET_INFO FAILED', error);
      return null;
    }
  }

  /**
   * Get the derived mnemonic for the active hierarchical wallet
   * This derives the sub-wallet mnemonic from the master key based on activeSubWalletIndex
   *
   * @param pin - User's PIN to decrypt the master key
   * @returns Derived mnemonic for the active sub-wallet, or null if not found
   */
  async getActiveHierarchicalWalletMnemonic(pin: string): Promise<{
    mnemonic: string;
    masterKeyId: string;
    subWalletIndex: number;
    masterKeyNickname: string;
    subWalletNickname: string;
  } | null> {
    console.log('🔵 [Storage] GET_ACTIVE_HIERARCHICAL_WALLET_MNEMONIC');

    try {
      const data = await this.loadHierarchicalWallets();
      if (!data || !data.activeMasterKeyId) {
        console.warn('⚠️ [Storage] No active hierarchical wallet');
        return null;
      }

      const masterKey = data.masterKeys.find(mk => mk.id === data.activeMasterKeyId);
      if (!masterKey) {
        console.error('❌ [Storage] Active master key not found');
        return null;
      }

      const subWallet = masterKey.subWallets.find(sw => sw.index === data.activeSubWalletIndex);
      if (!subWallet) {
        console.error('❌ [Storage] Active sub-wallet not found');
        return null;
      }

      // Decrypt the master mnemonic
      const masterMnemonic = await this.decryptMnemonic(masterKey.encryptedMnemonic, pin);

      // Import mnemonic derivation utility dynamically to avoid circular deps
      const { deriveSubWalletMnemonic } = await import('./mnemonic-derivation');

      // Derive sub-wallet mnemonic (index 0 = original, index 1-19 = modified)
      const derivedMnemonic = deriveSubWalletMnemonic(masterMnemonic, data.activeSubWalletIndex);

      console.log('✅ [Storage] GET_ACTIVE_HIERARCHICAL_WALLET_MNEMONIC SUCCESS', {
        masterKeyId: data.activeMasterKeyId,
        subWalletIndex: data.activeSubWalletIndex,
        isOriginalMnemonic: data.activeSubWalletIndex === 0
      });

      return {
        mnemonic: derivedMnemonic,
        masterKeyId: data.activeMasterKeyId,
        subWalletIndex: data.activeSubWalletIndex,
        masterKeyNickname: masterKey.nickname,
        subWalletNickname: subWallet.nickname
      };
    } catch (error) {
      console.error('❌ [Storage] GET_ACTIVE_HIERARCHICAL_WALLET_MNEMONIC FAILED', error);
      return null;
    }
  }

  /**
   * Try to unlock any wallet (v1 or v2) with the given PIN
   * First tries v2 hierarchical format, then falls back to v1 flat format
   * Returns the mnemonic for the active wallet (derived for sub-wallets in v2)
   */
  async tryUnlockAnyWalletUnified(pin: string): Promise<{
    wallet: WalletData;
    metadata: WalletMetadata;
    isHierarchical: boolean;
    hierarchicalInfo?: {
      masterKeyId: string;
      subWalletIndex: number;
      masterKeyNickname: string;
      subWalletNickname: string;
    };
  } | null> {
    console.log('🔵 [Storage] TRY_UNLOCK_ANY_WALLET_UNIFIED');

    try {
      const version = await this.getWalletVersion();
      console.log('🔍 [Storage] Wallet version:', version);

      // Try v2 hierarchical first
      if (version === 2) {
        console.log('🔍 [Storage] Trying v2 hierarchical unlock...');

        // Try to unlock any master key with the PIN
        const unlocked = await this.tryUnlockAnyMasterKey(pin);
        if (unlocked) {
          // Get the full hierarchical wallet mnemonic (derived)
          const activeWallet = await this.getActiveHierarchicalWalletMnemonic(pin);
          if (activeWallet) {
            const walletData: WalletData = {
              mnemonic: activeWallet.mnemonic,
              balance: 0,
              transactions: []
            };

            // Create metadata for compatibility
            const metadata: WalletMetadata = {
              id: `${activeWallet.masterKeyId}:${activeWallet.subWalletIndex}`,
              nickname: activeWallet.subWalletIndex === 0
                ? activeWallet.masterKeyNickname
                : `${activeWallet.masterKeyNickname} > ${activeWallet.subWalletNickname}`,
              createdAt: Date.now(),
              lastUsedAt: Date.now()
            };

            console.log('✅ [Storage] TRY_UNLOCK_ANY_WALLET_UNIFIED SUCCESS (v2)', {
              masterKeyId: activeWallet.masterKeyId,
              subWalletIndex: activeWallet.subWalletIndex
            });

            return {
              wallet: walletData,
              metadata,
              isHierarchical: true,
              hierarchicalInfo: {
                masterKeyId: activeWallet.masterKeyId,
                subWalletIndex: activeWallet.subWalletIndex,
                masterKeyNickname: activeWallet.masterKeyNickname,
                subWalletNickname: activeWallet.subWalletNickname
              }
            };
          }
        }

        console.log('❌ [Storage] v2 hierarchical unlock failed');
        return null;
      }

      // Fall back to v1 flat multi-wallet
      if (version === 1) {
        console.log('🔍 [Storage] Trying v1 flat multi-wallet unlock...');
        const result = await this.tryUnlockAnyWallet(pin);
        if (result) {
          console.log('✅ [Storage] TRY_UNLOCK_ANY_WALLET_UNIFIED SUCCESS (v1)');
          return {
            wallet: result.wallet,
            metadata: result.metadata,
            isHierarchical: false
          };
        }
      }

      // v0 legacy single wallet
      if (version === 0) {
        console.log('🔍 [Storage] Trying v0 legacy single wallet unlock...');
        const walletData = await this.loadEncryptedWallet(pin);
        if (walletData) {
          console.log('✅ [Storage] TRY_UNLOCK_ANY_WALLET_UNIFIED SUCCESS (v0 legacy)');
          return {
            wallet: walletData,
            metadata: {
              id: 'legacy',
              nickname: 'Wallet 1',
              createdAt: 0,
              lastUsedAt: Date.now()
            },
            isHierarchical: false
          };
        }
      }

      console.log('❌ [Storage] TRY_UNLOCK_ANY_WALLET_UNIFIED - No wallet matched PIN');
      return null;
    } catch (error) {
      console.error('❌ [Storage] TRY_UNLOCK_ANY_WALLET_UNIFIED FAILED', error);
      return null;
    }
  }
}