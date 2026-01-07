const express = require('express');
const { body, validationResult } = require('express-validator');
const Expense = require('../models/Expense');
const Group = require('../models/Group');
const { authenticate } = require('../middleware/auth');
const { checkSubscriptionForWrite, checkSubscriptionForRead } = require('../middleware/subscription');

const router = express.Router();

// Get expenses for a group with pagination
router.get('/group/:groupId', authenticate, checkSubscriptionForRead, async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    if (!group.isMember(userId)) {
      return res.status(403).json({ success: false, message: 'Not a member of this group' });
    }

    // Get total count for pagination
    const totalExpenses = await Expense.countDocuments({ groupId });

    const expenses = await Expense.find({ groupId })
      .populate('paidBy', 'name avatar')
      .populate('splits.userId', 'name avatar isActivated')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-__v');

    const hasMore = skip + expenses.length < totalExpenses;

    res.json({
      success: true,
      expenses,
      pagination: {
        page,
        limit,
        total: totalExpenses,
        hasMore,
        totalPages: Math.ceil(totalExpenses / limit)
      }
    });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ success: false, message: 'Failed to get expenses' });
  }
});

// Get expense by ID
router.get('/:expenseId', authenticate, checkSubscriptionForRead, async (req, res) => {
  try {
    const { expenseId } = req.params;
    const userId = req.user._id;

    const expense = await Expense.findById(expenseId)
      .populate('paidBy', 'name avatar')
      .populate('splits.userId', 'name avatar isActivated')
      .populate('createdBy', 'name')
      .populate('groupId', 'name');

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    const group = await Group.findById(expense.groupId);
    if (!group || !group.isMember(userId)) {
      return res.status(403).json({ success: false, message: 'Not a member of this group' });
    }

    res.json({
      success: true,
      expense
    });
  } catch (error) {
    console.error('Get expense error:', error);
    res.status(500).json({ success: false, message: 'Failed to get expense' });
  }
});

// Create expense
router.post('/', authenticate, checkSubscriptionForWrite, [
  body('groupId').notEmpty().withMessage('Group ID is required').custom((value) => {
    return /^[0-9a-fA-F]{24}$/.test(value);
  }).withMessage('Invalid group ID format'),
  body('amount').notEmpty().withMessage('Amount is required').isFloat({ min: 0.01 }).withMessage('Amount must be at least 0.01'),
  body('description').trim().notEmpty().withMessage('Description is required').isLength({ min: 1, max: 200 }).withMessage('Description must be 1-200 characters'),
  body('paidBy').notEmpty().withMessage('Payer ID is required').custom((value) => {
    return /^[0-9a-fA-F]{24}$/.test(value);
  }).withMessage('Invalid payer ID format'),
  body('splitType').isIn(['equal', 'custom']).withMessage('Split type must be equal or custom'),
  body('splits').isArray({ min: 1 }).withMessage('At least one participant required')
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

    const { groupId, amount, description, paidBy, splitType, splits } = req.body;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    if (!group.isMember(userId)) {
      return res.status(403).json({ success: false, message: 'Not a member of this group' });
    }

    if (!group.isMember(paidBy)) {
      return res.status(400).json({ success: false, message: 'Payer must be a group member' });
    }

    // Validate splits
    if (splitType === 'equal') {
      const splitAmount = amount / splits.length;
      splits.forEach(split => {
        split.amount = splitAmount;
      });
    } else {
      const totalSplit = splits.reduce((sum, split) => sum + parseFloat(split.amount || 0), 0);
      if (Math.abs(totalSplit - amount) > 0.01) {
        return res.status(400).json({ 
          success: false, 
          message: 'Custom split amounts must equal expense amount' 
        });
      }
    }

    // Validate all participants are group members
    for (const split of splits) {
      if (!group.isMember(split.userId)) {
        return res.status(400).json({ 
          success: false, 
          message: `User ${split.userId} is not a group member` 
        });
      }
    }

    const expense = await Expense.create({
      groupId,
      amount: parseFloat(amount),
      description,
      paidBy,
      splitType,
      splits: splits.map(s => ({
        userId: s.userId,
        amount: parseFloat(s.amount)
      })),
      createdBy: userId
    });

    await expense.populate('paidBy', 'name avatar');
    await expense.populate('splits.userId', 'name avatar');
    await expense.populate('createdBy', 'name');

    res.status(201).json({
      success: true,
      expense
    });
  } catch (error) {
    console.error('Create expense error:', error);
    if (error.message.includes('split')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Failed to create expense' });
  }
});

// Update expense
router.put('/:expenseId', authenticate, checkSubscriptionForWrite, [
  body('amount').optional({ nullable: true }).isFloat({ min: 0.01 }).withMessage('Amount must be at least 0.01'),
  body('description').optional({ nullable: true }).trim().isLength({ min: 1, max: 200 }).withMessage('Description must be 1-200 characters'),
  body('paidBy').optional({ nullable: true }).custom((value) => {
    if (!value) return true;
    return /^[0-9a-fA-F]{24}$/.test(value);
  }).withMessage('Invalid payer ID format'),
  body('splitType').optional({ nullable: true }).isIn(['equal', 'custom']).withMessage('Split type must be equal or custom'),
  body('splits').optional({ nullable: true }).isArray({ min: 1 }).withMessage('At least one participant required')
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

    const { expenseId } = req.params;
    const userId = req.user._id;
    const { amount, description, paidBy, splitType, splits } = req.body;

    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    const group = await Group.findById(expense.groupId);
    if (!group || !group.isMember(userId)) {
      return res.status(403).json({ success: false, message: 'Not a member of this group' });
    }

    if (amount !== undefined) expense.amount = parseFloat(amount);
    if (description !== undefined) expense.description = description;
    if (paidBy !== undefined) {
      if (!group.isMember(paidBy)) {
        return res.status(400).json({ success: false, message: 'Payer must be a group member' });
      }
      expense.paidBy = paidBy;
    }
    if (splitType !== undefined) expense.splitType = splitType;
    if (splits !== undefined) {
      if (splitType === 'equal' || expense.splitType === 'equal') {
        const splitAmount = expense.amount / splits.length;
        expense.splits = splits.map(s => ({
          userId: s.userId,
          amount: splitAmount
        }));
      } else {
        const totalSplit = splits.reduce((sum, split) => sum + parseFloat(split.amount || 0), 0);
        if (Math.abs(totalSplit - expense.amount) > 0.01) {
          return res.status(400).json({ 
            success: false, 
            message: 'Custom split amounts must equal expense amount' 
          });
        }
        expense.splits = splits.map(s => ({
          userId: s.userId,
          amount: parseFloat(s.amount)
        }));
      }

      // Validate all participants are group members
      for (const split of expense.splits) {
        if (!group.isMember(split.userId)) {
          return res.status(400).json({ 
            success: false, 
            message: `User ${split.userId} is not a group member` 
          });
        }
      }
    }

    await expense.save();
    await expense.populate('paidBy', 'name avatar');
    await expense.populate('splits.userId', 'name avatar');
    await expense.populate('createdBy', 'name');

    res.json({
      success: true,
      expense
    });
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({ success: false, message: 'Failed to update expense' });
  }
});

// Delete expense
router.delete('/:expenseId', authenticate, checkSubscriptionForWrite, async (req, res) => {
  try {
    const { expenseId } = req.params;
    const userId = req.user._id;

    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    const group = await Group.findById(expense.groupId);
    if (!group || !group.isMember(userId)) {
      return res.status(403).json({ success: false, message: 'Not a member of this group' });
    }

    await Expense.findByIdAndDelete(expenseId);

    res.json({
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete expense' });
  }
});

module.exports = router;

