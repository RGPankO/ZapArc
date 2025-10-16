// Storage utilities for Chrome Extension
// Handles encrypted storage, settings, and data management

import { WalletData, UserSettings, DomainSettings, BlacklistData } from '../types';

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
   */
  async walletExists(): Promise<boolean> {
    try {
      const result = await chrome.storage.local.get(['encryptedWallet']);
      return !!result.encryptedWallet;
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
}