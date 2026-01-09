import React, { createContext, useState, useEffect, useContext } from 'react';
import { storage } from '../utils/storage';
import { authAPI } from '../services/api';
import { registerFCMToken, removeFCMToken } from '../services/notificationService';
import { initializeSocket, disconnectSocket } from '../services/socketService';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const token = await storage.getItem('authToken');
      if (token) {
        const response = await authAPI.getMe();
        if (response.success) {
          setUser(response.user);
          
          // Register FCM token if user is already logged in (app restart scenario)
          setTimeout(async () => {
            try {
              // Verify token is available
              const verifyToken = await storage.getItem('authToken');
              if (!verifyToken) {
                console.error('ERROR: Auth token not available on app start');
                return;
              }
              
              console.log('User already logged in, registering FCM token...');
              await registerFCMToken();
              // Initialize socket connection
              await initializeSocket();
            } catch (error) {
              console.error('Error registering FCM token on app start:', error);
              console.error('Error details:', error.message, error.stack);
            }
          }, 1000);
        } else {
          await storage.removeItem('authToken');
          await storage.removeItem('refreshToken');
        }
      }
    } catch (error) {
      console.error('Load user error:', error);
      try {
        await storage.removeItem('authToken');
        await storage.removeItem('refreshToken');
      } catch (e) {
        // Ignore cleanup errors
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (userData, token, refreshToken) => {
    try {
      await storage.setItem('authToken', token);
      await storage.setItem('refreshToken', refreshToken);
      console.log('Tokens stored successfully');
      
      // Verify token was saved before proceeding
      const savedToken = await storage.getItem('authToken');
      if (!savedToken) {
        console.error('ERROR: Auth token was not saved properly!');
        throw new Error('Failed to save authentication token');
      }
      console.log('✓ Auth token verified in storage');
      
      setUser(userData);
      
      // Register FCM token for notifications and initialize socket
      // Use a delay to ensure auth token is set in API headers, but verify first
      setTimeout(async () => {
        try {
          // Double-check token is available
          const verifyToken = await storage.getItem('authToken');
          if (!verifyToken) {
            console.error('ERROR: Auth token not available when trying to register FCM token');
            return;
          }
          
          console.log('Registering FCM token after login...');
          await registerFCMToken();
          
          // Initialize socket connection
          console.log('Initializing socket connection...');
          await initializeSocket();
        } catch (error) {
          console.error('Error registering FCM token or socket after login:', error);
          console.error('Error details:', error.message, error.stack);
          // Don't fail login if notification registration fails
        }
      }, 1000); // Reduced to 1 second since we verify token is saved
    } catch (error) {
      console.error('Error storing tokens:', error);
      throw error;
    }
  };

  const logout = async () => {
    console.log('=== LOGOUT STARTED ===');
    try {
      // Disconnect socket
      try {
        disconnectSocket();
        console.log('✓ Socket disconnected');
      } catch (e) {
        console.warn('Warning: Error disconnecting socket:', e);
      }
      
      // Remove FCM token
      try {
        await removeFCMToken();
        console.log('✓ FCM token removed');
      } catch (e) {
        console.warn('Warning: Error removing FCM token:', e);
      }
      
      // Clear tokens from storage
      console.log('Removing tokens from storage...');
      try {
        await storage.removeItem('authToken');
        console.log('✓ authToken removed');
      } catch (e) {
        console.warn('Warning: Error removing authToken:', e);
      }
      
      try {
        await storage.removeItem('refreshToken');
        console.log('✓ refreshToken removed');
      } catch (e) {
        console.warn('Warning: Error removing refreshToken:', e);
      }
      
      console.log('Setting user to null...');
      // Clear user state - this will trigger navigation change in App.js
      setUser(null);
      console.log('✓ User state set to null');
      console.log('=== LOGOUT COMPLETED ===');
      
    } catch (error) {
      console.error('=== LOGOUT ERROR ===', error);
      // Still clear user state even if storage removal fails
      setUser(null);
      console.log('User state cleared despite error');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, loadUser }}>
      {children}
    </AuthContext.Provider>
  );
};

