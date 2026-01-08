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

## Step 5: Install Mobile App Dependencies

```bash
cd /var/www/html/splitwise-app/mobile
npx expo install expo-notifications expo-device
```

## Step 6: Configure Expo Push Notifications

1. The app is already configured to use Expo Push Notifications
2. The project ID in `app.json` is already set: `2a205468-d6d8-4228-9d2e-c43f02a76759`
3. For production, you may want to configure Firebase Cloud Messaging (FCM) directly

## Step 7: Test Notifications

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

### Notifications not working?

1. **Check Firebase credentials**: Ensure all environment variables are set correctly
2. **Check token registration**: Verify tokens are being saved in the database
3. **Check permissions**: Ensure the app has notification permissions
4. **Check logs**: Look for errors in backend console and mobile app logs

### Invalid token errors?

- Tokens can become invalid if:
  - App is uninstalled
  - App data is cleared
  - Token expires
- The system will automatically handle invalid tokens

### Notifications only work on physical devices

- Push notifications require a physical device
- They won't work in simulators/emulators

## Security Notes

- **Never commit** Firebase credentials to version control
- Store credentials securely in environment variables
- Use different Firebase projects for development and production
- Regularly rotate service account keys

## Additional Resources

- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Expo Notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)

