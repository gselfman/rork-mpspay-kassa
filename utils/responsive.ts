import { Dimensions, Platform, PixelRatio } from 'react-native';

// Get screen dimensions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions (design is based on these dimensions)
const BASE_WIDTH = 375; // iPhone 8/X width
const BASE_HEIGHT = 812; // iPhone X height

// Check if device is small (iPhone SE, etc.)
export const isSmallDevice = SCREEN_WIDTH < 375 || SCREEN_HEIGHT < 700;

// Check if device is large (iPhone Plus, Pro Max, etc.)
export const isLargeDevice = SCREEN_WIDTH >= 414 || SCREEN_HEIGHT >= 896;

// Check if device is tablet
export const isTablet = SCREEN_WIDTH >= 768 || SCREEN_HEIGHT >= 1024;

/**
 * Scale a size based on screen width
 */
export const scaleWidth = (size: number): number => {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  const newSize = size * scale;
  
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  }
  
  return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 2;
};

/**
 * Scale a size based on screen height
 */
export const scaleHeight = (size: number): number => {
  const scale = SCREEN_HEIGHT / BASE_HEIGHT;
  const newSize = size * scale;
  
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  }
  
  return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 2;
};

/**
 * Scale a size for font
 */
export const scaleFontSize = (size: number): number => {
  const scale = Math.min(SCREEN_WIDTH / BASE_WIDTH, SCREEN_HEIGHT / BASE_HEIGHT);
  const newSize = size * scale;
  
  if (isSmallDevice) {
    return Math.round(PixelRatio.roundToNearestPixel(newSize * 0.9));
  }
  
  if (isLargeDevice) {
    return Math.round(PixelRatio.roundToNearestPixel(newSize * 1.05));
  }
  
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

/**
 * Scale spacing (margin, padding, etc.)
 */
export const scaleSpacing = (size: number): number => {
  const scale = Math.min(SCREEN_WIDTH / BASE_WIDTH, SCREEN_HEIGHT / BASE_HEIGHT);
  const newSize = size * scale;
  
  if (isSmallDevice) {
    return Math.round(PixelRatio.roundToNearestPixel(newSize * 0.9));
  }
  
  if (isLargeDevice) {
    return Math.round(PixelRatio.roundToNearestPixel(newSize * 1.1));
  }
  
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

/**
 * Get container padding based on device size
 */
export const getContainerPadding = (): number => {
  if (isTablet) {
    return 32;
  }
  
  if (isLargeDevice) {
    return 24;
  }
  
  if (isSmallDevice) {
    return 16;
  }
  
  return 20;
};

/**
 * Get tab bar configuration based on device size
 */
export const getTabBarConfig = () => {
  if (isTablet) {
    return {
      height: 60,
      paddingBottom: 8,
      iconSize: 24,
      fontSize: 12
    };
  }
  
  if (isLargeDevice) {
    return {
      height: 56,
      paddingBottom: 6,
      iconSize: 22,
      fontSize: 11
    };
  }
  
  if (isSmallDevice) {
    return {
      height: 50,
      paddingBottom: 4,
      iconSize: 18,
      fontSize: 10
    };
  }
  
  // Default for medium devices
  return {
    height: 54,
    paddingBottom: 5,
    iconSize: 20,
    fontSize: 10
  };
};

/**
 * Ensure touchable elements are at least 44x44 points (iOS HIG)
 */
export const touchableSize = (size: number): number => {
  return Math.max(size, Platform.OS === 'ios' ? 44 : 48);
};