/**
 * Input validation module for notification requests
 */
import type { ValidationResult } from './types.js';
/**
 * Validates the notification request parameters
 *
 * @param expoPushToken - The Expo push token (must be non-empty string)
 * @param amount - The payment amount in sats (must be positive number)
 * @returns Validation result with success status and optional error message
 */
export declare function validateRequest(expoPushToken: unknown, amount: unknown): ValidationResult;
//# sourceMappingURL=validation.d.ts.map