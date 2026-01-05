# Zap Arc Mobile Wallet

A Lightning Network mobile wallet for iOS and Android, built with React Native and Expo.

## Features

### ⚡ Lightning Network Integration

- **Breez SDK Integration** - Non-custodial Lightning payments
- **Invoice/LNURL Support** - Pay and receive via Lightning invoices, LNURL-pay, LNURL-withdraw
- **Lightning Address** - Send to user@domain.com format addresses
- **QR Code Scanning** - Camera-based QR code scanning for payments

### 🔐 Multi-Wallet Architecture

- **Master Key / Sub-Wallet System** - Create multiple wallets from a single 12-word mnemonic
- **BIP-39 Mnemonic** - Industry-standard recovery phrases
- **Sub-Wallet Derivation** - Up to 20 sub-wallets per master key
- **Wallet Discovery** - Automatic detection of existing sub-wallets on import

### 💡 Tip Requests

- **Multi-Amount Tips** - Configure 3 tip amounts per request
- **QR Code Generation** - Shareable QR codes for tip requests
- **Social Sharing** - Share tips on Twitter/X, Nostr, Telegram, WhatsApp
- **Tip Format** - `[lntip:lnurl:address:amt1:amt2:amt3]`

### 🔒 Security

- **PIN Authentication** - 6-digit PIN protection
- **Biometric Support** - Face ID, Touch ID, Fingerprint unlock
- **Auto-Lock** - Configurable timeout (1-60 minutes)
- **Secure Storage** - Expo SecureStore for sensitive data
- **Encrypted Mnemonics** - PIN-derived key encryption

### 🌐 Multi-Language

- **English & Bulgarian** - Full translation support
- **Location-Based Detection** - Automatic language selection
- **i18n Service** - Extensible translation system

### 📴 Offline Support

- **Balance Caching** - View last known balance offline
- **Transaction History Cache** - Access recent transactions offline
- **Stale Data Indicators** - Visual feedback for outdated data
- **Auto-Sync** - Automatic sync when connectivity restores

## Project Structure

```
mobile-app/
├── src/
│   ├── app/                    # Expo Router navigation
│   ├── features/
│   │   ├── auth/               # User authentication (email/Google)
│   │   └── wallet/
│   │       ├── components/     # Reusable wallet components
│   │       ├── screens/        # Wallet screens
│   │       │   └── settings/   # Settings screens
│   │       └── types.ts        # Wallet type definitions
│   ├── hooks/                  # Custom React hooks
│   │   ├── useWallet.ts        # Wallet state & operations
│   │   ├── useWalletAuth.ts    # PIN/biometric auth
│   │   ├── useLanguage.ts      # i18n hook
│   │   ├── useSettings.ts      # App settings hook
│   │   └── useOfflineSync.ts   # Offline caching hook
│   ├── services/               # Core services
│   │   ├── breezSDKService.ts  # Lightning SDK wrapper
│   │   ├── storageService.ts   # Secure wallet storage
│   │   ├── settingsService.ts  # App settings storage
│   │   ├── i18nService.ts      # Translation service
│   │   ├── locationService.ts  # Location detection
│   │   ├── offlineCacheService.ts  # Offline caching
│   │   ├── securityService.ts  # Auto-lock, biometric
│   │   └── errorHandlingService.ts # Error handling
│   ├── utils/
│   │   ├── mnemonic.ts         # BIP-39 utilities
│   │   └── lnurl.ts            # LNURL utilities
│   └── __tests__/              # Unit tests
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI
- iOS Simulator (Mac) or Android Emulator

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/zap-arc-mobile.git
cd zap-arc-mobile/mobile-app

# Install dependencies
npm install

# Start the development server
npm start
```

### Running on Device

```bash
# iOS
npm run ios

# Android
npm run android

# Web (limited functionality)
npm run web
```

## Configuration

### Environment Variables

Create a `.env` file in the root:

```env
# Breez SDK API Key (required for production)
BREEZ_API_KEY=your_api_key_here

# Backend API URL
API_URL=https://api.zaparc.com
```

### Theming

The app uses React Native Paper with a custom dark theme. Colors are defined in the theme configuration:

- **Primary**: `#FFC107` (Amber)
- **Background**: `#1a1a2e` (Dark Navy)
- **Surface**: `#16213e` (Dark Blue)
- **Accent**: `#0f3460` (Deep Blue)

## Screens

### Authentication Flow

1. **Welcome Screen** - First launch, create/import options
2. **Wallet Creation** - 4-step wizard (generate → backup → verify → PIN)
3. **Wallet Import** - Mnemonic input with validation
4. **PIN Entry** - Unlock with PIN or biometric
5. **Wallet Selection** - Choose from multiple wallets

### Main Tabs

1. **Home** - Balance, quick actions, recent transactions
2. **Scan** - QR code scanner for payments
3. **History** - Full transaction history with filters
4. **Manage** - Wallet management (add, rename, archive, delete)

### Settings

- Wallet configuration (custom LNURL)
- Default amounts (posting, tipping)
- Language selection
- Security settings (auto-lock, biometric)
- Domain management (allowlist)
- Blacklist management
- Backup/Recovery (view mnemonic)

## Services

### StorageService

Manages encrypted wallet data in Expo SecureStore.

```typescript
import { storageService } from './services';

// Store a new wallet
await storageService.saveWallet(masterKeyId, encryptedData);

// Get wallet data
const wallet = await storageService.getWallet(masterKeyId);
```

### BreezSDKService

Wraps the Breez SDK for Lightning operations.

```typescript
import { breezSDKService } from './services';

// Connect to node
await breezSDKService.connect(mnemonic);

// Send payment
const result = await breezSDKService.payInvoice({ bolt11: invoice });

// Receive payment
const invoice = await breezSDKService.receivePayment({ amountSats: 1000 });
```

### SettingsService

Manages app settings in AsyncStorage.

```typescript
import { settingsService } from './services';

// Get settings
const settings = await settingsService.getUserSettings();

// Update settings
await settingsService.updateUserSettings({ language: 'bg' });
```

## Hooks

### useWallet

Main wallet state and operations.

```typescript
const {
  balance,
  transactions,
  masterKeys,
  activeWalletInfo,
  createWallet,
  importWallet,
  switchWallet,
  addSubWallet,
} = useWallet();
```

### useWalletAuth

Authentication state and actions.

```typescript
const {
  isUnlocked,
  biometricAvailable,
  unlock,
  lock,
  verifyPin,
  unlockWithBiometric,
} = useWalletAuth();
```

### useFeedback

User feedback (toasts, dialogs, loading).

```typescript
const { showSuccess, showError, showLoading, confirm } = useFeedback();

// Show toast
showSuccess('Payment sent!');

// Confirm action
const confirmed = await confirm({
  title: 'Delete Wallet',
  message: 'Are you sure?',
  confirmStyle: 'destructive',
});
```

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix
```

## Dependencies

### Core

- **expo** - React Native framework
- **expo-router** - File-based navigation
- **react-native-paper** - Material Design components
- **@tanstack/react-query** - Data fetching

### Wallet

- **bip39** - Mnemonic generation/validation
- **@breeztech/react-native-breez-sdk** - Lightning SDK

### Security

- **expo-secure-store** - Encrypted storage
- **expo-local-authentication** - Biometric auth
- **expo-crypto** - Cryptographic functions

### UI/UX

- **expo-linear-gradient** - Gradient backgrounds
- **expo-camera** - QR code scanning
- **react-native-qrcode-svg** - QR code generation
- **react-native-safe-area-context** - Safe area handling

### Utilities

- **@react-native-community/netinfo** - Network status
- **@react-native-clipboard/clipboard** - Clipboard access
- **expo-sharing** - Native share sheet

## Architecture Notes

### Multi-Wallet System

The wallet uses a hierarchical structure:

- **Master Key** - Derived from 12-word mnemonic
- **Sub-Wallets** - Derived by modifying the 11th word of the mnemonic

Sub-wallet derivation:

1. Take the original 12-word mnemonic
2. Increment the 11th word by N positions in the BIP-39 wordlist
3. Recalculate the 12th word (checksum)
4. Result: A new valid mnemonic that yields a different wallet

### Security Model

- PIN is never stored directly
- Mnemonics are encrypted with a key derived from PIN + salt
- Session management with configurable auto-lock
- Biometric authentication as convenience layer (PIN still required for sensitive operations)

### Offline Strategy

- Balance and transactions cached locally
- Stale data threshold: 5 minutes
- Pending actions queued and synced when online
- Network state monitoring with auto-reconnect

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary software. All rights reserved.

## Support

For issues and feature requests, please create an issue in the GitHub repository.

---

Built with ⚡ by the Zap Arc Team
