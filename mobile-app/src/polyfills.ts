// Polyfills for React Native
// Required for packages like bip39 that use Node.js built-ins
// IMPORTANT: Import order matters - crypto must come before buffer

// Polyfill crypto.getRandomValues (required for bip39)
import 'react-native-get-random-values';

// Polyfill Buffer
import { Buffer } from 'buffer';

if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}
