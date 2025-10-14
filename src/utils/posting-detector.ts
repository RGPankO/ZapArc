// Posting Detector for Lightning Network Tipping Extension
// Handles platform-specific posting context detection and heuristic detection

import { PostingContext } from '../types';

export interface PlatformDetector {
  name: string;
  detect(): PostingContext | null;
  getSelectors(): string[];
}

export interface HeuristicMatch {
  element: HTMLElement;
  confidence: number;
  indicators: string[];
}

export class PostingDetector {
  private platformDetectors: PlatformDetector[] = [];
  private currentDomain: string;

  constructor() {
    this.currentDomain = window.location.hostname;
    this.initializePlatformDetectors();
  }

  /**
   * Initialize platform-specific detectors
   */
  private initializePlatformDetectors(): void {
    this.platformDetectors = [
      new FacebookDetector(),
      new TwitterDetector(),
      new RedditDetector(),
      new LinkedInDetector(),
      new InstagramDetector()
    ];
  }

  /**
   * Detect posting context on current page
   */
  detectPostingContext(): PostingContext | null {
    try {
      // Try platform-specific detection first
      for (const detector of this.platformDetectors) {
        const context = detector.detect();
        if (context) {
          console.log(`Detected posting context via ${detector.name}:`, context);
          return context;
        }
      }

      // Fall back to heuristic detection
      const heuristicContext = this.detectHeuristic();
      if (heuristicContext) {
        console.log('Detected posting context via heuristics:', heuristicContext);
        return heuristicContext;
      }

      return null;
    } catch (error) {
      console.error('Posting detection failed:', error);
      return null;
    }
  }

  /**
   * Heuristic detection for unknown platforms
   */
  private detectHeuristic(): PostingContext | null {
    const candidates = this.findHeuristicCandidates();
    
    if (candidates.length === 0) {
      return null;
    }

    // Sort by confidence and take the best match
    candidates.sort((a, b) => b.confidence - a.confidence);
    const bestMatch = candidates[0];

    if (bestMatch.confidence < 0.5) {
      return null; // Not confident enough
    }

    return {
      element: bestMatch.element,
      platform: 'unknown',
      type: this.inferPostType(bestMatch.element),
      confidence: bestMatch.confidence
    };
  }

  /**
   * Find heuristic candidates
   */
  private findHeuristicCandidates(): HeuristicMatch[] {
    const candidates: HeuristicMatch[] = [];

    // Check textareas
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach(textarea => {
      const match = this.evaluateTextarea(textarea as HTMLTextAreaElement);
      if (match) {
        candidates.push(match);
      }
    });

    // Check contenteditable elements
    const editables = document.querySelectorAll('[contenteditable="true"]');
    editables.forEach(editable => {
      const match = this.evaluateContentEditable(editable as HTMLElement);
      if (match) {
        candidates.push(match);
      }
    });

    return candidates;
  }

  /**
   * Evaluate textarea for posting likelihood
   */
  private evaluateTextarea(textarea: HTMLTextAreaElement): HeuristicMatch | null {
    const indicators: string[] = [];
    let confidence = 0.3; // Base confidence for textarea

    // Check size (larger textareas are more likely to be for posts)
    if (textarea.offsetHeight > 80) {
      confidence += 0.2;
      indicators.push('large-size');
    }

    if (textarea.offsetWidth > 300) {
      confidence += 0.1;
      indicators.push('wide-width');
    }

    // Check placeholder text
    const placeholder = textarea.placeholder?.toLowerCase() || '';
    const postingKeywords = [
      'post', 'share', 'write', 'compose', 'message', 'comment', 'reply',
      'what\'s on your mind', 'what\'s happening', 'tell us', 'your thoughts'
    ];

    for (const keyword of postingKeywords) {
      if (placeholder.includes(keyword)) {
        confidence += 0.3;
        indicators.push(`placeholder-${keyword}`);
        break;
      }
    }

    // Check aria-label
    const ariaLabel = textarea.getAttribute('aria-label')?.toLowerCase() || '';
    for (const keyword of postingKeywords) {
      if (ariaLabel.includes(keyword)) {
        confidence += 0.2;
        indicators.push(`aria-${keyword}`);
        break;
      }
    }

    // Check for nearby submit buttons
    const nearbyButtons = this.findNearbyButtons(textarea);
    const submitKeywords = ['post', 'share', 'send', 'publish', 'submit', 'tweet', 'reply'];
    
    for (const button of nearbyButtons) {
      const buttonText = button.textContent?.toLowerCase() || '';
      for (const keyword of submitKeywords) {
        if (buttonText.includes(keyword)) {
          confidence += 0.2;
          indicators.push(`button-${keyword}`);
          break;
        }
      }
    }

    // Check if it's focused or recently focused
    if (document.activeElement === textarea) {
      confidence += 0.1;
      indicators.push('focused');
    }

    return confidence > 0.4 ? {
      element: textarea,
      confidence: Math.min(confidence, 1.0),
      indicators
    } : null;
  }

  /**
   * Evaluate contenteditable for posting likelihood
   */
  private evaluateContentEditable(element: HTMLElement): HeuristicMatch | null {
    const indicators: string[] = [];
    let confidence = 0.2; // Base confidence for contenteditable

    // Check size
    if (element.offsetHeight > 60) {
      confidence += 0.2;
      indicators.push('large-size');
    }

    // Check role
    const role = element.getAttribute('role');
    if (role === 'textbox') {
      confidence += 0.3;
      indicators.push('textbox-role');
    }

    // Check data attributes that suggest posting
    const dataAttrs = Array.from(element.attributes)
      .filter(attr => attr.name.startsWith('data-'))
      .map(attr => attr.name.toLowerCase());

    const postingDataAttrs = ['data-text', 'data-placeholder', 'data-testid'];
    for (const attr of dataAttrs) {
      if (postingDataAttrs.some(postingAttr => attr.includes(postingAttr))) {
        confidence += 0.2;
        indicators.push(`data-attr-${attr}`);
      }
    }

    // Check for posting-related classes
    const className = element.className.toLowerCase();
    const postingClasses = ['compose', 'editor', 'input', 'text', 'post', 'comment'];
    
    for (const cls of postingClasses) {
      if (className.includes(cls)) {
        confidence += 0.1;
        indicators.push(`class-${cls}`);
      }
    }

    // Check parent context
    const parent = element.parentElement;
    if (parent) {
      const parentClass = parent.className.toLowerCase();
      const parentPostingClasses = ['compose', 'editor', 'post-form', 'comment-form'];
      
      for (const cls of parentPostingClasses) {
        if (parentClass.includes(cls)) {
          confidence += 0.2;
          indicators.push(`parent-${cls}`);
        }
      }
    }

    return confidence > 0.4 ? {
      element,
      confidence: Math.min(confidence, 1.0),
      indicators
    } : null;
  }

  /**
   * Find nearby buttons
   */
  private findNearbyButtons(element: HTMLElement): HTMLElement[] {
    const buttons: HTMLElement[] = [];
    
    // Check siblings
    const parent = element.parentElement;
    if (parent) {
      const siblings = parent.querySelectorAll('button, input[type="submit"], [role="button"]');
      siblings.forEach(button => {
        if (button !== element) {
          buttons.push(button as HTMLElement);
        }
      });
    }

    // Check within 200px radius
    const rect = element.getBoundingClientRect();
    const allButtons = document.querySelectorAll('button, input[type="submit"], [role="button"]');
    
    allButtons.forEach(button => {
      const buttonRect = button.getBoundingClientRect();
      const distance = Math.sqrt(
        Math.pow(buttonRect.left - rect.left, 2) + 
        Math.pow(buttonRect.top - rect.top, 2)
      );
      
      if (distance < 200 && !buttons.includes(button as HTMLElement)) {
        buttons.push(button as HTMLElement);
      }
    });

    return buttons;
  }

  /**
   * Infer post type from element
   */
  private inferPostType(element: HTMLElement): 'post' | 'comment' | 'reply' {
    const context = element.textContent?.toLowerCase() || '';
    const placeholder = (element as any).placeholder?.toLowerCase() || '';
    const ariaLabel = element.getAttribute('aria-label')?.toLowerCase() || '';
    
    const allText = `${context} ${placeholder} ${ariaLabel}`;
    
    if (allText.includes('reply')) {
      return 'reply';
    }
    
    if (allText.includes('comment')) {
      return 'comment';
    }
    
    return 'post';
  }

  /**
   * Get current platform name
   */
  getCurrentPlatform(): string {
    const domain = this.currentDomain.toLowerCase();
    
    if (domain.includes('facebook.com')) return 'facebook';
    if (domain.includes('twitter.com') || domain.includes('x.com')) return 'twitter';
    if (domain.includes('reddit.com')) return 'reddit';
    if (domain.includes('linkedin.com')) return 'linkedin';
    if (domain.includes('instagram.com')) return 'instagram';
    
    return 'unknown';
  }
}

// Facebook-specific detector
class FacebookDetector implements PlatformDetector {
  name = 'Facebook';

  detect(): PostingContext | null {
    if (!window.location.hostname.includes('facebook.com')) {
      return null;
    }

    const selectors = this.getSelectors();
    
    for (const selector of selectors) {
      const element = document.querySelector(selector) as HTMLElement;
      if (element && this.isVisible(element)) {
        return {
          element,
          platform: 'facebook',
          type: this.getPostType(selector),
          groupId: this.extractGroupId()
        };
      }
    }

    return null;
  }

  getSelectors(): string[] {
    return [
      '[contenteditable="true"][role="textbox"]', // Main post area
      '.notranslate[contenteditable="true"]',     // Comment areas
      '[data-testid="status-attachment-mentions-input"]', // Status updates
      '[aria-label*="Write a post"]',             // Post composer
      '[aria-label*="Write a comment"]',          // Comment composer
      '[placeholder*="Write a comment"]',         // Comment input
      '[placeholder*="What\'s on your mind"]'     // Status update
    ];
  }

  private getPostType(selector: string): 'post' | 'comment' | 'reply' {
    if (selector.includes('comment') || selector.includes('Comment')) {
      return 'comment';
    }
    return 'post';
  }

  private extractGroupId(): string | undefined {
    const url = window.location.href;
    const match = url.match(/facebook\.com\/groups\/(\d+)/);
    return match ? match[1] : undefined;
  }

  private isVisible(element: HTMLElement): boolean {
    return element.offsetWidth > 0 && element.offsetHeight > 0;
  }
}

// Twitter/X-specific detector
class TwitterDetector implements PlatformDetector {
  name = 'Twitter';

  detect(): PostingContext | null {
    const hostname = window.location.hostname;
    if (!hostname.includes('twitter.com') && !hostname.includes('x.com')) {
      return null;
    }

    const selectors = this.getSelectors();
    
    for (const selector of selectors) {
      const element = document.querySelector(selector) as HTMLElement;
      if (element && this.isVisible(element)) {
        return {
          element,
          platform: 'twitter',
          type: this.getPostType(selector)
        };
      }
    }

    return null;
  }

  getSelectors(): string[] {
    return [
      '[data-testid="tweetTextarea_0"]',          // Main tweet area
      '.DraftEditor-editorContainer',             // Tweet composer
      '[contenteditable="true"][role="textbox"]', // Reply areas
      '[aria-label*="Tweet text"]',               // Tweet input
      '[aria-label*="Reply"]',                    // Reply input
      '[placeholder*="What is happening"]'        // Tweet placeholder
    ];
  }

  private getPostType(selector: string): 'post' | 'comment' | 'reply' {
    if (selector.includes('Reply') || selector.includes('reply')) {
      return 'reply';
    }
    return 'post';
  }

  private isVisible(element: HTMLElement): boolean {
    return element.offsetWidth > 0 && element.offsetHeight > 0;
  }
}

// Reddit-specific detector
class RedditDetector implements PlatformDetector {
  name = 'Reddit';

  detect(): PostingContext | null {
    if (!window.location.hostname.includes('reddit.com')) {
      return null;
    }

    const selectors = this.getSelectors();
    
    for (const selector of selectors) {
      const element = document.querySelector(selector) as HTMLElement;
      if (element && this.isVisible(element)) {
        return {
          element,
          platform: 'reddit',
          type: this.getPostType(selector),
          subreddit: this.extractSubreddit()
        };
      }
    }

    return null;
  }

  getSelectors(): string[] {
    return [
      '[data-testid="comment-submission-form-richtext"]', // Comment form
      '.public-DraftEditor-content',                      // Post/comment editor
      '[placeholder*="What are your thoughts"]',          // Comment placeholder
      'textarea[name="text"]',                           // Text post
      '.md-editor textarea'                              // Markdown editor
    ];
  }

  private getPostType(selector: string): 'post' | 'comment' | 'reply' {
    if (selector.includes('comment') || selector.includes('Comment')) {
      return 'comment';
    }
    return 'post';
  }

  private extractSubreddit(): string | undefined {
    const url = window.location.href;
    const match = url.match(/reddit\.com\/r\/([^\/]+)/);
    return match ? match[1] : undefined;
  }

  private isVisible(element: HTMLElement): boolean {
    return element.offsetWidth > 0 && element.offsetHeight > 0;
  }
}

// LinkedIn-specific detector
class LinkedInDetector implements PlatformDetector {
  name = 'LinkedIn';

  detect(): PostingContext | null {
    if (!window.location.hostname.includes('linkedin.com')) {
      return null;
    }

    const selectors = this.getSelectors();
    
    for (const selector of selectors) {
      const element = document.querySelector(selector) as HTMLElement;
      if (element && this.isVisible(element)) {
        return {
          element,
          platform: 'linkedin',
          type: 'post'
        };
      }
    }

    return null;
  }

  getSelectors(): string[] {
    return [
      '.ql-editor[contenteditable="true"]',       // Post editor
      '[data-placeholder*="Start a post"]',       // Post placeholder
      '.comments-comment-texteditor',             // Comment editor
      '[placeholder*="Add a comment"]'            // Comment input
    ];
  }

  private isVisible(element: HTMLElement): boolean {
    return element.offsetWidth > 0 && element.offsetHeight > 0;
  }
}

// Instagram-specific detector (limited due to heavy JS)
class InstagramDetector implements PlatformDetector {
  name = 'Instagram';

  detect(): PostingContext | null {
    if (!window.location.hostname.includes('instagram.com')) {
      return null;
    }

    const selectors = this.getSelectors();
    
    for (const selector of selectors) {
      const element = document.querySelector(selector) as HTMLElement;
      if (element && this.isVisible(element)) {
        return {
          element,
          platform: 'instagram',
          type: 'comment'
        };
      }
    }

    return null;
  }

  getSelectors(): string[] {
    return [
      'textarea[placeholder*="Add a comment"]',   // Comment input
      '[aria-label*="Add a comment"]'            // Comment aria-label
    ];
  }

  private isVisible(element: HTMLElement): boolean {
    return element.offsetWidth > 0 && element.offsetHeight > 0;
  }
}