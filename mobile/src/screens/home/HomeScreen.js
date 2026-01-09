import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Image,
  Linking,
  Animated,
} from 'react-native';
import { Text, Card, Surface, FAB, Chip, Divider, Button } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { groupAPI, balanceAPI, expenseAPI, activityAPI, bannerAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, typography, borderRadius } from '../../theme/colors';
import { formatRelativeTime, getInitials } from '../../utils/helpers';
import { wp, hp, scaleFont, scaleSize, getResponsiveDimensions } from '../../utils/responsive';
import EmptyState from '../../components/EmptyState';
import { FlatList, Pressable } from 'react-native';

const { width, height } = Dimensions.get('window');
const { isSmallScreen, isMediumScreen, isLargeScreen, isTablet } = getResponsiveDimensions();
// Use percentage-based widths for better responsiveness
const GROUP_CARD_WIDTH = wp(42); // 42% of screen width (works on all devices)
const GROUP_CARD_HEIGHT = hp(14); // 14% of screen height
const BANNER_HEIGHT = hp(22); // 22% of screen height

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [groupBalances, setGroupBalances] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const bannerSlideX = useRef(new Animated.Value(0)).current;
  const [totalOwed, setTotalOwed] = useState(0);
  const [totalOwedToYou, setTotalOwedToYou] = useState(0);
  const [totalGroups, setTotalGroups] = useState(0);
  const [todayExpense, setTodayExpense] = useState(0);
  const [monthExpense, setMonthExpense] = useState(0);
  const [totalBalance, setTotalBalance] = useState(0);
  const [recentActivities, setRecentActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [bannerAds, setBannerAds] = useState([]);
  const [bannersLoading, setBannersLoading] = useState(false);

  useEffect(() => {
    loadGroups();
    loadRecentActivities();
    loadBanners();
  }, []);

  useEffect(() => {
    if (refreshing) {
      loadRecentActivities();
    }
  }, [refreshing]);

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
    let totalOwedAmount = 0;
    let totalOwedToYouAmount = 0;
    let todayTotal = 0;
    let monthTotal = 0;
    
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      
      await Promise.all(
        groupsList.map(async (group) => {
          try {
            const balanceRes = await balanceAPI.getNetBalance(group._id);
            if (balanceRes.success) {
              balances[group._id] = balanceRes.balance;
              const net = balanceRes.balance?.net || 0;
              if (net < 0) {
                totalOwedAmount += Math.abs(net);
              } else if (net > 0) {
                totalOwedToYouAmount += net;
              }
            }
            
            // Load expenses for today and this month
            try {
              const expensesRes = await expenseAPI.getExpenses(group._id, 1, 100);
              if (expensesRes.success && expensesRes.expenses) {
                expensesRes.expenses.forEach(expense => {
                  const expenseDate = new Date(expense.createdAt);
                  if (expenseDate >= today) {
                    todayTotal += expense.amount || 0;
                  }
                  if (expenseDate >= monthStart) {
                    monthTotal += expense.amount || 0;
                  }
                });
              }
            } catch (err) {
              // Ignore expense loading errors
            }
          } catch (error) {
            // Ignore errors for individual groups
            console.error(`Failed to load balance for group ${group._id}:`, error);
          }
        })
      );
      setGroupBalances(balances);
      setTotalOwed(totalOwedAmount);
      setTotalOwedToYou(totalOwedToYouAmount);
      setTotalBalance(totalOwedToYouAmount - totalOwedAmount);
      setTodayExpense(todayTotal);
      setMonthExpense(monthTotal);
      setTotalGroups(groupsList.length);
    } catch (error) {
      console.error('Error loading group balances:', error);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadGroups();
    await loadRecentActivities();
    await loadBanners();
    setRefreshing(false);
  }, [loadGroups, loadRecentActivities, loadBanners]);

  const loadRecentActivities = useCallback(async () => {
    try {
      setActivitiesLoading(true);
      const response = await activityAPI.getActivities(1, 5);
      if (response.success) {
        setRecentActivities(response.activities || []);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setActivitiesLoading(false);
    }
  }, []);

  const loadBanners = useCallback(async () => {
    setBannersLoading(true);
    try {
      const response = await bannerAPI.getBanners(true);
      if (response.success && response.banners) {
        setBannerAds(response.banners);
      }
    } catch (error) {
      console.error('Failed to load banners:', error);
      // Don't show error to user, just use empty array
      setBannerAds([]);
    } finally {
      setBannersLoading(false);
    }
  }, []);

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

  // Auto-slide banner ads with slide animation
  useEffect(() => {
    if (bannerAds.length > 1) {
      // Initialize slide position to 0 for first banner
      bannerSlideX.setValue(0);
      
      const interval = setInterval(() => {
        // Slide current banner out to left
        Animated.timing(bannerSlideX, {
          toValue: -width, // Slide out to the left
          duration: 500,
          useNativeDriver: true,
        }).start(() => {
          // Change banner index
          setCurrentBannerIndex((prev) => {
            const nextIndex = (prev + 1) % bannerAds.length;
            // Reset position to right (off-screen) for new banner
            bannerSlideX.setValue(width);
            // Slide new banner in from right
            Animated.timing(bannerSlideX, {
              toValue: 0, // Slide in to center
              duration: 500,
              useNativeDriver: true,
            }).start();
            return nextIndex;
          });
        });
      }, 10000); // Change banner every 10 seconds

      return () => clearInterval(interval);
    }
  }, [bannerAds.length, bannerSlideX, width]);

  // Removed handleBannerScroll - using simple state-based slider now

  const handleBannerPress = async (banner) => {
    if (banner.actionUrl) {
      try {
        const canOpen = await Linking.canOpenURL(banner.actionUrl);
        if (canOpen) {
          await Linking.openURL(banner.actionUrl);
        } else {
          Alert.alert('Error', 'Cannot open this URL');
        }
      } catch (error) {
        console.error('Error opening URL:', error);
        Alert.alert('Error', 'Failed to open URL');
      }
    } else {
      Alert.alert(banner.title, banner.description);
    }
  };

  // Removed renderBannerAd - using inline rendering now

  const renderActivityItem = useCallback(({ item }) => {
    const isExpense = item.type === 'expense';
    const isSettlement = item.type === 'settlement';
    const userName = isExpense 
      ? (item.user?.name || item.createdBy?.name || 'Someone')
      : (item.fromUser?.name || 'Someone');
    const groupName = item.groupName || 'Unknown Group';
    const amount = item.amount || 0;
    const description = item.description || '';
    
    let activityText = '';
    if (isExpense) {
      activityText = `${userName} added ₹${amount.toFixed(0)}${description ? ` in ${description}` : ''}${groupName !== 'Unknown Group' ? ` (${groupName})` : ''}`;
    } else if (isSettlement) {
      const toUserName = item.toUser?.name || 'someone';
      activityText = `${userName} settled ₹${amount.toFixed(0)} with ${toUserName}${groupName !== 'Unknown Group' ? ` (${groupName})` : ''}`;
    }
    
    return (
      <Pressable
        style={({ pressed }) => [
          styles.activityItem,
          pressed && styles.activityItemPressed
        ]}
        onPress={() => {
          if (item.groupId) {
            navigation.navigate('GroupDetail', { groupId: item.groupId });
          }
        }}
      >
        <View style={styles.activityIconContainer}>
          <Icon 
            name={isExpense ? 'cash' : 'check-circle'} 
            size={20} 
            color={isExpense ? colors.primary : colors.balancePositive} 
          />
        </View>
        <View style={styles.activityContent}>
          <Text style={styles.activityText} numberOfLines={2}>
            {activityText}
          </Text>
          <Text style={styles.activityTime}>
            {formatRelativeTime(item.timestamp)}
          </Text>
        </View>
      </Pressable>
    );
  }, [navigation]);

  // Removed renderGroup - using inline rendering now for simpler layout

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {/* Card 1: Balance Summary */}
          <View style={styles.cardSection}>
            <Card style={styles.summaryCard} mode="elevated">
              <Card.Content>
                <View style={styles.summaryHeader}>
                  <Text variant="titleLarge" style={styles.summaryTitle}>Balance Summary</Text>
                  <Icon name="wallet-outline" size={24} color={colors.primary} />
                </View>
                
                <View style={styles.balanceRow}>
                  <View style={styles.balanceItem}>
                    <Text variant="bodySmall" style={styles.balanceLabel} numberOfLines={1}>
                      Total Balance
                    </Text>
                    <Text 
                      variant="titleLarge" 
                      style={[
                        styles.balanceValue,
                        totalBalance >= 0 ? styles.balanceValuePositive : styles.balanceValueNegative
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit={true}
                      minimumFontScale={0.7}
                    >
                      {totalBalance >= 0 ? '+' : ''}₹{Math.abs(totalBalance).toFixed(0)}
                    </Text>
                  </View>
                </View>

                <Divider style={styles.summaryDivider} />

                <View style={styles.summaryGrid}>
                  <View style={styles.summaryItem}>
                    <Icon name="arrow-top-right" size={18} color={colors.balancePositive} />
                    <Text variant="bodySmall" style={styles.summaryItemLabel}>Will Get</Text>
                    <Text variant="bodyLarge" style={styles.summaryItemValuePositive}>
                      ₹{totalOwedToYou.toFixed(0)}
                    </Text>
                  </View>
                  
                  <View style={styles.summaryItem}>
                    <Icon name="arrow-bottom-left" size={18} color={colors.balanceNegative} />
                    <Text variant="bodySmall" style={styles.summaryItemLabel}>Will Pay</Text>
                    <Text variant="bodyLarge" style={styles.summaryItemValueNegative}>
                      ₹{totalOwed.toFixed(0)}
                    </Text>
                  </View>
                  
                  <View style={styles.summaryItem}>
                    <Icon name="calendar-today" size={18} color={colors.primary} />
                    <Text variant="bodySmall" style={styles.summaryItemLabel}>Today</Text>
                    <Text variant="bodyLarge" style={styles.summaryItemValue}>
                      ₹{todayExpense.toFixed(0)}
                    </Text>
                  </View>
                </View>
              </Card.Content>
            </Card>
          </View>

          {/* Groups Section */}
          <View style={styles.cardSection}>
            <Card style={styles.contentCard} mode="elevated">
              <Card.Content>
                {groups.length === 0 ? (
                  <View style={styles.groupsEmptyContainer}>
                    <EmptyState
                      icon="account-group-outline"
                      title="No groups yet"
                      subtitle="Create your first group to start splitting expenses with friends"
                      buttonText="Create Group"
                      onPress={() => navigation.navigate('CreateGroup')}
                      style={styles.groupsEmptyState}
                    />
                  </View>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.groupsRow}
                    style={styles.groupsScrollView}
                  >
                    {/* Add Group Button - First */}
                    <TouchableOpacity
                      style={styles.addGroupItem}
                      onPress={() => navigation.navigate('CreateGroup')}
                      activeOpacity={0.7}
                    >
                      <View style={styles.addGroupAvatar}>
                        <Icon name="plus" size={24} color={colors.primary} />
                      </View>
                      <Text style={styles.addGroupLabel} numberOfLines={1}>Add</Text>
                    </TouchableOpacity>
                    
                    {/* Groups */}
                    {groups.map((group) => (
                      <TouchableOpacity
                        key={group._id}
                        style={styles.groupItem}
                        onPress={() => navigation.navigate('GroupDetail', { groupId: group._id })}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.groupAvatar, group.isArchived && styles.groupAvatarArchived]}>
                          <Text style={styles.groupAvatarText}>
                            {getInitials(group.name)}
                          </Text>
                        </View>
                        <Text style={[styles.groupName, group.isArchived && styles.groupNameArchived]} numberOfLines={1}>
                          {group.name.length > 5 ? group.name.substring(0, 5) + '...' : group.name}
                        </Text>
                        {groupBalances[group._id] && (
                          <View style={styles.groupStatus}>
                            {(() => {
                              const balance = groupBalances[group._id];
                              const netBalance = balance?.net || 0;
                              if (netBalance > 0.01) {
                                return (
                                  <View style={[styles.statusBadge, styles.statusBadgePositive]}>
                                    <Icon name="arrow-top-right" size={10} color={colors.balancePositive} />
                                    <Text style={[styles.statusText, styles.statusTextPositive]} numberOfLines={1}>
                                      +₹{netBalance.toFixed(0)}
                                    </Text>
                                  </View>
                                );
                              } else if (netBalance < -0.01) {
                                return (
                                  <View style={[styles.statusBadge, styles.statusBadgeNegative]}>
                                    <Icon name="arrow-bottom-left" size={10} color={colors.balanceNegative} />
                                    <Text style={[styles.statusText, styles.statusTextNegative]} numberOfLines={1}>
                                      ₹{Math.abs(netBalance).toFixed(0)}
                                    </Text>
                                  </View>
                                );
                              } else {
                                return (
                                  <View style={[styles.statusBadge, styles.statusBadgeNeutral]}>
                                    <Icon name="check-circle" size={10} color={colors.textTertiary} />
                                    <Text style={[styles.statusText, styles.statusTextNeutral]} numberOfLines={1}>
                                      Settled
                                    </Text>
                                  </View>
                                );
                              }
                            })()}
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </Card.Content>
            </Card>
          </View>

          {/* Banner Ads - Auto Slider */}
          {bannersLoading ? (
            <View style={styles.cardSection}>
              <Card style={styles.premiumCard} mode="elevated">
                <Card.Content>
                  <View style={styles.bannerLoadingContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                </Card.Content>
              </Card>
            </View>
          ) : bannerAds.length > 0 ? (
            <View style={styles.cardSection}>
              <Card style={styles.bannerCard} mode="flat">
                <View style={styles.bannerCardWrapper}>
                  {bannerAds.map((ad, index) => (
                    <Animated.View
                      key={ad._id || ad.id || index}
                      style={[
                        styles.bannerItem,
                        index === currentBannerIndex && styles.bannerItemActive,
                        index === currentBannerIndex && {
                          transform: [{ translateX: bannerSlideX }],
                        },
                      ]}
                    >
                      {index === currentBannerIndex && (
                        <>
                          {/* Background Image - Covers entire Card */}
                          {ad.image && ad.image.trim() !== '' && (
                            <View style={styles.bannerImageContainer}>
                              <Image 
                                source={{ uri: ad.image }} 
                                style={styles.bannerImage}
                              />
                            </View>
                          )}
                          {/* Content on top of image */}
                          <Card.Content style={styles.bannerContent}>
                            {ad.image && ad.image.trim() !== '' ? (
                              <View style={styles.bannerWithImageContainer}>
                                <View style={styles.bannerTextContainer}>
                                  <Text variant="titleLarge" style={styles.bannerTitle} numberOfLines={2}>
                                    {ad.title}
                                  </Text>
                                  <Text variant="bodyMedium" style={styles.bannerDescription} numberOfLines={2}>
                                    {ad.description}
                                  </Text>
                                  {ad.action && (
                                    <Chip 
                                      icon="arrow-right" 
                                      style={styles.bannerButton}
                                      textStyle={styles.bannerButtonText}
                                      onPress={() => handleBannerPress(ad)}
                                    >
                                      {ad.action}
                                    </Chip>
                                  )}
                                </View>
                              </View>
                            ) : (
                              <View style={styles.bannerWithoutImageContainer}>
                                <View style={styles.bannerTextContainer}>
                                  <Text variant="titleLarge" style={styles.bannerTitle} numberOfLines={2}>
                                    {ad.title}
                                  </Text>
                                  <Text variant="bodyMedium" style={styles.bannerDescription} numberOfLines={3}>
                                    {ad.description}
                                  </Text>
                                  {ad.action && (
                                    <Chip 
                                      icon="arrow-right" 
                                      style={styles.bannerButton}
                                      textStyle={styles.bannerButtonText}
                                      onPress={() => handleBannerPress(ad)}
                                    >
                                      {ad.action}
                                    </Chip>
                                  )}
                                </View>
                                <Surface style={styles.bannerIconContainer} elevation={2}>
                                  <Icon name="tag" size={32} color={colors.primary} />
                                </Surface>
                              </View>
                            )}
                          </Card.Content>
                        </>
                      )}
                    </Animated.View>
                  ))}
                  
                  {/* Banner Indicators - Hidden */}
                </View>
              </Card>
            </View>
          ) : null}

          {/* FAQ Section */}
          <View style={styles.cardSection}>
            <Card style={styles.faqCard} mode="elevated">
              <Card.Content>
                <TouchableOpacity
                  onPress={() => navigation.navigate('FAQ')}
                  style={styles.faqContainer}
                  activeOpacity={0.7}
                >
                  <View style={styles.faqLeft}>
                    <Surface style={styles.faqIconContainer} elevation={2}>
                      <Icon name="help-circle" size={28} color={colors.primary} />
                    </Surface>
                    <View style={styles.faqTextContainer}>
                      <Text variant="titleMedium" style={styles.faqTitle}>Need Help?</Text>
                      <Text variant="bodySmall" style={styles.faqSubtitle}>
                        Check out our FAQ section
                      </Text>
                    </View>
                  </View>
                  <Icon name="chevron-right" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </Card.Content>
            </Card>
          </View>

          {/* Premium Upgrade */}
          <View style={styles.cardSection}>
            <Card style={styles.premiumCard} mode="elevated">
              <Card.Content>
                <View style={styles.premiumContent}>
                  <View style={styles.premiumLeft}>
                    <Surface style={styles.premiumIconContainer} elevation={2}>
                      <Icon name="crown" size={32} color="#FFD700" />
                    </Surface>
                    <View style={styles.premiumTextContainer}>
                      <Text variant="titleLarge" style={styles.premiumTitle}>Upgrade to Premium</Text>
                      <Text variant="bodyMedium" style={styles.premiumSubtitle}>
                        Unlock advanced features
                      </Text>
                      <Text variant="titleMedium" style={styles.premiumPrice}>
                        ₹10/month
                      </Text>
                    </View>
                  </View>
                  <Button
                    mode="contained"
                    onPress={() => {
                      // Navigate to premium subscription screen
                      Alert.alert('Premium', 'Premium subscription feature coming soon!');
                    }}
                    style={styles.premiumButton}
                    buttonColor={colors.primary}
                    labelStyle={styles.premiumButtonLabel}
                  >
                    Upgrade
                  </Button>
                </View>
              </Card.Content>
            </Card>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  scrollView: {
    flex: 1,
  },
  cardSection: {
    padding: spacing.md,
    paddingTop: spacing.lg,
  },
  summaryCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  summaryTitle: {
    fontWeight: '700',
    color: colors.textPrimary,
    fontSize: 18,
  },
  balanceRow: {
    marginBottom: spacing.sm,
  },
  balanceItem: {
    alignItems: 'center',
  },
  balanceLabel: {
    color: colors.textSecondary,
    marginBottom: spacing.xs / 2,
    fontWeight: '500',
    fontSize: 12,
  },
  balanceValue: {
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: spacing.xs,
  },
  balanceValuePositive: {
    color: colors.balancePositive,
  },
  balanceValueNegative: {
    color: colors.balanceNegative,
  },
  summaryDivider: {
    marginVertical: spacing.sm,
    backgroundColor: colors.divider,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.xs,
    paddingVertical: spacing.sm,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
  },
  summaryItemLabel: {
    color: colors.textSecondary,
    marginTop: spacing.xs / 2,
    marginBottom: spacing.xs / 2,
    fontWeight: '500',
    fontSize: 11,
  },
  summaryItemValue: {
    fontWeight: '700',
    color: colors.textPrimary,
    fontSize: 16,
  },
  summaryItemValuePositive: {
    color: colors.balancePositive,
    fontWeight: '700',
    fontSize: 16,
  },
  summaryItemValueNegative: {
    color: colors.balanceNegative,
    fontWeight: '700',
    fontSize: 16,
  },
  faqCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
  },
  faqContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  faqLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  faqIconContainer: {
    width: scaleSize(48),
    height: scaleSize(48),
    borderRadius: borderRadius.round,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  faqTextContainer: {
    flex: 1,
  },
  faqTitle: {
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs / 2,
  },
  faqSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  premiumCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  // Card style for groups and banners - match activity card style
  contentCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    // Same as activityCard - no border, no shadow
    elevation: 0, // Remove shadow
    shadowOpacity: 0, // Remove shadow
  },
  // Banner card - no shadow, no border
  bannerCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    elevation: 0, // Remove shadow
    shadowOpacity: 0, // Remove shadow
  },
  premiumContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  premiumLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  premiumIconContainer: {
    width: scaleSize(64),
    height: scaleSize(64),
    borderRadius: borderRadius.round,
    backgroundColor: '#FFF9E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  premiumTextContainer: {
    flex: 1,
  },
  premiumTitle: {
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  premiumSubtitle: {
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  premiumPrice: {
    fontWeight: '700',
    color: '#FFD700',
  },
  premiumButton: {
    borderRadius: borderRadius.md,
    marginLeft: spacing.md,
  },
  premiumButtonLabel: {
    fontWeight: '700',
  },
  // Removed groupsCard - using premiumCard style now
  // Removed groupsCardContent - using Card.Content default padding
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  sectionTitle: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  groupCountChip: {
    backgroundColor: colors.primaryLight,
  },
  groupsScrollView: {
    marginHorizontal: 0,
  },
  groupsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  // Add Group Item
  addGroupItem: {
    alignItems: 'center',
    width: scaleSize(70),
    marginRight: spacing.xs,
  },
  addGroupAvatar: {
    width: scaleSize(56),
    height: scaleSize(56),
    borderRadius: borderRadius.round,
    backgroundColor: colors.primaryLight,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  addGroupLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  // Group Item
  groupItem: {
    alignItems: 'center',
    width: scaleSize(70),
    marginRight: spacing.xs,
  },
  groupAvatar: {
    width: scaleSize(56),
    height: scaleSize(56),
    borderRadius: borderRadius.round,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  groupAvatarArchived: {
    opacity: 0.6,
    backgroundColor: colors.textTertiary,
    borderColor: colors.textTertiary,
  },
  groupAvatarText: {
    fontWeight: '700',
    color: colors.background,
    fontSize: 18,
    letterSpacing: 0.5,
  },
  groupName: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs / 2,
    maxWidth: scaleSize(70),
  },
  groupNameArchived: {
    color: colors.textTertiary,
  },
  groupStatus: {
    width: '100%',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    gap: 2,
    maxWidth: '100%',
  },
  statusBadgePositive: {
    backgroundColor: colors.primaryLight,
  },
  statusBadgeNegative: {
    backgroundColor: '#FEE2E2',
  },
  statusBadgeNeutral: {
    backgroundColor: colors.backgroundSecondary,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '700',
  },
  statusTextPositive: {
    color: colors.balancePositive,
  },
  statusTextNegative: {
    color: colors.balanceNegative,
  },
  statusTextNeutral: {
    color: colors.textTertiary,
    fontSize: 9,
  },
  emptyIconContainer: {
    width: wp(30),
    height: wp(30),
    borderRadius: borderRadius.round,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyCard: {
    marginTop: spacing.lg,
  },
  emptyCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    ...typography.bodyMedium,
  },
  groupsEmptyContainer: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  groupsEmptyState: {
    marginVertical: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptySubtext: {
    color: colors.textTertiary,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  emptyAddButtonText: {
    color: colors.background,
    fontWeight: '600',
  },
  // Removed bannerSection, bannerScrollView, bannerScrollContent, bannerCardWrapper, bannerCard
  // Using premiumCard style and new banner structure
  bannerCardWrapper: {
    position: 'relative',
    minHeight: hp(18),
    width: '100%',
    overflow: 'hidden',
    borderRadius: borderRadius.lg,
  },
  bannerItem: {
    width: '100%',
    opacity: 0,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  bannerItemActive: {
    opacity: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  bannerLoadingContainer: {
    minHeight: hp(20),
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  bannerContent: {
    flex: 1,
    padding: spacing.md,
    minHeight: hp(18),
    width: '100%',
    height: '100%',
    position: 'relative', // For absolute positioned background image
    zIndex: 1, // Above background image
  },
  bannerWithImageContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    height: '100%',
    minHeight: '100%',
    gap: spacing.md,
    flexWrap: 'wrap',
    position: 'relative', // For absolute positioned image
    overflow: 'hidden',
  },
  bannerWithoutImageContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: '100%',
    gap: spacing.lg, // Increased gap
    flexWrap: 'wrap',
  },
  bannerTextContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: spacing.md,
    minWidth: 0, // Prevents text overflow
    flexShrink: 1,
    zIndex: 1, // Ensure text is above background image
  },
  bannerTitle: {
    fontWeight: '700',
    color: colors.textPrimary, // Match premium card text color
    marginBottom: spacing.xs,
    fontSize: scaleFont(16), // Slightly smaller for better fit
  },
  bannerDescription: {
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    lineHeight: scaleFont(18),
    fontSize: scaleFont(13), // Slightly smaller for better fit
  },
  bannerButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    marginTop: spacing.xs,
  },
  bannerButtonText: {
    fontWeight: '600',
    color: colors.background,
    fontSize: 12,
  },
  bannerImageContainer: {
    position: 'absolute', // Position absolutely to cover whole card
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    borderRadius: borderRadius.lg, // Match card border radius
    zIndex: 0, // Behind content
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover', // Cover the entire card
    opacity: 1, // Full opacity - not faded
  },
  bannerIconContainer: {
    width: scaleSize(64), // Match premium icon size
    height: scaleSize(64),
    borderRadius: borderRadius.round,
    backgroundColor: '#FFF9E6', // Match premium icon background
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.md,
    // Add elevation like premium card
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  bannerIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  bannerIndicator: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.round,
    backgroundColor: colors.inputBorder,
  },
  bannerIndicatorActive: {
    width: 24,
    backgroundColor: colors.primary,
  },
  activityCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
  },
  activityLoadingContainer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  activityLoadingText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  activityEmptyState: {
    paddingVertical: spacing.md,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
  },
  activityItemPressed: {
    opacity: 0.7,
  },
  activityIconContainer: {
    width: scaleSize(32),
    height: scaleSize(32),
    borderRadius: borderRadius.round,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    marginTop: spacing.xs,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    marginBottom: spacing.xs / 2,
  },
  activityTime: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  activitySeparator: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.xs,
  },
  lastUpdatedText: {
    ...typography.caption,
    color: colors.textTertiary,
  },
});

