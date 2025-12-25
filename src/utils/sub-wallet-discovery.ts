/**
 * Sub-Wallet Discovery Utilities
 *
 * Scans for used sub-wallets by connecting to each derived mnemonic
 * and checking for balance or transaction history.
 *
 * This is useful when importing an existing master key to discover
 * which sub-wallets have been previously used.
 */

import init, {
  connect,
  defaultConfig,
  type BreezSdk,
  type Config,
  type ConnectRequest
} from '@breeztech/breez-sdk-spark/web';
import { deriveSubWalletMnemonic } from './mnemonic-derivation';
import { HIERARCHICAL_WALLET_CONSTANTS } from '../types';

const { MAX_SUB_WALLETS } = HIERARCHICAL_WALLET_CONSTANTS;

// Discovery result for a single sub-wallet
export interface SubWalletDiscoveryResult {
  index: number;
  hasActivity: boolean;
  balance: number;
  error?: string;
}

// Overall discovery progress
export interface DiscoveryProgress {
  currentIndex: number;
  totalToScan: number;
  discoveredWallets: SubWalletDiscoveryResult[];
  isComplete: boolean;
}

// Callback for progress updates
export type DiscoveryProgressCallback = (progress: DiscoveryProgress) => void;

// Discovery options
export interface DiscoveryOptions {
  maxIndexToScan?: number; // Default: 5 (scan indices 0-4)
  stopAfterEmptyCount?: number; // Stop after N consecutive empty wallets (default: 3)
  onProgress?: DiscoveryProgressCallback;
  apiKey: string;
}

/**
 * Check if a sub-wallet has activity (balance or transactions)
 * Connects to the SDK, checks balance, then disconnects
 *
 * @param mnemonic - The derived sub-wallet mnemonic
 * @param apiKey - Breez API key
 * @param storagePrefix - Unique storage prefix for this scan
 * @returns Balance in satoshis (0 if no activity)
 */
async function checkSubWalletActivity(
  mnemonic: string,
  apiKey: string,
  storagePrefix: string
): Promise<{ balance: number; hasActivity: boolean }> {
  let sdk: BreezSdk | null = null;

  try {
    // Initialize WASM if not already done
    await init();

    // Create config
    const config: Config = defaultConfig('mainnet');
    config.apiKey = apiKey;
    config.syncIntervalSecs = 30; // Quick sync for discovery

    // Connect with unique storage directory to avoid conflicts
    const connectRequest: ConnectRequest = {
      config: config,
      mnemonic: mnemonic,
      storageDir: storagePrefix
    };

    sdk = await connect(connectRequest);

    // Get wallet info
    const info = await sdk.getInfo({ ensureSynced: true });
    const balance = info?.balanceSats || 0;

    // Check for any activity (balance > 0 indicates usage)
    const hasActivity = balance > 0;

    return { balance, hasActivity };
  } catch (error) {
    console.error('[Discovery] Error checking sub-wallet:', error);
    // Return no activity on error - wallet might not exist yet
    return { balance: 0, hasActivity: false };
  } finally {
    // Always disconnect
    if (sdk) {
      try {
        await sdk.disconnect();
      } catch (e) {
        console.warn('[Discovery] Error disconnecting:', e);
      }
    }
  }
}

/**
 * Discover which sub-wallets have been used for a master mnemonic
 *
 * Scans sub-wallet indices and checks for activity. Uses a "gap limit"
 * strategy - stops scanning after finding N consecutive empty wallets.
 *
 * @param masterMnemonic - The master 12-word mnemonic
 * @param options - Discovery options
 * @returns Array of discovered sub-wallet results
 */
export async function discoverSubWallets(
  masterMnemonic: string,
  options: DiscoveryOptions
): Promise<SubWalletDiscoveryResult[]> {
  const {
    maxIndexToScan = 5,
    stopAfterEmptyCount = 3,
    onProgress,
    apiKey
  } = options;

  const results: SubWalletDiscoveryResult[] = [];
  let consecutiveEmpty = 0;
  const scanLimit = Math.min(maxIndexToScan, MAX_SUB_WALLETS);

  console.log(`[Discovery] Starting scan for up to ${scanLimit} sub-wallets`);

  for (let index = 0; index < scanLimit; index++) {
    // Report progress
    if (onProgress) {
      onProgress({
        currentIndex: index,
        totalToScan: scanLimit,
        discoveredWallets: [...results],
        isComplete: false
      });
    }

    try {
      // Derive the sub-wallet mnemonic
      const derivedMnemonic = deriveSubWalletMnemonic(masterMnemonic, index);

      // Create unique storage prefix for this scan
      const storagePrefix = `discovery-scan-${Date.now()}-${index}`;

      // Check for activity
      console.log(`[Discovery] Scanning sub-wallet index ${index}...`);
      const { balance, hasActivity } = await checkSubWalletActivity(
        derivedMnemonic,
        apiKey,
        storagePrefix
      );

      const result: SubWalletDiscoveryResult = {
        index,
        hasActivity,
        balance
      };

      results.push(result);

      if (hasActivity) {
        console.log(`[Discovery] Found activity at index ${index}: ${balance} sats`);
        consecutiveEmpty = 0;
      } else {
        console.log(`[Discovery] No activity at index ${index}`);
        consecutiveEmpty++;

        // Stop if we've hit the gap limit (but always scan index 0)
        if (index > 0 && consecutiveEmpty >= stopAfterEmptyCount) {
          console.log(`[Discovery] Stopping after ${consecutiveEmpty} consecutive empty wallets`);
          break;
        }
      }
    } catch (error) {
      console.error(`[Discovery] Error scanning index ${index}:`, error);
      results.push({
        index,
        hasActivity: false,
        balance: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Final progress update
  if (onProgress) {
    onProgress({
      currentIndex: results.length,
      totalToScan: scanLimit,
      discoveredWallets: results,
      isComplete: true
    });
  }

  console.log(`[Discovery] Scan complete. Found ${results.filter(r => r.hasActivity).length} active sub-wallets`);

  return results;
}

/**
 * Quick check if a master key has any sub-wallet activity
 * Only scans index 0 (the original mnemonic)
 *
 * @param masterMnemonic - The master 12-word mnemonic
 * @param apiKey - Breez API key
 * @returns True if the main wallet has activity
 */
export async function hasMainWalletActivity(
  masterMnemonic: string,
  apiKey: string
): Promise<boolean> {
  try {
    const storagePrefix = `quick-check-${Date.now()}`;
    const { hasActivity } = await checkSubWalletActivity(
      masterMnemonic,
      apiKey,
      storagePrefix
    );
    return hasActivity;
  } catch (error) {
    console.error('[Discovery] Error in quick check:', error);
    return false;
  }
}

/**
 * Get default names for discovered sub-wallets
 *
 * @param discoveryResults - Results from discoverSubWallets
 * @returns Array of { index, nickname } for wallets with activity
 */
export function getDiscoveredWalletNames(
  discoveryResults: SubWalletDiscoveryResult[]
): { index: number; nickname: string }[] {
  return discoveryResults
    .filter(r => r.hasActivity)
    .map(r => ({
      index: r.index,
      nickname: r.index === 0 ? 'Main Wallet' : `Sub-Wallet ${r.index}`
    }));
}
