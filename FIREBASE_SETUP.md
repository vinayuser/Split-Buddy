# Firebase Cloud Messaging Setup Guide

This guide will help you set up Firebase Cloud Messaging (FCM) for push notifications in the Split Buddy app.

## Prerequisites

1. A Firebase project
2. Firebase Admin SDK credentials (service account key)
3. Node.js backend server

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Follow the setup wizard

## Step 2: Get Firebase Admin SDK Credentials

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Navigate to **Service Accounts** tab
3. Click **Generate New Private Key**
4. Save the JSON file securely (DO NOT commit to git)

## Step 3: Configure Backend Environment Variables

Add the following environment variables to your `.env` file in the backend:

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
```

**Important Notes:**
- The `FIREBASE_PRIVATE_KEY` should include the `\n` characters (newlines) as shown
- Replace the values with your actual Firebase credentials from the service account JSON

## Step 4: Install Backend Dependencies

```bash
cd /var/www/html/splitwise-app
npm install firebase-admin
```

## Step 5: Get Firebase Configuration Files for Mobile App

1. **Go to Firebase Console:**
   - Navigate to [Firebase Console](https://console.firebase.google.com/)
   - Select your project
   - Go to **Project Settings** (gear icon)

2. **Download Configuration Files:**
   - For **Android**: Click on "Add app" or select your Android app → Download `google-services.json`
   - For **iOS**: Click on "Add app" or select your iOS app → Download `GoogleService-Info.plist`

3. **Add Files to Mobile App:**
   ```bash
   cd /var/www/html/splitwise-app/mobile
   # Place google-services.json in mobile/ directory (root level)
   # Place GoogleService-Info.plist in mobile/ directory (root level)
   ```

## Step 6: Install Mobile App Dependencies

```bash
cd /var/www/html/splitwise-app/mobile
npm install @react-native-firebase/app @react-native-firebase/messaging
npx expo install expo-notifications expo-device
```

**Note:** The Firebase packages are already added to `package.json`. Run `npm install` to install them.

## Step 7: Configure Firebase in Mobile App

The app is now configured to use **Native Firebase Cloud Messaging (FCM)** instead of Expo Push Notifications.

**Configuration is already done:**
- ✅ Firebase plugin added to `app.json`
- ✅ `googleServicesFile` paths configured in `app.json`
- ✅ Notification service updated to use Firebase Messaging
- ✅ Package dependencies added

**What you need to do:**
1. Ensure `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) are in the `mobile/` directory
2. Rebuild the app (native code changes require rebuild):

```bash
cd /var/www/html/splitwise-app/mobile

# For Android
npx expo prebuild --clean
npx expo run:android

# For iOS
npx expo prebuild --clean
npx expo run:ios
```

**Important:** 
- You **must** rebuild the app after adding Firebase configuration files
- The app uses native FCM tokens, not Expo Push Tokens
- Tokens will be proper FCM tokens that work with Firebase Admin SDK

## Step 8: Test Notifications

1. Start the backend server
2. Start the mobile app
3. Log in to the app
4. Create an expense in a group
5. All group members (except the creator) should receive a notification

## How It Works

1. **Token Registration**: When a user logs in, the app requests notification permissions and registers the FCM token with the backend
2. **Expense Creation**: When an expense is created, the backend:
   - Fetches all group members (except the creator)
   - Gets their FCM tokens
   - Sends notifications to all members
3. **Notification Handling**: When a notification is received:
   - If app is in foreground: Shows in-app notification
   - If app is in background: Shows system notification
   - If notification is tapped: Navigates to the group detail screen

## Troubleshooting

### FCM Tokens are NULL/UNDEFINED?

**Common Causes:**

1. **Running on Simulator/Emulator:**
   - Push notifications **only work on physical devices**
   - Check logs for: "Notifications only work on physical devices"
   - Solution: Test on a real Android/iOS device

2. **Notification Permissions Not Granted:**
   - Check logs for: "Notification permissions not granted"
   - Solution: Grant notification permissions when prompted, or check device settings

3. **Firebase Not Configured:**
   - Check logs for: "Invalid app instance" or "Firebase not initialized"
   - Solution: 
     - Ensure `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) are in `mobile/` directory
     - Rebuild the app: `npx expo prebuild --clean && npx expo run:android` (or `run:ios`)
     - Verify Firebase plugin is in `app.json` plugins array

4. **Token Generation Error:**
   - Check app logs for detailed error messages
   - Common Firebase errors:
     - `messaging/invalid-app-instance-id-token`: Firebase not properly configured
     - `messaging/permission-denied`: Permissions denied
     - Check that Firebase configuration files are correct and match your Firebase project

5. **Auth Token Missing:**
   - Check logs for: "No auth token available"
   - Solution: Ensure user is logged in before token registration

**Debugging Steps:**

1. Check mobile app logs for detailed error messages (the updated code provides extensive logging)
2. Verify the user is logged in (auth token exists)
3. Check that notification permissions are granted
4. Ensure app is running on a physical device
5. Check backend logs to see if token registration request is received

### Notifications not working?

1. **Check Firebase credentials**: Ensure all environment variables are set correctly in backend `.env`
2. **Check token registration**: Verify tokens are being saved in the database (check User model `fcmToken` field)
3. **Check permissions**: Ensure the app has notification permissions
4. **Check logs**: Look for errors in backend console and mobile app logs
5. **Verify device**: Ensure testing on a physical device, not simulator

### Invalid token errors?

- Tokens can become invalid if:
  - App is uninstalled
  - App data is cleared
  - Token expires
  - App is reinstalled
- The system will automatically handle invalid tokens
- Backend will skip sending to invalid tokens

### Notifications only work on physical devices

- Push notifications require a physical device
- They won't work in simulators/emulators
- This is a limitation of both Expo Push Notifications and FCM

## Security Notes

- **Never commit** Firebase credentials to version control
- Store credentials securely in environment variables
- Use different Firebase projects for development and production
- Regularly rotate service account keys

## Additional Resources

- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Expo Notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)

