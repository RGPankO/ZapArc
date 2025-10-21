// Messaging utilities for Chrome Extension communication
// Handles message passing between background, content scripts, and popup

import { UserSettings, WalletData, Transaction } from '../types';

export interface MessageResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export class ExtensionMessaging {
  /**
   * Send message to background script
   */
  static async sendToBackground<T = any>(message: any): Promise<MessageResponse<T>> {
    console.log('🔵 [ExtensionMessaging] SENDING MESSAGE', {
      messageType: message.type,
      message: message,
      timestamp: new Date().toISOString()
    });
    
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          console.error('❌ [ExtensionMessaging] CHROME RUNTIME ERROR', {
            error: chrome.runtime.lastError.message,
            messageType: message.type,
            timestamp: new Date().toISOString()
          });
          resolve({
            success: false,
            error: chrome.runtime.lastError.message
          });
        } else {
          console.log('🟢 [ExtensionMessaging] MESSAGE RESPONSE', {
            messageType: message.type,
            response: response,
            timestamp: new Date().toISOString()
          });
          resolve(response || { success: false, error: 'No response' });
        }
      });
    });
  }

  /**
   * Send message to content script
   */
  static async sendToContentScript<T = any>(tabId: number, message: any): Promise<MessageResponse<T>> {
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          resolve({
            success: false,
            error: chrome.runtime.lastError.message
          });
        } else {
          resolve(response || { success: false, error: 'No response' });
        }
      });
    });
  }

  /**
   * Generate a new mnemonic phrase
   */
  static async generateMnemonic(): Promise<MessageResponse<string>> {
    return this.sendToBackground({
      type: 'GENERATE_MNEMONIC'
    });
  }

  /**
   * Setup new wallet with mnemonic and PIN
   */
  static async setupWallet(mnemonic: string | undefined, pin: string, network: 'mainnet' | 'testnet' = 'mainnet'): Promise<MessageResponse> {
    return this.sendToBackground({
      type: 'SETUP_WALLET',
      mnemonic,
      pin,
      network
    });
  }

  /**
   * Unlock existing wallet with PIN
   */
  static async unlockWallet(pin: string): Promise<MessageResponse> {
    return this.sendToBackground({
      type: 'UNLOCK_WALLET',
      pin
    });
  }

  /**
   * Get wallet status
   */
  static async getWalletStatus(): Promise<MessageResponse<any>> {
    return this.sendToBackground({
      type: 'GET_WALLET_STATUS'
    });
  }

  /**
   * Get wallet balance
   */
  static async getBalance(): Promise<MessageResponse<number>> {
    return this.sendToBackground({
      type: 'GET_BALANCE'
    });
  }

  /**
   * Generate Lightning invoice
   */
  static async generateInvoice(amount: number, description: string): Promise<MessageResponse<string>> {
    return this.sendToBackground({
      type: 'GENERATE_INVOICE',
      amount,
      description
    });
  }

  /**
   * Send Lightning payment
   */
  static async sendPayment(bolt11: string): Promise<MessageResponse<boolean>> {
    return this.sendToBackground({
      type: 'SEND_PAYMENT',
      bolt11
    });
  }

  /**
   * Get payment history
   */
  static async listPayments(forceRefresh = false): Promise<MessageResponse<Transaction[]>> {
    return this.sendToBackground({
      type: 'LIST_PAYMENTS',
      forceRefresh
    });
  }

  /**
   * Check if wallet has sufficient balance
   */
  static async checkSufficientBalance(amount: number): Promise<MessageResponse<boolean>> {
    return this.sendToBackground({
      type: 'CHECK_SUFFICIENT_BALANCE',
      amount
    });
  }

  /**
   * Parse LNURL
   */
  static async parseLnurl(lnurl: string): Promise<MessageResponse<any>> {
    return this.sendToBackground({
      type: 'PARSE_LNURL',
      lnurl
    });
  }

  /**
   * Pay LNURL
   */
  static async payLnurl(reqData: any, amount: number, comment?: string): Promise<MessageResponse<boolean>> {
    return this.sendToBackground({
      type: 'PAY_LNURL',
      reqData,
      amount,
      comment
    });
  }

  /**
   * Generate LNURL for receiving
   */
  static async generateLnurl(): Promise<MessageResponse<string>> {
    return this.sendToBackground({
      type: 'GENERATE_LNURL'
    });
  }

  /**
   * Get node information
   */
  static async getNodeInfo(): Promise<MessageResponse<any>> {
    return this.sendToBackground({
      type: 'GET_NODE_INFO'
    });
  }

  /**
   * Save encrypted wallet data
   */
  static async saveWallet(walletData: WalletData, pin: string): Promise<MessageResponse> {
    return this.sendToBackground({
      type: 'SAVE_WALLET',
      walletData,
      pin
    });
  }

  /**
   * Load encrypted wallet data
   */
  static async loadWallet(pin: string): Promise<MessageResponse<WalletData>> {
    return this.sendToBackground({
      type: 'LOAD_WALLET',
      pin
    });
  }

  /**
   * Save domain settings
   */
  static async saveDomainSettings(domain: string, status: string): Promise<MessageResponse> {
    return this.sendToBackground({
      type: 'SAVE_DOMAIN_SETTINGS',
      domain,
      status
    });
  }

  /**
   * Get domain settings
   */
  static async getDomainSettings(): Promise<MessageResponse<any>> {
    return this.sendToBackground({
      type: 'GET_DOMAIN_SETTINGS'
    });
  }

  /**
   * Save LNURL blacklist
   */
  static async saveBlacklist(lnurls: string[]): Promise<MessageResponse> {
    return this.sendToBackground({
      type: 'SAVE_BLACKLIST',
      lnurls
    });
  }

  /**
   * Get LNURL blacklist
   */
  static async getBlacklist(): Promise<MessageResponse<any>> {
    return this.sendToBackground({
      type: 'GET_BLACKLIST'
    });
  }

  /**
   * Get user settings
   */
  static async getUserSettings(): Promise<MessageResponse<UserSettings>> {
    return this.sendToBackground({
      type: 'GET_USER_SETTINGS'
    });
  }

  /**
   * Save user settings
   */
  static async saveUserSettings(settings: UserSettings): Promise<MessageResponse> {
    return this.sendToBackground({
      type: 'SAVE_USER_SETTINGS',
      settings
    });
  }

  /**
   * Check if wallet is unlocked
   */
  static async isWalletUnlocked(): Promise<MessageResponse<boolean>> {
    return this.sendToBackground({
      type: 'IS_WALLET_UNLOCKED'
    });
  }

  /**
   * Lock wallet
   */
  static async lockWallet(): Promise<MessageResponse> {
    return this.sendToBackground({
      type: 'LOCK_WALLET'
    });
  }

  /**
   * Check if wallet is connected
   */
  static async isWalletConnected(): Promise<MessageResponse<boolean>> {
    return this.sendToBackground({
      type: 'IS_WALLET_CONNECTED'
    });
  }

  /**
   * Check if wallet exists (has been set up)
   */
  static async walletExists(): Promise<MessageResponse<boolean>> {
    return this.sendToBackground({
      type: 'WALLET_EXISTS'
    });
  }

  /**
   * Parse tip request string
   */
  static async parseTipRequest(tipString: string): Promise<MessageResponse<any>> {
    return this.sendToBackground({
      type: 'PARSE_TIP_REQUEST',
      tipString
    });
  }

  /**
   * Generate tip request string
   */
  static async generateTipRequest(lnurl: string, amounts: [number, number, number]): Promise<MessageResponse<string>> {
    return this.sendToBackground({
      type: 'GENERATE_TIP_REQUEST',
      lnurl,
      amounts
    });
  }

  /**
   * Generate user's tip request string
   */
  static async generateUserTipRequest(amounts?: [number, number, number]): Promise<MessageResponse<string>> {
    return this.sendToBackground({
      type: 'GENERATE_USER_TIP_REQUEST',
      amounts
    });
  }

  /**
   * Get LNURL payment limits
   */
  static async getLnurlPaymentLimits(lnurl: string): Promise<MessageResponse<any>> {
    return this.sendToBackground({
      type: 'GET_LNURL_PAYMENT_LIMITS',
      lnurl
    });
  }

  /**
   * Check if comment is allowed for LNURL
   */
  static async isCommentAllowed(lnurl: string): Promise<MessageResponse<any>> {
    return this.sendToBackground({
      type: 'IS_COMMENT_ALLOWED',
      lnurl
    });
  }

  /**
   * Extract LNURL from various formats
   */
  static async extractLnurl(input: string): Promise<MessageResponse<string>> {
    return this.sendToBackground({
      type: 'EXTRACT_LNURL',
      input
    });
  }

  /**
   * Add LNURL to blacklist
   */
  static async addToBlacklist(lnurl: string): Promise<MessageResponse> {
    return this.sendToBackground({
      type: 'ADD_TO_BLACKLIST',
      lnurl
    });
  }

  /**
   * Remove LNURL from blacklist
   */
  static async removeFromBlacklist(lnurl: string): Promise<MessageResponse> {
    return this.sendToBackground({
      type: 'REMOVE_FROM_BLACKLIST',
      lnurl
    });
  }

  /**
   * Clear entire blacklist
   */
  static async clearBlacklist(): Promise<MessageResponse> {
    return this.sendToBackground({
      type: 'CLEAR_BLACKLIST'
    });
  }

  /**
   * Set domain status
   */
  static async setDomainStatus(domain: string, status: string): Promise<MessageResponse> {
    return this.sendToBackground({
      type: 'SET_DOMAIN_STATUS',
      domain,
      status
    });
  }

  /**
   * Get domain status
   */
  static async getDomainStatus(domain: string): Promise<MessageResponse<string>> {
    return this.sendToBackground({
      type: 'GET_DOMAIN_STATUS',
      domain
    });
  }

  /**
   * Get all domain settings
   */
  static async getAllDomains(): Promise<MessageResponse<any>> {
    return this.sendToBackground({
      type: 'GET_ALL_DOMAINS'
    });
  }

  /**
   * Process payment with enhanced error handling and retry logic
   */
  static async processPayment(
    lnurlData: any, 
    amount: number, 
    comment?: string
  ): Promise<MessageResponse<{ transactionId?: string; retryable?: boolean }>> {
    return this.sendToBackground({
      type: 'PROCESS_PAYMENT',
      lnurlData,
      amount,
      comment
    });
  }

  /**
   * Generate QR code data for Lightning payment
   */
  static async generateQRCode(
    lnurl: string, 
    amount?: number, 
    comment?: string
  ): Promise<MessageResponse<string>> {
    return this.sendToBackground({
      type: 'GENERATE_QR_CODE',
      lnurl,
      amount,
      comment
    });
  }

  /**
   * Generate Lightning URI for QR codes (works without Breez SDK)
   */
  static generateLightningURI(lnurl: string, amount?: number, comment?: string): string {
    let uri = `lightning:${lnurl.toUpperCase()}`;
    
    const params = [];
    if (amount && amount > 0) {
      params.push(`amount=${amount * 1000}`); // Convert sats to millisats
    }
    if (comment) {
      params.push(`message=${encodeURIComponent(comment)}`);
    }
    
    if (params.length > 0) {
      uri += `?${params.join('&')}`;
    }
    
    return uri;
  }

  // Facebook Group Management Functions

  /**
   * Add Facebook group to allowed list
   */
  static async addFacebookGroup(groupId: string): Promise<MessageResponse> {
    return this.sendToBackground({
      type: 'ADD_FACEBOOK_GROUP',
      groupId
    });
  }

  /**
   * Remove Facebook group from allowed list
   */
  static async removeFacebookGroup(groupId: string): Promise<MessageResponse> {
    return this.sendToBackground({
      type: 'REMOVE_FACEBOOK_GROUP',
      groupId
    });
  }

  /**
   * Get Facebook group settings
   */
  static async getFacebookGroupSettings(): Promise<MessageResponse<{
    postingMode: 'global' | 'selective';
    allowedGroups: string[];
    deniedGroups: string[];
  }>> {
    return this.sendToBackground({
      type: 'GET_FACEBOOK_GROUP_SETTINGS'
    });
  }

  /**
   * Set Facebook posting mode
   */
  static async setFacebookPostingMode(mode: 'global' | 'selective'): Promise<MessageResponse> {
    return this.sendToBackground({
      type: 'SET_FACEBOOK_POSTING_MODE',
      mode
    });
  }

  /**
   * Check if Facebook group is allowed for posting
   */
  static async isFacebookGroupAllowed(groupId: string): Promise<MessageResponse<boolean>> {
    return this.sendToBackground({
      type: 'IS_FACEBOOK_GROUP_ALLOWED',
      groupId
    });
  }

  /**
   * Add Facebook group to denied list (when user clicks "No" on prompt)
   */
  static async denyFacebookGroup(groupId: string): Promise<MessageResponse> {
    return this.sendToBackground({
      type: 'DENY_FACEBOOK_GROUP',
      groupId
    });
  }

  /**
   * Clear all Facebook groups (both allowed and denied)
   */
  static async clearAllFacebookGroups(): Promise<MessageResponse> {
    return this.sendToBackground({
      type: 'CLEAR_ALL_FACEBOOK_GROUPS'
    });
  }

  /**
   * Detect Facebook group ID from current page
   */
  static async detectFacebookGroupId(): Promise<MessageResponse<string | null>> {
    return this.sendToBackground({
      type: 'DETECT_FACEBOOK_GROUP_ID'
    });
  }

  /**
   * Show Facebook group prompt for new group
   */
  static async showFacebookGroupPrompt(groupId: string): Promise<MessageResponse<'allow' | 'deny' | 'cancel'>> {
    return this.sendToBackground({
      type: 'SHOW_FACEBOOK_GROUP_PROMPT',
      groupId
    });
  }

  // ========================================
  // Multi-Wallet Support Methods (Phase 2)
  // ========================================

  /**
   * Create a new wallet with generated mnemonic
   * Generates a new 12-word BIP39 mnemonic and adds to wallet storage
   *
   * @param nickname - User-friendly name for the wallet
   * @param pin - User's PIN for encryption
   * @returns Wallet data with mnemonic and initial balance
   */
  static async createWallet(nickname: string, pin: string): Promise<MessageResponse<WalletData>> {
    return this.sendToBackground({
      type: 'CREATE_WALLET',
      nickname,
      pin
    });
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
  static async importWallet(mnemonic: string, nickname: string, pin: string): Promise<MessageResponse<WalletData>> {
    return this.sendToBackground({
      type: 'IMPORT_WALLET',
      mnemonic,
      nickname,
      pin
    });
  }

  /**
   * Get all wallets (metadata only, no mnemonics)
   * Returns wallet metadata for UI display
   *
   * @returns Array of wallet metadata
   */
  static async getAllWallets(): Promise<MessageResponse<import('../types').WalletMetadata[]>> {
    return this.sendToBackground({
      type: 'GET_ALL_WALLETS'
    });
  }

  /**
   * Switch to a different wallet
   * Disconnects current SDK, loads new wallet, and prepares for SDK reconnection
   *
   * @param walletId - UUID of the wallet to switch to
   * @param pin - User's PIN to decrypt wallet
   * @returns Wallet data for the new active wallet
   */
  static async switchWallet(walletId: string, pin: string): Promise<MessageResponse<WalletData>> {
    return this.sendToBackground({
      type: 'SWITCH_WALLET',
      walletId,
      pin
    });
  }

  /**
   * Rename a wallet
   * Updates the wallet's nickname in metadata
   *
   * @param walletId - UUID of the wallet to rename
   * @param newNickname - New name for the wallet
   * @param pin - User's PIN for verification
   */
  static async renameWallet(walletId: string, newNickname: string, pin: string): Promise<MessageResponse<void>> {
    console.log('?? [ExtensionMessaging] RENAME_WALLET request', {
      walletId,
      newNickname,
      pinLength: typeof pin === 'string' ? pin.length : undefined,
      timestamp: new Date().toISOString()
    });
    return this.sendToBackground({
      type: 'RENAME_WALLET',
      walletId,
      newNickname,
      pin
    });
  }

  /**
   * Delete a wallet
   * Removes wallet from storage (prevents deleting the last wallet)
   *
   * @param walletId - UUID of the wallet to delete
   * @param pin - User's PIN for verification
   */
  static async deleteWallet(walletId: string, pin: string): Promise<MessageResponse<void>> {
    return this.sendToBackground({
      type: 'DELETE_WALLET',
      walletId,
      pin
    });
  }

  /**
   * Check if mnemonic already exists (duplicate detection)
   * Derives fingerprint from mnemonic and compares with existing wallets
   *
   * @param mnemonic - Mnemonic to check
   * @param pin - User's PIN to decrypt existing wallets
   * @returns True if duplicate found, false otherwise
   */
  static async checkDuplicateMnemonic(mnemonic: string, pin: string): Promise<MessageResponse<boolean>> {
    return this.sendToBackground({
      type: 'CHECK_DUPLICATE_MNEMONIC',
      mnemonic,
      pin
    });
  }
}
