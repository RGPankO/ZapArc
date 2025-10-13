// Blacklist Manager for Lightning Network Tipping Extension
// Handles LNURL blacklist operations, storage, and UI management

import { BlacklistData } from '../types';
import { ChromeStorageManager } from './storage';
import { ExtensionMessaging } from './messaging';

export interface BlacklistEntry {
  lnurl: string;
  dateAdded: number;
  reason?: string;
  domain?: string;
}

export interface BlacklistStats {
  totalBlocked: number;
  recentlyAdded: number;
  topDomains: { domain: string; count: number }[];
}

export class BlacklistManager {
  private storage: ChromeStorageManager;
  private blacklistedLnurls = new Set<string>();
  private blacklistEntries: BlacklistEntry[] = [];

  constructor() {
    this.storage = new ChromeStorageManager();
    this.loadBlacklist();
  }

  /**
   * Load blacklist from storage
   */
  async loadBlacklist(): Promise<void> {
    try {
      const blacklistData = await this.storage.getBlacklist();
      this.blacklistedLnurls = new Set(blacklistData.lnurls);
      
      // Convert simple array to detailed entries if needed
      this.blacklistEntries = blacklistData.lnurls.map(lnurl => ({
        lnurl,
        dateAdded: blacklistData.lastUpdated || Date.now()
      }));

      console.log(`Loaded ${this.blacklistedLnurls.size} blacklisted LNURLs`);
    } catch (error) {
      console.error('Failed to load blacklist:', error);
    }
  }

  /**
   * Check if LNURL is blacklisted
   */
  isBlacklisted(lnurl: string): boolean {
    return this.blacklistedLnurls.has(lnurl);
  }

  /**
   * Add LNURL to blacklist
   */
  async addToBlacklist(lnurl: string, reason?: string): Promise<void> {
    try {
      if (this.blacklistedLnurls.has(lnurl)) {
        console.log('LNURL already blacklisted:', lnurl);
        return;
      }

      // Add to local sets
      this.blacklistedLnurls.add(lnurl);
      
      // Create detailed entry
      const entry: BlacklistEntry = {
        lnurl,
        dateAdded: Date.now(),
        reason,
        domain: this.extractDomainFromLnurl(lnurl)
      };
      
      this.blacklistEntries.push(entry);

      // Save to storage
      await this.saveBlacklist();

      console.log('Added LNURL to blacklist:', lnurl);
    } catch (error) {
      console.error('Failed to add LNURL to blacklist:', error);
      throw new Error(`Failed to blacklist LNURL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Remove LNURL from blacklist
   */
  async removeFromBlacklist(lnurl: string): Promise<void> {
    try {
      if (!this.blacklistedLnurls.has(lnurl)) {
        console.log('LNURL not in blacklist:', lnurl);
        return;
      }

      // Remove from local sets
      this.blacklistedLnurls.delete(lnurl);
      this.blacklistEntries = this.blacklistEntries.filter(entry => entry.lnurl !== lnurl);

      // Save to storage
      await this.saveBlacklist();

      console.log('Removed LNURL from blacklist:', lnurl);
    } catch (error) {
      console.error('Failed to remove LNURL from blacklist:', error);
      throw new Error(`Failed to unblock LNURL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all blacklisted LNURLs
   */
  getBlacklistedLnurls(): string[] {
    return Array.from(this.blacklistedLnurls);
  }

  /**
   * Get detailed blacklist entries
   */
  getBlacklistEntries(): BlacklistEntry[] {
    return [...this.blacklistEntries];
  }

  /**
   * Clear entire blacklist
   */
  async clearBlacklist(): Promise<void> {
    try {
      this.blacklistedLnurls.clear();
      this.blacklistEntries = [];
      await this.saveBlacklist();
      console.log('Blacklist cleared');
    } catch (error) {
      console.error('Failed to clear blacklist:', error);
      throw new Error(`Failed to clear blacklist: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get blacklist statistics
   */
  getBlacklistStats(): BlacklistStats {
    const now = Date.now();
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
    
    const recentlyAdded = this.blacklistEntries.filter(
      entry => entry.dateAdded > oneWeekAgo
    ).length;

    // Count domains
    const domainCounts = new Map<string, number>();
    this.blacklistEntries.forEach(entry => {
      if (entry.domain) {
        domainCounts.set(entry.domain, (domainCounts.get(entry.domain) || 0) + 1);
      }
    });

    const topDomains = Array.from(domainCounts.entries())
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalBlocked: this.blacklistedLnurls.size,
      recentlyAdded,
      topDomains
    };
  }

  /**
   * Find blacklisted LNURLs on current page
   */
  findBlacklistedOnPage(pageContent: string): string[] {
    const found: string[] = [];
    const tipRegex = /\[lntip:lnurl:([^:]+):(\d+):(\d+):(\d+)\]/g;
    
    let match;
    while ((match = tipRegex.exec(pageContent)) !== null) {
      const lnurl = match[1];
      if (this.isBlacklisted(lnurl)) {
        found.push(lnurl);
      }
    }

    return found;
  }

  /**
   * Export blacklist for backup
   */
  exportBlacklist(): string {
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      entries: this.blacklistEntries
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import blacklist from backup
   */
  async importBlacklist(importData: string): Promise<{ imported: number; skipped: number }> {
    try {
      const data = JSON.parse(importData);
      
      if (!data.entries || !Array.isArray(data.entries)) {
        throw new Error('Invalid import format');
      }

      let imported = 0;
      let skipped = 0;

      for (const entry of data.entries) {
        if (entry.lnurl && !this.blacklistedLnurls.has(entry.lnurl)) {
          await this.addToBlacklist(entry.lnurl, entry.reason || 'Imported');
          imported++;
        } else {
          skipped++;
        }
      }

      return { imported, skipped };
    } catch (error) {
      console.error('Failed to import blacklist:', error);
      throw new Error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Bulk operations
   */
  async bulkAdd(lnurls: string[], reason?: string): Promise<{ added: number; skipped: number }> {
    let added = 0;
    let skipped = 0;

    for (const lnurl of lnurls) {
      try {
        if (!this.blacklistedLnurls.has(lnurl)) {
          await this.addToBlacklist(lnurl, reason);
          added++;
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`Failed to add ${lnurl} to blacklist:`, error);
        skipped++;
      }
    }

    return { added, skipped };
  }

  async bulkRemove(lnurls: string[]): Promise<{ removed: number; notFound: number }> {
    let removed = 0;
    let notFound = 0;

    for (const lnurl of lnurls) {
      try {
        if (this.blacklistedLnurls.has(lnurl)) {
          await this.removeFromBlacklist(lnurl);
          removed++;
        } else {
          notFound++;
        }
      } catch (error) {
        console.error(`Failed to remove ${lnurl} from blacklist:`, error);
        notFound++;
      }
    }

    return { removed, notFound };
  }

  /**
   * Create blacklist indicator UI element
   */
  createBlacklistIndicator(blacklistedCount: number): HTMLElement {
    const indicator = document.createElement('div');
    indicator.className = 'lightning-blacklist-indicator';
    indicator.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #ff5722;
      color: white;
      padding: 8px 12px;
      border-radius: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px;
      font-weight: bold;
      cursor: pointer;
      z-index: 10000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      transition: transform 0.2s ease;
    `;

    indicator.innerHTML = `
      <span>🚫 ${blacklistedCount} blocked tip${blacklistedCount !== 1 ? 's' : ''}</span>
    `;

    // Hover effect
    indicator.addEventListener('mouseenter', () => {
      indicator.style.transform = 'scale(1.05)';
    });

    indicator.addEventListener('mouseleave', () => {
      indicator.style.transform = 'scale(1)';
    });

    // Click to show details
    indicator.addEventListener('click', () => {
      this.showBlacklistDetails();
    });

    return indicator;
  }

  /**
   * Show blacklist details modal
   */
  private showBlacklistDetails(): void {
    const modal = document.createElement('div');
    modal.className = 'lightning-blacklist-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      z-index: 10001;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    const blacklistedOnPage = this.findBlacklistedOnPage(document.body.textContent || '');
    
    modal.innerHTML = `
      <div style="
        background: white;
        border-radius: 8px;
        padding: 20px;
        max-width: 500px;
        max-height: 80vh;
        overflow-y: auto;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3 style="margin: 0; color: #333;">Blocked Tips on This Page</h3>
          <button class="close-modal" style="background: none; border: none; font-size: 20px; cursor: pointer;">×</button>
        </div>
        
        <div style="margin-bottom: 16px; color: #666;">
          Found ${blacklistedOnPage.length} blocked tip request${blacklistedOnPage.length !== 1 ? 's' : ''} on this page.
        </div>
        
        <div class="blacklisted-list" style="max-height: 300px; overflow-y: auto;">
          ${blacklistedOnPage.map(lnurl => `
            <div style="
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 8px;
              border: 1px solid #eee;
              border-radius: 4px;
              margin-bottom: 8px;
            ">
              <span style="font-family: monospace; font-size: 12px; color: #666; flex: 1; margin-right: 8px;">
                ${lnurl.substring(0, 30)}...
              </span>
              <button class="unblock-btn" data-lnurl="${lnurl}" style="
                padding: 4px 8px;
                border: 1px solid #4CAF50;
                border-radius: 4px;
                background: white;
                color: #4CAF50;
                cursor: pointer;
                font-size: 12px;
              ">Unblock</button>
            </div>
          `).join('')}
        </div>
        
        <div style="margin-top: 16px; text-align: center;">
          <button class="manage-blacklist-btn" style="
            padding: 8px 16px;
            border: 1px solid #2196F3;
            border-radius: 4px;
            background: white;
            color: #2196F3;
            cursor: pointer;
            font-size: 14px;
          ">Manage Blacklist</button>
        </div>
      </div>
    `;

    // Add event listeners
    modal.querySelector('.close-modal')?.addEventListener('click', () => {
      modal.remove();
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    // Unblock buttons
    modal.querySelectorAll('.unblock-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const lnurl = btn.getAttribute('data-lnurl');
        if (lnurl) {
          try {
            await this.removeFromBlacklist(lnurl);
            modal.remove();
            // Refresh page to show unblocked tips
            window.location.reload();
          } catch (error) {
            console.error('Failed to unblock LNURL:', error);
          }
        }
      });
    });

    // Manage blacklist button
    modal.querySelector('.manage-blacklist-btn')?.addEventListener('click', () => {
      // Open settings page
      chrome.runtime.sendMessage({ type: 'OPEN_SETTINGS' });
      modal.remove();
    });

    document.body.appendChild(modal);
  }

  /**
   * Save blacklist to storage
   */
  private async saveBlacklist(): Promise<void> {
    try {
      const blacklistArray = Array.from(this.blacklistedLnurls);
      await this.storage.saveBlacklist(blacklistArray);
    } catch (error) {
      console.error('Failed to save blacklist:', error);
      throw error;
    }
  }

  /**
   * Extract domain from LNURL (if possible)
   */
  private extractDomainFromLnurl(lnurl: string): string | undefined {
    try {
      // This is a simplified extraction - LNURL is bech32 encoded
      // In a real implementation, you'd decode the LNURL to get the actual URL
      return 'unknown';
    } catch (error) {
      return undefined;
    }
  }
}