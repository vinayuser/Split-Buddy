import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { subscriptionAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, typography, borderRadius } from '../../theme/colors';
import { Card, Surface } from 'react-native-paper';

export default function SubscriptionScreen({ navigation }) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    loadSubscriptionStatus();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadSubscriptionStatus();
    });
    return unsubscribe;
  }, [navigation]);

  const loadSubscriptionStatus = useCallback(async () => {
    try {
      setLoading(true);
      const response = await subscriptionAPI.getStatus();
      if (response.success) {
        setSubscription(response.subscription);
      }
    } catch (error) {
      console.error('Load subscription error:', error);
      Alert.alert('Error', 'Failed to load subscription status');
    } finally {
      setLoading(false);
    }
  }, []);

  const handlePurchase = async (planType) => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Subscription Purchase',
        'In-app purchases are only available on mobile devices. Please use the mobile app to purchase a subscription.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Purchase Subscription',
      `This will initiate a purchase for the ${planType === 'monthly_10' ? '₹10/month' : '₹15/month'} plan.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Purchase',
          onPress: async () => {
            setPurchasing(true);
            try {
              // In a real app, you would use react-native-iap or expo-in-app-purchases
              // For now, we'll simulate the purchase flow
              Alert.alert(
                'Purchase Flow',
                'In a production app, this would open the native purchase dialog. For now, you can test with a mock purchase token.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Test Purchase',
                    onPress: async () => {
                      // Mock purchase token for testing
                      const mockToken = `test_token_${Date.now()}`;
                      try {
                        const response = await subscriptionAPI.verifySubscription(mockToken, planType);
                        if (response.success) {
                          Alert.alert('Success', 'Subscription activated successfully!');
                          loadSubscriptionStatus();
                        } else {
                          Alert.alert('Error', response.message || 'Failed to activate subscription');
                        }
                      } catch (error) {
                        Alert.alert('Error', 'Failed to verify subscription');
                      }
                    },
                  },
                ]
              );
            } catch (error) {
              Alert.alert('Error', 'Failed to initiate purchase');
            } finally {
              setPurchasing(false);
            }
          },
        },
      ]
    );
  };

  const renderSubscriptionStatus = () => {
    if (!subscription) return null;

    const { status, active, daysRemaining, endDate, planType } = subscription;

    if (status === 'active') {
      const endDateStr = endDate ? new Date(endDate).toLocaleDateString() : 'N/A';
      const planName = planType === 'monthly_10' ? 'Premium (₹10/month)' : 'Premium Plus (₹15/month)';
      
      return (
        <Card style={styles.statusCard}>
          <Card.Content>
            <View style={styles.statusHeader}>
              <Icon name="check-circle" size={32} color={colors.balancePositive} />
              <Text style={styles.statusTitle}>Active Subscription</Text>
            </View>
            <Text style={styles.statusText}>{planName}</Text>
            <Text style={styles.statusSubtext}>Renews on {endDateStr}</Text>
          </Card.Content>
        </Card>
      );
    }

    if (status === 'trial') {
      return (
        <Card style={[styles.statusCard, styles.trialCard]}>
          <Card.Content>
            <View style={styles.statusHeader}>
              <Icon name="clock-outline" size={32} color={colors.warning} />
              <Text style={styles.statusTitle}>Free Trial Active</Text>
            </View>
            <Text style={styles.trialDaysText}>
              {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
            </Text>
            <Text style={styles.statusSubtext}>
              Your trial ends on {new Date(subscription.trialEndDate).toLocaleDateString()}
            </Text>
            <Text style={styles.trialWarning}>
              Subscribe now to continue using all features after your trial ends!
            </Text>
          </Card.Content>
        </Card>
      );
    }

    if (status === 'expired') {
      return (
        <Card style={[styles.statusCard, styles.expiredCard]}>
          <Card.Content>
            <View style={styles.statusHeader}>
              <Icon name="alert-circle" size={32} color={colors.balanceNegative} />
              <Text style={styles.statusTitle}>Trial Expired</Text>
            </View>
            <Text style={styles.statusText}>
              Your 7-day free trial has ended
            </Text>
            <Text style={styles.statusSubtext}>
              Subscribe to continue using all features
            </Text>
          </Card.Content>
        </Card>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading subscription status...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Subscription Status */}
      {renderSubscriptionStatus()}

      {/* Plans Section */}
      {(!subscription || subscription.status !== 'active') && (
        <View style={styles.plansSection}>
          <Text style={styles.sectionTitle}>Choose Your Plan</Text>
          <Text style={styles.sectionSubtitle}>
            Unlock all features and continue managing your expenses
          </Text>

          {/* Plan 1: ₹10/month */}
          <Card style={styles.planCard}>
            <Card.Content>
              <View style={styles.planHeader}>
                <View style={styles.planIconContainer}>
                  <Icon name="star" size={24} color={colors.primary} />
                </View>
                <View style={styles.planInfo}>
                  <Text style={styles.planName}>Premium</Text>
                  <Text style={styles.planPrice}>₹10<Text style={styles.planPeriod}>/month</Text></Text>
                </View>
              </View>
              <View style={styles.planFeatures}>
                <View style={styles.featureItem}>
                  <Icon name="check-circle" size={16} color={colors.balancePositive} />
                  <Text style={styles.featureText}>Unlimited groups</Text>
                </View>
                <View style={styles.featureItem}>
                  <Icon name="check-circle" size={16} color={colors.balancePositive} />
                  <Text style={styles.featureText}>Unlimited expenses</Text>
                </View>
                <View style={styles.featureItem}>
                  <Icon name="check-circle" size={16} color={colors.balancePositive} />
                  <Text style={styles.featureText}>Advanced analytics</Text>
                </View>
                <View style={styles.featureItem}>
                  <Icon name="check-circle" size={16} color={colors.balancePositive} />
                  <Text style={styles.featureText}>Priority support</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.purchaseButton, purchasing && styles.purchaseButtonDisabled]}
                onPress={() => handlePurchase('monthly_10')}
                disabled={purchasing}
              >
                {purchasing ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <>
                    <Text style={styles.purchaseButtonText}>Subscribe Now</Text>
                    <Icon name="arrow-right" size={20} color={colors.background} />
                  </>
                )}
              </TouchableOpacity>
            </Card.Content>
          </Card>

          {/* Plan 2: ₹15/month */}
          <Card style={[styles.planCard, styles.planCardFeatured]}>
            <Card.Content>
              <View style={styles.featuredBadge}>
                <Text style={styles.featuredBadgeText}>POPULAR</Text>
              </View>
              <View style={styles.planHeader}>
                <View style={[styles.planIconContainer, styles.planIconContainerFeatured]}>
                  <Icon name="crown" size={24} color="#FFD700" />
                </View>
                <View style={styles.planInfo}>
                  <Text style={styles.planName}>Premium Plus</Text>
                  <Text style={styles.planPrice}>₹15<Text style={styles.planPeriod}>/month</Text></Text>
                </View>
              </View>
              <View style={styles.planFeatures}>
                <View style={styles.featureItem}>
                  <Icon name="check-circle" size={16} color={colors.balancePositive} />
                  <Text style={styles.featureText}>Everything in Premium</Text>
                </View>
                <View style={styles.featureItem}>
                  <Icon name="check-circle" size={16} color={colors.balancePositive} />
                  <Text style={styles.featureText}>Export reports</Text>
                </View>
                <View style={styles.featureItem}>
                  <Icon name="check-circle" size={16} color={colors.balancePositive} />
                  <Text style={styles.featureText}>Custom categories</Text>
                </View>
                <View style={styles.featureItem}>
                  <Icon name="check-circle" size={16} color={colors.balancePositive} />
                  <Text style={styles.featureText}>Ad-free experience</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.purchaseButton, styles.purchaseButtonFeatured, purchasing && styles.purchaseButtonDisabled]}
                onPress={() => handlePurchase('monthly_15')}
                disabled={purchasing}
              >
                {purchasing ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <>
                    <Text style={styles.purchaseButtonText}>Subscribe Now</Text>
                    <Icon name="arrow-right" size={20} color={colors.background} />
                  </>
                )}
              </TouchableOpacity>
            </Card.Content>
          </Card>
        </View>
      )}

      {/* Info Section */}
      <Card style={styles.infoCard}>
        <Card.Content>
          <View style={styles.infoItem}>
            <Icon name="information" size={20} color={colors.primary} />
            <Text style={styles.infoText}>
              Subscriptions auto-renew. Cancel anytime from your account settings.
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Icon name="shield-check" size={20} color={colors.primary} />
            <Text style={styles.infoText}>
              Secure payment processing through Google Play / App Store
            </Text>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  contentContainer: {
    padding: spacing.md,
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
  statusCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  trialCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  expiredCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.balanceNegative,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statusTitle: {
    ...typography.h3,
    fontWeight: '700',
    color: colors.textPrimary,
    marginLeft: spacing.sm,
  },
  statusText: {
    ...typography.body,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  statusSubtext: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  trialDaysText: {
    ...typography.h2,
    fontWeight: '700',
    color: colors.warning,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  trialWarning: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.md,
    fontStyle: 'italic',
  },
  plansSection: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    ...typography.h2,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  planCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    position: 'relative',
  },
  planCardFeatured: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  featuredBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.sm,
  },
  featuredBadgeText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.background,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  planIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.round,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  planIconContainerFeatured: {
    backgroundColor: '#FFF9E6',
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    ...typography.h3,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  planPrice: {
    ...typography.h2,
    fontWeight: '700',
    color: colors.primary,
    marginTop: spacing.xs / 2,
  },
  planPeriod: {
    ...typography.bodySmall,
    fontWeight: '400',
  },
  planFeatures: {
    marginVertical: spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  featureText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    marginLeft: spacing.sm,
  },
  purchaseButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  purchaseButtonFeatured: {
    backgroundColor: colors.primaryDark,
  },
  purchaseButtonDisabled: {
    opacity: 0.6,
  },
  purchaseButtonText: {
    ...typography.button,
    color: colors.background,
    fontWeight: '700',
  },
  infoCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    flex: 1,
  },
});

