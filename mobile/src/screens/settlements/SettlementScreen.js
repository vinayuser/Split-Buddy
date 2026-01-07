import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
  ActivityIndicator,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { settlementAPI, balanceAPI, groupAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, typography, borderRadius } from '../../theme/colors';
import { getInitials, formatDate, formatTime } from '../../utils/helpers';

export default function SettlementScreen({ route, navigation }) {
  const { groupId } = route.params;
  const { user } = useAuth();
  const [settlements, setSettlements] = useState([]);
  const [balances, setBalances] = useState([]);
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [fromUser, setFromUser] = useState('');
  const [toUser, setToUser] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [groupId]);

  // Reload data when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation, groupId]);

  const loadData = async () => {
    try {
      const [settlementsRes, balancesRes, groupRes] = await Promise.all([
        settlementAPI.getSettlements(groupId),
        balanceAPI.getBalances(groupId),
        groupAPI.getGroupDetail(groupId),
      ]);

      if (settlementsRes.success) {
        setSettlements(settlementsRes.settlements || []);
      }
      if (balancesRes.success) {
        setBalances(balancesRes.balances || []);
      }
      if (groupRes.success) {
        setGroup(groupRes.group);
        setMembers(groupRes.group.members || []);
      }
    } catch (error) {
      console.error('Load settlements error:', error);
      Alert.alert('Error', 'Failed to load settlements');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAddSettlement = () => {
    if (members.length < 2) {
      Alert.alert('Info', 'Need at least 2 members to create a settlement');
      return;
    }
    setFromUser('');
    setToUser('');
    setAmount('');
    setNotes('');
    setShowModal(true);
  };

  const handleQuickSettle = (balance) => {
    const fromId = balance.from._id || balance.from;
    const toId = balance.to._id || balance.to;
    const userId = user._id || user;
    const isOwing = fromId?.toString() === userId?.toString();
    const isOwed = toId?.toString() === userId?.toString();
    
    if (isOwing) {
      // You owe someone - record that you paid them
      setFromUser(userId);
      setToUser(toId);
      setAmount(balance.amount.toFixed(2));
    } else if (isOwed) {
      // Someone owes you - record that they paid you
      setFromUser(fromId);
      setToUser(userId);
      setAmount(balance.amount.toFixed(2));
    }
    setNotes('');
    setShowModal(true);
  };

  const handleSendReminder = async (balance) => {
    const fromId = balance.from._id || balance.from;
    const toId = balance.to._id || balance.to;
    const userId = user._id || user;
    const isOwed = toId?.toString() === userId?.toString();
    
    if (!isOwed) return; // Only send reminder if someone owes you
    
    const debtorName = balance.from.name || 'Friend';
    const amount = balance.amount.toFixed(2);
    const groupName = group?.name || 'the group';
    
    // Create reminder message
    const message = `Hi ${debtorName}, this is a friendly reminder that you owe me ₹${amount} in ${groupName}. Please settle this when convenient. Thanks!`;
    
    // Copy to clipboard and open messaging app
    if (Platform.OS === 'web') {
      // For web, use navigator.clipboard
      try {
        await navigator.clipboard.writeText(message);
        Alert.alert('Copied!', 'Reminder message copied to clipboard. You can paste it in your messaging app.');
      } catch (error) {
        Alert.alert('Error', 'Failed to copy message');
      }
    } else {
      // For native, copy to clipboard and open messaging
      try {
        // Copy to clipboard using Clipboard API (if available)
        // For React Native, we'll use a simple approach
        const phoneNumber = balance.from.phone || '';
        const encodedMessage = encodeURIComponent(message);
        
        // Show the message first
        Alert.alert(
          'Reminder Message',
          message,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open WhatsApp',
              onPress: () => {
                if (phoneNumber) {
                  const whatsappUrl = `whatsapp://send?phone=${phoneNumber}&text=${encodedMessage}`;
                  Linking.canOpenURL(whatsappUrl).then(supported => {
                    if (supported) {
                      Linking.openURL(whatsappUrl);
                    } else {
                      Alert.alert('Info', 'WhatsApp not installed. Please copy the message manually.');
                    }
                  }).catch(() => {
                    Alert.alert('Error', 'Failed to open WhatsApp');
                  });
                } else {
                  Alert.alert('Info', 'Phone number not available. Please copy the message manually.');
                }
              },
            },
            {
              text: 'Open SMS',
              onPress: () => {
                if (phoneNumber) {
                  const smsUrl = `sms:${phoneNumber}?body=${encodedMessage}`;
                  Linking.openURL(smsUrl).catch(() => {
                    Alert.alert('Error', 'Failed to open SMS app');
                  });
                } else {
                  Alert.alert('Info', 'Phone number not available. Please copy the message manually.');
                }
              },
            },
          ]
        );
      } catch (error) {
        Alert.alert('Error', 'Failed to open messaging app');
      }
    }
  };

  const selectFromUser = (member) => {
    setFromUser(member.userId?._id || member.userId);
  };

  const selectToUser = (member) => {
    setToUser(member.userId?._id || member.userId);
  };

  const handleSubmitSettlement = async () => {
    if (!fromUser || !toUser || !amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    if (fromUser === toUser) {
      Alert.alert('Error', 'Cannot settle with yourself');
      return;
    }

    setSubmitting(true);
    try {
      const response = await settlementAPI.createSettlement({
        groupId,
        fromUser: fromUser.toString(),
        toUser: toUser.toString(),
        amount: parseFloat(amount),
        notes,
      });

      if (response.success) {
        setShowModal(false);
        setFromUser('');
        setToUser('');
        setAmount('');
        setNotes('');
        // Reload data immediately
        await loadData();
        Alert.alert('Success', 'Payment recorded successfully');
      } else {
        Alert.alert('Error', response.message || 'Failed to create settlement');
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to create settlement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSettlement = (settlementId) => {
    Alert.alert(
      'Delete Settlement',
      'Are you sure you want to delete this settlement?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await settlementAPI.deleteSettlement(settlementId);
              if (response.success) {
                loadData();
              } else {
                Alert.alert('Error', response.message || 'Failed to delete settlement');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete settlement');
            }
          },
        },
      ]
    );
  };


  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  // Filter balances where user is involved
  const userBalances = balances.filter(b => {
    if (!b || !b.from || !b.to) return false;
    const fromId = b.from._id || b.from;
    const toId = b.to._id || b.to;
    const userId = user._id || user;
    return fromId?.toString() === userId?.toString() || toId?.toString() === userId?.toString();
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Settlements</Text>
          <Text style={styles.headerSubtitle}>Record payments between members</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddSettlement}
          activeOpacity={0.7}
        >
          <View style={styles.addButtonContent}>
            <Icon name="plus" size={24} color={colors.background} />
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            tintColor={colors.primary}
          />
        }
      >
        {/* Outstanding Balances Section */}
        {userBalances.length > 0 ? (
          <View style={styles.balancesSection}>
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
                  key={`${balance.from._id}-${balance.to._id}-${index}`}
                  style={styles.balanceCard}
                  onPress={() => handleQuickSettle(balance)}
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
                      {isOwed && (
                        <TouchableOpacity
                          style={styles.reminderButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleSendReminder(balance);
                          }}
                          activeOpacity={0.7}
                        >
                          <Icon name="message-text-outline" size={18} color={colors.primary} />
                        </TouchableOpacity>
                      )}
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
        ) : (
          <View style={styles.balancesSection}>
            <View style={styles.emptyBalancesContainer}>
              <Icon name="account-balance" size={48} color={colors.iconSecondary} />
              <Text style={styles.emptyBalancesText}>No outstanding balances</Text>
              <Text style={styles.emptyBalancesSubtext}>
                All balances are settled up! Use the + button to record any custom payment.
              </Text>
            </View>
          </View>
        )}

        {/* Settlement History */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Payment History</Text>
          {settlements.length > 0 ? (
            settlements.map((item, index) => (
              <View key={item._id || index} style={styles.settlementCard}>
                <View style={styles.settlementHeader}>
                  <View style={styles.settlementAvatar}>
                    <Text style={styles.settlementAvatarText}>
                      {getInitials(item.fromUser?.name || 'U')}
                    </Text>
                  </View>
                  <View style={styles.settlementInfo}>
                    <Text style={styles.settlementText}>
                      <Text style={styles.settlementName}>{item.fromUser?.name || 'Unknown'}</Text>
                      {' paid '}
                      <Text style={styles.settlementName}>{item.toUser?.name || 'Unknown'}</Text>
                    </Text>
                    {item.notes && (
                      <Text style={styles.settlementNotes}>{item.notes}</Text>
                    )}
                    <Text style={styles.settlementDate}>
                      {formatDate(item.settledAt)} at {formatTime(item.settledAt)}
                    </Text>
                  </View>
                  <View style={styles.settlementAmountContainer}>
                    <Text style={styles.settlementAmount}>₹{item.amount.toFixed(2)}</Text>
                    <TouchableOpacity
                      onPress={() => handleDeleteSettlement(item._id)}
                      style={styles.deleteButton}
                    >
                      <Icon name="delete-outline" size={18} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Icon name="check-circle-outline" size={64} color={colors.iconSecondary} />
              <Text style={styles.emptyText}>No payments recorded yet</Text>
              <Text style={styles.emptySubtext}>
                Record a payment to track settlements between group members
              </Text>
              <TouchableOpacity
                style={styles.emptyActionButton}
                onPress={handleAddSettlement}
                activeOpacity={0.7}
              >
                <Icon name="plus-circle" size={24} color={colors.primary} />
                <Text style={styles.emptyActionButtonText}>Record Payment</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Payment</Text>
              <Text style={styles.modalSubtitle}>
                Mark a payment as settled between two members
              </Text>
            </View>
            <ScrollView style={styles.modalScrollView}>
              <Text style={styles.label}>Who Paid? *</Text>
              <Text style={styles.labelHint}>Select the person who made the payment</Text>
              <View style={styles.memberPicker}>
                {members.map((member) => {
                  const memberId = member.userId?._id || member.userId;
                  const memberName = member.userId?.name || 'Unknown';
                  const isSelected = fromUser === memberId?.toString();
                  
                  return (
                    <TouchableOpacity
                      key={memberId?.toString() || member._id}
                      style={[styles.memberOption, isSelected && styles.memberOptionSelected]}
                      onPress={() => selectFromUser(member)}
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

              <Text style={styles.label}>Who Received? *</Text>
              <Text style={styles.labelHint}>Select the person who received the payment</Text>
              <View style={styles.memberPicker}>
                {members.map((member) => {
                  const memberId = member.userId?._id || member.userId;
                  const memberName = member.userId?.name || 'Unknown';
                  const isSelected = toUser === memberId?.toString();
                  
                  return (
                    <TouchableOpacity
                      key={memberId?.toString() || member._id}
                      style={[styles.memberOption, isSelected && styles.memberOptionSelected]}
                      onPress={() => selectToUser(member)}
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

              <Text style={styles.label}>Amount (₹) *</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor={colors.textTertiary}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
              />

              <Text style={styles.label}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add a note about this payment"
                placeholderTextColor={colors.textTertiary}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                maxLength={200}
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowModal(false);
                  setFromUser('');
                  setToUser('');
                  setAmount('');
                  setNotes('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.submitButton,
                  (submitting || !fromUser || !toUser || !amount) && styles.buttonDisabled
                ]}
                onPress={handleSubmitSettlement}
                disabled={submitting || !fromUser || !toUser || !amount}
                activeOpacity={0.8}
              >
                {submitting ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <>
                    <Icon name="check-circle" size={20} color={colors.background} />
                    <Text style={styles.submitButtonText}>Record Payment</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Floating Action Button for Add Settlement */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleAddSettlement}
        activeOpacity={0.8}
      >
        <Icon name="plus" size={28} color={colors.background} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  headerTitle: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  addButton: {
    padding: spacing.xs,
  },
  addButtonContent: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.round,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
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
  scrollView: {
    flex: 1,
  },
  balancesSection: {
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  sectionHeader: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
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
  reminderButton: {
    padding: spacing.xs,
    marginRight: spacing.xs,
  },
  balanceAmount: {
    ...typography.h3,
    fontWeight: '700',
  },
  balanceAmountPositive: {
    color: colors.balancePositive,
  },
  balanceAmountNegative: {
    color: colors.balanceNegative,
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
  historySection: {
    padding: spacing.md,
    paddingTop: spacing.sm,
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
    gap: spacing.xs,
  },
  settlementAmount: {
    ...typography.body,
    fontWeight: '700',
    color: colors.balancePositive,
  },
  deleteButton: {
    padding: spacing.xs,
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
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  emptyActionButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  emptyBalancesContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyBalancesText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptyBalancesSubtext: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  emptyActionButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  list: {
    padding: spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    width: '90%',
    maxWidth: 400,
    maxHeight: '90%',
  },
  modalHeader: {
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  label: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  labelHint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    ...typography.body,
    backgroundColor: colors.inputBackground,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  modalButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  cancelButton: {
    backgroundColor: colors.backgroundSecondary,
  },
  cancelButtonText: {
    ...typography.button,
    color: colors.textSecondary,
  },
  submitButton: {
    backgroundColor: colors.primary,
  },
  submitButtonText: {
    ...typography.button,
    color: colors.background,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  modalScrollView: {
    maxHeight: 400,
  },
  memberPicker: {
    marginBottom: spacing.md,
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

