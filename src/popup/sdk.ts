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
