// Offline Cache Service
// Handles caching of wallet data for offline access

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import type { Transaction } from '../features/wallet/types';

// =============================================================================
// Types
// =============================================================================

export interface CachedBalance {
  sats: number;
  timestamp: number;
  isStale: boolean;
}

export interface CachedTransactions {
  transactions: Transaction[];
  timestamp: number;
  isStale: boolean;
}

export interface SyncStatus {
  lastSyncTime: number;
  isSyncing: boolean;
  isOnline: boolean;
  pendingActions: number;
  error: string | null;
}

export interface PendingAction {
  id: string;
  type: 'payment' | 'settings_update';
  payload: unknown;
  createdAt: number;
  retryCount: number;
}

// =============================================================================
// Constants
// =============================================================================

const STORAGE_KEYS = {
  CACHED_BALANCE: 'zap_arc_cached_balance',
  CACHED_TRANSACTIONS: 'zap_arc_cached_transactions',
  LAST_SYNC_TIME: 'zap_arc_last_sync_time',
  PENDING_ACTIONS: 'zap_arc_pending_actions',
} as const;

// Data is considered stale after 5 minutes
const STALE_THRESHOLD_MS = 5 * 60 * 1000;

// Maximum pending actions to store
const MAX_PENDING_ACTIONS = 100;

// =============================================================================
// Cache Service Class
// =============================================================================

class OfflineCacheService {
  private syncListeners: Set<(status: SyncStatus) => void> = new Set();
  private isOnline: boolean = true;
  private isSyncing: boolean = false;
  private unsubscribeNetInfo: (() => void) | null = null;

  // ========================================
  // Initialization
  // ========================================

  async initialize(): Promise<void> {
    console.log('📦 [OfflineCache] Initializing...');

    // Subscribe to network state changes
    this.unsubscribeNetInfo = NetInfo.addEventListener((state: NetInfoState) => {
      this.handleConnectivityChange(state.isConnected ?? false);
    });

    // Check initial network state
    const netState = await NetInfo.fetch();
    this.isOnline = netState.isConnected ?? true;

    console.log('📦 [OfflineCache] Initialized, online:', this.isOnline);
  }

  destroy(): void {
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
      this.unsubscribeNetInfo = null;
    }
    this.syncListeners.clear();
  }

  // ========================================
  // Connectivity Handling
  // ========================================

  private async handleConnectivityChange(isConnected: boolean): Promise<void> {
    const wasOffline = !this.isOnline;
    this.isOnline = isConnected;

    console.log('📶 [OfflineCache] Connectivity changed:', isConnected);

    // Notify listeners
    this.notifySyncListeners();

    // Auto-sync when coming back online
    if (wasOffline && isConnected) {
      console.log('📶 [OfflineCache] Back online, triggering sync...');
      await this.triggerSync();
    }
  }

  getIsOnline(): boolean {
    return this.isOnline;
  }

  // ========================================
  // Balance Caching
  // ========================================

  async cacheBalance(sats: number): Promise<void> {
    try {
      const cached: CachedBalance = {
        sats,
        timestamp: Date.now(),
        isStale: false,
      };

      await AsyncStorage.setItem(
        STORAGE_KEYS.CACHED_BALANCE,
        JSON.stringify(cached)
      );

      console.log('💾 [OfflineCache] Balance cached:', sats);
    } catch (error) {
      console.error('❌ [OfflineCache] Failed to cache balance:', error);
    }
  }

  async getCachedBalance(): Promise<CachedBalance | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_BALANCE);
      if (!data) return null;

      const cached: CachedBalance = JSON.parse(data);
      
      // Check if stale
      const age = Date.now() - cached.timestamp;
      cached.isStale = age > STALE_THRESHOLD_MS;

      return cached;
    } catch (error) {
      console.error('❌ [OfflineCache] Failed to get cached balance:', error);
      return null;
    }
  }

  // ========================================
  // Transaction Caching
  // ========================================

  async cacheTransactions(transactions: Transaction[]): Promise<void> {
    try {
      const cached: CachedTransactions = {
        transactions,
        timestamp: Date.now(),
        isStale: false,
      };

      await AsyncStorage.setItem(
        STORAGE_KEYS.CACHED_TRANSACTIONS,
        JSON.stringify(cached)
      );

      console.log('💾 [OfflineCache] Transactions cached:', transactions.length);
    } catch (error) {
      console.error('❌ [OfflineCache] Failed to cache transactions:', error);
    }
  }

  async getCachedTransactions(): Promise<CachedTransactions | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_TRANSACTIONS);
      if (!data) return null;

      const cached: CachedTransactions = JSON.parse(data);
      
      // Check if stale
      const age = Date.now() - cached.timestamp;
      cached.isStale = age > STALE_THRESHOLD_MS;

      return cached;
    } catch (error) {
      console.error('❌ [OfflineCache] Failed to get cached transactions:', error);
      return null;
    }
  }

  // ========================================
  // Pending Actions (for offline payments)
  // ========================================

  async addPendingAction(action: Omit<PendingAction, 'id' | 'createdAt' | 'retryCount'>): Promise<string> {
    try {
      const pending = await this.getPendingActions();
      
      const newAction: PendingAction = {
        ...action,
        id: `action_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        createdAt: Date.now(),
        retryCount: 0,
      };

      // Limit pending actions
      const updatedPending = [...pending, newAction].slice(-MAX_PENDING_ACTIONS);

      await AsyncStorage.setItem(
        STORAGE_KEYS.PENDING_ACTIONS,
        JSON.stringify(updatedPending)
      );

      console.log('📋 [OfflineCache] Pending action added:', newAction.id);
      this.notifySyncListeners();

      return newAction.id;
    } catch (error) {
      console.error('❌ [OfflineCache] Failed to add pending action:', error);
      throw error;
    }
  }

  async getPendingActions(): Promise<PendingAction[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_ACTIONS);
      if (!data) return [];
      return JSON.parse(data);
    } catch (error) {
      console.error('❌ [OfflineCache] Failed to get pending actions:', error);
      return [];
    }
  }

  async removePendingAction(actionId: string): Promise<void> {
    try {
      const pending = await this.getPendingActions();
      const updated = pending.filter((a) => a.id !== actionId);

      await AsyncStorage.setItem(
        STORAGE_KEYS.PENDING_ACTIONS,
        JSON.stringify(updated)
      );

      console.log('✅ [OfflineCache] Pending action removed:', actionId);
      this.notifySyncListeners();
    } catch (error) {
      console.error('❌ [OfflineCache] Failed to remove pending action:', error);
    }
  }

  async incrementRetryCount(actionId: string): Promise<void> {
    try {
      const pending = await this.getPendingActions();
      const updated = pending.map((a) =>
        a.id === actionId ? { ...a, retryCount: a.retryCount + 1 } : a
      );

      await AsyncStorage.setItem(
        STORAGE_KEYS.PENDING_ACTIONS,
        JSON.stringify(updated)
      );
    } catch (error) {
      console.error('❌ [OfflineCache] Failed to increment retry count:', error);
    }
  }

  // ========================================
  // Sync Management
  // ========================================

  async triggerSync(): Promise<void> {
    if (this.isSyncing) {
      console.log('🔄 [OfflineCache] Sync already in progress');
      return;
    }

    if (!this.isOnline) {
      console.log('📴 [OfflineCache] Cannot sync while offline');
      return;
    }

    this.isSyncing = true;
    this.notifySyncListeners();

    try {
      console.log('🔄 [OfflineCache] Starting sync...');

      // Process pending actions
      await this.processPendingActions();

      // Update last sync time
      await AsyncStorage.setItem(
        STORAGE_KEYS.LAST_SYNC_TIME,
        Date.now().toString()
      );

      console.log('✅ [OfflineCache] Sync complete');
    } catch (error) {
      console.error('❌ [OfflineCache] Sync failed:', error);
    } finally {
      this.isSyncing = false;
      this.notifySyncListeners();
    }
  }

  private async processPendingActions(): Promise<void> {
    const pending = await this.getPendingActions();
    
    if (pending.length === 0) {
      console.log('📋 [OfflineCache] No pending actions to process');
      return;
    }

    console.log('📋 [OfflineCache] Processing', pending.length, 'pending actions');

    for (const action of pending) {
      try {
        // Skip actions with too many retries
        if (action.retryCount >= 3) {
          console.log('⚠️ [OfflineCache] Skipping action after 3 retries:', action.id);
          continue;
        }

        // Process based on action type
        switch (action.type) {
          case 'payment':
            // TODO: Implement payment retry logic with Breez SDK
            console.log('💸 [OfflineCache] Processing pending payment:', action.id);
            break;
          case 'settings_update':
            // Settings are already persisted locally
            console.log('⚙️ [OfflineCache] Settings update already persisted:', action.id);
            break;
        }

        // Remove successful action
        await this.removePendingAction(action.id);
      } catch (error) {
        console.error('❌ [OfflineCache] Failed to process action:', action.id, error);
        await this.incrementRetryCount(action.id);
      }
    }
  }

  async getLastSyncTime(): Promise<number> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC_TIME);
      return data ? parseInt(data, 10) : 0;
    } catch {
      return 0;
    }
  }

  async getSyncStatus(): Promise<SyncStatus> {
    const [lastSyncTime, pending] = await Promise.all([
      this.getLastSyncTime(),
      this.getPendingActions(),
    ]);

    return {
      lastSyncTime,
      isSyncing: this.isSyncing,
      isOnline: this.isOnline,
      pendingActions: pending.length,
      error: null,
    };
  }

  // ========================================
  // Sync Listeners
  // ========================================

  addSyncListener(listener: (status: SyncStatus) => void): () => void {
    this.syncListeners.add(listener);
    
    // Immediately notify with current status
    this.getSyncStatus().then(listener);

    return () => {
      this.syncListeners.delete(listener);
    };
  }

  private async notifySyncListeners(): Promise<void> {
    const status = await this.getSyncStatus();
    this.syncListeners.forEach((listener) => listener(status));
  }

  // ========================================
  // Clear Cache
  // ========================================

  async clearCache(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.CACHED_BALANCE,
        STORAGE_KEYS.CACHED_TRANSACTIONS,
        STORAGE_KEYS.LAST_SYNC_TIME,
        STORAGE_KEYS.PENDING_ACTIONS,
      ]);
      console.log('🗑️ [OfflineCache] Cache cleared');
    } catch (error) {
      console.error('❌ [OfflineCache] Failed to clear cache:', error);
    }
  }

  // ========================================
  // Stale Data Check
  // ========================================

  async hasStaleData(): Promise<boolean> {
    const [balance, transactions] = await Promise.all([
      this.getCachedBalance(),
      this.getCachedTransactions(),
    ]);

    return (balance?.isStale ?? false) || (transactions?.isStale ?? false);
  }

  getStaleThreshold(): number {
    return STALE_THRESHOLD_MS;
  }
}

// =============================================================================
// Export Singleton
// =============================================================================

export const offlineCacheService = new OfflineCacheService();
