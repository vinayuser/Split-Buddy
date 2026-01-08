import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Use SecureStore on native, AsyncStorage on web
const isWeb = Platform.OS === 'web';

export const storage = {
  async getItem(key) {
    try {
      if (isWeb) {
        return await AsyncStorage.getItem(key);
      } else {
        return await SecureStore.getItemAsync(key);
      }
    } catch (error) {
      console.error(`Error getting ${key}:`, error);
      return null;
    }
  },

  async setItem(key, value) {
    try {
      if (isWeb) {
        await AsyncStorage.setItem(key, value);
      } else {
        await SecureStore.setItemAsync(key, value);
      }
    } catch (error) {
      console.error(`Error setting ${key}:`, error);
      throw error;
    }
  },

  async removeItem(key) {
    try {
      if (isWeb) {
        await AsyncStorage.removeItem(key);
      } else {
        await SecureStore.deleteItemAsync(key);
      }
      console.log(`Successfully removed ${key} from storage`);
    } catch (error) {
      console.error(`Error removing ${key}:`, error);
      // Don't throw - just log the error, allow logout to continue
      // On web, AsyncStorage.removeItem might fail silently if key doesn't exist
    }
  },
};
