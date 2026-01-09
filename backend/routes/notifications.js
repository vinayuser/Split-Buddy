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
    const trimmedToken = fcmToken.trim();

    // Get old token if exists (to unsubscribe from topics)
    const user = await User.findById(userId);
    const oldToken = user.fcmToken;

    // Update user's FCM token
    await User.findByIdAndUpdate(userId, {
      fcmToken: trimmedToken
    });

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

