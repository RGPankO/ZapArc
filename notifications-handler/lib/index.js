"use strict";
/**
 * Firebase Cloud Function for sending Expo push notifications
 * for Lightning wallet transactions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.notify = exports.sendTransactionNotification = exports.registerDevice = void 0;
const https_1 = require("firebase-functions/v2/https");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const config_js_1 = require("./config.js");
// Initialize Firebase Admin
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
const PUBKEY_FALLBACK_MAX_AGE_DAYS = 30;
function parseIsoDate(value) {
    if (typeof value !== 'string')
        return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}
/**
 * Formats the push notification message
 */
function formatPushMessage(expoPushToken, amount, walletNickname) {
    const walletInfo = walletNickname ? ` on ${walletNickname}` : '';
    return {
        to: expoPushToken,
        title: 'Payment Received',
        body: `You received ${amount} sats${walletInfo}!`,
        data: { amount, walletNickname: walletNickname || '' },
    };
}
/**
 * Sends a push notification via the Expo Push API
 */
async function sendPushNotification(message) {
    try {
        const response = await fetch(config_js_1.config.EXPO_PUSH_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
        });
        if (!response.ok) {
            const errorText = await response.text();
            return {
                success: false,
                error: `Expo Push API returned ${response.status}: ${errorText}`,
            };
        }
        const result = (await response.json());
        // Check for Expo-specific errors in the response
        if (result.data && Array.isArray(result.data)) {
            const ticketResult = result.data[0];
            if (ticketResult?.status === 'error') {
                return {
                    success: false,
                    error: ticketResult.message || 'Unknown Expo Push API error',
                };
            }
        }
        return { success: true };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
            success: false,
            error: `Failed to send notification: ${errorMessage}`,
        };
    }
}
/**
 * Registers a user's push token mapped to their Public Key (Node ID)
 */
exports.registerDevice = (0, https_1.onRequest)({ cors: true, region: 'europe-west3' }, async (request, response) => {
    try {
        if (request.method !== 'POST') {
            response.status(405).json({
                success: false,
                error: 'Method not allowed. Use POST.',
            });
            return;
        }
        const body = request.body;
        const { pubKey, expoPushToken, platform, walletNickname } = body;
        if (!pubKey || !expoPushToken) {
            response.status(400).json({
                success: false,
                error: 'Missing required fields: pubKey, expoPushToken',
            });
            return;
        }
        // Normalize the key (Lightning Address should be lowercase)
        // This handles both node IDs (hex pubkeys) and Lightning Addresses (user@domain)
        const normalizedKey = pubKey.includes('@')
            ? pubKey.toLowerCase().trim()
            : pubKey;
        // Store in Firestore
        // Collection: 'users' -> Document: <pubKey or lightningAddress>
        await db.collection('users').doc(normalizedKey).set({
            expoPushToken,
            platform: platform || 'unknown',
            walletNickname: walletNickname || undefined,
            updatedAt: new Date(),
        }, { merge: true });
        console.log(`✅ Registered token for user ${normalizedKey.substring(0, 20)}...`);
        response.status(200).json({
            success: true,
            message: 'Device registered successfully',
        });
    }
    catch (error) {
        console.error('❌ Registration failed:', error);
        response.status(500).json({
            success: false,
            error: 'Internal server error during registration',
        });
    }
});
/**
 * HTTP-triggered Cloud Function that sends transaction notifications
 */
exports.sendTransactionNotification = (0, https_1.onRequest)({ cors: true, region: 'europe-west3' }, async (request, response) => {
    try {
        // Only allow POST requests
        if (request.method !== 'POST') {
            response.status(405).json({
                success: false,
                error: 'Method not allowed. Use POST.',
            });
            return;
        }
        // Parse request body
        const body = request.body;
        const { expoPushToken: directToken, recipientPubKey, recipientLightningAddress, amount } = body;
        // Validate inputs
        if (!amount) {
            response.status(400).json({ success: false, error: 'Amount is required' });
            return;
        }
        let tokensToSend = [];
        // 1. If direct token provided, use it
        if (directToken) {
            tokensToSend.push(directToken);
        }
        let tokenInfos = [];
        if (directToken) {
            tokenInfos.push({ token: directToken });
        }
        if (recipientPubKey) {
            // Pubkey fallback is potentially unsafe for Spark (shared/ambiguous identities).
            // Only use it when no stronger identifier (lightning address or direct token) is available.
            if (recipientLightningAddress || directToken) {
                console.log('ℹ️ Skipping recipientPubKey lookup because stronger identifier is available');
            }
            else {
                const userDoc = await db.collection('users').doc(recipientPubKey).get();
                if (userDoc.exists) {
                    const userData = userDoc.data() ?? {};
                    const token = userData?.expoPushToken;
                    if (token) {
                        // Safety check #1: token should not be shared by multiple identifiers
                        const sharedTokenSnap = await db.collection('users')
                            .where('expoPushToken', '==', token)
                            .limit(3)
                            .get();
                        if (sharedTokenSnap.size > 1) {
                            console.warn('⚠️ Skipping pubkey notification due to ambiguous token mapping', {
                                recipientPubKey,
                                tokenPrefix: token.substring(0, 20),
                                matchingDocs: sharedTokenSnap.size,
                            });
                        }
                        else {
                            // Safety check #2: mapping should be fresh enough
                            const updatedAt = parseIsoDate(userData?.updatedAt);
                            const isFresh = updatedAt
                                ? (Date.now() - updatedAt.getTime()) <= PUBKEY_FALLBACK_MAX_AGE_DAYS * 24 * 60 * 60 * 1000
                                : false;
                            if (!isFresh) {
                                console.warn('⚠️ Skipping pubkey notification due to stale mapping', {
                                    recipientPubKey,
                                    updatedAt: userData?.updatedAt,
                                });
                            }
                            else {
                                tokenInfos.push({
                                    token,
                                    walletNickname: userData.walletNickname,
                                });
                            }
                        }
                    }
                    else {
                        console.log(`⚠️ User ${recipientPubKey} found but no token.`);
                    }
                }
                else {
                    console.log(`⚠️ User ${recipientPubKey} not found in registry.`);
                }
            }
        }
        // 3. If recipientLightningAddress provided, look it up in Firestore
        // Lightning Address is unique per wallet (unlike nodeId for Breez Spark users)
        if (recipientLightningAddress) {
            // Normalize Lightning Address (lowercase, trim)
            const normalizedAddress = recipientLightningAddress.toLowerCase().trim();
            const userDoc = await db.collection('users').doc(normalizedAddress).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                if (userData?.expoPushToken) {
                    tokenInfos.push({
                        token: userData.expoPushToken,
                        walletNickname: userData.walletNickname
                    });
                    console.log(`✅ Found token for Lightning Address ${normalizedAddress}`);
                }
                else {
                    console.log(`⚠️ Lightning Address ${normalizedAddress} found but no token.`);
                }
            }
            else {
                console.log(`⚠️ Lightning Address ${normalizedAddress} not found in registry.`);
            }
        }
        // Allow either direct token OR looked-up token
        if (tokenInfos.length === 0) {
            response.status(404).json({
                success: false,
                error: 'No valid recipient token found. Provide expoPushToken or recipientLightningAddress (pubKey fallback is safety-restricted).',
            });
            return;
        }
        // Deduplicate by token
        const seenTokens = new Set();
        tokenInfos = tokenInfos.filter(info => {
            if (seenTokens.has(info.token))
                return false;
            seenTokens.add(info.token);
            return true;
        });
        // Send to all found tokens with personalized messages
        const results = await Promise.all(tokenInfos.map(info => {
            const message = formatPushMessage(info.token, amount, info.walletNickname);
            return sendPushNotification(message);
        }));
        // Check if ANY succeeded
        const anySuccess = results.some(r => r.success);
        const errors = results.filter(r => !r.success).map(r => r.error).join(', ');
        if (!anySuccess) {
            console.error('Expo Push API error(s):', errors);
            response.status(500).json({
                success: false,
                error: `Failed to send notification(s): ${errors}`,
            });
            return;
        }
        // Success response
        response.status(200).json({
            success: true,
            message: `Notification sent successfully to ${tokenInfos.length} device(s)`,
        });
    }
    catch (error) {
        // Handle unexpected errors
        console.error('Unexpected error:', error);
        response.status(500).json({
            success: false,
            error: 'An unexpected error occurred',
        });
    }
});
/**
 * NDS (Notification Delivery Service) webhook endpoint
 * Called by Breez LSP when an incoming payment is detected
 *
 * URL format: /notify?platform=android&token=<EXPO_PUSH_TOKEN>
 *
 * The Breez SDK registers this webhook URL, and when a payment arrives,
 * the LSP calls this endpoint. We then forward the notification to
 * the device via Expo Push API.
 *
 * @see https://sdk-doc-greenlight.breez.technology/notifications/setup_nds.html
 */
exports.notify = (0, https_1.onRequest)({ cors: true, region: 'europe-west3' }, async (request, response) => {
    try {
        // Only allow POST requests
        if (request.method !== 'POST') {
            response.status(405).json({
                success: false,
                error: 'Method not allowed. Use POST.',
            });
            return;
        }
        // Extract token from query params
        // URL format: /notify?platform=android&token=ExponentPushToken[xxx]
        const token = request.query.token;
        const platform = request.query.platform;
        console.log('[NDS] Webhook received:', {
            platform,
            hasToken: !!token,
            tokenPrefix: token?.substring(0, 20),
        });
        if (!token) {
            console.error('[NDS] Missing token in query params');
            response.status(400).json({
                success: false,
                error: 'Missing token query parameter',
            });
            return;
        }
        // Validate token format
        if (!token.startsWith('ExponentPushToken[')) {
            console.error('[NDS] Invalid token format:', token.substring(0, 30));
            response.status(400).json({
                success: false,
                error: 'Invalid Expo push token format',
            });
            return;
        }
        // Parse webhook body from Breez LSP
        const body = request.body;
        console.log('[NDS] Webhook body:', JSON.stringify(body));
        // Look up wallet nickname from Firestore by push token
        let walletNickname;
        try {
            const usersSnapshot = await db.collection('users')
                .where('expoPushToken', '==', token)
                .limit(1)
                .get();
            if (!usersSnapshot.empty) {
                const userData = usersSnapshot.docs[0].data();
                walletNickname = userData.walletNickname;
                console.log('[NDS] Found wallet nickname:', walletNickname);
            }
        }
        catch (lookupError) {
            console.log('[NDS] Could not look up wallet nickname:', lookupError);
            // Continue without nickname - notification will still be sent
        }
        // Handle different notification templates
        let notificationTitle = 'Payment Update';
        let notificationBody = 'You have a payment update';
        const walletInfo = walletNickname ? ` on ${walletNickname}` : '';
        // Convert millisats to sats if amount is available
        const amountSats = body.data?.amount_msat
            ? Math.floor(body.data.amount_msat / 1000)
            : undefined;
        const amountText = amountSats ? `${amountSats.toLocaleString()} sats` : '';
        if (body.template === 'payment_received') {
            notificationTitle = 'Payment Received';
            if (amountText) {
                notificationBody = `You received ${amountText}${walletInfo}!`;
            }
            else {
                notificationBody = `You have an incoming payment${walletInfo}!`;
            }
        }
        else if (body.template === 'lnurlpay_info' || body.template === 'lnurlpay_invoice') {
            notificationTitle = 'Payment Request';
            notificationBody = `Someone wants to pay you${walletInfo}`;
        }
        else {
            notificationBody = `You have a payment update${walletInfo}`;
        }
        // Send push notification
        const message = {
            to: token,
            title: notificationTitle,
            body: notificationBody,
            data: {
                type: body.template || 'unknown',
                payment_hash: body.data?.payment_hash || '',
                walletNickname: walletNickname || '',
                amount: amountSats || 0,
            },
        };
        const sendResult = await sendPushNotification(message);
        if (!sendResult.success) {
            console.error('[NDS] Failed to send push:', sendResult.error);
            response.status(500).json({
                success: false,
                error: sendResult.error,
            });
            return;
        }
        console.log('[NDS] Push notification sent successfully');
        response.status(200).json({
            success: true,
            message: 'Notification delivered',
        });
    }
    catch (error) {
        console.error('[NDS] Unexpected error:', error);
        response.status(500).json({
            success: false,
            error: 'An unexpected error occurred',
        });
    }
});
//# sourceMappingURL=index.js.map