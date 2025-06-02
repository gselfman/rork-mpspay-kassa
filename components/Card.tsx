import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import colors from '@/constants/colors';
import { useThemeStore } from '@/store/theme-store';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  style?: any;
}

export const Card: React.FC<CardProps> = ({ children, style, ...props }) => {
  const { darkMode } = useThemeStore();
  const theme = darkMode ? colors.dark : colors.light;
  
  return (
    <View 
      style={[
        styles.card, 
        { 
          backgroundColor: theme.card,
          shadowColor: darkMode ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.1)',
        },
        style
      ]}
      {...props}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
});