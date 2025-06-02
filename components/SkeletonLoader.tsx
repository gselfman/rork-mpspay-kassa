import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useThemeStore } from '@/store/theme-store';
import colors from '@/constants/colors';
import { scaleSpacing } from '@/utils/responsive';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  style?: ViewStyle;
  borderRadius?: number;
}

export const SkeletonLoader: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  style,
  borderRadius = 4,
}) => {
  const { darkMode } = useThemeStore();
  const theme = darkMode ? colors.dark : colors.light;
  
  return (
    <View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          backgroundColor: darkMode ? '#2A2A2A' : '#E5E7EB',
        },
        style,
      ]}
    />
  );
};

export const SkeletonCard: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  const { darkMode } = useThemeStore();
  const theme = darkMode ? colors.dark : colors.light;
  
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
        },
        style,
      ]}
    >
      <SkeletonLoader width="60%" height={24} style={{ marginBottom: 16 }} />
      <SkeletonLoader width="100%" height={16} style={{ marginBottom: 8 }} />
      <SkeletonLoader width="80%" height={16} />
    </View>
  );
};

export const SkeletonListItem: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  const { darkMode } = useThemeStore();
  const theme = darkMode ? colors.dark : colors.light;
  
  return (
    <View
      style={[
        styles.listItem,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
        },
        style,
      ]}
    >
      <View style={styles.listItemContent}>
        <SkeletonLoader width={40} height={40} borderRadius={20} style={{ marginRight: 12 }} />
        <View style={{ flex: 1 }}>
          <SkeletonLoader width="70%" height={16} style={{ marginBottom: 8 }} />
          <SkeletonLoader width="40%" height={14} />
        </View>
        <SkeletonLoader width={60} height={24} borderRadius={12} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
  },
  card: {
    borderRadius: 12,
    padding: scaleSpacing(16),
    borderWidth: 1,
  },
  listItem: {
    borderRadius: 8,
    padding: scaleSpacing(12),
    borderWidth: 1,
  },
  listItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});