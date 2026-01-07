const Group = require('../models/Group');
const Subscription = require('../models/Subscription');

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
    const user = req.user;
    const trialEndDate = new Date(user.createdAt);
    trialEndDate.setDate(trialEndDate.getDate() + 7);
    
    if (new Date() <= trialEndDate) {
      return next();
    }

    return res.status(403).json({ 
      success: false, 
      message: 'Subscription required. Please subscribe to continue using the app.' 
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

