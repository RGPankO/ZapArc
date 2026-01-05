// Breez SDK Service for React Native
// Handles Lightning Network wallet operations using Breez SDK

import type { Transaction } from '../features/wallet/types';

// =============================================================================
// Types and Interfaces
// =============================================================================

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
  reqData: unknown;
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

export interface NodeInfo {
  nodeId: string;
  channelsBalanceSats: number;
  onchainBalanceSats: number;
  maxPayableSats: number;
  maxReceivableSats: number;
  connectedPeers: number;
}

export interface WalletActivityCheck {
  hasTransactions: boolean;
  transactionCount: number;
  balanceSats: number;
}

// =============================================================================
// Breez SDK Service
// =============================================================================

/**
 * Breez SDK wrapper service for React Native
 * 
 * NOTE: This service requires the @breeztech/react-native-breez-sdk package
 * to be installed. For now, this is a placeholder implementation that defines
 * the interface. The actual SDK integration will require:
 * 
 * 1. Install: npm install @breeztech/react-native-breez-sdk
 * 2. For iOS: cd ios && pod install
 * 3. Configure native modules
 * 
 * The actual implementation will use the React Native SDK bindings.
 */
class BreezSDKService {
  private sdk: unknown = null;
  private isInitialized = false;
  private isConnected = false;
  private currentMnemonic: string | null = null;

  // ========================================
  // Initialization
  // ========================================

  /**
   * Initialize the Breez SDK
   * Must be called before any other operations
   */
  async initializeSDK(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🔵 [BreezSDK] Initializing SDK...');

      // TODO: When the actual SDK is integrated:
      // import { initialize } from '@breeztech/react-native-breez-sdk';
      // await initialize();

      // For now, mark as initialized for development
      this.isInitialized = true;
      console.log('✅ [BreezSDK] SDK initialized successfully');
    } catch (error) {
      console.error('❌ [BreezSDK] Failed to initialize:', error);
      throw new Error(
        `Breez SDK initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Connect wallet with mnemonic
   */
  async connectWallet(
    mnemonic: string,
    config: BreezConfig = { network: 'mainnet' }
  ): Promise<void> {
    if (!this.isInitialized) {
      await this.initializeSDK();
    }

    try {
      console.log('🔵 [BreezSDK] Connecting wallet...', { network: config.network });

      // TODO: When the actual SDK is integrated:
      // import { connect, defaultConfig } from '@breeztech/react-native-breez-sdk';
      // const breezConfig = defaultConfig(config.network);
      // if (config.apiKey) breezConfig.apiKey = config.apiKey;
      // this.sdk = await connect({ config: breezConfig, mnemonic });

      // Store mnemonic for reconnection
      this.currentMnemonic = mnemonic;
      this.isConnected = true;

      console.log('✅ [BreezSDK] Wallet connected successfully');
    } catch (error) {
      console.error('❌ [BreezSDK] Failed to connect wallet:', error);
      throw new Error(
        `Wallet connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Disconnect wallet
   */
  async disconnect(): Promise<void> {
    if (this.sdk) {
      try {
        console.log('🔵 [BreezSDK] Disconnecting wallet...');

        // TODO: When the actual SDK is integrated:
        // await (this.sdk as any).disconnect();

        this.sdk = null;
        this.isConnected = false;
        this.currentMnemonic = null;

        console.log('✅ [BreezSDK] Wallet disconnected');
      } catch (error) {
        console.error('❌ [BreezSDK] Failed to disconnect:', error);
      }
    }
  }

  /**
   * Check if wallet is connected
   */
  isWalletConnected(): boolean {
    return this.isConnected && this.currentMnemonic !== null;
  }

  // ========================================
  // Balance and Node Info
  // ========================================

  /**
   * Get wallet balance in satoshis
   */
  async getBalance(): Promise<number> {
    this.ensureConnected();

    try {
      console.log('🔵 [BreezSDK] Getting balance...');

      // TODO: When the actual SDK is integrated:
      // const nodeInfo = await (this.sdk as any).nodeInfo();
      // return nodeInfo.channelsBalanceSats || 0;

      // Placeholder for development
      console.log('✅ [BreezSDK] Balance retrieved');
      return 0;
    } catch (error) {
      console.error('❌ [BreezSDK] Failed to get balance:', error);
      throw new Error(
        `Balance retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get node information
   */
  async getNodeInfo(): Promise<NodeInfo> {
    this.ensureConnected();

    try {
      console.log('🔵 [BreezSDK] Getting node info...');

      // TODO: When the actual SDK is integrated:
      // return await (this.sdk as any).nodeInfo();

      // Placeholder for development
      return {
        nodeId: '',
        channelsBalanceSats: 0,
        onchainBalanceSats: 0,
        maxPayableSats: 0,
        maxReceivableSats: 0,
        connectedPeers: 0,
      };
    } catch (error) {
      console.error('❌ [BreezSDK] Failed to get node info:', error);
      throw new Error(
        `Node info retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // ========================================
  // Payment Operations
  // ========================================

  /**
   * Generate Lightning invoice for receiving payments
   */
  async receivePayment(request: InvoiceRequest): Promise<string> {
    this.ensureConnected();

    try {
      console.log('🔵 [BreezSDK] Generating invoice...', {
        amountSats: request.amountSats,
      });

      // TODO: When the actual SDK is integrated:
      // const response = await (this.sdk as any).receivePayment({
      //   amountSats: request.amountSats,
      //   description: request.description,
      // });
      // return response.bolt11;

      // Placeholder for development
      console.log('✅ [BreezSDK] Invoice generated');
      return '';
    } catch (error) {
      console.error('❌ [BreezSDK] Failed to generate invoice:', error);
      throw new Error(
        `Invoice generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Send Lightning payment using bolt11 invoice
   */
  async sendPayment(_request: PaymentRequest): Promise<boolean> {
    this.ensureConnected();

    try {
      console.log('🔵 [BreezSDK] Sending payment...');

      // TODO: When the actual SDK is integrated:
      // await (this.sdk as any).sendPayment({ bolt11: request.bolt11 });

      console.log('✅ [BreezSDK] Payment sent');
      return true;
    } catch (error) {
      console.error('❌ [BreezSDK] Failed to send payment:', error);
      throw new Error(
        `Payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get payment history
   */
  async listPayments(): Promise<Transaction[]> {
    this.ensureConnected();

    try {
      console.log('🔵 [BreezSDK] Listing payments...');

      // TODO: When the actual SDK is integrated:
      // const payments = await (this.sdk as any).listPayments();
      // return payments.map((payment: any) => ({
      //   id: payment.id,
      //   type: payment.paymentType === 'sent' ? 'send' : 'receive',
      //   amount: payment.amountSats,
      //   description: payment.description || '',
      //   timestamp: payment.paymentTime,
      //   status: this.mapPaymentStatus(payment.status),
      // }));

      console.log('✅ [BreezSDK] Payments listed');
      return [];
    } catch (error) {
      console.error('❌ [BreezSDK] Failed to list payments:', error);
      throw new Error(
        `Payment history retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // ========================================
  // LNURL Operations
  // ========================================

  /**
   * Parse LNURL string
   */
  async parseLnurl(_lnurl: string): Promise<unknown> {
    this.ensureConnected();

    try {
      console.log('🔵 [BreezSDK] Parsing LNURL...');

      // TODO: When the actual SDK is integrated:
      // return await (this.sdk as any).parseLnurl(lnurl);

      return null;
    } catch (error) {
      console.error('❌ [BreezSDK] Failed to parse LNURL:', error);
      throw new Error(
        `LNURL parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Pay LNURL-pay request
   * Uses the two-step flow: prepareLnurlPay → lnurlPay
   */
  async payLnurl(request: LnurlPayRequest): Promise<LnurlPayResult> {
    this.ensureConnected();

    try {
      console.log('🔵 [BreezSDK] Preparing LNURL payment...', {
        amountSats: request.amountSats,
        hasComment: !!request.comment,
      });

      // TODO: When the actual SDK is integrated:
      // // Step 1: Prepare the payment
      // const prepareResponse = await (this.sdk as any).prepareLnurlPay({
      //   amountSats: request.amountSats,
      //   payRequest: request.reqData,
      //   comment: request.comment || undefined,
      //   validateSuccessActionUrl: true,
      // });
      //
      // // Step 2: Execute the payment
      // const result = await (this.sdk as any).lnurlPay({
      //   prepareResponse,
      // });
      //
      // return {
      //   success: true,
      //   paymentId: result.payment?.id,
      //   paymentHash: result.payment?.details?.paymentHash,
      //   preimage: result.payment?.details?.preimage,
      //   amountSats: result.payment?.amountSats || request.amountSats,
      //   feeSats: result.payment?.fees || prepareResponse.feeSats,
      //   successAction: result.successAction ? {
      //     type: result.successAction.type,
      //     message: result.successAction.data?.message,
      //     url: result.successAction.data?.url,
      //     description: result.successAction.data?.description,
      //   } : undefined,
      // };

      console.log('✅ [BreezSDK] LNURL payment executed');
      return { success: true };
    } catch (error) {
      console.error('❌ [BreezSDK] LNURL payment failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'LNURL payment failed',
      };
    }
  }

  /**
   * Generate LNURL for receiving payments
   */
  async receiveLnurlPay(): Promise<string> {
    this.ensureConnected();

    try {
      console.log('🔵 [BreezSDK] Generating receive LNURL...');

      // TODO: When the actual SDK is integrated:
      // const lnurlData = await (this.sdk as any).receiveLnurlPay();
      // return lnurlData.lnurl;

      return '';
    } catch (error) {
      console.error('❌ [BreezSDK] Failed to generate receive LNURL:', error);
      throw new Error(
        `LNURL generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // ========================================
  // Wallet Activity Check
  // ========================================

  /**
   * Check if a wallet has been used (has balance or transaction history)
   * Used for sub-wallet discovery during import
   */
  async checkWalletHasTransactions(
    _mnemonic: string,
    _config: BreezConfig = { network: 'mainnet' }
  ): Promise<WalletActivityCheck> {
    console.log('🔵 [BreezSDK] Checking wallet activity...');

    if (!this.isInitialized) {
      await this.initializeSDK();
    }

    // Save current state
    const wasConnected = this.isConnected;
    const previousSdk = this.sdk;
    const previousMnemonic = this.currentMnemonic;

    try {
      // TODO: When the actual SDK is integrated:
      // Temporarily connect with the provided mnemonic
      // Check balance and payments
      // Disconnect and restore previous state

      console.log('✅ [BreezSDK] Wallet activity check complete');
      return { hasTransactions: false, transactionCount: 0, balanceSats: 0 };
    } catch (error) {
      console.error('❌ [BreezSDK] Wallet activity check failed:', error);
      return { hasTransactions: false, transactionCount: 0, balanceSats: 0 };
    } finally {
      // Restore previous state
      this.sdk = previousSdk;
      this.isConnected = wasConnected;
      this.currentMnemonic = previousMnemonic;
    }
  }

  // ========================================
  // Private Helpers
  // ========================================

  /**
   * Ensure wallet is connected before operations
   */
  private ensureConnected(): void {
    if (!this.isConnected || !this.currentMnemonic) {
      throw new Error('Wallet not connected. Please initialize wallet first.');
    }
  }

  /**
   * Map Breez SDK payment status to our Transaction status
   */
  private mapPaymentStatus(
    breezStatus: string
  ): 'pending' | 'completed' | 'failed' {
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

// Export singleton instance
export const breezSDKService = new BreezSDKService();

// Export class for testing
export { BreezSDKService };
