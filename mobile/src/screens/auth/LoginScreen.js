import React, { useState } from 'react';
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
import { colors, spacing, typography, borderRadius } from '../../theme/colors';

export default function LoginScreen({ navigation }) {
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [useEmail, setUseEmail] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async () => {
    if (!phone && !email) {
      Alert.alert('Error', 'Please enter phone number or email');
      return;
    }

    if (useEmail && !email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email');
      return;
    }

    if (!useEmail && phone.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.sendOTP(
        useEmail ? null : phone,
        useEmail ? email : null
      );
      
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
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Icon name="account-group" size={64} color={colors.primary} />
          </View>
          <Text style={styles.title}>Welcome to Split Buddy</Text>
          <Text style={styles.subtitle}>
            Enter your {useEmail ? 'email' : 'phone number'} to continue
          </Text>
        </View>

        {/* Input Section */}
        <View style={styles.inputSection}>
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggle, !useEmail && styles.toggleActive]}
              onPress={() => {
                setUseEmail(false);
                setEmail('');
              }}
              activeOpacity={0.7}
            >
              <Icon
                name="phone"
                size={18}
                color={!useEmail ? colors.background : colors.textSecondary}
              />
              <Text style={[styles.toggleText, !useEmail && styles.toggleTextActive]}>
                Phone
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggle, useEmail && styles.toggleActive]}
              onPress={() => {
                setUseEmail(true);
                setPhone('');
              }}
              activeOpacity={0.7}
            >
              <Icon
                name="email"
                size={18}
                color={useEmail ? colors.background : colors.textSecondary}
              />
              <Text style={[styles.toggleText, useEmail && styles.toggleTextActive]}>
                Email
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputWrapper}>
            {useEmail ? (
              <>
                <Icon name="email-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email address"
                  placeholderTextColor={colors.textTertiary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </>
            ) : (
              <>
                <Icon name="phone-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Phone number"
                  placeholderTextColor={colors.textTertiary}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </>
            )}
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSendOTP}
            disabled={loading || (!phone && !email)}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <>
                <Text style={styles.buttonText}>Request OTP</Text>
                <Icon name="arrow-forward" size={20} color={colors.background} />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By continuing, you agree to our Terms of Service and Privacy Policy
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
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.xl * 2,
  },
  logoContainer: {
    width: 100,
    height: 100,
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
  inputSection: {
    flex: 1,
    justifyContent: 'center',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.inputBackground,
    borderRadius: borderRadius.md,
    padding: spacing.xs,
    marginBottom: spacing.lg,
  },
  toggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  toggleActive: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  toggleTextActive: {
    ...typography.body,
    color: colors.background,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    paddingVertical: spacing.md,
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

