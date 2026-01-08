const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  image: {
    type: String, // Base64 or URL
    default: null
  },
  action: {
    type: String, // Button text
    default: 'Learn More'
  },
  actionUrl: {
    type: String, // Optional URL to navigate to
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    default: null
  },
  createdBy: {
    type: String, // Admin username
    default: 'admin'
  }
}, {
  timestamps: true
});

// Indexes
bannerSchema.index({ isActive: 1, order: 1 });
bannerSchema.index({ startDate: 1, endDate: 1 });

module.exports = mongoose.model('Banner', bannerSchema);

