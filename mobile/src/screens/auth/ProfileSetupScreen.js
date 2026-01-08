import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { Text, TextInput, Button, Card, Surface, Chip } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { userAPI } from '../../services/api';

// Conditionally import ImagePicker (not available on web)
let ImagePicker = null;
try {
  if (Platform.OS !== 'web') {
    ImagePicker = require('expo-image-picker');
  }
} catch (e) {
  console.warn('expo-image-picker not available:', e);
}
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, typography, borderRadius } from '../../theme/colors';
import { getInitials } from '../../utils/helpers';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 375;

export default function ProfileSetupScreen({ navigation, route }) {
  const { user, loadUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState(user?.avatar || null);
  const [avatarUri, setAvatarUri] = useState(user?.avatar || null);
  const [gender, setGender] = useState(user?.gender || '');
  const [address, setAddress] = useState(user?.address || '');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Update form when user data loads
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setAvatar(user.avatar || null);
      setAvatarUri(user.avatar || null);
      setGender(user.gender || '');
      setAddress(user.address || '');
    }
  }, [user]);

  const handleImagePicker = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Available', 'Image picker is not available on web. Please use the mobile app.');
      return;
    }
    
    if (!ImagePicker) {
      Alert.alert('Error', 'Image picker is not available');
      return;
    }
    
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'We need access to your photos to set your profile picture.'
        );
        return;
      }

      // Show options
      Alert.alert(
        'Select Photo',
        'Choose an option',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Camera',
            onPress: async () => {
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker?.MediaTypeOptions?.Images || 'images',
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
              });
              if (!result.canceled && result.assets[0]) {
                setAvatarUri(result.assets[0].uri);
                // For now, we'll use the URI directly. In production, you'd upload to a server
                setAvatar(result.assets[0].uri);
              }
            },
          },
          {
            text: 'Gallery',
            onPress: async () => {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker?.MediaTypeOptions?.Images || 'images',
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
              });
              if (!result.canceled && result.assets[0]) {
                setAvatarUri(result.assets[0].uri);
                // For now, we'll use the URI directly. In production, you'd upload to a server
                setAvatar(result.assets[0].uri);
              }
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to open image picker');
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    if (name.trim().length < 2) {
      Alert.alert('Error', 'Name must be at least 2 characters');
      return;
    }

    setLoading(true);
    try {
      const response = await userAPI.updateProfile({
        name: name.trim(),
        avatar: avatar || null,
        gender: gender || null,
        address: address.trim() || null,
      });

      if (response.success) {
        // Reload user data
        await loadUser();
        // Navigation will be handled by App.js when user state updates
        // No need to navigate manually
      } else {
        Alert.alert('Error', response.message || 'Failed to update profile');
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update profile');
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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoWrapper}>
            <Surface style={styles.logoContainer} elevation={3}>
              <View style={styles.logoGradient}>
                <Icon name="account-edit" size={56} color={colors.background} />
              </View>
            </Surface>
            <View style={styles.profileBadge}>
              <Icon name="star" size={14} color={colors.primary} />
            </View>
          </View>
          <Text variant="headlineSmall" style={styles.title}>Complete Your Profile</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Add your details to personalize your Split Buddy experience
          </Text>
          <Card mode="outlined" style={styles.headerInfoCard}>
            <Card.Content>
              <View style={styles.headerInfoRow}>
                <Icon name="lightbulb-outline" size={20} color={colors.primary} />
                <Text variant="bodySmall" style={styles.headerInfoText}>
                  A complete profile helps friends recognize you and makes expense tracking easier
                </Text>
              </View>
            </Card.Content>
          </Card>
        </View>

        {/* Avatar Section */}
        <Card style={styles.section} mode="elevated">
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Profile Picture</Text>
            <View style={styles.avatarSection}>
              <Surface style={styles.avatarContainer} elevation={2} onTouchEnd={handleImagePicker}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatar}>
                    <Text variant="displaySmall" style={styles.avatarText}>
                      {getInitials(name || 'User')}
                    </Text>
                  </View>
                )}
                <Surface style={styles.avatarEditBadge} elevation={3}>
                  <Icon name="camera" size={20} color={colors.background} />
                </Surface>
              </Surface>
              <Button
                mode="text"
                onPress={handleImagePicker}
                icon="camera-outline"
                style={styles.changePhotoButton}
              >
                Change Photo
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* Form Section */}
        <Card style={styles.section} mode="elevated">
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Personal Information</Text>

            <TextInput
              mode="outlined"
              label="Full Name *"
              placeholder="Enter your full name"
              value={name}
              onChangeText={setName}
              maxLength={100}
              autoCapitalize="words"
              left={<TextInput.Icon icon="account" />}
              style={styles.input}
            />

            <Text variant="bodySmall" style={styles.label}>Gender</Text>
            <View style={styles.genderContainer}>
              {['male', 'female', 'other', 'prefer_not_to_say'].map((g) => (
                <Chip
                  key={g}
                  selected={gender === g}
                  onPress={() => setGender(g)}
                  style={styles.genderChip}
                  selectedColor={gender === g ? colors.primaryDark : colors.textPrimary}
                >
                  {g.charAt(0).toUpperCase() + g.slice(1).replace('_', ' ')}
                </Chip>
              ))}
            </View>

            <TextInput
              mode="outlined"
              label="Address (Optional)"
              placeholder="Enter your address"
              value={address}
              onChangeText={setAddress}
              maxLength={500}
              multiline
              numberOfLines={3}
              left={<TextInput.Icon icon="map-marker" />}
              style={styles.input}
              contentStyle={styles.textArea}
            />
          </Card.Content>
        </Card>

        {/* Info Box */}
        <Card mode="outlined" style={styles.infoCard}>
          <Card.Content>
            <View style={styles.infoBox}>
              <Icon name="information-outline" size={20} color={colors.primary} />
              <Text variant="bodySmall" style={styles.infoText}>
                Your name is required. Other fields are optional and can be updated later from your profile.
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Save Button */}
        <Button
          mode="contained"
          onPress={handleSave}
          disabled={loading || !name.trim()}
          loading={loading}
          icon="check-circle"
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Complete Setup
        </Button>

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
    padding: isSmallScreen ? spacing.md : spacing.lg,
    paddingTop: isSmallScreen ? spacing.xl : spacing.xl * 1.5,
    paddingBottom: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoWrapper: {
    position: 'relative',
    marginBottom: spacing.lg,
    alignSelf: 'center',
  },
  logoContainer: {
    width: isSmallScreen ? 120 : 140,
    height: isSmallScreen ? 120 : 140,
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
  profileBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 32,
    height: 32,
    borderRadius: borderRadius.round,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  headerInfoCard: {
    marginTop: spacing.md,
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  headerInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  headerInfoText: {
    flex: 1,
    color: colors.primaryDark,
    lineHeight: 18,
  },
  title: {
    ...typography.h1,
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.textPrimary,
    marginBottom: spacing.md,
    fontWeight: '600',
  },
  avatarSection: {
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.md,
    width: 120,
    height: 120,
    borderRadius: borderRadius.round,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.round,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.round,
  },
  avatarText: {
    fontWeight: '700',
    color: colors.background,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: borderRadius.round,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.background,
  },
  changePhotoButton: {
    alignSelf: 'center',
  },
  label: {
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  input: {
    marginBottom: spacing.md,
  },
  textArea: {
    minHeight: 100,
    paddingTop: spacing.md,
  },
  genderContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  genderChip: {
    marginRight: spacing.xs,
  },
  infoCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  infoText: {
    flex: 1,
    color: colors.primaryDark,
    lineHeight: 20,
  },
  button: {
    marginBottom: spacing.sm,
  },
  buttonContent: {
    paddingVertical: spacing.xs,
  },
  skipButton: {
    alignItems: 'center',
    padding: spacing.md,
  },
  skipText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});

