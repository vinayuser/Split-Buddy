# Architecture Documentation

## System Overview

The Splitwise App is a full-stack expense sharing application with the following architecture:

```
┌─────────────────┐
│  React Native   │
│   (Expo App)    │
└────────┬────────┘
         │ HTTPS/REST API
         │
┌────────▼────────┐
│  Express.js     │
│   Backend API   │
└────────┬────────┘
         │
┌────────▼────────┐
│   MongoDB       │
│   (Atlas)       │
└─────────────────┘
```

## Backend Architecture

### Layer Structure

1. **Routes Layer** (`backend/routes/`)
   - Handles HTTP requests
   - Validates input
   - Calls service layer
   - Returns responses

2. **Middleware Layer** (`backend/middleware/`)
   - Authentication (JWT verification)
   - Subscription checks
   - Rate limiting
   - Error handling

3. **Service Layer** (`backend/services/`)
   - Business logic
   - External API integrations (OTP, Google Play)
   - Complex calculations (balance optimization)

4. **Model Layer** (`backend/models/`)
   - MongoDB schemas
   - Data validation
   - Relationships
   - Indexes

### Data Flow

```
Request → Route → Middleware → Service → Model → Database
                                    ↓
Response ← Route ← Middleware ← Service ← Model ← Database
```

## Frontend Architecture

### Component Structure

```
App.js
├── AuthProvider (Context)
│   └── AppNavigator
│       ├── AuthNavigator (if not logged in)
│       │   ├── LoginScreen
│       │   └── OTPScreen
│       └── MainNavigator (if logged in)
│           ├── HomeStack
│           │   ├── HomeScreen
│           │   ├── CreateGroupScreen
│           │   ├── GroupDetailScreen
│           │   ├── AddExpenseScreen
│           │   ├── EditExpenseScreen
│           │   ├── BalanceScreen
│           │   └── SettlementScreen
│           └── ProfileScreen
```

### State Management

- **Context API**: For authentication state
- **Local State**: React hooks for component state
- **AsyncStorage**: For offline data persistence

### API Service Layer

Centralized API service (`src/services/api.js`) provides:
- Consistent error handling
- Token management
- Request/response interceptors
- Type-safe API calls

## Database Schema Design

### User Collection
```javascript
{
  _id: ObjectId,
  name: String,
  phone: String (unique, sparse),
  email: String (unique, sparse),
  otp: { code: String, expiresAt: Date },
  subscriptionStatus: Enum['active', 'expired', 'trial'],
  lastActiveAt: Date,
  avatar: String,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `phone` (unique, sparse)
- `email` (unique, sparse)
- `createdAt`

### Group Collection
```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  createdBy: ObjectId (ref: User),
  members: [{
    userId: ObjectId (ref: User),
    role: Enum['admin', 'member'],
    joinedAt: Date
  }],
  inviteCode: String (unique),
  isArchived: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `createdBy`
- `members.userId`
- `inviteCode` (unique)
- `isArchived`

### Expense Collection
```javascript
{
  _id: ObjectId,
  groupId: ObjectId (ref: Group),
  amount: Number,
  description: String,
  paidBy: ObjectId (ref: User),
  splitType: Enum['equal', 'custom'],
  splits: [{
    userId: ObjectId (ref: User),
    amount: Number
  }],
  createdBy: ObjectId (ref: User),
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `groupId` + `createdAt` (compound)
- `paidBy`
- `createdAt`

### Settlement Collection
```javascript
{
  _id: ObjectId,
  groupId: ObjectId (ref: Group),
  fromUser: ObjectId (ref: User),
  toUser: ObjectId (ref: User),
  amount: Number,
  settledAt: Date,
  settledBy: ObjectId (ref: User),
  notes: String,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `groupId` + `settledAt` (compound)
- `fromUser` + `toUser`
- `settledAt`

### Subscription Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  status: Enum['active', 'expired', 'cancelled'],
  planType: Enum['monthly_10', 'monthly_15'],
  startDate: Date,
  endDate: Date,
  googlePlayOrderId: String (unique, sparse),
  googlePlayPurchaseToken: String,
  lastVerifiedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `userId` + `status` (compound)
- `endDate`
- `status` + `endDate` (compound)
- `googlePlayOrderId` (unique, sparse)

## Balance Calculation Algorithm

### Process

1. **Calculate Raw Balances**
   - Iterate through all expenses in group
   - For each expense:
     - Credit payer with (amount - their share)
     - Debit each participant with their share
     - Credit payer with each participant's share

2. **Apply Settlements**
   - For each settlement:
     - Reduce balance from `fromUser` to `toUser`

3. **Simplify Balances**
   - Convert bidirectional balances to unidirectional
   - Net out: if A owes B ₹100 and B owes A ₹50, result is A owes B ₹50

4. **Optimize Settlements**
   - Find cycles (A→B→C→A)
   - Reduce minimum amount from cycle
   - Repeat until no more optimizations

## Subscription Logic

### Trial Period
- User gets 7 days from account creation
- `subscriptionStatus` = 'trial'
- Full access during trial

### Active Subscription
- User purchases via Google Play
- Backend verifies purchase token
- Creates/updates Subscription document
- Sets `subscriptionStatus` = 'active'
- Full access

### Group-Level Subscription
- If any group member has active subscription, group remains active
- Checked in `checkSubscriptionForWrite` middleware
- Allows groups to stay active even if creator's subscription expires

### Expired Subscription
- After expiry, `subscriptionStatus` = 'expired'
- Read-only access (can view, cannot create/edit)
- Soft-lock enforced by middleware

## Security Measures

### Authentication
- JWT tokens with expiration
- Refresh token mechanism
- Secure token storage (Expo SecureStore)
- Token refresh on 401 errors

### Authorization
- User can only access their own data
- Group membership checks
- Admin-only operations (archive, remove members)

### Input Validation
- Express-validator for request validation
- MongoDB schema validation
- Type checking in services

### Rate Limiting
- Express-rate-limit middleware
- Configurable window and max requests
- Prevents abuse

## Performance Optimizations

### Database
- Strategic indexes on frequently queried fields
- Compound indexes for common query patterns
- Sparse indexes for optional fields
- Populate only necessary fields

### API
- Minimal response payloads
- Pagination for large lists (future enhancement)
- Caching strategies (future enhancement)

### Frontend
- Lazy loading of screens
- Local storage for offline support
- Optimistic UI updates
- Debounced API calls (future enhancement)

## Error Handling

### Backend
- Centralized error middleware
- Consistent error response format
- Logging for debugging
- User-friendly error messages

### Frontend
- Try-catch blocks in API calls
- User-friendly error alerts
- Retry mechanisms for network errors
- Offline state handling

## Future Enhancements

1. **Real-time Updates**
   - WebSocket integration
   - Push notifications

2. **Advanced Features**
   - Recurring expenses
   - Expense categories
   - Reports and analytics

3. **Performance**
   - Redis caching
   - CDN for static assets
   - Database query optimization

4. **Monitoring**
   - Application performance monitoring (APM)
   - Error tracking (Sentry)
   - Analytics dashboard

