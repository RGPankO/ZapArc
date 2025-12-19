# Lightning Tipping Extension (Tipmaster)

A non-custodial Bitcoin tipping browser extension powered by the Lightning Network and Breez SDK Spark.

## Features

- **Non-Custodial Wallet** - Control your own Lightning funds with BIP39 mnemonic backup
- **Universal Tip Detection** - Automatically detects tip requests on any website
- **Standardized Format** - `[lntip:lnurl:<address>:<amount1>:<amount2>:<amount3>]`
- **Floating Action Menu** - Quick access to deposit, withdraw, and copy tip strings
- **Domain Management** - Whitelist/blacklist domains for automatic tip appending
- **LNURL Blocking** - Block unwanted tip requests from specific addresses
- **QR Code Generation** - Pay with external wallets via QR codes
- **Platform Detection** - Smart posting detection for Facebook, Twitter, Reddit

## Quick Start

```bash
# Install dependencies
npm install

# Development build with watch
npm run dev

# Production build
npm run build

# Type check
npm run type-check
```

Load the extension:
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `dist/` folder

## Project Structure

```
src/
├── background/        # Service worker
├── content/           # Content scripts (page injection)
├── popup/             # Extension popup UI
├── settings/          # Settings page
├── types/             # TypeScript definitions
└── utils/             # Shared utilities
    ├── breez-sdk.ts       # Breez SDK integration
    ├── wallet-manager.ts  # Wallet state management
    ├── payment-processor.ts
    ├── lnurl.ts
    ├── floating-menu.ts
    ├── tipping-ui.ts
    └── ...
```

## Tip Format

Standard format for embedding tip requests:

```
[lntip:lnurl:lnurl1dp68gurn...:100:500:1000]
```

- `lnurl1dp68gurn...` - Your LNURL-pay address
- `100:500:1000` - Suggested tip amounts in sats

Also supports HTML metadata:
```html
<meta name="lntip" content="lnurl:...:100:500:1000">
```

## Testing

Use `test.html` to test tip detection functionality locally.

## Development Resources

- `.claude/docs/ARCHITECTURE_GUIDE.md` - Project architecture details
- `.kiro/specs/lightning-tipping-extension/` - Kiro specification documents
- `BREEZ_SDK_SETUP.md` - Breez SDK configuration notes
- `CURRENT_FUNCTIONALITY_GUIDE.md` - Current feature status

## Current Status

**Working:**
- Wallet setup with PIN encryption
- Tip detection and parsing
- QR code generation
- Floating menu and tipping UI
- Domain/LNURL management

**In Progress:**
- Multi-wallet support
- Lightning address/LNURL-pay integration
- Full Breez SDK connectivity

## Tech Stack

- TypeScript
- Webpack
- Chrome Extension APIs (Manifest V3)
- Breez SDK Spark
- LNURL protocol

## License

Private - All rights reserved
