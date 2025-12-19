# Architecture Guide - Lightning Tipping Extension

> **Context Loading**: This file is REFERENCED, not loaded. Main Claude should refer to this when making architectural decisions.

## Project Overview

**Lightning Tipping Extension (Tipmaster)** - A Chrome/browser extension enabling seamless, non-custodial Bitcoin tipping via the Lightning Network. Uses Breez SDK Spark for wallet functionality.

### Core Technologies
- **TypeScript** - Primary language
- **Webpack** - Build system
- **Chrome Extension APIs** - Browser integration
- **Breez SDK Spark** - Lightning Network connectivity
- **LNURL** - Payment protocol

## Project Structure

```
tipmaster/
├── src/
│   ├── background/        # Service worker (background.ts)
│   ├── content/           # Content scripts for page injection
│   ├── popup/             # Extension popup UI
│   ├── settings/          # Settings page
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Shared utilities
│       ├── breez-sdk.ts       # Breez SDK integration
│       ├── wallet-manager.ts  # Wallet state management
│       ├── payment-processor.ts # Payment handling
│       ├── lnurl.ts           # LNURL parsing/handling
│       ├── floating-menu.ts   # Floating UI component
│       ├── tipping-ui.ts      # Tip prompt interface
│       ├── posting-detector.ts # Social platform detection
│       ├── domain-manager.ts  # Domain whitelist/blacklist
│       ├── blacklist-manager.ts # LNURL blocking
│       ├── storage.ts         # Chrome storage abstraction
│       ├── messaging.ts       # Extension messaging
│       └── qr-generator.ts    # QR code generation
├── dist/                  # Build output
├── icons/                 # Extension icons
├── .kiro/specs/           # Kiro specification documents
└── manifest.json          # Extension manifest
```

## Layered Architecture

### Presentation Layer
- **Popup UI** (`src/popup/`) - Main extension interface
- **Settings Page** (`src/settings/`) - Configuration UI
- **Floating Menu** (`src/utils/floating-menu.ts`) - On-page quick actions
- **Tipping UI** (`src/utils/tipping-ui.ts`) - Tip detection prompts

### Business Logic Layer
- **Wallet Manager** (`src/utils/wallet-manager.ts`) - Wallet state, encryption, PIN
- **Payment Processor** (`src/utils/payment-processor.ts`) - Payment flow logic
- **Posting Detector** (`src/utils/posting-detector.ts`) - Social platform detection

### Data/Integration Layer
- **Breez SDK** (`src/utils/breez-sdk.ts`) - Lightning Network connectivity
- **Storage** (`src/utils/storage.ts`) - Chrome storage abstraction
- **LNURL** (`src/utils/lnurl.ts`) - LNURL protocol handling

### Cross-Cutting Concerns
- **Messaging** (`src/utils/messaging.ts`) - Background/content communication
- **Domain Manager** (`src/utils/domain-manager.ts`) - Whitelist/blacklist
- **Blacklist Manager** (`src/utils/blacklist-manager.ts`) - LNURL blocking

## Extension Communication Patterns

### Message Flow
```
Content Script ←→ Background Service Worker ←→ Popup/Settings
      ↓                    ↓
   Page DOM          Breez SDK / Storage
```

### Message Types
- Wallet operations (setup, unlock, balance)
- Payment requests/confirmations
- Domain status queries
- Tip detection notifications

## Key Design Patterns

### Service Worker Pattern
Background script acts as central coordinator:
- Handles wallet operations
- Processes payments
- Manages persistent state
- Routes messages between components

### Content Script Isolation
Content scripts run in page context:
- Detect tip patterns in DOM
- Inject floating menu and tip prompts
- Communicate with background via messaging

### Secure Storage Pattern
Wallet data encryption:
- PIN-based key derivation
- AES encryption for sensitive data
- Chrome storage API for persistence
- Auto-lock after inactivity

## Tip Detection Format

Standard format: `[lntip:lnurl:<LNURL>:<amount1>:<amount2>:<amount3>]`

Example: `[lntip:lnurl:lnurl1dp68gurn...:100:500:1000]`

Also supports HTML metadata: `<meta name="lntip" content="...">`

## Code Quality Standards

### Module Characteristics
- High cohesion within utility modules
- Clear separation between UI and logic
- Independent testability
- Single, focused purpose per file

### Error Handling
- Graceful degradation when Breez SDK unavailable
- User-friendly error messages
- Fallback to QR code generation
- Payment retry mechanisms

### Security Considerations
- No external data transmission of wallet keys
- PIN-protected wallet access
- Encrypted local storage
- LNURL validation before payments

## Performance Guidelines

- Throttle tip detection scans (max once per second)
- Lazy load Breez SDK when needed
- Efficient DOM scanning for dynamic content
- Minimize background script activity

## Development Workflow

### Build Commands
```bash
npm run dev        # Development with watch
npm run build      # Production build
npm run type-check # TypeScript validation
```

### Testing
- Load unpacked extension from `dist/`
- Use `test.html` for tip detection testing
- Check browser console for debug logs

## Future Considerations

- Multi-wallet support infrastructure (in progress)
- Lightning address support (implemented)
- LNURL-pay integration
- Cross-browser compatibility (Firefox, Edge)
