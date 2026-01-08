// Simple admin authentication middleware
// In production, use proper JWT or session-based auth

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'; // Change this in production!

const adminAuth = (req, res, next) => {
  // Check if admin is logged in via session
  if (req.session && req.session.adminLoggedIn) {
    return next();
  }

  // If not logged in, redirect to login
  res.redirect('/admin/login');
};

module.exports = adminAuth;

