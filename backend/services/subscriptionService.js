const axios = require('axios');
const Subscription = require('../models/Subscription');
const User = require('../models/User');

// Verify Google Play subscription
const verifyGooglePlaySubscription = async (purchaseToken, packageName) => {
  // In production, use Google Play Developer API
  // For now, we'll simulate verification
  
  try {
    // Production code would look like:
    // const response = await axios.post(
    //   `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptions/${subscriptionId}/tokens/${purchaseToken}`,
    //   {},
    //   {
    //     headers: {
    //       'Authorization': `Bearer ${accessToken}`
    //     }
    //   }
    // );
    
    // For development, simulate successful verification
    return {
      success: true,
      expiryTimeMillis: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
      orderId: `GPA.${Date.now()}`,
      purchaseType: 0 // 0 = subscription
    };
  } catch (error) {
    console.error('Google Play verification error:', error);
    return { success: false, error: error.message };
  }
};

// Create or update subscription
const createSubscription = async (userId, purchaseToken, planType) => {
  try {
    const packageName = process.env.GOOGLE_PLAY_PACKAGE_NAME || 'com.splitwise.app';
    const verification = await verifyGooglePlaySubscription(purchaseToken, packageName);
    
    if (!verification.success) {
      throw new Error('Subscription verification failed');
    }
    
    const endDate = new Date(verification.expiryTimeMillis);
    
    // Check for existing subscription
    let subscription = await Subscription.findOne({
      userId,
      googlePlayPurchaseToken: purchaseToken
    });
    
    if (subscription) {
      subscription.status = 'active';
      subscription.endDate = endDate;
      subscription.lastVerifiedAt = new Date();
      await subscription.save();
    } else {
      subscription = await Subscription.create({
        userId,
        status: 'active',
        planType,
        startDate: new Date(),
        endDate,
        googlePlayOrderId: verification.orderId,
        googlePlayPurchaseToken: purchaseToken,
        lastVerifiedAt: new Date()
      });
    }
    
    // Update user subscription status
    const user = await User.findById(userId);
    if (user) {
      user.subscriptionStatus = 'active';
      await user.save();
    }
    
    return subscription;
  } catch (error) {
    console.error('Create subscription error:', error);
    throw error;
  }
};

// Check subscription status
const checkSubscriptionStatus = async (userId) => {
  const subscriptions = await Subscription.find({
    userId,
    status: 'active'
  }).sort({ endDate: -1 });
  
  const user = await User.findById(userId);
  if (!user) {
    return { status: 'expired', active: false };
  }
  
  // Check for active paid subscription first
  const activeSubscription = subscriptions.find(sub => sub.isActive());
  
  if (activeSubscription) {
    // Update user status if needed
    if (user.subscriptionStatus !== 'active') {
      user.subscriptionStatus = 'active';
      await user.save();
    }
    
    return {
      status: 'active',
      active: true,
      endDate: activeSubscription.endDate,
      planType: activeSubscription.planType
    };
  }
  
  // Check trial status
  const isTrialActive = user.isTrialActive();
  if (isTrialActive) {
    const trialEndDate = new Date(user.createdAt);
    trialEndDate.setDate(trialEndDate.getDate() + 7);
    const now = new Date();
    const daysRemaining = Math.ceil((trialEndDate - now) / (1000 * 60 * 60 * 24));
    
    // Update user status if needed
    if (user.subscriptionStatus !== 'trial') {
      user.subscriptionStatus = 'trial';
      await user.save();
    }
    
    return {
      status: 'trial',
      active: true,
      trialEndDate: trialEndDate,
      daysRemaining: Math.max(0, daysRemaining)
    };
  }
  
  // Trial expired - update user status
  if (user.subscriptionStatus !== 'expired') {
    user.subscriptionStatus = 'expired';
    await user.save();
  }
  
  // Check if user is in group with active subscription
  const Group = require('../models/Group');
  const groups = await Group.find({
    members: { $elemMatch: { userId } }
  });
  
  for (const group of groups) {
    const groupMemberIds = group.members.map(m => m.userId);
    const groupSubscriptions = await Subscription.find({
      userId: { $in: groupMemberIds },
      status: 'active'
    });
    
    const hasActiveGroupSubscription = groupSubscriptions.some(sub => sub.isActive());
    if (hasActiveGroupSubscription) {
      return { status: 'group_active', active: true };
    }
  }
  
  return { status: 'expired', active: false };
};

module.exports = {
  verifyGooglePlaySubscription,
  createSubscription,
  checkSubscriptionStatus
};

