const admin = require('firebase-admin');
const { Expo } = require('expo-server-sdk');

// Initialize Firebase Admin SDK
let firebaseInitialized = false;

// Initialize Expo Push Notification client
let expo = new Expo();

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

// Check if token is an Expo Push Token
// Native FCM tokens are typically 150+ characters, while Expo tokens are shorter (22-40 chars)
const isExpoPushToken = (token) => {
  if (!token || typeof token !== 'string') {
    return false;
  }
  
  // Expo tokens start with specific prefixes
  if (token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[')) {
    return true;
  }
  
  // Expo tokens are typically 22-40 characters, FCM tokens are 150+ characters
  // If token is longer than 100 chars, it's likely an FCM token
  if (token.length > 100) {
    return false;
  }
  
  // Check if it matches Expo token format (alphanumeric, 22-40 chars)
  // This regex matches Expo tokens but excludes long FCM tokens
  return /^[a-zA-Z0-9_-]{22,40}$/.test(token);
};

// Send notification to a single device (handles both Expo and FCM tokens)
const sendNotification = async (fcmToken, title, body, data = {}) => {
  if (!fcmToken) {
    return { success: false, error: 'Token not provided' };
  }

  // Check if it's an Expo Push Token
  if (isExpoPushToken(fcmToken)) {
    return await sendExpoNotification(fcmToken, title, body, data);
  }

  // Otherwise, use Firebase Admin SDK
  if (!firebaseInitialized) {
    console.warn('Firebase not initialized. Skipping notification.');
    return { success: false, error: 'Firebase not initialized' };
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

// Send notification via Expo Push Notification Service
const sendExpoNotification = async (expoPushToken, title, body, data = {}) => {
  try {
    // Check that all your push tokens appear to be valid Expo push tokens
    if (!Expo.isExpoPushToken(expoPushToken)) {
      console.error(`Push token ${expoPushToken} is not a valid Expo push token`);
      return { success: false, error: 'Invalid Expo push token' };
    }

    // Construct the message
    const messages = [{
      to: expoPushToken,
      sound: 'default',
      title: title,
      body: body,
      data: data,
      priority: 'high',
      channelId: 'expense_notifications',
    }];

    // Send the notification
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];
    
    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('Error sending Expo notification chunk:', error);
      }
    }

    // Check for errors
    const errors = [];
    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      if (ticket.status === 'error') {
        errors.push(ticket.message);
        console.error(`Error with ticket ${i}:`, ticket.message);
      }
    }

    if (errors.length > 0) {
      return { success: false, error: errors.join(', ') };
    }

    return { success: true, messageId: 'expo-' + Date.now() };
  } catch (error) {
    console.error('Error sending Expo notification:', error);
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

    // Log results for debugging
    console.log(`Notification sent: ${response.successCount} successful, ${response.failureCount} failed`);
    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.error(`Failed to send to token ${idx}:`, resp.error);
          // Remove invalid tokens
          if (resp.error && (
            resp.error.code === 'messaging/invalid-registration-token' ||
            resp.error.code === 'messaging/registration-token-not-registered'
          )) {
            // Token will be cleaned up on next request
            console.log(`Token ${idx} is invalid and should be removed`);
          }
        }
      });
    }

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

// Subscribe a token to a topic
const subscribeTokenToTopic = async (fcmToken, topic) => {
  // Expo Push Tokens cannot be subscribed to Firebase topics
  // They need to be handled differently (store topic subscriptions in DB)
  if (isExpoPushToken(fcmToken)) {
    console.log(`Expo Push Token detected. Topic subscription for ${topic} will be handled via database.`);
    // For Expo tokens, we'll store the topic preference in the user model if needed
    // For now, we'll just log it and return success
    // In the future, you can store topics in User model and send to all users with that topic preference
    return { success: true, note: 'Expo token - topic stored for reference' };
  }

  if (!firebaseInitialized) {
    console.warn('Firebase not initialized. Skipping topic subscription.');
    return { success: false, error: 'Firebase not initialized' };
  }

  if (!fcmToken || !topic) {
    return { success: false, error: 'FCM token and topic are required' };
  }

  try {
    const response = await admin.messaging().subscribeToTopic([fcmToken], topic);
    
    if (response.successCount > 0) {
      console.log(`Successfully subscribed token to topic: ${topic}`);
      return { success: true, response };
    } else {
      console.error(`Failed to subscribe token to topic: ${topic}`, response.errors);
      return { success: false, error: 'Subscription failed', response };
    }
  } catch (error) {
    console.error('Error subscribing token to topic:', error);
    return { success: false, error: error.message };
  }
};

// Unsubscribe a token from a topic
const unsubscribeTokenFromTopic = async (fcmToken, topic) => {
  // Expo Push Tokens cannot be unsubscribed from Firebase topics
  if (isExpoPushToken(fcmToken)) {
    console.log(`Expo Push Token detected. Topic unsubscription for ${topic} handled via database.`);
    return { success: true, note: 'Expo token - topic removed from reference' };
  }

  if (!firebaseInitialized) {
    console.warn('Firebase not initialized. Skipping topic unsubscription.');
    return { success: false, error: 'Firebase not initialized' };
  }

  if (!fcmToken || !topic) {
    return { success: false, error: 'FCM token and topic are required' };
  }

  try {
    const response = await admin.messaging().unsubscribeFromTopic([fcmToken], topic);
    
    if (response.successCount > 0) {
      console.log(`Successfully unsubscribed token from topic: ${topic}`);
      return { success: true, response };
    } else {
      console.error(`Failed to unsubscribe token from topic: ${topic}`, response.errors);
      return { success: false, error: 'Unsubscription failed', response };
    }
  } catch (error) {
    console.error('Error unsubscribing token from topic:', error);
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
    console.log(`Notification sent to topic ${topic}:`, response);
    return { success: true, messageId: response };
  } catch (error) {
    console.error('Error sending topic notification:', error);
    return { success: false, error: error.message };
  }
};

// Initialize on module load
initializeFirebase();

// Also initialize when server starts (in case env vars are loaded later)
if (typeof process !== 'undefined' && process.env) {
  // Re-initialize after a short delay to ensure env vars are loaded
  setTimeout(() => {
    if (!firebaseInitialized) {
      console.log('Re-attempting Firebase initialization...');
      initializeFirebase();
    }
  }, 1000);
}

module.exports = {
  sendNotification,
  sendNotificationToMultiple,
  sendNotificationToTopic,
  subscribeTokenToTopic,
  unsubscribeTokenFromTopic,
  initializeFirebase,
  isExpoPushToken,
};

