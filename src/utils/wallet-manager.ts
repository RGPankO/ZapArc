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
}