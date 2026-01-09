const mongoose = require('mongoose');

const expenseSplitSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: false });

const expenseSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  splitType: {
    type: String,
    enum: ['equal', 'custom'],
    required: true,
    default: 'equal'
  },
  splits: [expenseSplitSchema],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  image: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Indexes
expenseSchema.index({ groupId: 1, createdAt: -1 });
expenseSchema.index({ paidBy: 1 });
expenseSchema.index({ createdAt: -1 });

// Validation
expenseSchema.pre('save', function(next) {
  if (this.splitType === 'equal' && this.splits.length === 0) {
    return next(new Error('Equal split requires participants'));
  }
  
  if (this.splitType === 'custom') {
    const totalSplit = this.splits.reduce((sum, split) => sum + split.amount, 0);
    if (Math.abs(totalSplit - this.amount) > 0.01) {
      return next(new Error('Custom split amounts must equal expense amount'));
    }
  }
  
  next();
});

module.exports = mongoose.model('Expense', expenseSchema);

