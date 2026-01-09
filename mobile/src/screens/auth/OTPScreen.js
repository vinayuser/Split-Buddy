import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Text, TextInput, Button, Card, Surface } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { authAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, typography, borderRadius } from '../../theme/colors';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 375;

export default function OTPScreen({ route, navigation }) {
  const { userId, otp: receivedOTP } = route.params || {};
  const { login } = useAuth();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [displayOTP, setDisplayOTP] = useState(receivedOTP || '');
  const inputRefs = useRef([]);

  const handleOTPChange = (index, value) => {
    if (value.length > 1) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (index, key) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpString = otp.join('');
    if (otpString.length < 4 || otpString.length > 6) {
      Alert.alert('Error', 'Please enter 4-6 digit OTP');
      return;
    }

    if (!userId) {
      Alert.alert('Error', 'User ID is missing. Please try again.');
      return;
    }

    setLoading(true);
    try {
      // Ensure userId is a string
      const userIdStr = String(userId).trim();
      console.log('Verifying OTP:', { userId: userIdStr, otp: otpString });
      const response = await authAPI.verifyOTP(userIdStr, otpString);
      
      if (response && response.success) {
        await login(response.user, response.token, response.refreshToken);
        
        // Check if profile needs setup (name is just phone number or missing)
        const userName = response.user?.name || '';
        const userPhone = response.user?.phone || '';
        const needsProfileSetup = !userName || userName === userPhone || userName.length < 2;
        
        if (needsProfileSetup) {
          // Navigate to profile setup
          navigation.replace('ProfileSetup');
        } else {
          // Navigation will be handled automatically by App.js when user state updates
          // No need to navigate manually - AuthContext will trigger re-render
        }
      } else {
        Alert.alert('Error', response?.message || 'Invalid OTP');
      }
    } catch (error) {
      console.error('Verify OTP error:', error);
      let errorMessage = 'Failed to verify OTP. Please try again.';
      
      if (error.response) {
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
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Icon name="arrow-left" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.logoWrapper}>
            <Surface style={styles.logoContainer} elevation={3}>
              <View style={styles.logoGradient}>
                <Icon name="shield-check" size={48} color={colors.background} />
              </View>
            </Surface>
            <View style={styles.secureBadge}>
              <Icon name="lock" size={12} color={colors.primary} />
            </View>
          </View>
          <Text variant="headlineSmall" style={styles.title}>Verify Your Phone</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            We sent a 6-digit verification code to your phone via SMS
          </Text>
        </View>
        {/* OTP Display (Development Mode) */}
        {displayOTP && (
          <Card mode="outlined" style={styles.otpDisplayCard}>
            <Card.Content>
              <View style={styles.otpDisplayBox}>
                <Icon name="information-outline" size={20} color={colors.primary} />
                <Text variant="bodySmall" style={styles.otpDisplayLabel}>
                  Your OTP (Development Mode):
                </Text>
                <Text variant="headlineSmall" style={styles.otpDisplayCode}>
                  {displayOTP}
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* OTP Input */}
        <Card style={styles.inputCard} mode="elevated">
          <Card.Content>
            <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => (inputRefs.current[index] = ref)}
                  mode="outlined"
                  value={digit}
                  onChangeText={(value) => handleOTPChange(index, value)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  style={styles.otpInput}
                  contentStyle={styles.otpInputContent}
                />
              ))}
            </View>

            <Button
              mode="contained"
              onPress={handleVerify}
              disabled={loading || otp.join('').length < 4}
              loading={loading}
              icon="check-circle"
              style={styles.button}
              contentStyle={styles.buttonContent}
            >
              Verify
            </Button>

            <Button
              mode="text"
              onPress={() => navigation.goBack()}
              icon="refresh"
              style={styles.resendButton}
            >
              Resend OTP
            </Button>
          </Card.Content>
        </Card>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Didn't receive the code? Tap "Resend OTP" to request a new one.
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  content: {
    flex: 1,
    padding: isSmallScreen ? spacing.md : spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: spacing.sm,
  },
  logoWrapper: {
    position: 'relative',
    marginBottom: spacing.lg,
    alignSelf: 'center',
  },
  logoContainer: {
    width: isSmallScreen ? 90 : 100,
    height: isSmallScreen ? 90 : 100,
    borderRadius: borderRadius.round,
    overflow: 'hidden',
  },
  logoGradient: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secureBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: borderRadius.round,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  infoCard: {
    marginTop: spacing.md,
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  infoText: {
    flex: 1,
    color: colors.primaryDark,
    lineHeight: 18,
  },
  title: {
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
  otpDisplayCard: {
    marginBottom: spacing.lg,
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  otpDisplayBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  otpDisplayLabel: {
    color: colors.primaryDark,
    flex: 1,
  },
  otpDisplayCode: {
    color: colors.primaryDark,
    fontWeight: '700',
    letterSpacing: 4,
  },
  inputCard: {
    flex: 1,
    justifyContent: 'center',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
    gap: isSmallScreen ? spacing.xs : spacing.sm,
  },
  otpInput: {
    flex: 1,
  },
  otpInputContent: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
  },
  button: {
    marginBottom: spacing.md,
  },
  buttonContent: {
    paddingVertical: spacing.xs,
  },
  resendButton: {
    marginTop: spacing.sm,
  },
  footer: {
    paddingBottom: spacing.lg,
  },
  footerText: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 16,
  },
});

