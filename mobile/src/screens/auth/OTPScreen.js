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
import { Text, TextInput, Button, Card, Surface } from 'react-native-paper';
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
          <Card.Content style={styles.cardContent}>
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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
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
    width: scaleSize(28),
    height: scaleSize(28),
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
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
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
    width: wp(11), // Fixed width - 11% of screen width (6 inputs + gaps should fit)
    aspectRatio: 1, // Square aspect ratio
    height: scaleSize(56), // Fixed height for consistency
    borderWidth: 2,
    borderColor: colors.inputBorder,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background,
    fontSize: scaleFont(22),
    fontWeight: '700',
    color: colors.textPrimary,
    padding: 0,
    textAlignVertical: 'center',
  },
  otpInputNativeFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
    elevation: 2,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  otpInputNativeFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
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

