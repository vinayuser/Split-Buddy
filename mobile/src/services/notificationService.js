import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { notificationAPI } from './api';
import { storage } from '../utils/storage';

// Configure notification handler
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
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Failed to get push notification permissions');
      return false;
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
    console.log('=== FCM TOKEN REGISTRATION STARTED ===');
    
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.warn('Notification permissions not granted');
      return null;
    }

    console.log('Getting Expo Push Token...');
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: '2a205468-d6d8-4228-9d2e-c43f02a76759', // From app.json
    });

    console.log('Token received:', token);

    if (token && token.data) {
      const tokenValue = token.data;
      console.log('Token value:', tokenValue.substring(0, 50) + '...');
      console.log('Token length:', tokenValue.length);
      
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
        console.log('Backend response:', response);
        
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
      
      return tokenValue;
    } else {
      console.warn('No token data received from Expo');
    }

    console.log('=== FCM TOKEN REGISTRATION COMPLETED ===');
    return null;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    console.error('Error details:', error.message, error.stack);
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
  // Handle notification received while app is in foreground
  const notificationReceivedListener = Notifications.addNotificationReceivedListener(notification => {
    console.log('Notification received:', notification);
    // You can show an in-app notification here if needed
  });

  // Handle notification tapped/opened
  const notificationResponseListener = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data;
    console.log('Notification tapped:', data);

    // Navigate based on notification data
    if (data.type === 'expense_added' && data.groupId) {
      navigation.navigate('Home', {
        screen: 'GroupDetail',
        params: { groupId: data.groupId },
      });
    }
  });

  return {
    notificationReceivedListener,
    notificationResponseListener,
  };
};

// Remove notification listeners
export const removeNotificationListeners = (listeners) => {
  if (listeners) {
    if (listeners.notificationReceivedListener) {
      Notifications.removeNotificationSubscription(listeners.notificationReceivedListener);
    }
    if (listeners.notificationResponseListener) {
      Notifications.removeNotificationSubscription(listeners.notificationResponseListener);
    }
  }
};

