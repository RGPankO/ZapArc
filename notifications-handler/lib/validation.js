"use strict";
/**
 * Input validation module for notification requests
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = validateRequest;
/**
 * Validates the notification request parameters
 *
 * @param expoPushToken - The Expo push token (must be non-empty string)
 * @param amount - The payment amount in sats (must be positive number)
 * @returns Validation result with success status and optional error message
 */
function validateRequest(expoPushToken, amount) {
    // Check expoPushToken is present and non-empty string
    if (expoPushToken === undefined || expoPushToken === null) {
        return {
            valid: false,
            error: 'Missing required parameter: expoPushToken',
        };
    }
    if (typeof expoPushToken !== 'string') {
        return {
            valid: false,
            error: 'Invalid expoPushToken: must be a string',
        };
    }
    if (expoPushToken.trim() === '') {
        return {
            valid: false,
            error: 'Invalid expoPushToken: must be a non-empty string',
        };
    }
    // Check amount is present
    if (amount === undefined || amount === null) {
        return {
            valid: false,
            error: 'Missing required parameter: amount',
        };
    }
    // Check amount is a number
    if (typeof amount !== 'number' || Number.isNaN(amount)) {
        return {
            valid: false,
            error: 'Invalid amount: must be a number',
        };
    }
    // Check amount is positive
    if (amount <= 0) {
        return {
            valid: false,
            error: 'Invalid amount: must be a positive number',
        };
    }
    return { valid: true };
}
//# sourceMappingURL=validation.js.map