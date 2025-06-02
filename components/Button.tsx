import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
  View,
  Platform
} from 'react-native';
import colors from '@/constants/colors';
import { useThemeStore } from '@/store/theme-store';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

/**
 * Button component with various styles and states
 */
export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
  ...props
}) => {
  const { darkMode } = useThemeStore();
  const theme = darkMode ? colors.dark : colors.light;

  // Get size configurations
  const getSizeConfig = () => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: 8,
          paddingHorizontal: 12,
          minHeight: 36,
          fontSize: 14,
        };
      case 'large':
        return {
          paddingVertical: 16,
          paddingHorizontal: 24,
          minHeight: 52,
          fontSize: 18,
        };
      case 'medium':
      default:
        return {
          paddingVertical: 12,
          paddingHorizontal: 16,
          minHeight: 44,
          fontSize: 16,
        };
    }
  };

  const sizeConfig = getSizeConfig();

  // Get button style based on variant and disabled state
  const getButtonStyle = () => {
    const baseStyle: ViewStyle = {
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: sizeConfig.paddingVertical,
      paddingHorizontal: sizeConfig.paddingHorizontal,
      minHeight: sizeConfig.minHeight,
    };

    let variantStyle: ViewStyle = {};
    
    if (disabled) {
      switch (variant) {
        case 'primary':
          variantStyle = {
            backgroundColor: theme.inactive,
          };
          break;
        case 'secondary':
          variantStyle = {
            backgroundColor: theme.inactive,
          };
          break;
        case 'outline':
          variantStyle = {
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderColor: theme.inactive,
          };
          break;
        case 'danger':
          variantStyle = {
            backgroundColor: theme.inactive,
          };
          break;
      }
    } else {
      switch (variant) {
        case 'primary':
          variantStyle = {
            backgroundColor: theme.primary,
          };
          break;
        case 'secondary':
          variantStyle = {
            backgroundColor: theme.secondary,
          };
          break;
        case 'outline':
          variantStyle = {
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderColor: theme.primary,
          };
          break;
        case 'danger':
          variantStyle = {
            backgroundColor: theme.notification,
          };
          break;
      }
    }

    return [baseStyle, variantStyle, style];
  };

  // Get text style based on variant and disabled state
  const getTextStyle = () => {
    const baseStyle: TextStyle = {
      fontWeight: '600',
      textAlign: 'center',
      fontSize: sizeConfig.fontSize,
    };

    let variantTextStyle: TextStyle = {};
    
    if (disabled) {
      variantTextStyle = {
        color: theme.placeholder,
      };
    } else {
      switch (variant) {
        case 'primary':
        case 'secondary':
        case 'danger':
          variantTextStyle = {
            color: 'white',
          };
          break;
        case 'outline':
          variantTextStyle = {
            color: theme.primary,
          };
          break;
      }
    }

    return [baseStyle, variantTextStyle, textStyle];
  };

  // Fix for web - avoid using hitSlop which causes issues
  const touchableProps = Platform.OS === 'web' 
    ? { ...props } 
    : { ...props, hitSlop: { top: 10, right: 10, bottom: 10, left: 10 } };

  // Fix for web - avoid using transform styles which cause issues
  const webSafeStyles = Platform.OS === 'web' 
    ? { ...StyleSheet.flatten(getButtonStyle()) } 
    : getButtonStyle();

  return (
    <TouchableOpacity
      style={webSafeStyles}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...touchableProps}
    >
      {loading ? (
        <ActivityIndicator 
          color={variant === 'outline' ? theme.primary : 'white'} 
          size={Platform.OS === 'ios' ? 'small' : 20} 
        />
      ) : (
        <View style={styles.buttonContent}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text style={getTextStyle()}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: 8,
  },
});