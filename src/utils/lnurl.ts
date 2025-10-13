// LNURL utilities for Lightning Network Tipping Extension
// Handles LNURL parsing, validation, and operations using Breez SDK

import { WalletManager } from './wallet-manager';

export interface LnurlPayData {
  callback: string;
  maxSendable: number;
  minSendable: number;
  metadata: string;
  tag: string;
  commentAllowed?: number;
}

export interface LnurlPayResponse {
  pr: string; // bolt11 invoice
  successAction?: {
    tag: string;
    message?: string;
    url?: string;
  };
}

export interface TipRequestData {
  lnurl: string;
  suggestedAmounts: [number, number, number];
  isValid: boolean;
  error?: string;
}

export class LnurlManager {
  private walletManager: WalletManager;

  constructor(walletManager: WalletManager) {
    this.walletManager = walletManager;
  }

  /**
   * Parse and validate LNURL
   */
  async parseLnurl(lnurl: string): Promise<any> {
    try {
      // Validate LNURL format
      if (!this.isValidLnurlFormat(lnurl)) {
        throw new Error('Invalid LNURL format');
      }

      // Use Breez SDK to parse LNURL
      const parsed = await this.walletManager.parseLnurl(lnurl);
      
      return parsed;
    } catch (error) {
      console.error('LNURL parsing failed:', error);
      throw new Error(`LNURL parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Pay LNURL with amount and optional comment
   */
  async payLnurl(lnurl: string, amount: number, comment?: string): Promise<boolean> {
    try {
      // Parse LNURL first
      const reqData = await this.parseLnurl(lnurl);
      
      if (reqData.type !== 'pay') {
        throw new Error('LNURL is not a pay request');
      }

      // Validate amount is within bounds
      const payData = reqData.data as LnurlPayData;
      const amountMsat = amount * 1000;
      
      if (amountMsat < payData.minSendable || amountMsat > payData.maxSendable) {
        throw new Error(`Amount must be between ${payData.minSendable / 1000} and ${payData.maxSendable / 1000} sats`);
      }

      // Validate comment length if provided
      if (comment && payData.commentAllowed && comment.length > payData.commentAllowed) {
        throw new Error(`Comment too long. Maximum ${payData.commentAllowed} characters allowed`);
      }

      // Check sufficient balance
      const hasSufficientBalance = await this.walletManager.hasSufficientBalance(amount);
      if (!hasSufficientBalance) {
        throw new Error('Insufficient balance for payment');
      }

      // Execute payment
      const success = await this.walletManager.payLnurl(reqData.data, amount, comment);
      
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
    try {
      const lnurl = await this.walletManager.generateReceiveLnurl();
      return lnurl;
    } catch (error) {
      console.error('LNURL generation failed:', error);
      throw new Error(`LNURL generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse tip request string and extract LNURL and amounts
   */
  parseTipRequest(tipString: string): TipRequestData {
    try {
      // Match the standardized tip format: [lntip:lnurl:<lnurl>:<amount1>:<amount2>:<amount3>]
      const tipRegex = /\[lntip:lnurl:([^:]+):(\d+):(\d+):(\d+)\]/;
      const match = tipString.match(tipRegex);

      if (!match) {
        return {
          lnurl: '',
          suggestedAmounts: [0, 0, 0],
          isValid: false,
          error: 'Invalid tip request format'
        };
      }

      const [, lnurl, amount1, amount2, amount3] = match;
      const suggestedAmounts: [number, number, number] = [
        parseInt(amount1),
        parseInt(amount2),
        parseInt(amount3)
      ];

      // Validate LNURL format
      if (!this.isValidLnurlFormat(lnurl)) {
        return {
          lnurl,
          suggestedAmounts,
          isValid: false,
          error: 'Invalid LNURL format'
        };
      }

      // Validate amounts
      if (suggestedAmounts.some(amount => amount <= 0 || !Number.isInteger(amount))) {
        return {
          lnurl,
          suggestedAmounts,
          isValid: false,
          error: 'Invalid suggested amounts'
        };
      }

      return {
        lnurl,
        suggestedAmounts,
        isValid: true
      };
    } catch (error) {
      console.error('Tip request parsing failed:', error);
      return {
        lnurl: '',
        suggestedAmounts: [0, 0, 0],
        isValid: false,
        error: 'Failed to parse tip request'
      };
    }
  }

  /**
   * Generate standardized tip request string
   */
  generateTipRequest(lnurl: string, amounts: [number, number, number]): string {
    try {
      // Validate inputs
      if (!this.isValidLnurlFormat(lnurl)) {
        throw new Error('Invalid LNURL format');
      }

      if (amounts.some(amount => amount <= 0 || !Number.isInteger(amount))) {
        throw new Error('Invalid amounts - must be positive integers');
      }

      // Generate standardized format
      return `[lntip:lnurl:${lnurl}:${amounts[0]}:${amounts[1]}:${amounts[2]}]`;
    } catch (error) {
      console.error('Tip request generation failed:', error);
      throw new Error(`Tip request generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate tip request string for user's wallet
   */
  async generateUserTipRequest(amounts?: [number, number, number]): Promise<string> {
    try {
      // Get user's LNURL
      const settings = await this.walletManager.getStorageManager().getUserSettings();
      let lnurl: string;

      if (settings.customLNURL) {
        lnurl = settings.customLNURL;
      } else if (settings.useBuiltInWallet) {
        lnurl = await this.generateReceiveLnurl();
      } else {
        throw new Error('No LNURL configured. Please set up wallet or provide custom LNURL.');
      }

      // Use provided amounts or default posting amounts
      const tipAmounts = amounts || settings.defaultPostingAmounts;

      return this.generateTipRequest(lnurl, tipAmounts);
    } catch (error) {
      console.error('User tip request generation failed:', error);
      throw new Error(`User tip request generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate LNURL format
   */
  private isValidLnurlFormat(lnurl: string): boolean {
    try {
      // LNURL should be a bech32 encoded string starting with 'lnurl'
      if (!lnurl.toLowerCase().startsWith('lnurl')) {
        return false;
      }

      // Basic length check (LNURL should be reasonably long)
      if (lnurl.length < 20) {
        return false;
      }

      // Additional validation could be added here
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Extract LNURL from various formats (QR codes, lightning: URIs, etc.)
   */
  extractLnurl(input: string): string | null {
    try {
      // Remove whitespace
      input = input.trim();

      // Handle lightning: URI
      if (input.toLowerCase().startsWith('lightning:')) {
        input = input.substring(10);
      }

      // Handle direct LNURL
      if (input.toLowerCase().startsWith('lnurl')) {
        return input;
      }

      // Handle uppercase LNURL
      if (input.toUpperCase().startsWith('LNURL')) {
        return input.toLowerCase();
      }

      return null;
    } catch (error) {
      console.error('LNURL extraction failed:', error);
      return null;
    }
  }

  /**
   * Get payment limits for LNURL
   */
  async getLnurlPaymentLimits(lnurl: string): Promise<{ min: number; max: number } | null> {
    try {
      const parsed = await this.parseLnurl(lnurl);
      
      if (parsed.type !== 'pay') {
        return null;
      }

      const payData = parsed.data as LnurlPayData;
      return {
        min: Math.ceil(payData.minSendable / 1000), // Convert msat to sat
        max: Math.floor(payData.maxSendable / 1000)
      };
    } catch (error) {
      console.error('Failed to get LNURL payment limits:', error);
      return null;
    }
  }

  /**
   * Check if comment is allowed for LNURL
   */
  async isCommentAllowed(lnurl: string): Promise<{ allowed: boolean; maxLength?: number }> {
    try {
      const parsed = await this.parseLnurl(lnurl);
      
      if (parsed.type !== 'pay') {
        return { allowed: false };
      }

      const payData = parsed.data as LnurlPayData;
      return {
        allowed: !!payData.commentAllowed,
        maxLength: payData.commentAllowed
      };
    } catch (error) {
      console.error('Failed to check comment allowance:', error);
      return { allowed: false };
    }
  }
}