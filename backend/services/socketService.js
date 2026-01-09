const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const Group = require('../models/Group');
const User = require('../models/User');

// Store active users in rooms
const activeUsers = new Map(); // userId -> Set of groupIds

/**
 * Authenticate socket connection using JWT token
 */
const authenticateSocket = (socket, next) => {
  try {
    // Get token from auth object or headers
    let token = socket.handshake.auth?.token;
    
    // If not in auth, try headers
    if (!token) {
      const authHeader = socket.handshake.headers?.authorization;
      if (authHeader) {
        token = authHeader.replace('Bearer ', '').trim();
      }
    }
    
    if (!token) {
      console.error('Socket auth: No token provided');
      return next(new Error('Authentication error: No token provided'));
    }

    // Use same JWT_SECRET as auth routes
    const jwtSecret = process.env.JWT_SECRET || 'your_jwt_secret_key';
    
    jwt.verify(token, jwtSecret, (err, decoded) => {
      if (err) {
        console.error('Socket auth: Token verification failed', {
          error: err.message,
          tokenLength: token.length,
          tokenPreview: token.substring(0, 20) + '...'
        });
        return next(new Error('Authentication error: Invalid token'));
      }
      
      socket.userId = decoded.userId;
      socket.user = decoded;
      console.log(`Socket authenticated for user: ${socket.userId}`);
      next();
    });
  } catch (error) {
    console.error('Socket auth: Unexpected error', error);
    next(new Error('Authentication error'));
  }
};

/**
 * Setup Socket.io event handlers
 */
const setupSocketIO = (io) => {
  // Authentication middleware
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId}`);

    // Track active user
    if (!activeUsers.has(socket.userId)) {
      activeUsers.set(socket.userId, new Set());
    }

    // Join a group room
    socket.on('join_group', async (groupId) => {
      try {
        // Verify user is a member of the group
        const group = await Group.findById(groupId);
        if (!group) {
          socket.emit('error', { message: 'Group not found' });
          return;
        }

        if (!group.isMember(socket.userId)) {
          socket.emit('error', { message: 'Not a member of this group' });
          return;
        }

        // Join the room
        const roomName = `group_${groupId}`;
        socket.join(roomName);
        
        // Track active user in this group
        activeUsers.get(socket.userId).add(groupId);

        console.log(`User ${socket.userId} joined group ${groupId}`);
        socket.emit('joined_group', { groupId });

        // Notify others in the group (optional - for "user is typing" or online status)
        socket.to(roomName).emit('user_joined', {
          userId: socket.userId,
          groupId
        });
      } catch (error) {
        console.error('Join group error:', error);
        socket.emit('error', { message: 'Failed to join group' });
      }
    });

    // Leave a group room
    socket.on('leave_group', (groupId) => {
      const roomName = `group_${groupId}`;
      socket.leave(roomName);
      
      // Remove from active users tracking
      if (activeUsers.has(socket.userId)) {
        activeUsers.get(socket.userId).delete(groupId);
      }

      console.log(`User ${socket.userId} left group ${groupId}`);
      socket.emit('left_group', { groupId });

      // Notify others
      socket.to(roomName).emit('user_left', {
        userId: socket.userId,
        groupId
      });
    });

    // Send a message
    socket.on('send_message', async (data) => {
      try {
        const { groupId, message, messageType = 'text', image = null } = data;

        if (!groupId || !message) {
          socket.emit('error', { message: 'Group ID and message are required' });
          return;
        }

        // Verify user is a member
        const group = await Group.findById(groupId);
        if (!group || !group.isMember(socket.userId)) {
          socket.emit('error', { message: 'Not a member of this group' });
          return;
        }

        // Validate message length
        if (message.length > 1000) {
          socket.emit('error', { message: 'Message too long (max 1000 characters)' });
          return;
        }

        // Create message in database
        const newMessage = await Message.create({
          groupId,
          senderId: socket.userId,
          message: message.trim(),
          messageType,
          image: image || null
        });

        // Populate sender info
        await newMessage.populate({
          path: 'senderId',
          select: 'name avatar'
        });

        // Emit to all users in the group room
        const roomName = `group_${groupId}`;
        io.to(roomName).emit('new_message', {
          message: newMessage
        });

        console.log(`Message sent in group ${groupId} by user ${socket.userId}`);
      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Edit a message
    socket.on('edit_message', async (data) => {
      try {
        const { messageId, newMessage } = data;

        if (!messageId || !newMessage) {
          socket.emit('error', { message: 'Message ID and new message are required' });
          return;
        }

        // Find the message
        const message = await Message.findById(messageId);
        if (!message) {
          socket.emit('error', { message: 'Message not found' });
          return;
        }

        // Verify user is the sender
        if (message.senderId.toString() !== socket.userId.toString()) {
          socket.emit('error', { message: 'Not authorized to edit this message' });
          return;
        }

        // Update message
        message.message = newMessage.trim();
        message.isEdited = true;
        message.editedAt = new Date();
        await message.save();

        await message.populate({
          path: 'senderId',
          select: 'name avatar'
        });

        // Emit updated message to group
        const roomName = `group_${message.groupId}`;
        io.to(roomName).emit('message_edited', {
          message
        });
      } catch (error) {
        console.error('Edit message error:', error);
        socket.emit('error', { message: 'Failed to edit message' });
      }
    });

    // Delete a message
    socket.on('delete_message', async (data) => {
      try {
        const { messageId } = data;

        if (!messageId) {
          socket.emit('error', { message: 'Message ID is required' });
          return;
        }

        // Find the message
        const message = await Message.findById(messageId);
        if (!message) {
          socket.emit('error', { message: 'Message not found' });
          return;
        }

        // Verify user is the sender
        if (message.senderId.toString() !== socket.userId.toString()) {
          socket.emit('error', { message: 'Not authorized to delete this message' });
          return;
        }

        // Soft delete
        message.isDeleted = true;
        message.deletedAt = new Date();
        await message.save();

        // Emit deletion to group
        const roomName = `group_${message.groupId}`;
        io.to(roomName).emit('message_deleted', {
          messageId: message._id,
          groupId: message.groupId
        });
      } catch (error) {
        console.error('Delete message error:', error);
        socket.emit('error', { message: 'Failed to delete message' });
      }
    });

    // Typing indicator
    socket.on('typing', (data) => {
      const { groupId, isTyping } = data;
      if (groupId) {
        const roomName = `group_${groupId}`;
        socket.to(roomName).emit('user_typing', {
          userId: socket.userId,
          groupId,
          isTyping
        });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
      
      // Remove from active users
      activeUsers.delete(socket.userId);
    });
  });
};

module.exports = { setupSocketIO, authenticateSocket };

