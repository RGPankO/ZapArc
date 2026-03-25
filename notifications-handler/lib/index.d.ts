/**
 * Firebase Cloud Function for sending Expo push notifications
 * for Lightning wallet transactions
 */
/**
 * Registers a user's push token mapped to their Public Key (Node ID)
 */
export declare const registerDevice: import("firebase-functions/v2/https").HttpsFunction;
/**
 * HTTP-triggered Cloud Function that sends transaction notifications
 */
export declare const sendTransactionNotification: import("firebase-functions/v2/https").HttpsFunction;
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
export declare const notify: import("firebase-functions/v2/https").HttpsFunction;
//# sourceMappingURL=index.d.ts.map