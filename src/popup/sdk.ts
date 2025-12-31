// Breez SDK connection and management
// All SDK operations must occur in popup context (WASM limitation)

import init, {
    connect,
    defaultConfig,
    type BreezSdk,
    type Config,
    type ConnectRequest,
    type SdkEvent
} from '@breeztech/breez-sdk-spark/web';
import { BREEZ_API_KEY, breezSDK, setBreezSDK } from './state';
import * as bip39 from 'bip39';

// BIP39 wordlist for sub-wallet derivation
const BIP39_WORDLIST = bip39.wordlists.english;

// Callback type for SDK events
export type SdkEventCallback = {
    onSync?: () => void;
    onPaymentReceived?: () => void;
};

// Event callbacks - set by popup.ts
let eventCallbacks: SdkEventCallback = {};

export function setSdkEventCallbacks(callbacks: SdkEventCallback): void {
    eventCallbacks = callbacks;
}

/**
 * Derive a sub-wallet mnemonic from a master mnemonic
 * Uses deterministic word modification on the 11th word
 */
/**
 * Calculates the 12th word (checksum word) for a modified mnemonic
 */
function calculateChecksumWord(first11Words: string[]): string {
    const testMnemonic = first11Words.join(' ');
    
    // Try each possible 12th word until we find one that creates a valid mnemonic
    for (const word of BIP39_WORDLIST) {
        if (bip39.validateMnemonic(`${testMnemonic} ${word}`)) {
            return word;
        }
    }
    throw new Error('Could not find a valid checksum word');
}

/**
 * Derive a sub-wallet mnemonic from a master mnemonic
 * Uses deterministic word modification on the 11th word and recalculates checksum (12th word)
 */
export function deriveSubWalletMnemonic(masterMnemonic: string, index: number): string {
    if (index < 0 || index > 19) {
        throw new Error('Sub-wallet index must be between 0 and 19');
    }

    // Index 0 returns the master mnemonic unchanged
    if (index === 0) {
        return masterMnemonic;
    }

    const words = masterMnemonic.trim().split(/\s+/);
    if (words.length !== 12) {
        throw new Error('Invalid mnemonic: must be 12 words');
    }

    // Get the current 11th word (0-indexed as 10)
    const currentWord = words[10].toLowerCase();
    const currentIndex = BIP39_WORDLIST.indexOf(currentWord);
    
    if (currentIndex === -1) {
        throw new Error(`Invalid BIP39 word: ${currentWord}`);
    }

    // Calculate new word index using modular arithmetic
    const newWordIndex = (currentIndex + index) % BIP39_WORDLIST.length;
    const newWord = BIP39_WORDLIST[newWordIndex];

    // Create new first 11 words with modified 11th word
    const first11Words = [...words.slice(0, 10), newWord];

    // Calculate the new 12th word (checksum)
    const new12thWord = calculateChecksumWord(first11Words);

    return [...first11Words, new12thWord].join(' ');
}

/**
 * Check if a wallet has transactions/balance
 * MUST run in popup context (has DOM access for WASM)
 * Creates a temporary SDK connection to check the wallet state
 */
/**
 * Check if a wallet has transactions/balance
 * MUST run in popup context (has DOM access for WASM)
 * Creates a temporary SDK connection to check the wallet state
 */
export async function checkWalletHasTransactions(
    mnemonic: string,
    onStatus?: (status: string) => void
): Promise<{ hasTransactions: boolean; balanceSats: number }> {
    console.log('[Popup-SDK] checkWalletHasTransactions - Starting...');
    onStatus?.('Checking wallet...');

    let tempSdk: BreezSdk | null = null;

    try {
        // Initialize WASM
        await init();

        // Create config
        const config: Config = defaultConfig('mainnet');
        config.apiKey = BREEZ_API_KEY;

        // Use a unique storage dir to avoid conflicts
        const storageDir = `breez-discovery-${Date.now()}`;

        console.log('[Popup-SDK] Connecting to check wallet...');
        
        tempSdk = await connect({
            config: config,
            mnemonic: mnemonic,
            storageDir: storageDir
        });

        // Listen for sync event - need enough time for LSP to respond with wallet state
        // 8 seconds was the working value that successfully detected sub-wallets
        const SYNC_TIMEOUT_MS = 8000;
        
        const syncListenerPromise = new Promise<void>((resolve) => {
             // Define pollInterval first so it can be referenced in timeout and event listener
             let pollInterval: ReturnType<typeof setInterval>;

             const timeout = setTimeout(() => {
                 console.log('[Popup-SDK] Sync timeout reached (fast check)');
                 if (pollInterval) clearInterval(pollInterval);
                 resolve();
             }, SYNC_TIMEOUT_MS);

             // FAST TRACK: Poll for balance AND payments every 500ms while waiting for sync
             // If we see balance/payments, we don't need to wait for full sync to know it exists
             pollInterval = setInterval(async () => {
                if (!tempSdk) {
                    clearInterval(pollInterval);
                    return;
                }
                try {
                    // Check balance
                    const info = await tempSdk.getInfo({ ensureSynced: false });
                    const currentBalance = info.balanceSats || 0;
                    const hasNodeId = !!info.id;

                    if (currentBalance > 0) {
                         console.log('[Popup-SDK] Fast track: Found balance before sync complete');
                         clearTimeout(timeout);
                         clearInterval(pollInterval);
                         resolve();
                         return;
                    }

                    // Check payments ONLY if we have a node ID (SDK initialized)
                    if (hasNodeId) {
                        try {
                            const payments = await tempSdk.listPayments({});
                            if (payments && payments.payments && payments.payments.length > 0) {
                                 console.log('[Popup-SDK] Fast track: Found payments before sync complete');
                                 clearTimeout(timeout);
                                 clearInterval(pollInterval);
                                 resolve();
                                 return;
                            }
                        } catch (e) {
                            // Ignore listPayments error, might be too early
                        }
                    }
                } catch (e) { /* ignore polling errors */ }
            }, 500);

             // Event listener for sync - also clears the poll interval
             tempSdk!.addEventListener({
                onEvent: (event: SdkEvent) => {
                    if (event.type === 'synced') {
                        console.log('[Popup-SDK] Temporary SDK synced!');
                        clearTimeout(timeout);
                        clearInterval(pollInterval);
                        resolve();
                    }
                }
            });
        });

        console.log('[Popup-SDK] Waiting for sync or activity...');
        await syncListenerPromise;

        console.log('[Popup-SDK] Checking final status...');

        // Get wallet info
        let balanceSats = 0;
        let hasActivity = false;

        try {
            // Now we can expect it to be synced or best-effort
            const info = await tempSdk.getInfo({ ensureSynced: false });
            balanceSats = info.balanceSats || 0;
            
            console.log('[Popup-SDK] Wallet info:', {
                balance: balanceSats,
                nodeId: info.id?.substring(0, 16) + '...'
            });

            if (balanceSats > 0) {
                hasActivity = true;
            }

            // Also check for payments (transaction history)
            // This is critical for wallets with zero balance but have transaction history
            console.log('[Popup-SDK] Checking for payment history...');
            const payments = await tempSdk.listPayments({});
            const paymentCount = payments.payments?.length || 0;
            console.log(`[Popup-SDK] Payment history check: ${paymentCount} payments found`);

            if (paymentCount > 0) {
                hasActivity = true;
                console.log('[Popup-SDK] ✅ Found payments:', paymentCount);
            } else {
                console.log('[Popup-SDK] No payments found in history');
            }
        } catch (infoError) {
            console.warn('[Popup-SDK] Error getting wallet info:', infoError);
        }

        console.log(`[Popup-SDK] Final result: hasActivity=${hasActivity}, balance=${balanceSats}`);
        return { hasTransactions: hasActivity, balanceSats };
    } catch (error) {
        console.error('[Popup-SDK] checkWalletHasTransactions failed:', error);
        return { hasTransactions: false, balanceSats: 0 };
    } finally {
        if (tempSdk) {
            console.log('[Popup-SDK] Disconnecting temporary SDK...');
            try {
                await tempSdk.disconnect();
            } catch (e) {
                // Ignore disconnect errors
            }
        }
    }
}

/**
 * Discover sub-wallets with transaction history
 * MUST run in popup context (has DOM access for WASM)
 * Checks sub-wallets sequentially (WASM doesn't support parallel SDK connections)
 *
 * @param masterMnemonic - The master 12-word mnemonic
 * @param onProgress - Optional callback for progress updates
 * @param onWalletFound - Optional callback when a sub-wallet with activity is found (for partial results)
 * @param startFromIndex - Optional index to resume from (default: 1)
 */
export async function discoverSubWalletsInPopup(
    masterMnemonic: string,
    onProgress?: (status: string, index: number, foundCount: number) => void,
    onWalletFound?: (wallet: { index: number; balanceSats: number }) => void,
    startFromIndex: number = 1
): Promise<{ index: number; balanceSats: number }[]> {
    console.log(`[Popup-SDK] Starting sub-wallet discovery (sequential) from index ${startFromIndex}...`);

    const discoveredWallets: { index: number; balanceSats: number }[] = [];
    const MAX_INDEX = 5; // Check indices 1, 2, 3, 4
    const MAX_CONSECUTIVE_EMPTY = 2; // Stop after 2 consecutive empty wallets
    let consecutiveEmpty = 0;

    // Check sub-wallets sequentially (WASM can't handle parallel connections)
    for (let index = startFromIndex; index < MAX_INDEX; index++) {
        try {
            onProgress?.(`Checking sub-wallet ${index}...`, index, discoveredWallets.length);

            const derivedMnemonic = deriveSubWalletMnemonic(masterMnemonic, index);
            console.log(`[Popup-SDK] Checking sub-wallet index ${index}...`);

            const { hasTransactions, balanceSats } = await checkWalletHasTransactions(derivedMnemonic);

            if (hasTransactions) {
                console.log(`[Popup-SDK] ✅ Found sub-wallet ${index} with balance: ${balanceSats} sats`);
                const wallet = { index, balanceSats };
                discoveredWallets.push(wallet);
                onWalletFound?.(wallet);
                consecutiveEmpty = 0;
            } else {
                console.log(`[Popup-SDK] ❌ Sub-wallet ${index} appears empty (balance: ${balanceSats}, hasTransactions: ${hasTransactions})`);
                consecutiveEmpty++;
                console.log(`[Popup-SDK] Consecutive empty count: ${consecutiveEmpty}/${MAX_CONSECUTIVE_EMPTY}`);
                if (consecutiveEmpty >= MAX_CONSECUTIVE_EMPTY) {
                    console.log('[Popup-SDK] Stopping after consecutive empty wallets');
                    break;
                }
            }
        } catch (error) {
            console.error(`[Popup-SDK] Error checking sub-wallet ${index}:`, error);
            consecutiveEmpty++;
            if (consecutiveEmpty >= MAX_CONSECUTIVE_EMPTY) {
                break;
            }
        }
    }

    console.log(`[Popup-SDK] Discovery complete. Found ${discoveredWallets.length} sub-wallets.`);
    return discoveredWallets;
}

/**
 * Connect to Breez SDK with mnemonic
 * CRITICAL: This must run in popup context (has DOM access for WASM)
 * NOTE: This function returns the SDK but does NOT store it in state.
 * The caller is responsible for storing the SDK via setBreezSDK() if needed.
 */
export async function connectBreezSDK(mnemonic: string): Promise<BreezSdk> {
    console.log('🔵 [Popup-SDK] CONNECT_BREEZ_SDK ENTRY', {
        timestamp: new Date().toISOString(),
        mnemonicWordCount: mnemonic.split(' ').length,
        apiKeyLength: BREEZ_API_KEY.length
    });

    try {
        // CRITICAL: Initialize WASM module FIRST (required for web/browser environments)
        console.log('🔍 [Popup-SDK] Initializing Breez WASM module...');
        await init();
        console.log('✅ [Popup-SDK] WASM initialized successfully');

        // Now create configuration (WASM must be initialized first)
        console.log('🔍 [Popup-SDK] Creating default config...');
        const config: Config = defaultConfig('mainnet');
        config.apiKey = BREEZ_API_KEY;
        config.syncIntervalSecs = 60;
        console.log('🔍 [Popup-SDK] Config created', {
            network: 'mainnet',
            hasApiKey: !!config.apiKey,
            syncInterval: config.syncIntervalSecs
        });

        // Connect request
        const connectRequest: ConnectRequest = {
            config: config,
            mnemonic: mnemonic,
            storageDir: 'breez-sdk-tipmaster'  // IndexedDB database name
        };
        console.log('🔍 [Popup-SDK] ConnectRequest prepared', {
            storageDir: connectRequest.storageDir,
            hasMnemonic: !!connectRequest.mnemonic
        });

        console.log('🔍 [Popup-SDK] Calling Breez SDK connect()...');
        const sdk = await connect(connectRequest);
        console.log('✅ [Popup-SDK] CONNECT_BREEZ_SDK SUCCESS', {
            timestamp: new Date().toISOString(),
            sdkConnected: !!sdk
        });

        // Set up event listener for SDK events (sync, payments, etc.)
        console.log('🔔 [Breez-SDK] Setting up event listener for sync and payment events');
        sdk.addEventListener({
            onEvent: (event: SdkEvent) => {
                console.log('🔔 [Breez-SDK] Event received:', event.type);

                if (event.type === 'synced') {
                    console.log('✅ [Breez-SDK] Wallet synced with Lightning Network');

                    // Hide loading indicators now that sync is complete
                    const balanceLoading = document.getElementById('balance-loading');
                    if (balanceLoading) {
                        balanceLoading.classList.add('hidden');
                        console.log('✅ [Breez-SDK] Hiding balance loading indicator');
                    }

                    // Trigger callbacks
                    eventCallbacks.onSync?.();
                } else if (event.type === 'paymentSucceeded') {
                    console.log('💰 [Breez-SDK] Payment received');
                    eventCallbacks.onPaymentReceived?.();
                }
            }
        });

        return sdk;
    } catch (error) {
        console.error('❌ [Popup-SDK] CONNECT_BREEZ_SDK FAILED', {
            error: error instanceof Error ? error.message : String(error),
            errorName: error instanceof Error ? error.name : undefined,
            stack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString()
        });
        throw error;
    }
}

/**
 * Disconnect from Breez SDK
 */
export async function disconnectBreezSDK(): Promise<void> {
    if (breezSDK) {
        try {
            await breezSDK.disconnect();
            console.log('Breez SDK disconnected');
        } catch (error) {
            console.error('Error disconnecting SDK:', error);
        }
        setBreezSDK(null);
    }
}

/**
 * Get the current SDK instance
 */
export function getBreezSDK(): BreezSdk | null {
    return breezSDK;
}
