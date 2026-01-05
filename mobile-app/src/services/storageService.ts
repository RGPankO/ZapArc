// Storage Service for secure wallet data management
// Uses Expo SecureStore for encrypted storage on mobile devices

import * as SecureStore from 'expo-secure-store';

import type {
  EncryptedData,
  MasterKeyEntry,
  MultiWalletStorage,
  SubWalletEntry,
  WalletData,
  ActiveWalletInfo,
} from '../features/wallet/types';
import { WALLET_CONSTANTS } from '../features/wallet/types';
import {
  encryptData,
  decryptData,
  generateUUID,
  verifyPin,
  validatePayloadIntegrity,
} from './crypto';

// =============================================================================
// Storage Keys
// =============================================================================

const STORAGE_KEYS = {
  MULTI_WALLET_DATA: 'zap_arc_multi_wallet_data',
  WALLET_VERSION: 'zap_arc_wallet_version',
  IS_UNLOCKED: 'zap_arc_is_unlocked',
  LAST_ACTIVITY: 'zap_arc_last_activity',
  ACTIVE_MASTER_KEY_ID: 'zap_arc_active_master_key',
  ACTIVE_SUB_WALLET_INDEX: 'zap_arc_active_sub_wallet',
} as const;

// =============================================================================
// Storage Service Class
// =============================================================================

class StorageService {
  // ========================================
  // Wallet Existence and Status
  // ========================================

  /**
   * Check if any wallet has been set up
   */
  async walletExists(): Promise<boolean> {
    try {
      const data = await SecureStore.getItemAsync(STORAGE_KEYS.MULTI_WALLET_DATA);
      const version = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_VERSION);

      const exists = !!(data || version === '1');
      console.log('🔍 [StorageService] walletExists() check', {
        hasMultiWalletData: !!data,
        walletVersion: version,
        exists,
      });
      return exists;
    } catch (error) {
      console.error('❌ [StorageService] Failed to check wallet existence:', error);
      return false;
    }
  }

  /**
   * Check if wallet is currently unlocked
   */
  async isWalletUnlocked(): Promise<boolean> {
    try {
      const isUnlocked = await SecureStore.getItemAsync(STORAGE_KEYS.IS_UNLOCKED);
      return isUnlocked === 'true';
    } catch (error) {
      console.error('❌ [StorageService] Failed to check unlock status:', error);
      return false;
    }
  }

  /**
   * Lock the wallet
   */
  async lockWallet(): Promise<void> {
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.IS_UNLOCKED, 'false');
      await SecureStore.setItemAsync(STORAGE_KEYS.LAST_ACTIVITY, '0');
      console.log('🔒 [StorageService] Wallet locked');
    } catch (error) {
      console.error('❌ [StorageService] Failed to lock wallet:', error);
    }
  }

  /**
   * Unlock the wallet
   */
  async unlockWallet(): Promise<void> {
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.IS_UNLOCKED, 'true');
      await SecureStore.setItemAsync(
        STORAGE_KEYS.LAST_ACTIVITY,
        Date.now().toString()
      );
      console.log('🔓 [StorageService] Wallet unlocked');
    } catch (error) {
      console.error('❌ [StorageService] Failed to unlock wallet:', error);
    }
  }

  /**
   * Update last activity timestamp
   */
  async updateActivity(): Promise<void> {
    try {
      const isUnlocked = await this.isWalletUnlocked();
      if (isUnlocked) {
        await SecureStore.setItemAsync(
          STORAGE_KEYS.LAST_ACTIVITY,
          Date.now().toString()
        );
      }
    } catch (error) {
      console.error('❌ [StorageService] Failed to update activity:', error);
    }
  }

  /**
   * Get last activity timestamp
   */
  async getLastActivity(): Promise<number> {
    try {
      const lastActivity = await SecureStore.getItemAsync(STORAGE_KEYS.LAST_ACTIVITY);
      return lastActivity ? parseInt(lastActivity, 10) : 0;
    } catch (error) {
      console.error('❌ [StorageService] Failed to get last activity:', error);
      return 0;
    }
  }

  // ========================================
  // Multi-Wallet Storage Operations
  // ========================================

  /**
   * Save multi-wallet storage data
   */
  async saveMultiWalletStorage(storage: MultiWalletStorage): Promise<void> {
    console.log('🔵 [StorageService] SAVE_MULTI_WALLET_STORAGE', {
      masterKeyCount: storage.masterKeys.length,
      activeMasterKeyId: storage.activeMasterKeyId,
      version: storage.version,
    });

    try {
      const serialized = JSON.stringify(storage);

      // SecureStore has a size limit, check length
      if (serialized.length > 2048) {
        console.warn(
          '⚠️ [StorageService] Multi-wallet data is large, may need chunking in future',
          { size: serialized.length }
        );
      }

      await SecureStore.setItemAsync(STORAGE_KEYS.MULTI_WALLET_DATA, serialized);
      await SecureStore.setItemAsync(
        STORAGE_KEYS.WALLET_VERSION,
        storage.version.toString()
      );

      // Update active wallet tracking
      await SecureStore.setItemAsync(
        STORAGE_KEYS.ACTIVE_MASTER_KEY_ID,
        storage.activeMasterKeyId
      );
      await SecureStore.setItemAsync(
        STORAGE_KEYS.ACTIVE_SUB_WALLET_INDEX,
        storage.activeSubWalletIndex.toString()
      );

      console.log('✅ [StorageService] SAVE_MULTI_WALLET_STORAGE SUCCESS');
    } catch (error) {
      console.error('❌ [StorageService] SAVE_MULTI_WALLET_STORAGE FAILED', error);
      throw error;
    }
  }

  /**
   * Load multi-wallet storage data
   */
  async loadMultiWalletStorage(): Promise<MultiWalletStorage | null> {
    console.log('🔵 [StorageService] LOAD_MULTI_WALLET_STORAGE');

    try {
      const serialized = await SecureStore.getItemAsync(STORAGE_KEYS.MULTI_WALLET_DATA);

      if (!serialized) {
        console.warn('⚠️ [StorageService] No multi-wallet data found');
        return null;
      }

      const storage: MultiWalletStorage = JSON.parse(serialized);

      // Validate schema version
      if (storage.version !== WALLET_CONSTANTS.STORAGE_VERSION) {
        console.error('❌ [StorageService] Unsupported wallet schema version', {
          expected: WALLET_CONSTANTS.STORAGE_VERSION,
          actual: storage.version,
        });
        throw new Error(`Unsupported wallet schema version: ${storage.version}`);
      }

      console.log('✅ [StorageService] LOAD_MULTI_WALLET_STORAGE SUCCESS', {
        masterKeyCount: storage.masterKeys.length,
        activeMasterKeyId: storage.activeMasterKeyId,
      });

      return storage;
    } catch (error) {
      console.error('❌ [StorageService] LOAD_MULTI_WALLET_STORAGE FAILED', error);
      return null;
    }
  }

  // ========================================
  // Master Key Operations
  // ========================================

  /**
   * Create a new master key with encrypted mnemonic
   */
  async createMasterKey(
    mnemonic: string,
    nickname: string,
    pin: string
  ): Promise<string> {
    console.log('🔵 [StorageService] CREATE_MASTER_KEY', { nickname });

    try {
      // Encrypt the mnemonic
      const encryptedMnemonic = await encryptData(mnemonic, pin);

      // Create master key entry
      const masterKeyId = generateUUID();
      const now = Date.now();

      const masterKey: MasterKeyEntry = {
        id: masterKeyId,
        nickname,
        encryptedMnemonic,
        subWallets: [
          {
            index: 0,
            nickname: 'Main Wallet',
            createdAt: now,
            lastUsedAt: now,
            hasActivity: undefined, // Unknown until SDK check
            hasTransactionHistory: undefined,
          },
        ],
        archivedSubWallets: [],
        createdAt: now,
        lastUsedAt: now,
        isExpanded: false,
        canCreateSubWallets: false, // Initially disabled until activity check
      };

      // Load existing storage or create new
      let storage = await this.loadMultiWalletStorage();

      if (storage) {
        storage.masterKeys.push(masterKey);
      } else {
        storage = {
          masterKeys: [masterKey],
          activeMasterKeyId: masterKeyId,
          activeSubWalletIndex: 0,
          version: WALLET_CONSTANTS.STORAGE_VERSION,
        };
      }

      // Save updated storage
      await this.saveMultiWalletStorage(storage);

      console.log('✅ [StorageService] CREATE_MASTER_KEY SUCCESS', { masterKeyId });
      return masterKeyId;
    } catch (error) {
      console.error('❌ [StorageService] CREATE_MASTER_KEY FAILED', error);
      throw error;
    }
  }

  /**
   * Decrypt and get the mnemonic for a master key
   */
  async getMasterKeyMnemonic(masterKeyId: string, pin: string): Promise<string | null> {
    console.log('🔵 [StorageService] GET_MASTER_KEY_MNEMONIC', { masterKeyId });

    try {
      const storage = await this.loadMultiWalletStorage();
      if (!storage) {
        console.warn('⚠️ [StorageService] No storage found');
        return null;
      }

      const masterKey = storage.masterKeys.find((mk) => mk.id === masterKeyId);
      if (!masterKey) {
        console.warn('⚠️ [StorageService] Master key not found', { masterKeyId });
        return null;
      }

      // Validate timestamp integrity
      validatePayloadIntegrity(masterKey.encryptedMnemonic.timestamp);

      // Decrypt mnemonic
      const mnemonic = await decryptData(masterKey.encryptedMnemonic, pin);

      console.log('✅ [StorageService] GET_MASTER_KEY_MNEMONIC SUCCESS');
      return mnemonic;
    } catch (error) {
      console.error('❌ [StorageService] GET_MASTER_KEY_MNEMONIC FAILED', error);
      return null;
    }
  }

  /**
   * Delete a master key and all its sub-wallets
   */
  async deleteMasterKey(masterKeyId: string): Promise<void> {
    console.log('🔵 [StorageService] DELETE_MASTER_KEY', { masterKeyId });

    try {
      const storage = await this.loadMultiWalletStorage();
      if (!storage) {
        throw new Error('No storage found');
      }

      const index = storage.masterKeys.findIndex((mk) => mk.id === masterKeyId);
      if (index === -1) {
        throw new Error('Master key not found');
      }

      // Remove the master key
      storage.masterKeys.splice(index, 1);

      // If we deleted the active master key, switch to first available
      if (storage.activeMasterKeyId === masterKeyId && storage.masterKeys.length > 0) {
        storage.activeMasterKeyId = storage.masterKeys[0].id;
        storage.activeSubWalletIndex = 0;
        console.log('⚠️ [StorageService] Switched to different master key', {
          newActiveMasterKeyId: storage.activeMasterKeyId,
        });
      }

      await this.saveMultiWalletStorage(storage);
      console.log('✅ [StorageService] DELETE_MASTER_KEY SUCCESS');
    } catch (error) {
      console.error('❌ [StorageService] DELETE_MASTER_KEY FAILED', error);
      throw error;
    }
  }

  /**
   * Verify PIN for a specific master key
   */
  async verifyMasterKeyPin(masterKeyId: string, pin: string): Promise<boolean> {
    console.log('🔵 [StorageService] VERIFY_MASTER_KEY_PIN', { masterKeyId });

    try {
      const storage = await this.loadMultiWalletStorage();
      if (!storage) {
        return false;
      }

      const masterKey = storage.masterKeys.find((mk) => mk.id === masterKeyId);
      if (!masterKey) {
        return false;
      }

      const isValid = await verifyPin(masterKey.encryptedMnemonic, pin);
      console.log('✅ [StorageService] VERIFY_MASTER_KEY_PIN', { isValid });
      return isValid;
    } catch (error) {
      console.error('❌ [StorageService] VERIFY_MASTER_KEY_PIN FAILED', error);
      return false;
    }
  }

  // ========================================
  // Sub-Wallet Operations
  // ========================================

  /**
   * Add a new sub-wallet to a master key
   */
  async addSubWallet(
    masterKeyId: string,
    subWallet: SubWalletEntry
  ): Promise<void> {
    console.log('🔵 [StorageService] ADD_SUB_WALLET', {
      masterKeyId,
      subWalletIndex: subWallet.index,
    });

    try {
      const storage = await this.loadMultiWalletStorage();
      if (!storage) {
        throw new Error('No storage found');
      }

      const masterKey = storage.masterKeys.find((mk) => mk.id === masterKeyId);
      if (!masterKey) {
        throw new Error('Master key not found');
      }

      // Check limit
      if (masterKey.subWallets.length >= WALLET_CONSTANTS.MAX_SUB_WALLETS) {
        throw new Error(
          `Maximum sub-wallets (${WALLET_CONSTANTS.MAX_SUB_WALLETS}) reached`
        );
      }

      // Add sub-wallet
      masterKey.subWallets.push(subWallet);
      masterKey.lastUsedAt = Date.now();

      await this.saveMultiWalletStorage(storage);
      console.log('✅ [StorageService] ADD_SUB_WALLET SUCCESS');
    } catch (error) {
      console.error('❌ [StorageService] ADD_SUB_WALLET FAILED', error);
      throw error;
    }
  }

  /**
   * Archive a sub-wallet (move to archived list)
   */
  async archiveSubWallet(masterKeyId: string, subWalletIndex: number): Promise<void> {
    console.log('🔵 [StorageService] ARCHIVE_SUB_WALLET', {
      masterKeyId,
      subWalletIndex,
    });

    try {
      const storage = await this.loadMultiWalletStorage();
      if (!storage) {
        throw new Error('No storage found');
      }

      const masterKey = storage.masterKeys.find((mk) => mk.id === masterKeyId);
      if (!masterKey) {
        throw new Error('Master key not found');
      }

      const subWalletIdx = masterKey.subWallets.findIndex(
        (sw) => sw.index === subWalletIndex
      );
      if (subWalletIdx === -1) {
        throw new Error('Sub-wallet not found');
      }

      // Move to archived
      const [subWallet] = masterKey.subWallets.splice(subWalletIdx, 1);
      subWallet.archivedAt = Date.now();
      masterKey.archivedSubWallets.push(subWallet);

      await this.saveMultiWalletStorage(storage);
      console.log('✅ [StorageService] ARCHIVE_SUB_WALLET SUCCESS');
    } catch (error) {
      console.error('❌ [StorageService] ARCHIVE_SUB_WALLET FAILED', error);
      throw error;
    }
  }

  /**
   * Restore an archived sub-wallet
   */
  async restoreSubWallet(masterKeyId: string, subWalletIndex: number): Promise<void> {
    console.log('🔵 [StorageService] RESTORE_SUB_WALLET', {
      masterKeyId,
      subWalletIndex,
    });

    try {
      const storage = await this.loadMultiWalletStorage();
      if (!storage) {
        throw new Error('No storage found');
      }

      const masterKey = storage.masterKeys.find((mk) => mk.id === masterKeyId);
      if (!masterKey) {
        throw new Error('Master key not found');
      }

      const archivedIdx = masterKey.archivedSubWallets.findIndex(
        (sw) => sw.index === subWalletIndex
      );
      if (archivedIdx === -1) {
        throw new Error('Archived sub-wallet not found');
      }

      // Move back to active
      const [subWallet] = masterKey.archivedSubWallets.splice(archivedIdx, 1);
      delete subWallet.archivedAt;
      subWallet.lastUsedAt = Date.now();
      masterKey.subWallets.push(subWallet);

      // Sort by index
      masterKey.subWallets.sort((a, b) => a.index - b.index);

      await this.saveMultiWalletStorage(storage);
      console.log('✅ [StorageService] RESTORE_SUB_WALLET SUCCESS');
    } catch (error) {
      console.error('❌ [StorageService] RESTORE_SUB_WALLET FAILED', error);
      throw error;
    }
  }

  // ========================================
  // Active Wallet Operations
  // ========================================

  /**
   * Set the active wallet (master key + sub-wallet)
   */
  async setActiveWallet(masterKeyId: string, subWalletIndex: number): Promise<void> {
    console.log('🔵 [StorageService] SET_ACTIVE_WALLET', {
      masterKeyId,
      subWalletIndex,
    });

    try {
      const storage = await this.loadMultiWalletStorage();
      if (!storage) {
        throw new Error('No storage found');
      }

      // Validate master key exists
      const masterKey = storage.masterKeys.find((mk) => mk.id === masterKeyId);
      if (!masterKey) {
        throw new Error('Master key not found');
      }

      // Validate sub-wallet exists
      const subWallet = masterKey.subWallets.find((sw) => sw.index === subWalletIndex);
      if (!subWallet) {
        throw new Error('Sub-wallet not found');
      }

      // Update active wallet
      storage.activeMasterKeyId = masterKeyId;
      storage.activeSubWalletIndex = subWalletIndex;

      // Update timestamps
      masterKey.lastUsedAt = Date.now();
      subWallet.lastUsedAt = Date.now();

      await this.saveMultiWalletStorage(storage);
      console.log('✅ [StorageService] SET_ACTIVE_WALLET SUCCESS');
    } catch (error) {
      console.error('❌ [StorageService] SET_ACTIVE_WALLET FAILED', error);
      throw error;
    }
  }

  /**
   * Get the current active wallet info
   */
  async getActiveWalletInfo(): Promise<ActiveWalletInfo | null> {
    try {
      const storage = await this.loadMultiWalletStorage();
      if (!storage) {
        return null;
      }

      const masterKey = storage.masterKeys.find(
        (mk) => mk.id === storage.activeMasterKeyId
      );
      if (!masterKey) {
        return null;
      }

      const subWallet = masterKey.subWallets.find(
        (sw) => sw.index === storage.activeSubWalletIndex
      );
      if (!subWallet) {
        return null;
      }

      return {
        masterKeyId: masterKey.id,
        masterKeyNickname: masterKey.nickname,
        subWalletIndex: subWallet.index,
        subWalletNickname: subWallet.nickname,
      };
    } catch (error) {
      console.error('❌ [StorageService] GET_ACTIVE_WALLET_INFO FAILED', error);
      return null;
    }
  }

  // ========================================
  // Utility Operations
  // ========================================

  /**
   * Delete all wallet data (factory reset)
   */
  async deleteAllWallets(): Promise<void> {
    console.log('🔵 [StorageService] DELETE_ALL_WALLETS');

    try {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.MULTI_WALLET_DATA);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.WALLET_VERSION);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.IS_UNLOCKED);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.LAST_ACTIVITY);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.ACTIVE_MASTER_KEY_ID);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.ACTIVE_SUB_WALLET_INDEX);

      console.log('✅ [StorageService] DELETE_ALL_WALLETS SUCCESS');
    } catch (error) {
      console.error('❌ [StorageService] DELETE_ALL_WALLETS FAILED', error);
      throw error;
    }
  }

  /**
   * Get the next available sub-wallet index for a master key
   * Skips indices that are occupied by active or archived sub-wallets
   */
  async getNextSubWalletIndex(masterKeyId: string): Promise<number> {
    try {
      const storage = await this.loadMultiWalletStorage();
      if (!storage) {
        return 0;
      }

      const masterKey = storage.masterKeys.find((mk) => mk.id === masterKeyId);
      if (!masterKey) {
        return 0;
      }

      // Get all used indices (active + archived)
      const usedIndices = new Set([
        ...masterKey.subWallets.map((sw) => sw.index),
        ...masterKey.archivedSubWallets.map((sw) => sw.index),
      ]);

      // Find first available index
      for (let i = 0; i < WALLET_CONSTANTS.MAX_SUB_WALLETS; i++) {
        if (!usedIndices.has(i)) {
          return i;
        }
      }

      throw new Error('No available sub-wallet indices');
    } catch (error) {
      console.error('❌ [StorageService] GET_NEXT_SUB_WALLET_INDEX FAILED', error);
      throw error;
    }
  }
}

// Export singleton instance
export const storageService = new StorageService();

// Export class for testing
export { StorageService };
