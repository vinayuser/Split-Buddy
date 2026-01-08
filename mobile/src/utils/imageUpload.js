import * as ImagePicker from 'expo-image-picker';
import { Platform, Alert } from 'react-native';

/**
 * Request camera and media library permissions
 */
export const requestImagePermissions = async () => {
  if (Platform.OS === 'web') {
    // Web doesn't need permissions for file input
    return true;
  }
  
  try {
    const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (mediaStatus !== 'granted') {
      Alert.alert(
        'Permission Required',
        'We need photo library permission to upload photos. Please enable it in your device settings.',
        [{ text: 'OK' }]
      );
      return false;
    }
    
    // Camera permission is optional - only request if user wants to use camera
    return true;
  } catch (error) {
    console.error('Permission request error:', error);
    return false;
  }
};

/**
 * Pick an image from gallery or camera
 * @param {string} source - 'gallery' or 'camera'
 * @returns {Promise<string|null>} - Base64 image data URI or null
 */
export const pickImage = async (source = 'gallery') => {
  try {
    // For web, use different approach
    if (Platform.OS === 'web') {
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              resolve(event.target.result); // This will be a data URL
            };
            reader.onerror = () => {
              Alert.alert('Error', 'Failed to read image file');
              resolve(null);
            };
            reader.readAsDataURL(file);
          } else {
            resolve(null);
          }
        };
        input.oncancel = () => resolve(null);
        input.click();
      });
    }

    // For native platforms
    const hasPermission = await requestImagePermissions();
    if (!hasPermission) {
      return null;
    }

    let result;
    
    if (source === 'camera') {
      // Request camera permission separately for camera
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraStatus !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Camera permission is required to take photos.',
          [{ text: 'OK' }]
        );
        return null;
      }
      
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });
    }

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      console.log('Image picked:', { uri: asset.uri, hasBase64: !!asset.base64 });
      
      // Return base64 data URI
      if (asset.base64) {
        const dataUri = `data:image/jpeg;base64,${asset.base64}`;
        console.log('Base64 data URI length:', dataUri.length);
        return dataUri;
      }
      // Fallback to URI if base64 not available (shouldn't happen with base64: true)
      console.warn('Base64 not available, using URI:', asset.uri);
      return asset.uri;
    }

    console.log('Image picker cancelled');
    return null;
  } catch (error) {
    console.error('Error picking image:', error);
    Alert.alert('Error', `Failed to pick image: ${error.message || 'Please try again'}`);
    return null;
  }
};

/**
 * Show image picker options (Camera or Gallery)
 * @returns {Promise<string|null>} - Base64 image data URI or null
 */
export const showImagePickerOptions = async () => {
  return new Promise((resolve) => {
    // For web, directly open file picker
    if (Platform.OS === 'web') {
      pickImage('gallery').then(resolve);
      return;
    }
    
    // For native, show alert with options
    Alert.alert(
      'Select Photo',
      'Choose an option',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
        {
          text: 'Camera',
          onPress: async () => {
            const image = await pickImage('camera');
            resolve(image);
          },
        },
        {
          text: 'Gallery',
          onPress: async () => {
            const image = await pickImage('gallery');
            resolve(image);
          },
        },
      ],
      { cancelable: true, onDismiss: () => resolve(null) }
    );
  });
};

