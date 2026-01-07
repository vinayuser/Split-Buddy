import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { authAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, typography, borderRadius } from '../../theme/colors';

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
        // Navigation will be handled automatically by App.js when user state updates
        // No need to navigate manually - AuthContext will trigger re-render
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
          <View style={styles.logoContainer}>
            <Icon name="shield-check" size={48} color={colors.primary} />
          </View>
          <Text style={styles.title}>Enter Verification Code</Text>
          <Text style={styles.subtitle}>
            We sent a verification code to your {receivedOTP ? 'device' : 'phone/email'}
          </Text>
        </View>

        {/* OTP Display (Development Mode) */}
        {displayOTP && (
          <View style={styles.otpDisplayContainer}>
            <View style={styles.otpDisplayBox}>
              <Icon name="information-outline" size={20} color={colors.primary} />
              <Text style={styles.otpDisplayLabel}>Your OTP (Development Mode):</Text>
              <Text style={styles.otpDisplayCode}>{displayOTP}</Text>
            </View>
          </View>
        )}

        {/* OTP Input */}
        <View style={styles.inputSection}>
          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => (inputRefs.current[index] = ref)}
                style={[styles.otpInput, digit && styles.otpInputFilled]}
                value={digit}
                onChangeText={(value) => handleOTPChange(index, value)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
              />
            ))}
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={loading || otp.join('').length < 4}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <>
                <Text style={styles.buttonText}>Verify</Text>
                <Icon name="check-circle" size={20} color={colors.background} />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resendButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Icon name="refresh" size={16} color={colors.primary} />
            <Text style={styles.resendText}>Resend OTP</Text>
          </TouchableOpacity>
        </View>

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
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
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
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.round,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  otpDisplayContainer: {
    marginBottom: spacing.lg,
  },
  otpDisplayBox: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  otpDisplayLabel: {
    ...typography.bodySmall,
    color: colors.primaryDark,
    flex: 1,
  },
  otpDisplayCode: {
    ...typography.h2,
    color: colors.primaryDark,
    fontWeight: '700',
    letterSpacing: 4,
  },
  inputSection: {
    flex: 1,
    justifyContent: 'center',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  otpInput: {
    flex: 1,
    height: 56,
    borderWidth: 2,
    borderColor: colors.inputBorder,
    borderRadius: borderRadius.md,
    textAlign: 'center',
    ...typography.h2,
    fontWeight: '700',
    backgroundColor: colors.inputBackground,
    color: colors.textPrimary,
  },
  otpInputFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    ...typography.button,
    color: colors.background,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
  },
  resendText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
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

