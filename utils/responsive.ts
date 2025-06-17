import { Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

// Device size categories
export const isSmallDevice = width < 375;
export const isLargeDevice = width >= 414; // iPhone 16 Pro Max and similar
export const isTablet = width >= 768;

// Base dimensions for scaling
const baseWidth = 375; // iPhone SE/8 width
const baseHeight = 667; // iPhone SE/8 height

// Scale font size based on device width
export const scaleFontSize = (size: number): number => {
  const scale = width / baseWidth;
  const newSize = size * scale;
  
  // Limit scaling to prevent too large or too small fonts
  if (Platform.OS === 'ios') {
    return Math.max(12, Math.min(newSize, size * 1.3));
  } else {
    return Math.max(12, Math.min(newSize, size * 1.2));
  }
};

// Scale spacing based on device width
export const scaleSpacing = (size: number): number => {
  const scale = width / baseWidth;
  const newSize = size * scale;
  
  // Limit scaling for spacing
  return Math.max(4, Math.min(newSize, size * 1.4));
};

// Get container padding based on device size
export const getContainerPadding = (): number => {
  if (isTablet) {
    return scaleSpacing(24);
  } else if (isLargeDevice) {
    return scaleSpacing(20);
  } else if (isSmallDevice) {
    return scaleSpacing(12);
  } else {
    return scaleSpacing(16);
  }
};

// Get header height based on device
export const getHeaderHeight = (): number => {
  if (Platform.OS === 'ios') {
    if (height >= 812) { // iPhone X and newer
      return 88;
    } else {
      return 64;
    }
  } else {
    return 56;
  }
};

// Check if device has notch/dynamic island
export const hasNotch = (): boolean => {
  if (Platform.OS === 'ios') {
    return height >= 812;
  }
  return false;
};

// Get safe area insets for manual calculation
export const getSafeAreaInsets = () => {
  if (Platform.OS === 'ios' && hasNotch()) {
    return {
      top: 44,
      bottom: 34,
      left: 0,
      right: 0,
    };
  }
  
  return {
    top: Platform.OS === 'android' ? 24 : 20,
    bottom: 0,
    left: 0,
    right: 0,
  };
};