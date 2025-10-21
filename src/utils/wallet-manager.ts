// Wallet Manager - High-level wallet operations and state management
// Combines Breez SDK operations with local storage and state management

import * as bip39 from 'bip39';
import { BreezSDKWrapper, BreezConfig } from './breez-sdk';
import { ChromeStorageManager } from './storage';
import { WalletData, Transaction, UserSettings } from '../types';

export interface WalletStatus {
  isConnected: boolean;
  isUnlocked: boolean;
  balance: number;
  nodeId?: string;
  channelCount?: number;
  lastSync?: number;
}

export interface WalletSetupOptions {
  mnemonic?: string;
  pin: string;
  network?: 'mainnet' | 'testnet';
  apiKey?: string;
}

export class WalletManager {
  private breezSDK: BreezSDKWrapper;
  private storage: ChromeStorageManager;
  private walletStatus: WalletStatus;

  constructor() {
    this.breezSDK = new BreezSDKWrapper();
    this.storage = new ChromeStorageManager();
    this.walletStatus = {
      isConnected: false,
      isUnlocked: false,
      balance: 0
    };
  }

  /**
   * Initialize wallet with setup options and connect Breez SDK
   */
  async setupWallet(options: WalletSetupOptions): Promise<void> {
    try {
      console.log('WalletManager: Starting wallet setup with Breez SDK');

      // Get user settings
      const settings = await this.storage.getUserSettings();
      console.log('WalletManager: Got user settings:', settings);

      // Generate a proper BIP39 mnemonic if none provided
      const mnemonic = options.mnemonic || this.generateMnemonic();
      console.log('WalletManager: Using mnemonic (length):', mnemonic.split(' ').length);

      // Validate mnemonic
      if (!bip39.validateMnemonic(mnemonic)) {
        throw new Error('Invalid mnemonic phrase');
      }

      // Initialize Breez SDK
      console.log('WalletManager: Initializing Breez SDK...');
      await this.breezSDK.initializeSDK();
      console.log('WalletManager: Breez SDK initialized');

      // Prepare Breez SDK configuration
      const breezConfig: BreezConfig = {
        network: options.network || 'mainnet',
        apiKey: options.apiKey || undefined
      };

      // Connect wallet with mnemonic
      console.log('WalletManager: Connecting wallet to Breez SDK...');
      await this.breezSDK.connectWallet(mnemonic, breezConfig);
      console.log('WalletManager: Wallet connected to Breez SDK');

      // Get real balance from Breez SDK
      let balance = 0;
      try {
        balance = await this.breezSDK.getBalance();
        console.log('WalletManager: Retrieved balance:', balance, 'sats');
      } catch (balanceError) {
        console.warn('WalletManager: Could not retrieve balance (new wallet):', balanceError);
        // This is expected for new wallets - balance will be 0
      }

      // Generate LNURL for receiving payments
      let lnurl: string | undefined = undefined;
      try {
        lnurl = await this.breezSDK.receiveLnurlPay();
        console.log('WalletManager: Generated receive LNURL:', lnurl);
      } catch (lnurlError) {
        console.warn('WalletManager: Could not generate LNURL (new wallet):', lnurlError);
        // This may fail for new wallets without channels
      }

      // Create wallet data with real values from Breez SDK
      const walletData: WalletData = {
        mnemonic: mnemonic,
        balance: balance,
        lnurl: lnurl,
        customLNURL: settings.customLNURL,
        transactions: []
      };

      console.log('WalletManager: Saving encrypted wallet data with PIN');

      // Save encrypted wallet data
      await this.storage.saveEncryptedWallet(walletData, options.pin);
      console.log('WalletManager: Wallet data encrypted and saved');

      await this.storage.unlockWallet();
      console.log('WalletManager: Wallet unlocked');

      // Update status with real connection info
      this.walletStatus = {
        isConnected: true,
        isUnlocked: true,
        balance: balance,
        lastSync: Date.now()
      };

      console.log('WalletManager: Wallet setup completed successfully with Breez SDK connected');
    } catch (error) {
      console.error('WalletManager: Wallet setup failed:', error);
      throw new Error(`Wallet setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate a proper BIP39 mnemonic (12 words)
   */
  private generateMnemonic(): string {
    return bip39.generateMnemonic();
  }

  /**
   * Unlock existing wallet with PIN and optional API key
   */
  async unlockWallet(pin: string, apiKey?: string): Promise<void> {
    try {
      // Load encrypted wallet data
      const walletData = await this.storage.loadEncryptedWallet(pin);
      if (!walletData) {
        throw new Error('Invalid PIN or wallet not found');
      }

      // Connect to Breez SDK with stored mnemonic
      if (walletData.mnemonic) {
        const breezConfig: BreezConfig = {
          network: 'mainnet',
          apiKey: apiKey
        };
        await this.breezSDK.connectWallet(walletData.mnemonic, breezConfig);
      } else {
        throw new Error('No mnemonic found in wallet data');
      }

      // Update wallet status
      await this.updateWalletStatus();
      await this.storage.unlockWallet();

      console.log('Wallet unlocked successfully');
    } catch (error) {
      console.error('Wallet unlock failed:', error);
      throw new Error(`Wallet unlock failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Lock wallet and disconnect
   */
  async lockWallet(): Promise<void> {
    try {
      await this.breezSDK.disconnect();
      await this.storage.lockWallet();
      
      this.walletStatus = {
        isConnected: false,
        isUnlocked: false,
        balance: 0
      };

      console.log('Wallet locked successfully');
    } catch (error) {
      console.error('Wallet lock failed:', error);
      throw new Error(`Wallet lock failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get current wallet status
   */
  async getWalletStatus(): Promise<WalletStatus> {
    try {
      if (this.breezSDK.isWalletConnected()) {
        await this.updateWalletStatus();
      } else {
        // Check if wallet should be unlocked
        const isUnlocked = await this.storage.isWalletUnlocked();
        this.walletStatus.isUnlocked = isUnlocked;
      }

      return { ...this.walletStatus };
    } catch (error) {
      console.error('Failed to get wallet status:', error);
      return { ...this.walletStatus };
    }
  }

  /**
   * Update wallet status from Breez SDK
   */
  private async updateWalletStatus(): Promise<void> {
    try {
      if (!this.breezSDK.isWalletConnected()) {
        this.walletStatus.isConnected = false;
        return;
      }

      const [balance, nodeInfo] = await Promise.all([
        this.breezSDK.getBalance(),
        this.breezSDK.getNodeInfo()
      ]);

      this.walletStatus = {
        isConnected: true,
        isUnlocked: await this.storage.isWalletUnlocked(),
        balance,
        nodeId: nodeInfo.id,
        lastSync: Date.now()
      };
    } catch (error) {
      console.error('Failed to update wallet status:', error);
      this.walletStatus.isConnected = false;
    }
  }

  /**
   * Generate Lightning invoice for receiving payments
   */
  async generateInvoice(amount: number, description: string): Promise<string> {
    this.ensureWalletReady();

    try {
      const invoice = await this.breezSDK.receivePayment({ amountSats: amount, description });
      
      // Update activity timestamp
      await this.storage.updateActivity();
      
      return invoice;
    } catch (error) {
      console.error('Invoice generation failed:', error);
      throw new Error(`Invoice generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send Lightning payment
   */
  async sendPayment(bolt11: string): Promise<boolean> {
    this.ensureWalletReady();

    try {
      const success = await this.breezSDK.sendPayment({ bolt11 });
      
      if (success) {
        // Update balance and activity
        await this.updateWalletStatus();
        await this.storage.updateActivity();
      }
      
      return success;
    } catch (error) {
      console.error('Payment failed:', error);
      throw new Error(`Payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get payment history with caching
   */
  async getPaymentHistory(forceRefresh = false): Promise<Transaction[]> {
    this.ensureWalletReady();

    try {
      const payments = await this.breezSDK.listPayments();
      
      // Update activity timestamp
      await this.storage.updateActivity();
      
      return payments;
    } catch (error) {
      console.error('Failed to get payment history:', error);
      throw new Error(`Payment history retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get current balance
   */
  async getBalance(): Promise<number> {
    this.ensureWalletReady();

    try {
      const balance = await this.breezSDK.getBalance();
      this.walletStatus.balance = balance;
      
      // Update activity timestamp
      await this.storage.updateActivity();
      
      return balance;
    } catch (error) {
      console.error('Failed to get balance:', error);
      throw new Error(`Balance retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse LNURL for payment information
   */
  async parseLnurl(lnurl: string): Promise<any> {
    this.ensureWalletReady();

    try {
      const parsed = await this.breezSDK.parseLnurl(lnurl);
      
      // Update activity timestamp
      await this.storage.updateActivity();
      
      return parsed;
    } catch (error) {
      console.error('LNURL parsing failed:', error);
      throw new Error(`LNURL parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Pay LNURL with amount and optional comment
   */
  async payLnurl(reqData: any, amount: number, comment?: string): Promise<boolean> {
    this.ensureWalletReady();

    try {
      const success = await this.breezSDK.payLnurl({ reqData, amountSats: amount, comment });
      
      if (success) {
        // Update balance and activity
        await this.updateWalletStatus();
        await this.storage.updateActivity();
      }
      
      return success;
    } catch (error) {
      console.error('LNURL payment failed:', error);
      throw new Error(`LNURL payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate LNURL for receiving payments
   */
  async generateReceiveLnurl(): Promise<string> {
    this.ensureWalletReady();

    try {
      const lnurl = await this.breezSDK.receiveLnurlPay();
      
      // Update activity timestamp
      await this.storage.updateActivity();
      
      return lnurl;
    } catch (error) {
      console.error('LNURL generation failed:', error);
      throw new Error(`LNURL generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if wallet has sufficient balance for payment
   */
  async hasSufficientBalance(amount: number): Promise<boolean> {
    try {
      const balance = await this.getBalance();
      return balance >= amount;
    } catch (error) {
      console.error('Failed to check balance:', error);
      return false;
    }
  }

  /**
   * Get node information
   */
  async getNodeInfo(): Promise<any> {
    this.ensureWalletReady();

    try {
      const nodeInfo = await this.breezSDK.getNodeInfo();
      
      // Update activity timestamp
      await this.storage.updateActivity();
      
      return nodeInfo;
    } catch (error) {
      console.error('Failed to get node info:', error);
      throw new Error(`Node info retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Ensure wallet is ready for operations
   */
  private ensureWalletReady(): void {
    if (!this.breezSDK.isWalletConnected()) {
      throw new Error('Wallet not connected. Please unlock wallet first.');
    }

    if (!this.walletStatus.isUnlocked) {
      throw new Error('Wallet is locked. Please unlock wallet first.');
    }
  }

  /**
   * Get Breez SDK instance (for advanced operations)
   */
  getBreezSDK(): BreezSDKWrapper {
    return this.breezSDK;
  }

  /**
   * Get storage manager instance
   */
  getStorageManager(): ChromeStorageManager {
    return this.storage;
  }

  // ========================================
  // Multi-Wallet Support Methods (Phase 2)
  // ========================================

  /**
   * Create a new wallet with generated mnemonic
   * Generates a 12-word BIP39 mnemonic and adds to wallet storage
   *
   * @param nickname - User-friendly name for the wallet
   * @param pin - User's PIN for encryption
   * @returns Wallet data with mnemonic and initial balance
   */
  async createWallet(nickname: string, pin: string): Promise<WalletData> {
    try {
      console.log('WalletManager: Creating new wallet', { nickname });

      // Generate new BIP39 mnemonic (12 words)
      const mnemonic = bip39.generateMnemonic();
      console.log('WalletManager: Generated new mnemonic');

      // Validate generated mnemonic
      if (!bip39.validateMnemonic(mnemonic)) {
        throw new Error('Generated mnemonic validation failed');
      }

      // Create wallet data structure
      const walletData: WalletData = {
        mnemonic,
        balance: 0,
        transactions: []
      };

      // Add wallet to storage
      const walletId = await this.storage.addWallet(walletData, nickname, pin);
      console.log('WalletManager: Wallet created successfully', { walletId, nickname });

      return walletData;
    } catch (error) {
      console.error('WalletManager: Wallet creation failed:', error);
      throw new Error(`Wallet creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Import an existing wallet from mnemonic
   * Validates mnemonic and checks for duplicates before importing
   *
   * @param mnemonic - 12-word BIP39 mnemonic phrase
   * @param nickname - User-friendly name for the wallet
   * @param pin - User's PIN for encryption
   * @returns Wallet data
   */
  async importWallet(mnemonic: string, nickname: string, pin: string): Promise<WalletData> {
    try {
      console.log('WalletManager: Importing wallet', { nickname });

      // Trim and normalize mnemonic
      const normalizedMnemonic = mnemonic.trim().toLowerCase();

      // Validate mnemonic format
      if (!bip39.validateMnemonic(normalizedMnemonic)) {
        throw new Error('Invalid mnemonic phrase. Please check and try again.');
      }

      // Check for duplicate wallet
      const isDuplicate = await this.isDuplicateMnemonic(normalizedMnemonic, pin);
      if (isDuplicate) {
        throw new Error('This wallet has already been imported. Each wallet can only be added once.');
      }

      // Create wallet data structure
      const walletData: WalletData = {
        mnemonic: normalizedMnemonic,
        balance: 0,
        transactions: []
      };

      // Add wallet to storage
      const walletId = await this.storage.addWallet(walletData, nickname, pin);
      console.log('WalletManager: Wallet imported successfully', { walletId, nickname });

      return walletData;
    } catch (error) {
      console.error('WalletManager: Wallet import failed:', error);
      throw new Error(`Wallet import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Rename a wallet
   * Updates the wallet's nickname in metadata
   *
   * @param walletId - UUID of the wallet to rename
   * @param newNickname - New name for the wallet
   * @param pin - User's PIN for verification
   */
  async renameWallet(walletId: string, newNickname: string, pin: string): Promise<void> {
    try {
      console.log('WalletManager: Renaming wallet', { walletId, newNickname });

      // Validate nickname
      if (!newNickname || newNickname.trim().length === 0) {
        throw new Error('Wallet name cannot be empty');
      }

      if (newNickname.length > 30) {
        throw new Error('Wallet name cannot exceed 30 characters');
      }

      // Load all wallets
      const result = await this.storage.loadWallets(pin);
      if (!result) {
        throw new Error('Failed to load wallets');
      }

      // Find wallet to rename
      const wallet = result.wallets.find(w => w.metadata.id === walletId);
      if (!wallet) {
        throw new Error(`Wallet ${walletId} not found`);
      }

      // Check for duplicate nickname
      const duplicateNickname = result.wallets.some(
        w => w.metadata.id !== walletId && w.metadata.nickname === newNickname.trim()
      );
      if (duplicateNickname) {
        throw new Error(`A wallet named "${newNickname}" already exists`);
      }

      // Update nickname
      const prevNickname = wallet.metadata.nickname;
      wallet.metadata.nickname = newNickname.trim();
      console.log('WalletManager: Nickname updated in-memory', { walletId, prevNickname, newNickname: wallet.metadata.nickname });

      // Save updated wallets
      await this.storage.saveWallets(result.wallets, result.activeId, pin);
      console.log('WalletManager: Wallet renamed successfully', { walletId, newNickname });
    } catch (error) {
      console.error('WalletManager: Wallet rename failed:', error);
      throw new Error(`Wallet rename failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a wallet
   * Removes wallet from storage (prevents deleting the last wallet)
   *
   * @param walletId - UUID of the wallet to delete
   * @param pin - User's PIN for verification
   */
  async deleteWallet(walletId: string, pin: string): Promise<void> {
    try {
      console.log('WalletManager: Deleting wallet', { walletId });

      // Load all wallets to check count
      const result = await this.storage.loadWallets(pin);
      if (!result) {
        throw new Error('Failed to load wallets');
      }

      // Prevent deleting the last wallet
      if (result.wallets.length === 1) {
        throw new Error('Cannot delete the last wallet. At least one wallet must remain.');
      }

      // Remove wallet using storage manager
      await this.storage.removeWallet(walletId, pin);
      console.log('WalletManager: Wallet deleted successfully', { walletId });
    } catch (error) {
      console.error('WalletManager: Wallet deletion failed:', error);
      throw new Error(`Wallet deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Switch to a different wallet
   * Disconnects current SDK, loads new wallet, and prepares for SDK reconnection
   *
   * @param walletId - UUID of the wallet to switch to
   * @param pin - User's PIN to decrypt wallet
   * @returns Wallet data for the new active wallet
   */
  async switchWallet(walletId: string, pin: string): Promise<WalletData> {
    try {
      console.log('WalletManager: Switching to wallet', { walletId });

      // Step 1: Load all wallets to verify walletId exists
      const result = await this.storage.loadWallets(pin);
      if (!result) {
        throw new Error('No wallets found');
      }

      const wallet = result.wallets.find(w => w.metadata.id === walletId);
      if (!wallet) {
        throw new Error(`Wallet ${walletId} not found`);
      }

      // Step 2: Disconnect current SDK if connected
      if (this.breezSDK.isWalletConnected()) {
        console.log('WalletManager: Disconnecting current SDK');
        await this.breezSDK.disconnect();
      }

      // Step 3: Set as active wallet in storage
      await this.storage.setActiveWallet(walletId);

      // Step 4: Get wallet data for SDK reconnection (will be done in popup)
      const walletData = await this.storage.getWalletById(walletId, pin);
      if (!walletData) {
        throw new Error('Failed to load wallet data');
      }

      console.log('WalletManager: Wallet switch prepared', {
        walletId,
        nickname: walletData.metadata.nickname
      });

      // Return wallet data - SDK reconnection will be handled by popup
      return {
        mnemonic: walletData.wallet.mnemonic,
        balance: 0,  // Will be loaded from SDK after reconnection
        transactions: [],
        lnurl: undefined,
        customLNURL: undefined
      };
    } catch (error) {
      console.error('WalletManager: Wallet switch failed:', error);
      throw new Error(`Wallet switch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all wallets (metadata only, no mnemonics)
   * Returns wallet metadata for UI display
   *
   * @returns Array of wallet metadata
   */
  async getAllWallets(): Promise<import('../types').WalletMetadata[]> {
    try {
      console.log('WalletManager: Getting all wallets metadata');

      // Load wallets without decrypting mnemonics
      const result = await this.storage.loadWallets('');
      if (!result) {
        console.log('WalletManager: No wallets found');
        return [];
      }

      // Extract metadata only (no mnemonics)
      const metadata = result.wallets.map(w => w.metadata);
      console.log('WalletManager: Retrieved wallet metadata', { count: metadata.length });

      return metadata;
    } catch (error) {
      console.error('WalletManager: Failed to get wallets:', error);
      // Return empty array on error to avoid breaking UI
      return [];
    }
  }

  /**
   * Check if mnemonic already exists (duplicate detection)
   * Derives fingerprint from mnemonic and compares with existing wallets
   *
   * @param mnemonic - Mnemonic to check
   * @param pin - User's PIN to decrypt existing wallets
   * @returns True if duplicate found, false otherwise
   */
  async isDuplicateMnemonic(mnemonic: string, pin: string): Promise<boolean> {
    try {
      console.log('WalletManager: Checking for duplicate mnemonic');

      // Normalize mnemonic for comparison
      const normalizedMnemonic = mnemonic.trim().toLowerCase();

      // Derive fingerprint from input mnemonic
      const inputSeed = await bip39.mnemonicToSeed(normalizedMnemonic);
      const inputHash = await crypto.subtle.digest('SHA-256', inputSeed.slice(0, 32));
      const inputFingerprint = Array.from(new Uint8Array(inputHash.slice(0, 16)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      console.log('WalletManager: Input fingerprint generated', {
        fingerprint: inputFingerprint.substring(0, 8) + '...'
      });

      // Load all wallets
      const result = await this.storage.loadWallets(pin);
      if (!result) {
        console.log('WalletManager: No existing wallets to check');
        return false;
      }

      // Check each wallet for matching fingerprint
      for (const entry of result.wallets) {
        try {
          // Decrypt wallet mnemonic
          const walletData = await this.storage.getWalletById(entry.metadata.id, pin);
          if (!walletData) continue;

          // Derive fingerprint from wallet mnemonic
          const walletSeed = await bip39.mnemonicToSeed(walletData.wallet.mnemonic);
          const walletHash = await crypto.subtle.digest('SHA-256', walletSeed.slice(0, 32));
          const walletFingerprint = Array.from(new Uint8Array(walletHash.slice(0, 16)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

          // Compare fingerprints
          if (inputFingerprint === walletFingerprint) {
            console.log('WalletManager: Duplicate mnemonic found', {
              walletId: entry.metadata.id,
              nickname: entry.metadata.nickname
            });
            return true;
          }
        } catch (error) {
          console.warn('WalletManager: Failed to check wallet', {
            walletId: entry.metadata.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          // Continue checking other wallets
        }
      }

      console.log('WalletManager: No duplicate found');
      return false;
    } catch (error) {
      console.error('WalletManager: Duplicate check failed:', error);
      // Return false to allow operation to proceed (better than blocking on error)
      return false;
    }
  }
}
