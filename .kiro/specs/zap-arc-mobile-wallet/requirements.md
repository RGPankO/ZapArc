# Requirements Document

## Introduction

The Zap Arc Mobile Wallet is a React Native (Expo) mobile application that brings the complete Lightning Network tipping functionality from the browser extension to iOS and Android devices. The app is a standalone frontend application using React Native with Expo Router for navigation, React Native Paper for UI components, and Breez SDK for Lightning Network functionality. The app enables seamless, non-custodial Bitcoin tipping with automatic location-based language switching, comprehensive wallet management, and social media integration for content creators and tippers.

## Glossary

- **Lightning Network**: A second-layer payment protocol that operates on top of Bitcoin blockchain
- **Lightning Address**: Human-readable Lightning Network address in user@domain format (e.g., user@ln.url)
- **LNURL**: Lightning Network URL protocol for simplified Lightning Network interactions
- **Breez SDK**: Software development kit for Lightning Network wallet functionality
- **BIP39**: Bitcoin Improvement Proposal 39 for mnemonic seed phrases
- **Tip Request**: Standardized format for embedding Lightning payment requests in content
- **Expo Router**: File-based routing system for React Native applications
- **React Native Paper**: Material Design component library for React Native
- **AsyncStorage**: Local storage solution for React Native applications
- **Expo SecureStore**: Secure storage for sensitive data on mobile devices
- **Geolocation Service**: Service that determines user's geographic location for language selection
- **Content Creator**: User who posts content and receives tips
- **Tipper**: User who sends Lightning Network payments to content creators

## Requirements

### Requirement 1: Wallet Management and Security

**User Story:** As a mobile user, I want to securely manage my Lightning Network wallet on my mobile device, so that I can control my own funds without relying on custodial services.

#### Acceptance Criteria

1. WHEN a user first opens the app THEN the system SHALL provide an onboarding wizard to generate or import a BIP39 mnemonic seed
2. WHEN a user chooses to generate a new wallet THEN the system SHALL display the 12-word mnemonic seed and require confirmation of backup before proceeding
3. WHEN a user chooses to import a wallet THEN the system SHALL validate the mnemonic format and restore wallet state
4. WHEN storing wallet keys THEN the system SHALL encrypt them using Expo SecureStore with biometric authentication when available
5. WHEN a user opens the app THEN the system SHALL display current Lightning Network balance via Breez SDK
6. WHEN a user requests to receive funds THEN the system SHALL generate a Lightning Network invoice with QR code and share functionality
7. WHEN a user requests to send funds THEN the system SHALL allow payments via QR code scanning, LNURL, Lightning address, or bolt11 invoice
8. WHEN the app is backgrounded for more than 15 minutes THEN the system SHALL require biometric or PIN authentication to unlock

### Requirement 2: Location-Based Language Switching

**User Story:** As a user, I want the app to automatically detect my location and set the appropriate language, so that I can use the app in my preferred language without manual configuration.

#### Acceptance Criteria

1. WHEN the app first launches THEN the system SHALL request location permission with clear explanation of language selection purpose
2. WHEN location permission is granted THEN the system SHALL determine user's country using device location services
3. WHEN the user is located in Bulgaria THEN the system SHALL set Bulgarian as the default language
4. WHEN the user is located outside Bulgaria THEN the system SHALL set English as the default language
5. WHEN location permission is denied THEN the system SHALL default to English and provide manual language selection
6. WHEN a user opens app settings THEN the system SHALL provide a language toggle between Bulgarian and English
7. WHEN a user manually changes language THEN the system SHALL override location-based detection and remember the preference
8. WHEN the app language changes THEN the system SHALL update all UI text, error messages, and user-facing content immediately
9. WHEN generating tip requests or payment descriptions THEN the system SHALL use the selected language for user-generated content

### Requirement 3: Tip Request Creation and Management

**User Story:** As a content creator, I want to easily create and share standardized tip requests from my mobile device, so that followers can tip me using the same format across all platforms.

#### Acceptance Criteria

1. WHEN a user navigates to the tip creation screen THEN the system SHALL provide options to set three suggested tip amounts
2. WHEN creating a tip request THEN the system SHALL generate the standardized format "[lntip:lnurl:<user_lnurl>:<amount1>:<amount2>:<amount3>]"
3. WHEN generating the tip request THEN the system SHALL use the user's LNURL-pay address or Lightning address from their wallet or custom configuration
4. WHEN a tip request is created THEN the system SHALL provide sharing options including copy to clipboard, social media sharing, and QR code generation
5. WHEN sharing via social media THEN the system SHALL format the tip request appropriately for each platform (Twitter, Facebook, Instagram, etc.)
6. WHEN a user has not configured amounts THEN the system SHALL use defaults of 100, 500, 1000 sats
7. WHEN a user saves custom amounts THEN the system SHALL remember these preferences for future tip request creation
8. WHEN generating QR codes THEN the system SHALL create scannable codes containing the full tip request string

### Requirement 4: QR Code Scanning and Payment Processing

**User Story:** As a user who wants to tip content, I want to scan QR codes and process Lightning payments easily from my mobile device, so that I can support creators with minimal friction.

#### Acceptance Criteria

1. WHEN a user opens the QR scanner THEN the system SHALL activate the device camera with appropriate permissions
2. WHEN a Lightning invoice QR code is detected THEN the system SHALL parse the payment details and display confirmation screen
3. WHEN an LNURL or Lightning address QR code is detected THEN the system SHALL parse the address and display payment options with suggested amounts
4. WHEN a tip request QR code is detected THEN the system SHALL parse the standardized format and display the three suggested amounts plus custom input
5. WHEN displaying payment confirmation THEN the system SHALL show amount, recipient information, fee estimate, and current balance
6. WHEN a user confirms payment THEN the system SHALL process the Lightning Network payment via Breez SDK
7. WHEN payment is successful THEN the system SHALL show success confirmation and update transaction history
8. WHEN payment fails THEN the system SHALL display error message with retry option and suggested actions
9. WHEN scanning in low light THEN the system SHALL provide flashlight toggle functionality

### Requirement 5: Social Media Integration and Sharing

**User Story:** As a content creator, I want to easily share my tip requests on social media platforms, so that I can monetize my content across different channels.

#### Acceptance Criteria

1. WHEN a user creates a tip request THEN the system SHALL provide direct sharing buttons for major social platforms
2. WHEN sharing to Twitter/X THEN the system SHALL format the tip request with appropriate hashtags and mention limits
3. WHEN sharing to Facebook THEN the system SHALL format the tip request for Facebook post or story sharing
4. WHEN sharing to Instagram THEN the system SHALL provide options for story sharing with QR code overlay
5. WHEN sharing to Telegram THEN the system SHALL format the tip request for Telegram message sharing
6. WHEN sharing to WhatsApp THEN the system SHALL format the tip request for WhatsApp message sharing
7. WHEN sharing via generic share THEN the system SHALL use the device's native share sheet with the tip request text
8. WHEN sharing includes QR code THEN the system SHALL generate an image combining tip text and QR code for visual sharing

### Requirement 6: Transaction History and Analytics

**User Story:** As a user, I want to view my payment history and basic analytics, so that I can track my Lightning Network activity and earnings.

#### Acceptance Criteria

1. WHEN a user navigates to transaction history THEN the system SHALL display all Lightning Network transactions in chronological order
2. WHEN displaying transactions THEN the system SHALL show amount, type (sent/received), timestamp, description, and status
3. WHEN a user taps a transaction THEN the system SHALL display detailed information including payment hash, preimage, and fees
4. WHEN viewing transaction details THEN the system SHALL provide options to share transaction proof or copy payment details
5. WHEN displaying analytics THEN the system SHALL show total sent, total received, transaction count, and average amounts
6. WHEN viewing analytics THEN the system SHALL provide time-based filtering (day, week, month, year)
7. WHEN transactions are pending THEN the system SHALL show real-time status updates
8. WHEN displaying amounts THEN the system SHALL show values in both satoshis and local currency equivalent

### Requirement 7: Wallet Backup and Recovery

**User Story:** As a user, I want to securely backup and recover my wallet, so that I can restore my funds if I lose my device or need to migrate to a new device.

#### Acceptance Criteria

1. WHEN a user completes wallet setup THEN the system SHALL prompt for mnemonic backup with clear security warnings
2. WHEN displaying mnemonic backup THEN the system SHALL show words one at a time with confirmation requirements
3. WHEN backing up mnemonic THEN the system SHALL require user to verify backup by selecting words in correct order
4. WHEN backup verification fails THEN the system SHALL require user to repeat the backup process
5. WHEN a user chooses to view mnemonic later THEN the system SHALL require biometric or PIN authentication
6. WHEN displaying recovery options THEN the system SHALL provide clear instructions for wallet restoration
7. WHEN importing wallet on new device THEN the system SHALL validate mnemonic and restore transaction history via Breez SDK
8. WHEN backup is incomplete THEN the system SHALL show persistent reminders until backup is verified

### Requirement 8: Settings and Configuration

**User Story:** As a user, I want to configure app settings and preferences, so that the app works according to my needs and preferences.

#### Acceptance Criteria

1. WHEN a user opens settings THEN the system SHALL provide options for language selection, currency display, and notification preferences
2. WHEN configuring default tip amounts THEN the system SHALL allow setting three custom amounts for tip request creation
3. WHEN configuring currency display THEN the system SHALL provide options for satoshis, Bitcoin, and major fiat currencies
4. WHEN setting up custom LNURL THEN the system SHALL validate the LNURL format and test connectivity
5. WHEN configuring notifications THEN the system SHALL provide toggles for payment confirmations, balance updates, and security alerts
6. WHEN enabling biometric authentication THEN the system SHALL verify device capability and set up biometric unlock
7. WHEN configuring network settings THEN the system SHALL provide options for mainnet/testnet selection (development builds only)
8. WHEN exporting settings THEN the system SHALL create encrypted backup of preferences (excluding sensitive wallet data)

### Requirement 9: Offline Functionality and Sync

**User Story:** As a mobile user, I want the app to work partially offline and sync when connectivity returns, so that I can use basic wallet functions even with poor network connectivity.

#### Acceptance Criteria

1. WHEN the device is offline THEN the system SHALL display cached balance and transaction history
2. WHEN creating tip requests offline THEN the system SHALL generate requests using cached LNURL and queue for validation when online
3. WHEN attempting payments offline THEN the system SHALL display appropriate error message and suggest retry when connected
4. WHEN connectivity returns THEN the system SHALL automatically sync balance, transaction history, and pending operations
5. WHEN sync is in progress THEN the system SHALL display sync status indicator
6. WHEN sync fails THEN the system SHALL provide manual refresh option and display last successful sync time
7. WHEN displaying offline data THEN the system SHALL clearly indicate cached/stale information with timestamps
8. WHEN critical operations require connectivity THEN the system SHALL provide clear messaging about network requirements

### Requirement 10: Security and Privacy

**User Story:** As a privacy-conscious user, I want my financial data to remain secure and private, so that my Lightning Network activity is protected from unauthorized access.

#### Acceptance Criteria

1. WHEN storing sensitive data THEN the system SHALL use Expo SecureStore with hardware security module when available
2. WHEN the app is backgrounded THEN the system SHALL hide sensitive information from app switcher/recent apps
3. WHEN taking screenshots THEN the system SHALL prevent screenshots of sensitive screens (mnemonic, private keys, balances)
4. WHEN using biometric authentication THEN the system SHALL fall back to PIN if biometric fails or is unavailable
5. WHEN detecting jailbreak/root THEN the system SHALL display security warning and recommend using non-rooted device
6. WHEN network communication occurs THEN the system SHALL use certificate pinning for all Lightning Network operations
7. WHEN logging errors THEN the system SHALL exclude sensitive information from crash reports and analytics
8. WHEN uninstalling the app THEN the system SHALL provide clear instructions for wallet backup before data loss

### Requirement 11: Multi-Language Support Infrastructure

**User Story:** As a developer, I want robust internationalization support, so that the app can be easily extended to support additional languages in the future.

#### Acceptance Criteria

1. WHEN implementing text content THEN the system SHALL use internationalization keys for all user-facing strings
2. WHEN displaying numbers and currencies THEN the system SHALL use locale-appropriate formatting
3. WHEN displaying dates and times THEN the system SHALL use locale-appropriate formats
4. WHEN handling text input THEN the system SHALL support Unicode characters for both Bulgarian Cyrillic and Latin scripts
5. WHEN displaying UI elements THEN the system SHALL handle text expansion/contraction for different languages
6. WHEN adding new languages THEN the system SHALL support easy addition through translation files
7. WHEN switching languages THEN the system SHALL update all cached strings and force UI refresh
8. WHEN handling right-to-left languages THEN the system SHALL provide RTL layout support infrastructure (future-proofing)

### Requirement 12: Error Handling and User Feedback

**User Story:** As a user, I want clear error messages and feedback, so that I understand what's happening and can take appropriate action when issues occur.

#### Acceptance Criteria

1. WHEN Breez SDK operations fail THEN the system SHALL display user-friendly error messages in the selected language
2. WHEN network connectivity issues occur THEN the system SHALL provide specific guidance for network-related problems
3. WHEN insufficient balance errors occur THEN the system SHALL suggest specific deposit amounts and methods
4. WHEN Lightning Network channel issues arise THEN the system SHALL explain channel concepts in simple terms with suggested actions
5. WHEN payment routing fails THEN the system SHALL suggest alternative payment methods or retry timing
6. WHEN displaying errors THEN the system SHALL provide contextual help and links to support resources
7. WHEN critical errors occur THEN the system SHALL log details for debugging while protecting user privacy
8. WHEN operations succeed THEN the system SHALL provide positive feedback with clear confirmation of completed actions

### Requirement 14: Hierarchical Multi-Wallet Management

**User Story:** As an advanced user, I want to manage multiple master keys with derived sub-wallets, so that I can organize my funds across different purposes while maintaining security and ease of use.

#### Acceptance Criteria

1. WHEN a user creates a new wallet THEN the system SHALL support both single wallets and hierarchical master keys with sub-wallets
2. WHEN creating a master key THEN the system SHALL automatically create a default sub-wallet (index 0) using the original mnemonic
3. WHEN adding sub-wallets THEN the system SHALL derive new mnemonics by incrementing the 11th word of the master key and recalculating the checksum
4. WHEN displaying wallet list THEN the system SHALL show master keys with expandable sub-wallet lists
5. WHEN a master key is expanded THEN the system SHALL display all sub-wallets with their nicknames, balances, and last used timestamps
6. WHEN switching between sub-wallets THEN the system SHALL disconnect current Breez SDK connection and reconnect with derived mnemonic
7. WHEN creating sub-wallets THEN the system SHALL limit to maximum 20 sub-wallets per master key
8. WHEN managing sub-wallets THEN the system SHALL provide options to rename and archive individual sub-wallets
9. WHEN scanning for sub-wallet activity THEN the system SHALL check balances across all derived indices and suggest adding active sub-wallets
10. WHEN displaying active wallet THEN the system SHALL clearly show both master key name and sub-wallet name in the UI
11. WHEN the last sub-wallet of a master key has transaction history THEN the system SHALL enable creation of new sub-wallets for that master key
12. WHEN no sub-wallets have transaction history THEN the system SHALL disable sub-wallet creation until activity is detected

### Requirement 23: Wallet Archive and Deletion Management

**User Story:** As a user, I want to archive unused wallets and permanently delete master wallets when needed, so that I can organize my wallet list while maintaining the ability to restore archived sub-wallets.

#### Acceptance Criteria

1. WHEN managing a master wallet THEN the system SHALL provide options to archive, restore, and permanently delete the master wallet
2. WHEN managing a sub-wallet THEN the system SHALL provide options to archive and restore, but NOT permanently delete
3. WHEN archiving a master wallet THEN the system SHALL move it to an archived section and hide it from the main wallet list
4. WHEN archiving a sub-wallet THEN the system SHALL move it to the archived sub-wallets section under its master key
5. WHEN restoring an archived master wallet THEN the system SHALL return it to the active wallet list with all data intact
6. WHEN restoring an archived sub-wallet THEN the system SHALL return it to the active sub-wallet list under its master key
7. WHEN permanently deleting a master wallet THEN the system SHALL require confirmation and remove all associated data permanently
8. WHEN creating new sub-wallets THEN the system SHALL skip indices that are occupied by archived sub-wallets
9. WHEN displaying archived wallets THEN the system SHALL clearly indicate their archived status and provide restore options
10. WHEN an archived sub-wallet exists at index N THEN the system SHALL use the next available index when creating new sub-wallets
11. WHEN all sub-wallets are archived THEN the system SHALL still allow creation of new sub-wallets at available indices
12. WHEN restoring a sub-wallet THEN the system SHALL maintain its original index and derived mnemonic

### Requirement 15: Domain and Content Management

**User Story:** As a user, I want to control which websites and content sources can display tip requests, so that I can customize my tipping experience and avoid unwanted solicitations.

#### Acceptance Criteria

1. WHEN browsing websites THEN the system SHALL categorize domains as unmanaged, whitelisted, or disabled
2. WHEN a domain is unmanaged THEN the system SHALL detect tip requests but provide options to whitelist or disable the domain
3. WHEN a domain is whitelisted THEN the system SHALL automatically display tip prompts for detected requests
4. WHEN a domain is disabled THEN the system SHALL ignore all tip requests from that domain
5. WHEN managing domains THEN the system SHALL provide a settings screen to view and modify domain status
6. WHEN on a new domain THEN the system SHALL prompt user to set domain preference after first tip detection
7. WHEN domain status changes THEN the system SHALL immediately apply the new behavior without app restart
8. WHEN exporting settings THEN the system SHALL include domain preferences in backup data

### Requirement 16: LNURL Blacklist Management

**User Story:** As a user, I want to block specific LNURL addresses from showing tip prompts, so that I can avoid unwanted or spam tip requests while still seeing legitimate ones.

#### Acceptance Criteria

1. WHEN a tip request is detected THEN the system SHALL check if the LNURL is blacklisted before displaying prompt
2. WHEN displaying a tip prompt THEN the system SHALL include a "Block this LNURL" option
3. WHEN a user blocks an LNURL THEN the system SHALL add it to the blacklist and hide current and future prompts from that address
4. WHEN viewing blacklist settings THEN the system SHALL display all blocked LNURLs with options to unblock
5. WHEN unblocking an LNURL THEN the system SHALL immediately allow tip prompts from that address
6. WHEN managing blacklist THEN the system SHALL provide bulk operations to clear all or selected entries
7. WHEN blacklisted content is detected THEN the system SHALL optionally show a subtle indicator of blocked content
8. WHEN exporting settings THEN the system SHALL include blacklist data in backup

### Requirement 17: Social Platform Sharing Integration

**User Story:** As a content creator, I want to easily share my tip requests on social media platforms, so that I can monetize my content across different channels.

#### Acceptance Criteria

1. WHEN sharing tip requests THEN the system SHALL provide direct sharing buttons for major social platforms (Twitter, Instagram, Telegram, WhatsApp)
2. WHEN sharing to Twitter/X THEN the system SHALL format the tip request with appropriate hashtags and respect character limits
3. WHEN sharing to Instagram THEN the system SHALL provide options for story sharing with QR code overlay
4. WHEN sharing to Telegram THEN the system SHALL format the tip request for Telegram message sharing
5. WHEN sharing to WhatsApp THEN the system SHALL format the tip request for WhatsApp message sharing
6. WHEN sharing via generic share THEN the system SHALL use the device's native share sheet with the tip request text
7. WHEN sharing includes QR code THEN the system SHALL generate an image combining tip text and QR code for visual sharing
8. WHEN configuring sharing preferences THEN the system SHALL allow users to set preferred sharing platforms

### Requirement 19: Lightning Address Support

**User Story:** As a user, I want to use human-readable Lightning addresses (user@domain format), so that I can easily send and receive payments without dealing with complex LNURL strings.

#### Acceptance Criteria

1. WHEN a user enters a Lightning address (user@domain) THEN the system SHALL validate the format and resolve it to the corresponding LNURL endpoint
2. WHEN resolving Lightning addresses THEN the system SHALL convert user@domain to https://domain/.well-known/lnurlp/user format
3. WHEN creating tip requests THEN the system SHALL support both LNURL and Lightning address as the payment destination
4. WHEN scanning QR codes containing Lightning addresses THEN the system SHALL parse and process them identically to LNURL codes
5. WHEN displaying payment destinations THEN the system SHALL show Lightning addresses in their human-readable format when possible
6. WHEN configuring custom payment addresses THEN the system SHALL accept both LNURL and Lightning address formats
7. WHEN validating Lightning addresses THEN the system SHALL check for proper format (user@domain.tld) and domain accessibility
8. WHEN sharing tip requests THEN the system SHALL use Lightning addresses in the standardized format when configured by the user

### Requirement 21: Wallet Selection and PIN Authentication Flow

**User Story:** As a user with multiple wallets, I want a clear authentication flow where I can select any wallet and authenticate with the master wallet's PIN, so that I can securely access my chosen wallet without confusion about which PIN to use.

#### Acceptance Criteria

1. WHEN the app starts and wallets exist THEN the system SHALL display the last used wallet as the default login option
2. WHEN a user is on the login screen THEN the system SHALL provide a "Show All Wallets" option to view all available wallets
3. WHEN a user clicks "Show All Wallets" THEN the system SHALL display a list of all master wallets and their sub-wallets in an organized hierarchy
4. WHEN displaying the wallet list THEN the system SHALL show master wallet names with expandable sub-wallet lists beneath them
5. WHEN a user selects any wallet (master or sub-wallet) THEN the system SHALL prompt for the master wallet's PIN (not a sub-wallet specific PIN)
6. WHEN a user enters the correct master wallet PIN THEN the system SHALL unlock and activate the selected wallet (master or sub-wallet)
7. WHEN a user enters an incorrect PIN THEN the system SHALL display an error and allow retry without changing the selected wallet
8. WHEN a wallet is successfully unlocked THEN the system SHALL remember this as the default wallet for future app launches
9. WHEN switching between sub-wallets of the same master key THEN the system SHALL NOT require re-entering the PIN during the same session
10. WHEN switching to a different master key's wallet THEN the system SHALL require entering that master key's PIN
11. WHEN displaying wallet selection THEN the system SHALL show wallet balances, last used timestamps, and clear visual hierarchy
12. WHEN no PIN is entered within the auto-lock timeout THEN the system SHALL return to the wallet selection screen

### Requirement 20: Code Reuse from Browser Extension

**User Story:** As a developer, I want to copy and adapt non-framework specific logic from the browser extension to the mobile app, refactoring it into React Native best practices, so that I can leverage proven implementations while following optimal patterns for the mobile platform.

#### Acceptance Criteria

1. WHEN implementing wallet management logic THEN the system SHALL copy the core wallet operations from zap-arc and refactor them into React hooks and services optimized for React Native
2. WHEN implementing LNURL operations THEN the system SHALL copy the LNURL parsing, validation, and Lightning address conversion logic from zap-arc/src/utils/lnurl.ts and adapt it for React Native
3. WHEN implementing tip request parsing and generation THEN the system SHALL copy the standardized tip format logic and integrate it into appropriate React hooks
4. WHEN implementing type definitions THEN the system SHALL copy and adapt common types (WalletData, Transaction, UserSettings, etc.) from zap-arc/src/types/index.ts
5. WHEN implementing mnemonic derivation for sub-wallets THEN the system SHALL copy the 11th word increment and checksum recalculation logic as pure utility functions
6. WHEN adapting copied code THEN the system SHALL refactor class-based patterns into React hooks where appropriate (e.g., WalletManager class → useWallet hook)
7. WHEN platform-specific code is required THEN the system SHALL replace Chrome-specific APIs with React Native equivalents (Expo SecureStore, AsyncStorage, etc.)

### Requirement 22: Advanced Settings and Customization

**User Story:** As a power user, I want extensive customization options for wallet configuration, tip amounts, display preferences, and app behavior, so that the app works exactly how I prefer.

#### Acceptance Criteria

**Wallet Configuration:**
1. WHEN configuring wallet source THEN the system SHALL provide a toggle between "Use Built-in Wallet (Breez SDK)" and "Use Custom LNURL for Receiving Tips"
2. WHEN "Use Built-in Wallet" is selected THEN the system SHALL use Breez SDK for full wallet functionality with automatic LNURL generation
3. WHEN "Use Custom LNURL" is selected THEN the system SHALL provide an input field for entering a custom LNURL-pay address
4. WHEN validating custom LNURL THEN the system SHALL verify it starts with "lnurl" and contains valid bech32 characters
5. WHEN custom LNURL is invalid THEN the system SHALL display a clear error message and prevent saving

**Default Amounts:**
6. WHEN configuring posting amounts THEN the system SHALL allow setting three default amounts (in sats) for tip requests when posting content
7. WHEN configuring tipping amounts THEN the system SHALL allow setting three preferred amounts for tipping others
8. WHEN validating amounts THEN the system SHALL enforce maximum of 100,000,000 sats (1 BTC) per amount
9. WHEN validating amounts THEN the system SHALL require all three amounts to be unique positive integers
10. WHEN no custom amounts are set THEN the system SHALL use defaults of 100, 500, 1000 sats for both posting and tipping

**Interface Settings:**
11. WHEN configuring auto-lock timeout THEN the system SHALL provide options: 5 minutes, 15 minutes, 30 minutes, 1 hour, 2 hours, and Never
12. WHEN "Never" auto-lock is selected THEN the system SHALL display a security warning that this is not recommended
13. WHEN auto-lock timeout expires THEN the system SHALL lock the wallet and require PIN/biometric authentication

**Settings Management:**
14. WHEN a user saves settings THEN the system SHALL validate all inputs and provide success/error feedback
15. WHEN a user clicks "Reset to Defaults" THEN the system SHALL restore all settings to their default values after confirmation
16. WHEN settings are changed THEN the system SHALL apply changes immediately without requiring app restart
17. WHEN exporting settings THEN the system SHALL include all non-sensitive configuration in backup data