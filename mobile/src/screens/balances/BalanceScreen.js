import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { groupAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function BalanceScreen({ route, navigation }) {
  const { groupId } = route.params;
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [balances, setBalances] = useState([]);
  const [optimized, setOptimized] = useState([]);
  const [netBalance, setNetBalance] = useState(null);
  const [showSimplified, setShowSimplified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadBalances();
  }, [groupId]);

  // Reload data when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadBalances();
    });
    return unsubscribe;
  }, [navigation, groupId]);

  const loadBalances = async () => {
    try {
      const response = await groupAPI.getGroupDetail(groupId);

      if (response.success) {
        setGroup(response.group);
        setBalances(response.balances || []);
        setOptimized(response.optimizedBalances || []);
        setNetBalance(response.netBalance || null);
        // Auto-show simplified if group has simplifyDebts enabled
        setShowSimplified(response.group?.simplifyDebts || false);
      } else {
        Alert.alert('Error', response.message || 'Failed to load balances');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load balances');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const renderBalance = ({ item }) => {
    const isOwing = item.from._id === user._id;
    const isOwed = item.to._id === user._id;

    return (
      <View
        style={[
          styles.balanceCard,
          isOwing && styles.balanceCardOwing,
          isOwed && styles.balanceCardOwed,
        ]}
      >
        <View style={styles.balanceHeader}>
          <Text style={styles.balanceText}>
            {isOwing ? 'You owe' : isOwed ? 'You are owed' : `${item.from.name} owes`}
          </Text>
          {!isOwing && !isOwed && (
            <Text style={styles.balanceText}> {item.to.name}</Text>
          )}
        </View>
        <Text
          style={[
            styles.balanceAmount,
            isOwing && styles.balanceAmountOwing,
            isOwed && styles.balanceAmountOwed,
          ]}
        >
          ₹{item.amount.toFixed(2)}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading balances...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true);
            loadBalances();
          }} />
        }
      >
        {netBalance && (
          <View style={styles.netBalanceCard}>
            <Text style={styles.netBalanceLabel}>Your Net Balance</Text>
            <Text
              style={[
                styles.netBalanceAmount,
                netBalance.net > 0 && styles.netBalancePositive,
                netBalance.net < 0 && styles.netBalanceNegative,
              ]}
            >
              {netBalance.net > 0
                ? `You are owed ₹${netBalance.net.toFixed(2)}`
                : netBalance.net < 0
                ? `You owe ₹${Math.abs(netBalance.net).toFixed(2)}`
                : 'Settled up!'}
            </Text>
          </View>
        )}

        {/* Toggle between Normal and Simplified view */}
        {balances.length > 0 && optimized.length > 0 && (
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggle, !showSimplified && styles.toggleActive]}
              onPress={() => setShowSimplified(false)}
            >
              <Text style={[styles.toggleText, !showSimplified && styles.toggleTextActive]}>
                Normal Split
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggle, showSimplified && styles.toggleActive]}
              onPress={() => setShowSimplified(true)}
            >
              <Text style={[styles.toggleText, showSimplified && styles.toggleTextActive]}>
                Simplified
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {showSimplified && optimized.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Simplified Settlement Plan</Text>
              <View style={styles.simplifiedBadge}>
                <Icon name="check-circle" size={16} color="#4caf50" />
                <Text style={styles.simplifiedText}>Minimized</Text>
              </View>
            </View>
            <View style={styles.balancesList}>
              {optimized.map((balance, index) => (
                <View key={`opt-${balance.from._id}-${balance.to._id}-${index}`}>
                  {renderBalance({ item: balance })}
                </View>
              ))}
            </View>
            <View style={styles.infoBox}>
              <Icon name="information" size={20} color="#6200ee" />
              <Text style={styles.infoText}>
                This shows the minimum number of payments needed to settle all debts. 
                Original expense details remain unchanged.
              </Text>
            </View>
          </>
        ) : balances.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>All Balances</Text>
              <Text style={styles.sectionSubtitle}>
                {balances.length} {balances.length === 1 ? 'transaction' : 'transactions'}
              </Text>
            </View>
            <View style={styles.balancesList}>
              {balances.map((balance, index) => (
                <View key={`${balance.from._id}-${balance.to._id}-${index}`}>
                  {renderBalance({ item: balance })}
                </View>
              ))}
            </View>
            {optimized.length > 0 && (
              <View style={styles.infoBox}>
                <Icon name="lightbulb-on" size={20} color="#ff9800" />
                <Text style={styles.infoText}>
                  Enable "Simplify Debts" in group settings to see a minimized settlement plan 
                  ({optimized.length} {optimized.length === 1 ? 'payment' : 'payments'} needed).
                </Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Icon name="account-balance" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No balances</Text>
            <Text style={styles.emptySubtext}>All expenses are settled up!</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.settlementButton}
          onPress={() => navigation.navigate('Settlement', { groupId })}
        >
          <Icon name="check-circle" size={20} color="#fff" />
          <Text style={styles.settlementButtonText}>View Settlements</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  netBalanceCard: {
    backgroundColor: '#fff',
    padding: 20,
    margin: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  netBalanceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  netBalanceAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  netBalancePositive: {
    color: '#4caf50',
  },
  netBalanceNegative: {
    color: '#f44336',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  simplifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  simplifiedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4caf50',
  },
  balancesList: {
    padding: 16,
    paddingTop: 0,
  },
  balanceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  balanceCardOwing: {
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  balanceCardOwed: {
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  balanceHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  balanceText: {
    fontSize: 16,
    color: '#333',
  },
  balanceAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6200ee',
  },
  balanceAmountOwing: {
    color: '#f44336',
  },
  balanceAmountOwed: {
    color: '#4caf50',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  settlementButton: {
    flexDirection: 'row',
    backgroundColor: '#4caf50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 16,
    gap: 8,
  },
  settlementButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  toggleContainer: {
    flexDirection: 'row',
    margin: 16,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    padding: 4,
  },
  toggle: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  toggleActive: {
    backgroundColor: '#6200ee',
  },
  toggleText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    padding: 12,
    margin: 16,
    marginTop: 8,
    borderRadius: 8,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
});

