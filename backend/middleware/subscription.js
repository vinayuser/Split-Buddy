const Group = require('../models/Group');
const Subscription = require('../models/Subscription');
const User = require('../models/User');

// Check if user has active subscription (for creating expenses)
const checkSubscriptionForWrite = async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    // Check user's subscription
    const userSubscription = await Subscription.findOne({ userId, status: 'active' });
    
    if (userSubscription) {
      return next();
    }

    // Check if user is in any group with active subscription
    const groups = await Group.find({ 
      members: { $elemMatch: { userId } }
    });

    for (const group of groups) {
      const groupSubscriptions = await Subscription.find({ 
        userId: { $in: group.members.map(m => m.userId) },
        status: 'active'
      });
      
      if (groupSubscriptions.length > 0) {
        return next();
      }
    }

    // Check trial period
    const user = await User.findById(userId);
    if (!user) {
      return res.status(403).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    const isTrialActive = user.isTrialActive();
    
    if (isTrialActive) {
      // Update user status to trial if not already set
      if (user.subscriptionStatus !== 'trial') {
        user.subscriptionStatus = 'trial';
        await user.save();
      }
      return next();
    } else {
      // Trial expired - update user status
      if (user.subscriptionStatus !== 'expired') {
        user.subscriptionStatus = 'expired';
        await user.save();
      }
    }

    return res.status(403).json({ 
      success: false, 
      message: 'Your 7-day free trial has expired. Please subscribe to continue using the app.',
      trialExpired: true
    });
  } catch (error) {
    console.error('Subscription check error:', error);
    res.status(500).json({ success: false, message: 'Subscription check failed' });
  }
};

// Soft check - allows read access even if expired
const checkSubscriptionForRead = async (req, res, next) => {
  // Read access is always allowed, even with expired subscription
  next();
};

module.exports = { checkSubscriptionForWrite, checkSubscriptionForRead };

