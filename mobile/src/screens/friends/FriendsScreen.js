import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Pressable,
  Alert,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { balanceAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, typography, borderRadius } from '../../theme/colors';
import { getInitials } from '../../utils/helpers';
import EmptyState from '../../components/EmptyState';

export default function FriendsScreen({ navigation }) {
  const { user } = useAuth();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadFriends();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadFriends();
    });
    return unsubscribe;
  }, [navigation]);

  const loadFriends = useCallback(async () => {
    try {
      setLoading(true);
      const response = await balanceAPI.getFriendBalances();
      if (response.success) {
        setFriends(response.friends || []);
      } else {
        Alert.alert('Error', response.message || 'Failed to load friends');
      }
    } catch (error) {
      console.error('Load friends error:', error);
      Alert.alert('Error', 'Failed to load friends');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadFriends();
  }, [loadFriends]);

  const handleFriendPress = useCallback((friend) => {
    // Navigate to a detail screen or show group breakdown
    if (friend.groups && friend.groups.length > 0) {
      const firstGroup = friend.groups[0];
      navigation.navigate('Home', {
        screen: 'GroupDetail',
        params: { groupId: firstGroup.groupId },
      });
    }
  }, [navigation]);

  const renderFriend = useCallback(({ item }) => {
    const isOwed = item.netBalance > 0;
    const displayName = item.user.name || item.user.phone || item.user.email || 'Unknown';
    const displayIdentifier = item.user.phone || item.user.email || 'No contact';

    return (
      <Pressable
        style={({ pressed }) => [
          styles.friendCard,
          pressed && styles.friendCardPressed,
          isOwed && styles.friendCardOwed,
          !isOwed && styles.friendCardOwing,
        ]}
        onPress={() => handleFriendPress(item)}
      >
        <View style={styles.friendCardContent}>
          <View style={styles.friendLeft}>
            <View style={[styles.friendAvatar, isOwed ? styles.friendAvatarOwed : styles.friendAvatarOwing]}>
              {item.user.avatar ? (
                <Text style={styles.friendAvatarText}>IMG</Text>
              ) : (
                <Text style={styles.friendAvatarText}>
                  {getInitials(displayName)}
                </Text>
              )}
            </View>
            <View style={styles.friendInfo}>
              <Text style={styles.friendName} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={styles.friendIdentifier} numberOfLines={1}>
                {displayIdentifier}
              </Text>
              {item.groups && item.groups.length > 0 && (
                <Text style={styles.friendGroups} numberOfLines={1}>
                  {item.groups.length} group{item.groups.length !== 1 ? 's' : ''}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.friendRight}>
            <View style={[styles.balanceContainer, isOwed ? styles.balanceContainerOwed : styles.balanceContainerOwing]}>
              <Icon
                name={isOwed ? 'arrow-top-right' : 'arrow-bottom-left'}
                size={16}
                color={isOwed ? colors.balancePositive : colors.balanceNegative}
                style={styles.balanceIcon}
              />
              <Text style={[styles.balanceAmount, isOwed ? styles.balanceAmountOwed : styles.balanceAmountOwing]}>
                {isOwed ? '+' : ''}₹{Math.abs(item.netBalance).toFixed(2)}
              </Text>
            </View>
            <Text style={styles.balanceLabel}>
              {isOwed ? 'You are owed' : 'You owe'}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  }, [handleFriendPress]);

  const summary = useMemo(() => {
    const totalOwed = friends
      .filter(f => f.netBalance > 0)
      .reduce((sum, f) => sum + f.netBalance, 0);
    const totalOwing = friends
      .filter(f => f.netBalance < 0)
      .reduce((sum, f) => sum + Math.abs(f.netBalance), 0);
    const netBalance = totalOwed - totalOwing;

    return {
      totalOwed,
      totalOwing,
      netBalance,
      friendCount: friends.length,
    };
  }, [friends]);

  if (loading && friends.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading friends...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Summary Card */}
      {friends.length > 0 && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Icon name="account-group" size={20} color={colors.primary} />
              <Text style={styles.summaryLabel}>Friends</Text>
              <Text style={styles.summaryValue}>{summary.friendCount}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Icon name="arrow-top-right" size={20} color={colors.balancePositive} />
              <Text style={styles.summaryLabel}>You are owed</Text>
              <Text style={[styles.summaryValue, styles.summaryValuePositive]}>
                ₹{summary.totalOwed.toFixed(0)}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Icon name="arrow-bottom-left" size={20} color={colors.balanceNegative} />
              <Text style={styles.summaryLabel}>You owe</Text>
              <Text style={[styles.summaryValue, styles.summaryValueNegative]}>
                ₹{summary.totalOwing.toFixed(0)}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Friends List */}
      <FlatList
        data={friends}
        renderItem={renderFriend}
        keyExtractor={(item) => item.user._id?.toString() || item.user._id || Math.random().toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={friends.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="account-group-outline"
              title="No balances with friends"
              subtitle="You don't have any outstanding balances with friends across your groups"
              style={styles.emptyState}
            />
          ) : null
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  summaryCard: {
    backgroundColor: colors.background,
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.divider,
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  summaryValue: {
    ...typography.h3,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.xs / 2,
  },
  summaryValuePositive: {
    color: colors.balancePositive,
  },
  summaryValueNegative: {
    color: colors.balanceNegative,
  },
  listContent: {
    padding: spacing.md,
    paddingTop: 0,
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    paddingVertical: spacing.xl,
  },
  separator: {
    height: spacing.sm,
  },
  friendCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  friendCardPressed: {
    opacity: 0.7,
  },
  friendCardOwed: {
    borderLeftWidth: 3,
    borderLeftColor: colors.balancePositive,
  },
  friendCardOwing: {
    borderLeftWidth: 3,
    borderLeftColor: colors.balanceNegative,
  },
  friendCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  friendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  friendAvatar: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  friendAvatarOwed: {
    backgroundColor: colors.primaryLight,
  },
  friendAvatarOwing: {
    backgroundColor: '#FEE2E2',
  },
  friendAvatarText: {
    ...typography.h3,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs / 2,
  },
  friendIdentifier: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs / 2,
  },
  friendGroups: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  friendRight: {
    alignItems: 'flex-end',
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs / 2,
  },
  balanceContainerOwed: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.sm,
  },
  balanceContainerOwing: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.sm,
  },
  balanceIcon: {
    marginRight: spacing.xs / 2,
  },
  balanceAmount: {
    ...typography.h3,
    fontWeight: '700',
  },
  balanceAmountOwed: {
    color: colors.balancePositive,
  },
  balanceAmountOwing: {
    color: colors.balanceNegative,
  },
  balanceLabel: {
    ...typography.caption,
    color: colors.textTertiary,
  },
});

