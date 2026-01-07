import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { userAPI, subscriptionAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, typography, borderRadius } from '../../theme/colors';
import { getInitials } from '../../utils/helpers';

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [gender, setGender] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const [profileRes, subscriptionRes] = await Promise.all([
        userAPI.getProfile(),
        subscriptionAPI.getStatus(),
      ]);

      if (profileRes.success) {
        setProfile(profileRes.user);
        setName(profileRes.user.name || '');
        setAvatar(profileRes.user.avatar || '');
        setGender(profileRes.user.gender || '');
        setAddress(profileRes.user.address || '');
      }
      if (subscriptionRes.success) {
        setSubscription(subscriptionRes.subscription);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    setSaving(true);
    try {
      const response = await userAPI.updateProfile({
        name: name.trim(),
        avatar: avatar.trim() || null,
        gender: gender || null,
        address: address.trim() || null,
      });
      if (response.success) {
        setProfile(response.user);
        setEditing(false);
        Alert.alert('Success', 'Profile updated');
      } else {
        Alert.alert('Error', 'Failed to update profile');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarPress = () => {
    Alert.alert(
      'Avatar',
      'Enter avatar URL',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'OK',
          onPress: () => {
            Alert.prompt(
              'Avatar URL',
              'Enter the URL of your avatar image',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'OK',
                  onPress: (url) => {
                    if (url && url.trim()) {
                      setAvatar(url.trim());
                    }
                  },
                },
              ],
              'plain-text',
              avatar
            );
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    console.log('handleLogout called');
    
    // Use window.confirm for web, Alert.alert for native
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to logout?');
      if (confirmed) {
        console.log('Logout confirmed by user, starting logout process...');
        logout().then(() => {
          console.log('logout() completed successfully');
        }).catch((error) => {
          console.error('Error during logout:', error);
          window.alert('Failed to logout. Please try again.');
        });
      } else {
        console.log('Logout cancelled by user');
      }
    } else {
      // Native platforms
      Alert.alert(
        'Logout',
        'Are you sure you want to logout?',
        [
          { 
            text: 'Cancel', 
            style: 'cancel',
            onPress: () => {
              console.log('Logout cancelled by user');
            }
          },
          {
            text: 'Logout',
            style: 'destructive',
            onPress: () => {
              console.log('Logout confirmed by user, starting logout process...');
              logout().then(() => {
                console.log('logout() completed successfully');
              }).catch((error) => {
                console.error('Error during logout:', error);
                Alert.alert('Error', 'Failed to logout. Please try again.');
              });
            },
          },
        ],
        { cancelable: true }
      );
    }
  };

  const getSubscriptionStatusText = () => {
    if (!subscription) return 'Loading...';
    
    if (subscription.status === 'trial') {
      return 'Free Trial (7 days)';
    }
    if (subscription.status === 'active' || subscription.status === 'group_active') {
      return subscription.planType 
        ? `Active - ₹${subscription.planType === 'monthly_10' ? '10' : '15'}/month`
        : 'Active';
    }
    return 'Expired';
  };

  const getSubscriptionStatusColor = () => {
    if (!subscription) return '#999';
    if (subscription.status === 'active' || subscription.status === 'group_active' || subscription.status === 'trial') {
      return '#4caf50';
    }
    return '#f44336';
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.profileHeader}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={editing ? handleAvatarPress : undefined}
            disabled={!editing}
            activeOpacity={editing ? 0.7 : 1}
          >
            {avatar && avatar.trim() ? (
              <Image
                source={{ uri: avatar }}
                style={styles.avatarImage}
                onError={() => setAvatar('')}
              />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {getInitials(profile?.name || 'User')}
                </Text>
              </View>
            )}
            {editing && (
              <View style={styles.avatarEditBadge}>
                <Icon name="camera" size={16} color={colors.background} />
              </View>
            )}
          </TouchableOpacity>
          {!editing && <Text style={styles.profileName}>{profile?.name || 'User'}</Text>}
          {profile?.phone && (
            <View style={styles.infoRow}>
              <Icon name="phone" size={16} color={colors.textSecondary} />
              <Text style={styles.profileInfo}>{profile.phone}</Text>
            </View>
          )}
          {profile?.email && (
            <View style={styles.infoRow}>
              <Icon name="email" size={16} color={colors.textSecondary} />
              <Text style={styles.profileInfo}>{profile.email}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subscription</Text>
          <View style={styles.subscriptionCard}>
            <View style={styles.subscriptionHeader}>
              <Text style={styles.subscriptionLabel}>Status</Text>
              <View style={[styles.statusBadge, { backgroundColor: getSubscriptionStatusColor() + '20' }]}>
                <Text style={[styles.statusText, { color: getSubscriptionStatusColor() }]}>
                  {getSubscriptionStatusText()}
                </Text>
              </View>
            </View>
            {subscription?.endDate && (
              <Text style={styles.subscriptionDate}>
                {subscription.status === 'active' || subscription.status === 'group_active'
                  ? `Expires: ${new Date(subscription.endDate).toLocaleDateString()}`
                  : `Expired: ${new Date(subscription.endDate).toLocaleDateString()}`}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Profile</Text>
            <TouchableOpacity
              onPress={() => {
                if (editing) {
                  // Cancel editing - reset to original values
                  setName(profile?.name || '');
                  setAvatar(profile?.avatar || '');
                  setGender(profile?.gender || '');
                  setAddress(profile?.address || '');
                }
                setEditing(!editing);
              }}
              style={styles.editButton}
            >
              <Icon
                name={editing ? 'close' : 'pencil'}
                size={20}
                color={colors.primary}
              />
              <Text style={styles.editButtonText}>
                {editing ? 'Cancel' : 'Edit'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            maxLength={100}
            editable={editing}
            placeholder="Enter your name"
            placeholderTextColor={colors.textTertiary}
          />

          <Text style={styles.label}>Gender</Text>
          {editing ? (
            <View style={styles.genderContainer}>
              {['male', 'female', 'other', 'prefer_not_to_say'].map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[
                    styles.genderOption,
                    gender === g && styles.genderOptionSelected,
                  ]}
                  onPress={() => setGender(g)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.genderOptionText,
                      gender === g && styles.genderOptionTextSelected,
                    ]}
                  >
                    {g.charAt(0).toUpperCase() + g.slice(1).replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={gender ? gender.charAt(0).toUpperCase() + gender.slice(1).replace('_', ' ') : 'Not set'}
              editable={false}
            />
          )}

          <Text style={styles.label}>Address</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={address}
            onChangeText={setAddress}
            maxLength={500}
            editable={editing}
            placeholder="Enter your address"
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={3}
          />

          {editing && (
            <TouchableOpacity
              style={[styles.button, saving && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={() => {
              console.log('Logout button pressed');
              handleLogout();
            }}
            activeOpacity={0.7}
          >
            <Icon name="logout" size={20} color="#f44336" />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
  },
  profileHeader: {
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  avatarContainer: {
    marginBottom: spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.round,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.round,
  },
  avatarText: {
    ...typography.h1,
    fontWeight: '700',
    color: colors.background,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: borderRadius.round,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  editButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  genderContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  genderOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.inputBackground,
  },
  genderOptionSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  genderOptionText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  genderOptionTextSelected: {
    color: colors.primaryDark,
    fontWeight: '600',
  },
  inputDisabled: {
    backgroundColor: colors.backgroundSecondary,
    color: colors.textSecondary,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  profileName: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  profileInfo: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  subscriptionCard: {
    padding: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.sm,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  subscriptionLabel: {
    ...typography.body,
    color: colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
  },
  statusText: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  subscriptionDate: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  label: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    ...typography.body,
    backgroundColor: colors.inputBackground,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  button: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    ...typography.button,
    color: colors.background,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.error,
    gap: spacing.sm,
  },
  logoutButtonText: {
    ...typography.button,
    color: colors.error,
  },
});

