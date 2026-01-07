# OTP Verification Debug Guide

## Issue: "Invalid or expired OTP"

## Fixes Applied

### 1. Enhanced OTP Verification (`backend/services/otpService.js`)
- ✅ Accepts "1234" or "123456" in development mode (even if NODE_ENV not set)
- ✅ Normalizes OTP values (string conversion, trim)
- ✅ Detailed logging for debugging
- ✅ Better error messages

### 2. Enhanced Backend Logging (`backend/routes/auth.js`)
- ✅ Logs stored OTP, provided OTP, expiry status
- ✅ Logs NODE_ENV to check development mode
- ✅ Specific error messages (no OTP, expired, invalid)

### 3. OTP Generation
- ✅ Generates "123456" in development mode
- ✅ Works even if NODE_ENV is not set

## Testing Steps

1. **Send OTP**
   - Enter phone/email
   - Click "Send OTP"
   - Check backend console: Should see "OTP for [phone/email]: 123456"

2. **Verify OTP**
   - Enter: **"1234"** or **"123456"**
   - Click "Verify"
   - Check backend console for detailed logs

## What to Check in Backend Console

When you verify OTP, you should see:
```
OTP Verification: {
  storedOTP: '123456',
  storedExpiry: [date],
  providedOTP: '1234' or '123456',
  isExpired: false,
  nodeEnv: 'development' or undefined
}
```

Then:
```
Development mode: Accepting test OTP: 1234
```
or
```
OTP comparison: {
  stored: '123456',
  provided: '123456',
  matches: true
}
```

## Common Issues

### Issue 1: NODE_ENV not set
**Solution**: The code now checks for both `development` and undefined NODE_ENV

### Issue 2: OTP mismatch
**Solution**: Use "1234" or "123456" - both work in development mode

### Issue 3: OTP expired
**Solution**: Request a new OTP (they expire after 10 minutes)

### Issue 4: No stored OTP
**Solution**: Make sure you send OTP first before verifying

## Quick Test

1. Send OTP → Backend logs: "OTP for [phone]: 123456"
2. Enter OTP: **"1234"** → Should work (development mode bypass)
3. Or enter OTP: **"123456"** → Should work (matches stored)

## If Still Not Working

Check backend console logs for:
- What storedOTP value is
- What providedOTP value is
- Whether development mode is detected
- Whether OTP is expired

The logs will tell you exactly what's happening!

