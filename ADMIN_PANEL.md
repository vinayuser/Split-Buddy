# Admin Panel Documentation

## Overview
The admin panel is a web-based interface built with EJS templates for managing the Split Buddy application. It provides functionality to manage banner ads, send global notifications, manage users, and view subscriptions.

## Access
- **URL**: `http://your-server:3000/admin/login`
- **Default Password**: `admin123` (Set via `ADMIN_PASSWORD` environment variable)

## Features

### 1. Dashboard
- View statistics:
  - Total Users
  - Active Users
  - Trial Users
  - Total Groups
  - Total Banners
  - Active Banners

### 2. Banner Management
- **Create Banners**: Add new banner ads with title, description, image (base64 or URL), action button text, and optional action URL
- **Edit Banners**: Update existing banners
- **Delete Banners**: Remove banners
- **Order Management**: Set display order (lower numbers appear first)
- **Active/Inactive**: Toggle banner visibility
- **Date Management**: Set end dates for time-limited banners

### 3. Global Notifications
- Send push notifications to all users via Firebase topics
- **Topics Available**:
  - `all_users` - All users subscribed to this topic
  - `premium_users` - Premium users only
  - `trial_users` - Trial users only
- **Note**: Users must subscribe to topics in the mobile app to receive notifications

### 4. User Management
- View all users with pagination (20 per page)
- View user details:
  - User information
  - Subscription status
  - Groups membership
  - Subscription history
- Update user subscription status (trial/active/expired)

### 5. Subscription Management
- View all subscriptions with pagination
- See subscription details:
  - User information
  - Plan type
  - Status
  - Start and end dates

## Environment Variables

Add these to your `.env` file:

```env
# Admin Panel
ADMIN_PASSWORD=your-secure-password-here
SESSION_SECRET=your-session-secret-here

# Firebase (for notifications)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email
```

## Security Notes

1. **Change Default Password**: Always set a strong `ADMIN_PASSWORD` in production
2. **Session Security**: Use a strong `SESSION_SECRET` in production
3. **HTTPS**: In production, enable HTTPS and set `secure: true` in session config
4. **IP Whitelisting**: Consider adding IP whitelisting for admin routes in production

## Firebase Topic Setup

To enable topic-based notifications:

1. In your mobile app, users need to subscribe to topics:
   ```javascript
   // Example: Subscribe to 'all_users' topic
   await messaging().subscribeToTopic('all_users');
   ```

2. The admin panel can then send notifications to these topics

## API Endpoints

All admin routes are prefixed with `/admin`:

- `GET /admin/login` - Login page
- `POST /admin/login` - Login handler
- `GET /admin/logout` - Logout
- `GET /admin/dashboard` - Dashboard
- `GET /admin/banners` - List banners
- `POST /admin/banners` - Create banner
- `GET /admin/banners/:id/edit` - Edit banner form
- `POST /admin/banners/:id` - Update banner
- `POST /admin/banners/:id/delete` - Delete banner
- `GET /admin/notifications` - Notification form
- `POST /admin/notifications` - Send notification
- `GET /admin/users` - List users
- `GET /admin/users/:id` - User details
- `POST /admin/users/:id/subscription` - Update user subscription
- `GET /admin/subscriptions` - List subscriptions

## Database Models

### Banner Model
- `title` (String, required)
- `description` (String, required)
- `image` (String, base64 or URL)
- `action` (String, button text)
- `actionUrl` (String, optional)
- `isActive` (Boolean)
- `order` (Number)
- `startDate` (Date)
- `endDate` (Date)
- `createdBy` (String)

## Mobile App Integration

### Banner Ads
The mobile app should fetch active banners from the API:
```javascript
GET /api/banners?active=true
```

### Notifications
Users need to subscribe to Firebase topics in the mobile app to receive global notifications.

## Troubleshooting

1. **Can't login**: Check `ADMIN_PASSWORD` environment variable
2. **Notifications not sending**: Verify Firebase credentials in `.env`
3. **Banners not showing**: Check if banners are marked as `isActive: true`
4. **Session issues**: Clear browser cookies and try again

