/**
 * Shared fiat currency preference reader.
 * Single source of truth for the current fiat currency across all popup modules.
 *
 * Uses an in-memory cache so that after saveFiatCurrency() updates the value,
 * all modules (popup.ts, deposit.ts, withdrawal.ts) immediately see the new
 * currency without waiting for a background storage round-trip.
 */

import type { FiatCurrency } from '../utils/currency';
import { ExtensionMessaging } from '../utils/messaging';
import type { UserSettings } from '../types';

let _cached: FiatCurrency | null = null;

/**
 * Get the user's selected fiat currency.
 * Returns the in-memory cached value if available, otherwise reads from storage.
 */
export async function getUserFiatCurrency(): Promise<FiatCurrency> {
    if (_cached) return _cached;
    try {
        const response = await ExtensionMessaging.getUserSettings();
        if (response.success && response.data) {
            _cached = (response.data as UserSettings).fiatCurrency || 'usd';
            return _cached;
        }
    } catch (error) {
        console.warn('[CurrencyPref] Failed to read fiat currency:', error);
    }
    return 'usd';
}

/**
 * Set the in-memory cache. Call this immediately after saving the new preference
 * so all modules see the update without waiting for storage.
 * Pass null to clear the cache (forces re-read from storage on next access).
 */
export function setFiatCurrencyCache(currency: FiatCurrency | null): void {
    _cached = currency;
}
