# Quick Start Guide

## Prerequisites

- Node.js 18+ installed
- MongoDB (local or Atlas account)
- Expo CLI (for mobile development)
- Android Studio / Xcode (for mobile testing)

## Backend Quick Start

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secrets

# Start MongoDB (if local)
# mongod

# Start server
npm start
# Server runs on http://localhost:3000
```

## Frontend Quick Start

```bash
# Navigate to mobile directory
cd mobile

# Install dependencies
npm install

# Update API URL in src/config/api.js
# Change API_BASE_URL to your backend URL

# Start Expo
npm start
# or
expo start

# Scan QR code with Expo Go app (Android/iOS)
```

## Testing the Application

### 1. Create Account
- Open app
- Enter phone number or email
- Enter OTP (check console logs for OTP in development)
- Login successful

### 2. Create Group
- Tap "+" button on home screen
- Enter group name
- Create group

### 3. Add Expense
- Open group
- Tap "Add Expense"
- Fill in details:
  - Description
  - Amount
  - Who paid
  - Split type (equal/custom)
  - Select participants
- Save expense

### 4. View Balances
- In group, tap "Balances"
- See who owes whom
- View optimized settlements

### 5. Record Settlement
- Go to Settlements tab
- Tap "+"
- Enter settlement details
- Save

## Development Notes

### OTP in Development
- OTP is logged to console in development mode
- Check backend logs for OTP code
- In production, integrate with SMS/Email service

### API Testing
- Use Postman or curl to test APIs
- Base URL: http://localhost:3000/api
- Include JWT token in Authorization header: `Bearer <token>`

### Common Issues

**MongoDB Connection Error**
- Check MongoDB is running
- Verify MONGODB_URI in .env
- Check network access (for Atlas)

**OTP Not Received**
- Check backend logs
- In development, OTP is logged to console
- Verify phone/email format

**API Connection Error**
- Check backend is running
- Verify API_BASE_URL in mobile/src/config/api.js
- Check CORS settings

**Token Expired**
- App should auto-refresh token
- If not, logout and login again

## Next Steps

1. **Set up OTP Service**: Integrate Twilio or AWS SNS
2. **Set up Google Play**: Configure subscription products
3. **Deploy Backend**: Follow DEPLOYMENT.md
4. **Build Mobile App**: Use Expo build or EAS
5. **Test Subscription**: Verify Google Play integration

## Support

- Check README.md for detailed documentation
- See ARCHITECTURE.md for system design
- See DEPLOYMENT.md for production setup

