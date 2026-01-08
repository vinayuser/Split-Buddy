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
import { Card, Surface, Divider } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { userAPI, subscriptionAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, typography, borderRadius } from '../../theme/colors';
import { getInitials } from '../../utils/helpers';
import { showImagePickerOptions } from '../../utils/imageUpload';

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
  const [uploadingImage, setUploadingImage] = useState(false);

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

  const handleAvatarPress = async () => {
    console.log('Avatar pressed, editing mode:', editing);
    
    setUploadingImage(true);
    try {
      console.log('Opening image picker...');
      const imageUri = await showImagePickerOptions();
      console.log('Image picker result:', imageUri ? `Image selected (${imageUri.length} chars)` : 'Cancelled');
      
      if (imageUri) {
        console.log('Setting avatar...');
        setAvatar(imageUri);
        
        // If not in edit mode, enable it to show the change
        if (!editing) {
          setEditing(true);
        }
        
        // Auto-save the image
        console.log('Saving image to backend...');
        try {
          await handleSaveImage(imageUri);
          Alert.alert('Success', 'Profile photo updated successfully!');
        } catch (saveError) {
          console.error('Error saving image:', saveError);
          const errorMessage = saveError.response?.data?.message || saveError.message || 'Unknown error';
          Alert.alert(
            'Upload Error',
            `Image selected but failed to save: ${errorMessage}. Please try saving again or check your connection.`,
            [
              { text: 'OK' },
              {
                text: 'Retry',
                onPress: async () => {
                  try {
                    await handleSaveImage(imageUri);
                    Alert.alert('Success', 'Profile photo updated successfully!');
                  } catch (retryError) {
                    const retryErrorMessage = retryError.response?.data?.message || retryError.message || 'Unknown error';
                    Alert.alert('Error', `Failed to save image: ${retryErrorMessage}`);
                  }
                },
              },
            ]
          );
        }
      } else {
        console.log('Image selection cancelled');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      const errorMessage = error.message || 'Unknown error';
      Alert.alert('Error', `Failed to pick image: ${errorMessage}`);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveImage = async (imageUri) => {
    try {
      console.log('Saving image to backend, length:', imageUri?.length);
      const response = await userAPI.updateProfile({
        avatar: imageUri,
      });
      if (response.success) {
        console.log('Image saved successfully');
        setProfile(response.user);
        // Update avatar in state to reflect the saved value
        setAvatar(response.user.avatar || imageUri);
      } else {
        console.error('Failed to save image:', response.message);
        throw new Error(response.message || 'Failed to save image');
      }
    } catch (error) {
      console.error('Error saving image:', error);
      throw error; // Re-throw so caller can handle it
    }
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
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Profile Header Card */}
      <Card style={styles.profileHeaderCard} mode="elevated">
        <Card.Content style={styles.profileHeaderContent}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={handleAvatarPress}
            disabled={uploadingImage}
            activeOpacity={0.7}
          >
            {uploadingImage ? (
              <View style={styles.avatar}>
                <ActivityIndicator size="large" color={colors.background} />
              </View>
            ) : avatar && avatar.trim() ? (
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
            {!uploadingImage && (
              <View style={styles.avatarEditBadge}>
                <Icon name="camera" size={18} color={colors.background} />
              </View>
            )}
          </TouchableOpacity>
          
          <View style={styles.profileInfoContainer}>
            <Text style={styles.profileName}>{profile?.name || 'User'}</Text>
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
            {profile?.gender && (
              <View style={styles.infoRow}>
                <Icon name="gender-male-female" size={16} color={colors.textSecondary} />
                <Text style={styles.profileInfo}>
                  {profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1).replace('_', ' ')}
                </Text>
              </View>
            )}
            {profile?.address && (
              <View style={styles.infoRow}>
                <Icon name="map-marker" size={16} color={colors.textSecondary} />
                <Text style={styles.profileInfo} numberOfLines={1}>
                  {profile.address}
                </Text>
              </View>
            )}
            {profile?.createdAt && (
              <View style={styles.infoRow}>
                <Icon name="calendar" size={16} color={colors.textSecondary} />
                <Text style={styles.profileInfo}>
                  Member since {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </Text>
              </View>
            )}
          </View>
        </Card.Content>
      </Card>

        {/* Subscription Card */}
        <Card style={styles.sectionCard} mode="elevated">
          <Card.Content>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Icon name="crown" size={20} color={colors.primary} />
                <Text style={styles.sectionTitle}>Subscription</Text>
              </View>
            </View>
            <View style={styles.subscriptionCard}>
            <View style={styles.subscriptionHeader}>
              <Text style={styles.subscriptionLabel}>Status</Text>
              <View style={[styles.statusBadge, { backgroundColor: getSubscriptionStatusColor() + '20' }]}>
                <Text style={[styles.statusText, { color: getSubscriptionStatusColor() }]}>
                  {getSubscriptionStatusText()}
                </Text>
              </View>
            </View>
            {subscription?.status === 'trial' && subscription?.daysRemaining !== undefined && (
              <Text style={styles.subscriptionDate}>
                {subscription.daysRemaining} {subscription.daysRemaining === 1 ? 'day' : 'days'} remaining in trial
              </Text>
            )}
            {subscription?.endDate && (subscription.status === 'active' || subscription.status === 'group_active') && (
              <Text style={styles.subscriptionDate}>
                Expires: {new Date(subscription.endDate).toLocaleDateString()}
              </Text>
            )}
            {subscription?.status === 'expired' && (
              <Text style={[styles.subscriptionDate, { color: colors.balanceNegative }]}>
                Trial expired. Subscribe to continue.
              </Text>
            )}
            <TouchableOpacity
              style={styles.subscriptionButton}
              onPress={() => navigation.navigate('Subscription')}
              activeOpacity={0.7}
            >
              <Text style={styles.subscriptionButtonText}>
                {subscription?.status === 'active' ? 'Manage Subscription' : 'View Plans'}
              </Text>
              <Icon name="chevron-right" size={20} color={colors.primary} />
            </TouchableOpacity>
            </View>
          </Card.Content>
        </Card>

        {/* Profile Details Card */}
        <Card style={styles.sectionCard} mode="elevated">
          <Card.Content>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Icon name="account" size={20} color={colors.primary} />
                <Text style={styles.sectionTitle}>Profile Details</Text>
              </View>
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

          <Divider style={styles.divider} />

          {editing && (
            <View style={styles.editTip}>
              <Icon name="information" size={16} color={colors.primary} />
              <Text style={styles.editTipText}>
                Tap your profile photo above to upload a new picture from camera or gallery
              </Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <View style={styles.labelContainer}>
              <Icon name="account-circle" size={18} color={colors.textSecondary} />
              <Text style={styles.label}>Name *</Text>
            </View>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            maxLength={100}
            editable={editing}
            placeholder="Enter your name"
            placeholderTextColor={colors.textTertiary}
          />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelContainer}>
              <Icon name="gender-male-female" size={18} color={colors.textSecondary} />
              <Text style={styles.label}>Gender</Text>
            </View>
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
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelContainer}>
              <Icon name="map-marker" size={18} color={colors.textSecondary} />
              <Text style={styles.label}>Address</Text>
            </View>
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
          </View>

          {editing && (
            <>
              <Divider style={styles.divider} />
              <TouchableOpacity
                style={[styles.button, saving && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <>
                    <Icon name="check-circle" size={20} color={colors.background} />
                    <Text style={styles.buttonText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
          </Card.Content>
        </Card>

        {/* Menu Items Card */}
        <Card style={styles.sectionCard} mode="elevated">
          <Card.Content>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate('FAQ')}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <Surface style={styles.menuItemIcon}>
                  <Icon name="help-circle" size={20} color={colors.primary} />
                </Surface>
                <Text style={styles.menuItemText}>FAQ & Help</Text>
              </View>
              <Icon name="chevron-right" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          </Card.Content>
        </Card>

        {/* Logout Card */}
        <Card style={styles.sectionCard} mode="elevated">
          <Card.Content>
            <TouchableOpacity 
              style={styles.logoutButton} 
              onPress={() => {
                console.log('Logout button pressed');
                handleLogout();
              }}
              activeOpacity={0.7}
            >
              <Icon name="logout" size={20} color={colors.error} />
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
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
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  profileHeaderCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  profileHeaderContent: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  avatarContainer: {
    marginBottom: spacing.md,
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.round,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.round,
    borderWidth: 4,
    borderColor: colors.background,
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
    width: 36,
    height: 36,
    borderRadius: borderRadius.round,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  profileInfoContainer: {
    alignItems: 'center',
    width: '100%',
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
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  profileInfo: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  sectionCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.h3,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  divider: {
    marginVertical: spacing.md,
    backgroundColor: colors.divider,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
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
    marginTop: spacing.xs,
  },
  subscriptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  subscriptionButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.primary,
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
    borderRadius: borderRadius.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
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
    borderRadius: borderRadius.md,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: colors.error,
    gap: spacing.sm,
  },
  logoutButtonText: {
    ...typography.button,
    fontWeight: '600',
    color: colors.error,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.round,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  menuItemText: {
    ...typography.body,
    fontWeight: '500',
    color: colors.textPrimary,
    flex: 1,
  },
  editTip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  editTipText: {
    ...typography.bodySmall,
    color: colors.primaryDark,
    flex: 1,
  },
});

