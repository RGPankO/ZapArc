// useOfflineSync Hook
// Provides offline caching and sync status to components

import { useState, useEffect, useCallback } from 'react';
import {
  offlineCacheService,
  CachedBalance,
  CachedTransactions,
  SyncStatus,
} from '../services/offlineCacheService';
import type { Transaction } from '../features/wallet/types';

// =============================================================================
// Types
// =============================================================================

export interface OfflineSyncState {
  // Cache status
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: number;
  pendingActions: number;
  hasStaleData: boolean;
  
  // Cached data
  cachedBalance: CachedBalance | null;
  cachedTransactions: CachedTransactions | null;
}

export interface OfflineSyncActions {
  // Sync operations
  triggerSync: () => Promise<void>;
  refreshCache: () => Promise<void>;
  
  // Cache operations
  cacheBalance: (sats: number) => Promise<void>;
  cacheTransactions: (transactions: Transaction[]) => Promise<void>;
  
  // Pending actions
  queuePayment: (payload: unknown) => Promise<string>;
  getPendingCount: () => Promise<number>;
  
  // Cache management
  clearCache: () => Promise<void>;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useOfflineSync(): OfflineSyncState & OfflineSyncActions {
  // State
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(0);
  const [pendingActions, setPendingActions] = useState(0);
  const [hasStaleData, setHasStaleData] = useState(false);
  const [cachedBalance, setCachedBalance] = useState<CachedBalance | null>(null);
  const [cachedTransactions, setCachedTransactions] = useState<CachedTransactions | null>(null);

  // ========================================
  // Initialize
  // ========================================

  useEffect(() => {
    const initialize = async (): Promise<void> => {
      await offlineCacheService.initialize();
      await refreshCacheState();
    };

    initialize();

    // Subscribe to sync status changes
    const unsubscribe = offlineCacheService.addSyncListener((status: SyncStatus) => {
      setIsOnline(status.isOnline);
      setIsSyncing(status.isSyncing);
      setLastSyncTime(status.lastSyncTime);
      setPendingActions(status.pendingActions);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // ========================================
  // Refresh Cache State
  // ========================================

  const refreshCacheState = useCallback(async (): Promise<void> => {
    const [balance, transactions, stale] = await Promise.all([
      offlineCacheService.getCachedBalance(),
      offlineCacheService.getCachedTransactions(),
      offlineCacheService.hasStaleData(),
    ]);

    setCachedBalance(balance);
    setCachedTransactions(transactions);
    setHasStaleData(stale);
  }, []);

  // ========================================
  // Actions
  // ========================================

  const triggerSync = useCallback(async (): Promise<void> => {
    await offlineCacheService.triggerSync();
    await refreshCacheState();
  }, [refreshCacheState]);

  const refreshCache = useCallback(async (): Promise<void> => {
    await refreshCacheState();
  }, [refreshCacheState]);

  const cacheBalance = useCallback(async (sats: number): Promise<void> => {
    await offlineCacheService.cacheBalance(sats);
    await refreshCacheState();
  }, [refreshCacheState]);

  const cacheTransactions = useCallback(
    async (transactions: Transaction[]): Promise<void> => {
      await offlineCacheService.cacheTransactions(transactions);
      await refreshCacheState();
    },
    [refreshCacheState]
  );

  const queuePayment = useCallback(async (payload: unknown): Promise<string> => {
    const actionId = await offlineCacheService.addPendingAction({
      type: 'payment',
      payload,
    });
    
    // Try to sync immediately if online
    if (offlineCacheService.getIsOnline()) {
      await offlineCacheService.triggerSync();
    }
    
    return actionId;
  }, []);

  const getPendingCount = useCallback(async (): Promise<number> => {
    const pending = await offlineCacheService.getPendingActions();
    return pending.length;
  }, []);

  const clearCache = useCallback(async (): Promise<void> => {
    await offlineCacheService.clearCache();
    setCachedBalance(null);
    setCachedTransactions(null);
    setHasStaleData(false);
  }, []);

  // ========================================
  // Return Hook Value
  // ========================================

  return {
    // State
    isOnline,
    isSyncing,
    lastSyncTime,
    pendingActions,
    hasStaleData,
    cachedBalance,
    cachedTransactions,
    
    // Actions
    triggerSync,
    refreshCache,
    cacheBalance,
    cacheTransactions,
    queuePayment,
    getPendingCount,
    clearCache,
  };
}
