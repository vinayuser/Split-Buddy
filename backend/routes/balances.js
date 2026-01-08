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

// Get friend balances across all groups
router.get('/friends', authenticate, checkSubscriptionForRead, async (req, res) => {
  try {
    const userId = req.user._id;

    // Get all groups where user is a member
    const groups = await Group.find({
      'members.userId': userId,
      isArchived: false
    }).populate('members.userId', 'name avatar phone email');

    if (groups.length === 0) {
      return res.json({
        success: true,
        friends: []
      });
    }

    const groupIds = groups.map(g => g._id);
    
    // Calculate balances for all groups
    const friendBalances = {}; // { friendId: { user, netBalance, groups: [] } }
    
    for (const group of groups) {
      const balances = await calculateBalances(group._id);
      
      // Process each balance to find relationships with current user
      balances.forEach(balance => {
        const fromId = balance.from.toString();
        const toId = balance.to.toString();
        const userIdStr = userId.toString();
        
        let friendId = null;
        let amount = 0;
        
        // If user owes someone
        if (fromId === userIdStr) {
          friendId = toId;
          amount = -balance.amount; // Negative because user owes
        }
        // If someone owes user
        else if (toId === userIdStr) {
          friendId = fromId;
          amount = balance.amount; // Positive because user is owed
        }
        
        if (friendId && friendId !== userIdStr) {
          // Find friend user details from group members
          const friendMember = group.members.find(m => {
            const memberId = m.userId && (m.userId._id ? m.userId._id.toString() : m.userId.toString());
            return memberId === friendId;
          });
          
          if (friendMember && friendMember.userId) {
            const friend = friendMember.userId;
            const friendIdStr = friend._id ? friend._id.toString() : friend.toString();
            
            if (!friendBalances[friendIdStr]) {
              friendBalances[friendIdStr] = {
                user: {
                  _id: friend._id || friend,
                  name: friend.name || 'Unknown',
                  avatar: friend.avatar || null,
                  phone: friend.phone || null,
                  email: friend.email || null,
                },
                netBalance: 0,
                groups: []
              };
            }
            
            friendBalances[friendIdStr].netBalance += amount;
            friendBalances[friendIdStr].groups.push({
              groupId: group._id,
              groupName: group.name,
              amount: amount
            });
          }
        }
      });
    }
    
    // Convert to array and filter out zero balances
    const friends = Object.values(friendBalances)
      .filter(friend => Math.abs(friend.netBalance) > 0.01)
      .map(friend => ({
        ...friend,
        netBalance: Math.round(friend.netBalance * 100) / 100 // Round to 2 decimals
      }))
      .sort((a, b) => Math.abs(b.netBalance) - Math.abs(a.netBalance)); // Sort by absolute balance
    
    res.json({
      success: true,
      friends: friends
    });
  } catch (error) {
    console.error('Get friend balances error:', error);
    res.status(500).json({ success: false, message: 'Failed to get friend balances' });
  }
});

module.exports = router;
