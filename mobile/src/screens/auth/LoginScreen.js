import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  Image,
} from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { authAPI } from '../../services/api';
import { colors, spacing, typography, borderRadius } from '../../theme/colors';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 375;

export default function LoginScreen({ navigation }) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async () => {
    if (!phone) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    if (phone.length < 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.sendOTP(phone, null);
      
      if (response && response.success) {
        navigation.navigate('OTP', { 
          userId: response.userId,
          otp: response.otp || null // Pass OTP if available (development mode)
        });
      } else {
        Alert.alert('Error', response?.message || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('Send OTP error:', error);
      let errorMessage = 'Failed to send OTP. Please check your connection and try again.';
      
      if (error.response) {
        // Show validation errors if available
        if (error.response.data?.errors && Array.isArray(error.response.data.errors)) {
          const validationErrors = error.response.data.errors
            .map(err => err.msg || err.message)
            .join(', ');
          errorMessage = validationErrors || error.response.data?.message || errorMessage;
        } else {
          errorMessage = error.response.data?.message || errorMessage;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* App Logo */}
        <View style={styles.logoSection}>
          <View style={styles.logoCircleContainer}>
            <Image 
              source={require('../../../assets/app_logo.png')} 
              style={styles.appLogo}
              resizeMode="cover"
            />
          </View>
        </View>

        {/* Features Grid */}
        <View style={styles.featuresGrid}>
          <View style={styles.featureCard}>
            <View style={styles.featureIconContainer}>
              <Icon name="receipt" size={28} color={colors.primary} />
            </View>
            <Text variant="bodySmall" style={styles.featureTitle}>
              Track Expenses
            </Text>
            <Text variant="bodySmall" style={styles.featureDescription}>
              Record every shared expense
            </Text>
          </View>
          
          <View style={styles.featureCard}>
            <View style={styles.featureIconContainer}>
              <Icon name="account-multiple" size={28} color={colors.primary} />
            </View>
            <Text variant="bodySmall" style={styles.featureTitle}>
              Auto Split
            </Text>
            <Text variant="bodySmall" style={styles.featureDescription}>
              Split bills automatically
            </Text>
          </View>
          
          <View style={styles.featureCard}>
            <View style={styles.featureIconContainer}>
              <Icon name="wallet" size={28} color={colors.primary} />
            </View>
            <Text variant="bodySmall" style={styles.featureTitle}>
              Settle Up
            </Text>
            <Text variant="bodySmall" style={styles.featureDescription}>
              Clear debts easily
            </Text>
          </View>
          
          <View style={styles.featureCard}>
            <View style={styles.featureIconContainer}>
              <Icon name="chart-line" size={28} color={colors.primary} />
            </View>
            <Text variant="bodySmall" style={styles.featureTitle}>
              Insights
            </Text>
            <Text variant="bodySmall" style={styles.featureDescription}>
              View spending analytics
            </Text>
          </View>
        </View>

        {/* Simple Phone Input */}
        <View style={styles.inputSection}>
          <TextInput
            mode="outlined"
            label="Phone Number"
            placeholder="Enter 10-digit number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            maxLength={10}
            autoFocus
            left={<TextInput.Icon icon="phone" />}
            style={styles.phoneInput}
            contentStyle={styles.phoneInputContent}
            outlineColor={colors.inputBorder}
            activeOutlineColor={colors.primary}
          />

          {/* Futuristic Continue Button */}
          <Button
            mode="contained"
            onPress={handleSendOTP}
            disabled={loading || !phone || phone.length < 10}
            loading={loading}
            style={styles.futuristicButton}
            contentStyle={styles.futuristicButtonContent}
            labelStyle={styles.futuristicButtonLabel}
            buttonColor={colors.primary}
            icon="arrow-right"
          >
            Continue
          </Button>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By continuing, you agree to our{' '}
            <Text style={styles.footerLink}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={styles.footerLink}>Privacy Policy</Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingTop: spacing.xl * 2,
    paddingBottom: spacing.xl,
    justifyContent: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoCircleContainer: {
    width: isSmallScreen ? 180 : 220,
    height: isSmallScreen ? 180 : 220,
    borderRadius: isSmallScreen ? 90 : 110,
    overflow: 'hidden',
    backgroundColor: colors.background,
    borderWidth: 4,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  appLogo: {
    width: '100%',
    height: '100%',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
    justifyContent: 'space-between',
  },
  featureCard: {
    width: isSmallScreen ? '48%' : '48%',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
    minWidth: isSmallScreen ? 140 : 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  featureIconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.round,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  featureTitle: {
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  featureDescription: {
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: 11,
  },
  inputSection: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xl,
  },
  phoneInput: {
    backgroundColor: colors.background,
    marginBottom: spacing.lg,
  },
  phoneInputContent: {
    minHeight: 56,
  },
  futuristicButton: {
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
    alignSelf: 'center',
    minWidth: 200,
    height: 48,
  },
  futuristicButtonContent: {
    paddingVertical: spacing.xs,
    height: 48,
    flexDirection: 'row-reverse',
  },
  futuristicButtonLabel: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footer: {
    marginTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  footerText: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
  footerLink: {
    color: colors.primary,
    fontWeight: '600',
  },
});


