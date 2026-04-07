import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  TextInput as RNTextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, Surface } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { authAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, typography, borderRadius } from '../../theme/colors';
import { wp, hp, scaleFont, scaleSize, getResponsiveDimensions } from '../../utils/responsive';

const { width, height } = Dimensions.get('window');
const { isSmallScreen, isMediumScreen, isLargeScreen } = getResponsiveDimensions();
const screenHeight = height;

export default function OTPScreen({ route, navigation }) {
  const { userId, otp: receivedOTP } = route.params || {};
  const { login } = useAuth();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [displayOTP, setDisplayOTP] = useState(receivedOTP || '');
  const inputRefs = useRef([]);
  const [focusedIndex, setFocusedIndex] = useState(null);

  const handleOTPChange = (index, value) => {
    // Filter out non-numeric characters
    const numericValue = value.replace(/[^0-9]/g, '');
    if (numericValue.length > 1) {
      // Handle paste - split and fill multiple inputs
      const digits = numericValue.split('').slice(0, 6);
      const newOtp = [...otp];
      digits.forEach((digit, i) => {
        if (index + i < 6) {
          newOtp[index + i] = digit;
        }
      });
      setOtp(newOtp);
      // Focus on the last filled input or next empty
      const lastFilledIndex = Math.min(index + digits.length - 1, 5);
      const nextEmptyIndex = newOtp.findIndex((val, idx) => idx > lastFilledIndex && !val);
      const focusIndex = nextEmptyIndex !== -1 ? nextEmptyIndex : Math.min(lastFilledIndex + 1, 5);
      setTimeout(() => {
        inputRefs.current[focusIndex]?.focus();
      }, 50);
      return;
    }
    
    const newOtp = [...otp];
    newOtp[index] = numericValue;
    setOtp(newOtp);

    if (numericValue && index < 5) {
      setTimeout(() => {
        inputRefs.current[index + 1]?.focus();
      }, 50);
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
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
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
          <Text variant="headlineSmall" style={styles.title}>Verify your phone number</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            We've sent a 6-digit code to your number
          </Text>
        </View>
        {/* OTP Display (Development Mode) */}
        {displayOTP && (
          <View style={styles.otpDevNote}>
            <Text style={styles.otpDevText}>Dev OTP: {displayOTP}</Text>
          </View>
        )}

        {/* OTP Input */}
        <View style={styles.inputCard}>
            <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <RNTextInput
                  key={index}
                  ref={(ref) => (inputRefs.current[index] = ref)}
                  value={digit}
                  onChangeText={(value) => handleOTPChange(index, value)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
                  onFocus={() => setFocusedIndex(index)}
                  onBlur={() => setFocusedIndex(null)}
                  keyboardType="number-pad"
                  maxLength={6}
                  selectTextOnFocus
                  style={[
                    styles.otpInputNative,
                    focusedIndex === index && styles.otpInputNativeFocused,
                    digit && styles.otpInputNativeFilled
                  ]}
                  textAlign="center"
                  autoComplete="off"
                  autoCorrect={false}
                  autoCapitalize="none"
                  caretHidden={false}
                  importantForAutofill="no"
                  textContentType="none"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => {
                    if (index < 5) {
                      inputRefs.current[index + 1]?.focus();
                    }
                  }}
                  placeholder=""
                  placeholderTextColor={colors.textTertiary}
                />
              ))}
            </View>

            <Button
              mode="contained"
              onPress={handleVerify}
              disabled={loading || otp.join('').length < 4}
              loading={loading}
              icon="arrow-right"
              style={styles.button}
              contentStyle={styles.buttonContent}
            >
              Verify
            </Button>

            <View style={styles.resendRow}>
              <Icon name="clock-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.resendText}>Resend in 0:45</Text>
            </View>
            <Button mode="text" onPress={() => navigation.goBack()} style={styles.resendButton}>
              Didn't receive code?
            </Button>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.stateCardSuccess}>
            <Icon name="check-circle" size={18} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.stateTitleSuccess}>Code Verified</Text>
              <Text style={styles.stateSubSuccess}>Welcome back to Split Buddy!</Text>
            </View>
          </View>
        </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: isSmallScreen ? spacing.md : spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: Platform.OS === 'android' ? spacing.lg : spacing.xl,
    minHeight: screenHeight * 0.9,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.lg,
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
    width: isSmallScreen ? 92 : 96,
    height: isSmallScreen ? 92 : 96,
    borderRadius: borderRadius.lg,
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
    display: 'none',
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
    fontWeight: '800',
    fontSize: 40,
  },
  subtitle: {
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: 20,
  },
  otpDevNote: {
    marginBottom: spacing.lg,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignSelf: 'center',
  },
  otpDevText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  inputCard: {
    justifyContent: 'flex-start',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: isSmallScreen ? spacing.xs / 2 : spacing.xs,
    paddingHorizontal: 0, // Remove extra padding
    flexWrap: 'nowrap', // Keep all inputs in one row
    width: '100%',
  },
  cardContent: {
    padding: spacing.md, // Ensure proper padding
    overflow: 'hidden', // Prevent overflow
  },
  otpInput: {
    flex: 1,
  },
  otpInputContent: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
  },
  otpInputNative: {
    width: wp(12),
    aspectRatio: 1,
    height: scaleSize(64),
    borderWidth: 0,
    borderColor: colors.inputBorder,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceHighest,
    fontSize: scaleFont(22),
    fontWeight: '700',
    color: colors.textPrimary,
    padding: 0,
    textAlignVertical: 'center',
  },
  otpInputNativeFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.background,
  },
  otpInputNativeFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  button: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
  },
  buttonContent: {
    paddingVertical: spacing.sm,
  },
  resendButton: {
    marginTop: spacing.xs,
  },
  resendRow: {
    marginTop: spacing.md,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  resendText: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 16,
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
  stateCardSuccess: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(0, 168, 107, 0.25)',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  stateTitleSuccess: {
    color: colors.primaryDark,
    fontWeight: '800',
    fontSize: 18,
  },
  stateSubSuccess: {
    color: colors.secondary,
    fontSize: 14,
  },
});

