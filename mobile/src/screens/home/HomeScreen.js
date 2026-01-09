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
} from 'react-native';
import { Text, Card, Surface, FAB, Chip, Divider, Button } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { groupAPI, balanceAPI, expenseAPI, activityAPI, bannerAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, typography, borderRadius } from '../../theme/colors';
import { formatRelativeTime, getInitials } from '../../utils/helpers';
import EmptyState from '../../components/EmptyState';
import { FlatList, Pressable } from 'react-native';

const { width, height } = Dimensions.get('window');
const isSmallScreen = width < 375;
const GROUP_CARD_WIDTH = isSmallScreen ? 140 : 160; // Rectangular card width
const GROUP_CARD_HEIGHT = isSmallScreen ? 100 : 120; // Rectangular card height
const BANNER_HEIGHT = isSmallScreen ? 160 : 180; // Responsive banner ad height

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [groupBalances, setGroupBalances] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const bannerScrollRef = useRef(null);
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

  // Auto-scroll banner ads
  useEffect(() => {
    if (bannerAds.length > 1) {
      const interval = setInterval(() => {
        setCurrentBannerIndex((prev) => {
          const next = (prev + 1) % bannerAds.length;
          bannerScrollRef.current?.scrollTo({
            x: next * width,
            animated: true,
          });
          return next;
        });
      }, 5000); // Change banner every 5 seconds

      return () => clearInterval(interval);
    }
  }, [bannerAds.length]);

  const handleBannerScroll = (event) => {
    if (!event || !event.nativeEvent) return;
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const bannerWidth = width - spacing.md * 2 + spacing.md;
    const index = Math.round(scrollPosition / bannerWidth);
    const clampedIndex = Math.max(0, Math.min(index, bannerAds.length - 1));
    setCurrentBannerIndex(clampedIndex);
  };

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

  const renderBannerAd = (ad, index) => {
    const hasImage = ad.image && ad.image.trim() !== '';
    const imageSource = hasImage 
      ? { uri: ad.image }
      : null;

    return (
      <View
        key={ad._id || ad.id || index}
        style={styles.bannerCardWrapper}
      >
        <Card
          style={styles.bannerCard}
          mode="elevated"
          onPress={() => handleBannerPress(ad)}
        >
          <Card.Content style={styles.bannerContent}>
            {hasImage ? (
              <View style={styles.bannerWithImageContainer}>
                <View style={styles.bannerTextContainer}>
                  <Text variant="titleLarge" style={styles.bannerTitle} numberOfLines={2} adjustsFontSizeToFit={true}>
                    {ad.title}
                  </Text>
                  <Text variant="bodyMedium" style={styles.bannerDescription} numberOfLines={2} adjustsFontSizeToFit={true}>
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
                <View style={styles.bannerImageContainer}>
                  <Image 
                    source={imageSource} 
                    style={styles.bannerImage}
                    resizeMode="contain"
                    onError={(error) => {
                      console.log('Failed to load banner image:', error);
                    }}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.bannerWithoutImageContainer}>
                <View style={styles.bannerTextContainer}>
                  <Text variant="titleLarge" style={styles.bannerTitle} numberOfLines={2} adjustsFontSizeToFit={true}>
                    {ad.title}
                  </Text>
                  <Text variant="bodyMedium" style={styles.bannerDescription} numberOfLines={3} adjustsFontSizeToFit={true}>
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
                <Surface style={styles.bannerIconContainer} elevation={0}>
                  <Icon name="tag" size={48} color={colors.primary} />
                </Surface>
              </View>
            )}
          </Card.Content>
        </Card>
      </View>
    );
  };

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

  const renderGroup = (item, index) => {
    const balance = groupBalances[item._id];
    const netBalance = balance?.net || 0;
    const isArchived = item.isArchived || false;
    
    return (
      <TouchableOpacity
        key={item._id}
        style={styles.groupCard}
        onPress={() => navigation.navigate('GroupDetail', { groupId: item._id })}
        activeOpacity={0.7}
      >
        <View 
          style={[styles.groupCardContainer, isArchived && styles.groupCardContainerArchived]}
        >
          <View style={styles.groupCardContent}>
            <View style={styles.groupCardTop}>
              <View 
                style={[styles.groupCardAvatar, isArchived && styles.groupCardAvatarArchived]}
              >
                <Text style={styles.groupCardAvatarText}>
                  {getInitials(item.name)}
                </Text>
              </View>
            </View>
            
            <View style={styles.groupCardBottom}>
              <Text 
                style={[styles.groupCardName, isArchived && styles.groupCardNameArchived]} 
                numberOfLines={1}
              >
                {item.name}
              </Text>
              
              {balance && (
                <View style={styles.groupCardBalanceContainer}>
                  {netBalance > 0.01 ? (
                    <View style={[styles.balanceBadge, styles.balanceBadgePositive]}>
                      <Icon name="arrow-top-right" size={10} color={colors.balancePositive} />
                      <Text 
                        style={[styles.balanceBadgeText, styles.balanceBadgeTextPositive]}
                        numberOfLines={1}
                        adjustsFontSizeToFit={true}
                        minimumFontScale={0.8}
                      >
                        +₹{netBalance.toFixed(0)}
                      </Text>
                    </View>
                  ) : netBalance < -0.01 ? (
                    <View style={[styles.balanceBadge, styles.balanceBadgeNegative]}>
                      <Icon name="arrow-bottom-left" size={10} color={colors.balanceNegative} />
                      <Text 
                        style={[styles.balanceBadgeText, styles.balanceBadgeTextNegative]}
                        numberOfLines={1}
                        adjustsFontSizeToFit={true}
                        minimumFontScale={0.8}
                      >
                        ₹{Math.abs(netBalance).toFixed(0)}
                      </Text>
                    </View>
                  ) : (
                    <View style={[styles.balanceBadge, styles.balanceBadgeNeutral]}>
                      <Icon name="check-circle" size={10} color={colors.textTertiary} />
                      <Text 
                        style={[styles.balanceBadgeText, styles.balanceBadgeTextNeutral]}
                        numberOfLines={1}
                        adjustsFontSizeToFit={true}
                        minimumFontScale={0.8}
                      >
                        Settled
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

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

          {/* Recent Activity Section */}
          <View style={styles.cardSection}>
            <Card style={styles.activityCard} mode="elevated">
              <Card.Content>
                <View style={styles.sectionHeader}>
                  <Text variant="titleLarge" style={styles.sectionTitle}>Recent Activity</Text>
                  {lastUpdated && (
                    <Text style={styles.lastUpdatedText}>
                      Updated {formatRelativeTime(lastUpdated)}
                    </Text>
                  )}
                </View>
                
                {activitiesLoading && recentActivities.length === 0 ? (
                  <View style={styles.activityLoadingContainer}>
                    <Text style={styles.activityLoadingText}>Loading activities...</Text>
                  </View>
                ) : recentActivities.length === 0 ? (
                  <EmptyState
                    icon="history"
                    title="No recent activity"
                    subtitle="Add your first expense to see activity here"
                    actionLabel="Add Expense"
                    onAction={() => {
                      if (groups.length > 0) {
                        navigation.navigate('GroupDetail', { groupId: groups[0]._id });
                      } else {
                        navigation.navigate('CreateGroup');
                      }
                    }}
                    style={styles.activityEmptyState}
                  />
                ) : (
                  <FlatList
                    data={recentActivities}
                    renderItem={renderActivityItem}
                    keyExtractor={(item) => `${item.type}-${item.id}`}
                    scrollEnabled={false}
                    ItemSeparatorComponent={() => <View style={styles.activitySeparator} />}
                  />
                )}
              </Card.Content>
            </Card>
          </View>

          {/* Card 2: Premium Upgrade */}
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

          {/* Card 3: Groups Section */}
          <View style={styles.cardSection}>
            <Card style={styles.groupsCard} mode="elevated">
              <Card.Content style={styles.groupsCardContent}>
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
                      style={styles.addGroupCard}
                      onPress={() => navigation.navigate('CreateGroup')}
                      activeOpacity={0.8}
                    >
                      <Surface style={styles.addGroupContainer} elevation={2}>
                        <Icon name="plus" size={32} color={colors.primary} />
                        <Text variant="bodyMedium" style={styles.addGroupText}>Add Group</Text>
                      </Surface>
                    </TouchableOpacity>
                    
                    {/* Groups */}
                    {groups.map((group, index) => (
                      <React.Fragment key={group._id}>
                        {renderGroup(group, index)}
                      </React.Fragment>
                    ))}
                  </ScrollView>
                )}
              </Card.Content>
            </Card>
          </View>

          {/* Banner Ads Slider */}
          {bannersLoading ? (
            <View style={styles.bannerSection}>
              <View style={styles.bannerCardWrapper}>
                <Card style={styles.bannerCard} mode="elevated">
                  <Card.Content style={[styles.bannerContent, { justifyContent: 'center', alignItems: 'center' }]}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </Card.Content>
                </Card>
              </View>
            </View>
          ) : bannerAds.length > 0 ? (
            <View style={styles.bannerSection}>
              <ScrollView
                ref={bannerScrollRef}
                horizontal
                pagingEnabled={false}
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleBannerScroll}
                onScroll={handleBannerScroll}
                scrollEventThrottle={16}
                style={styles.bannerScrollView}
                contentContainerStyle={styles.bannerScrollContent}
                snapToInterval={width - spacing.md * 2 + spacing.md}
                snapToAlignment="start"
                decelerationRate="fast"
              >
                {bannerAds.map((ad, index) => renderBannerAd(ad, index))}
              </ScrollView>
              
              {/* Banner Indicators */}
              {bannerAds.length > 1 && (
                <View style={styles.bannerIndicators}>
                  {bannerAds.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.bannerIndicator,
                        currentBannerIndex === index && styles.bannerIndicatorActive,
                      ]}
                    />
                  ))}
                </View>
              )}
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
    width: 48,
    height: 48,
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
    width: 64,
    height: 64,
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
  groupsCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
  },
  groupsCardContent: {
    paddingBottom: spacing.md,
    paddingTop: spacing.md,
  },
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
    paddingVertical: spacing.xs,
  },
  groupsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingRight: spacing.lg,
    paddingVertical: spacing.xs,
    gap: spacing.md,
    alignItems: 'stretch',
  },
  groupCard: {
    width: GROUP_CARD_WIDTH,
    flexShrink: 0,
  },
  groupCardContainer: {
    width: GROUP_CARD_WIDTH,
    height: GROUP_CARD_HEIGHT,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  groupCardContainerArchived: {
    opacity: 0.7,
  },
  groupCardContent: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  groupCardTop: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  groupCardAvatar: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.round,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupCardAvatarArchived: {
    opacity: 0.6,
    backgroundColor: colors.textTertiary,
  },
  groupCardAvatarText: {
    fontWeight: '800',
    color: colors.background,
    fontSize: 22,
    letterSpacing: 0.5,
  },
  groupCardBottom: {
    alignItems: 'center',
  },
  groupCardName: {
    fontWeight: '700',
    color: colors.textPrimary,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  groupCardNameArchived: {
    color: colors.textTertiary,
  },
  groupCardBalanceContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs / 2,
  },
  balanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.sm,
    gap: spacing.xs / 2,
    maxWidth: '100%',
    flexShrink: 1,
  },
  balanceBadgePositive: {
    backgroundColor: colors.primaryLight,
  },
  balanceBadgeNegative: {
    backgroundColor: '#FEE2E2',
  },
  balanceBadgeNeutral: {
    backgroundColor: colors.backgroundSecondary,
  },
  balanceBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    flexShrink: 1,
  },
  balanceBadgeTextPositive: {
    color: colors.balancePositive,
  },
  balanceBadgeTextNegative: {
    color: colors.balanceNegative,
  },
  balanceBadgeTextNeutral: {
    color: colors.textTertiary,
    fontSize: 11,
  },
  addGroupCard: {
    width: GROUP_CARD_WIDTH,
  },
  addGroupContainer: {
    width: GROUP_CARD_WIDTH,
    height: GROUP_CARD_HEIGHT,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  addGroupText: {
    fontWeight: '700',
    color: colors.primary,
    marginTop: spacing.sm,
    fontSize: 14,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
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
  bannerSection: {
    padding: spacing.md,
    paddingTop: spacing.lg,
    marginBottom: spacing.md,
  },
  bannerScrollView: {
    marginHorizontal: 0,
  },
  bannerScrollContent: {
    paddingRight: spacing.md,
  },
  bannerCardWrapper: {
    width: width - spacing.md * 2,
    marginRight: spacing.md,
    flexShrink: 0,
  },
  bannerCard: {
    width: '100%',
    height: BANNER_HEIGHT,
    backgroundColor: colors.primaryLight,
    overflow: 'hidden', // Keep hidden to maintain card boundaries
  },
  bannerContent: {
    flex: 1,
    padding: spacing.md,
    height: '100%',
  },
  bannerWithImageContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '100%',
    gap: spacing.sm,
  },
  bannerWithoutImageContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '100%',
  },
  bannerTextContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: spacing.xs,
    minWidth: 0, // Prevents text overflow
    flexShrink: 1,
  },
  bannerTitle: {
    fontWeight: '700',
    color: colors.primaryDark,
    marginBottom: spacing.xs,
    fontSize: isSmallScreen ? 16 : 18,
  },
  bannerDescription: {
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 20,
    fontSize: isSmallScreen ? 13 : 14,
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
    width: isSmallScreen ? 90 : 110,
    height: BANNER_HEIGHT - spacing.md * 2 - 4, // Full height minus padding and some margin
    minHeight: isSmallScreen ? 90 : 110,
    maxHeight: BANNER_HEIGHT - spacing.md * 2 - 4,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.backgroundSecondary,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain', // Show full image without cropping
  },
  bannerIconContainer: {
    width: isSmallScreen ? 70 : 80,
    height: isSmallScreen ? 70 : 80,
    borderRadius: borderRadius.round,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.md,
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
    width: 32,
    height: 32,
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

