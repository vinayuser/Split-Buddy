const express = require('express');
const { body, validationResult } = require('express-validator');
const Subscription = require('../models/Subscription');
const { authenticate } = require('../middleware/auth');
const { createSubscription, checkSubscriptionStatus } = require('../services/subscriptionService');

const router = express.Router();

// Get subscription status
router.get('/status', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const status = await checkSubscriptionStatus(userId);

    res.json({
      success: true,
      subscription: status
    });
  } catch (error) {
    console.error('Get subscription status error:', error);
    res.status(500).json({ success: false, message: 'Failed to get subscription status' });
  }
});

// Verify and create subscription
router.post('/verify', authenticate, [
  body('purchaseToken').notEmpty().withMessage('Purchase token is required').trim(),
  body('planType').isIn(['monthly_10', 'monthly_15']).withMessage('Valid plan type required (monthly_10 or monthly_15)')
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

    const { purchaseToken, planType } = req.body;
    const userId = req.user._id;

    const subscription = await createSubscription(userId, purchaseToken, planType);

    res.json({
      success: true,
      subscription: {
        _id: subscription._id,
        status: subscription.status,
        planType: subscription.planType,
        startDate: subscription.startDate,
        endDate: subscription.endDate
      }
    });
  } catch (error) {
    console.error('Verify subscription error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to verify subscription' 
    });
  }
});

// Get subscription history
router.get('/history', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;

    const subscriptions = await Subscription.find({ userId })
      .sort({ createdAt: -1 })
      .select('-__v');

    res.json({
      success: true,
      subscriptions
    });
  } catch (error) {
    console.error('Get subscription history error:', error);
    res.status(500).json({ success: false, message: 'Failed to get subscription history' });
  }
});

module.exports = router;

