const express = require('express');
const Group = require('../models/Group');
const { authenticate } = require('../middleware/auth');
const { checkSubscriptionForRead } = require('../middleware/subscription');
const { calculateBalances, optimizeSettlements, getNetBalance } = require('../services/balanceService');

const router = express.Router();

// Get balances for a group
router.get('/group/:groupId', authenticate, checkSubscriptionForRead, async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(groupId)
      .populate('members.userId', 'name avatar isActivated');

    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    if (!group.isMember(userId)) {
      return res.status(403).json({ success: false, message: 'Not a member of this group' });
    }

    const balances = await calculateBalances(groupId);
    const optimized = optimizeSettlements(balances);

    // Populate user details
    const populatedBalances = await Promise.all(
      balances.map(async (balance) => {
        const fromMember = group.members.find(m => m.userId._id.toString() === balance.from.toString());
        const toMember = group.members.find(m => m.userId._id.toString() === balance.to.toString());
        const fromUser = fromMember && fromMember.userId;
        const toUser = toMember && toMember.userId;
        
        return {
          from: {
            _id: balance.from,
            name: (fromUser && fromUser.name) || 'Unknown',
            avatar: (fromUser && fromUser.avatar) || null
          },
          to: {
            _id: balance.to,
            name: (toUser && toUser.name) || 'Unknown',
            avatar: (toUser && toUser.avatar) || null
          },
          amount: balance.amount
        };
      })
    );

    const populatedOptimized = await Promise.all(
      optimized.map(async (balance) => {
        const fromMember = group.members.find(m => m.userId._id.toString() === balance.from.toString());
        const toMember = group.members.find(m => m.userId._id.toString() === balance.to.toString());
        const fromUser = fromMember && fromMember.userId;
        const toUser = toMember && toMember.userId;
        
        return {
          from: {
            _id: balance.from,
            name: (fromUser && fromUser.name) || 'Unknown',
            avatar: (fromUser && fromUser.avatar) || null
          },
          to: {
            _id: balance.to,
            name: (toUser && toUser.name) || 'Unknown',
            avatar: (toUser && toUser.avatar) || null
          },
          amount: balance.amount
        };
      })
    );

    res.json({
      success: true,
      balances: populatedBalances,
      optimized: populatedOptimized
    });
  } catch (error) {
    console.error('Get balances error:', error);
    res.status(500).json({ success: false, message: 'Failed to get balances' });
  }
});

// Get net balance for current user in a group
router.get('/group/:groupId/user', authenticate, checkSubscriptionForRead, async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    if (!group.isMember(userId)) {
      return res.status(403).json({ success: false, message: 'Not a member of this group' });
    }

    const netBalance = await getNetBalance(groupId, userId);

    res.json({
      success: true,
      balance: netBalance
    });
  } catch (error) {
    console.error('Get net balance error:', error);
    res.status(500).json({ success: false, message: 'Failed to get balance' });
  }
});

module.exports = router;

