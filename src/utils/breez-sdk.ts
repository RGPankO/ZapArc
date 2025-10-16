// Breez SDK Spark wrapper for Lightning Network operations
// Handles wallet initialization, payments, and LNURL operations

import { Transaction } from '../types';
import * as bip39 from 'bip39';

export interface BreezConfig {
  network: 'mainnet' | 'testnet';
  apiKey?: string;
}

export interface InvoiceRequest {
  amountSats: number;
  description: string;
}

export interface PaymentRequest {
  bolt11: string;
}

export interface LnurlPayRequest {
  reqData: any;
  amountSats: number;
  comment?: string;
}

export class BreezSDKWrapper {
  private sdk: any = null;
  private isInitialized = false;
  private isConnected = false;

  /**
   * Initialize Breez SDK WASM module
   */
  async initializeSDK(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Dynamic import to handle WASM loading
      const breezModule = await import('@breeztech/breez-sdk-spark');
      
      // Initialize WASM
      await breezModule.default();
      console.log('Breez SDK WASM initialized successfully');
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Breez SDK:', error);
      throw new Error(`Breez SDK initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Connect to Breez SDK with wallet configuration
   */
  async connectWallet(mnemonic?: string, config: BreezConfig = { network: 'mainnet' }): Promise<void> {
    if (!this.isInitialized) {
      await this.initializeSDK();
    }

    try {
      const { connect, defaultConfig } = await import('@breeztech/breez-sdk-spark');

      // Configure Breez SDK
      const breezConfig = defaultConfig(config.network);
      if (config.apiKey) {
        breezConfig.apiKey = config.apiKey;
      }

      // Generate mnemonic if not provided
      const walletMnemonic = mnemonic || bip39.generateMnemonic();

      // Connect to Breez SDK - mnemonic is a direct string parameter
      this.sdk = await connect({
        config: breezConfig,
        mnemonic: walletMnemonic,  // Direct string parameter, not seed object
        storageDir: 'breez_lightning_data'
      });

      this.isConnected = true;
      console.log('Breez SDK wallet connected successfully');
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw new Error(`Wallet connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if wallet is connected
   */
  isWalletConnected(): boolean {
    return this.isConnected && this.sdk !== null;
  }

  /**
   * Get wallet balance in satoshis
   */
  async getBalance(): Promise<number> {
    this.ensureConnected();

    try {
      const nodeInfo = await this.sdk.nodeInfo();
      return nodeInfo.channelsBalanceSats || 0;
    } catch (error) {
      console.error('Failed to get balance:', error);
      throw new Error(`Balance retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate Lightning invoice for receiving payments
   */
  async receivePayment(request: InvoiceRequest): Promise<string> {
    this.ensureConnected();

    try {
      const response = await this.sdk.receivePayment({
        amountSats: request.amountSats,
        description: request.description
      });
      return response.bolt11;
    } catch (error) {
      console.error('Failed to generate invoice:', error);
      throw new Error(`Invoice generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send Lightning payment using bolt11 invoice
   */
  async sendPayment(request: PaymentRequest): Promise<boolean> {
    this.ensureConnected();

    try {
      await this.sdk.sendPayment({ bolt11: request.bolt11 });
      return true;
    } catch (error) {
      console.error('Failed to send payment:', error);
      throw new Error(`Payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get payment history
   */
  async listPayments(): Promise<Transaction[]> {
    this.ensureConnected();

    try {
      const payments = await this.sdk.listPayments();
      return payments.map((payment: any) => ({
        id: payment.id,
        type: payment.paymentType === 'sent' ? 'send' : 'receive',
        amount: payment.amountSats,
        description: payment.description || '',
        timestamp: payment.paymentTime,
        status: this.mapPaymentStatus(payment.status)
      }));
    } catch (error) {
      console.error('Failed to list payments:', error);
      throw new Error(`Payment history retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse LNURL string
   */
  async parseLnurl(lnurl: string): Promise<any> {
    this.ensureConnected();

    try {
      return await this.sdk.parseLnurl(lnurl);
    } catch (error) {
      console.error('Failed to parse LNURL:', error);
      throw new Error(`LNURL parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Pay LNURL-pay request
   */
  async payLnurl(request: LnurlPayRequest): Promise<boolean> {
    this.ensureConnected();

    try {
      await this.sdk.payLnurl({
        reqData: request.reqData,
        amountSats: request.amountSats,
        comment: request.comment || ''
      });
      return true;
    } catch (error) {
      console.error('Failed to pay LNURL:', error);
      throw new Error(`LNURL payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate LNURL for receiving payments
   */
  async receiveLnurlPay(): Promise<string> {
    this.ensureConnected();

    try {
      const lnurlData = await this.sdk.receiveLnurlPay();
      return lnurlData.lnurl;
    } catch (error) {
      console.error('Failed to generate receive LNURL:', error);
      throw new Error(`LNURL generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get node information
   */
  async getNodeInfo(): Promise<any> {
    this.ensureConnected();

    try {
      return await this.sdk.nodeInfo();
    } catch (error) {
      console.error('Failed to get node info:', error);
      throw new Error(`Node info retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Disconnect wallet
   */
  async disconnect(): Promise<void> {
    if (this.sdk) {
      try {
        await this.sdk.disconnect();
        this.sdk = null;
        this.isConnected = false;
        console.log('Breez SDK wallet disconnected');
      } catch (error) {
        console.error('Failed to disconnect wallet:', error);
      }
    }
  }

  /**
   * Ensure wallet is connected before operations
   */
  private ensureConnected(): void {
    if (!this.isConnected || !this.sdk) {
      throw new Error('Wallet not connected. Please initialize wallet first.');
    }
  }

  /**
   * Map Breez SDK payment status to our Transaction status
   */
  private mapPaymentStatus(breezStatus: string): 'pending' | 'completed' | 'failed' {
    switch (breezStatus?.toLowerCase()) {
      case 'complete':
      case 'succeeded':
        return 'completed';
      case 'pending':
      case 'in_flight':
        return 'pending';
      case 'failed':
      case 'canceled':
        return 'failed';
      default:
        return 'pending';
    }
  }
}