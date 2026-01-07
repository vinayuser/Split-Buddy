const mongoose = require('mongoose');

const groupMemberSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'member'],
    default: 'member'
  },
  joinedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [groupMemberSchema],
  inviteCode: {
    type: String,
    unique: true,
    required: true,
    index: true
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  simplifyDebts: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
groupSchema.index({ createdBy: 1 });
groupSchema.index({ 'members.userId': 1 });
groupSchema.index({ inviteCode: 1 });
groupSchema.index({ isArchived: 1 });

// Methods
groupSchema.methods.addMember = function(userId, role = 'member') {
  const existingMember = this.members.find(m => m.userId.toString() === userId.toString());
  if (!existingMember) {
    this.members.push({ userId, role, joinedAt: new Date() });
  }
  return this.save();
};

groupSchema.methods.removeMember = function(userId) {
  this.members = this.members.filter(m => m.userId.toString() !== userId.toString());
  return this.save();
};

groupSchema.methods.isMember = function(userId) {
  return this.members.some(m => m.userId.toString() === userId.toString());
};

// Generate unique invite code
groupSchema.statics.generateInviteCode = function() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
};

module.exports = mongoose.model('Group', groupSchema);

