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

export interface LnurlPayResult {
  success: boolean;
  paymentId?: string;
  paymentHash?: string;
  preimage?: string;
  amountSats?: number;
  feeSats?: number;
  successAction?: {
    type: 'message' | 'url' | 'aes';
    message?: string;
    url?: string;
    description?: string;
  };
  error?: string;
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
   * Pay LNURL-pay request using the two-step flow (prepareLnurlPay → lnurlPay)
   * Returns confirmed payment result - the promise resolves only after payment is confirmed
   */
  async payLnurl(request: LnurlPayRequest): Promise<LnurlPayResult> {
    this.ensureConnected();

    try {
      // Step 1: Prepare the LNURL payment (gets invoice, calculates fees)
      console.log('[BreezSDK] Preparing LNURL payment...', {
        amountSats: request.amountSats,
        hasComment: !!request.comment
      });

      const prepareResponse = await this.sdk.prepareLnurlPay({
        amountSats: request.amountSats,
        payRequest: request.reqData,
        comment: request.comment || undefined,
        validateSuccessActionUrl: true
      });

      console.log('[BreezSDK] Payment prepared:', {
        amountSats: prepareResponse.amountSats,
        feeSats: prepareResponse.feeSats,
        hasSuccessAction: !!prepareResponse.successAction
      });

      // Step 2: Execute the payment - this waits for confirmation
      console.log('[BreezSDK] Executing LNURL payment...');
      const result = await this.sdk.lnurlPay({
        prepareResponse: prepareResponse
      });

      // Payment confirmed! Extract result details
      console.log('[BreezSDK] Payment confirmed:', {
        paymentId: result.payment?.id,
        status: result.payment?.status,
        hasSuccessAction: !!result.successAction
      });

      // Build success result with payment details
      const payResult: LnurlPayResult = {
        success: true,
        paymentId: result.payment?.id,
        paymentHash: result.payment?.details?.paymentHash,
        preimage: result.payment?.details?.preimage,
        amountSats: result.payment?.amountSats || request.amountSats,
        feeSats: result.payment?.fees || prepareResponse.feeSats
      };

      // Include success action if present
      if (result.successAction) {
        payResult.successAction = {
          type: result.successAction.type,
          message: result.successAction.data?.message,
          url: result.successAction.data?.url,
          description: result.successAction.data?.description
        };
      }

      return payResult;

    } catch (error) {
      console.error('[BreezSDK] LNURL payment failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'LNURL payment failed'
      };
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
   * Check if a wallet has been used (has balance or transaction history)
   * Temporarily connects to the wallet, checks for balance and payments, then disconnects
   * Used for sub-wallet discovery during import
   *
   * Note: Breez SDK Spark stores transaction history locally, so a fresh connection
   * may not show historical transactions. We primarily check for balance which
   * is synced from the LSP and indicates wallet usage.
   */
  async checkWalletHasTransactions(
    mnemonic: string,
    config: BreezConfig = { network: 'mainnet' }
  ): Promise<{ hasTransactions: boolean; transactionCount: number; balanceSats: number }> {
    console.log('[BreezSDK] checkWalletHasTransactions - Starting...');

    if (!this.isInitialized) {
      await this.initializeSDK();
    }

    // Save current state if already connected
    const wasConnected = this.isConnected;
    const previousSdk = this.sdk;

    try {
      const { connect, defaultConfig } = await import('@breeztech/breez-sdk-spark');

      // Configure Breez SDK
      const breezConfig = defaultConfig(config.network);
      if (config.apiKey) {
        breezConfig.apiKey = config.apiKey;
      }

      console.log('[BreezSDK] checkWalletHasTransactions - Connecting to wallet...');

      // Connect with the provided mnemonic using a unique storage dir
      // Use a timeout to prevent hanging
      const connectPromise = connect({
        config: breezConfig,
        mnemonic: mnemonic,
        storageDir: `breez_discovery_${Date.now()}`
      });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 5000)
      );
      
      const tempSdk = await Promise.race([connectPromise, timeoutPromise]) as any;

      console.log('[BreezSDK] checkWalletHasTransactions - Connected, checking wallet state...');

      // Check for balance and payments
      let hasActivity = false;
      let transactionCount = 0;
      let balanceSats = 0;

      try {
        // Get node info to check balance - this syncs with LSP
        // Use timeout to prevent hanging
        const nodeInfoPromise = tempSdk.nodeInfo();
        const nodeInfoTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Node info timeout')), 3000)
        );
        
        const nodeInfo = await Promise.race([nodeInfoPromise, nodeInfoTimeout]) as any;
        balanceSats = nodeInfo.channelsBalanceSats || 0;

        console.log('[BreezSDK] checkWalletHasTransactions - Node info:', {
          channelsBalance: nodeInfo.channelsBalanceSats,
          totalBalance: balanceSats
        });

        // If there's any balance, this wallet was definitely used
        if (balanceSats > 0) {
          hasActivity = true;
          console.log(`[BreezSDK] checkWalletHasTransactions - Wallet has balance: ${balanceSats} sats`);
        }
      } catch (nodeError) {
        console.warn('[BreezSDK] checkWalletHasTransactions - Could not get node info:', nodeError);
      }

      // Also check payments (may be empty for fresh storage, but worth checking)
      try {
        const payments = await tempSdk.listPayments();
        transactionCount = payments.length;
        if (transactionCount > 0) {
          hasActivity = true;
        }
        console.log(`[BreezSDK] checkWalletHasTransactions - Found ${transactionCount} payments in local storage`);
      } catch (paymentError) {
        console.warn('[BreezSDK] checkWalletHasTransactions - Could not check payments:', paymentError);
      }

      // Disconnect the temporary connection
      console.log('[BreezSDK] checkWalletHasTransactions - Disconnecting...');
      try {
        await tempSdk.disconnect();
      } catch (disconnectError) {
        console.warn('[BreezSDK] checkWalletHasTransactions - Disconnect error (ignoring):', disconnectError);
      }

      console.log(`[BreezSDK] checkWalletHasTransactions - Result: hasActivity=${hasActivity}, balance=${balanceSats}, payments=${transactionCount}`);
      return { hasTransactions: hasActivity, transactionCount, balanceSats };
    } catch (error) {
      console.error('[BreezSDK] checkWalletHasTransactions - Failed:', error);
      // On error, return no activity found
      return { hasTransactions: false, transactionCount: 0, balanceSats: 0 };
    } finally {
      // Restore previous state
      this.sdk = previousSdk;
      this.isConnected = wasConnected;
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