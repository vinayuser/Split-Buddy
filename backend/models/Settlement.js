const mongoose = require('mongoose');

const settlementSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
    index: true
  },
  fromUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  toUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  settledAt: {
    type: Date,
    default: Date.now
  },
  settledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: {
    type: String,
    maxlength: 200,
    default: ''
  }
}, {
  timestamps: true
});

// Indexes
settlementSchema.index({ groupId: 1, settledAt: -1 });
settlementSchema.index({ fromUser: 1, toUser: 1 });
settlementSchema.index({ settledAt: -1 });

module.exports = mongoose.model('Settlement', settlementSchema);

