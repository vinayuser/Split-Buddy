import messaging from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { notificationAPI } from './api';
import { storage } from '../utils/storage';

// Configure notification handler for foreground notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Request notification permissions
export const requestNotificationPermissions = async () => {
  if (!Device.isDevice) {
    console.warn('Notifications only work on physical devices');
    return false;
  }

  try {
    // Request Firebase Messaging permissions
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      console.warn('Firebase Messaging permission not granted');
      return false;
    }

    // Also request Expo notifications permission for foreground handling
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    // Configure Android channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('expense_notifications', {
        name: 'Expense Notifications',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
      });
    }

    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
};

// Register FCM token with backend
export const registerFCMToken = async () => {
  try {
    console.log('=== FCM TOKEN REGISTRATION STARTED (Firebase Native) ===');
    console.log('Platform:', Platform.OS);
    console.log('Is Device:', Device.isDevice);
    
    // Check if running on a physical device
    if (!Device.isDevice) {
      console.error('ERROR: Notifications only work on physical devices, not simulators/emulators');
      return null;
    }
    
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.error('ERROR: Notification permissions not granted');
      return null;
    }
    console.log('✓ Notification permissions granted');

    console.log('Getting Firebase Cloud Messaging token...');
    
    let tokenValue;
    try {
      // Get FCM token using Firebase Messaging
      tokenValue = await messaging().getToken();
      
      if (!tokenValue) {
        console.error('ERROR: FCM token is null or undefined');
        return null;
      }

      console.log('✓ FCM token received from Firebase');
      console.log('Token value (first 50 chars):', tokenValue.substring(0, 50) + '...');
      console.log('Token length:', tokenValue.length);
      console.log('Token type:', typeof tokenValue);
      
      // Set up token refresh listener
      messaging().onTokenRefresh(async (newToken) => {
        console.log('FCM token refreshed:', newToken.substring(0, 50) + '...');
        try {
          const authToken = await storage.getItem('authToken');
          if (authToken) {
            await notificationAPI.registerToken(newToken);
            console.log('✓ Refreshed FCM token registered with backend');
          }
        } catch (error) {
          console.error('Error registering refreshed token:', error);
        }
      });
      
    } catch (tokenError) {
      console.error('ERROR: Failed to get FCM token:', tokenError);
      console.error('Error code:', tokenError.code);
      console.error('Error message:', tokenError.message);
      console.error('Full error:', JSON.stringify(tokenError, null, 2));
      
      // Check for specific error codes
      if (tokenError.code === 'messaging/invalid-app-instance-id-token') {
        console.error('ERROR: Invalid app instance. Firebase may not be properly configured.');
      } else if (tokenError.code === 'messaging/permission-denied') {
        console.error('ERROR: Notification permissions were denied');
      }
      
      return null;
    }

    if (!tokenValue || typeof tokenValue !== 'string' || tokenValue.trim() === '') {
      console.error('ERROR: Token value is empty or invalid');
      console.error('Token value:', tokenValue);
      return null;
    }
    
    // Register token with backend
    try {
      // Verify auth token is available before making API call
      const authToken = await storage.getItem('authToken');
      if (!authToken) {
        console.error('ERROR: No auth token available. Cannot register FCM token.');
        console.error('This usually means the user is not logged in or token was not saved.');
        return null;
      }
      console.log('✓ Auth token verified, proceeding with FCM token registration');
      
      console.log('Sending token to backend...');
      const response = await notificationAPI.registerToken(tokenValue);
      console.log('Backend response:', JSON.stringify(response, null, 2));
      
      if (response.success) {
        console.log('✓ FCM token registered successfully in database');
        if (response.subscriptions) {
          console.log('Topic subscriptions:', response.subscriptions);
        }
      } else {
        console.error('Backend returned error:', response.message);
      }
    } catch (error) {
      console.error('Error registering token with backend:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
        if (error.response.status === 401) {
          console.error('ERROR: Authentication failed. User may not be logged in.');
        }
      } else if (error.request) {
        console.error('No response received from server:', error.request);
      } else {
        console.error('Error setting up request:', error.message);
      }
      // Don't throw - allow app to continue even if registration fails
    }
    
    console.log('=== FCM TOKEN REGISTRATION COMPLETED ===');
    return tokenValue;
  } catch (error) {
    console.error('ERROR: Unexpected error in registerFCMToken:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    return null;
  }
};

// Remove FCM token (on logout)
export const removeFCMToken = async () => {
  try {
    await notificationAPI.removeToken();
    console.log('FCM token removed successfully');
  } catch (error) {
    console.error('Error removing FCM token:', error);
  }
};

// Set up notification listeners
export const setupNotificationListeners = (navigation) => {
  // Handle notification received while app is in foreground (Firebase)
  const unsubscribeForeground = messaging().onMessage(async remoteMessage => {
    console.log('FCM notification received in foreground:', remoteMessage);
    
    // Show local notification using Expo Notifications
    if (remoteMessage.notification) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: remoteMessage.notification.title || 'New Notification',
          body: remoteMessage.notification.body || '',
          data: remoteMessage.data || {},
        },
        trigger: null, // Show immediately
      });
    }
  });

  // Handle notification when app is opened from background/quit state
  messaging().onNotificationOpenedApp(remoteMessage => {
    console.log('FCM notification opened app:', remoteMessage);
    const data = remoteMessage.data || {};
    
    // Navigate based on notification data
    if (data.type === 'expense_added' && data.groupId && navigation) {
      navigation.navigate('Home', {
        screen: 'GroupDetail',
        params: { groupId: data.groupId },
      });
    }
  });

  // Check if app was opened from a notification (when app was completely closed)
  messaging()
    .getInitialNotification()
    .then(remoteMessage => {
      if (remoteMessage) {
        console.log('App opened from notification:', remoteMessage);
        const data = remoteMessage.data || {};
        
        // Navigate based on notification data
        if (data.type === 'expense_added' && data.groupId && navigation) {
          setTimeout(() => {
            navigation.navigate('Home', {
              screen: 'GroupDetail',
              params: { groupId: data.groupId },
            });
          }, 1000);
        }
      }
    });

  // Handle notification tapped/opened (Expo for foreground notifications)
  const notificationResponseListener = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data;
    console.log('Notification tapped:', data);

    // Navigate based on notification data
    if (data.type === 'expense_added' && data.groupId && navigation) {
      navigation.navigate('Home', {
        screen: 'GroupDetail',
        params: { groupId: data.groupId },
      });
    }
  });

  return {
    unsubscribeForeground,
    notificationResponseListener,
  };
};

// Remove notification listeners
export const removeNotificationListeners = (listeners) => {
  if (listeners) {
    if (listeners.unsubscribeForeground) {
      listeners.unsubscribeForeground();
    }
    if (listeners.notificationResponseListener) {
      Notifications.removeNotificationSubscription(listeners.notificationResponseListener);
    }
  }
};

