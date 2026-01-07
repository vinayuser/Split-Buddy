const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { generateOTP, sendOTP, verifyOTP } = require('../services/otpService');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Generate and send OTP
router.post('/send-otp', [
  body('phone').optional({ nullable: true, checkFalsy: true }).custom((value) => {
    if (!value) return true; // Allow null/empty
    // Basic phone validation - 10 digits
    if (!(/^[0-9]{10}$/.test(value) || value.length >= 10)) {
      throw new Error('Phone must be at least 10 digits');
    }
    return true;
  }),
  body('email').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('Invalid email format')
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

    const { phone, email } = req.body;
    
    // Normalize: remove null/empty strings
    const phoneValue = phone && phone.trim() ? phone.trim() : null;
    const emailValue = email && email.trim() ? email.trim() : null;

    if (!phoneValue && !emailValue) {
      return res.status(400).json({ success: false, message: 'Phone or email required' });
    }

    const otp = generateOTP();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    let user = null;
    if (phoneValue) {
      user = await User.findOne({ phone: phoneValue });
    } else if (emailValue) {
      user = await User.findOne({ email: emailValue.toLowerCase() });
    }

    if (user) {
      // If user exists but not activated, activate them now
      if (!user.isActivated) {
        user.isActivated = true;
        console.log(`Activating user: ${phoneValue || emailValue}`);
      }
      user.otp = { code: otp, expiresAt };
      await user.save();
    } else {
      // Create new user
      user = await User.create({
        name: phoneValue || emailValue,
        phone: phoneValue || null,
        email: emailValue ? emailValue.toLowerCase() : null,
        otp: { code: otp, expiresAt },
        subscriptionStatus: 'trial',
        isActivated: true // New signups are activated immediately
      });
    }

    await sendOTP(phoneValue, emailValue, otp);

    // In development, return OTP so it can be displayed on screen
    const response = {
      success: true,
      message: 'OTP sent successfully',
      userId: user._id
    };

    // Only include OTP in development mode
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      response.otp = otp;
      response.message = `OTP sent successfully. Your OTP is: ${otp}`;
    }

    res.json(response);
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
});

// Verify OTP and login
router.post('/verify-otp', async (req, res) => {
  try {
    // Log request for debugging
    console.log('Verify OTP request body:', req.body);
    console.log('Verify OTP request headers:', req.headers);
    
    const { userId, otp } = req.body;
    
    // Manual validation with better error messages
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'User ID is required',
        errors: [{ msg: 'User ID is required', param: 'userId' }]
      });
    }
    
    if (!otp) {
      return res.status(400).json({ 
        success: false, 
        message: 'OTP is required',
        errors: [{ msg: 'OTP is required', param: 'otp' }]
      });
    }
    
    // Normalize values
    const userIdStr = String(userId).trim();
    const otpStr = String(otp).trim();
    
    // Validate OTP format (4-6 digits)
    if (!/^[0-9]{4,6}$/.test(otpStr)) {
      return res.status(400).json({ 
        success: false, 
        message: 'OTP must be 4-6 digits',
        errors: [{ msg: 'OTP must be 4-6 digits', param: 'otp', value: otpStr }]
      });
    }
    
    // Validate userId format (should be MongoDB ObjectId - 24 hex chars)
    if (userIdStr.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(userIdStr)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid user ID format. Expected 24-character MongoDB ObjectId.',
        errors: [{ msg: 'Invalid user ID format', param: 'userId', value: userIdStr }]
      });
    }

    const user = await User.findById(userIdStr);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Log OTP verification details for debugging
    const userOtp = user.otp || {};
    console.log('OTP Verification:', {
      storedOTP: userOtp.code,
      storedExpiry: userOtp.expiresAt,
      providedOTP: otpStr,
      isExpired: userOtp.expiresAt ? new Date() > new Date(userOtp.expiresAt) : 'no expiry',
      nodeEnv: process.env.NODE_ENV
    });

    const isValid = verifyOTP(userOtp.code, userOtp.expiresAt, otpStr);
    
    if (!isValid) {
      console.log('OTP verification failed');
      // Provide more specific error message
      if (!userOtp.code) {
        return res.status(400).json({ success: false, message: 'No OTP found. Please request a new OTP.' });
      }
      if (userOtp.expiresAt && new Date() > new Date(userOtp.expiresAt)) {
        return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new OTP.' });
      }
      return res.status(400).json({ success: false, message: 'Invalid OTP. Please check and try again.' });
    }
    
    console.log('OTP verification successful');

    // Clear OTP
    user.otp = undefined;
    await user.updateLastActive();
    await user.save();

    // Generate tokens
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your_jwt_secret_key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_REFRESH_SECRET || 'your_refresh_secret_key',
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
    );

    res.json({
      success: true,
      token,
      refreshToken,
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        subscriptionStatus: user.subscriptionStatus,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify OTP' });
  }
});

// Refresh token
router.post('/refresh-token', [
  body('refreshToken').notEmpty().withMessage('Refresh token is required')
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

    const { refreshToken } = req.body;

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      token
    });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = req.user;
    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        subscriptionStatus: user.subscriptionStatus,
        createdAt: user.createdAt,
        lastActiveAt: user.lastActiveAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get user' });
  }
});

module.exports = router;

