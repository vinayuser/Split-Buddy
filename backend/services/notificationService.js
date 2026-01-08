const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
let firebaseInitialized = false;

const initializeFirebase = () => {
  if (firebaseInitialized) {
    return;
  }

  try {
    // Check if Firebase credentials are provided
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
      console.warn('Firebase credentials not configured. Notifications will be disabled.');
      return;
    }

    // Initialize Firebase Admin
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    firebaseInitialized = true;
    console.log('Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
  }
};

// Send notification to a single device
const sendNotification = async (fcmToken, title, body, data = {}) => {
  if (!firebaseInitialized) {
    console.warn('Firebase not initialized. Skipping notification.');
    return { success: false, error: 'Firebase not initialized' };
  }

  if (!fcmToken) {
    return { success: false, error: 'FCM token not provided' };
  }

  try {
    const message = {
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        // Convert all data values to strings (FCM requirement)
        ...Object.keys(data).reduce((acc, key) => {
          acc[key] = String(data[key]);
          return acc;
        }, {}),
      },
      token: fcmToken,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'expense_notifications',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    return { success: true, messageId: response };
  } catch (error) {
    console.error('Error sending notification:', error);
    
    // Handle invalid token
    if (error.code === 'messaging/invalid-registration-token' || 
        error.code === 'messaging/registration-token-not-registered') {
      return { success: false, error: 'Invalid token', shouldRemoveToken: true };
    }
    
    return { success: false, error: error.message };
  }
};

// Send notification to multiple devices
const sendNotificationToMultiple = async (fcmTokens, title, body, data = {}) => {
  if (!firebaseInitialized) {
    console.warn('Firebase not initialized. Skipping notification.');
    return { success: false, error: 'Firebase not initialized' };
  }

  if (!fcmTokens || fcmTokens.length === 0) {
    return { success: false, error: 'No FCM tokens provided' };
  }

  // Filter out null/undefined tokens
  const validTokens = fcmTokens.filter(token => token && token.trim() !== '');

  if (validTokens.length === 0) {
    return { success: false, error: 'No valid FCM tokens provided' };
  }

  try {
    const message = {
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        ...Object.keys(data).reduce((acc, key) => {
          acc[key] = String(data[key]);
          return acc;
        }, {}),
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'expense_notifications',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    const response = await admin.messaging().sendEachForMulticast({
      ...message,
      tokens: validTokens,
    });

    return {
      success: response.failureCount === 0,
      successCount: response.successCount,
      failureCount: response.failureCount,
      responses: response.responses,
    };
  } catch (error) {
    console.error('Error sending multicast notification:', error);
    return { success: false, error: error.message };
  }
};

// Send notification to a topic (for global notifications)
const sendNotificationToTopic = async (topic, title, body, data = {}) => {
  if (!firebaseInitialized) {
    console.warn('Firebase not initialized. Skipping notification.');
    return { success: false, error: 'Firebase not initialized' };
  }

  if (!topic) {
    return { success: false, error: 'Topic not provided' };
  }

  try {
    const message = {
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        ...Object.keys(data).reduce((acc, key) => {
          acc[key] = String(data[key]);
          return acc;
        }, {}),
      },
      topic: topic,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'expense_notifications',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    return { success: true, messageId: response };
  } catch (error) {
    console.error('Error sending topic notification:', error);
    return { success: false, error: error.message };
  }
};

// Initialize on module load
initializeFirebase();

module.exports = {
  sendNotification,
  sendNotificationToMultiple,
  sendNotificationToTopic,
  initializeFirebase,
};

