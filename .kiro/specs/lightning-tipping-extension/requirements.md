# Requirements Document

## Introduction

The Lightning Network Tipping Browser Extension enables seamless, non-custodial Bitcoin tipping via the Lightning Network on any website, with a focus on social platforms like Facebook groups, WordPress sites, and other web platforms. The extension standardizes the tipping format across all platforms to ensure universal interoperability without requiring user configuration. Users can automatically append standardized tip requests to their posts or comments, detect tip requests in page content (via text or metadata), and send tips using an integrated wallet powered by Breez SDK Spark.

The extension promotes community engagement in crypto-friendly groups by making tipping frictionless, private, and universal while maintaining a consistent user experience across all supported platforms.

## Requirements

### Requirement 1: Wallet Management and Security

**User Story:** As a user, I want to securely manage my Lightning Network wallet within the browser extension, so that I can control my own funds without relying on custodial services.

#### Acceptance Criteria

1. WHEN a user first installs the extension THEN the system SHALL provide an optional onboarding wizard to generate or import a BIP39 mnemonic seed
2. WHEN a user chooses to set up a wallet THEN the system SHALL display the mnemonic seed and require confirmation of backup before proceeding
3. WHEN a user skips wallet setup THEN the system SHALL still allow tip detection, QR code generation, and domain management functionality
3. WHEN a user stores wallet keys THEN the system SHALL encrypt them using AES encryption with a user-provided PIN
4. WHEN a user opens the extension popup THEN the system SHALL display current Lightning Network balance via Breez SDK
5. WHEN a user requests to deposit funds THEN the system SHALL generate a Lightning Network invoice with QR code
6. WHEN a user requests to withdraw funds THEN the system SHALL allow sending to Lightning addresses or on-chain Bitcoin addresses
7. IF the extension is idle for more than 15 minutes THEN the system SHALL auto-lock and require PIN re-entry

### Requirement 2: Domain-Specific Tip Request Appending

**User Story:** As a content creator, I want to easily add standardized tip requests to my posts and comments on supported social platforms, so that community members can tip me using the same format everywhere.

#### Acceptance Criteria

1. WHEN a user is on a whitelisted domain (pre-configured social platforms or user-added domains) THEN the system SHALL enable tip request functionality
2. WHEN the system detects a posting context (post creation, comment composition) on whitelisted domains THEN it SHALL automatically append the standardized tip request format
3. WHEN appending the tip request THEN the system SHALL add the format: "\n[lntip:lnurl:<user_lnurl>:<amount1>:<amount2>:<amount3>]" immediately when the text area is detected
4. WHEN generating the tip request THEN the system SHALL use the user's configured LNURL-pay address (custom LNURL or derived from built-in wallet)
5. WHEN a user has not configured a custom LNURL and has no wallet THEN the system SHALL prompt to either set up wallet or provide custom LNURL before enabling posting
6. WHEN appending tip requests THEN the system SHALL use the user's configured default posting amounts (defaulting to 100, 500, 1000 sats if not set)
6. WHEN on Facebook THEN the system SHALL respect group restrictions per Requirement 8 before enabling tip request functionality
7. WHEN detecting posting contexts THEN the system SHALL use platform-specific selectors for known platforms (Facebook, Twitter, Reddit) and heuristic detection for user-added domains
8. WHEN on user-added domains THEN the system SHALL use heuristics (large text areas, contenteditable elements, placeholder text patterns) to identify potential posting contexts
9. WHEN the tip request is auto-appended THEN the system SHALL provide visual indication that the text was added automatically
10. WHEN a user has insufficient balance THEN the system SHALL warn before allowing tip request creation
11. WHEN on non-whitelisted domains THEN the system SHALL NOT offer tip request appending functionality

### Requirement 3: Universal Tip Detection and Parsing

**User Story:** As a user browsing content, I want the extension to automatically detect tip requests in posts and comments, so that I can easily tip content creators without manual searching.

#### Acceptance Criteria

1. WHEN a page loads or content changes THEN the system SHALL scan for the pattern "[lntip:lnurl:<lnurl>:<amount1>:<amount2>:<amount3>]" in visible text
2. WHEN scanning pages THEN the system SHALL also check HTML metadata with name="lntip" for hidden tip integration
3. WHEN tip requests are detected THEN the system SHALL parse the LNURL and three suggested amounts
4. WHEN scanning content THEN the system SHALL throttle scans to maximum once per second to avoid performance impact
5. WHEN multiple tip requests exist on a page THEN the system SHALL detect and handle each one independently
6. IF the tip request format is malformed THEN the system SHALL ignore it and continue scanning

### Requirement 4: Tipping Interface and Payment Processing

**User Story:** As a user who wants to tip content, I want a simple and intuitive interface to send Lightning Network payments, so that I can support creators with minimal friction.

#### Acceptance Criteria

1. WHEN a tip request is detected AND not blacklisted THEN the system SHALL display a non-intrusive notification or overlay near the content
2. WHEN displaying the tipping interface THEN the system SHALL show 6 amount options: 3 author-suggested + 3 user-configured tipping defaults + custom input field + optional comment field + "Show QR Code" button
3. WHEN a user selects "Show QR Code" THEN the system SHALL generate and display a QR code for the LNURL payment for external wallet scanning
4. WHEN a user selects a tip amount AND has a configured wallet THEN the system SHALL display a confirmation dialog with fee estimate and current balance
5. WHEN a user confirms a tip with built-in wallet THEN the system SHALL use Breez SDK to process the Lightning Network payment via the parsed LNURL, including any user-provided comment as the payment description
6. WHEN a user selects a tip amount AND has no configured wallet THEN the system SHALL generate and display a QR code for external wallet payment
5. WHEN a payment is successful THEN the system SHALL show a success message and update local transaction history
6. IF a payment fails THEN the system SHALL display an error message and suggest retry or deposit more funds
7. IF the user has insufficient balance THEN the system SHALL prompt to deposit funds before allowing the tip

### Requirement 5: Multi-Platform Compatibility and Standardization

**User Story:** As a user, I want the extension to work identically on all websites without configuration, so that I have a consistent tipping experience regardless of the platform.

#### Acceptance Criteria

1. WHEN the extension is installed THEN it SHALL work on all websites without requiring site-specific configuration
2. WHEN detecting or appending tips THEN the system SHALL use the same standardized format across Facebook, Twitter, Reddit, WordPress, and all other websites
3. WHEN running on different platforms THEN the system SHALL provide identical functionality without platform-specific rules
4. WHEN websites include tip metadata (regardless of how it was added) THEN the system SHALL detect metadata-based tip requests seamlessly
5. WHEN content is dynamically loaded (e.g., infinite scroll) THEN the system SHALL continue detecting new tip requests
6. WHEN websites update their DOM structure THEN the system SHALL maintain functionality through robust element detection

### Requirement 6: Privacy and Data Management

**User Story:** As a privacy-conscious user, I want my tipping activity to remain private and under my control, so that my financial interactions are not tracked or shared without consent.

#### Acceptance Criteria

1. WHEN processing tips THEN the system SHALL store transaction history only locally in the browser
2. WHEN collecting usage data THEN the system SHALL make all analytics opt-in with clear disclosure
3. WHEN storing sensitive data THEN the system SHALL encrypt wallet keys and never transmit them to external servers
4. WHEN a user uninstalls the extension THEN the system SHALL provide clear instructions for backing up wallet data
5. WHEN operating THEN the system SHALL not track user browsing behavior beyond tip-related activities
6. IF the user chooses to share data THEN the system SHALL anonymize all personal information

### Requirement 8: Facebook Group Management and Selective Posting

**User Story:** As a user, I want to control which Facebook groups allow tip request appending, so that I can selectively enable tipping functionality only in appropriate communities.

#### Acceptance Criteria

1. WHEN a user opens the extension settings THEN the system SHALL provide a toggle option between "Global Facebook posting" and "Selective group posting"
2. WHEN "Selective group posting" is enabled THEN the system SHALL provide an interface to manage allowed Facebook group IDs
3. WHEN a user manually enters a Facebook group ID THEN the system SHALL validate the format and add it to the allowed list
4. WHEN a user visits a Facebook group URL (pattern: facebook.com/groups/[groupId]) THEN the system SHALL detect the group ID from the URL
5. WHEN visiting an unrecognized Facebook group AND "Selective group posting" is enabled THEN the system SHALL display a non-intrusive prompt asking "Add this group for tipping?"
6. WHEN a user clicks "Yes" on the group prompt THEN the system SHALL add the group ID to the allowed list and enable tip request functionality
7. WHEN a user clicks "No" on the group prompt THEN the system SHALL remember this choice and not prompt again for this specific group
8. WHEN "Add Tip Request" is triggered on Facebook THEN the system SHALL only function if global mode is enabled OR the current group is in the allowed list
9. WHEN a user removes a group from the allowed list THEN the system SHALL disable tip request functionality for that group immediately
10. WHEN no groups are configured in selective mode THEN the system SHALL not show "Add Tip Request" options on any Facebook groups until groups are added

### Requirement 9: Floating Action Menu

**User Story:** As a user, I want quick access to common tipping functions while browsing any website, so that I can manage my wallet and get tip strings without opening the extension popup.

#### Acceptance Criteria

1. WHEN visiting any website THEN the system SHALL display a small, permanent floating icon in a fixed position (e.g., bottom-right corner)
2. WHEN a user clicks the floating icon THEN the system SHALL display a compact menu with quick actions
3. WHEN the floating menu is displayed THEN it SHALL include options for "Deposit Funds", "Withdraw Funds", "Copy Tip String", and domain management controls
4. WHEN a user selects "Deposit Funds" from the floating menu THEN the system SHALL generate and display a Lightning Network invoice with QR code
5. WHEN a user selects "Withdraw Funds" from the floating menu THEN the system SHALL open a compact withdrawal interface
6. WHEN a user selects "Copy Tip String" from the floating menu THEN the system SHALL copy the user's standardized tip request format to clipboard
7. WHEN the tip string is copied THEN the system SHALL show a brief confirmation message (e.g., "Tip string copied!")
8. WHEN a user clicks outside the floating menu THEN the system SHALL close the menu automatically
9. WHEN the floating icon might interfere with website content THEN the system SHALL make it draggable to different positions
10. WHEN displaying domain management THEN the system SHALL show current domain status with color coding: gray (unmanaged), green (whitelisted), red (disabled)
11. WHEN a user clicks domain management on an unmanaged domain THEN the system SHALL offer options to "Enable Tipping" or "Disable Tipping"
12. WHEN a user clicks domain management on a whitelisted domain THEN the system SHALL offer option to "Disable Tipping"
13. WHEN a user clicks domain management on a disabled domain THEN the system SHALL offer option to "Enable Tipping"
14. WHEN a user enables tipping on a domain THEN the system SHALL immediately start auto-appending tip requests in detected posting contexts
15. WHEN a user disables tipping on a domain THEN the system SHALL stop auto-appending tip requests but continue detecting tips for reading
16. WHEN a user wants to hide the floating icon THEN the system SHALL provide a setting to disable it in the extension configuration

### Requirement 10: LNURL Blacklist Management

**User Story:** As a user, I want to block annoying or unwanted tip requests from specific LNURLs, so that I can browse without being bothered by certain creators while still seeing other tip opportunities.

#### Acceptance Criteria

1. WHEN a tip request is detected THEN the system SHALL check if the LNURL is blacklisted before showing the prompt
2. WHEN displaying a tipping interface THEN the system SHALL include a "Block this LNURL" option
3. WHEN a user selects "Block this LNURL" THEN the system SHALL add it to the blacklist and hide the current prompt
4. WHEN blacklisted LNURLs are detected on a page THEN the floating menu SHALL show an indicator for "Blocked tips detected"
5. WHEN a user clicks "Blocked tips detected" THEN the system SHALL display a list of blocked LNURLs found on the current page
6. WHEN viewing blocked LNURLs THEN the system SHALL provide an "Unblock" option for each LNURL
7. WHEN a user unblocks an LNURL THEN the system SHALL remove it from the blacklist and immediately show any tip prompts for that LNURL on the current page
8. WHEN managing blacklisted LNURLs in settings THEN the system SHALL provide a complete list with bulk unblock options

### Requirement 11: User Configuration and Customization

**User Story:** As a user, I want to configure my LNURL source and default tipping amounts for both posting and paying, so that the extension works with my preferred wallet setup and reflects my tipping habits.

#### Acceptance Criteria

1. WHEN a user opens the extension settings THEN the system SHALL provide options to configure custom LNURL-pay address or use built-in wallet
2. WHEN a user opens the extension settings THEN the system SHALL provide configuration options for default posting amounts (3 values)
3. WHEN a user opens the extension settings THEN the system SHALL provide configuration options for default tipping amounts (3 values)
4. WHEN a user has not configured posting amounts THEN the system SHALL use defaults of 100, 500, 1000 sats
5. WHEN a user has not configured tipping amounts THEN the system SHALL use defaults of 100, 500, 1000 sats
6. WHEN a user updates their posting amounts THEN future tip requests SHALL use the new configured values
7. WHEN a user updates their tipping amounts THEN future tipping prompts SHALL display the new configured values alongside author-suggested amounts
8. WHEN displaying tipping options THEN the system SHALL clearly distinguish between author-suggested amounts and user-configured amounts
9. WHEN a user saves configuration changes THEN the system SHALL validate that amounts are positive integers and provide feedback

### Requirement 12: Error Handling and Reliability

**User Story:** As a user, I want the extension to handle errors gracefully and provide clear feedback, so that I understand what's happening and can take appropriate action.

#### Acceptance Criteria

1. WHEN Breez SDK operations fail THEN the system SHALL display user-friendly error messages with suggested actions
2. WHEN network connectivity is poor THEN the system SHALL queue payments for retry when connection improves
3. WHEN the extension encounters unexpected errors THEN the system SHALL log details for debugging while protecting user privacy
4. WHEN Lightning Network channels are unavailable THEN the system SHALL suggest alternative actions like on-chain deposits
5. WHEN parsing tip requests fails THEN the system SHALL continue operating without disrupting the user's browsing experience
6. IF the Breez service is temporarily unavailable THEN the system SHALL provide fallback options like manual LNURL copying
7. WHEN balance is insufficient for fees THEN the system SHALL clearly explain the shortfall and suggest deposit amounts