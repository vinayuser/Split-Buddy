/**
 * Parse transaction SMS messages to extract expense information
 * Supports common UPI and bank transaction formats
 */

/**
 * Parse amount from SMS text
 */
const parseAmount = (text) => {
  // Common patterns: ₹100, Rs.100, INR 100, 100.00, etc.
  const amountPatterns = [
    /(?:rs\.?|inr|₹)\s*(\d+(?:\.\d{2})?)/i,
    /(\d+(?:\.\d{2})?)\s*(?:rs\.?|inr|₹)/i,
    /amount[:\s]+(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d{2})?)/i,
    /paid[:\s]+(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d{2})?)/i,
    /debited[:\s]+(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d{2})?)/i,
  ];

  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return parseFloat(match[1]);
    }
  }

  return null;
};

/**
 * Parse merchant/payee name from SMS
 */
const parseMerchant = (text) => {
  // Common patterns
  const merchantPatterns = [
    /(?:paid to|paid|merchant|to)[:\s]+([A-Z][A-Za-z\s]+?)(?:\s|\.|,|$)/i,
    /(?:at|from)[:\s]+([A-Z][A-Za-z\s]+?)(?:\s|\.|,|$)/i,
    /upi[:\s]+([A-Z][A-Za-z\s]+?)(?:\s|\.|,|$)/i,
  ];

  for (const pattern of merchantPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  // Try to extract from UPI ID
  const upiMatch = text.match(/([a-z0-9._-]+@[a-z]+)/i);
  if (upiMatch) {
    return upiMatch[1].split('@')[0].replace(/[._-]/g, ' ').trim();
  }

  return null;
};

/**
 * Parse transaction type (debit/credit)
 */
const parseTransactionType = (text) => {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('debited') || lowerText.includes('paid') || lowerText.includes('spent')) {
    return 'debit';
  }
  
  if (lowerText.includes('credited') || lowerText.includes('received') || lowerText.includes('deposit')) {
    return 'credit';
  }
  
  return 'debit'; // Default to debit for expenses
};

/**
 * Parse date from SMS
 */
const parseDate = (smsDate) => {
  if (smsDate) {
    return new Date(smsDate);
  }
  return new Date();
};

/**
 * Main function to parse transaction from SMS
 */
export const parseTransaction = (sms) => {
  if (!sms || !sms.body) {
    return null;
  }

  const text = sms.body;
  const amount = parseAmount(text);
  
  if (!amount || amount <= 0) {
    return null; // Not a valid transaction
  }

  const merchant = parseMerchant(text) || 'Unknown Merchant';
  const type = parseTransactionType(text);
  const date = parseDate(sms.date);

  return {
    amount,
    merchant,
    type,
    date,
    originalText: text,
    smsId: sms._id || sms.id,
    phoneNumber: sms.address || sms.phoneNumber,
  };
};

/**
 * Parse multiple SMS messages and extract transactions
 */
export const parseTransactions = (smsMessages) => {
  const transactions = [];
  
  for (const sms of smsMessages) {
    const transaction = parseTransaction(sms);
    if (transaction && transaction.type === 'debit') {
      // Only include debit transactions (expenses)
      transactions.push(transaction);
    }
  }
  
  // Sort by date (newest first)
  transactions.sort((a, b) => b.date - a.date);
  
  return transactions;
};

/**
 * Filter transactions by date range
 */
export const filterTransactionsByDate = (transactions, daysBack = 7) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);
  
  return transactions.filter(t => t.date >= cutoffDate);
};

