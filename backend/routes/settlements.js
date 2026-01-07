const express = require('express');
const { body, validationResult } = require('express-validator');
const Settlement = require('../models/Settlement');
const Group = require('../models/Group');
const { authenticate } = require('../middleware/auth');
const { checkSubscriptionForWrite, checkSubscriptionForRead } = require('../middleware/subscription');

const router = express.Router();

// Get settlements for a group
router.get('/group/:groupId', authenticate, checkSubscriptionForRead, async (req, res) => {
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

    const settlements = await Settlement.find({ groupId })
      .populate('fromUser', 'name avatar')
      .populate('toUser', 'name avatar')
      .populate('settledBy', 'name')
      .sort({ settledAt: -1 })
      .select('-__v');

    res.json({
      success: true,
      settlements
    });
  } catch (error) {
    console.error('Get settlements error:', error);
    res.status(500).json({ success: false, message: 'Failed to get settlements' });
  }
});

// Create settlement
router.post('/', authenticate, checkSubscriptionForWrite, [
  body('groupId').notEmpty().withMessage('Group ID is required').custom((value) => {
    return /^[0-9a-fA-F]{24}$/.test(value);
  }).withMessage('Invalid group ID format'),
  body('fromUser').notEmpty().withMessage('From user ID is required').custom((value) => {
    return /^[0-9a-fA-F]{24}$/.test(value);
  }).withMessage('Invalid from user ID format'),
  body('toUser').notEmpty().withMessage('To user ID is required').custom((value) => {
    return /^[0-9a-fA-F]{24}$/.test(value);
  }).withMessage('Invalid to user ID format'),
  body('amount').notEmpty().withMessage('Amount is required').isFloat({ min: 0.01 }).withMessage('Amount must be at least 0.01'),
  body('notes').optional({ nullable: true }).trim().isLength({ max: 200 }).withMessage('Notes must be max 200 characters')
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

    const { groupId, fromUser, toUser, amount, notes } = req.body;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    if (!group.isMember(userId)) {
      return res.status(403).json({ success: false, message: 'Not a member of this group' });
    }

    if (!group.isMember(fromUser) || !group.isMember(toUser)) {
      return res.status(400).json({ success: false, message: 'Both users must be group members' });
    }

    if (fromUser === toUser) {
      return res.status(400).json({ success: false, message: 'Cannot settle with yourself' });
    }

    const settlement = await Settlement.create({
      groupId,
      fromUser,
      toUser,
      amount: parseFloat(amount),
      settledBy: userId,
      notes: notes || ''
    });

    await settlement.populate('fromUser', 'name avatar');
    await settlement.populate('toUser', 'name avatar');
    await settlement.populate('settledBy', 'name');

    res.status(201).json({
      success: true,
      settlement
    });
  } catch (error) {
    console.error('Create settlement error:', error);
    res.status(500).json({ success: false, message: 'Failed to create settlement' });
  }
});

// Delete settlement
router.delete('/:settlementId', authenticate, checkSubscriptionForWrite, async (req, res) => {
  try {
    const { settlementId } = req.params;
    const userId = req.user._id;

    const settlement = await Settlement.findById(settlementId);
    if (!settlement) {
      return res.status(404).json({ success: false, message: 'Settlement not found' });
    }

    const group = await Group.findById(settlement.groupId);
    if (!group || !group.isMember(userId)) {
      return res.status(403).json({ success: false, message: 'Not a member of this group' });
    }

    await Settlement.findByIdAndDelete(settlementId);

    res.json({
      success: true,
      message: 'Settlement deleted successfully'
    });
  } catch (error) {
    console.error('Delete settlement error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete settlement' });
  }
});

module.exports = router;

