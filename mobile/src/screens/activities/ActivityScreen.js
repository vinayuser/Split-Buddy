import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { activityAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, typography, borderRadius } from '../../theme/colors';
import { getInitials, formatDate, formatTime } from '../../utils/helpers';

export default function ActivityScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    loadActivities(1, true);
  }, []);

  // Reload activities when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadActivities(1, true);
    });
    return unsubscribe;
  }, [navigation]);

  const loadActivities = async (pageNum = 1, reset = false) => {
    try {
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await activityAPI.getActivities(pageNum, 20);
      
      if (response.success) {
        if (reset) {
          setActivities(response.activities || []);
        } else {
          setActivities(prev => [...prev, ...(response.activities || [])]);
        }
        setHasMore(response.pagination?.hasMore || false);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('Load activities error:', error);
      Alert.alert('Error', 'Failed to load activities');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadActivities(1, true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadActivities(page + 1, false);
    }
  };

  const handleActivityPress = (activity) => {
    if (activity.groupId) {
      navigation.navigate('Home', {
        screen: 'GroupDetail',
        params: { groupId: activity.groupId.toString() },
      });
    }
  };

  const renderActivity = ({ item }) => {
    if (item.type === 'expense') {
      return (
        <TouchableOpacity
          style={styles.activityCard}
          onPress={() => handleActivityPress(item)}
          activeOpacity={0.7}
        >
          <View style={styles.activityHeader}>
            <View style={styles.activityAvatar}>
              <Text style={styles.activityAvatarText}>
                {getInitials(item.user?.name || 'U')}
              </Text>
            </View>
            <View style={styles.activityContent}>
              <View style={styles.activityTitleRow}>
                <Text style={styles.activityTitle}>
                  <Text style={styles.activityName}>{item.user?.name || 'Unknown'}</Text>
                  {' added an expense'}
                </Text>
                <Text style={styles.activityAmount}>₹{item.amount.toFixed(2)}</Text>
              </View>
              <Text style={styles.activityDescription} numberOfLines={2}>
                {item.description}
              </Text>
              <View style={styles.activityMeta}>
                <Text style={styles.activityGroup}>{item.groupName}</Text>
                <Text style={styles.activityTime}>
                  {formatDate(item.timestamp)} at {formatTime(item.timestamp)}
                </Text>
              </View>
            </View>
            <Icon name="receipt" size={24} color={colors.primary} />
          </View>
        </TouchableOpacity>
      );
    }

    if (item.type === 'settlement') {
      return (
        <TouchableOpacity
          style={styles.activityCard}
          onPress={() => handleActivityPress(item)}
          activeOpacity={0.7}
        >
          <View style={styles.activityHeader}>
            <View style={[styles.activityAvatar, styles.settlementAvatar]}>
              <Text style={styles.activityAvatarText}>
                {getInitials(item.fromUser?.name || 'U')}
              </Text>
            </View>
            <View style={styles.activityContent}>
              <View style={styles.activityTitleRow}>
                <Text style={styles.activityTitle}>
                  <Text style={styles.activityName}>{item.fromUser?.name || 'Unknown'}</Text>
                  {' paid '}
                  <Text style={styles.activityName}>{item.toUser?.name || 'Unknown'}</Text>
                </Text>
                <Text style={[styles.activityAmount, styles.settlementAmount]}>
                  ₹{item.amount.toFixed(2)}
                </Text>
              </View>
              {item.notes && (
                <Text style={styles.activityDescription} numberOfLines={2}>
                  {item.notes}
                </Text>
              )}
              <View style={styles.activityMeta}>
                <Text style={styles.activityGroup}>{item.groupName}</Text>
                <Text style={styles.activityTime}>
                  {formatDate(item.timestamp)} at {formatTime(item.timestamp)}
                </Text>
              </View>
            </View>
            <Icon name="check-circle" size={24} color={colors.success} />
          </View>
        </TouchableOpacity>
      );
    }

    return null;
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  if (loading && activities.length === 0) {
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
      <FlatList
        data={activities}
        renderItem={renderActivity}
        keyExtractor={(item, index) => `${item.type}-${item.id}-${index}`}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="bell-outline" size={64} color={colors.iconSecondary} />
            <Text style={styles.emptyText}>No activities yet</Text>
            <Text style={styles.emptySubtext}>
              Activities from your groups will appear here
            </Text>
          </View>
        }
      />
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
  listContent: {
    padding: spacing.md,
  },
  activityCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  activityAvatar: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.round,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  settlementAvatar: {
    backgroundColor: colors.success,
  },
  activityAvatarText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.background,
  },
  activityContent: {
    flex: 1,
  },
  activityTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  activityTitle: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  activityName: {
    fontWeight: '600',
    color: colors.primary,
  },
  activityAmount: {
    ...typography.body,
    fontWeight: '700',
    color: colors.primary,
  },
  settlementAmount: {
    color: colors.success,
  },
  activityDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  activityMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  activityGroup: {
    ...typography.caption,
    color: colors.textTertiary,
    flex: 1,
  },
  activityTime: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  footerLoader: {
    padding: spacing.md,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    marginTop: spacing.xl,
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
  },
});

