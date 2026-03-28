import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from './Button';
import colors from '@/constants/colors';
import { scaleFontSize, scaleSpacing } from '@/utils/responsive';

interface EmptyStateProps {
  title: string;
  message: string;
  buttonTitle?: string;
  onButtonPress?: () => void;
  icon?: React.ReactNode;
  darkMode?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  buttonTitle,
  onButtonPress,
  icon,
  darkMode = false
}) => {
  const theme = darkMode ? colors.dark : colors.light;
  
  return (
    <View style={styles.container}>
      {icon && (
        <View style={styles.iconContainer}>
          {icon}
        </View>
      )}
      
      <Text style={[styles.title, { color: theme.text }]}>
        {title}
      </Text>
      
      <Text style={[styles.message, { color: theme.placeholder }]}>
        {message}
      </Text>
      
      {buttonTitle && onButtonPress && (
        <Button
          title={buttonTitle}
          onPress={onButtonPress}
          style={styles.button}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: scaleSpacing(24),
  },
  iconContainer: {
    marginBottom: scaleSpacing(16),
  },
  title: {
    fontSize: scaleFontSize(18),
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: scaleSpacing(8),
  },
  message: {
    fontSize: scaleFontSize(14),
    textAlign: 'center',
    marginBottom: scaleSpacing(24),
  },
  button: {
    minWidth: 200,
  },
});