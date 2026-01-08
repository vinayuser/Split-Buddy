import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { notificationAPI } from './api';

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
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return null;
    }

    const token = await Notifications.getExpoPushTokenAsync({
      projectId: '2a205468-d6d8-4228-9d2e-c43f02a76759', // From app.json
    });

    if (token && token.data) {
      // Register token with backend
      try {
        await notificationAPI.registerToken(token.data);
        console.log('FCM token registered successfully');
      } catch (error) {
        console.error('Error registering token with backend:', error);
      }
      
      return token.data;
    }

    return null;
  } catch (error) {
    console.error('Error getting FCM token:', error);
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

