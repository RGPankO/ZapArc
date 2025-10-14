// Content script for Lightning Network Tipping Extension
// Handles tip detection, posting context detection, and UI overlays

import { TipRequest, PostingContext } from '../types';
import { ExtensionMessaging } from '../utils/messaging';
import { BlacklistManager } from '../utils/blacklist-manager';
import { DomainManager } from '../utils/domain-manager';
import { PostingDetector } from '../utils/posting-detector';
import { FacebookManager } from '../utils/facebook-manager';

console.log('Lightning Tipping Extension content script loaded');

// Tip detection system
class TipDetector {
  private static readonly TIP_REGEX = /\[lntip:lnurl:([^:]+):(\d+):(\d+):(\d+)\]/g;
  private static readonly SCAN_THROTTLE_MS = 1000;
  private static readonly METADATA_SELECTOR = 'meta[name="lntip"]';
  
  private lastScanTime = 0;
  private detectedTips = new Set<string>();
  private observer: MutationObserver | null = null;
  public blacklistManager: BlacklistManager;
  public domainManager: DomainManager;
  private postingDetector: PostingDetector;
  private facebookManager: FacebookManager;

  constructor() {
    this.blacklistManager = new BlacklistManager();
    this.domainManager = new DomainManager();
    this.postingDetector = new PostingDetector();
    this.facebookManager = new FacebookManager();
    this.initializeExtension();
  }

  /**
   * Initialize extension with proper async handling
   */
  private async initializeExtension(): Promise<void> {
    try {
      // Wait a bit for managers to initialize
      await new Promise(resolve => setTimeout(resolve, 100));
      
      this.initializeDetection();
      this.initializeDomainIndicator();
      this.initializePostingDetection();
    } catch (error) {
      console.error('Failed to initialize extension:', error);
    }
  }

  /**
   * Initialize domain indicator
   */
  private initializeDomainIndicator(): void {
    try {
      // Wait for domain manager to load settings, then show indicator
      setTimeout(() => {
        this.showDomainIndicator();
      }, 200);
    } catch (error) {
      console.error('Failed to initialize domain indicator:', error);
    }
  }

  /**
   * Show domain indicator
   */
  private showDomainIndicator(): void {
    try {
      // Remove existing indicator
      const existing = document.querySelector('.lightning-domain-indicator');
      if (existing) {
        existing.remove();
      }

      // Show domain status indicator
      const indicator = this.domainManager.createDomainStatusIndicator();
      document.body.appendChild(indicator);

      // Auto-hide after 5 seconds unless hovered
      let hideTimeout = setTimeout(() => {
        indicator.style.opacity = '0.3';
      }, 5000);

      indicator.addEventListener('mouseenter', () => {
        clearTimeout(hideTimeout);
        indicator.style.opacity = '1';
      });

      indicator.addEventListener('mouseleave', () => {
        hideTimeout = setTimeout(() => {
          indicator.style.opacity = '0.3';
        }, 2000);
      });
    } catch (error) {
      console.error('Failed to show domain indicator:', error);
    }
  }

  /**
   * Initialize posting detection system
   */
  private initializePostingDetection(): void {
    try {
      // Check if domain allows auto-appending
      if (!this.domainManager.shouldAutoAppendTips()) {
        console.log('Auto-appending disabled for this domain');
        return;
      }

      // Set up posting context monitoring
      this.monitorPostingContexts();
      
      console.log('Posting detection system initialized');
    } catch (error) {
      console.error('Failed to initialize posting detection:', error);
    }
  }

  /**
   * Monitor for posting contexts
   */
  private monitorPostingContexts(): void {
    // Initial check
    this.checkForPostingContext();

    // Monitor for new posting contexts
    const checkInterval = setInterval(() => {
      this.checkForPostingContext();
    }, 2000);

    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
      clearInterval(checkInterval);
    });
  }

  /**
   * Check for posting context and auto-append if needed
   */
  private async checkForPostingContext(): Promise<void> {
    try {
      const context = this.postingDetector.detectPostingContext();
      
      if (context && context.element) {
        // Check if we've already processed this element
        const elementId = this.getElementId(context.element);
        if (context.element.dataset.lightningProcessed === 'true') {
          return;
        }

        // Mark as processed
        context.element.dataset.lightningProcessed = 'true';

        // Auto-append tip request
        await this.autoAppendTipRequest(context);
      }
    } catch (error) {
      console.error('Failed to check posting context:', error);
    }
  }

  /**
   * Auto-append tip request to posting context
   */
  private async autoAppendTipRequest(context: PostingContext): Promise<void> {
    try {
      // Check Facebook group restrictions
      if (context.platform === 'facebook') {
        const isAllowed = this.facebookManager.isPostingAllowed();
        
        if (!isAllowed) {
          // Show permission prompt if needed
          if (this.facebookManager.shouldShowPermissionPrompt()) {
            const granted = await this.facebookManager.showGroupPermissionPrompt();
            if (!granted) {
              console.log('Facebook group posting not allowed');
              return;
            }
          } else {
            console.log('Facebook group posting not allowed');
            return;
          }
        }
      }

      // Generate user's tip request string
      const response = await ExtensionMessaging.generateUserTipRequest();
      
      if (!response.success || !response.data) {
        console.log('No tip request available - wallet not set up or no LNURL configured');
        this.showSetupPrompt();
        return;
      }

      const tipRequest = response.data;

      // Append to the element
      this.appendTipToElement(context.element, tipRequest);

      console.log(`Auto-appended tip request to ${context.platform} ${context.type}`);
    } catch (error) {
      console.error('Failed to auto-append tip request:', error);
    }
  }

  /**
   * Append tip request to element
   */
  private appendTipToElement(element: HTMLElement, tipRequest: string): void {
    try {
      const currentContent = this.getElementContent(element);
      
      // Don't append if tip request already exists
      if (currentContent.includes('[lntip:')) {
        return;
      }

      // Append tip request with newline
      const newContent = currentContent + (currentContent ? '\n' : '') + tipRequest;
      this.setElementContent(element, newContent);

      // Show visual feedback
      this.showAppendFeedback(element);
    } catch (error) {
      console.error('Failed to append tip to element:', error);
    }
  }

  /**
   * Get element content (works for both textarea and contenteditable)
   */
  private getElementContent(element: HTMLElement): string {
    if (element.tagName === 'TEXTAREA') {
      return (element as HTMLTextAreaElement).value;
    } else if (element.contentEditable === 'true') {
      return element.textContent || '';
    }
    return '';
  }

  /**
   * Set element content (works for both textarea and contenteditable)
   */
  private setElementContent(element: HTMLElement, content: string): void {
    if (element.tagName === 'TEXTAREA') {
      (element as HTMLTextAreaElement).value = content;
      // Trigger input event
      element.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (element.contentEditable === 'true') {
      element.textContent = content;
      // Trigger input event
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  /**
   * Show visual feedback for auto-append
   */
  private showAppendFeedback(element: HTMLElement): void {
    const feedback = document.createElement('div');
    feedback.style.cssText = `
      position: absolute;
      background: #4CAF50;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      z-index: 10000;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;
    feedback.textContent = '⚡ Tip request added';

    // Position near the element
    const rect = element.getBoundingClientRect();
    feedback.style.top = `${rect.bottom + window.scrollY + 5}px`;
    feedback.style.left = `${rect.left + window.scrollX}px`;

    document.body.appendChild(feedback);

    // Animate in
    setTimeout(() => {
      feedback.style.opacity = '1';
    }, 10);

    // Remove after 2 seconds
    setTimeout(() => {
      feedback.style.opacity = '0';
      setTimeout(() => {
        feedback.remove();
      }, 300);
    }, 2000);
  }

  /**
   * Show setup prompt when wallet is not configured
   */
  private showSetupPrompt(): void {
    // Don't show multiple prompts
    if (document.querySelector('.lightning-setup-prompt')) {
      return;
    }

    const prompt = document.createElement('div');
    prompt.className = 'lightning-setup-prompt';
    prompt.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #2196F3;
      color: white;
      padding: 16px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      z-index: 10000;
      max-width: 300px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    `;

    prompt.innerHTML = `
      <div style="display: flex; align-items: center; margin-bottom: 12px;">
        <span style="font-size: 20px; margin-right: 8px;">⚡</span>
        <strong>Lightning Tipping Setup</strong>
        <button class="close-setup" style="margin-left: auto; background: none; border: none; color: white; font-size: 16px; cursor: pointer;">×</button>
      </div>
      
      <div style="margin-bottom: 12px; font-size: 13px; opacity: 0.9;">
        Set up your wallet to automatically add tip requests to your posts.
      </div>
      
      <div style="display: flex; gap: 8px;">
        <button class="setup-wallet-btn" style="
          flex: 1;
          padding: 8px 12px;
          border: 1px solid white;
          border-radius: 4px;
          background: white;
          color: #2196F3;
          cursor: pointer;
          font-size: 12px;
          font-weight: bold;
        ">Setup Wallet</button>
        
        <button class="maybe-later-btn" style="
          padding: 8px 12px;
          border: 1px solid rgba(255,255,255,0.5);
          border-radius: 4px;
          background: transparent;
          color: white;
          cursor: pointer;
          font-size: 12px;
        ">Later</button>
      </div>
    `;

    // Add event listeners
    prompt.querySelector('.close-setup')?.addEventListener('click', () => {
      prompt.remove();
    });

    prompt.querySelector('.setup-wallet-btn')?.addEventListener('click', () => {
      // Open extension popup
      chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
      prompt.remove();
    });

    prompt.querySelector('.maybe-later-btn')?.addEventListener('click', () => {
      prompt.remove();
    });

    document.body.appendChild(prompt);

    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (prompt.parentNode) {
        prompt.remove();
      }
    }, 10000);
  }

  /**
   * Get unique element identifier
   */
  private getElementId(element: HTMLElement): string {
    return `${element.tagName}-${element.className}-${element.getBoundingClientRect().top}`;
  }

  /**
   * Initialize tip detection system
   */
  private async initializeDetection(): Promise<void> {
    try {
      // Initial scan
      await this.scanForTips();

      // Set up mutation observer for dynamic content
      this.setupMutationObserver();

      // Set up periodic scanning as fallback
      setInterval(() => this.throttledScan(), TipDetector.SCAN_THROTTLE_MS);

      console.log('Tip detection system initialized');
    } catch (error) {
      console.error('Failed to initialize tip detection:', error);
    }
  }



  /**
   * Set up mutation observer for dynamic content changes
   */
  private setupMutationObserver(): void {
    this.observer = new MutationObserver((mutations) => {
      let shouldScan = false;

      for (let i = 0; i < mutations.length; i++) {
        const mutation = mutations[i];
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Check if any added nodes contain text content
          for (let j = 0; j < mutation.addedNodes.length; j++) {
            const node = mutation.addedNodes[j];
            if (node.nodeType === Node.TEXT_NODE || 
                (node.nodeType === Node.ELEMENT_NODE && (node as Element).textContent)) {
              shouldScan = true;
              break;
            }
          }
        }
      }

      if (shouldScan) {
        this.throttledScan();
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Throttled scanning to avoid performance issues
   */
  private throttledScan(): void {
    const now = Date.now();
    if (now - this.lastScanTime >= TipDetector.SCAN_THROTTLE_MS) {
      this.lastScanTime = now;
      this.scanForTips();
    }
  }

  /**
   * Scan page for tip requests
   */
  private async scanForTips(): Promise<void> {
    try {
      const tips: TipRequest[] = [];

      // Scan text content
      const textTips = this.scanTextContent();
      tips.push(...textTips);

      // Scan metadata
      const metadataTips = this.scanMetadata();
      tips.push(...metadataTips);

      // Process new tips
      let blacklistedCount = 0;
      for (const tip of tips) {
        const tipId = `${tip.lnurl}-${tip.element?.tagName}-${tip.element?.textContent?.substring(0, 50)}`;
        
        if (!this.detectedTips.has(tipId)) {
          this.detectedTips.add(tipId);
          
          if (tip.isBlacklisted) {
            blacklistedCount++;
          } else {
            await this.processTip(tip);
          }
        }
      }

      // Show blacklist indicator if there are blocked tips
      if (blacklistedCount > 0) {
        this.showBlacklistIndicator(blacklistedCount);
      }
    } catch (error) {
      console.error('Tip scanning failed:', error);
    }
  }

  /**
   * Scan text content for tip requests
   */
  private scanTextContent(): TipRequest[] {
    const tips: TipRequest[] = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT
    );

    let node: Node | null;
    while ((node = walker.nextNode())) {
      const textContent = node.textContent || '';
      const matches = Array.from(textContent.matchAll(TipDetector.TIP_REGEX));

      for (const match of matches) {
        const [fullMatch, lnurl, amount1, amount2, amount3] = match;
        
        const tip: TipRequest = {
          lnurl,
          suggestedAmounts: [parseInt(amount1), parseInt(amount2), parseInt(amount3)],
          source: 'text',
          element: node.parentElement || undefined,
          isBlacklisted: this.blacklistManager.isBlacklisted(lnurl)
        };

        tips.push(tip);
      }
    }

    return tips;
  }

  /**
   * Scan HTML metadata for tip requests
   */
  private scanMetadata(): TipRequest[] {
    const tips: TipRequest[] = [];
    const metaTags = document.querySelectorAll(TipDetector.METADATA_SELECTOR);

    for (let i = 0; i < metaTags.length; i++) {
      const metaTag = metaTags[i];
      const content = metaTag.getAttribute('content');
      if (!content) continue;

      try {
        // Parse metadata content - expecting JSON format
        const tipData = JSON.parse(content);
        
        if (tipData.lnurl && tipData.amounts && Array.isArray(tipData.amounts) && tipData.amounts.length === 3) {
          const tip: TipRequest = {
            lnurl: tipData.lnurl,
            suggestedAmounts: tipData.amounts,
            source: 'metadata',
            element: metaTag as HTMLElement,
            isBlacklisted: this.blacklistManager.isBlacklisted(tipData.lnurl)
          };

          tips.push(tip);
        }
      } catch (error) {
        // Try parsing as simple format: lnurl:amount1:amount2:amount3
        const parts = content.split(':');
        if (parts.length === 4) {
          const [lnurl, amount1, amount2, amount3] = parts;
          const amounts = [parseInt(amount1), parseInt(amount2), parseInt(amount3)];
          
          if (amounts.every(amount => !isNaN(amount) && amount > 0)) {
            const tip: TipRequest = {
              lnurl,
              suggestedAmounts: amounts as [number, number, number],
              source: 'metadata',
              element: metaTag as HTMLElement,
              isBlacklisted: this.blacklistManager.isBlacklisted(lnurl)
            };

            tips.push(tip);
          }
        }
      }
    }

    return tips;
  }

  /**
   * Process detected tip request
   */
  private async processTip(tip: TipRequest): Promise<void> {
    try {
      if (tip.isBlacklisted) {
        console.log('Skipping blacklisted tip:', tip.lnurl);
        return;
      }

      // Validate tip request
      const isValid = await this.validateTip(tip);
      if (!isValid) {
        console.log('Invalid tip request:', tip);
        return;
      }

      // Show tip prompt
      this.showTipPrompt(tip);
    } catch (error) {
      console.error('Failed to process tip:', error);
    }
  }

  /**
   * Validate tip request
   */
  private async validateTip(tip: TipRequest): Promise<boolean> {
    try {
      // Basic validation
      if (!tip.lnurl || tip.suggestedAmounts.some(amount => amount <= 0)) {
        return false;
      }

      // Validate LNURL format
      if (!tip.lnurl.toLowerCase().startsWith('lnurl')) {
        return false;
      }

      // Additional validation could be added here
      return true;
    } catch (error) {
      console.error('Tip validation failed:', error);
      return false;
    }
  }

  /**
   * Show tip prompt UI
   */
  private showTipPrompt(tip: TipRequest): void {
    try {
      // Create tip prompt element
      const promptElement = this.createTipPrompt(tip);
      
      // Position near the detected content
      if (tip.element) {
        this.positionPrompt(promptElement, tip.element);
      }

      // Add to page
      document.body.appendChild(promptElement);

      console.log('Tip prompt shown for:', tip.lnurl);
    } catch (error) {
      console.error('Failed to show tip prompt:', error);
    }
  }

  /**
   * Create tip prompt UI element
   */
  private createTipPrompt(tip: TipRequest): HTMLElement {
    const prompt = document.createElement('div');
    prompt.className = 'lightning-tip-prompt';
    prompt.style.cssText = `
      position: absolute;
      background: white;
      border: 2px solid #f7931a;
      border-radius: 8px;
      padding: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      max-width: 300px;
      min-width: 250px;
    `;

    prompt.innerHTML = `
      <div style="display: flex; align-items: center; margin-bottom: 8px;">
        <span style="color: #f7931a; font-weight: bold; margin-right: 8px;">⚡</span>
        <span style="font-weight: bold;">Lightning Tip Available</span>
        <button class="close-btn" style="margin-left: auto; background: none; border: none; font-size: 16px; cursor: pointer;">×</button>
      </div>
      
      <div style="margin-bottom: 12px; color: #666;">
        Choose an amount to tip:
      </div>
      
      <div class="tip-amounts" style="display: flex; gap: 8px; margin-bottom: 12px;">
        ${tip.suggestedAmounts.map(amount => 
          `<button class="tip-amount-btn" data-amount="${amount}" style="
            flex: 1;
            padding: 8px 4px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background: white;
            cursor: pointer;
            font-size: 12px;
          ">${amount.toLocaleString()} sats</button>`
        ).join('')}
      </div>
      
      <div style="display: flex; gap: 8px;">
        <button class="custom-amount-btn" style="
          flex: 1;
          padding: 6px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: white;
          cursor: pointer;
          font-size: 12px;
        ">Custom Amount</button>
        
        <button class="qr-code-btn" style="
          flex: 1;
          padding: 6px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: white;
          cursor: pointer;
          font-size: 12px;
        ">Show QR</button>
        
        <button class="block-btn" style="
          padding: 6px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: white;
          cursor: pointer;
          font-size: 12px;
          color: #666;
        ">Block</button>
      </div>
    `;

    // Add event listeners
    this.setupPromptEventListeners(prompt, tip);

    return prompt;
  }

  /**
   * Set up event listeners for tip prompt
   */
  private setupPromptEventListeners(prompt: HTMLElement, tip: TipRequest): void {
    // Close button
    const closeBtn = prompt.querySelector('.close-btn');
    closeBtn?.addEventListener('click', () => {
      prompt.remove();
    });

    // Amount buttons
    const amountBtns = prompt.querySelectorAll('.tip-amount-btn');
    amountBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const amount = parseInt(btn.getAttribute('data-amount') || '0');
        this.handleTipPayment(tip, amount);
        prompt.remove();
      });
    });

    // Custom amount button
    const customBtn = prompt.querySelector('.custom-amount-btn');
    customBtn?.addEventListener('click', () => {
      this.handleCustomAmount(tip);
      prompt.remove();
    });

    // QR code button
    const qrBtn = prompt.querySelector('.qr-code-btn');
    qrBtn?.addEventListener('click', () => {
      this.handleShowQR(tip);
      prompt.remove();
    });

    // Block button
    const blockBtn = prompt.querySelector('.block-btn');
    blockBtn?.addEventListener('click', () => {
      this.handleBlockLnurl(tip);
      prompt.remove();
    });

    // Click outside to close
    setTimeout(() => {
      const clickOutsideHandler = (event: Event) => {
        if (!prompt.contains(event.target as Node)) {
          prompt.remove();
          document.removeEventListener('click', clickOutsideHandler);
        }
      };
      document.addEventListener('click', clickOutsideHandler);
    }, 100);
  }

  /**
   * Position prompt near the detected element
   */
  private positionPrompt(prompt: HTMLElement, element: Element): void {
    try {
      const rect = element.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

      // Position to the right of the element, or below if not enough space
      let top = rect.top + scrollTop;
      let left = rect.right + scrollLeft + 10;

      // Check if prompt would go off-screen
      if (left + 300 > window.innerWidth) {
        left = rect.left + scrollLeft - 310;
      }
      
      if (left < 0) {
        left = 10;
        top = rect.bottom + scrollTop + 10;
      }

      prompt.style.top = `${top}px`;
      prompt.style.left = `${left}px`;
    } catch (error) {
      console.error('Failed to position prompt:', error);
      // Fallback positioning
      prompt.style.top = '20px';
      prompt.style.right = '20px';
    }
  }

  /**
   * Handle tip payment
   */
  private async handleTipPayment(tip: TipRequest, amount: number): Promise<void> {
    try {
      console.log(`Processing tip payment: ${amount} sats to ${tip.lnurl}`);
      
      // Check if wallet is connected
      const walletResponse = await ExtensionMessaging.isWalletConnected();
      if (!walletResponse.success || !walletResponse.data) {
        this.showMessage('Please set up your wallet first', 'error');
        return;
      }

      // Check sufficient balance
      const balanceResponse = await ExtensionMessaging.checkSufficientBalance(amount);
      if (!balanceResponse.success || !balanceResponse.data) {
        this.showMessage('Insufficient balance. Please deposit funds.', 'error');
        return;
      }

      // Parse LNURL and pay
      const parseResponse = await ExtensionMessaging.parseLnurl(tip.lnurl);
      if (!parseResponse.success) {
        this.showMessage('Invalid LNURL', 'error');
        return;
      }

      const payResponse = await ExtensionMessaging.payLnurl(parseResponse.data, amount);
      if (payResponse.success) {
        this.showMessage(`Successfully tipped ${amount} sats!`, 'success');
      } else {
        this.showMessage('Payment failed. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Tip payment failed:', error);
      this.showMessage('Payment failed. Please try again.', 'error');
    }
  }

  /**
   * Handle custom amount input
   */
  private handleCustomAmount(tip: TipRequest): void {
    const amount = prompt('Enter custom tip amount (sats):');
    if (amount) {
      const amountNum = parseInt(amount);
      if (!isNaN(amountNum) && amountNum > 0) {
        this.handleTipPayment(tip, amountNum);
      } else {
        this.showMessage('Please enter a valid amount', 'error');
      }
    }
  }

  /**
   * Handle show QR code
   */
  private handleShowQR(tip: TipRequest): void {
    // TODO: Implement QR code display
    console.log('Show QR for:', tip.lnurl);
    this.showMessage('QR code feature coming soon!', 'info');
  }

  /**
   * Handle block LNURL
   */
  private async handleBlockLnurl(tip: TipRequest): Promise<void> {
    try {
      await this.blacklistManager.addToBlacklist(tip.lnurl, 'Blocked by user');
      this.showMessage('LNURL blocked successfully', 'success');
      
      // Remove any existing prompts for this LNURL
      const existingPrompts = document.querySelectorAll('.lightning-tip-prompt');
      existingPrompts.forEach(prompt => {
        // Check if this prompt is for the same LNURL (simplified check)
        if (prompt.textContent?.includes('Lightning Tip Available')) {
          prompt.remove();
        }
      });
    } catch (error) {
      console.error('Failed to block LNURL:', error);
      this.showMessage('Failed to block LNURL', 'error');
    }
  }

  /**
   * Show blacklist indicator
   */
  private showBlacklistIndicator(count: number): void {
    // Remove existing indicator
    const existing = document.querySelector('.lightning-blacklist-indicator');
    if (existing) {
      existing.remove();
    }

    // Create new indicator
    const indicator = this.blacklistManager.createBlacklistIndicator(count);
    document.body.appendChild(indicator);

    // Auto-hide after 10 seconds
    setTimeout(() => {
      indicator.remove();
    }, 10000);
  }

  /**
   * Show temporary message to user
   */
  private showMessage(message: string, type: 'success' | 'error' | 'info'): void {
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
      z-index: 10001;
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
   * Cleanup resources
   */
  public cleanup(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}

// Initialize tip detector when content script loads
const tipDetector = new TipDetector();

// Debug helper - expose to window for testing
(window as any).lightningDebug = {
  getDomainStatus: () => tipDetector.domainManager.getDomainStatus(),
  getBlacklist: () => tipDetector.blacklistManager.getBlacklistedLnurls(),
  refreshIndicator: () => tipDetector.domainManager.updateDomainIndicator()
};

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  tipDetector.cleanup();
});