# Firebase Mobile App Setup - Step by Step Guide

## Quick Setup Checklist

Follow these steps to configure Firebase Cloud Messaging in your mobile app:

## Step 1: Get Firebase Configuration Files

### For Android (google-services.json):

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your Firebase project
3. Click the **gear icon** (⚙️) → **Project Settings**
4. Scroll down to **Your apps** section
5. If you don't have an Android app yet:
   - Click **Add app** → Select **Android**
   - Package name: `com.nishadasuya786.splitbuddy` (from your app.json)
   - App nickname: "Split Buddy Android" (optional)
   - Click **Register app**
6. Download `google-services.json`
7. Place it in: `/var/www/html/splitwise-app/mobile/google-services.json`

### For iOS (GoogleService-Info.plist):

1. In the same Firebase Console → Project Settings
2. Scroll to **Your apps** section
3. If you don't have an iOS app yet:
   - Click **Add app** → Select **iOS**
   - Bundle ID: `com.nishadasuya786.splitbuddy` (from your app.json)
   - App nickname: "Split Buddy iOS" (optional)
   - Click **Register app**
4. Download `GoogleService-Info.plist`
5. Place it in: `/var/www/html/splitwise-app/mobile/GoogleService-Info.plist`

## Step 2: Verify File Locations

After downloading, your mobile directory should have:

```
/var/www/html/splitwise-app/mobile/
├── google-services.json          ← Android config (REQUIRED)
├── GoogleService-Info.plist      ← iOS config (REQUIRED)
├── app.json                      ← Already configured ✅
├── package.json                  ← Already updated ✅
└── src/services/notificationService.js  ← Already updated ✅
```

## Step 3: Install Dependencies

```bash
cd /var/www/html/splitwise-app/mobile
npm install
```

This will install:
- `@react-native-firebase/app`
- `@react-native-firebase/messaging`
- Other dependencies

## Step 4: Rebuild the App (IMPORTANT!)

**You MUST rebuild the app** because Firebase requires native code changes:

### For Android:

```bash
cd /var/www/html/splitwise-app/mobile

# Clean and rebuild native code
npx expo prebuild --clean

# Run on Android device/emulator
npx expo run:android
```

### For iOS (if needed):

```bash
cd /var/www/html/splitwise-app/mobile

# Clean and rebuild native code
npx expo prebuild --clean

# Run on iOS device/simulator
npx expo run:ios
```

**Note:** If you're using Expo Go, you **cannot** use native Firebase. You must build a development build or production build.

## Step 5: Test FCM Token Generation

1. Run the app on a **physical device** (not simulator/emulator)
2. Log in to the app
3. Check the app logs/console for:
   ```
   === FCM TOKEN REGISTRATION STARTED (Firebase Native) ===
   ✓ Notification permissions granted
   ✓ FCM token received from Firebase
   Token value (first 50 chars): [your-token]...
   ✓ Auth token verified, proceeding with FCM token registration
   ✓ FCM token registered successfully in database
   ```

4. Check backend logs to verify token was saved:
   ```
   === FCM TOKEN REGISTRATION ===
   Token received: [your-token]...
   Token saved successfully: true
   ```

## Troubleshooting

### Error: "Firebase not initialized" or "Invalid app instance"

**Solution:**
- Make sure `google-services.json` (Android) or `GoogleService-Info.plist` (iOS) is in the `mobile/` directory
- Run `npx expo prebuild --clean` to regenerate native code
- Rebuild the app completely

### Error: "File not found: google-services.json"

**Solution:**
- Verify the file is in `/var/www/html/splitwise-app/mobile/google-services.json`
- Check file permissions
- Make sure the filename is exactly `google-services.json` (not `google-services.json.txt`)

### Tokens still null after setup

**Check:**
1. App is running on a **physical device** (not simulator)
2. Notification permissions are granted
3. User is logged in (auth token exists)
4. Firebase configuration files are correct
5. App was rebuilt after adding config files

### Using Expo Go?

**Important:** Expo Go does NOT support native Firebase. You must:
- Build a development build: `eas build --profile development --platform android`
- Or use EAS Build for production: `eas build --platform android`

## File Structure After Setup

```
mobile/
├── google-services.json          ← You add this
├── GoogleService-Info.plist      ← You add this (iOS)
├── app.json                      ← Already configured
├── package.json                  ← Already updated
└── src/
    └── services/
        └── notificationService.js  ← Already updated to use Firebase
```

## Next Steps

Once setup is complete:
1. ✅ Firebase config files added
2. ✅ Dependencies installed
3. ✅ App rebuilt
4. ✅ Test token generation
5. ✅ Verify tokens in database

Your app will now generate native FCM tokens that work directly with Firebase Admin SDK!

