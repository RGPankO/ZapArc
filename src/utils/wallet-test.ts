// Simple wallet test without Breez SDK
// Tests basic storage and encryption functionality

import { ChromeStorageManager } from './storage';
import { WalletData } from '../types';

export class WalletTest {
  private storage: ChromeStorageManager;

  constructor() {
    this.storage = new ChromeStorageManager();
  }

  /**
   * Test basic wallet setup without Breez SDK
   */
  async testBasicWalletSetup(pin: string): Promise<boolean> {
    try {
      console.log('WalletTest: Starting basic wallet test');

      // Test 1: Create basic wallet data
      const testWalletData: WalletData = {
        mnemonic: 'test mnemonic for basic functionality',
        balance: 0,
        lnurl: undefined,
        customLNURL: undefined,
        transactions: []
      };

      console.log('WalletTest: Saving encrypted wallet data');
      
      // Test 2: Save encrypted wallet
      await this.storage.saveEncryptedWallet(testWalletData, pin);
      console.log('WalletTest: Wallet data saved successfully');

      // Test 3: Unlock wallet
      await this.storage.unlockWallet();
      console.log('WalletTest: Wallet unlocked successfully');

      // Test 4: Load encrypted wallet
      const loadedData = await this.storage.loadEncryptedWallet(pin);
      console.log('WalletTest: Wallet data loaded successfully:', loadedData);

      if (!loadedData) {
        throw new Error('Failed to load wallet data');
      }

      // Test 5: Verify data integrity
      if (loadedData.mnemonic !== testWalletData.mnemonic) {
        throw new Error('Wallet data integrity check failed');
      }

      console.log('WalletTest: All tests passed successfully');
      return true;

    } catch (error) {
      console.error('WalletTest: Test failed:', error);
      return false;
    }
  }

  /**
   * Test wallet existence check
   */
  async testWalletExists(): Promise<boolean> {
    try {
      const exists = await this.storage.walletExists();
      console.log('WalletTest: Wallet exists check:', exists);
      return exists;
    } catch (error) {
      console.error('WalletTest: Wallet exists check failed:', error);
      return false;
    }
  }

  /**
   * Clear test wallet data
   */
  async clearTestWallet(): Promise<void> {
    try {
      await chrome.storage.local.remove(['encryptedWallet', 'isUnlocked', 'lastActivity']);
      console.log('WalletTest: Test wallet data cleared');
    } catch (error) {
      console.error('WalletTest: Failed to clear test wallet:', error);
    }
  }
}

// Export for testing
export const walletTest = new WalletTest();