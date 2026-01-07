const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  phone: {
    type: String,
    trim: true,
    index: true,
    sparse: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    index: true,
    sparse: true
  },
  otp: {
    code: String,
    expiresAt: Date
  },
  subscriptionStatus: {
    type: String,
    enum: ['active', 'expired', 'trial'],
    default: 'trial'
  },
  isActivated: {
    type: Boolean,
    default: false
  },
  lastActiveAt: {
    type: Date,
    default: Date.now
  },
  avatar: {
    type: String,
    default: null
  },
  gender: {
    type: String,
    default: null,
    required: false,
    validate: {
      validator: function(value) {
        // Allow null, undefined, empty string, or valid enum values
        if (value === null || value === undefined || value === '') {
          return true;
        }
        return ['male', 'female', 'other', 'prefer_not_to_say'].indexOf(value) !== -1;
      },
      message: 'Gender must be one of: male, female, other, prefer_not_to_say, or null'
    }
  },
  address: {
    type: String,
    trim: true,
    maxlength: 500,
    default: null
  }
}, {
  timestamps: true
});

// Indexes
userSchema.index({ phone: 1 }, { unique: true, sparse: true });
userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ createdAt: 1 });

// Methods
userSchema.methods.updateLastActive = function() {
  this.lastActiveAt = new Date();
  return this.save();
};

userSchema.methods.isTrialActive = function() {
  const trialEndDate = new Date(this.createdAt);
  trialEndDate.setDate(trialEndDate.getDate() + 7);
  return new Date() <= trialEndDate;
};

module.exports = mongoose.model('User', userSchema);

