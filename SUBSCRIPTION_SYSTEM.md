# Subscription System Documentation

## Overview

The app implements a subscription system with a **7-day free trial** period. After the trial expires, users must purchase a subscription plan to continue using premium features.

## How It Works

### 1. Trial Period (7 Days Free)

- **Automatic**: Every new user gets 7 days of free access starting from account creation
- **Status**: User's `subscriptionStatus` is set to `'trial'` during this period
- **Calculation**: Trial end date = `user.createdAt + 7 days`
- **Access**: Full access to all features during trial

### 2. Trial Expiration

- **Automatic Detection**: System checks trial status on every write operation (creating expenses, etc.)
- **Status Update**: When trial expires, `subscriptionStatus` is automatically updated to `'expired'`
- **Access Restriction**: Users cannot create expenses or perform write operations after trial expires
- **Read Access**: Users can still view their data (read-only access)

### 3. Subscription Plans

Two subscription plans are available:

1. **Premium** - ₹10/month
   - Unlimited groups
   - Unlimited expenses
   - Advanced analytics
   - Priority support

2. **Premium Plus** - ₹15/month
   - Everything in Premium
   - Export reports
   - Custom categories
   - Ad-free experience

### 4. Subscription Status Flow

```
New User → Trial (7 days) → Expired → Active (after purchase)
```

## Backend Implementation

### User Model

- `subscriptionStatus`: `'trial' | 'active' | 'expired'` (default: `'trial'`)
- `isTrialActive()`: Method to check if trial is still active
- `createdAt`: Used to calculate trial end date

### Subscription Model

- Stores paid subscription details
- Tracks plan type, start/end dates
- Handles Google Play/App Store purchase tokens

### Middleware

**`checkSubscriptionForWrite`**: 
- Checks if user has active subscription OR
- Checks if user is in trial period OR
- Checks if user is in a group with active subscription
- Blocks write operations if none of the above

**`checkSubscriptionForRead`**:
- Always allows read access (even with expired subscription)

### API Endpoints

- `GET /api/subscriptions/status` - Get current subscription status
- `POST /api/subscriptions/verify` - Verify and activate subscription purchase
- `GET /api/subscriptions/history` - Get subscription history

## Mobile App Implementation

### Subscription Screen

- **Location**: Accessible from Profile screen
- **Features**:
  - Shows current subscription status
  - Displays trial days remaining
  - Shows subscription plans
  - Handles purchase flow

### Profile Screen

- Shows subscription status badge
- Displays trial days remaining (if in trial)
- Shows expiration date (if active subscription)
- Button to navigate to Subscription screen

## Trial Status Display

The subscription status endpoint returns:

```json
{
  "status": "trial" | "active" | "expired" | "group_active",
  "active": true | false,
  "daysRemaining": 5,  // Only for trial status
  "trialEndDate": "2024-01-15",  // Only for trial status
  "endDate": "2024-02-15",  // Only for active status
  "planType": "monthly_10" | "monthly_15"  // Only for active status
}
```

## Automatic Status Updates

1. **On Write Operations**: Middleware checks and updates trial status
2. **On Status Check**: Subscription service updates user status if needed
3. **On Purchase**: User status is updated to `'active'`

## Testing

### Test Trial Status

1. Create a new user account
2. Check subscription status - should show `"status": "trial"`
3. Wait 7 days (or manually adjust `createdAt` in database)
4. Try to create an expense - should be blocked with trial expired message

### Test Subscription Purchase

1. Navigate to Subscription screen
2. Click "Subscribe Now" on a plan
3. Complete purchase flow (or use test token)
4. Verify status changes to `"status": "active"`

## Important Notes

- **Trial is automatic** - No action needed from user
- **Status updates automatically** - System handles trial expiration
- **Read access always allowed** - Users can view data even after expiration
- **Write access requires subscription** - Creating expenses, etc. requires active subscription or trial
- **Group subscriptions** - Users in groups with active subscribers get access

## Future Enhancements

- Email notifications before trial expires
- In-app purchase integration (Google Play / App Store)
- Subscription management (cancel, renew)
- Promotional offers and discounts

