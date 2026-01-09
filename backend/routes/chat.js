const express = require('express');
const { body, validationResult } = require('express-validator');
const Message = require('../models/Message');
const Group = require('../models/Group');
const { authenticate } = require('../middleware/auth');
const { checkSubscriptionForRead, checkSubscriptionForWrite } = require('../middleware/subscription');

const router = express.Router();

// Get messages for a group with pagination
router.get('/group/:groupId', authenticate, checkSubscriptionForRead, async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Verify user is a member of the group
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    if (!group.isMember(userId)) {
      return res.status(403).json({ success: false, message: 'Not a member of this group' });
    }

    // Get total count for pagination
    const totalMessages = await Message.countDocuments({ 
      groupId, 
      isDeleted: false 
    });

    // Get messages (newest first, but we'll reverse for display)
    const messages = await Message.find({ 
      groupId, 
      isDeleted: false 
    })
      .populate('senderId', 'name avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-__v');

    // Reverse to show oldest first (for chat UI)
    const reversedMessages = messages.reverse();

    const hasMore = skip + messages.length < totalMessages;

    res.json({
      success: true,
      messages: reversedMessages,
      pagination: {
        page,
        limit,
        total: totalMessages,
        hasMore,
        totalPages: Math.ceil(totalMessages / limit)
      }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ success: false, message: 'Failed to get messages' });
  }
});

// Mark messages as read (optional - for read receipts)
router.post('/group/:groupId/read', authenticate, checkSubscriptionForRead, async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    // Verify user is a member
    const group = await Group.findById(groupId);
    if (!group || !group.isMember(userId)) {
      return res.status(403).json({ success: false, message: 'Not a member of this group' });
    }

    // For now, just return success
    // In future, you can implement read receipts with a separate model
    res.json({ success: true });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark messages as read' });
  }
});

module.exports = router;

