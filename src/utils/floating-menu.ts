// Floating Action Menu for Lightning Network Tipping Extension
// Creates a persistent, draggable floating menu on all webpages

import { ExtensionMessaging } from './messaging';
import { DomainManager } from './domain-manager';

interface FloatingMenuOptions {
  position?: { x: number; y: number };
  minimized?: boolean;
  enabled?: boolean;
}

class FloatingMenu {
  private static readonly MENU_ID = 'lightning-floating-menu';
  private static readonly STORAGE_KEY = 'floatingMenuState';
  
  private menuElement: HTMLElement | null = null;
  private isDragging = false;
  private dragOffset = { x: 0, y: 0 };
  private isMinimized = false;
  private domainManager: DomainManager;
  private currentPosition = { x: 20, y: 20 };

  constructor() {
    this.domainManager = new DomainManager();
    this.initialize();
  }

  /**
   * Initialize the floating menu
   */
  private async initialize(): Promise<void> {
    try {
      // Check if floating menu is enabled in settings
      const settingsResponse = await ExtensionMessaging.getUserSettings();
      const settings = settingsResponse.success ? settingsResponse.data : null;
      
      if (!settings?.floatingMenuEnabled) {
        console.log('Floating menu disabled in settings');
        return;
      }

      // Load saved state
      await this.loadState();
      
      // Create and show menu
      this.createMenu();
      this.attachEventListeners();
      
      console.log('Floating menu initialized');
    } catch (error) {
      console.error('Failed to initialize floating menu:', error);
    }
  }

  /**
   * Create the floating menu element
   */
  private createMenu(): void {
    // Remove existing menu if present
    this.removeMenu();

    this.menuElement = document.createElement('div');
    this.menuElement.id = FloatingMenu.MENU_ID;
    this.menuElement.className = 'lightning-floating-menu';
    
    // Base styles
    this.menuElement.style.cssText = `
      position: fixed;
      top: ${this.currentPosition.y}px;
      left: ${this.currentPosition.x}px;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      user-select: none;
      transition: all 0.3s ease;
      cursor: move;
    `;

    // Set content based on minimized state
    this.updateMenuContent();
    
    // Add to page
    document.body.appendChild(this.menuElement);
  }

  /**
   * Update menu content based on state
   */
  private updateMenuContent(): void {
    if (!this.menuElement) return;

    if (this.isMinimized) {
      // Minimized state - just the lightning icon
      this.menuElement.innerHTML = `
        <div class="menu-icon" style="
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #f7931a 0%, #ff6b35 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(247, 147, 26, 0.3);
          cursor: pointer;
          transition: all 0.2s ease;
        ">
          <span style="color: white; font-size: 20px;">⚡</span>
        </div>
      `;
    } else {
      // Expanded state - full menu
      this.menuElement.innerHTML = `
        <div class="menu-container" style="
          background: white;
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.15);
          border: 1px solid #e0e0e0;
          overflow: hidden;
          min-width: 200px;
        ">
          <div class="menu-header" style="
            background: linear-gradient(135deg, #f7931a 0%, #ff6b35 100%);
            color: white;
            padding: 12px 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            cursor: move;
          ">
            <div style="display: flex; align-items: center;">
              <span style="font-size: 16px; margin-right: 8px;">⚡</span>
              <span style="font-weight: bold; font-size: 13px;">Lightning</span>
            </div>
            <button class="minimize-btn" style="
              background: none;
              border: none;
              color: white;
              cursor: pointer;
              font-size: 16px;
              padding: 2px;
            ">−</button>
          </div>
          
          <div class="menu-content" style="padding: 12px;">
            <div class="domain-status" style="
              margin-bottom: 12px;
              padding: 8px;
              background: #f8f9fa;
              border-radius: 6px;
              font-size: 12px;
            ">
              <div class="domain-info">
                <span class="domain-name" style="font-weight: bold;"></span>
                <span class="domain-status-badge" style="
                  margin-left: 8px;
                  padding: 2px 6px;
                  border-radius: 10px;
                  font-size: 10px;
                  font-weight: bold;
                "></span>
              </div>
            </div>
            
            <div class="menu-actions" style="display: flex; flex-direction: column; gap: 6px;">
              <button class="action-btn copy-tip" style="
                padding: 8px 12px;
                border: 1px solid #f7931a;
                border-radius: 6px;
                background: white;
                color: #f7931a;
                cursor: pointer;
                font-size: 12px;
                font-weight: bold;
                transition: all 0.2s ease;
              ">📋 Copy Tip String</button>
              
              <button class="action-btn quick-deposit" style="
                padding: 8px 12px;
                border: 1px solid #4CAF50;
                border-radius: 6px;
                background: white;
                color: #4CAF50;
                cursor: pointer;
                font-size: 12px;
                font-weight: bold;
                transition: all 0.2s ease;
              ">💰 Quick Deposit</button>
              
              <button class="action-btn domain-toggle" style="
                padding: 8px 12px;
                border: 1px solid #2196F3;
                border-radius: 6px;
                background: white;
                color: #2196F3;
                cursor: pointer;
                font-size: 12px;
                font-weight: bold;
                transition: all 0.2s ease;
              ">🌐 Toggle Domain</button>
            </div>
          </div>
        </div>
      `;
    }

    // Update domain status
    this.updateDomainStatus();
  }

  /**
   * Update domain status display
   */
  private async updateDomainStatus(): Promise<void> {
    if (this.isMinimized) return;

    try {
      const domain = window.location.hostname;
      const status = await this.domainManager.getDomainStatus();
      
      const domainNameEl = this.menuElement?.querySelector('.domain-name');
      const statusBadgeEl = this.menuElement?.querySelector('.domain-status-badge');
      
      if (domainNameEl && statusBadgeEl) {
        domainNameEl.textContent = domain;
        
        switch (status) {
          case 'whitelisted':
            (statusBadgeEl as HTMLElement).style.background = '#4CAF50';
            (statusBadgeEl as HTMLElement).style.color = 'white';
            statusBadgeEl.textContent = 'ENABLED';
            break;
          case 'disabled':
            (statusBadgeEl as HTMLElement).style.background = '#f44336';
            (statusBadgeEl as HTMLElement).style.color = 'white';
            statusBadgeEl.textContent = 'DISABLED';
            break;
          default:
            (statusBadgeEl as HTMLElement).style.background = '#9e9e9e';
            (statusBadgeEl as HTMLElement).style.color = 'white';
            statusBadgeEl.textContent = 'UNMANAGED';
        }
      }
    } catch (error) {
      console.error('Failed to update domain status:', error);
    }
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    if (!this.menuElement) return;

    // Click to expand/minimize
    if (this.isMinimized) {
      this.menuElement.addEventListener('click', () => {
        this.toggleMinimized();
      });
    } else {
      // Minimize button
      const minimizeBtn = this.menuElement.querySelector('.minimize-btn');
      minimizeBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleMinimized();
      });

      // Action buttons
      this.setupActionButtons();
    }

    // Dragging functionality
    this.setupDragging();
  }

  /**
   * Setup action button event listeners
   */
  private setupActionButtons(): void {
    if (!this.menuElement) return;

    // Copy tip string
    const copyTipBtn = this.menuElement.querySelector('.copy-tip');
    copyTipBtn?.addEventListener('click', async () => {
      try {
        const response = await ExtensionMessaging.generateUserTipRequest();
        if (response.success && response.data) {
          await navigator.clipboard.writeText(response.data);
          this.showToast('Tip string copied to clipboard!', 'success');
        } else {
          this.showToast('No tip string available. Set up wallet first.', 'warning');
        }
      } catch (error) {
        console.error('Failed to copy tip string:', error);
        this.showToast('Failed to copy tip string', 'error');
      }
    });

    // Quick deposit
    const depositBtn = this.menuElement.querySelector('.quick-deposit');
    depositBtn?.addEventListener('click', () => {
      // Open extension popup for deposit
      chrome.runtime.sendMessage({ type: 'OPEN_POPUP_DEPOSIT' });
    });

    // Domain toggle
    const domainBtn = this.menuElement.querySelector('.domain-toggle');
    domainBtn?.addEventListener('click', async () => {
      try {
        const currentStatus = await this.domainManager.getDomainStatus();
        let newStatus: string;
        
        switch (currentStatus) {
          case 'whitelisted':
            newStatus = 'disabled';
            break;
          case 'disabled':
            newStatus = 'unmanaged';
            break;
          default:
            newStatus = 'whitelisted';
        }
        
        await this.domainManager.setDomainStatus(window.location.hostname, newStatus as any);
        this.updateDomainStatus();
        this.showToast(`Domain ${newStatus}`, 'success');
      } catch (error) {
        console.error('Failed to toggle domain status:', error);
        this.showToast('Failed to update domain status', 'error');
      }
    });
  }

  /**
   * Setup dragging functionality
   */
  private setupDragging(): void {
    if (!this.menuElement) return;

    const dragHandle = this.isMinimized ? 
      this.menuElement : 
      this.menuElement.querySelector('.menu-header');

    if (!dragHandle) return;

    (dragHandle as HTMLElement).addEventListener('mousedown', (e: MouseEvent) => {
      this.isDragging = true;
      const rect = this.menuElement!.getBoundingClientRect();
      this.dragOffset = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      
      document.addEventListener('mousemove', this.handleDrag);
      document.addEventListener('mouseup', this.handleDragEnd);
      e.preventDefault();
    });
  }

  /**
   * Handle drag movement
   */
  private handleDrag = (e: MouseEvent): void => {
    if (!this.isDragging || !this.menuElement) return;

    const newX = e.clientX - this.dragOffset.x;
    const newY = e.clientY - this.dragOffset.y;

    // Keep within viewport bounds
    const maxX = window.innerWidth - this.menuElement.offsetWidth;
    const maxY = window.innerHeight - this.menuElement.offsetHeight;

    this.currentPosition = {
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    };

    this.menuElement.style.left = `${this.currentPosition.x}px`;
    this.menuElement.style.top = `${this.currentPosition.y}px`;
  };

  /**
   * Handle drag end
   */
  private handleDragEnd = (): void => {
    this.isDragging = false;
    document.removeEventListener('mousemove', this.handleDrag);
    document.removeEventListener('mouseup', this.handleDragEnd);
    
    // Save position
    this.saveState();
  };

  /**
   * Toggle minimized state
   */
  private toggleMinimized(): void {
    this.isMinimized = !this.isMinimized;
    this.updateMenuContent();
    this.attachEventListeners();
    this.saveState();
  }

  /**
   * Show toast notification
   */
  private showToast(message: string, type: 'success' | 'error' | 'warning' = 'success'): void {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#ff9800'};
      color: white;
      padding: 12px 16px;
      border-radius: 6px;
      font-size: 14px;
      z-index: 2147483647;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
      toast.style.opacity = '1';
    }, 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /**
   * Save menu state to storage
   */
  private async saveState(): Promise<void> {
    try {
      const state = {
        position: this.currentPosition,
        minimized: this.isMinimized,
        timestamp: Date.now()
      };
      
      await chrome.storage.local.set({ [FloatingMenu.STORAGE_KEY]: state });
    } catch (error) {
      console.error('Failed to save floating menu state:', error);
    }
  }

  /**
   * Load menu state from storage
   */
  private async loadState(): Promise<void> {
    try {
      const result = await chrome.storage.local.get([FloatingMenu.STORAGE_KEY]);
      const state = result[FloatingMenu.STORAGE_KEY];
      
      if (state) {
        this.currentPosition = state.position || { x: 20, y: 20 };
        this.isMinimized = state.minimized || false;
      }
    } catch (error) {
      console.error('Failed to load floating menu state:', error);
    }
  }

  /**
   * Remove menu from page
   */
  private removeMenu(): void {
    const existing = document.getElementById(FloatingMenu.MENU_ID);
    if (existing) {
      existing.remove();
    }
    this.menuElement = null;
  }

  /**
   * Destroy the floating menu
   */
  public destroy(): void {
    this.removeMenu();
    document.removeEventListener('mousemove', this.handleDrag);
    document.removeEventListener('mouseup', this.handleDragEnd);
  }
}

// Auto-initialize on content script load
let floatingMenu: FloatingMenu | null = null;

// Initialize after page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    floatingMenu = new FloatingMenu();
  });
} else {
  floatingMenu = new FloatingMenu();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (floatingMenu) {
    floatingMenu.destroy();
  }
});

export default FloatingMenu;