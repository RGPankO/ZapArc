// Background service worker for Lightning Network Tipping Extension
// Handles Breez SDK operations, storage management, and message passing

import { WalletData, UserSettings } from '../types';
import { WalletManager } from '../utils/wallet-manager';
import { ChromeStorageManager } from '../utils/storage';
import { LnurlManager } from '../utils/lnurl';

console.log('Lightning Tipping Extension background service worker loaded');

// Global instances
const walletManager = new WalletManager();
const storageManager = new ChromeStorageManager();
const lnurlManager = new LnurlManager(walletManager);

// Message handler for communication with other components
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender, sendResponse);
  return true; // Keep message channel open for async responses
});

async function handleMessage(message: any, sender: any, sendResponse: (response: any) => void) {
  try {
    // Update activity timestamp for auto-lock
    await storageManager.updateActivity();

    switch (message.type) {
      case 'SETUP_WALLET':
        try {
          console.log('Background: Starting wallet setup');
          await walletManager.setupWallet({
            mnemonic: message.mnemonic,
            pin: message.pin,
            network: message.network || 'mainnet'
          });
          console.log('Background: Wallet setup completed successfully');
          sendResponse({ success: true });
        } catch (setupError) {
          console.error('Background: Wallet setup failed:', setupError);
          sendResponse({ 
            success: false, 
            error: setupError instanceof Error ? setupError.message : 'Wallet setup failed' 
          });
        }
        break;

      case 'UNLOCK_WALLET':
        await walletManager.unlockWallet(message.pin);
        sendResponse({ success: true });
        break;

      case 'LOCK_WALLET':
        await walletManager.lockWallet();
        sendResponse({ success: true });
        break;

      case 'GET_WALLET_STATUS':
        const status = await walletManager.getWalletStatus();
        sendResponse({ success: true, status });
        break;

      case 'GET_BALANCE':
        const balance = await walletManager.getBalance();
        sendResponse({ success: true, balance });
        break;

      case 'GENERATE_INVOICE':
        const invoice = await walletManager.generateInvoice(message.amount, message.description);
        sendResponse({ success: true, invoice });
        break;

      case 'SEND_PAYMENT':
        const success = await walletManager.sendPayment(message.bolt11);
        sendResponse({ success });
        break;

      case 'LIST_PAYMENTS':
        const payments = await walletManager.getPaymentHistory(message.forceRefresh);
        sendResponse({ success: true, payments });
        break;

      case 'PARSE_LNURL':
        const parsed = await walletManager.parseLnurl(message.lnurl);
        sendResponse({ success: true, data: parsed });
        break;

      case 'PAY_LNURL':
        const paySuccess = await walletManager.payLnurl(message.reqData, message.amount, message.comment);
        sendResponse({ success: paySuccess });
        break;

      case 'PROCESS_PAYMENT':
        try {
          // This would integrate with the payment processor
          const paymentResult = await walletManager.payLnurl(
            message.lnurlData, 
            message.amount, 
            message.comment
          );
          sendResponse({ 
            success: paymentResult,
            transactionId: paymentResult ? `tx_${Date.now()}` : undefined
          });
        } catch (error) {
          sendResponse({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Payment processing failed',
            retryable: true
          });
        }
        break;

      case 'GENERATE_QR_CODE':
        try {
          // For QR code generation, we return the LNURL or bolt11 invoice
          // The frontend will handle the actual QR image generation
          let qrData = message.lnurl;
          
          if (message.amount && message.amount > 0) {
            // If amount is specified, we could generate a bolt11 invoice
            // For now, return the LNURL with amount parameter
            qrData = `lightning:${message.lnurl.toUpperCase()}?amount=${message.amount * 1000}`;
            if (message.comment) {
              qrData += `&message=${encodeURIComponent(message.comment)}`;
            }
          }
          
          sendResponse({ success: true, qrData });
        } catch (error) {
          sendResponse({ 
            success: false, 
            error: error instanceof Error ? error.message : 'QR generation failed'
          });
        }
        break;

      case 'GENERATE_LNURL':
        const lnurl = await walletManager.generateReceiveLnurl();
        sendResponse({ success: true, lnurl });
        break;

      case 'GET_NODE_INFO':
        const nodeInfo = await walletManager.getNodeInfo();
        sendResponse({ success: true, nodeInfo });
        break;

      case 'CHECK_SUFFICIENT_BALANCE':
        const hasSufficientBalance = await walletManager.hasSufficientBalance(message.amount);
        sendResponse({ success: true, hasSufficientBalance });
        break;

      case 'PARSE_TIP_REQUEST':
        const tipData = lnurlManager.parseTipRequest(message.tipString);
        sendResponse({ success: true, tipData });
        break;

      case 'GENERATE_TIP_REQUEST':
        const tipRequest = lnurlManager.generateTipRequest(message.lnurl, message.amounts);
        sendResponse({ success: true, tipRequest });
        break;

      case 'GENERATE_USER_TIP_REQUEST':
        const userTipRequest = await lnurlManager.generateUserTipRequest(message.amounts);
        sendResponse({ success: true, tipRequest: userTipRequest });
        break;

      case 'GET_LNURL_PAYMENT_LIMITS':
        const limits = await lnurlManager.getLnurlPaymentLimits(message.lnurl);
        sendResponse({ success: true, limits });
        break;

      case 'IS_COMMENT_ALLOWED':
        const commentInfo = await lnurlManager.isCommentAllowed(message.lnurl);
        sendResponse({ success: true, commentInfo });
        break;

      case 'EXTRACT_LNURL':
        const extractedLnurl = lnurlManager.extractLnurl(message.input);
        sendResponse({ success: true, lnurl: extractedLnurl });
        break;

      case 'ADD_TO_BLACKLIST':
        const blacklistArray = await storageManager.getBlacklist();
        if (!blacklistArray.lnurls.includes(message.lnurl)) {
          blacklistArray.lnurls.push(message.lnurl);
          blacklistArray.lastUpdated = Date.now();
          await storageManager.saveBlacklist(blacklistArray.lnurls);
        }
        sendResponse({ success: true });
        break;

      case 'REMOVE_FROM_BLACKLIST':
        const currentBlacklist = await storageManager.getBlacklist();
        const filteredLnurls = currentBlacklist.lnurls.filter(lnurl => lnurl !== message.lnurl);
        await storageManager.saveBlacklist(filteredLnurls);
        sendResponse({ success: true });
        break;

      case 'CLEAR_BLACKLIST':
        await storageManager.saveBlacklist([]);
        sendResponse({ success: true });
        break;

      case 'SET_DOMAIN_STATUS':
        await storageManager.saveDomainSettings(message.domain, message.status);
        sendResponse({ success: true });
        break;

      case 'GET_DOMAIN_STATUS':
        const currentDomainSettings = await storageManager.getDomainSettings();
        const domainStatus = currentDomainSettings[message.domain] || 'unmanaged';
        sendResponse({ success: true, status: domainStatus });
        break;

      case 'GET_ALL_DOMAINS':
        const allDomainSettings = await storageManager.getDomainSettings();
        sendResponse({ success: true, domains: allDomainSettings });
        break;

      case 'SAVE_WALLET':
        await storageManager.saveEncryptedWallet(message.walletData, message.pin);
        sendResponse({ success: true });
        break;

      case 'LOAD_WALLET':
        const walletData = await storageManager.loadEncryptedWallet(message.pin);
        sendResponse({ success: true, walletData });
        break;

      case 'SAVE_DOMAIN_SETTINGS':
        await storageManager.saveDomainSettings(message.domain, message.status);
        sendResponse({ success: true });
        break;

      case 'GET_DOMAIN_SETTINGS':
        const domainSettings = await storageManager.getDomainSettings();
        sendResponse({ success: true, domainSettings });
        break;

      case 'SAVE_BLACKLIST':
        await storageManager.saveBlacklist(message.lnurls);
        sendResponse({ success: true });
        break;

      case 'GET_BLACKLIST':
        const blacklist = await storageManager.getBlacklist();
        sendResponse({ success: true, blacklist });
        break;

      case 'GET_USER_SETTINGS':
        const settings = await storageManager.getUserSettings();
        sendResponse({ success: true, data: settings });
        break;

      case 'SAVE_USER_SETTINGS':
        await storageManager.saveUserSettings(message.settings);
        sendResponse({ success: true });
        break;

      case 'IS_WALLET_UNLOCKED':
        const isUnlocked = await storageManager.isWalletUnlocked();
        sendResponse({ success: true, isUnlocked });
        break;



      case 'IS_WALLET_CONNECTED':
        const isConnected = walletManager.getBreezSDK().isWalletConnected();
        sendResponse({ success: true, data: isConnected });
        break;

      case 'WALLET_EXISTS':
        const walletExists = await storageManager.walletExists();
        sendResponse({ success: true, data: walletExists });
        break;

      default:
        sendResponse({ success: false, error: 'Unknown message type' });
    }
  } catch (error) {
    console.error('Message handler error:', error);
    sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

// Skip Breez SDK initialization in background service worker
// (WASM modules need DOM context which isn't available here)
console.log('Background service worker ready - Breez SDK will be initialized when needed');

// Auto-lock check on service worker activation
chrome.runtime.onStartup.addListener(async () => {
  try {
    const isUnlocked = await storageManager.isWalletUnlocked();
    if (!isUnlocked) {
      // Just ensure wallet is locked in storage
      await storageManager.lockWallet();
    }
  } catch (error) {
    console.error('Failed to check auto-lock on startup:', error);
  }
});