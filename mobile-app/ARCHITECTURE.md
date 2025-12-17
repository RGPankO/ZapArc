# Mobile App Architecture

## Directory Structure

```
mobile-app/
├── app/                           # Routes (Expo Router)
│   ├── (main)/                   # Main app screens
│   ├── auth/                     # Auth screens
│   └── _layout.tsx
│
├── src/
│   ├── features/                 # 🎨 Business features
│   │   ├── payments/
│   │   │   ├── components/      # PaymentConfirmationModal, etc.
│   │   │   ├── hooks/          # usePayment
│   │   │   └── index.ts
│   │   │
│   │   ├── ads/
│   │   │   ├── components/      # BannerAd, InterstitialAd
│   │   │   ├── hooks/          # useAds, useInterstitialAd
│   │   │   └── index.ts
│   │   │
│   │   └── profile/
│   │       ├── hooks/          # useUser
│   │       └── index.ts
│   │
│   ├── components/              # All UI components
│   │   ├── GoogleSignInButton.tsx
│   │   └── ui/                 # Generic UI components
│   │
│   ├── hooks/                   # All hooks
│   │   ├── useAuth.ts
│   │   ├── useGoogleAuth.ts
│   │   └── ...
│   │
│   ├── services/                # Services
│   │   └── tokenService.ts
│   │
│   ├── lib/                     # Infrastructure
│   │   └── apiClient.ts
│   │
│   ├── utils/                   # Utilities
│   ├── config/                  # Configuration
│   └── types/                   # Global types
```

## Organizational Principles

### Features vs Top-Level

**Features (`features/`)**: Discrete business capabilities that could be removed/toggled

- payments
- ads
- profile
- notifications (future)

**Top-Level**: Core functionality and shared utilities

- Auth (hooks, components, services)
- Generic UI components
- Utilities and infrastructure

### Decision Rule

**Ask:** Is this a discrete business feature that could be removed?

- **YES** → `features/{name}/`
- **NO** → top-level directory

Examples:

- Auth? NO → top-level (core to app)
- Payments? YES → `features/payments/`
- API client? NO → `lib/`
