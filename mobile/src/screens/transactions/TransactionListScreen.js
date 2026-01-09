import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { readTransactionSMS } from '../../services/smsService';
import { parseTransactions, filterTransactionsByDate } from '../../services/transactionParser';
import { colors, spacing, typography, borderRadius } from '../../theme/colors';
import { formatDate, formatTime } from '../../utils/helpers';

export default function TransactionListScreen({ route, navigation }) {
  const { groupId } = route.params || {};
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const smsMessages = await readTransactionSMS(200, 30); // Last 30 days, max 200 messages
      const parsed = parseTransactions(smsMessages);
      const filtered = filterTransactionsByDate(parsed, 30);
      setTransactions(filtered);
      
      if (smsMessages.length === 0) {
        Alert.alert(
          'SMS Reading Not Available',
          'SMS reading requires additional setup. This feature will be available in a future update. For now, you can manually add expenses.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      Alert.alert(
        'Feature Not Available',
        'SMS transaction reading is not yet implemented. This feature requires native module setup and will be available in a future update. You can still add expenses manually.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  };

  const handleCreateExpense = (transaction) => {
    if (!groupId) {
      Alert.alert('Error', 'Please select a group first');
      return;
    }

    navigation.navigate('AddExpense', {
      groupId,
      prefill: {
        description: transaction.merchant,
        amount: transaction.amount.toString(),
      },
    });
  };

  const renderTransaction = ({ item }) => (
    <TouchableOpacity
      style={styles.transactionCard}
      onPress={() => handleCreateExpense(item)}
      activeOpacity={0.7}
    >
      <View style={styles.transactionHeader}>
        <View style={styles.transactionIconContainer}>
          <Icon name="wallet" size={24} color={colors.primary} />
        </View>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionMerchant} numberOfLines={1}>
            {item.merchant}
          </Text>
          <Text style={styles.transactionDate}>
            {formatDate(item.date)} • {formatTime(item.date)}
          </Text>
        </View>
        <View style={styles.transactionAmountContainer}>
          <Text style={styles.transactionAmount}>₹{item.amount.toFixed(2)}</Text>
        </View>
      </View>
      <View style={styles.transactionFooter}>
        <TouchableOpacity
          style={styles.addExpenseButton}
          onPress={() => handleCreateExpense(item)}
        >
          <Icon name="plus-circle" size={18} color={colors.primary} />
          <Text style={styles.addExpenseText}>Add as Expense</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Transactions</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Reading SMS messages...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transactions</Text>
        <TouchableOpacity onPress={handleRefresh}>
          <Icon name="refresh" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {transactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="message-text-outline" size={64} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>No Transactions Found</Text>
          <Text style={styles.emptyText}>
            We couldn't find any transaction messages in your SMS inbox.
            Make sure you have SMS reading permission enabled.
          </Text>
          <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderTransaction}
          keyExtractor={(item, index) => item.smsId || `transaction-${index}`}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerTitle: {
    ...typography.h3,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  list: {
    padding: spacing.md,
  },
  transactionCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  transactionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.round,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionMerchant: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs / 2,
  },
  transactionDate: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  transactionAmountContainer: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    ...typography.h3,
    fontWeight: '700',
    color: colors.primary,
  },
  transactionFooter: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  addExpenseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  addExpenseText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    ...typography.h3,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  refreshButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
  },
  refreshButtonText: {
    ...typography.button,
    color: colors.background,
  },
});

