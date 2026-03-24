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

    // Primary read path: direct storage (works even if background is sleeping/restarting)
    try {
        const result = await chrome.storage.local.get(['userSettings']);
        const stored = result?.userSettings as Partial<UserSettings> | undefined;
        if (stored?.fiatCurrency === 'usd' || stored?.fiatCurrency === 'eur') {
            _cached = stored.fiatCurrency;
            return _cached;
        }
    } catch (error) {
        console.warn('[CurrencyPref] Direct storage read failed:', error);
    }

    // Fallback read path: background messaging
    try {
        const response = await ExtensionMessaging.getUserSettings();
        if (response.success && response.data) {
            _cached = (response.data as UserSettings).fiatCurrency || 'usd';
            return _cached;
        }
    } catch (error) {
        console.warn('[CurrencyPref] Failed to read fiat currency via messaging:', error);
    }

    return 'usd';
}

/** Persist fiat currency to canonical userSettings object in storage. */
export async function persistFiatCurrency(currency: FiatCurrency): Promise<void> {
    const result = await chrome.storage.local.get(['userSettings']);
    const existing = (result?.userSettings || {}) as Partial<UserSettings>;
    await chrome.storage.local.set({
        userSettings: {
            ...existing,
            fiatCurrency: currency
        }
    });
    _cached = currency;
}

/**
 * Set the in-memory cache. Call this immediately after saving the new preference
 * so all modules see the update without waiting for storage.
 * Pass null to clear the cache (forces re-read from storage on next access).
 */
export function setFiatCurrencyCache(currency: FiatCurrency | null): void {
    _cached = currency;
}
