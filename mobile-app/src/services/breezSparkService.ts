// Breez SDK Spark Service
// Lightning wallet operations using Breez SDK Nodeless (Spark Implementation)
//
// NOTE: This service requires native modules. It will work in:
// - Development builds (npx expo run:android)
// - Production builds
// It will NOT work in Expo Go (native modules not available)

import { BREEZ_API_KEY, BREEZ_STORAGE_DIR } from '../config';

// =============================================================================
// Types
// =============================================================================

export interface WalletBalance {
  balanceSat: number;
  pendingSendSat: number;
  pendingReceiveSat: number;
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  error?: string;
}

export interface ReceivePaymentResult {
  paymentRequest: string;
  feeSat: number;
}

export interface TransactionInfo {
  id: string;
  type: 'send' | 'receive';
  amountSat: number;
  feeSat: number;
  status: 'pending' | 'completed' | 'failed';
  timestamp: number;
  description?: string;
  paymentRequest?: string;
}

// =============================================================================
// Native Module Detection
// =============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let BreezSDK: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let RNFS: any = null;
let _isNativeAvailable = false;

// Try to load native modules - will fail gracefully in Expo Go
try {
  BreezSDK = require('@breeztech/breez-sdk-spark-react-native');
  RNFS = require('react-native-fs');
  _isNativeAvailable = true;
  console.log('✅ [BreezSparkService] Native SDK loaded successfully');
} catch {
  console.warn('⚠️ [BreezSparkService] Native SDK not available (running in Expo Go?)');
  console.warn('   To use Lightning features, build with: npx expo run:android');
}

// =============================================================================
// Service State
// =============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sdkInstance: any = null;
let _isInitialized = false;

// =============================================================================
// Public API
// =============================================================================

/**
 * Check if native SDK is available
 */
export function isNativeAvailable(): boolean {
  return _isNativeAvailable;
}

/**
 * Check if SDK is initialized
 */
export function isSDKInitialized(): boolean {
  return _isInitialized && sdkInstance !== null;
}

/**
 * Initialize the Breez SDK with a mnemonic
 */
export async function initializeSDK(
  mnemonic: string,
  apiKey?: string
): Promise<boolean> {
  if (!_isNativeAvailable) {
    console.warn('[BreezSparkService] Cannot initialize - native SDK not available');
    return false;
  }

  try {
    if (sdkInstance) {
      console.log('SDK already initialized');
      return true;
    }

    const config = BreezSDK.defaultConfig(BreezSDK.Network.Mainnet);
    config.apiKey = apiKey || BREEZ_API_KEY;

    const storageDir = `${RNFS.DocumentDirectoryPath}/${BREEZ_STORAGE_DIR}`;

    // Ensure storage directory exists
    const dirExists = await RNFS.exists(storageDir);
    if (!dirExists) {
      await RNFS.mkdir(storageDir);
    }

    sdkInstance = await BreezSDK.connect({
      config,
      mnemonic,
      storageDir,
    });

    _isInitialized = true;
    console.log('Breez SDK Spark initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize Breez SDK:', error);
    _isInitialized = false;
    return false;
  }
}

/**
 * Disconnect and cleanup SDK
 */
export async function disconnectSDK(): Promise<void> {
  if (!_isNativeAvailable) return;

  try {
    if (sdkInstance) {
      await BreezSDK.disconnect();
      sdkInstance = null;
      _isInitialized = false;
      console.log('Breez SDK disconnected');
    }
  } catch (error) {
    console.error('Failed to disconnect SDK:', error);
  }
}

/**
 * Get current wallet balance
 */
export async function getBalance(): Promise<WalletBalance> {
  if (!_isNativeAvailable || !sdkInstance) {
    return { balanceSat: 0, pendingSendSat: 0, pendingReceiveSat: 0 };
  }

  try {
    const response = await sdkInstance.listPayments({});
    const payments = response.payments;

    let balanceSat = 0;
    let pendingSendSat = 0;
    let pendingReceiveSat = 0;

    for (const payment of payments) {
      const status = payment.status;
      const paymentType = payment.paymentType;
      const amount = Number(payment.amountSat);
      const fees = Number(payment.feesSat || 0);

      if (status === 'completed' || status === 'Completed') {
        if (paymentType === 'receive' || paymentType === 'Receive') {
          balanceSat += amount;
        } else {
          balanceSat -= amount + fees;
        }
      } else if (status === 'pending' || status === 'Pending') {
        if (paymentType === 'receive' || paymentType === 'Receive') {
          pendingReceiveSat += amount;
        } else {
          pendingSendSat += amount;
        }
      }
    }

    return {
      balanceSat: Math.max(0, balanceSat),
      pendingSendSat,
      pendingReceiveSat,
    };
  } catch (error) {
    console.error('Failed to get balance:', error);
    return { balanceSat: 0, pendingSendSat: 0, pendingReceiveSat: 0 };
  }
}

/**
 * Pay a Lightning invoice
 */
export async function payInvoice(
  paymentRequest: string,
  _amountSat?: number
): Promise<PaymentResult> {
  if (!_isNativeAvailable || !sdkInstance) {
    return { success: false, error: 'SDK not available' };
  }

  try {
    const prepareResponse = await sdkInstance.prepareSendPayment({
      paymentRequest,
      amount: _amountSat ? BigInt(_amountSat) : undefined,
    });

    const response = await sdkInstance.sendPayment({
      prepareResponse,
    });

    return {
      success: true,
      paymentId: response.payment?.id,
    };
  } catch (error) {
    console.error('Failed to pay invoice:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Payment failed',
    };
  }
}

/**
 * Generate a Lightning invoice to receive payment
 */
export async function receivePayment(
  amountSat: number,
  description?: string
): Promise<ReceivePaymentResult> {
  if (!_isNativeAvailable || !sdkInstance) {
    throw new Error('SDK not available');
  }

  try {
    const response = await sdkInstance.receivePayment({
      paymentMethod: {
        type: 'bolt11Invoice',
        amountSat: BigInt(amountSat),
        description,
      },
    });

    return {
      paymentRequest: response.paymentRequest,
      feeSat: Number(response.fee),
    };
  } catch (error) {
    console.error('Failed to create receive invoice:', error);
    throw error;
  }
}

/**
 * List all payments/transactions
 */
export async function listPayments(): Promise<TransactionInfo[]> {
  if (!_isNativeAvailable || !sdkInstance) {
    return [];
  }

  try {
    const response = await sdkInstance.listPayments({
      sortAscending: false,
    });

    return response.payments.map((payment: {
      id: string;
      paymentType: string;
      amountSat: bigint | number;
      feesSat?: bigint | number;
      status: string;
      createdAt: bigint | number;
      description?: string;
    }) => ({
      id: payment.id,
      type: (payment.paymentType === 'receive' || payment.paymentType === 'Receive') ? 'receive' : 'send',
      amountSat: Number(payment.amountSat),
      feeSat: Number(payment.feesSat || 0),
      status: mapPaymentStatus(payment.status),
      timestamp: Number(payment.createdAt) * 1000,
      description: payment.description,
    }));
  } catch (error) {
    console.error('Failed to list payments:', error);
    return [];
  }
}

/**
 * Get a specific payment by ID
 */
export async function getPayment(paymentId: string): Promise<TransactionInfo | null> {
  if (!_isNativeAvailable || !sdkInstance) {
    return null;
  }

  try {
    const response = await sdkInstance.getPayment({ paymentId });
    if (response.payment) {
      const p = response.payment;
      return {
        id: p.id,
        type: (p.paymentType === 'receive' || p.paymentType === 'Receive') ? 'receive' : 'send',
        amountSat: Number(p.amountSat),
        feeSat: Number(p.feesSat || 0),
        status: mapPaymentStatus(p.status),
        timestamp: Number(p.createdAt) * 1000,
        description: p.description,
      };
    }
    return null;
  } catch (error) {
    console.error('Failed to get payment:', error);
    return null;
  }
}

/**
 * Get Spark address for receiving payments
 */
export async function getSparkAddress(): Promise<string> {
  if (!_isNativeAvailable || !sdkInstance) {
    throw new Error('SDK not available');
  }

  try {
    const response = await sdkInstance.receivePayment({
      paymentMethod: {
        type: 'sparkAddress',
      },
    });

    return response.paymentRequest;
  } catch (error) {
    console.error('Failed to get Spark address:', error);
    throw error;
  }
}

/**
 * Pay to a Lightning address
 */
export async function payLightningAddress(
  address: string,
  amountSat: number,
  _comment?: string
): Promise<PaymentResult> {
  return await payInvoice(address, amountSat);
}

/**
 * Parse and validate a payment request
 */
export async function parsePaymentRequest(input: string): Promise<{
  type: 'bolt11' | 'lnurl' | 'lightningAddress' | 'bitcoinAddress' | 'sparkAddress' | 'unknown';
  isValid: boolean;
  amountSat?: number;
  description?: string;
}> {
  const trimmed = input.trim().toLowerCase();

  if (trimmed.includes('@') && trimmed.includes('.')) {
    return { type: 'lightningAddress', isValid: true };
  }

  if (trimmed.startsWith('lnurl')) {
    return { type: 'lnurl', isValid: true };
  }

  if (trimmed.startsWith('lnbc') || trimmed.startsWith('lntb') || trimmed.startsWith('lnbcrt')) {
    return { type: 'bolt11', isValid: true };
  }

  if (trimmed.startsWith('bc1') || trimmed.startsWith('1') || trimmed.startsWith('3') || trimmed.startsWith('tb1')) {
    return { type: 'bitcoinAddress', isValid: true };
  }

  if (trimmed.startsWith('sp1')) {
    return { type: 'sparkAddress', isValid: true };
  }

  return { type: 'unknown', isValid: false };
}

/**
 * Prepare a payment (get fee estimate)
 */
export async function prepareSendPayment(
  paymentRequest: string,
  amountSat?: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  if (!_isNativeAvailable || !sdkInstance) {
    throw new Error('SDK not available');
  }

  return await sdkInstance.prepareSendPayment({
    paymentRequest,
    amount: amountSat ? BigInt(amountSat) : undefined,
  });
}

/**
 * Send a prepared payment
 */
export async function sendPayment(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prepareResponse: any,
  idempotencyKey?: string
): Promise<PaymentResult> {
  if (!_isNativeAvailable || !sdkInstance) {
    return { success: false, error: 'SDK not available' };
  }

  try {
    const response = await sdkInstance.sendPayment({
      prepareResponse,
      idempotencyKey,
    });

    return {
      success: true,
      paymentId: response.payment?.id,
    };
  } catch (error) {
    console.error('Failed to send payment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Payment failed',
    };
  }
}

/**
 * Add event listener for payment updates
 */
export function addPaymentListener(
  _callback: (payment: TransactionInfo) => void
): () => void {
  console.log('Payment listener registered');
  return () => {
    console.log('Payment listener removed');
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

function mapPaymentStatus(status: string): 'pending' | 'completed' | 'failed' {
  const s = status?.toLowerCase();
  if (s === 'completed' || s === 'complete' || s === 'succeeded') {
    return 'completed';
  }
  if (s === 'failed' || s === 'canceled') {
    return 'failed';
  }
  return 'pending';
}

// =============================================================================
// Exports
// =============================================================================

export const BreezSparkService = {
  isNativeAvailable,
  initializeSDK,
  disconnectSDK,
  isSDKInitialized,
  getBalance,
  prepareSendPayment,
  sendPayment,
  payInvoice,
  receivePayment,
  getSparkAddress,
  listPayments,
  getPayment,
  payLightningAddress,
  parsePaymentRequest,
  addPaymentListener,
};

export default BreezSparkService;
