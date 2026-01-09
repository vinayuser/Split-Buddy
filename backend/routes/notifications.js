const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { subscribeTokenToTopic, unsubscribeTokenFromTopic } = require('../services/notificationService');

const router = express.Router();

// Default topics all users should be subscribed to
const DEFAULT_TOPICS = ['all_users'];

// Register/Update FCM token
router.post('/register-token', authenticate, [
  body('fcmToken').notEmpty().withMessage('FCM token is required').isString(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { fcmToken } = req.body;
    const userId = req.user._id;
    
    if (!fcmToken || typeof fcmToken !== 'string') {
      console.error('ERROR: Invalid FCM token received:', fcmToken);
      return res.status(400).json({
        success: false,
        message: 'Invalid FCM token provided'
      });
    }
    
    const trimmedToken = fcmToken.trim();
    
    if (!trimmedToken) {
      console.error('ERROR: FCM token is empty after trimming');
      return res.status(400).json({
        success: false,
        message: 'FCM token cannot be empty'
      });
    }

    console.log('=== FCM TOKEN REGISTRATION ===');
    console.log(`User ID: ${userId}`);
    console.log(`User phone/email: ${req.user.phone || req.user.email || 'N/A'}`);
    console.log(`Token received: ${trimmedToken.substring(0, 50)}...`);
    console.log(`Token length: ${trimmedToken.length}`);

    // Get old token if exists (to unsubscribe from topics)
    const user = await User.findById(userId);
    if (!user) {
      console.error('ERROR: User not found:', userId);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const oldToken = user.fcmToken;
    console.log(`Old token: ${oldToken ? oldToken.substring(0, 50) + '...' : 'NONE'}`);

    // Update user's FCM token
    user.fcmToken = trimmedToken;
    await user.save();

    // Verify token was saved
    const updatedUser = await User.findById(userId);
    if (!updatedUser) {
      console.error('ERROR: User not found after update');
      return res.status(500).json({
        success: false,
        message: 'Failed to update user'
      });
    }
    
    console.log(`Token after save: ${updatedUser.fcmToken ? updatedUser.fcmToken.substring(0, 50) + '...' : 'NULL'}`);
    console.log(`Token saved successfully: ${updatedUser.fcmToken === trimmedToken}`);
    
    if (updatedUser.fcmToken !== trimmedToken) {
      console.error('ERROR: Token mismatch! Expected:', trimmedToken.substring(0, 50), 'Got:', updatedUser.fcmToken?.substring(0, 50));
    }
    
    console.log('==============================');

    // Unsubscribe old token from topics if it exists and is different
    if (oldToken && oldToken !== trimmedToken) {
      for (const topic of DEFAULT_TOPICS) {
        try {
          await unsubscribeTokenFromTopic(oldToken, topic);
        } catch (error) {
          console.error(`Error unsubscribing old token from ${topic}:`, error);
        }
      }
    }

    // Subscribe new token to default topics
    const subscriptionResults = [];
    for (const topic of DEFAULT_TOPICS) {
      try {
        const result = await subscribeTokenToTopic(trimmedToken, topic);
        subscriptionResults.push({ topic, success: result.success });
        if (!result.success) {
          console.error(`Failed to subscribe to topic ${topic}:`, result.error);
        }
      } catch (error) {
        console.error(`Error subscribing to topic ${topic}:`, error);
        subscriptionResults.push({ topic, success: false, error: error.message });
      }
    }

    res.json({
      success: true,
      message: 'FCM token registered and subscribed to topics successfully',
      subscriptions: subscriptionResults
    });
  } catch (error) {
    console.error('Register FCM token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register FCM token'
    });
  }
});

// Remove FCM token (for logout)
router.post('/remove-token', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;

    // Get user's current token to unsubscribe from topics
    const user = await User.findById(userId);
    const currentToken = user.fcmToken;

    // Unsubscribe from all topics before removing token
    if (currentToken) {
      for (const topic of DEFAULT_TOPICS) {
        try {
          await unsubscribeTokenFromTopic(currentToken, topic);
        } catch (error) {
          console.error(`Error unsubscribing from topic ${topic}:`, error);
        }
      }
    }

    // Remove token from user
    await User.findByIdAndUpdate(userId, {
      fcmToken: null
    });

    res.json({
      success: true,
      message: 'FCM token removed and unsubscribed from topics successfully'
    });
  } catch (error) {
    console.error('Remove FCM token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove FCM token'
    });
  }
});

module.exports = router;

