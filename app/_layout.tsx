import React, { useEffect } from 'react';
import { Slot, Stack } from 'expo-router';
import { useThemeStore } from '@/store/theme-store';
import { useColorScheme, Platform, StyleSheet } from 'react-native';
import { useAuthStore } from '@/store/auth-store';
import { scaleFontSize } from '@/utils/responsive';
import colors from '@/constants/colors';

export default function RootLayout() {
  const { darkMode } = useThemeStore();
  const systemColorScheme = useColorScheme();
  const { isInitialized } = useAuthStore();
  
  // Wait for auth store to be initialized before rendering
  if (!isInitialized) {
    return null;
  }
  
  const theme = darkMode ? colors.dark : colors.light;
  
  // Create platform-specific header styles
  const headerStyle = Platform.select({
    ios: {
      backgroundColor: theme.background,
      shadowOpacity: darkMode ? 0 : 0.1,
      shadowOffset: { width: 0, height: 1 },
      shadowRadius: 3,
    },
    android: {
      backgroundColor: theme.background,
    },
    default: {
      backgroundColor: theme.background,
    }
  });
  
  return (
    <Stack
      screenOptions={{
        headerStyle: headerStyle,
        headerTintColor: theme.text,
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: scaleFontSize(Platform.OS === 'android' ? 18 : 20),
        },
        contentStyle: {
          backgroundColor: theme.background,
        },
        // Use headerBackVisible instead of headerBackTitleVisible
        headerBackVisible: true,
        headerTitleAlign: Platform.OS === 'android' ? 'center' : 'left',
        // Add proper shadow for iOS
        headerShadowVisible: !darkMode,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="(tabs)"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="profile/edit"
        options={{
          title: 'Edit Profile',
          // Use headerBackTitle for iOS
          ...(Platform.OS === 'ios' && { headerBackTitle: 'Back' }),
        }}
      />
    </Stack>
  );
}