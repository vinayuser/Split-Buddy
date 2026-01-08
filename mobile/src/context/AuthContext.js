import React, { createContext, useState, useEffect, useContext } from 'react';
import { storage } from '../utils/storage';
import { authAPI } from '../services/api';
import { registerFCMToken, removeFCMToken } from '../services/notificationService';

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
      setUser(userData);
      
      // Register FCM token for notifications
      setTimeout(async () => {
        try {
          await registerFCMToken();
        } catch (error) {
          console.error('Error registering FCM token:', error);
          // Don't fail login if notification registration fails
        }
      }, 1000);
    } catch (error) {
      console.error('Error storing tokens:', error);
      throw error;
    }
  };

  const logout = async () => {
    console.log('=== LOGOUT STARTED ===');
    try {
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

