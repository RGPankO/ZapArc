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
  private currentPosition = { x: 20, y: 20 }; // Will be updated in loadState()

  // Blacklist caching
  private cachedBlacklist: string[] = [];
  private lastBlacklistFetch: number = 0;
  private readonly BLACKLIST_CACHE_TTL = 60000; // 1 minute cache

  // Toast deduplication - track active toasts to prevent spam
  private activeToasts = new Set<string>();

  constructor() {
    console.log('🔵 [FloatingMenu] CONSTRUCTOR ENTRY', {
      timestamp: new Date().toISOString(),
      windowSize: { width: window.innerWidth, height: window.innerHeight }
    });
    
    try {
      this.domainManager = new DomainManager();
      console.log('🔍 [FloatingMenu] DOMAIN MANAGER CREATED', { timestamp: new Date().toISOString() });
      
      this.initialize();
      console.log('🟢 [FloatingMenu] CONSTRUCTOR EXIT', { timestamp: new Date().toISOString() });
    } catch (error) {
      console.error('❌ [FloatingMenu] CONSTRUCTOR ERROR', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * Initialize the floating menu
   */
  private async initialize(): Promise<void> {
    console.log('🔵 [FloatingMenu] INITIALIZE ENTRY', { timestamp: new Date().toISOString() });
    
    try {
      // Check if floating menu is enabled in settings
      console.log('🔍 [FloatingMenu] CHECKING SETTINGS', { timestamp: new Date().toISOString() });
      const settingsResponse = await ExtensionMessaging.getUserSettings();
      
      console.log('🔍 [FloatingMenu] SETTINGS RESPONSE', {
        success: settingsResponse.success,
        data: settingsResponse.data,
        error: settingsResponse.error,
        timestamp: new Date().toISOString()
      });
      
      const settings = settingsResponse.success ? settingsResponse.data : null;
      
      if (!settings?.floatingMenuEnabled) {
        console.log('❌ [FloatingMenu] DISABLED IN SETTINGS', {
          settings: settings,
          floatingMenuEnabled: settings?.floatingMenuEnabled,
          timestamp: new Date().toISOString()
        });
        return;
      }

      console.log('✅ [FloatingMenu] ENABLED IN SETTINGS', { 
        floatingMenuEnabled: settings.floatingMenuEnabled,
        timestamp: new Date().toISOString() 
      });

      // Load saved state
      console.log('🔍 [FloatingMenu] LOADING STATE', { timestamp: new Date().toISOString() });
      await this.loadState();
      
      console.log('🔍 [FloatingMenu] STATE LOADED', {
        currentPosition: this.currentPosition,
        isMinimized: this.isMinimized,
        timestamp: new Date().toISOString()
      });
      
      // Create and show menu
      console.log('🔍 [FloatingMenu] CREATING MENU', { timestamp: new Date().toISOString() });
      this.createMenu();
      
      console.log('🔍 [FloatingMenu] ATTACHING LISTENERS', { timestamp: new Date().toISOString() });
      this.attachEventListeners();
      
      // Initialize blacklist detection
      console.log('🔍 [FloatingMenu] INITIALIZING BLACKLIST DETECTION', { timestamp: new Date().toISOString() });
      this.initializeBlacklistDetection();
      
      console.log('🟢 [FloatingMenu] INITIALIZE COMPLETE', { timestamp: new Date().toISOString() });
    } catch (error) {
      console.error('❌ [FloatingMenu] INITIALIZE ERROR', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Initialize blacklist detection
   */
  private initializeBlacklistDetection(): void {
    // Initial scan only - no continuous polling
    setTimeout(async () => {
      try {
        const blockedTips = await this.scanForBlockedTips();
        this.updateBlacklistIndicator(blockedTips.length);
      } catch (error) {
        console.error('Failed to scan for blocked tips:', error);
      }
    }, 1000);

    // Remove setInterval - no continuous polling needed
    // Remove MutationObserver - too aggressive, causes spam
  }

  /**
   * Get blacklist with caching (1 minute TTL)
   */
  private async getBlacklistCached(): Promise<string[]> {
    const now = Date.now();
    if (this.cachedBlacklist.length === 0 || (now - this.lastBlacklistFetch) > this.BLACKLIST_CACHE_TTL) {
      const response = await ExtensionMessaging.getBlacklist();
      if (response.success) {
        this.cachedBlacklist = response.data?.lnurls || [];
        this.lastBlacklistFetch = now;
      }
    }
    return this.cachedBlacklist;
  }

  /**
   * Create the floating menu element
   */
  private createMenu(): void {
    console.log('🔵 [FloatingMenu] CREATE MENU ENTRY', {
      currentPosition: this.currentPosition,
      isMinimized: this.isMinimized,
      timestamp: new Date().toISOString()
    });
    
    try {
      // Remove existing menu if present
      this.removeMenu();

      this.menuElement = document.createElement('div');
      this.menuElement.id = FloatingMenu.MENU_ID;
      this.menuElement.className = 'lightning-floating-menu';
      
      console.log('🔍 [FloatingMenu] ELEMENT CREATED', {
        elementId: this.menuElement.id,
        className: this.menuElement.className,
        timestamp: new Date().toISOString()
      });
      
      // Base styles
      this.menuElement.style.cssText = `
        position: fixed;
        top: ${this.currentPosition.y}px;
        left: ${this.currentPosition.x}px;
        z-index: 100;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        user-select: none;
        transition: all 0.3s ease;
        cursor: move;
      `;

      console.log('🔍 [FloatingMenu] STYLES APPLIED', {
        position: `top: ${this.currentPosition.y}px, left: ${this.currentPosition.x}px`,
        zIndex: 100,
        timestamp: new Date().toISOString()
      });

      // Set content based on minimized state
      this.updateMenuContent();
      
      console.log('🔍 [FloatingMenu] CONTENT UPDATED', { timestamp: new Date().toISOString() });
      
      // Add to page
      document.body.appendChild(this.menuElement);
      
      console.log('🟢 [FloatingMenu] ELEMENT ADDED TO DOM', {
        parentElement: 'document.body',
        elementInDOM: document.getElementById(FloatingMenu.MENU_ID) !== null,
        timestamp: new Date().toISOString()
      });
      
      // Verify element is visible
      const rect = this.menuElement.getBoundingClientRect();
      console.log('🔍 [FloatingMenu] ELEMENT BOUNDS', {
        rect: {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          bottom: rect.bottom,
          right: rect.right
        },
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        isVisible: rect.width > 0 && rect.height > 0,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ [FloatingMenu] CREATE MENU ERROR', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
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
            
            <div class="blacklist-indicator" style="
              margin-bottom: 8px;
              padding: 6px 8px;
              background: #fff3cd;
              border: 1px solid #ffeaa7;
              border-radius: 4px;
              font-size: 11px;
              color: #856404;
              display: none;
            ">
              <span class="blocked-count">0</span> blocked tip(s) detected
              <button class="view-blocked" style="
                margin-left: 8px;
                padding: 2px 6px;
                border: 1px solid #856404;
                border-radius: 3px;
                background: white;
                color: #856404;
                cursor: pointer;
                font-size: 10px;
              ">View</button>
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
              ">💰 Deposit</button>
              
              <button class="action-btn quick-withdraw" style="
                padding: 8px 12px;
                border: 1px solid #ff9800;
                border-radius: 6px;
                background: white;
                color: #ff9800;
                cursor: pointer;
                font-size: 12px;
                font-weight: bold;
                transition: all 0.2s ease;
              ">💸 Withdraw</button>
              
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
              
              <button class="action-btn manage-blacklist" style="
                padding: 8px 12px;
                border: 1px solid #9e9e9e;
                border-radius: 6px;
                background: white;
                color: #9e9e9e;
                cursor: pointer;
                font-size: 12px;
                font-weight: bold;
                transition: all 0.2s ease;
              ">🚫 Manage Blacklist</button>
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
      await this.handleCopyTipString();
    });

    // Quick deposit
    const depositBtn = this.menuElement.querySelector('.quick-deposit');
    depositBtn?.addEventListener('click', async () => {
      await this.handleQuickDeposit();
    });

    // Quick withdraw
    const withdrawBtn = this.menuElement.querySelector('.quick-withdraw');
    withdrawBtn?.addEventListener('click', async () => {
      await this.handleQuickWithdraw();
    });

    // Domain toggle
    const domainBtn = this.menuElement.querySelector('.domain-toggle');
    domainBtn?.addEventListener('click', async () => {
      await this.handleDomainToggle();
    });

    // Manage blacklist
    const blacklistBtn = this.menuElement.querySelector('.manage-blacklist');
    blacklistBtn?.addEventListener('click', async () => {
      await this.handleManageBlacklist();
    });

    // View blocked tips
    const viewBlockedBtn = this.menuElement.querySelector('.view-blocked');
    viewBlockedBtn?.addEventListener('click', async () => {
      await this.handleViewBlockedTips();
    });
  }

  /**
   * Handle copy tip string action
   */
  private async handleCopyTipString(): Promise<void> {
    try {
      // Check if wallet exists and is set up
      const walletExistsResponse = await ExtensionMessaging.walletExists();
      if (!walletExistsResponse.success || !walletExistsResponse.data) {
        this.showWalletSetupPrompt();
        return;
      }

      // Check if wallet is unlocked
      const unlockedResponse = await ExtensionMessaging.isWalletUnlocked();
      if (!unlockedResponse.success || !unlockedResponse.data) {
        this.showWalletUnlockPrompt();
        return;
      }

      // Generate user's tip request string
      const response = await ExtensionMessaging.generateUserTipRequest();
      if (response.success && response.data) {
        await navigator.clipboard.writeText(response.data);
        this.showToast('Tip string copied to clipboard!', 'success');
        
        // Show the copied string briefly
        this.showCopiedStringPreview(response.data);
      } else {
        // Check if user has custom LNURL configured
        const settingsResponse = await ExtensionMessaging.getUserSettings();
        if (settingsResponse.success && settingsResponse.data?.customLNURL) {
          // Generate tip string with custom LNURL
          const customResponse = await ExtensionMessaging.generateTipRequest(
            settingsResponse.data.customLNURL,
            settingsResponse.data.defaultPostingAmounts || [100, 500, 1000]
          );
          
          if (customResponse.success && customResponse.data) {
            await navigator.clipboard.writeText(customResponse.data);
            this.showToast('Tip string copied to clipboard!', 'success');
            this.showCopiedStringPreview(customResponse.data);
          } else {
            this.showToast('Failed to generate tip string', 'error');
          }
        } else {
          this.showToast('No tip string available. Set up wallet or configure custom LNURL first.', 'warning');
        }
      }
    } catch (error) {
      console.error('Failed to copy tip string:', error);
      this.showToast('Failed to copy tip string', 'error');
    }
  }

  /**
   * Handle quick deposit action
   */
  private async handleQuickDeposit(): Promise<void> {
    try {
      // Check if wallet exists
      const walletExistsResponse = await ExtensionMessaging.walletExists();
      if (!walletExistsResponse.success || !walletExistsResponse.data) {
        this.showWalletSetupPrompt();
        return;
      }

      // Check if wallet is unlocked
      const unlockedResponse = await ExtensionMessaging.isWalletUnlocked();
      if (!unlockedResponse.success || !unlockedResponse.data) {
        this.showWalletUnlockPrompt();
        return;
      }

      // Show deposit amount selection
      this.showDepositAmountSelection();
    } catch (error) {
      console.error('Failed to handle quick deposit:', error);
      this.showToast('Failed to access wallet for deposit', 'error');
    }
  }

  /**
   * Handle quick withdraw action
   */
  private async handleQuickWithdraw(): Promise<void> {
    try {
      // Check if wallet exists
      const walletExistsResponse = await ExtensionMessaging.walletExists();
      if (!walletExistsResponse.success || !walletExistsResponse.data) {
        this.showWalletSetupPrompt();
        return;
      }

      // Check if wallet is unlocked
      const unlockedResponse = await ExtensionMessaging.isWalletUnlocked();
      if (!unlockedResponse.success || !unlockedResponse.data) {
        this.showWalletUnlockPrompt();
        return;
      }

      // Open popup with withdraw focus
      try {
        await ExtensionMessaging.sendToBackground({ type: 'OPEN_POPUP_WITHDRAW' });
        this.showToast('Opening withdraw interface...', 'success');
      } catch (error) {
        console.error('Failed to open withdraw interface:', error);
        this.showToast('Failed to open withdraw interface', 'error');
      }
    } catch (error) {
      console.error('Failed to handle quick withdraw:', error);
      this.showToast('Failed to access wallet for withdraw', 'error');
    }
  }

  /**
   * Handle domain toggle action
   */
  private async handleDomainToggle(): Promise<void> {
    try {
      const currentStatus = await this.domainManager.getDomainStatus();
      let newStatus: string;
      let statusMessage: string;
      
      switch (currentStatus) {
        case 'whitelisted':
          newStatus = 'disabled';
          statusMessage = 'Tipping disabled for this domain';
          break;
        case 'disabled':
          newStatus = 'unmanaged';
          statusMessage = 'Domain reset to unmanaged';
          break;
        default:
          newStatus = 'whitelisted';
          statusMessage = 'Tipping enabled for this domain';
      }
      
      await this.domainManager.setDomainStatus(window.location.hostname, newStatus as any);
      await this.updateDomainStatus();
      this.showToast(statusMessage, 'success');
      
      // Reload the page to apply changes if switching to/from whitelisted
      if (newStatus === 'whitelisted' || currentStatus === 'whitelisted') {
        setTimeout(() => {
          this.showToast('Reloading page to apply changes...', 'success');
          setTimeout(() => window.location.reload(), 1000);
        }, 1500);
      }
    } catch (error) {
      console.error('Failed to toggle domain status:', error);
      this.showToast('Failed to update domain status', 'error');
    }
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
    // Create a key for deduplication
    const toastKey = `${type}:${message}`;
    
    // If this exact toast is already showing, don't show another
    if (this.activeToasts.has(toastKey)) {
      console.log(`[FloatingMenu] Skipping duplicate toast: ${message}`);
      return;
    }
    
    // Track this toast
    this.activeToasts.add(toastKey);
    
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
      z-index: 101;
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
      setTimeout(() => {
        toast.remove();
        // Remove from active tracking
        this.activeToasts.delete(toastKey);
      }, 300);
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
        this.currentPosition = state.position || this.getDefaultPosition();
        this.isMinimized = state.minimized || false;
      } else {
        this.currentPosition = this.getDefaultPosition();
      }
    } catch (error) {
      console.error('Failed to load floating menu state:', error);
      this.currentPosition = this.getDefaultPosition();
    }
  }

  /**
   * Get default position (bottom-right corner)
   */
  private getDefaultPosition(): { x: number; y: number } {
    return {
      x: Math.max(20, window.innerWidth - 68),
      y: Math.max(20, window.innerHeight - 68)
    };
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
   * Show wallet setup prompt
   */
  private showWalletSetupPrompt(): void {
    const prompt = document.createElement('div');
    prompt.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
      padding: 24px;
      z-index: 101;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 400px;
      width: 90%;
    `;

    prompt.innerHTML = `
      <div style="text-align: center; margin-bottom: 20px;">
        <div style="font-size: 48px; margin-bottom: 12px;">⚡</div>
        <h2 style="margin: 0 0 8px 0; color: #333;">Wallet Setup Required</h2>
        <p style="margin: 0; color: #666; font-size: 14px;">
          Set up your Lightning wallet to use tipping features
        </p>
      </div>
      
      <div style="display: flex; gap: 12px;">
        <button class="setup-btn" style="
          flex: 1;
          padding: 12px 16px;
          border: none;
          border-radius: 8px;
          background: #f7931a;
          color: white;
          font-weight: bold;
          cursor: pointer;
          font-size: 14px;
        ">Setup Wallet</button>
        
        <button class="cancel-btn" style="
          padding: 12px 16px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: white;
          color: #666;
          cursor: pointer;
          font-size: 14px;
        ">Cancel</button>
      </div>
    `;

    // Add backdrop
    const backdrop = document.createElement('div');
    backdrop.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      z-index: 100;
    `;

    // Event listeners
    prompt.querySelector('.setup-btn')?.addEventListener('click', async () => {
      try {
        await ExtensionMessaging.sendToBackground({ type: 'OPEN_POPUP' });
      } catch (error) {
        console.error('Failed to open popup:', error);
      }
      backdrop.remove();
      prompt.remove();
    });

    prompt.querySelector('.cancel-btn')?.addEventListener('click', () => {
      backdrop.remove();
      prompt.remove();
    });

    backdrop.addEventListener('click', () => {
      backdrop.remove();
      prompt.remove();
    });

    document.body.appendChild(backdrop);
    document.body.appendChild(prompt);
  }

  /**
   * Show wallet unlock prompt
   */
  private showWalletUnlockPrompt(): void {
    const prompt = document.createElement('div');
    prompt.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
      padding: 24px;
      z-index: 101;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 400px;
      width: 90%;
    `;

    prompt.innerHTML = `
      <div style="text-align: center; margin-bottom: 20px;">
        <div style="font-size: 48px; margin-bottom: 12px;">🔒</div>
        <h2 style="margin: 0 0 8px 0; color: #333;">Wallet Locked</h2>
        <p style="margin: 0; color: #666; font-size: 14px;">
          Unlock your wallet to access tipping features
        </p>
      </div>
      
      <div style="display: flex; gap: 12px;">
        <button class="unlock-btn" style="
          flex: 1;
          padding: 12px 16px;
          border: none;
          border-radius: 8px;
          background: #4CAF50;
          color: white;
          font-weight: bold;
          cursor: pointer;
          font-size: 14px;
        ">Unlock Wallet</button>
        
        <button class="cancel-btn" style="
          padding: 12px 16px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: white;
          color: #666;
          cursor: pointer;
          font-size: 14px;
        ">Cancel</button>
      </div>
    `;

    // Add backdrop
    const backdrop = document.createElement('div');
    backdrop.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      z-index: 100;
    `;

    // Event listeners
    prompt.querySelector('.unlock-btn')?.addEventListener('click', async () => {
      try {
        await ExtensionMessaging.sendToBackground({ type: 'OPEN_POPUP' });
      } catch (error) {
        console.error('Failed to open popup:', error);
      }
      backdrop.remove();
      prompt.remove();
    });

    prompt.querySelector('.cancel-btn')?.addEventListener('click', () => {
      backdrop.remove();
      prompt.remove();
    });

    backdrop.addEventListener('click', () => {
      backdrop.remove();
      prompt.remove();
    });

    document.body.appendChild(backdrop);
    document.body.appendChild(prompt);
  }

  /**
   * Show copied string preview
   */
  private showCopiedStringPreview(tipString: string): void {
    const preview = document.createElement('div');
    preview.style.cssText = `
      position: fixed;
      bottom: 80px;
      right: 20px;
      background: #333;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 12px;
      z-index: 101;
      max-width: 300px;
      word-break: break-all;
      opacity: 0;
      transform: translateY(20px);
      transition: all 0.3s ease;
    `;

    preview.innerHTML = `
      <div style="margin-bottom: 8px; font-weight: bold; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Copied to clipboard:
      </div>
      <div style="opacity: 0.8;">${tipString}</div>
    `;

    document.body.appendChild(preview);

    // Animate in
    setTimeout(() => {
      preview.style.opacity = '1';
      preview.style.transform = 'translateY(0)';
    }, 10);

    // Remove after 4 seconds
    setTimeout(() => {
      preview.style.opacity = '0';
      preview.style.transform = 'translateY(20px)';
      setTimeout(() => preview.remove(), 300);
    }, 4000);
  }

  /**
   * Show deposit amount selection
   */
  private showDepositAmountSelection(): void {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
      padding: 24px;
      z-index: 101;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 400px;
      width: 90%;
    `;

    modal.innerHTML = `
      <div style="text-align: center; margin-bottom: 20px;">
        <div style="font-size: 48px; margin-bottom: 12px;">💰</div>
        <h2 style="margin: 0 0 8px 0; color: #333;">Quick Deposit</h2>
        <p style="margin: 0; color: #666; font-size: 14px;">
          Select amount to generate Lightning invoice
        </p>
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
        <button class="amount-btn" data-amount="10000" style="
          padding: 16px;
          border: 2px solid #f7931a;
          border-radius: 8px;
          background: white;
          color: #f7931a;
          font-weight: bold;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s ease;
        ">10,000 sats</button>
        
        <button class="amount-btn" data-amount="50000" style="
          padding: 16px;
          border: 2px solid #f7931a;
          border-radius: 8px;
          background: white;
          color: #f7931a;
          font-weight: bold;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s ease;
        ">50,000 sats</button>
        
        <button class="amount-btn" data-amount="100000" style="
          padding: 16px;
          border: 2px solid #f7931a;
          border-radius: 8px;
          background: white;
          color: #f7931a;
          font-weight: bold;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s ease;
        ">100,000 sats</button>
        
        <button class="amount-btn" data-amount="500000" style="
          padding: 16px;
          border: 2px solid #f7931a;
          border-radius: 8px;
          background: white;
          color: #f7931a;
          font-weight: bold;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s ease;
        ">500,000 sats</button>
      </div>
      
      <div style="margin-bottom: 16px;">
        <input type="number" class="custom-amount" placeholder="Custom amount (sats)" style="
          width: 100%;
          padding: 12px;
          border: 2px solid #ddd;
          border-radius: 8px;
          font-size: 14px;
          box-sizing: border-box;
        ">
      </div>
      
      <div style="display: flex; gap: 12px;">
        <button class="generate-btn" style="
          flex: 1;
          padding: 12px 16px;
          border: none;
          border-radius: 8px;
          background: #4CAF50;
          color: white;
          font-weight: bold;
          cursor: pointer;
          font-size: 14px;
        ">Generate Invoice</button>
        
        <button class="cancel-btn" style="
          padding: 12px 16px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: white;
          color: #666;
          cursor: pointer;
          font-size: 14px;
        ">Cancel</button>
      </div>
    `;

    // Add backdrop
    const backdrop = document.createElement('div');
    backdrop.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      z-index: 100;
    `;

    let selectedAmount = 0;
    const customAmountInput = modal.querySelector('.custom-amount') as HTMLInputElement;

    // Amount button handlers
    modal.querySelectorAll('.amount-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        // Remove previous selection
        modal.querySelectorAll('.amount-btn').forEach(b => {
          (b as HTMLElement).style.background = 'white';
          (b as HTMLElement).style.color = '#f7931a';
        });
        
        // Select this button
        (btn as HTMLElement).style.background = '#f7931a';
        (btn as HTMLElement).style.color = 'white';
        
        selectedAmount = parseInt(btn.getAttribute('data-amount') || '0');
        customAmountInput.value = '';
      });
    });

    // Custom amount input handler
    customAmountInput.addEventListener('input', () => {
      // Clear button selections
      modal.querySelectorAll('.amount-btn').forEach(b => {
        (b as HTMLElement).style.background = 'white';
        (b as HTMLElement).style.color = '#f7931a';
      });
      
      selectedAmount = parseInt(customAmountInput.value) || 0;
    });

    // Generate invoice handler
    modal.querySelector('.generate-btn')?.addEventListener('click', async () => {
      if (selectedAmount <= 0) {
        this.showToast('Please select or enter an amount', 'warning');
        return;
      }

      try {
        const response = await ExtensionMessaging.generateInvoice(selectedAmount, 'Lightning deposit');
        if (response.success && response.data) {
          backdrop.remove();
          modal.remove();
          this.showDepositInvoice(response.data, selectedAmount);
        } else {
          this.showToast('Failed to generate invoice', 'error');
        }
      } catch (error) {
        console.error('Failed to generate invoice:', error);
        this.showToast('Failed to generate invoice', 'error');
      }
    });

    // Cancel handler
    modal.querySelector('.cancel-btn')?.addEventListener('click', () => {
      backdrop.remove();
      modal.remove();
    });

    backdrop.addEventListener('click', () => {
      backdrop.remove();
      modal.remove();
    });

    document.body.appendChild(backdrop);
    document.body.appendChild(modal);
  }

  /**
   * Show deposit invoice with QR code
   */
  private showDepositInvoice(invoice: string, amount: number): void {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
      padding: 24px;
      z-index: 101;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 400px;
      width: 90%;
      text-align: center;
    `;

    modal.innerHTML = `
      <div style="margin-bottom: 20px;">
        <div style="font-size: 48px; margin-bottom: 12px;">⚡</div>
        <h2 style="margin: 0 0 8px 0; color: #333;">Lightning Invoice</h2>
        <p style="margin: 0; color: #666; font-size: 14px;">
          ${amount.toLocaleString()} sats
        </p>
      </div>
      
      <div class="qr-container" style="
        margin: 20px 0;
        padding: 20px;
        background: #f8f9fa;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 200px;
      ">
        <div style="color: #666;">Generating QR code...</div>
      </div>
      
      <div style="margin: 16px 0;">
        <textarea readonly style="
          width: 100%;
          height: 80px;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-family: monospace;
          font-size: 10px;
          resize: none;
          box-sizing: border-box;
        ">${invoice}</textarea>
      </div>
      
      <div style="display: flex; gap: 12px;">
        <button class="copy-btn" style="
          flex: 1;
          padding: 12px 16px;
          border: 1px solid #f7931a;
          border-radius: 8px;
          background: white;
          color: #f7931a;
          font-weight: bold;
          cursor: pointer;
          font-size: 14px;
        ">Copy Invoice</button>
        
        <button class="close-btn" style="
          padding: 12px 16px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: white;
          color: #666;
          cursor: pointer;
          font-size: 14px;
        ">Close</button>
      </div>
    `;

    // Add backdrop
    const backdrop = document.createElement('div');
    backdrop.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      z-index: 100;
    `;

    // Generate QR code
    this.generateQRCode(invoice).then(qrDataUrl => {
      const qrContainer = modal.querySelector('.qr-container');
      if (qrContainer) {
        qrContainer.innerHTML = `<img src="${qrDataUrl}" style="max-width: 200px; max-height: 200px;">`;
      }
    }).catch(error => {
      console.error('Failed to generate QR code:', error);
      const qrContainer = modal.querySelector('.qr-container');
      if (qrContainer) {
        qrContainer.innerHTML = '<div style="color: #f44336;">Failed to generate QR code</div>';
      }
    });

    // Copy invoice handler
    modal.querySelector('.copy-btn')?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(invoice);
        this.showToast('Invoice copied to clipboard!', 'success');
      } catch (error) {
        console.error('Failed to copy invoice:', error);
        this.showToast('Failed to copy invoice', 'error');
      }
    });

    // Close handler
    modal.querySelector('.close-btn')?.addEventListener('click', () => {
      backdrop.remove();
      modal.remove();
    });

    backdrop.addEventListener('click', () => {
      backdrop.remove();
      modal.remove();
    });

    document.body.appendChild(backdrop);
    document.body.appendChild(modal);
  }

  /**
   * Handle manage blacklist action
   */
  private async handleManageBlacklist(): Promise<void> {
    try {
      const blacklistResponse = await ExtensionMessaging.getBlacklist();
      if (blacklistResponse.success) {
        this.showBlacklistManager(blacklistResponse.data?.lnurls || []);
      } else {
        this.showToast('Failed to load blacklist', 'error');
      }
    } catch (error) {
      console.error('Failed to manage blacklist:', error);
      this.showToast('Failed to access blacklist', 'error');
    }
  }

  /**
   * Handle view blocked tips action
   */
  private async handleViewBlockedTips(): Promise<void> {
    try {
      // Scan current page for blocked tips
      const blockedTips = await this.scanForBlockedTips();
      this.showBlockedTipsOnPage(blockedTips);
    } catch (error) {
      console.error('Failed to view blocked tips:', error);
      this.showToast('Failed to scan for blocked tips', 'error');
    }
  }

  /**
   * Show blacklist manager interface
   */
  private showBlacklistManager(blacklistedLnurls: string[]): void {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
      padding: 24px;
      z-index: 101;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
    `;

    modal.innerHTML = `
      <div style="text-align: center; margin-bottom: 20px;">
        <div style="font-size: 48px; margin-bottom: 12px;">🚫</div>
        <h2 style="margin: 0 0 8px 0; color: #333;">Blacklist Management</h2>
        <p style="margin: 0; color: #666; font-size: 14px;">
          ${blacklistedLnurls.length} blocked LNURL(s)
        </p>
      </div>
      
      <div class="blacklist-content" style="margin-bottom: 20px;">
        ${blacklistedLnurls.length === 0 ? 
          '<div style="text-align: center; color: #999; padding: 20px;">No blocked LNURLs</div>' :
          blacklistedLnurls.map((lnurl, index) => `
            <div class="blacklist-item" style="
              display: flex;
              align-items: center;
              padding: 12px;
              border: 1px solid #eee;
              border-radius: 8px;
              margin-bottom: 8px;
              background: #f8f9fa;
            ">
              <div style="flex: 1; font-family: monospace; font-size: 12px; word-break: break-all;">
                ${lnurl.substring(0, 40)}${lnurl.length > 40 ? '...' : ''}
              </div>
              <button class="unblock-btn" data-lnurl="${lnurl}" style="
                margin-left: 12px;
                padding: 6px 12px;
                border: 1px solid #f44336;
                border-radius: 4px;
                background: white;
                color: #f44336;
                cursor: pointer;
                font-size: 12px;
                font-weight: bold;
              ">Unblock</button>
            </div>
          `).join('')
        }
      </div>
      
      <div style="display: flex; gap: 12px;">
        ${blacklistedLnurls.length > 0 ? `
          <button class="clear-all-btn" style="
            flex: 1;
            padding: 12px 16px;
            border: 1px solid #f44336;
            border-radius: 8px;
            background: white;
            color: #f44336;
            font-weight: bold;
            cursor: pointer;
            font-size: 14px;
          ">Clear All</button>
        ` : ''}
        
        <button class="close-btn" style="
          ${blacklistedLnurls.length > 0 ? '' : 'flex: 1;'}
          padding: 12px 16px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: white;
          color: #666;
          cursor: pointer;
          font-size: 14px;
        ">Close</button>
      </div>
    `;

    // Add backdrop
    const backdrop = document.createElement('div');
    backdrop.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      z-index: 100;
    `;

    // Unblock individual LNURL handlers
    modal.querySelectorAll('.unblock-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const lnurl = btn.getAttribute('data-lnurl');
        if (lnurl) {
          try {
            await ExtensionMessaging.removeFromBlacklist(lnurl);
            // Refresh blacklist after unblocking
            this.cachedBlacklist = [];
            await this.getBlacklistCached();
            this.showToast('LNURL unblocked', 'success');
            backdrop.remove();
            modal.remove();
            // Refresh the blacklist manager
            setTimeout(() => this.handleManageBlacklist(), 100);
          } catch (error) {
            console.error('Failed to unblock LNURL:', error);
            this.showToast('Failed to unblock LNURL', 'error');
          }
        }
      });
    });

    // Clear all handler
    modal.querySelector('.clear-all-btn')?.addEventListener('click', async () => {
      try {
        await ExtensionMessaging.clearBlacklist();
        // Refresh blacklist after clearing
        this.cachedBlacklist = [];
        await this.getBlacklistCached();
        this.showToast('Blacklist cleared', 'success');
        backdrop.remove();
        modal.remove();
      } catch (error) {
        console.error('Failed to clear blacklist:', error);
        this.showToast('Failed to clear blacklist', 'error');
      }
    });

    // Close handler
    modal.querySelector('.close-btn')?.addEventListener('click', () => {
      backdrop.remove();
      modal.remove();
    });

    backdrop.addEventListener('click', () => {
      backdrop.remove();
      modal.remove();
    });

    document.body.appendChild(backdrop);
    document.body.appendChild(modal);
  }

  /**
   * Scan for blocked tips on current page
   */
  private async scanForBlockedTips(): Promise<string[]> {
    try {
      const blacklistedLnurls = await this.getBlacklistCached();
      const blockedTips: string[] = [];

      // Scan text content for tip requests
      const tipRegex = /\[lntip:lnurl:([^:]+):(\d+):(\d+):(\d+)\]/g;
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT
      );

      let node: Node | null;
      while ((node = walker.nextNode())) {
        const textContent = node.textContent || '';
        const matches = Array.from(textContent.matchAll(tipRegex));

        for (const match of matches) {
          const lnurl = match[1];
          if (blacklistedLnurls.includes(lnurl) && !blockedTips.includes(lnurl)) {
            blockedTips.push(lnurl);
          }
        }
      }

      // Scan metadata
      const metaTags = document.querySelectorAll('meta[name="lntip"]');
      for (let i = 0; i < metaTags.length; i++) {
        const metaTag = metaTags[i];
        const content = metaTag.getAttribute('content');
        if (content) {
          try {
            const tipData = JSON.parse(content);
            if (tipData.lnurl && blacklistedLnurls.includes(tipData.lnurl) && !blockedTips.includes(tipData.lnurl)) {
              blockedTips.push(tipData.lnurl);
            }
          } catch (error) {
            // Try simple format
            const parts = content.split(':');
            if (parts.length === 4) {
              const lnurl = parts[0];
              if (blacklistedLnurls.includes(lnurl) && !blockedTips.includes(lnurl)) {
                blockedTips.push(lnurl);
              }
            }
          }
        }
      }

      return blockedTips;
    } catch (error) {
      console.error('Failed to scan for blocked tips:', error);
      return [];
    }
  }

  /**
   * Show blocked tips found on current page
   */
  private showBlockedTipsOnPage(blockedTips: string[]): void {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
      padding: 24px;
      z-index: 101;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
    `;

    modal.innerHTML = `
      <div style="text-align: center; margin-bottom: 20px;">
        <div style="font-size: 48px; margin-bottom: 12px;">🚫</div>
        <h2 style="margin: 0 0 8px 0; color: #333;">Blocked Tips on This Page</h2>
        <p style="margin: 0; color: #666; font-size: 14px;">
          ${blockedTips.length} blocked tip(s) detected
        </p>
      </div>
      
      <div class="blocked-tips-content" style="margin-bottom: 20px;">
        ${blockedTips.length === 0 ? 
          '<div style="text-align: center; color: #999; padding: 20px;">No blocked tips found on this page</div>' :
          blockedTips.map(lnurl => `
            <div class="blocked-tip-item" style="
              display: flex;
              align-items: center;
              padding: 12px;
              border: 1px solid #eee;
              border-radius: 8px;
              margin-bottom: 8px;
              background: #fff3cd;
            ">
              <div style="flex: 1; font-family: monospace; font-size: 12px; word-break: break-all;">
                ${lnurl.substring(0, 40)}${lnurl.length > 40 ? '...' : ''}
              </div>
              <button class="unblock-tip-btn" data-lnurl="${lnurl}" style="
                margin-left: 12px;
                padding: 6px 12px;
                border: 1px solid #4CAF50;
                border-radius: 4px;
                background: white;
                color: #4CAF50;
                cursor: pointer;
                font-size: 12px;
                font-weight: bold;
              ">Unblock</button>
            </div>
          `).join('')
        }
      </div>
      
      <div style="display: flex; gap: 12px;">
        <button class="close-btn" style="
          flex: 1;
          padding: 12px 16px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: white;
          color: #666;
          cursor: pointer;
          font-size: 14px;
        ">Close</button>
      </div>
    `;

    // Add backdrop
    const backdrop = document.createElement('div');
    backdrop.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      z-index: 100;
    `;

    // Unblock tip handlers
    modal.querySelectorAll('.unblock-tip-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const lnurl = btn.getAttribute('data-lnurl');
        if (lnurl) {
          try {
            await ExtensionMessaging.removeFromBlacklist(lnurl);
            // Refresh blacklist after unblocking
            this.cachedBlacklist = [];
            await this.getBlacklistCached();
            this.showToast('LNURL unblocked - page will refresh', 'success');
            backdrop.remove();
            modal.remove();
            // Refresh page to show unblocked tips
            setTimeout(() => window.location.reload(), 1000);
          } catch (error) {
            console.error('Failed to unblock LNURL:', error);
            this.showToast('Failed to unblock LNURL', 'error');
          }
        }
      });
    });

    // Close handler
    modal.querySelector('.close-btn')?.addEventListener('click', () => {
      backdrop.remove();
      modal.remove();
    });

    backdrop.addEventListener('click', () => {
      backdrop.remove();
      modal.remove();
    });

    document.body.appendChild(backdrop);
    document.body.appendChild(modal);
  }

  /**
   * Update blacklist indicator
   */
  public updateBlacklistIndicator(blockedCount: number): void {
    if (this.isMinimized || !this.menuElement) return;

    const indicator = this.menuElement.querySelector('.blacklist-indicator') as HTMLElement;
    const countEl = this.menuElement.querySelector('.blocked-count');

    if (indicator && countEl) {
      if (blockedCount > 0) {
        indicator.style.display = 'block';
        countEl.textContent = blockedCount.toString();
      } else {
        indicator.style.display = 'none';
      }
    }
  }

  /**
   * Generate QR code for text (simple implementation)
   */
  private async generateQRCode(text: string): Promise<string> {
    // Simple QR code generation using a service
    // In production, you might want to use a local QR library
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}`;
    return qrApiUrl;
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

export default FloatingMenu;
