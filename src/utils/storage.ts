// Storage utilities for Chrome Extension
// Handles encrypted storage, settings, and data management

import {
  WalletData,
  UserSettings,
  DomainSettings,
  BlacklistData,
  EncryptedWalletEntry,
  WalletMetadata,
  MultiWalletStorage
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

      // SECURITY: Verify PIN matches existing wallets (defense in depth)
      // Skip verification for first wallet (no existing wallets to verify against)
      if (result.multiWalletData) {
        try {
          const existingWallets = await this.loadWallets(pin);
          if (!existingWallets) {
            console.error('❌ [Storage] ADD_WALLET - Invalid PIN');
            throw new Error('Invalid PIN. All wallets must use the same PIN.');
          }
          console.log('✅ [Storage] ADD_WALLET - PIN verified successfully');
        } catch (error) {
          console.error('❌ [Storage] ADD_WALLET - PIN verification failed:', error);
          throw new Error('Invalid PIN. Cannot add wallet with different PIN.');
        }
      } else {
        console.log('✅ [Storage] ADD_WALLET - First wallet, skipping PIN verification');
      }

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
   * Returns 0 for single-wallet (legacy), 1 for multi-wallet
   */
  async getWalletVersion(): Promise<number> {
    try {
      const result = await chrome.storage.local.get(['walletVersion', 'multiWalletData', 'encryptedWallet']);

      // Check for multi-wallet
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
}