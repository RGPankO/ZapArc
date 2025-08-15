# Google OAuth Setup Guide

This guide will help you set up Google OAuth authentication for your mobile app.

## 1. Google Cloud Console Setup

### Step 1: Create a Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API and Google Sign-In API

### Step 2: Create OAuth 2.0 Credentials
1. Go to "Credentials" in the left sidebar
2. Click "Create Credentials" → "OAuth 2.0 Client IDs"
3. Create credentials for:
   - **Web application** (for backend verification)
   - **Android** (if building for Android)
   - **iOS** (if building for iOS)

### Step 3: Configure Redirect URIs
For the **Web application** client, add these authorized redirect URIs:
- `mobile-app://auth` (for your custom app scheme)
- `https://auth.expo.io/@your-username/mobile-app` (for Expo Go development)
- `exp://localhost:8081/--/auth` (for local Expo development)

### Step 4: Configure OAuth Consent Screen
1. Go to "OAuth consent screen"
2. Fill in the required information:
   - App name
   - User support email
   - Developer contact information
3. Add scopes: `email`, `profile`, `openid`

## 2. Backend Configuration

### Update Environment Variables
Add to your `backend/.env` file:
```env
GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```

### Install Dependencies
```bash
cd backend
npm install google-auth-library
```

## 3. Mobile App Configuration

### Install Dependencies
```bash
cd mobile-app
npm install @react-native-google-signin/google-signin
```

### Update Google Service Configuration

#### For Android:
1. Download `google-services.json` from Google Cloud Console
2. Place it in `mobile-app/android/app/`
3. Update `mobile-app/src/services/googleAuthService.ts`:
   ```typescript
   webClientId: 'your-web-client-id.apps.googleusercontent.com'
   ```

#### For iOS:
1. Download `GoogleService-Info.plist` from Google Cloud Console
2. Add it to your iOS project in Xcode
3. Update `mobile-app/ios/YourApp/Info.plist`:
   ```xml
   <key>CFBundleURLTypes</key>
   <array>
     <dict>
       <key>CFBundleURLName</key>
       <string>REVERSED_CLIENT_ID</string>
       <key>CFBundleURLSchemes</key>
       <array>
         <string>your-reversed-client-id</string>
       </array>
     </dict>
   </array>
   ```

### Update App Configuration

#### For Expo (if using):
Add to `app.json`:
```json
{
  "expo": {
    "plugins": [
      "@react-native-google-signin/google-signin"
    ],
    "android": {
      "googleServicesFile": "./google-services.json"
    },
    "ios": {
      "googleServicesFile": "./GoogleService-Info.plist"
    }
  }
}
```

## 4. Testing

1. Start your backend server:
   ```bash
   cd backend
   npm run dev
   ```

2. Start your mobile app:
   ```bash
   cd mobile-app
   npm start
   ```

3. Test Google Sign-In:
   - Tap "Continue with Google" on login/register screens
   - Complete the Google authentication flow
   - Verify successful login and token storage

## 5. Important Notes

- **Web Client ID**: Use the web client ID (not Android/iOS) in your mobile app configuration
- **SHA-1 Fingerprints**: For Android, add your debug and release SHA-1 fingerprints to Google Cloud Console
- **Bundle ID**: For iOS, ensure the bundle ID matches what's configured in Google Cloud Console
- **Testing**: Use real devices or emulators with Google Play Services for testing

## 6. Security Considerations

- Never expose client secrets in mobile apps
- Always verify ID tokens on your backend
- Use HTTPS for all backend communications
- Implement proper token refresh logic
- Store tokens securely using platform-specific secure storage

## 7. Troubleshooting

### Common Issues:

1. **"Google Play Services not available"**
   - Ensure Google Play Services is installed on the device/emulator
   - Use a real device or Google Play-enabled emulator

2. **"Invalid client ID"**
   - Verify the web client ID is correct
   - Check that the SHA-1 fingerprint is added (Android)
   - Verify bundle ID matches (iOS)

3. **"Sign-in cancelled"**
   - This is normal user behavior, handle gracefully
   - Don't show error alerts for cancellation

4. **Backend verification fails**
   - Ensure GOOGLE_CLIENT_ID environment variable is set
   - Verify the ID token is being sent correctly
   - Check backend logs for detailed error messages