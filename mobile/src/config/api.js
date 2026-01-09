import axios from 'axios';
import { Platform } from 'react-native';
import { storage } from '../utils/storage';

// API URL - for local development use: http://localhost:3010/api
// For production use: http://13.232.231.52:3010/api
const API_BASE_URL = process.env.API_BASE_URL || 'http://13.232.231.52:3010/api';

console.log('API_BASE_URL:', API_BASE_URL);
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await storage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('Token added to request:', config.url);
      } else {
        console.warn('No token found for request:', config.url);
      }
    } catch (error) {
      console.error('Error getting token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired, try to refresh
      const refreshToken = await storage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
            refreshToken,
          });
          const newToken = response.data.token;
          await storage.setItem('authToken', newToken);
          error.config.headers.Authorization = `Bearer ${newToken}`;
          return api.request(error.config);
        } catch (refreshError) {
          // Refresh failed, clear tokens
          await storage.removeItem('authToken');
          await storage.removeItem('refreshToken');
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

