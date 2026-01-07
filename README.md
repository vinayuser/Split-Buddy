# Splitwise App - Expense Sharing Application

A production-ready expense sharing mobile application optimized for Indian users, similar to Splitwise but simpler and focused.

## Tech Stack

- **Frontend**: React Native (Expo)
- **Backend**: Node.js (Express)
- **Database**: MongoDB (Mongoose)
- **Authentication**: OTP-based (Phone/Email)
- **Payments**: Google Play Subscription (₹10 or ₹15/month)
- **Platform**: Android-first
- **Deployment**: AWS (EC2 + MongoDB Atlas)

## Features

### 1. Authentication
- Phone number login with OTP
- Optional email login
- JWT-based session management
- Minimal user profile

### 2. Group Management
- Create expense groups
- Invite users via shareable link/invite code
- Join group via code
- Remove members
- Leave group
- Archive group
- Group-level subscription logic (one user subscription keeps group active)

### 3. Expense Management
- Add expense with amount, description, paidBy, splitType (equal/custom), participants
- Edit expense
- Delete expense
- Expense history per group
- Offline-first support with local cache + sync

### 4. Balance Calculation
- Calculate who owes whom
- Net balance per user
- Optimize settlements (minimize transactions)
- Real-time update after expense changes

### 5. Settlement Tracking
- Mark balances as settled manually
- Store settlement history
- No UPI or bank integration

### 6. Subscription Handling
- 7-day free trial
- Monthly subscription (₹10 or ₹15)
- Subscription validation via Play Store receipt
- Soft-lock after expiry (read-only access)

## Project Structure

```
splitwise-app/
├── backend/
│   ├── middleware/
│   │   ├── auth.js          # JWT authentication
│   │   └── subscription.js  # Subscription checks
│   ├── models/
│   │   ├── User.js
│   │   ├── Group.js
│   │   ├── Expense.js
│   │   ├── Settlement.js
│   │   └── Subscription.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── groups.js
│   │   ├── expenses.js
│   │   ├── balances.js
│   │   ├── settlements.js
│   │   └── subscriptions.js
│   └── services/
│       ├── otpService.js
│       ├── balanceService.js
│       └── subscriptionService.js
├── mobile/
│   ├── src/
│   │   ├── config/
│   │   │   └── api.js        # API configuration
│   │   ├── context/
│   │   │   └── AuthContext.js
│   │   ├── navigation/
│   │   │   ├── AuthNavigator.js
│   │   │   └── MainNavigator.js
│   │   ├── screens/
│   │   │   ├── auth/
│   │   │   ├── home/
│   │   │   ├── groups/
│   │   │   ├── expenses/
│   │   │   ├── balances/
│   │   │   ├── settlements/
│   │   │   └── profile/
│   │   └── services/
│   │       └── api.js        # API service layer
│   ├── App.js
│   ├── app.json
│   └── package.json
├── server.js                 # Express server entry point
├── package.json
└── README.md
```

## Setup Instructions

### Backend Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start MongoDB:**
   - Local: Ensure MongoDB is running
   - Atlas: Update MONGODB_URI in .env

4. **Start server:**
   ```bash
   npm start
   # or for development
   npm run dev
   ```

### Frontend Setup

1. **Navigate to mobile directory:**
   ```bash
   cd mobile
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Update API configuration:**
   - Edit `mobile/src/config/api.js`
   - Update `API_BASE_URL` for production

4. **Start Expo:**
   ```bash
   npm start
   # or
   expo start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/send-otp` - Send OTP
- `POST /api/auth/verify-otp` - Verify OTP and login
- `POST /api/auth/refresh-token` - Refresh JWT token
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile

### Groups
- `GET /api/groups` - Get all groups
- `GET /api/groups/:groupId` - Get group details
- `POST /api/groups` - Create group
- `PUT /api/groups/:groupId` - Update group
- `POST /api/groups/join` - Join group via invite code
- `POST /api/groups/:groupId/leave` - Leave group
- `POST /api/groups/:groupId/archive` - Archive group

### Expenses
- `GET /api/expenses/group/:groupId` - Get expenses for group
- `GET /api/expenses/:expenseId` - Get expense details
- `POST /api/expenses` - Create expense
- `PUT /api/expenses/:expenseId` - Update expense
- `DELETE /api/expenses/:expenseId` - Delete expense

### Balances
- `GET /api/balances/group/:groupId` - Get balances for group
- `GET /api/balances/group/:groupId/user` - Get net balance for user

### Settlements
- `GET /api/settlements/group/:groupId` - Get settlements
- `POST /api/settlements` - Create settlement
- `DELETE /api/settlements/:settlementId` - Delete settlement

### Subscriptions
- `GET /api/subscriptions/status` - Get subscription status
- `POST /api/subscriptions/verify` - Verify and create subscription
- `GET /api/subscriptions/history` - Get subscription history

## Database Schema

### User
- userId, name, phone/email, subscriptionStatus, createdAt, lastActiveAt, avatar

### Group
- groupId, name, description, createdBy, members[], inviteCode, isArchived

### Expense
- expenseId, groupId, amount, description, paidBy, splitType, splits[], createdAt

### Settlement
- settlementId, groupId, fromUser, toUser, amount, settledAt, settledBy, notes

### Subscription
- subscriptionId, userId, status, planType, startDate, endDate, googlePlayOrderId, googlePlayPurchaseToken

## Subscription Flow

1. **Trial Period**: 7 days free trial from account creation
2. **Subscription**: User purchases via Google Play (₹10 or ₹15/month)
3. **Verification**: Backend verifies purchase token with Google Play API
4. **Group Logic**: If any group member has active subscription, group remains active
5. **Expiry**: After expiry, users get read-only access (can view but not create expenses)

## Security Features

- JWT-based authentication
- Rate limiting on API endpoints
- Input validation
- MongoDB indexing for performance
- Secure token storage (Expo SecureStore)

## Deployment

### Backend (AWS EC2)
1. Set up EC2 instance
2. Install Node.js and MongoDB (or use Atlas)
3. Clone repository
4. Configure environment variables
5. Use PM2 or similar for process management
6. Set up Nginx reverse proxy (optional)

### Frontend
1. Build with Expo: `expo build:android`
2. Upload to Google Play Store
3. Configure Google Play subscription products

### MongoDB Atlas
1. Create cluster
2. Get connection string
3. Update MONGODB_URI in .env
4. Configure IP whitelist

## Environment Variables

```env
PORT=3000
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
OTP_SERVICE_URL=...
GOOGLE_PLAY_PACKAGE_NAME=com.splitwise.app
```

## Notes

- OTP service needs integration with SMS/Email provider (Twilio, AWS SNS, etc.)
- Google Play subscription verification needs service account setup
- For production, enable HTTPS
- Set up proper logging and monitoring
- Implement backup strategies for MongoDB

## License

ISC

