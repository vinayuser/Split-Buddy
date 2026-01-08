const express = require('express');
const router = express.Router();
const Banner = require('../models/Banner');

// Get active banners (for mobile app)
router.get('/', async (req, res) => {
  try {
    const { active } = req.query;
    const query = {};
    
    if (active === 'true') {
      query.isActive = true;
      // Also check if banner hasn't expired
      query.$or = [
        { endDate: null },
        { endDate: { $gte: new Date() } }
      ];
    }

    const banners = await Banner.find(query)
      .sort({ order: 1, createdAt: -1 })
      .select('title description image action actionUrl');

    res.json({
      success: true,
      banners,
    });
  } catch (error) {
    console.error('Get banners error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch banners',
    });
  }
});

module.exports = router;

