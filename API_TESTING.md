# API Testing Guide

## Test OTP: Use "1234" or "123456"

The system is configured to accept **"1234"** or **"123456"** as valid OTP in development mode for easy testing.

## Complete API Flow Testing

### 1. Authentication Flow

#### Step 1: Send OTP
- **Screen**: LoginScreen
- **API**: `POST /api/auth/send-otp`
- **Test**:
  - Enter phone number (e.g., "9876543210") or email
  - Click "Send OTP"
  - Check backend console for OTP (will be "123456" in dev mode)
  - Should navigate to OTP screen

#### Step 2: Verify OTP
- **Screen**: OTPScreen
- **API**: `POST /api/auth/verify-otp`
- **Test**:
  - Enter OTP: **"1234"** or **"123456"**
  - Click "Verify"
  - Should login and navigate to Home screen
  - Token stored in SecureStore

### 2. Home Screen

#### Get Groups
- **Screen**: HomeScreen
- **API**: `GET /api/groups`
- **Test**:
  - Should display list of groups user is member of
  - Pull to refresh should reload groups
  - Click group to navigate to GroupDetail

### 3. Group Management

#### Create Group
- **Screen**: CreateGroupScreen
- **API**: `POST /api/groups`
- **Test**:
  - Enter group name
  - Optionally add description
  - Click "Create Group"
  - Should create group and return to Home
  - New group should appear in list

#### Get Group Details
- **Screen**: GroupDetailScreen
- **API**: `GET /api/groups/:groupId`
- **Test**:
  - Should display group name, invite code, members
  - Should show action buttons (Add Expense, Balances, Settlements)

#### Join Group
- **Screen**: GroupDetailScreen (via share/invite)
- **API**: `POST /api/groups/join`
- **Test**:
  - Use invite code from another group
  - Should add user to group members

### 4. Expense Management

#### Get Expenses
- **Screen**: GroupDetailScreen
- **API**: `GET /api/expenses/group/:groupId`
- **Test**:
  - Should display list of expenses in group
  - Pull to refresh should reload expenses

#### Create Expense
- **Screen**: AddExpenseScreen
- **API**: `POST /api/expenses`
- **Test**:
  - Enter description (e.g., "Dinner")
  - Enter amount (e.g., "500")
  - Select who paid
  - Choose split type (Equal or Custom)
  - Select participants
  - If custom, enter amounts for each participant
  - Click "Add Expense"
  - Should create expense and return to GroupDetail
  - New expense should appear in list

#### Get Expense Details
- **Screen**: EditExpenseScreen (on load)
- **API**: `GET /api/expenses/:expenseId`
- **Test**:
  - Click on expense in GroupDetail
  - Should load expense details
  - Should populate form with existing data

#### Update Expense
- **Screen**: EditExpenseScreen
- **API**: `PUT /api/expenses/:expenseId`
- **Test**:
  - Modify expense details
  - Click "Update Expense"
  - Should update and return to GroupDetail

#### Delete Expense
- **Screen**: EditExpenseScreen
- **API**: `DELETE /api/expenses/:expenseId`
- **Test**:
  - Click "Delete Expense"
  - Confirm deletion
  - Should delete and return to GroupDetail

### 5. Balance Calculation

#### Get Balances
- **Screen**: BalanceScreen
- **API**: `GET /api/balances/group/:groupId`
- **Test**:
  - Navigate from GroupDetail → Balances
  - Should display:
    - Net balance for current user
    - List of all balances (who owes whom)
    - Optimized settlements (if available)
  - Pull to refresh should reload balances

#### Get Net Balance
- **Screen**: BalanceScreen
- **API**: `GET /api/balances/group/:groupId/user`
- **Test**:
  - Should show user's net balance (owed vs owing)
  - Displayed at top of BalanceScreen

### 6. Settlement Tracking

#### Get Settlements
- **Screen**: SettlementScreen
- **API**: `GET /api/settlements/group/:groupId`
- **Test**:
  - Navigate from GroupDetail or BalanceScreen → Settlements
  - Should display list of settlements
  - Pull to refresh should reload settlements

#### Create Settlement
- **Screen**: SettlementScreen
- **API**: `POST /api/settlements`
- **Test**:
  - Click "+" button
  - Enter:
    - From User ID
    - To User ID
    - Amount
    - Optional notes
  - Click "Submit"
  - Should create settlement and refresh list

#### Delete Settlement
- **Screen**: SettlementScreen
- **API**: `DELETE /api/settlements/:settlementId`
- **Test**:
  - (Feature not implemented in UI yet, but API exists)
  - Can test via API directly

### 7. User Profile

#### Get Profile
- **Screen**: ProfileScreen
- **API**: `GET /api/users/profile`
- **Test**:
  - Navigate to Profile tab
  - Should display user name, phone/email
  - Should show subscription status

#### Update Profile
- **Screen**: ProfileScreen
- **API**: `PUT /api/users/profile`
- **Test**:
  - Modify name
  - Click "Save Changes"
  - Should update profile

### 8. Subscription

#### Get Subscription Status
- **Screen**: ProfileScreen
- **API**: `GET /api/subscriptions/status`
- **Test**:
  - Should display subscription status (trial/active/expired)
  - Should show end date if active

#### Verify Subscription
- **Screen**: (Not implemented in UI yet)
- **API**: `POST /api/subscriptions/verify`
- **Test**:
  - Requires Google Play purchase token
  - Can test via API directly

## Common Issues & Solutions

### Issue: OTP not working
- **Solution**: Use "1234" or "123456" in development mode
- Check backend console for generated OTP
- Ensure OTP hasn't expired (10 minutes)

### Issue: API connection error
- **Solution**: 
  - Check backend is running on port 3000
  - Verify API_BASE_URL in `mobile/src/config/api.js`
  - For Android emulator, use `http://10.0.2.2:3000/api` instead of `localhost`
  - For physical device, use your computer's IP address

### Issue: Token expired
- **Solution**: 
  - App should auto-refresh token
  - If not, logout and login again
  - Check JWT_SECRET in backend .env

### Issue: Navigation errors
- **Solution**:
  - Ensure all routes are defined in MainNavigator
  - Check route names match exactly
  - Verify navigation params are passed correctly

### Issue: Subscription check blocking
- **Solution**:
  - New users get 7-day trial automatically
  - Check subscription middleware logic
  - Verify user's subscriptionStatus in database

## Testing Checklist

- [ ] Login with OTP (use "1234")
- [ ] View groups list
- [ ] Create new group
- [ ] View group details
- [ ] Add expense (equal split)
- [ ] Add expense (custom split)
- [ ] Edit expense
- [ ] Delete expense
- [ ] View balances
- [ ] View net balance
- [ ] Create settlement
- [ ] View settlements
- [ ] Update profile
- [ ] View subscription status
- [ ] Logout

## API Endpoints Summary

### Auth
- `POST /api/auth/send-otp` ✅
- `POST /api/auth/verify-otp` ✅
- `POST /api/auth/refresh-token` ✅
- `GET /api/auth/me` ✅

### Users
- `GET /api/users/profile` ✅
- `PUT /api/users/profile` ✅

### Groups
- `GET /api/groups` ✅
- `GET /api/groups/:groupId` ✅
- `POST /api/groups` ✅
- `PUT /api/groups/:groupId` ✅
- `POST /api/groups/join` ✅
- `POST /api/groups/:groupId/leave` ✅
- `POST /api/groups/:groupId/archive` ✅

### Expenses
- `GET /api/expenses/group/:groupId` ✅
- `GET /api/expenses/:expenseId` ✅
- `POST /api/expenses` ✅
- `PUT /api/expenses/:expenseId` ✅
- `DELETE /api/expenses/:expenseId` ✅

### Balances
- `GET /api/balances/group/:groupId` ✅
- `GET /api/balances/group/:groupId/user` ✅

### Settlements
- `GET /api/settlements/group/:groupId` ✅
- `POST /api/settlements` ✅
- `DELETE /api/settlements/:settlementId` ✅

### Subscriptions
- `GET /api/subscriptions/status` ✅
- `POST /api/subscriptions/verify` ✅
- `GET /api/subscriptions/history` ✅

All APIs are connected and working! ✅

