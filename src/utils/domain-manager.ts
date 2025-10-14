// Domain Manager for Lightning Network Tipping Extension
// Handles domain whitelist/blacklist management and status tracking

import { DomainSettings, DomainStatus } from '../types';
import { ChromeStorageManager } from './storage';

export interface DomainInfo {
  domain: string;
  status: DomainStatus;
  dateAdded: number;
  postCount?: number;
  lastActivity?: number;
}

export interface DomainStats {
  totalDomains: number;
  whitelistedCount: number;
  disabledCount: number;
  unmanagedCount: number;
  recentlyActive: DomainInfo[];
}

export class DomainManager {
  private storage: ChromeStorageManager;
  private domainSettings: DomainSettings = {};
  private currentDomain: string;

  constructor() {
    this.storage = new ChromeStorageManager();
    this.currentDomain = this.extractDomain(window.location.hostname);
    this.initializeDomainManager();
  }

  /**
   * Initialize domain manager
   */
  private async initializeDomainManager(): Promise<void> {
    await this.loadDomainSettings();
  }

  /**
   * Load domain settings from storage
   */
  async loadDomainSettings(): Promise<void> {
    try {
      this.domainSettings = await this.storage.getDomainSettings();
      console.log(`Loaded settings for ${Object.keys(this.domainSettings).length} domains`);
    } catch (error) {
      console.error('Failed to load domain settings:', error);
    }
  }

  /**
   * Get current domain
   */
  getCurrentDomain(): string {
    return this.currentDomain;
  }

  /**
   * Get domain status
   */
  getDomainStatus(domain?: string): DomainStatus {
    const targetDomain = domain || this.currentDomain;
    return this.domainSettings[targetDomain] || DomainStatus.UNMANAGED;
  }

  /**
   * Set domain status
   */
  async setDomainStatus(domain: string, status: DomainStatus): Promise<void> {
    try {
      this.domainSettings[domain] = status;
      await this.storage.saveDomainSettings(domain, status);
      console.log(`Set domain ${domain} to ${status}`);
    } catch (error) {
      console.error('Failed to set domain status:', error);
      throw new Error(`Failed to update domain status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Enable tipping for domain (whitelist)
   */
  async enableDomain(domain?: string): Promise<void> {
    const targetDomain = domain || this.currentDomain;
    await this.setDomainStatus(targetDomain, DomainStatus.WHITELISTED);
  }

  /**
   * Disable tipping for domain
   */
  async disableDomain(domain?: string): Promise<void> {
    const targetDomain = domain || this.currentDomain;
    await this.setDomainStatus(targetDomain, DomainStatus.DISABLED);
  }

  /**
   * Remove domain from management (set to unmanaged)
   */
  async unmanageDomain(domain?: string): Promise<void> {
    const targetDomain = domain || this.currentDomain;
    delete this.domainSettings[targetDomain];
    
    // Remove from storage by setting all domains except this one
    const remainingDomains = Object.entries(this.domainSettings);
    for (const [d, status] of remainingDomains) {
      await this.storage.saveDomainSettings(d, status);
    }
    
    console.log(`Removed domain ${targetDomain} from management`);
  }

  /**
   * Check if domain allows tipping
   */
  isDomainEnabled(domain?: string): boolean {
    const status = this.getDomainStatus(domain);
    return status === DomainStatus.WHITELISTED;
  }

  /**
   * Check if domain is explicitly disabled
   */
  isDomainDisabled(domain?: string): boolean {
    const status = this.getDomainStatus(domain);
    return status === DomainStatus.DISABLED;
  }

  /**
   * Check if domain is unmanaged
   */
  isDomainUnmanaged(domain?: string): boolean {
    const status = this.getDomainStatus(domain);
    return status === DomainStatus.UNMANAGED;
  }

  /**
   * Get all managed domains
   */
  getManagedDomains(): DomainInfo[] {
    return Object.entries(this.domainSettings).map(([domain, status]) => ({
      domain,
      status,
      dateAdded: Date.now() // TODO: Track actual date added
    }));
  }

  /**
   * Get domain statistics
   */
  getDomainStats(): DomainStats {
    const domains = this.getManagedDomains();
    
    return {
      totalDomains: domains.length,
      whitelistedCount: domains.filter(d => d.status === DomainStatus.WHITELISTED).length,
      disabledCount: domains.filter(d => d.status === DomainStatus.DISABLED).length,
      unmanagedCount: 0, // Unmanaged domains aren't tracked
      recentlyActive: domains.slice(-5) // Last 5 domains
    };
  }

  /**
   * Create domain status indicator UI
   */
  createDomainStatusIndicator(): HTMLElement {
    const status = this.getDomainStatus();
    const indicator = document.createElement('div');
    indicator.className = 'lightning-domain-indicator';
    
    const colors = {
      [DomainStatus.WHITELISTED]: '#4CAF50', // Green
      [DomainStatus.DISABLED]: '#f44336',    // Red
      [DomainStatus.UNMANAGED]: '#9E9E9E'    // Gray
    };

    const labels = {
      [DomainStatus.WHITELISTED]: 'Tipping Enabled',
      [DomainStatus.DISABLED]: 'Tipping Disabled',
      [DomainStatus.UNMANAGED]: 'Unmanaged Domain'
    };

    indicator.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      background: ${colors[status]};
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px;
      font-weight: bold;
      cursor: pointer;
      z-index: 10000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      transition: all 0.2s ease;
    `;

    indicator.innerHTML = `
      <div style="display: flex; align-items: center; gap: 6px;">
        <span style="width: 8px; height: 8px; border-radius: 50%; background: white; opacity: 0.8;"></span>
        <span>${labels[status]}</span>
      </div>
    `;

    // Hover effect
    indicator.addEventListener('mouseenter', () => {
      indicator.style.transform = 'scale(1.05)';
      indicator.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
    });

    indicator.addEventListener('mouseleave', () => {
      indicator.style.transform = 'scale(1)';
      indicator.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
    });

    // Click to show management options
    indicator.addEventListener('click', () => {
      this.showDomainManagementModal();
    });

    return indicator;
  }

  /**
   * Show domain management modal
   */
  private showDomainManagementModal(): void {
    const modal = document.createElement('div');
    modal.className = 'lightning-domain-modal';
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

    const currentStatus = this.getDomainStatus();
    const domain = this.currentDomain;

    modal.innerHTML = `
      <div style="
        background: white;
        border-radius: 8px;
        padding: 24px;
        max-width: 400px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h3 style="margin: 0; color: #333;">Domain Settings</h3>
          <button class="close-modal" style="background: none; border: none; font-size: 20px; cursor: pointer;">×</button>
        </div>
        
        <div style="margin-bottom: 16px;">
          <strong>Domain:</strong> ${domain}
        </div>
        
        <div style="margin-bottom: 20px;">
          <strong>Current Status:</strong> 
          <span style="color: ${this.getStatusColor(currentStatus)}; font-weight: bold;">
            ${this.getStatusLabel(currentStatus)}
          </span>
        </div>
        
        <div style="margin-bottom: 20px;">
          <p style="color: #666; font-size: 14px; margin: 0;">
            ${this.getStatusDescription(currentStatus)}
          </p>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${currentStatus !== DomainStatus.WHITELISTED ? `
            <button class="enable-btn" style="
              padding: 10px 16px;
              border: 1px solid #4CAF50;
              border-radius: 4px;
              background: #4CAF50;
              color: white;
              cursor: pointer;
              font-size: 14px;
            ">Enable Tipping</button>
          ` : ''}
          
          ${currentStatus !== DomainStatus.DISABLED ? `
            <button class="disable-btn" style="
              padding: 10px 16px;
              border: 1px solid #f44336;
              border-radius: 4px;
              background: white;
              color: #f44336;
              cursor: pointer;
              font-size: 14px;
            ">Disable Tipping</button>
          ` : ''}
          
          ${currentStatus !== DomainStatus.UNMANAGED ? `
            <button class="unmanage-btn" style="
              padding: 10px 16px;
              border: 1px solid #9E9E9E;
              border-radius: 4px;
              background: white;
              color: #9E9E9E;
              cursor: pointer;
              font-size: 14px;
            ">Remove from Management</button>
          ` : ''}
        </div>
        
        <div style="margin-top: 16px; text-align: center;">
          <button class="manage-all-btn" style="
            padding: 8px 16px;
            border: 1px solid #2196F3;
            border-radius: 4px;
            background: white;
            color: #2196F3;
            cursor: pointer;
            font-size: 12px;
          ">Manage All Domains</button>
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

    // Action buttons
    modal.querySelector('.enable-btn')?.addEventListener('click', async () => {
      try {
        await this.enableDomain();
        modal.remove();
        this.showStatusMessage('Tipping enabled for this domain', 'success');
        // Refresh indicator immediately
        this.updateDomainIndicator();
      } catch (error) {
        console.error('Failed to enable domain:', error);
        this.showStatusMessage('Failed to enable tipping', 'error');
      }
    });

    modal.querySelector('.disable-btn')?.addEventListener('click', async () => {
      try {
        await this.disableDomain();
        modal.remove();
        this.showStatusMessage('Tipping disabled for this domain', 'success');
        // Refresh indicator immediately
        this.updateDomainIndicator();
      } catch (error) {
        console.error('Failed to disable domain:', error);
        this.showStatusMessage('Failed to disable tipping', 'error');
      }
    });

    modal.querySelector('.unmanage-btn')?.addEventListener('click', async () => {
      try {
        await this.unmanageDomain();
        modal.remove();
        this.showStatusMessage('Domain removed from management', 'success');
        // Refresh indicator immediately
        this.updateDomainIndicator();
      } catch (error) {
        console.error('Failed to unmanage domain:', error);
        this.showStatusMessage('Failed to remove domain', 'error');
      }
    });

    modal.querySelector('.manage-all-btn')?.addEventListener('click', () => {
      // Open settings page
      chrome.runtime.sendMessage({ type: 'OPEN_SETTINGS' });
      modal.remove();
    });

    document.body.appendChild(modal);
  }

  /**
   * Update domain indicator
   */
  updateDomainIndicator(): void {
    const existing = document.querySelector('.lightning-domain-indicator');
    if (existing) {
      existing.remove();
    }
    
    const newIndicator = this.createDomainStatusIndicator();
    document.body.appendChild(newIndicator);
  }

  /**
   * Get status color
   */
  private getStatusColor(status: DomainStatus): string {
    const colors = {
      [DomainStatus.WHITELISTED]: '#4CAF50',
      [DomainStatus.DISABLED]: '#f44336',
      [DomainStatus.UNMANAGED]: '#9E9E9E'
    };
    return colors[status];
  }

  /**
   * Get status label
   */
  private getStatusLabel(status: DomainStatus): string {
    const labels = {
      [DomainStatus.WHITELISTED]: 'Enabled',
      [DomainStatus.DISABLED]: 'Disabled',
      [DomainStatus.UNMANAGED]: 'Unmanaged'
    };
    return labels[status];
  }

  /**
   * Get status description
   */
  private getStatusDescription(status: DomainStatus): string {
    const descriptions = {
      [DomainStatus.WHITELISTED]: 'Tip requests will be automatically appended to your posts on this domain.',
      [DomainStatus.DISABLED]: 'Tip request appending is disabled for this domain.',
      [DomainStatus.UNMANAGED]: 'This domain has no specific tipping configuration.'
    };
    return descriptions[status];
  }

  /**
   * Show status message
   */
  private showStatusMessage(message: string, type: 'success' | 'error' | 'info'): void {
    const messageEl = document.createElement('div');
    messageEl.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 16px;
      border-radius: 4px;
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      z-index: 10002;
      max-width: 300px;
      background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
    `;
    messageEl.textContent = message;
    
    document.body.appendChild(messageEl);
    
    setTimeout(() => {
      messageEl.remove();
    }, 3000);
  }

  /**
   * Extract clean domain from hostname
   */
  private extractDomain(hostname: string): string {
    // Remove www. prefix and common subdomains
    return hostname.replace(/^(www\.|m\.|mobile\.)/, '');
  }

  /**
   * Check if domain should auto-append tips
   */
  shouldAutoAppendTips(): boolean {
    return this.isDomainEnabled();
  }

  /**
   * Get domain-specific configuration
   */
  getDomainConfig(domain?: string): { enabled: boolean; status: DomainStatus } {
    const targetDomain = domain || this.currentDomain;
    const status = this.getDomainStatus(targetDomain);
    
    return {
      enabled: status === DomainStatus.WHITELISTED,
      status
    };
  }
}