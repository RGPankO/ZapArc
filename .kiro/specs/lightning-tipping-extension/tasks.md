# Implementation Plan

- [x] 1. Set up project structure and core extension framework





  - Create Chrome extension manifest.json with Manifest V3 configuration
  - Set up build system with webpack for bundling Breez SDK Spark
  - Configure TypeScript for type safety and better development experience
  - Create basic directory structure (src/, popup/, content/, background/)
  - _Requirements: 1.1, 2.1, 5.1_

- [x] 2. Implement Breez SDK Spark integration and wallet core



  - [x] 2.1 Initialize Breez SDK Spark with WASM support in background service worker


    - Import and configure @breeztech/breez-sdk-spark package
    - Implement wallet initialization with mnemonic seed support
    - Set up secure storage for encrypted wallet data using Chrome Storage API
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 2.2 Implement core wallet operations using Breez SDK methods


    - Create receivePayment() wrapper for invoice generation
    - Implement sendPayment() for Lightning Network transactions
    - Add listPayments() for transaction history
    - Implement balance checking and wallet status monitoring
    - _Requirements: 1.4, 1.5, 1.6_

  - [x] 2.3 Add LNURL support using Breez SDK Spark LNURL methods


    - Implement parseLnurl() for LNURL parsing and validation
    - Create payLnurl() wrapper for LNURL-pay operations
    - Add receiveLnurlPay() for generating user's LNURL addresses
    - Support custom LNURL configuration for posting
    - _Requirements: 2.4, 11.1_

- [x] 3. Create tip detection and parsing system



  - [x] 3.1 Implement universal tip detection in content scripts


    - Create regex pattern matching for standardized tip format [lntip:lnurl:...]
    - Implement HTML metadata scanning for tip information
    - Add throttled DOM scanning with MutationObserver for performance
    - Create tip request data structure and validation
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 3.2 Build LNURL blacklist management system


    - Implement blacklist storage and checking logic
    - Create blacklist UI components for blocking/unblocking LNURLs
    - Add blacklist detection indicators in floating menu
    - Implement bulk blacklist management in settings
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_

- [x] 4. Develop domain-specific posting system



  - [x] 4.1 Create domain whitelist management


    - Implement domain status tracking (unmanaged/whitelisted/disabled)
    - Create domain management UI with color coding (gray/green/red)
    - Add domain enable/disable functionality via floating menu
    - Store domain preferences in Chrome Storage
    - _Requirements: 8.1, 8.2, 8.3, 9.10, 9.11, 9.12, 9.13, 9.14, 9.15_

  - [x] 4.2 Implement platform-specific posting detection


    - Create Facebook posting context detection with group ID extraction
    - Add Twitter/X posting area detection using platform-specific selectors
    - Implement Reddit posting context identification
    - Build heuristic detection system for unknown websites
    - _Requirements: 2.1, 2.2, 2.7, 2.8_

  - [x] 4.3 Build automatic tip request appending system


    - Create tip string generation with user's LNURL and configured amounts
    - Implement automatic appending when posting contexts are detected
    - Add visual feedback when tip requests are auto-appended
    - Handle Facebook group restrictions and selective posting
    - _Requirements: 2.3, 2.4, 2.5, 2.6, 2.9, 8.6, 8.7, 8.8, 8.9, 8.10_

- [-] 5. Create tipping interface and payment processing

  - [x] 5.1 Build tipping UI overlay system




    - Create non-intrusive tip prompt overlays near detected content
    - Implement 6-button amount selection (3 author + 3 user + custom)
    - Add optional comment field for payment descriptions
    - Create QR code display for external wallet payments
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 5.2 Implement payment processing workflows







    - Create built-in wallet payment flow with confirmation dialogs
    - Add QR code generation for external wallet payments
    - Implement payment status tracking and user feedback
    - Handle payment errors with retry mechanisms and user guidance
    - _Requirements: 4.4, 4.5, 4.6, 4.7_

- [x] 6. Develop floating action menu




  - [x] 6.1 Create persistent floating menu interface



    - Build draggable floating icon with fixed positioning
    - Implement compact menu with essential actions (deposit, withdraw, copy tip string)
    - Add domain management controls with status indicators
    - Create blacklist detection notifications
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9_

  - [x] 6.2 Integrate floating menu with core functionality


    - Connect deposit/withdraw actions to wallet operations
    - Implement tip string copying to clipboard
    - Add domain enable/disable controls
    - Create blacklist management access from floating menu
    - _Requirements: 9.10, 9.11, 9.12, 9.13, 9.14, 9.15, 9.16_

- [ ] 7. Build popup wallet interface
  - [ ] 7.1 Create wallet dashboard and onboarding
    - Design optional onboarding wizard for wallet setup
    - Build balance display with refresh capability
    - Create transaction history interface
    - Implement mnemonic backup confirmation flow
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ] 7.2 Add deposit and withdrawal interfaces
    - Create QR code generator for Lightning Network deposits
    - Build withdrawal interface for Lightning and on-chain payments
    - Add transaction status monitoring and notifications
    - Implement auto-lock functionality with PIN protection
    - _Requirements: 1.5, 1.6, 1.7_

- [ ] 8. Implement comprehensive settings system
  - [ ] 8.1 Create user configuration interface
    - Build LNURL configuration (custom vs built-in wallet)
    - Add default posting amounts configuration (3 values)
    - Create default tipping amounts configuration (3 values)
    - Implement settings validation and error handling
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9_

  - [ ] 8.2 Add Facebook group management settings
    - Create Facebook group ID management interface
    - Implement global vs selective posting toggle
    - Add group detection and prompt system for new groups
    - Build group whitelist management with add/remove functionality
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10_

- [ ] 9. Implement security and storage systems
  - [ ] 9.1 Create encrypted storage system
    - Implement AES encryption for wallet data with PIN-based keys
    - Add secure Chrome Storage API integration
    - Create data validation and integrity checking
    - Build backup and recovery mechanisms
    - _Requirements: 1.3, 6.1, 6.2, 6.3, 6.4_

  - [ ] 9.2 Add privacy and security features
    - Implement auto-lock with configurable timeout
    - Create PIN-based authentication system
    - Add secure key derivation using PBKDF2
    - Ensure no data transmission to external servers
    - _Requirements: 1.7, 6.5, 6.6_

- [ ] 10. Build error handling and reliability systems
  - [ ] 10.1 Implement comprehensive error handling
    - Create user-friendly error messages for Breez SDK failures
    - Add network error handling with retry mechanisms
    - Implement wallet error recovery (insufficient balance, channel issues)
    - Build graceful degradation for platform integration failures
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

  - [ ] 10.2 Add performance optimization and monitoring
    - Implement throttled DOM scanning for tip detection
    - Create efficient storage operations with batching
    - Add memory management for event listeners and DOM references
    - Build performance monitoring and optimization
    - _Requirements: 3.4, 5.5, 5.6_

- [ ] 11. Create comprehensive testing suite
  - [ ]* 11.1 Write unit tests for core functionality
    - Test Breez SDK integration with mocked SDK responses
    - Create tip detection and parsing logic tests
    - Add wallet operations and storage encryption tests
    - Test domain management and blacklist functionality
    - _Requirements: All core functionality_

  - [ ]* 11.2 Implement integration testing
    - Test content script injection and message passing
    - Create platform-specific detection testing (Facebook, Twitter, Reddit)
    - Add QR code generation and LNURL parsing tests
    - Test error handling and recovery mechanisms
    - _Requirements: Cross-component integration_

  - [ ]* 11.3 Build end-to-end testing suite
    - Create complete user flow testing (onboarding, tipping, posting)
    - Test extension behavior on real websites
    - Add security testing for encrypted storage and key management
    - Implement performance testing for DOM scanning and UI responsiveness
    - _Requirements: Complete user experience_

- [ ] 12. Finalize extension packaging and deployment
  - [ ] 12.1 Prepare extension for Chrome Web Store
    - Create extension icons and promotional materials
    - Write comprehensive user documentation and privacy policy
    - Optimize bundle size and performance for production
    - Test extension installation and update processes
    - _Requirements: Production readiness_

  - [ ] 12.2 Implement final polish and optimization
    - Add accessibility features (ARIA labels, keyboard navigation)
    - Create user onboarding tutorials and help system
    - Implement analytics (opt-in) for usage insights
    - Perform final security audit and code review
    - _Requirements: User experience and security_