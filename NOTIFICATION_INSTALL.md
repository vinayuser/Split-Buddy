# Quick Installation Guide for Firebase Notifications

## Backend Installation

```bash
cd /var/www/html/splitwise-app
npm install firebase-admin
```

## Mobile App Installation

```bash
cd /var/www/html/splitwise-app/mobile
npx expo install expo-notifications expo-device
```

## Environment Variables Setup

Add to your backend `.env` file:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour key here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

See `FIREBASE_SETUP.md` for detailed setup instructions.

