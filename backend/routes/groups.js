const express = require('express');
const { body, validationResult } = require('express-validator');
const Group = require('../models/Group');
const Expense = require('../models/Expense');
const { authenticate } = require('../middleware/auth');
const { checkSubscriptionForRead } = require('../middleware/subscription');
const { calculateBalances, getNetBalance, optimizeSettlements } = require('../services/balanceService');

const router = express.Router();

// Get all groups for user
router.get('/', authenticate, checkSubscriptionForRead, async (req, res) => {
  try {
    const userId = req.user._id;
    
    const groups = await Group.find({
      members: { $elemMatch: { userId } }
    })
    .populate('createdBy', 'name')
    .populate('members.userId', 'name avatar phone email isActivated')
    .sort({ updatedAt: -1 })
    .select('-__v');

    res.json({
      success: true,
      groups
    });
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ success: false, message: 'Failed to get groups' });
  }
});

// Get group by ID with all details (group, expenses, balances, net balance)
// This route must come BEFORE /:groupId to match correctly
router.get('/:groupId/detail', authenticate, checkSubscriptionForRead, async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(groupId)
      .populate('createdBy', 'name')
      .populate('members.userId', 'name avatar phone email isActivated');

    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    // Check if user is a member (handle both populated and unpopulated userId)
    const isMember = group.members.some(m => {
      if (!m.userId) return false;
      // Handle populated userId (object with _id) or unpopulated (ObjectId)
      const memberUserId = m.userId._id ? m.userId._id.toString() : m.userId.toString();
      return memberUserId === userId.toString();
    });
    
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Not a member of this group' });
    }

    // Get expenses
    const expenses = await Expense.find({ groupId })
      .populate('paidBy', 'name avatar')
      .populate('splits.userId', 'name avatar isActivated')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .select('-__v');

    // Get balances (normal split)
    const balances = await calculateBalances(groupId);
    
    // Always calculate optimized balances (for toggle functionality)
    const optimizedBalances = optimizeSettlements(balances);
    
    // Populate normal balance user details
    const populatedBalances = await Promise.all(
      balances.map(async (balance) => {
        const fromMember = group.members.find(m => {
          const memberUserId = m.userId._id ? m.userId._id.toString() : m.userId.toString();
          return memberUserId === balance.from.toString();
        });
        const toMember = group.members.find(m => {
          const memberUserId = m.userId._id ? m.userId._id.toString() : m.userId.toString();
          return memberUserId === balance.to.toString();
        });
        
        return {
          from: {
            _id: balance.from,
            name: (fromMember && fromMember.userId && fromMember.userId.name) || 'Unknown',
            avatar: (fromMember && fromMember.userId && fromMember.userId.avatar) || null
          },
          to: {
            _id: balance.to,
            name: (toMember && toMember.userId && toMember.userId.name) || 'Unknown',
            avatar: (toMember && toMember.userId && toMember.userId.avatar) || null
          },
          amount: balance.amount
        };
      })
    );

    // Populate optimized balance user details
    const populatedOptimizedBalances = await Promise.all(
      optimizedBalances.map(async (balance) => {
        const fromMember = group.members.find(m => {
          const memberUserId = m.userId._id ? m.userId._id.toString() : m.userId.toString();
          return memberUserId === balance.from.toString();
        });
        const toMember = group.members.find(m => {
          const memberUserId = m.userId._id ? m.userId._id.toString() : m.userId.toString();
          return memberUserId === balance.to.toString();
        });
        
        return {
          from: {
            _id: balance.from,
            name: (fromMember && fromMember.userId && fromMember.userId.name) || 'Unknown',
            avatar: (fromMember && fromMember.userId && fromMember.userId.avatar) || null
          },
          to: {
            _id: balance.to,
            name: (toMember && toMember.userId && toMember.userId.name) || 'Unknown',
            avatar: (toMember && toMember.userId && toMember.userId.avatar) || null
          },
          amount: balance.amount
        };
      })
    );

    // Get net balance for current user
    const netBalance = await getNetBalance(groupId, userId);

    res.json({
      success: true,
      group,
      expenses,
      balances: populatedBalances,
      optimizedBalances: populatedOptimizedBalances,
      netBalance
    });
  } catch (error) {
    console.error('Get group detail error:', error);
    res.status(500).json({ success: false, message: 'Failed to get group details' });
  }
});

// Get group by ID (simple - just group info)
router.get('/:groupId', authenticate, checkSubscriptionForRead, async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(groupId)
      .populate('createdBy', 'name')
      .populate('members.userId', 'name avatar phone email isActivated');

    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    // Check if user is a member (handle both populated and unpopulated userId)
    const isMember = group.members.some(m => {
      if (!m.userId) return false;
      // Handle populated userId (object with _id) or unpopulated (ObjectId)
      const memberUserId = m.userId._id ? m.userId._id.toString() : m.userId.toString();
      return memberUserId === userId.toString();
    });
    
    if (!isMember) {
      console.log('User not a member:', {
        userId: userId.toString(),
        members: group.members.map(m => {
          if (!m.userId) return 'null';
          return m.userId._id ? m.userId._id.toString() : m.userId.toString();
        })
      });
      return res.status(403).json({ success: false, message: 'Not a member of this group' });
    }

    res.json({
      success: true,
      group
    });
  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({ success: false, message: 'Failed to get group' });
  }
});

// Create group
router.post('/', authenticate, [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
  body('description').optional({ nullable: true }).trim().isLength({ max: 500 }).withMessage('Description must be max 500 characters')
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

    const { name, description } = req.body;
    const userId = req.user._id;

    let inviteCode;
    let isUnique = false;
    while (!isUnique) {
      inviteCode = Group.generateInviteCode();
      const existing = await Group.findOne({ inviteCode });
      if (!existing) isUnique = true;
    }

    const group = await Group.create({
      name,
      description: description || '',
      createdBy: userId,
      inviteCode,
      members: [{ userId, role: 'admin', joinedAt: new Date() }]
    });

    await group.populate('createdBy', 'name');
    await group.populate('members.userId', 'name avatar phone email isActivated');

    res.status(201).json({
      success: true,
      group
    });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ success: false, message: 'Failed to create group' });
  }
});

// Update group
router.put('/:groupId', authenticate, [
  body('name').optional({ nullable: true }).trim().isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
  body('description').optional({ nullable: true }).trim().isLength({ max: 500 }).withMessage('Description must be max 500 characters'),
  body('simplifyDebts').optional({ nullable: true }).isBoolean().withMessage('simplifyDebts must be a boolean')
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

    const { groupId } = req.params;
    const userId = req.user._id;
    const { name, description, simplifyDebts } = req.body;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const member = group.members.find(m => m.userId.toString() === userId.toString());
    if (!member || member.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admins can update group' });
    }

    if (name !== undefined) group.name = name;
    if (description !== undefined) group.description = description || '';
    if (simplifyDebts !== undefined) group.simplifyDebts = simplifyDebts;

    await group.save();
    await group.populate('createdBy', 'name');
    await group.populate('members.userId', 'name avatar phone email isActivated');

    res.json({
      success: true,
      group
    });
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({ success: false, message: 'Failed to update group' });
  }
});

// Join group via invite code
router.post('/join', authenticate, [
  body('inviteCode').trim().notEmpty().withMessage('Invite code is required').isLength({ min: 1 }).withMessage('Invite code cannot be empty')
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

    const { inviteCode } = req.body;
    const userId = req.user._id;

    const group = await Group.findOne({ inviteCode, isArchived: false });
    if (!group) {
      return res.status(404).json({ success: false, message: 'Invalid invite code' });
    }

    if (group.isMember(userId)) {
      return res.status(400).json({ success: false, message: 'Already a member' });
    }

    await group.addMember(userId);
    await group.populate('createdBy', 'name');
    await group.populate('members.userId', 'name avatar phone email isActivated');

    res.json({
      success: true,
      group
    });
  } catch (error) {
    console.error('Join group error:', error);
    res.status(500).json({ success: false, message: 'Failed to join group' });
  }
});

// Invite member to group via email/phone
router.post('/:groupId/invite', authenticate, [
  body('email').optional({ nullable: true }).isEmail().withMessage('Invalid email format'),
  body('phone').optional({ nullable: true }).custom((value) => {
    if (!value) return true;
    if (!(/^[0-9]{10}$/.test(value) || value.length >= 10)) {
      throw new Error('Phone must be at least 10 digits');
    }
    return true;
  })
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

    const { groupId } = req.params;
    const { email, phone } = req.body;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    // Check if user is admin
    const member = group.members.find(m => m.userId.toString() === userId.toString());
    if (!member || member.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admins can invite members' });
    }

    if (!email && !phone) {
      return res.status(400).json({ success: false, message: 'Email or phone is required' });
    }

    // Find user by email or phone
    const User = require('../models/User');
    let invitedUser = null;
    if (email) {
      invitedUser = await User.findOne({ email: email.toLowerCase() });
    } else if (phone) {
      invitedUser = await User.findOne({ phone: phone.trim() });
    }

    // If user doesn't exist, create a temporary/reference user
    if (!invitedUser) {
      invitedUser = await User.create({
        name: email || phone,
        email: email ? email.toLowerCase() : null,
        phone: phone ? phone.trim() : null,
        isActivated: false, // Not activated until they sign up
        subscriptionStatus: 'trial'
      });
      console.log(`Created temporary user for ${email || phone}`);
    }

    // Check if already a member
    if (group.isMember(invitedUser._id)) {
      return res.status(400).json({ success: false, message: 'User is already a member' });
    }

    // Add user to group
    await group.addMember(invitedUser._id);
    await group.populate('createdBy', 'name');
    await group.populate('members.userId', 'name avatar phone email');

    // In production, send invitation email/SMS here
    console.log(`Invitation sent to ${email || phone} for group ${group.name}. Invite code: ${group.inviteCode}`);

    res.json({
      success: true,
      message: invitedUser.isActivated ? 'Member invited successfully' : 'Invitation sent. User will be activated when they sign up.',
      group
    });
  } catch (error) {
    console.error('Invite member error:', error);
    res.status(500).json({ success: false, message: 'Failed to invite member' });
  }
});

// Remove member from group
router.delete('/:groupId/members/:memberId', authenticate, async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const member = group.members.find(m => m.userId.toString() === userId.toString());
    if (!member || member.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admins can remove members' });
    }

    if (memberId === userId.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot remove yourself. Use leave endpoint instead.' });
    }

    await group.removeMember(memberId);
    await group.populate('createdBy', 'name');
    await group.populate('members.userId', 'name avatar phone email isActivated');

    res.json({
      success: true,
      group
    });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove member' });
  }
});

// Leave group
router.post('/:groupId/leave', authenticate, async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    if (!group.isMember(userId)) {
      return res.status(400).json({ success: false, message: 'Not a member of this group' });
    }

    await group.removeMember(userId);

    res.json({
      success: true,
      message: 'Left group successfully'
    });
  } catch (error) {
    console.error('Leave group error:', error);
    res.status(500).json({ success: false, message: 'Failed to leave group' });
  }
});

// Archive group
router.post('/:groupId/archive', authenticate, async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const member = group.members.find(m => m.userId.toString() === userId.toString());
    if (!member || member.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admins can archive group' });
    }

    group.isArchived = true;
    await group.save();

    res.json({
      success: true,
      message: 'Group archived successfully'
    });
  } catch (error) {
    console.error('Archive group error:', error);
    res.status(500).json({ success: false, message: 'Failed to archive group' });
  }
});

// Unarchive group
router.post('/:groupId/unarchive', authenticate, async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const member = group.members.find(m => m.userId.toString() === userId.toString());
    if (!member || member.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admins can unarchive group' });
    }

    group.isArchived = false;
    await group.save();

    res.json({
      success: true,
      message: 'Group unarchived successfully'
    });
  } catch (error) {
    console.error('Unarchive group error:', error);
    res.status(500).json({ success: false, message: 'Failed to unarchive group' });
  }
});

module.exports = router;

