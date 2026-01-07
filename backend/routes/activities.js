const express = require('express');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const Group = require('../models/Group');
const { authenticate } = require('../middleware/auth');
const { checkSubscriptionForRead } = require('../middleware/subscription');

const router = express.Router();

// Get all activities from user's groups with pagination
router.get('/', authenticate, checkSubscriptionForRead, async (req, res) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Get all groups where user is a member
    const groups = await Group.find({
      'members.userId': userId,
      isArchived: false
    }).select('_id name');

    const groupIds = groups.map(g => g._id);

    if (groupIds.length === 0) {
      return res.json({
        success: true,
        activities: [],
        pagination: {
          page,
          limit,
          total: 0,
          hasMore: false,
          totalPages: 0
        }
      });
    }

    // Fetch expenses and settlements
    const [expenses, settlements] = await Promise.all([
      Expense.find({ groupId: { $in: groupIds } })
        .populate('paidBy', 'name avatar')
        .populate('createdBy', 'name avatar')
        .populate('groupId', 'name')
        .sort({ createdAt: -1 })
        .select('_id groupId amount description paidBy createdBy createdAt splitType splits'),
      
      Settlement.find({ groupId: { $in: groupIds } })
        .populate('fromUser', 'name avatar')
        .populate('toUser', 'name avatar')
        .populate('settledBy', 'name avatar')
        .populate('groupId', 'name')
        .sort({ settledAt: -1 })
        .select('_id groupId fromUser toUser amount settledAt settledBy notes')
    ]);

    // Combine and format activities
    const activities = [];

    // Add expenses as activities
    expenses.forEach(expense => {
      const group = expense.groupId;
      activities.push({
        type: 'expense',
        id: expense._id,
        groupId: (group && group._id) || group,
        groupName: (group && group.name) || 'Unknown Group',
        user: expense.paidBy,
        createdBy: expense.createdBy,
        amount: expense.amount,
        description: expense.description,
        timestamp: expense.createdAt,
        metadata: {
          splitType: expense.splitType,
          splits: expense.splits
        }
      });
    });

    // Add settlements as activities
    settlements.forEach(settlement => {
      const group = settlement.groupId;
      activities.push({
        type: 'settlement',
        id: settlement._id,
        groupId: (group && group._id) || group,
        groupName: (group && group.name) || 'Unknown Group',
        fromUser: settlement.fromUser,
        toUser: settlement.toUser,
        settledBy: settlement.settledBy,
        amount: settlement.amount,
        notes: settlement.notes,
        timestamp: settlement.settledAt
      });
    });

    // Sort by timestamp (latest first)
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Get total count for pagination
    const total = activities.length;

    // Apply pagination
    const paginatedActivities = activities.slice(skip, skip + limit);
    const hasMore = skip + paginatedActivities.length < total;

    res.json({
      success: true,
      activities: paginatedActivities,
      pagination: {
        page,
        limit,
        total,
        hasMore,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activities',
      error: error.message
    });
  }
});

module.exports = router;

