import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  Share,
  Modal,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { groupAPI, expenseAPI, settlementAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, typography, borderRadius } from '../../theme/colors';
import { getInitials, formatDate, formatTime } from '../../utils/helpers';
import TabView from '../../components/TabView';

export default function GroupDetailScreen({ route, navigation }) {
  const { groupId } = route.params;
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [activeTab, setActiveTab] = useState(0); // 0: Expenses, 1: Members, 2: Settlements, 3: Balances
  
  // Expenses state with pagination
  const [expenses, setExpenses] = useState([]);
  const [expensesPage, setExpensesPage] = useState(1);
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [expensesHasMore, setExpensesHasMore] = useState(true);
  const [expensesTotal, setExpensesTotal] = useState(0);
  
  // Other data
  const [balances, setBalances] = useState([]);
  const [optimizedBalances, setOptimizedBalances] = useState([]);
  const [netBalance, setNetBalance] = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [useEmailForInvite, setUseEmailForInvite] = useState(true);
  const [addingMember, setAddingMember] = useState(false);
  
  // Settlement modal state
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [selectedBalance, setSelectedBalance] = useState(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleNotes, setSettleNotes] = useState('');
  const [settleFromUser, setSettleFromUser] = useState('');
  const [settleToUser, setSettleToUser] = useState('');
  const [settling, setSettling] = useState(false);

  useEffect(() => {
    loadGroupData();
    loadExpenses(1, true); // Load first page
  }, [groupId]);

  // Reload data when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadGroupData();
      if (activeTab === 0) {
        // Reload expenses if on expenses tab
        setExpensesPage(1);
        loadExpenses(1, true);
      }
    });
    return unsubscribe;
  }, [navigation, groupId, activeTab]);

  const loadGroupData = async () => {
    try {
      const response = await groupAPI.getGroupDetail(groupId);

      if (response.success) {
        setGroup(response.group);
        setBalances(response.balances || []);
        setOptimizedBalances(response.optimizedBalances || []);
        setNetBalance(response.netBalance || null);
      } else {
        Alert.alert('Error', response.message || 'Failed to load group data');
        if (response.message.includes('Not a member')) {
          navigation.goBack();
        }
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to load group data';
      Alert.alert('Error', errorMsg);
      if (errorMsg.includes('Not a member')) {
        navigation.goBack();
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadExpenses = async (page = 1, reset = false) => {
    if (expensesLoading) return;
    
    setExpensesLoading(true);
    try {
      const response = await expenseAPI.getExpenses(groupId, page, 20);
      
      if (response.success) {
        if (reset) {
          setExpenses(response.expenses || []);
        } else {
          setExpenses(prev => [...prev, ...(response.expenses || [])]);
        }
        setExpensesHasMore(response.pagination?.hasMore || false);
        setExpensesTotal(response.pagination?.total || 0);
        setExpensesPage(page);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load expenses');
    } finally {
      setExpensesLoading(false);
    }
  };

  const loadSettlements = async () => {
    try {
      const response = await settlementAPI.getSettlements(groupId);
      if (response.success) {
        setSettlements(response.settlements || []);
      }
    } catch (error) {
      console.error('Failed to load settlements:', error);
    }
  };

  const handleLoadMore = () => {
    if (!expensesLoading && expensesHasMore) {
      loadExpenses(expensesPage + 1, false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join my expense group! Use invite code: ${group.inviteCode}`,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share invite code');
    }
  };

  const handleJoinViaCode = () => {
    setShowAddMemberModal(true);
  };

  const handleAddMember = async () => {
    if (useEmailForInvite && !inviteEmail.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }
    if (!useEmailForInvite && !invitePhone.trim()) {
      Alert.alert('Error', 'Please enter a phone number');
      return;
    }

    if (useEmailForInvite && !inviteEmail.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setAddingMember(true);
    try {
      const response = await groupAPI.inviteMember(
        groupId,
        useEmailForInvite ? inviteEmail.trim() : null,
        !useEmailForInvite ? invitePhone.trim() : null
      );
      if (response.success) {
        Alert.alert('Success', 'Member invited successfully');
        setShowAddMemberModal(false);
        setInviteEmail('');
        setInvitePhone('');
        loadGroupData();
      } else {
        Alert.alert('Error', response.message || 'Failed to invite member');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to invite member';
      Alert.alert('Error', errorMsg);
      if (errorMsg.includes('not found') && group?.inviteCode) {
        Alert.alert(
          'Invite Code',
          `Share this invite code with them: ${group.inviteCode}`,
          [{ text: 'OK' }]
        );
      }
    } finally {
      setAddingMember(false);
    }
  };

  // Load tab-specific data when tab changes
  useEffect(() => {
    if (activeTab === 2) {
      // Settlements tab
      loadSettlements();
    }
  }, [activeTab]);

  const handleSettleBalance = (balance) => {
    setSelectedBalance(balance);
    setSettleAmount(balance.amount.toFixed(2));
    setSettleNotes('');
    setShowSettleModal(true);
  };

  const handleSubmitSettlement = async () => {
    const amount = parseFloat(settleAmount);
    if (!amount || amount <= 0 || isNaN(amount)) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    // If selectedBalance exists, validate against it
    // Round to 2 decimal places to avoid floating point precision issues
    if (selectedBalance) {
      const balanceAmount = parseFloat(selectedBalance.amount);
      const roundedAmount = Math.round(amount * 100) / 100;
      const roundedBalance = Math.round(balanceAmount * 100) / 100;
      
      // Allow amount up to balance (inclusive)
      if (roundedAmount > roundedBalance) {
        Alert.alert('Error', `Settlement amount cannot exceed ₹${roundedBalance.toFixed(2)}`);
        return;
      }
    }

    // For custom payments, need to select from and to users
    if (!selectedBalance) {
      // This is a custom payment - need to show member selection
      // For now, we'll use a simpler approach - let user select in modal
      if (!settleFromUser || !settleToUser) {
        Alert.alert('Error', 'Please select who paid and who received');
        return;
      }
    }

    setSettling(true);
    try {
      let fromUserId, toUserId;
      
      if (selectedBalance) {
        // Quick settle from balance
        fromUserId = (selectedBalance.from._id || selectedBalance.from).toString();
        toUserId = (selectedBalance.to._id || selectedBalance.to).toString();
      } else {
        // Custom payment
        fromUserId = settleFromUser.toString();
        toUserId = settleToUser.toString();
      }

      const response = await settlementAPI.createSettlement({
        groupId,
        fromUser: fromUserId,
        toUser: toUserId,
        amount: amount,
        notes: settleNotes.trim(),
      });

      if (response.success) {
        setShowSettleModal(false);
        setSelectedBalance(null);
        setSettleAmount('');
        setSettleNotes('');
        setSettleFromUser('');
        setSettleToUser('');
        // Reload data immediately
        loadGroupData();
        loadSettlements();
        // Show success message (non-blocking)
        setTimeout(() => {
          Alert.alert('Success', 'Payment recorded successfully');
        }, 100);
      } else {
        Alert.alert('Error', response.message || 'Failed to record payment');
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to record payment');
    } finally {
      setSettling(false);
    }
  };

  const renderExpense = ({ item }) => {
    if (!item || !item._id) return null;
    
    const splits = item.splits || [];
    const totalAmount = item.amount || 0;
    const paidByName = item.paidBy?.name || 'Unknown';
    const isPaidByMe = item.paidBy?._id?.toString() === user._id?.toString();
    
    return (
      <TouchableOpacity
        style={styles.expenseBubble}
        onPress={() => navigation.navigate('EditExpense', { expenseId: item._id })}
        activeOpacity={0.8}
      >
        <View style={[styles.bubbleContent, isPaidByMe && styles.bubbleContentMe]}>
          <View style={styles.bubbleHeader}>
            <View style={styles.bubbleAvatar}>
              <Text style={styles.bubbleAvatarText}>{getInitials(paidByName)}</Text>
            </View>
            <View style={styles.bubbleInfo}>
              <Text style={styles.bubbleName}>{paidByName}</Text>
              {item.createdAt && (
                <Text style={styles.bubbleTime}>{formatTime(item.createdAt)}</Text>
              )}
            </View>
          </View>
          
          <View style={styles.bubbleBody}>
            <Text style={styles.bubbleDescription}>{item.description || 'No description'}</Text>
            <View style={styles.bubbleAmountRow}>
              <Text style={styles.bubbleAmount}>₹{totalAmount.toFixed(2)}</Text>
              <Text style={styles.bubblePaidBy}>paid by {paidByName}</Text>
            </View>
            
            {splits.length > 0 && (
              <View style={styles.bubbleSplits}>
                <Text style={styles.bubbleSplitsTitle}>Split:</Text>
                {splits.map((split, index) => {
                  const splitUser = split.userId;
                  const userName = splitUser?.name || 'Unknown';
                  const isPayer = item.paidBy?._id?.toString() === splitUser?._id?.toString();
                  
                  return (
                    <View key={split.userId?._id || split.userId || index} style={styles.bubbleSplitItem}>
                      <Text style={styles.bubbleSplitText}>
                        {userName}: ₹{split.amount ? split.amount.toFixed(2) : '0.00'}
                      </Text>
                      {isPayer && (
                        <Icon name="check-circle" size={14} color={colors.primary} style={styles.splitPayerIcon} />
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const tabs = [
    { key: 'expenses', label: 'Expenses', badge: expensesTotal > 0 ? expensesTotal : null },
    { key: 'members', label: 'Members', badge: group?.members?.length || null },
    { key: 'settlements', label: 'Settlements' },
    { key: 'balances', label: 'Balances' },
  ];

  const renderExpensesTab = () => (
    <FlatList
      data={expenses}
      renderItem={renderExpense}
      keyExtractor={(item) => item._id}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        expensesLoading && expenses.length > 0 ? (
          <View style={styles.loadingFooter}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : null
      }
      ListEmptyComponent={
        !expensesLoading ? (
          <View style={styles.emptyContainer}>
            <Icon name="receipt" size={48} color={colors.iconSecondary} />
            <Text style={styles.emptyText}>No expenses yet</Text>
            <Text style={styles.emptySubtext}>Add your first expense to get started</Text>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            setExpensesPage(1);
            loadExpenses(1, true);
            loadGroupData();
          }}
          tintColor={colors.primary}
        />
      }
      contentContainerStyle={styles.expensesList}
    />
  );

  const renderMembersTab = () => (
    <ScrollView
      style={styles.tabContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadGroupData();
          }}
          tintColor={colors.primary}
        />
      }
    >
      <View style={styles.membersTabContent}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Members ({group?.members?.length || 0})</Text>
          <TouchableOpacity
            style={styles.addMemberButton}
            onPress={handleJoinViaCode}
          >
            <Icon name="account-plus" size={20} color={colors.primary} />
            <Text style={styles.addMemberText}>Add Member</Text>
          </TouchableOpacity>
        </View>
        {Array.isArray(group?.members) && group.members.length > 0 ? (
          group.members.map((item, index) => {
            const userId = item.userId;
            const userName = userId?.name || 'Unknown';
            const isActivated = userId?.isActivated !== undefined ? userId.isActivated : true;
            
            return (
              <View key={item.userId?._id || index} style={styles.memberItem}>
                <View style={styles.memberInfo}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>{getInitials(userName)}</Text>
                  </View>
                  <View style={styles.memberDetails}>
                    <View style={styles.memberNameRow}>
                      <Text style={styles.memberName}>{userName}</Text>
                      {!isActivated && (
                        <View style={styles.pendingBadge}>
                          <Text style={styles.pendingText}>Pending</Text>
                        </View>
                      )}
                      {item.role === 'admin' && (
                        <View style={styles.adminBadge}>
                          <Icon name="star" size={12} color={colors.primary} />
                          <Text style={styles.adminText}>Admin</Text>
                        </View>
                      )}
                    </View>
                    {!isActivated && (
                      <Text style={styles.pendingInfo}>Waiting for signup</Text>
                    )}
                  </View>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Icon name="account-group-outline" size={48} color={colors.iconSecondary} />
            <Text style={styles.emptyText}>No members yet</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );

  const renderSettlementsTab = () => {
    // Filter balances where user is involved
    const userBalances = balances.filter(b => {
      if (!b || !b.from || !b.to) return false;
      const fromId = b.from._id || b.from;
      const toId = b.to._id || b.to;
      const userId = user._id || user;
      return fromId?.toString() === userId?.toString() || toId?.toString() === userId?.toString();
    });

    return (
      <ScrollView
        style={styles.tabContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadSettlements();
              loadGroupData();
            }}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.settlementsTabContent}>
          {/* Outstanding Balances Section */}
          {userBalances.length > 0 && (
            <View style={styles.outstandingBalancesSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Outstanding Balances</Text>
                <Text style={styles.sectionSubtitle}>Tap to record payment</Text>
              </View>
              {userBalances.map((balance, index) => {
                const fromId = balance.from._id || balance.from;
                const toId = balance.to._id || balance.to;
                const userId = user._id || user;
                const isOwing = fromId?.toString() === userId?.toString();
                const isOwed = toId?.toString() === userId?.toString();
                
                return (
                  <TouchableOpacity
                    key={`${fromId}-${toId}-${index}`}
                    style={styles.balanceCard}
                    onPress={() => {
                      if (isOwing) {
                        setSelectedBalance(balance);
                        setSettleAmount(balance.amount.toFixed(2));
                        setSettleNotes('');
                        setShowSettleModal(true);
                      } else if (isOwed) {
                        setSelectedBalance(balance);
                        setSettleAmount(balance.amount.toFixed(2));
                        setSettleNotes('');
                        setShowSettleModal(true);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.balanceCardContent}>
                      <View style={styles.balanceAvatar}>
                        <Text style={styles.balanceAvatarText}>
                          {getInitials(isOwing ? balance.to.name : balance.from.name)}
                        </Text>
                      </View>
                      <View style={styles.balanceInfo}>
                        <Text style={styles.balanceName}>
                          {isOwing
                            ? `You owe ${balance.to.name}`
                            : `${balance.from.name} owes you`}
                        </Text>
                        <Text style={styles.balanceDate}>
                          {isOwing ? 'Tap to record payment' : 'Waiting for payment'}
                        </Text>
                      </View>
                      <View style={styles.balanceAmountContainer}>
                        <Text style={[
                          styles.balanceAmount,
                          isOwing ? styles.balanceAmountNegative : styles.balanceAmountPositive
                        ]}>
                          ₹{balance.amount.toFixed(2)}
                        </Text>
                        <Icon 
                          name={isOwing ? "arrow-right" : "clock-outline"} 
                          size={20} 
                          color={isOwing ? colors.primary : colors.textSecondary} 
                        />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
              <View style={styles.infoBox}>
                <Icon name="information-outline" size={18} color={colors.primary} />
                <Text style={styles.infoText}>
                  Tap any balance above to quickly record a payment. You can also use the + button to record any custom payment.
                </Text>
              </View>
            </View>
          )}

          {/* Settlement History */}
          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>Payment History</Text>
            {settlements.length > 0 ? (
              settlements.map((settlement, index) => (
                <View key={settlement._id || index} style={styles.settlementCard}>
                  <View style={styles.settlementHeader}>
                    <View style={styles.settlementAvatar}>
                      <Text style={styles.settlementAvatarText}>
                        {getInitials(settlement.fromUser?.name || 'U')}
                      </Text>
                    </View>
                    <View style={styles.settlementInfo}>
                      <Text style={styles.settlementText}>
                        <Text style={styles.settlementName}>{settlement.fromUser?.name || 'Unknown'}</Text>
                        {' paid '}
                        <Text style={styles.settlementName}>{settlement.toUser?.name || 'Unknown'}</Text>
                      </Text>
                      {settlement.notes && (
                        <Text style={styles.settlementNotes}>{settlement.notes}</Text>
                      )}
                      <Text style={styles.settlementDate}>
                        {formatDate(settlement.settledAt)} at {formatTime(settlement.settledAt)}
                      </Text>
                    </View>
                    <View style={styles.settlementAmountContainer}>
                      <Text style={styles.settlementAmount}>₹{settlement.amount.toFixed(2)}</Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Icon name="check-circle-outline" size={64} color={colors.iconSecondary} />
                <Text style={styles.emptyText}>No payments recorded yet</Text>
                <Text style={styles.emptySubtext}>
                  {userBalances.length > 0 
                    ? 'Tap on a balance above to record a payment'
                    : 'All balances are settled up! Use the + button to record any custom payment.'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderBalancesTab = () => (
    <ScrollView
      style={styles.tabContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadGroupData();
          }}
          tintColor={colors.primary}
        />
      }
    >
      <View style={styles.balancesTabContent}>
        {netBalance !== null && (
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

        {(balances.length > 0 || (group?.simplifyDebts && optimizedBalances?.length > 0)) ? (
          <>
            <View style={styles.balanceBreakupHeader}>
              <Text style={styles.balanceBreakupTitle}>
                {group?.simplifyDebts ? 'Simplified Settlement Plan' : 'Balance Breakup'}
              </Text>
              {group?.simplifyDebts && (
                <View style={styles.simplifiedBadge}>
                  <Icon name="check-circle" size={16} color={colors.primary} />
                  <Text style={styles.simplifiedText}>Simplified</Text>
                </View>
              )}
            </View>
            {(group?.simplifyDebts && optimizedBalances?.length > 0 ? optimizedBalances : balances).map((balance, index) => {
              const isOwing = balance.from._id === user._id;
              const isOwed = balance.to._id === user._id;
              
              return (
                <View key={`${balance.from._id}-${balance.to._id}-${index}`} style={styles.balanceItem}>
                  <View style={styles.balanceInfo}>
                    {isOwing ? (
                      <>
                        <View style={styles.balanceTextContainer}>
                          <Text style={styles.balanceText}>
                            You owe <Text style={styles.balanceName}>{balance.to.name}</Text>
                          </Text>
                          <Text style={styles.balanceAmountNegative}>
                            ₹{balance.amount.toFixed(2)}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.settleButton}
                          onPress={() => handleSettleBalance(balance)}
                          activeOpacity={0.7}
                        >
                          <Icon name="check-circle" size={18} color={colors.background} />
                          <Text style={styles.settleButtonText}>Settle</Text>
                        </TouchableOpacity>
                      </>
                    ) : isOwed ? (
                      <>
                        <View style={styles.balanceTextContainer}>
                          <Text style={styles.balanceText}>
                            <Text style={styles.balanceName}>{balance.from.name}</Text> owes you
                          </Text>
                          <Text style={styles.balanceAmountPositive}>
                            ₹{balance.amount.toFixed(2)}
                          </Text>
                        </View>
                        <View style={styles.waitingBadge}>
                          <Icon name="clock-outline" size={16} color={colors.textSecondary} />
                          <Text style={styles.waitingText}>Waiting</Text>
                        </View>
                      </>
                    ) : (
                      <>
                        <View style={styles.balanceTextContainer}>
                          <Text style={styles.balanceText}>
                            <Text style={styles.balanceName}>{balance.from.name}</Text> owes <Text style={styles.balanceName}>{balance.to.name}</Text>
                          </Text>
                          <Text style={styles.balanceAmount}>
                            ₹{balance.amount.toFixed(2)}
                          </Text>
                        </View>
                      </>
                    )}
                  </View>
                </View>
              );
            })}
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Icon name="account-balance" size={48} color={colors.iconSecondary} />
            <Text style={styles.emptyText}>All settled up!</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );

  if (loading && !group) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.groupName} numberOfLines={1}>{group?.name}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => navigation.navigate('EditGroup', { groupId })} style={styles.iconButton}>
            <Icon name="pencil" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} style={styles.iconButton}>
            <Icon name="share-variant" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <TabView tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 0 && renderExpensesTab()}
      {activeTab === 1 && renderMembersTab()}
      {activeTab === 2 && renderSettlementsTab()}
      {activeTab === 3 && renderBalancesTab()}

      {/* Floating Add Expense Button */}
      {activeTab === 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('AddExpense', { groupId })}
          activeOpacity={0.8}
        >
          <Icon name="plus" size={24} color={colors.background} />
        </TouchableOpacity>
      )}

      {/* Floating Add Settlement Button */}
      {activeTab === 2 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            setSelectedBalance(null);
            setSettleAmount('');
            setSettleNotes('');
            setShowSettleModal(true);
          }}
          activeOpacity={0.8}
        >
          <Icon name="plus" size={24} color={colors.background} />
        </TouchableOpacity>
      )}

      {/* Settle Payment Modal */}
      <Modal
        visible={showSettleModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSettleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Record Payment</Text>
            {selectedBalance ? (
              <>
                <Text style={styles.modalSubtitle}>
                  You owe <Text style={styles.modalBold}>{selectedBalance.to.name}</Text>
                </Text>
                <Text style={styles.modalBalanceAmount}>
                  Total Balance: ₹{selectedBalance.amount.toFixed(2)}
                </Text>
              </>
            ) : (
              <Text style={styles.modalSubtitle}>
                Record a payment between any two members
              </Text>
            )}

            {!selectedBalance && (
              <>
                <Text style={styles.modalLabel}>Who Paid? *</Text>
                <Text style={styles.labelHint}>Select the person who made the payment</Text>
                <ScrollView style={styles.memberPickerScroll} nestedScrollEnabled>
                  <View style={styles.memberPicker}>
                    {group?.members?.map((member) => {
                      const memberId = member.userId?._id || member.userId;
                      const memberName = member.userId?.name || 'Unknown';
                      const isSelected = settleFromUser === memberId?.toString();
                      
                      return (
                        <TouchableOpacity
                          key={memberId?.toString() || member._id}
                          style={[styles.memberOption, isSelected && styles.memberOptionSelected]}
                          onPress={() => setSettleFromUser(memberId)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.memberOptionContent}>
                            <View style={styles.memberOptionAvatar}>
                              <Text style={styles.memberOptionAvatarText}>
                                {getInitials(memberName)}
                              </Text>
                            </View>
                            <Text style={[styles.memberOptionText, isSelected && styles.memberOptionTextSelected]}>
                              {memberName}
                            </Text>
                          </View>
                          {isSelected && <Icon name="check-circle" size={24} color={colors.primary} />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>

                <Text style={styles.modalLabel}>Who Received? *</Text>
                <Text style={styles.labelHint}>Select the person who received the payment</Text>
                <ScrollView style={styles.memberPickerScroll} nestedScrollEnabled>
                  <View style={styles.memberPicker}>
                    {group?.members?.map((member) => {
                      const memberId = member.userId?._id || member.userId;
                      const memberName = member.userId?.name || 'Unknown';
                      const isSelected = settleToUser === memberId?.toString();
                      
                      return (
                        <TouchableOpacity
                          key={memberId?.toString() || member._id}
                          style={[styles.memberOption, isSelected && styles.memberOptionSelected]}
                          onPress={() => setSettleToUser(memberId)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.memberOptionContent}>
                            <View style={styles.memberOptionAvatar}>
                              <Text style={styles.memberOptionAvatarText}>
                                {getInitials(memberName)}
                              </Text>
                            </View>
                            <Text style={[styles.memberOptionText, isSelected && styles.memberOptionTextSelected]}>
                              {memberName}
                            </Text>
                          </View>
                          {isSelected && <Icon name="check-circle" size={24} color={colors.primary} />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </>
            )}

            <Text style={styles.modalLabel}>Amount Paid (₹) *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter amount"
              placeholderTextColor={colors.textTertiary}
              value={settleAmount}
              onChangeText={setSettleAmount}
              keyboardType="decimal-pad"
              autoFocus
            />
            {selectedBalance && (() => {
              const enteredAmount = parseFloat(settleAmount || 0);
              const balanceAmount = parseFloat(selectedBalance.amount);
              if (isNaN(enteredAmount)) return false;
              // Round to 2 decimal places to avoid floating point precision issues
              const roundedAmount = Math.round(enteredAmount * 100) / 100;
              const roundedBalance = Math.round(balanceAmount * 100) / 100;
              return roundedAmount > roundedBalance;
            })() && (
              <Text style={styles.modalError}>
                Amount cannot exceed ₹{(Math.round(parseFloat(selectedBalance.amount) * 100) / 100).toFixed(2)}
              </Text>
            )}

            <Text style={styles.modalLabel}>Notes (Optional)</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              placeholder="Add a note about this payment"
              placeholderTextColor={colors.textTertiary}
              value={settleNotes}
              onChangeText={setSettleNotes}
              multiline
              numberOfLines={3}
              maxLength={200}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowSettleModal(false);
                  setSelectedBalance(null);
                  setSettleAmount('');
                  setSettleNotes('');
                  setSettleFromUser('');
                  setSettleToUser('');
                }}
                disabled={settling}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.addButton,
                  (!settleAmount || parseFloat(settleAmount) <= 0 || settling || (!selectedBalance && (!settleFromUser || !settleToUser))) && styles.buttonDisabled
                ]}
                onPress={handleSubmitSettlement}
                disabled={!settleAmount || parseFloat(settleAmount) <= 0 || settling || (!selectedBalance && (!settleFromUser || !settleToUser))}
                activeOpacity={0.8}
              >
                {settling ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <>
                    <Icon name="check-circle" size={20} color={colors.background} />
                    <Text style={styles.addButtonText}>Record Payment</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Member Modal */}
      <Modal
        visible={showAddMemberModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddMemberModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Invite Member</Text>
            <Text style={styles.modalSubtitle}>
              Enter email or phone to invite a member to this group
            </Text>

            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[styles.toggle, useEmailForInvite && styles.toggleActive]}
                onPress={() => setUseEmailForInvite(true)}
              >
                <Text style={[styles.toggleText, useEmailForInvite && styles.toggleTextActive]}>
                  Email
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggle, !useEmailForInvite && styles.toggleActive]}
                onPress={() => setUseEmailForInvite(false)}
              >
                <Text style={[styles.toggleText, !useEmailForInvite && styles.toggleTextActive]}>
                  Phone
                </Text>
              </TouchableOpacity>
            </View>
            
            {useEmailForInvite ? (
              <TextInput
                style={styles.modalInput}
                placeholder="Enter email address"
                value={inviteEmail}
                onChangeText={setInviteEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoFocus
              />
            ) : (
              <TextInput
                style={styles.modalInput}
                placeholder="Enter phone number"
                value={invitePhone}
                onChangeText={setInvitePhone}
                keyboardType="phone-pad"
                maxLength={10}
                autoFocus
              />
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowAddMemberModal(false);
                  setInviteEmail('');
                  setInvitePhone('');
                }}
                disabled={addingMember}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.addButton, ((useEmailForInvite && !inviteEmail.trim()) || (!useEmailForInvite && !invitePhone.trim()) || addingMember) && styles.buttonDisabled]}
                onPress={handleAddMember}
                disabled={addingMember || (useEmailForInvite && !inviteEmail.trim()) || (!useEmailForInvite && !invitePhone.trim())}
              >
                {addingMember ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.addButtonText}>Add</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  groupName: {
    ...typography.h1,
    color: colors.textPrimary,
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
  },
  iconButton: {
    padding: spacing.sm,
  },
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    width: 56,
    height: 56,
    borderRadius: borderRadius.round,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  tabContent: {
    flex: 1,
  },
  expensesList: {
    paddingVertical: spacing.sm,
  },
  loadingFooter: {
    padding: spacing.md,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  membersTabContent: {
    padding: spacing.md,
  },
  settlementsTabContent: {
    padding: spacing.md,
  },
  outstandingBalancesSection: {
    marginBottom: spacing.lg,
  },
  historySection: {
    marginTop: spacing.sm,
  },
  sectionHeader: {
    marginBottom: spacing.md,
  },
  sectionSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  balanceCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  balanceCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  balanceAvatar: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.round,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  balanceAvatarText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.background,
  },
  balanceInfo: {
    flex: 1,
  },
  balanceName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  balanceDate: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  balanceAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  infoText: {
    flex: 1,
    ...typography.bodySmall,
    color: colors.primaryDark,
    lineHeight: 20,
  },
  settlementCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  settlementHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  settlementAvatar: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.round,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  settlementAvatarText: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.background,
  },
  settlementInfo: {
    flex: 1,
  },
  settlementText: {
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  settlementName: {
    fontWeight: '600',
    color: colors.primary,
  },
  settlementNotes: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: spacing.xs,
  },
  settlementDate: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  settlementAmountContainer: {
    alignItems: 'flex-end',
  },
  settlementAmount: {
    ...typography.body,
    fontWeight: '700',
    color: colors.balancePositive,
  },
  balancesTabContent: {
    padding: spacing.md,
  },
  netBalanceCard: {
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  netBalanceLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  netBalanceAmount: {
    ...typography.h2,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  netBalancePositive: {
    color: colors.balancePositive,
  },
  netBalanceNegative: {
    color: colors.balanceNegative,
  },
  balanceItem: {
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  balanceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceTextContainer: {
    flex: 1,
  },
  settleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
    marginLeft: spacing.sm,
  },
  settleButtonText: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.background,
  },
  waitingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
    marginLeft: spacing.sm,
  },
  waitingText: {
    ...typography.bodySmall,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  balanceText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  balanceName: {
    fontWeight: '600',
    color: colors.primary,
  },
  balanceAmount: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  balanceAmountPositive: {
    ...typography.body,
    fontWeight: '700',
    color: colors.balancePositive,
  },
  balanceAmountNegative: {
    ...typography.body,
    fontWeight: '700',
    color: colors.balanceNegative,
  },
  settlementItem: {
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  settlementInfo: {
    flex: 1,
  },
  settlementText: {
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  settlementName: {
    fontWeight: '600',
    color: colors.primary,
  },
  settlementNotes: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  settlementDate: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.round,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  memberAvatarText: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.background,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.xs,
    gap: 4,
  },
  adminText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  infoSection: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  inviteCodeSection: {
    marginBottom: 12,
  },
  inviteCodeLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  inviteCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3e5f5',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6200ee',
  },
  inviteCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6200ee',
    flex: 1,
    fontFamily: 'monospace',
  },
  copyButton: {
    padding: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  membersSection: {
    backgroundColor: '#fff',
    marginTop: 8,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  addMemberButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f3e5f5',
    gap: 6,
  },
  addMemberText: {
    color: '#6200ee',
    fontSize: 14,
    fontWeight: '600',
  },
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberDetails: {
    marginLeft: 12,
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  memberRole: {
    fontSize: 12,
    color: '#6200ee',
    marginTop: 2,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pendingBadge: {
    backgroundColor: '#ff9800',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  pendingText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  pendingInfo: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 2,
  },
  balanceSummarySection: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  balanceSummaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  balanceSummaryCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
  },
  balanceSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  balanceSummaryText: {
    flex: 1,
  },
  balanceSummaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  balanceSummaryAmountPositive: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4caf50',
  },
  balanceSummaryAmountNegative: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f44336',
  },
  balanceSummarySettled: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4caf50',
  },
  balanceBreakupSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  balanceBreakupTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  balanceBreakupList: {
    gap: 8,
  },
  balanceBreakupItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  balanceBreakupInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceBreakupText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  balanceBreakupName: {
    fontWeight: '600',
    color: '#6200ee',
  },
  balanceBreakupAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6200ee',
  },
  balanceBreakupAmountPositive: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4caf50',
  },
  balanceBreakupAmountNegative: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f44336',
  },
  balanceSummarySection: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  balanceSummaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  balanceSummaryCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
  },
  balanceSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  balanceSummaryText: {
    flex: 1,
  },
  balanceSummaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  balanceSummaryAmountPositive: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4caf50',
  },
  balanceSummaryAmountNegative: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f44336',
  },
  balanceSummarySettled: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4caf50',
  },
  balanceBreakupSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  balanceBreakupTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  balanceBreakupList: {
    gap: 8,
  },
  balanceBreakupItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  balanceBreakupInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceBreakupText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  balanceBreakupName: {
    fontWeight: '600',
    color: '#6200ee',
  },
  balanceBreakupAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6200ee',
  },
  balanceBreakupAmountPositive: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4caf50',
  },
  balanceBreakupAmountNegative: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f44336',
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#6200ee',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#6200ee',
  },
  tertiaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#4caf50',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#6200ee',
  },
  tertiaryButtonText: {
    color: '#4caf50',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  expensesSection: {
    backgroundColor: colors.background,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  expensesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  expensesCount: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.round,
  },
  list: {
    padding: 16,
    paddingTop: 0,
  },
  expenseBubble: {
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  bubbleContent: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    maxWidth: '85%',
    alignSelf: 'flex-start',
  },
  bubbleContentMe: {
    backgroundColor: colors.primaryLight,
    alignSelf: 'flex-end',
  },
  bubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  bubbleAvatar: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.round,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  bubbleAvatarText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.background,
  },
  bubbleInfo: {
    flex: 1,
  },
  bubbleName: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  bubbleTime: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
  bubbleBody: {
    marginTop: spacing.xs,
  },
  bubbleDescription: {
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  bubbleAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  bubbleAmount: {
    ...typography.h3,
    fontWeight: '700',
    color: colors.textPrimary,
    marginRight: spacing.sm,
  },
  bubblePaidBy: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  bubbleSplits: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  bubbleSplitsTitle: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  bubbleSplitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  bubbleSplitText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
  },
  splitPayerIcon: {
    marginLeft: spacing.xs,
  },
  expenseCard: {
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
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  expenseDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6200ee',
  },
  expensePaidBy: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  expenseDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  splitDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  splitDetailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  splitItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  splitItemText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  splitPayerNote: {
    fontSize: 12,
    color: '#4caf50',
    fontStyle: 'italic',
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptySubtext: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  modalLabel: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  modalBold: {
    fontWeight: '600',
    color: colors.primary,
  },
  modalBalanceAmount: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.sm,
  },
  modalError: {
    ...typography.bodySmall,
    color: colors.error,
    marginTop: spacing.xs,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    ...typography.body,
    backgroundColor: colors.inputBackground,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  modalTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#6200ee',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  toggleContainer: {
    flexDirection: 'row',
    marginBottom: 16,
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
    fontSize: 16,
    color: '#666',
  },
  toggleTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  balanceBreakupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  labelHint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  memberPickerScroll: {
    maxHeight: 150,
    marginBottom: spacing.sm,
  },
  memberPicker: {
    marginBottom: spacing.sm,
  },
  memberOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  memberOptionSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
    borderWidth: 2,
  },
  memberOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberOptionAvatar: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.round,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  memberOptionAvatarText: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.background,
  },
  memberOptionText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  memberOptionTextSelected: {
    color: colors.primaryDark,
    fontWeight: '600',
  },
});

