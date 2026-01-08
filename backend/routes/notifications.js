const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

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

    // Update user's FCM token
    await User.findByIdAndUpdate(userId, {
      fcmToken: fcmToken.trim()
    });

    res.json({
      success: true,
      message: 'FCM token registered successfully'
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

    await User.findByIdAndUpdate(userId, {
      fcmToken: null
    });

    res.json({
      success: true,
      message: 'FCM token removed successfully'
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

