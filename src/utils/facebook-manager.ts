// Facebook Manager for Lightning Network Tipping Extension
// Handles Facebook-specific group management and posting restrictions

import { ChromeStorageManager } from './storage';

export interface FacebookGroupSettings {
  globalMode: boolean;
  allowedGroups: string[];
  deniedGroups: string[];
}

export interface FacebookGroupInfo {
  groupId: string;
  groupName?: string;
  url: string;
  dateAdded: number;
  postCount?: number;
}

export class FacebookManager {
  private storage: ChromeStorageManager;
  private groupSettings: FacebookGroupSettings;
  private currentGroupId: string | null = null;

  constructor() {
    this.storage = new ChromeStorageManager();
    this.groupSettings = {
      globalMode: true,
      allowedGroups: [],
      deniedGroups: []
    };
    this.loadGroupSettings();
    this.detectCurrentGroup();
  }

  /**
   * Load Facebook group settings from storage
   */
  async loadGroupSettings(): Promise<void> {
    try {
      const settings = await this.storage.getUserSettings();
      // Facebook settings would be stored in user settings
      // For now, using defaults
      console.log('Facebook group settings loaded');
    } catch (error) {
      console.error('Failed to load Facebook group settings:', error);
    }
  }

  /**
   * Detect current Facebook group
   */
  private detectCurrentGroup(): void {
    try {
      const url = window.location.href;
      const match = url.match(/facebook\.com\/groups\/(\d+)/);
      this.currentGroupId = match ? match[1] : null;
      
      if (this.currentGroupId) {
        console.log(`Detected Facebook group: ${this.currentGroupId}`);
      }
    } catch (error) {
      console.error('Failed to detect Facebook group:', error);
    }
  }

  /**
   * Check if posting is allowed in current context
   */
  isPostingAllowed(): boolean {
    // If not on Facebook, allow posting (handled by domain manager)
    if (!window.location.hostname.includes('facebook.com')) {
      return true;
    }

    // If not in a group, allow posting
    if (!this.currentGroupId) {
      return true;
    }

    // If in global mode, allow posting in all groups
    if (this.groupSettings.globalMode) {
      return true;
    }

    // If in selective mode, check if group is allowed
    return this.groupSettings.allowedGroups.includes(this.currentGroupId);
  }

  /**
   * Get current group ID
   */
  getCurrentGroupId(): string | null {
    return this.currentGroupId;
  }

  /**
   * Add group to allowed list
   */
  async addAllowedGroup(groupId: string): Promise<void> {
    try {
      if (!this.groupSettings.allowedGroups.includes(groupId)) {
        this.groupSettings.allowedGroups.push(groupId);
        await this.saveGroupSettings();
        console.log(`Added group ${groupId} to allowed list`);
      }
    } catch (error) {
      console.error('Failed to add allowed group:', error);
      throw error;
    }
  }

  /**
   * Remove group from allowed list
   */
  async removeAllowedGroup(groupId: string): Promise<void> {
    try {
      this.groupSettings.allowedGroups = this.groupSettings.allowedGroups.filter(
        id => id !== groupId
      );
      await this.saveGroupSettings();
      console.log(`Removed group ${groupId} from allowed list`);
    } catch (error) {
      console.error('Failed to remove allowed group:', error);
      throw error;
    }
  }

  /**
   * Set global posting mode
   */
  async setGlobalMode(enabled: boolean): Promise<void> {
    try {
      this.groupSettings.globalMode = enabled;
      await this.saveGroupSettings();
      console.log(`Set Facebook global mode to ${enabled}`);
    } catch (error) {
      console.error('Failed to set global mode:', error);
      throw error;
    }
  }

  /**
   * Show group permission prompt
   */
  showGroupPermissionPrompt(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.currentGroupId) {
        resolve(false);
        return;
      }

      const modal = document.createElement('div');
      modal.className = 'lightning-facebook-prompt';
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

      const groupName = this.extractGroupName();

      modal.innerHTML = `
        <div style="
          background: white;
          border-radius: 8px;
          padding: 24px;
          max-width: 400px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        ">
          <div style="margin-bottom: 16px;">
            <h3 style="margin: 0 0 8px 0; color: #333;">Enable Tipping for This Group?</h3>
            <p style="margin: 0; color: #666; font-size: 14px;">
              ${groupName ? `Group: ${groupName}` : `Group ID: ${this.currentGroupId}`}
            </p>
          </div>
          
          <div style="margin-bottom: 20px; color: #666; font-size: 14px;">
            <p style="margin: 0 0 8px 0;">
              This will allow automatic tip request appending when you post in this Facebook group.
            </p>
            <p style="margin: 0; font-size: 12px; color: #999;">
              You can change this later in the extension settings.
            </p>
          </div>
          
          <div style="display: flex; gap: 12px;">
            <button class="allow-btn" style="
              flex: 1;
              padding: 10px 16px;
              border: 1px solid #4CAF50;
              border-radius: 4px;
              background: #4CAF50;
              color: white;
              cursor: pointer;
              font-size: 14px;
            ">Yes, Enable Tipping</button>
            
            <button class="deny-btn" style="
              flex: 1;
              padding: 10px 16px;
              border: 1px solid #f44336;
              border-radius: 4px;
              background: white;
              color: #f44336;
              cursor: pointer;
              font-size: 14px;
            ">No, Skip This Group</button>
          </div>
          
          <div style="margin-top: 12px; text-align: center;">
            <button class="global-btn" style="
              padding: 6px 12px;
              border: 1px solid #2196F3;
              border-radius: 4px;
              background: white;
              color: #2196F3;
              cursor: pointer;
              font-size: 12px;
            ">Enable for All Groups</button>
          </div>
        </div>
      `;

      // Add event listeners
      modal.querySelector('.allow-btn')?.addEventListener('click', async () => {
        try {
          await this.addAllowedGroup(this.currentGroupId!);
          modal.remove();
          resolve(true);
        } catch (error) {
          console.error('Failed to allow group:', error);
          modal.remove();
          resolve(false);
        }
      });

      modal.querySelector('.deny-btn')?.addEventListener('click', () => {
        modal.remove();
        resolve(false);
      });

      modal.querySelector('.global-btn')?.addEventListener('click', async () => {
        try {
          await this.setGlobalMode(true);
          modal.remove();
          resolve(true);
        } catch (error) {
          console.error('Failed to set global mode:', error);
          modal.remove();
          resolve(false);
        }
      });

      // Close on outside click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.remove();
          resolve(false);
        }
      });

      document.body.appendChild(modal);
    });
  }

  /**
   * Extract group name from page
   */
  private extractGroupName(): string | null {
    try {
      // Try various selectors for group name
      const selectors = [
        'h1[data-testid="group-name"]',
        '.x1heor9g.x1qlqyl8.x1pd3egz.x1a2a7pz h1',
        '[role="main"] h1',
        'h1'
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent) {
          const text = element.textContent.trim();
          if (text.length > 0 && text.length < 100) {
            return text;
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Failed to extract group name:', error);
      return null;
    }
  }

  /**
   * Save group settings to storage
   */
  private async saveGroupSettings(): Promise<void> {
    try {
      // In a real implementation, this would save to user settings
      // For now, just log the action
      console.log('Facebook group settings saved:', this.groupSettings);
    } catch (error) {
      console.error('Failed to save group settings:', error);
      throw error;
    }
  }

  /**
   * Get group statistics
   */
  getGroupStats(): {
    totalAllowed: number;
    currentGroupAllowed: boolean;
    globalMode: boolean;
  } {
    return {
      totalAllowed: this.groupSettings.allowedGroups.length,
      currentGroupAllowed: this.currentGroupId ? 
        this.groupSettings.allowedGroups.includes(this.currentGroupId) : false,
      globalMode: this.groupSettings.globalMode
    };
  }

  /**
   * Check if we should show permission prompt
   */
  shouldShowPermissionPrompt(): boolean {
    // Don't show if in global mode
    if (this.groupSettings.globalMode) {
      return false;
    }

    // Don't show if not in a group
    if (!this.currentGroupId) {
      return false;
    }

    // Don't show if already allowed or denied
    if (this.groupSettings.allowedGroups.includes(this.currentGroupId) ||
        this.groupSettings.deniedGroups.includes(this.currentGroupId)) {
      return false;
    }

    return true;
  }
}