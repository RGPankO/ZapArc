# Mobile App

React Native Expo frontend for the Mobile App Skeleton.

## Structure

```
src/
├── components/     # Reusable UI components
├── screens/        # Screen components
├── services/       # API services
├── utils/          # Utility functions
├── types/          # TypeScript type definitions
├── hooks/          # Custom React hooks
├── context/        # React context providers
├── navigation/     # Navigation configuration
└── __tests__/      # Test files
```

## Features

- Cross-platform support (iOS, Android, Web)
- TypeScript for type safety
- Expo for rapid development
- Modular component architecture
- Theme support for white-labeling
- Authentication flow
- Premium subscription handling
- Advertisement integration

## Screens (to be implemented)

- Welcome Screen
- Registration Screen
- Login Screen
- Email Verification Screen
- Profile Screen
- Settings Screen
- Premium Purchase Screen

## Components (to be implemented)

- ThemeProvider
- BrandingWrapper
- ConfigurableButton
- ConfigurableInput
- BannerAd
- InterstitialAd
- AdManager

## Development

```bash
# Install dependencies
npm install

# Start Expo development server
npm start

# Run on specific platform
npm run ios
npm run android
npm run web

# Run tests
npm test

# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix
```

## Configuration

Create a `.env` file in the project root:

```
EXPO_PUBLIC_API_URL=http://localhost:3000
```

## Building

```bash
# Build for production
expo build:ios
expo build:android
expo build:web
```