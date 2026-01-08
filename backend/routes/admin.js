const express = require('express');
const router = express.Router();
const multer = require('multer');
const Banner = require('../models/Banner');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const { sendNotificationToTopic } = require('../services/notificationService');
const adminAuth = require('../middleware/adminAuth');

// Configure multer for file uploads (memory storage to convert to base64)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

// Admin login page
router.get('/login', (req, res) => {
  if (req.session && req.session.adminLoggedIn) {
    return res.redirect('/admin/dashboard');
  }
  res.render('admin/login', { error: null });
});

// Admin login POST
router.post('/login', (req, res) => {
  const { password } = req.body;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

  if (password === ADMIN_PASSWORD) {
    req.session.adminLoggedIn = true;
    res.redirect('/admin/dashboard');
  } else {
    res.render('admin/login', { error: 'Invalid password' });
  }
});

// Admin logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

// Dashboard
router.get('/dashboard', adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ subscriptionStatus: 'active' });
    const trialUsers = await User.countDocuments({ subscriptionStatus: 'trial' });
    const totalGroups = await (await require('../models/Group')).countDocuments();
    const totalBanners = await Banner.countDocuments();
    const activeBanners = await Banner.countDocuments({ isActive: true });

    res.render('admin/dashboard', {
      totalUsers,
      activeUsers,
      trialUsers,
      totalGroups,
      totalBanners,
      activeBanners,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.render('admin/dashboard', {
      totalUsers: 0,
      activeUsers: 0,
      trialUsers: 0,
      totalGroups: 0,
      totalBanners: 0,
      activeBanners: 0,
      error: 'Failed to load statistics',
    });
  }
});

// Banner Management
router.get('/banners', adminAuth, async (req, res) => {
  try {
    const banners = await Banner.find().sort({ order: 1, createdAt: -1 });
    res.render('admin/banners', { 
      banners,
      success: req.query.success || null,
      error: req.query.error || null,
    });
  } catch (error) {
    console.error('Banners error:', error);
    res.render('admin/banners', { 
      banners: [], 
      error: req.query.error || 'Failed to load banners',
      success: null,
    });
  }
});

// Helper function to convert file to base64
const fileToBase64 = (file) => {
  if (!file) return null;
  const base64 = file.buffer.toString('base64');
  const mimeType = file.mimetype;
  return `data:${mimeType};base64,${base64}`;
};

// Create Banner
router.post('/banners', adminAuth, upload.single('image'), async (req, res) => {
  try {
    const { title, description, action, actionUrl, isActive, order, endDate } = req.body;
    
    // Convert uploaded file to base64 if provided
    let imageData = null;
    if (req.file) {
      imageData = fileToBase64(req.file);
    } else if (req.body.image && req.body.image.trim() !== '') {
      // Fallback: if image is provided as base64 string (for backward compatibility)
      imageData = req.body.image;
    }
    
    const banner = new Banner({
      title,
      description,
      image: imageData,
      action: action || 'Learn More',
      actionUrl: actionUrl || null,
      isActive: isActive === 'on' || isActive === true,
      order: parseInt(order) || 0,
      endDate: endDate ? new Date(endDate) : null,
      createdBy: req.session.adminUsername || 'admin',
    });

    await banner.save();
    res.redirect('/admin/banners?success=Banner created successfully');
  } catch (error) {
    console.error('Create banner error:', error);
    const errorMessage = error.message || 'Failed to create banner';
    res.redirect(`/admin/banners?error=${encodeURIComponent(errorMessage)}`);
  }
});

// Update Banner
router.post('/banners/:id', adminAuth, upload.single('image'), async (req, res) => {
  try {
    const { title, description, action, actionUrl, isActive, order, endDate } = req.body;
    
    const updateData = {
      title,
      description,
      action: action || 'Learn More',
      actionUrl: actionUrl || null,
      isActive: isActive === 'on' || isActive === true,
      order: parseInt(order) || 0,
      endDate: endDate ? new Date(endDate) : null,
    };
    
    // Only update image if a new file was uploaded
    if (req.file) {
      updateData.image = fileToBase64(req.file);
    } else if (req.body.image && req.body.image.trim() !== '') {
      // Fallback: if image is provided as base64 string
      updateData.image = req.body.image;
    }
    // If no image provided, keep existing image (don't update the field)
    
    await Banner.findByIdAndUpdate(req.params.id, updateData);

    res.redirect('/admin/banners?success=Banner updated successfully');
  } catch (error) {
    console.error('Update banner error:', error);
    const errorMessage = error.message || 'Failed to update banner';
    res.redirect(`/admin/banners?error=${encodeURIComponent(errorMessage)}`);
  }
});

// Delete Banner
router.post('/banners/:id/delete', adminAuth, async (req, res) => {
  try {
    await Banner.findByIdAndDelete(req.params.id);
    res.redirect('/admin/banners?success=Banner deleted successfully');
  } catch (error) {
    console.error('Delete banner error:', error);
    res.redirect('/admin/banners?error=Failed to delete banner');
  }
});

// Get Banner for Edit
router.get('/banners/:id/edit', adminAuth, async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) {
      return res.redirect('/admin/banners?error=Banner not found');
    }
    res.render('admin/banner-edit', { banner });
  } catch (error) {
    console.error('Get banner error:', error);
    res.redirect('/admin/banners?error=Failed to load banner');
  }
});

// Notifications - Send Global Notification
router.get('/notifications', adminAuth, (req, res) => {
  res.render('admin/notifications', { success: null, error: null });
});

router.post('/notifications', adminAuth, async (req, res) => {
  try {
    const { title, body, topic } = req.body;
    const notificationTopic = topic || 'all_users'; // Default topic

    if (!title || !body) {
      return res.render('admin/notifications', {
        success: null,
        error: 'Title and body are required',
      });
    }

    const result = await sendNotificationToTopic(notificationTopic, title, body, {
      type: 'global_notification',
      timestamp: new Date().toISOString(),
    });

    if (result.success) {
      res.render('admin/notifications', {
        success: `Notification sent successfully to topic: ${notificationTopic}`,
        error: null,
      });
    } else {
      res.render('admin/notifications', {
        success: null,
        error: `Failed to send notification: ${result.error}`,
      });
    }
  } catch (error) {
    console.error('Send notification error:', error);
    res.render('admin/notifications', {
      success: null,
      error: `Failed to send notification: ${error.message}`,
    });
  }
});

// Users Management
router.get('/users', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const users = await User.find()
      .select('name phone email subscriptionStatus createdAt lastActiveAt')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const totalUsers = await User.countDocuments();
    const totalPages = Math.ceil(totalUsers / limit);

    res.render('admin/users', {
      users,
      currentPage: page,
      totalPages,
      totalUsers,
    });
  } catch (error) {
    console.error('Users error:', error);
    res.render('admin/users', {
      users: [],
      currentPage: 1,
      totalPages: 0,
      totalUsers: 0,
      error: 'Failed to load users',
    });
  }
});

// User Detail
router.get('/users/:id', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.redirect('/admin/users?error=User not found');
    }

    const subscriptions = await Subscription.find({ userId: user._id }).sort({ createdAt: -1 });
    const Group = require('../models/Group');
    const groups = await Group.find({ 'members.userId': user._id }).populate('createdBy', 'name');

    res.render('admin/user-detail', {
      user,
      subscriptions,
      groups,
    });
  } catch (error) {
    console.error('User detail error:', error);
    res.redirect('/admin/users?error=Failed to load user');
  }
});

// Update User Subscription
router.post('/users/:id/subscription', adminAuth, async (req, res) => {
  try {
    const { subscriptionStatus } = req.body;
    await User.findByIdAndUpdate(req.params.id, { subscriptionStatus });
    res.redirect(`/admin/users/${req.params.id}?success=Subscription updated`);
  } catch (error) {
    console.error('Update subscription error:', error);
    res.redirect(`/admin/users/${req.params.id}?error=Failed to update subscription`);
  }
});

// Subscriptions Management
router.get('/subscriptions', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const subscriptions = await Subscription.find()
      .populate('userId', 'name phone email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const totalSubscriptions = await Subscription.countDocuments();
    const totalPages = Math.ceil(totalSubscriptions / limit);

    res.render('admin/subscriptions', {
      subscriptions,
      currentPage: page,
      totalPages,
      totalSubscriptions,
    });
  } catch (error) {
    console.error('Subscriptions error:', error);
    res.render('admin/subscriptions', {
      subscriptions: [],
      currentPage: 1,
      totalPages: 0,
      totalSubscriptions: 0,
      error: 'Failed to load subscriptions',
    });
  }
});

module.exports = router;

