// OTP Service - In production, integrate with Twilio, AWS SNS, or similar
// For development, we'll generate and log OTP

const generateOTP = () => {
  // For development/testing: return "123456" so it's easy to test
  // In production, use random OTP
  if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
    console.log('Development mode: Generating test OTP: 123456');
    return '123456';
  }
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendOTP = async (phone, email, otp) => {
  // In production, integrate with SMS/Email service
  // For now, we'll just log it
  console.log(`OTP for ${phone || email}: ${otp}`);
  
  // Simulate API call delay
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true });
    }, 500);
  });
};

const verifyOTP = (storedOTP, storedExpiry, providedOTP) => {
  // Normalize OTP to string and trim
  const providedOTPStr = String(providedOTP || '').trim();
  
  // For development/testing: accept "1234" or "123456" as valid OTP regardless of stored value
  if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
    if (providedOTPStr === '1234' || providedOTPStr === '123456') {
      console.log('Development mode: Accepting test OTP:', providedOTPStr);
      return true;
    }
  }
  
  if (!storedOTP) {
    console.log('No stored OTP found');
    return false;
  }
  
  // Normalize stored OTP
  const storedOTPStr = String(storedOTP).trim();
  
  if (storedExpiry && new Date() > new Date(storedExpiry)) {
    console.log('OTP expired. Current:', new Date(), 'Expiry:', new Date(storedExpiry));
    return false;
  }
  
  const matches = storedOTPStr === providedOTPStr;
  console.log('OTP comparison:', {
    stored: storedOTPStr,
    provided: providedOTPStr,
    matches: matches
  });
  
  return matches;
};

module.exports = {
  generateOTP,
  sendOTP,
  verifyOTP
};

