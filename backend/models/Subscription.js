const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'cancelled'],
    required: true,
    default: 'active'
  },
  planType: {
    type: String,
    enum: ['monthly_10', 'monthly_15'],
    required: true
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  googlePlayOrderId: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  googlePlayPurchaseToken: {
    type: String,
    index: true
  },
  lastVerifiedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes
subscriptionSchema.index({ userId: 1, status: 1 });
subscriptionSchema.index({ endDate: 1 });
subscriptionSchema.index({ status: 1, endDate: 1 });

// Methods
subscriptionSchema.methods.isActive = function() {
  return this.status === 'active' && new Date() <= this.endDate;
};

subscriptionSchema.methods.extend = function(days = 30) {
  const currentEndDate = this.endDate > new Date() ? this.endDate : new Date();
  this.endDate = new Date(currentEndDate);
  this.endDate.setDate(this.endDate.getDate() + days);
  this.status = 'active';
  return this.save();
};

module.exports = mongoose.model('Subscription', subscriptionSchema);

