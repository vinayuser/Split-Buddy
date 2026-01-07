const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Get user profile
router.get('/profile', authenticate, async (req, res) => {
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
        avatar: user.avatar,
        gender: user.gender,
        address: user.address,
        createdAt: user.createdAt,
        lastActiveAt: user.lastActiveAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get profile' });
  }
});

// Update user profile
router.put('/profile', authenticate, [
  body('name').optional({ nullable: true }).trim().isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
  body('avatar').optional({ nullable: true }).trim(),
  body('gender').optional({ nullable: true }).isIn(['male', 'female', 'other', 'prefer_not_to_say']).withMessage('Invalid gender'),
  body('address').optional({ nullable: true }).trim().isLength({ max: 500 }).withMessage('Address must be max 500 characters')
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

    const { name, avatar, gender, address } = req.body;
    const user = req.user;

    if (name !== undefined) user.name = name;
    if (avatar !== undefined) user.avatar = avatar;
    if (gender !== undefined) {
      // Allow null or empty string to clear gender
      user.gender = (gender === null || gender === '') ? null : gender;
    }
    if (address !== undefined) user.address = address;

    await user.save();

    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        subscriptionStatus: user.subscriptionStatus,
        avatar: user.avatar,
        gender: user.gender,
        address: user.address,
        createdAt: user.createdAt,
        lastActiveAt: user.lastActiveAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
});

module.exports = router;

