import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions (iPhone 12/13 - most common)
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

// Scale factor based on screen width
const scale = SCREEN_WIDTH / BASE_WIDTH;

// Scale factor based on screen height
const verticalScale = SCREEN_HEIGHT / BASE_HEIGHT;

// Moderate scale - for font sizes and spacing
const moderateScale = (size, factor = 0.5) => {
  return size + (scale - 1) * size * factor;
};

// Responsive width (percentage-based)
export const wp = (percentage) => {
  return (SCREEN_WIDTH * percentage) / 100;
};

// Responsive height (percentage-based)
export const hp = (percentage) => {
  return (SCREEN_HEIGHT * percentage) / 100;
};

// Scale font size
export const scaleFont = (size) => {
  const newSize = moderateScale(size);
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  } else {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  }
};

// Scale size (for icons, avatars, etc.)
export const scaleSize = (size) => {
  return moderateScale(size, 0.3);
};

// Get responsive dimensions
export const getResponsiveDimensions = () => {
  return {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    scale,
    verticalScale,
    isSmallScreen: SCREEN_WIDTH < 375,
    isMediumScreen: SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414,
    isLargeScreen: SCREEN_WIDTH >= 414,
    isTablet: SCREEN_WIDTH >= 768,
  };
};

// Responsive padding
export const responsivePadding = {
  xs: scaleSize(4),
  sm: scaleSize(8),
  md: scaleSize(16),
  lg: scaleSize(24),
  xl: scaleSize(32),
};

// Responsive margin
export const responsiveMargin = {
  xs: scaleSize(4),
  sm: scaleSize(8),
  md: scaleSize(16),
  lg: scaleSize(24),
  xl: scaleSize(32),
};

// Responsive font sizes
export const responsiveFontSizes = {
  h1: scaleFont(24),
  h2: scaleFont(20),
  h3: scaleFont(18),
  body: scaleFont(16),
  bodySmall: scaleFont(14),
  caption: scaleFont(12),
  button: scaleFont(16),
};

export default {
  wp,
  hp,
  scaleFont,
  scaleSize,
  getResponsiveDimensions,
  responsivePadding,
  responsiveMargin,
  responsiveFontSizes,
};

