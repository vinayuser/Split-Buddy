import React, { useEffect, useState, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AuthNavigator from './src/navigation/AuthNavigator';
import MainNavigator from './src/navigation/MainNavigator';
import { ActivityIndicator, View } from 'react-native';
import { paperTheme } from './src/theme/paperTheme';
import { setupNotificationListeners, removeNotificationListeners } from './src/services/notificationService';

const Stack = createStackNavigator();

function AppNavigator() {
  const { user, loading } = useAuth();
  const navigationRef = useRef(null);
  const notificationListenersRef = useRef(null);

  // Debug logging
  useEffect(() => {
    console.log('AppNavigator - User state changed:', user ? 'Logged in' : 'Logged out');
  }, [user]);

  // Set up notification listeners when user is logged in
  useEffect(() => {
    if (user && navigationRef.current) {
      // Set up notification listeners
      notificationListenersRef.current = setupNotificationListeners(navigationRef.current);
      
      return () => {
        // Clean up listeners on unmount or logout
        if (notificationListenersRef.current) {
          removeNotificationListeners(notificationListenersRef.current);
        }
      };
    } else {
      // Remove listeners on logout
      if (notificationListenersRef.current) {
        removeNotificationListeners(notificationListenersRef.current);
        notificationListenersRef.current = null;
      }
    }
  }, [user]);

  // Check if profile needs setup
  const needsProfileSetup = user && (
    !user.name || 
    user.name === user.phone || 
    user.name.length < 2
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} key={user ? 'main' : 'auth'}>
      {user ? (
        needsProfileSetup ? <AuthNavigator initialRouteName="ProfileSetup" /> : <MainNavigator />
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <PaperProvider theme={paperTheme}>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </PaperProvider>
  );
}

