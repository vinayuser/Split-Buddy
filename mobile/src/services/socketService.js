import io from 'socket.io-client';
import { storage } from '../utils/storage';

// Get API base URL (same as api.js)
// For local development use: http://localhost:3010/api
// For production use: http://13.232.231.52:3010/api
const API_BASE_URL = process.env.API_BASE_URL || 'http://13.232.231.52:3010/api';

// Socket URL - use SOCKET_URL if set, otherwise derive from API_BASE_URL
// If you need a different socket URL, you can set SOCKET_URL environment variable
const SOCKET_URL = process.env.SOCKET_URL || 'http://13.232.231.52:3010';

let socket = null;
let isConnecting = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

/**
 * Initialize socket connection
 */
export const initializeSocket = async () => {
  if (socket?.connected) {
    console.log('Socket already connected');
    return socket;
  }

  if (isConnecting) {
    console.log('Socket connection already in progress');
    return socket;
  }

  try {
    isConnecting = true;
    
    // Get token from storage
    let token = await storage.getItem('authToken');
    if (!token) {
      console.warn('No token found, cannot connect socket');
      isConnecting = false;
      return null;
    }

    // Remove "Bearer " prefix if present (some storage might have it)
    token = token.replace(/^Bearer\s+/i, '').trim();
    
    if (!token) {
      console.warn('Token is empty after cleaning, cannot connect socket');
      isConnecting = false;
      return null;
    }

    // Determine socket URL
    let socketURL;
    if (SOCKET_URL) {
      socketURL = SOCKET_URL;
    } else {
      // Extract base URL from API_BASE_URL (remove /api suffix if present)
      const baseURL = API_BASE_URL.replace('/api', '').replace(/\/$/, '');
      socketURL = baseURL || 'http://localhost:3010';
    }

    console.log('Connecting to socket:', socketURL);
    console.log('API_BASE_URL:', API_BASE_URL);
    console.log('SOCKET_URL env:', SOCKET_URL || 'Not set (using derived from API_BASE_URL)');
    console.log('Token length:', token.length);
    console.log('Token preview:', token.substring(0, 20) + '...');

    socket = io(socketURL, {
      auth: {
        token: token
      },
      extraHeaders: {
        Authorization: `Bearer ${token}` // Also send in headers as fallback
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      reconnectAttempts = 0;
      isConnecting = false;
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      isConnecting = false;
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      isConnecting = false;
      reconnectAttempts++;
      
      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.error('Max reconnection attempts reached');
        disconnectSocket();
      }
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    return socket;
  } catch (error) {
    console.error('Error initializing socket:', error);
    isConnecting = false;
    return null;
  }
};

/**
 * Disconnect socket
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    isConnecting = false;
    reconnectAttempts = 0;
    console.log('Socket disconnected');
  }
};

/**
 * Get socket instance
 */
export const getSocket = () => {
  return socket;
};

/**
 * Check if socket is connected
 */
export const isSocketConnected = () => {
  return socket?.connected || false;
};

/**
 * Join a group room
 */
export const joinGroup = (groupId) => {
  if (!socket || !socket.connected) {
    console.warn('Socket not connected, cannot join group');
    return false;
  }

  socket.emit('join_group', groupId);
  return true;
};

/**
 * Leave a group room
 */
export const leaveGroup = (groupId) => {
  if (!socket || !socket.connected) {
    return false;
  }

  socket.emit('leave_group', groupId);
  return true;
};

/**
 * Send a message
 */
export const sendMessage = (groupId, message, messageType = 'text', image = null) => {
  if (!socket || !socket.connected) {
    console.warn('Socket not connected, cannot send message');
    return false;
  }

  socket.emit('send_message', {
    groupId,
    message,
    messageType,
    image
  });
  return true;
};

/**
 * Edit a message
 */
export const editMessage = (messageId, newMessage) => {
  if (!socket || !socket.connected) {
    return false;
  }

  socket.emit('edit_message', {
    messageId,
    newMessage
  });
  return true;
};

/**
 * Delete a message
 */
export const deleteMessage = (messageId) => {
  if (!socket || !socket.connected) {
    return false;
  }

  socket.emit('delete_message', {
    messageId
  });
  return true;
};

/**
 * Send typing indicator
 */
export const sendTyping = (groupId, isTyping) => {
  if (!socket || !socket.connected) {
    return false;
  }

  socket.emit('typing', {
    groupId,
    isTyping
  });
  return true;
};

export default {
  initializeSocket,
  disconnectSocket,
  getSocket,
  isSocketConnected,
  joinGroup,
  leaveGroup,
  sendMessage,
  editMessage,
  deleteMessage,
  sendTyping,
};

