const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');

// Calculate balances for a group
const calculateBalances = async (groupId) => {
  const expenses = await Expense.find({ groupId });
  const settlements = await Settlement.find({ groupId });
  
  // Initialize balance map
  const balances = {};
  
  // Process expenses
  expenses.forEach(expense => {
    const paidBy = expense.paidBy.toString();
    
    // Initialize payer balance if not exists
    if (!balances[paidBy]) {
      balances[paidBy] = {};
    }
    
    // Process each split
    expense.splits.forEach(split => {
      const userId = split.userId.toString();
      const splitAmount = split.amount;
      
      // Initialize user balance if not exists
      if (!balances[userId]) {
        balances[userId] = {};
      }
      
      // Skip if payer is paying for themselves (no self-balance)
      if (paidBy === userId) {
        // Payer's own share: they paid the full amount but only owe their share
        // The difference (amount others owe) is handled when processing other participants
        return;
      }
      
      // User (who didn't pay) owes the payer their share
      // Initialize balances if needed
      if (balances[userId][paidBy] === undefined) {
        balances[userId][paidBy] = 0;
      }
      if (balances[paidBy][userId] === undefined) {
        balances[paidBy][userId] = 0;
      }
      
      // User owes the payer
      balances[userId][paidBy] -= splitAmount;
      // Payer is owed by user
      balances[paidBy][userId] += splitAmount;
    });
  });
  
  // Process settlements (reduce balances)
  // When fromUser pays toUser an amount, this reduces the debt between them
  // 
  // In the balance structure (from expense processing):
  // - balances[userId][paidBy] -= splitAmount means userId owes paidBy (negative value)
  // - balances[paidBy][userId] += splitAmount means paidBy is owed by userId (positive value)
  // 
  // So when fromUser pays toUser:
  // - If fromUser owes toUser: balances[fromUser][toUser] is negative, we ADD amount to reduce debt
  // - If toUser is owed by fromUser: balances[toUser][fromUser] is positive, we SUBTRACT amount to reduce receivable
  settlements.forEach(settlement => {
    const fromUser = settlement.fromUser.toString();
    const toUser = settlement.toUser.toString();
    const amount = settlement.amount;
    
    // Initialize balances if they don't exist
    if (!balances[fromUser]) {
      balances[fromUser] = {};
    }
    if (!balances[toUser]) {
      balances[toUser] = {};
    }
    
    // Initialize the balance entries if they don't exist
    if (balances[fromUser][toUser] === undefined) {
      balances[fromUser][toUser] = 0;
    }
    if (balances[toUser][fromUser] === undefined) {
      balances[toUser][fromUser] = 0;
    }
    
    // Apply settlement: fromUser paid toUser
    // This reduces fromUser's debt to toUser (if negative, add to make less negative)
    // And reduces toUser's receivable from fromUser (if positive, subtract to make less positive)
    balances[fromUser][toUser] += amount;  // If negative, this reduces the debt; if positive, this increases receivable (wrong direction)
    balances[toUser][fromUser] -= amount;  // If positive, this reduces receivable; if negative, this increases debt (wrong direction)
    
    // Actually, we need to check the sign and apply accordingly
    // But since we store both directions, we can just apply to both and let the net calculation handle it
    // The key is: settlement reduces the absolute debt between the two users
  });
  
  // Convert to simplified format: who owes whom
  // In the balances map, we store both directions of the same transaction:
  // - balances[userId1][userId2] = positive means userId1 is owed by userId2 (userId2 owes userId1)
  // - balances[userId2][userId1] = negative means userId2 owes userId1
  // These represent the SAME transaction, so we should only use one direction
  const simplifiedBalances = [];
  const processed = new Set();
  
  Object.keys(balances).forEach(userId1 => {
    Object.keys(balances[userId1]).forEach(userId2 => {
      const key = [userId1, userId2].sort().join('-');
      
      if (processed.has(key)) return;
      processed.add(key);
      
      const amount1 = balances[userId1][userId2] || 0;
      const amount2 = balances[userId2] && balances[userId2][userId1] || 0;
      
      // Both represent the same transaction, so we take the absolute value
      // Determine direction: if amount1 is positive, userId2 owes userId1
      //                      if amount1 is negative, userId1 owes userId2
      let netAmount = 0;
      let fromUser = null;
      let toUser = null;
      
      if (Math.abs(amount1) > Math.abs(amount2)) {
        // Use amount1 as the primary value
        if (amount1 > 0) {
          // userId1 is owed by userId2, so userId2 owes userId1
          netAmount = amount1;
          fromUser = userId2;
          toUser = userId1;
        } else if (amount1 < 0) {
          // userId1 owes userId2
          netAmount = Math.abs(amount1);
          fromUser = userId1;
          toUser = userId2;
        }
      } else {
        // Use amount2 as the primary value
        if (amount2 > 0) {
          // userId2 is owed by userId1, so userId1 owes userId2
          netAmount = amount2;
          fromUser = userId1;
          toUser = userId2;
        } else if (amount2 < 0) {
          // userId2 owes userId1
          netAmount = Math.abs(amount2);
          fromUser = userId2;
          toUser = userId1;
        }
      }
      
      // If both are zero or we couldn't determine, skip
      if (netAmount > 0.01 && fromUser && toUser) {
        simplifiedBalances.push({
          from: fromUser,
          to: toUser,
          amount: netAmount
        });
      }
    });
  });
  
  return simplifiedBalances;
};

// Optimize settlements (minimize transactions using net balances)
// Algorithm: Calculate net balance for each user, then use greedy approach
// to minimize the number of transactions needed to settle all debts
const optimizeSettlements = (balances) => {
  if (!balances || balances.length === 0) {
    return [];
  }

  // Step 1: Calculate net balance for each user
  // Net balance = total owed to user - total user owes
  const netBalances = {};
  
  balances.forEach(balance => {
    const from = balance.from.toString();
    const to = balance.to.toString();
    const amount = balance.amount;
    
    // Initialize if not exists
    if (netBalances[from] === undefined) {
      netBalances[from] = 0;
    }
    if (netBalances[to] === undefined) {
      netBalances[to] = 0;
    }
    
    // User 'from' owes, so decrease their net balance
    netBalances[from] -= amount;
    // User 'to' is owed, so increase their net balance
    netBalances[to] += amount;
  });

  // Step 2: Convert to arrays of debtors (negative net) and creditors (positive net)
  const debtors = [];
  const creditors = [];
  
  Object.keys(netBalances).forEach(userId => {
    const net = netBalances[userId];
    if (net < -0.01) {
      // User owes money
      debtors.push({ userId, amount: Math.abs(net) });
    } else if (net > 0.01) {
      // User is owed money
      creditors.push({ userId, amount: net });
    }
    // If net is ~0, user is settled, skip them
  });

  // Step 3: Greedy algorithm to minimize transactions
  // Always settle between the largest debtor and largest creditor
  const simplifiedBalances = [];
  
  // Sort debtors and creditors by amount (descending)
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);
  
  let debtorIndex = 0;
  let creditorIndex = 0;
  
  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    
    if (debtor.amount < 0.01 && creditor.amount < 0.01) {
      break;
    }
    
    // Find the minimum amount to settle
    const settleAmount = Math.min(debtor.amount, creditor.amount);
    
    if (settleAmount >= 0.01) {
      // Create a simplified balance entry
      simplifiedBalances.push({
        from: debtor.userId,
        to: creditor.userId,
        amount: settleAmount
      });
      
      // Update amounts
      debtor.amount -= settleAmount;
      creditor.amount -= settleAmount;
    }
    
    // Move to next debtor/creditor if current one is fully settled
    if (debtor.amount < 0.01) {
      debtorIndex++;
    }
    if (creditor.amount < 0.01) {
      creditorIndex++;
    }
  }
  
  return simplifiedBalances.filter(b => b.amount >= 0.01);
};

// Get net balance for a user in a group
const getNetBalance = async (groupId, userId) => {
  const balances = await calculateBalances(groupId);
  
  let totalOwed = 0;
  let totalOwing = 0;
  
  balances.forEach(balance => {
    if (balance.from.toString() === userId.toString()) {
      totalOwing += balance.amount;
    }
    if (balance.to.toString() === userId.toString()) {
      totalOwed += balance.amount;
    }
  });
  
  return {
    owed: totalOwed,
    owing: totalOwing,
    net: totalOwed - totalOwing
  };
};

module.exports = {
  calculateBalances,
  optimizeSettlements,
  getNetBalance
};

