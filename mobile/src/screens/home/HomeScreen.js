import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { groupAPI, balanceAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, typography, borderRadius } from '../../theme/colors';

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [groupBalances, setGroupBalances] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadGroups();
  }, []);

  // Reload groups when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadGroups();
    });
    return unsubscribe;
  }, [navigation]);

  const loadGroups = async () => {
    try {
      const response = await groupAPI.getGroups();
      if (response.success) {
        setGroups(response.groups);
        // Load balances for each group
        loadGroupBalances(response.groups);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load groups');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadGroupBalances = async (groupsList) => {
    const balances = {};
    try {
      await Promise.all(
        groupsList.map(async (group) => {
          try {
            const balanceRes = await balanceAPI.getNetBalance(group._id);
            if (balanceRes.success) {
              balances[group._id] = balanceRes.balance;
            }
          } catch (error) {
            // Ignore errors for individual groups
            console.error(`Failed to load balance for group ${group._id}:`, error);
          }
        })
      );
      setGroupBalances(balances);
    } catch (error) {
      console.error('Error loading group balances:', error);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadGroups();
  };

  const handleEditGroup = (groupId) => {
    navigation.navigate('EditGroup', { groupId });
  };

  const handleArchiveGroup = async (groupId, isArchived) => {
    const action = isArchived ? 'unarchive' : 'archive';
    const actionText = isArchived ? 'unarchive' : 'archive';
    
    Alert.alert(
      `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Group`,
      `Are you sure you want to ${actionText} this group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: actionText.charAt(0).toUpperCase() + actionText.slice(1),
          style: isArchived ? 'default' : 'destructive',
          onPress: async () => {
            try {
              if (isArchived) {
                const response = await groupAPI.unarchiveGroup(groupId);
                if (response.success) {
                  loadGroups();
                } else {
                  Alert.alert('Error', response.message || 'Failed to unarchive group');
                }
              } else {
                const response = await groupAPI.archiveGroup(groupId);
                if (response.success) {
                  loadGroups();
                } else {
                  Alert.alert('Error', response.message || 'Failed to archive group');
                }
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to update group');
            }
          },
        },
      ]
    );
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getLastActivity = (group) => {
    // You can add last expense date here if available
    return '';
  };

  const renderGroup = ({ item }) => {
    const balance = groupBalances[item._id];
    const netBalance = balance?.net || 0;
    const currentUserMember = item.members?.find(m => {
      const memberId = m.userId?._id || m.userId;
      return memberId?.toString() === user._id?.toString();
    });
    const isAdmin = currentUserMember?.role === 'admin';
    const isArchived = item.isArchived || false;
    
    return (
      <TouchableOpacity
        style={styles.groupItem}
        onPress={() => navigation.navigate('GroupDetail', { groupId: item._id })}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, isArchived && styles.avatarArchived]}>
            <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
          </View>
        </View>
        <View style={styles.groupContent}>
          <View style={styles.groupHeader}>
            <Text style={[styles.groupName, isArchived && styles.groupNameArchived]} numberOfLines={1}>
              {item.name}
            </Text>
            {isArchived && (
              <View style={styles.archivedBadge}>
                <Text style={styles.archivedBadgeText}>Archived</Text>
              </View>
            )}
            {isAdmin && (
              <Icon name="pencil" size={16} color={colors.iconSecondary} style={styles.editIcon} />
            )}
          </View>
          <View style={styles.groupMeta}>
            <Text style={styles.groupMetaText}>
              {item.members?.length || 0} members
            </Text>
            {balance && (
              <View style={styles.balanceContainer}>
                {netBalance > 0.01 ? (
                  <Text style={styles.balancePositive}>
                    You get ₹{netBalance.toFixed(2)}
                  </Text>
                ) : netBalance < -0.01 ? (
                  <Text style={styles.balanceNegative}>
                    You owe ₹{Math.abs(netBalance).toFixed(2)}
                  </Text>
                ) : (
                  <Text style={styles.balanceSettled}>Settled up</Text>
                )}
              </View>
            )}
          </View>
          {item.description ? (
            <Text style={styles.groupDescription} numberOfLines={1}>
              {item.description}
            </Text>
          ) : null}
        </View>
        <Icon name="chevron-right" size={20} color={colors.iconSecondary} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Groups</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('CreateGroup')}
          activeOpacity={0.7}
        >
          <Icon name="plus" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {groups.length === 0 && !loading ? (
        <View style={styles.emptyContainer}>
          <Icon name="account-group-outline" size={64} color={colors.iconSecondary} />
          <Text style={styles.emptyText}>No groups yet</Text>
          <Text style={styles.emptySubtext}>Create a group to get started</Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          renderItem={renderGroup}
          keyExtractor={(item) => item._id}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.list}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerTitle: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  addButton: {
    padding: spacing.sm,
  },
  list: {
    paddingVertical: spacing.xs,
  },
  separator: {
    height: 1,
    backgroundColor: colors.divider,
    marginLeft: spacing.lg + 48, // Avatar width + padding
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
  },
  avatarContainer: {
    marginRight: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.round,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarArchived: {
    opacity: 0.6,
  },
  avatarText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  groupContent: {
    flex: 1,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  groupName: {
    ...typography.body,
    fontWeight: '500',
    color: colors.textPrimary,
    flex: 1,
  },
  groupNameArchived: {
    color: colors.textTertiary,
  },
  archivedBadge: {
    backgroundColor: colors.backgroundTertiary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.xs,
  },
  archivedBadgeText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  editIcon: {
    marginLeft: spacing.xs,
  },
  groupMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  groupMetaText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  balanceContainer: {
    marginLeft: 'auto',
  },
  balancePositive: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.balancePositive,
  },
  balanceNegative: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.balanceNegative,
  },
  balanceSettled: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.balanceNeutral,
  },
  groupDescription: {
    ...typography.bodySmall,
    color: colors.textTertiary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    ...typography.h3,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptySubtext: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    marginTop: spacing.sm,
  },
});

