import { Platform, Alert } from 'react-native';

// Conditionally import PermissionsAndroid only on Android to avoid web build errors
let PermissionsAndroid = null;
if (Platform.OS === 'android') {
  try {
    const RN = require('react-native');
    PermissionsAndroid = RN.PermissionsAndroid;
  } catch (e) {
    console.warn('PermissionsAndroid not available:', e);
  }
}

/**
 * Request SMS reading permissions (Android only)
 */
export const requestSMSPermissions = async () => {
  if (Platform.OS !== 'android') {
    Alert.alert('Not Supported', 'SMS reading is only available on Android');
    return false;
  }

  if (!PermissionsAndroid) {
    console.warn('PermissionsAndroid is not available');
    return false;
  }

  try {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
    ]);

    if (
      granted[PermissionsAndroid.PERMISSIONS.READ_SMS] === PermissionsAndroid.RESULTS.GRANTED &&
      granted[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS] === PermissionsAndroid.RESULTS.GRANTED
    ) {
      return true;
    } else {
      Alert.alert(
        'Permission Required',
        'SMS reading permission is required to detect transactions. Please enable it in app settings.',
        [{ text: 'OK' }]
      );
      return false;
    }
  } catch (error) {
    console.error('Error requesting SMS permissions:', error);
    return false;
  }
};

/**
 * Read SMS messages from device
 * Note: This requires a native module. For Expo, you'll need to use EAS Build with custom native code.
 * You can use packages like 'react-native-get-sms-android' or create a custom native module.
 * 
 * For now, this is a placeholder that returns empty array.
 * Replace this with actual SMS reading implementation when native module is added.
 */
export const readSMSMessages = async (maxCount = 100, dateFrom = null) => {
  if (Platform.OS !== 'android') {
    return [];
  }

  const hasPermission = await requestSMSPermissions();
  if (!hasPermission) {
    return [];
  }

  try {
    // TODO: Replace with actual SMS reading implementation
    // Example using react-native-get-sms-android (requires native module):
    /*
    const GetSMS = require('react-native-get-sms-android');
    
    const filter = {
      box: 'inbox',
      maxCount: maxCount,
    };
    
    if (dateFrom) {
      filter.dateFrom = dateFrom.getTime();
    }
    
    return new Promise((resolve, reject) => {
      GetSMS.list(
        JSON.stringify(filter),
        (fail) => {
          console.error('Failed to read SMS:', fail);
          reject(new Error(fail));
        },
        (count, smsList) => {
          try {
            const messages = JSON.parse(smsList);
            resolve(messages);
          } catch (error) {
            reject(error);
          }
        }
      );
    });
    */
    
    // Placeholder - returns empty array
    console.warn('SMS reading not implemented. Please add native module for SMS reading.');
    return [];
  } catch (error) {
    console.error('Error reading SMS:', error);
    return [];
  }
};

/**
 * Read SMS messages from specific senders (banks, UPI apps)
 */
export const readTransactionSMS = async (maxCount = 100, daysBack = 7) => {
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - daysBack);
  
  const allMessages = await readSMSMessages(maxCount, dateFrom);
  
  // Filter messages from known transaction senders
  const transactionKeywords = [
    'upi', 'bank', 'payment', 'debit', 'credit', 'rs.', 'rs ', 'inr',
    'phonepe', 'paytm', 'gpay', 'google pay', 'amazon pay', 'razorpay',
    'sbi', 'hdfc', 'icici', 'axis', 'kotak', 'pnb', 'bob', 'canara',
    'transaction', 'paid', 'received', 'balance', 'account'
  ];
  
  return allMessages.filter(msg => {
    const body = (msg.body || '').toLowerCase();
    return transactionKeywords.some(keyword => body.includes(keyword));
  });
};

