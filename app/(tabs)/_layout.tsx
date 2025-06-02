import React from 'react';
import { Tabs } from 'expo-router';
import { Platform, Dimensions } from 'react-native';
import { useLanguageStore } from '@/store/language-store';
import { useThemeStore } from '@/store/theme-store';
import colors from '@/constants/colors';
import { Home, CreditCard, History, Settings, DollarSign } from 'lucide-react-native';
import { isSmallDevice, isLargeDevice } from '@/utils/responsive';

export default function TabLayout() {
  const { language } = useLanguageStore();
  const { darkMode } = useThemeStore();
  const theme = darkMode ? colors.dark : colors.light;
  
  // Get tab bar configuration based on device size
  const tabBarConfig = {
    height: isSmallDevice ? 50 : isLargeDevice ? 56 : 54,
    paddingBottom: isSmallDevice ? 4 : isLargeDevice ? 6 : 5,
    iconSize: isSmallDevice ? 18 : isLargeDevice ? 22 : 20,
    fontSize: isSmallDevice ? 10 : isLargeDevice ? 11 : 10
  };
  
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.inactive,
        tabBarStyle: {
          height: tabBarConfig.height,
          paddingBottom: tabBarConfig.paddingBottom,
          paddingTop: 8,
          backgroundColor: theme.background,
          borderTopColor: theme.border,
          // Ensure tab bar is visible on Android
          display: 'flex',
          // Add elevation for Android shadow
          ...(Platform.OS === 'android' && { elevation: 8 }),
          // Add shadow for iOS
          ...(Platform.OS === 'ios' && {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
          }),
          // Ensure proper z-index
          zIndex: 10,
        },
        headerShown: false,
        tabBarLabelStyle: {
          fontSize: tabBarConfig.fontSize,
          fontWeight: '500',
          color: darkMode ? theme.text : undefined,
          marginBottom: Platform.OS === 'android' ? 5 : 0,
        },
        // Ensure tab bar is visible on Android
        tabBarHideOnKeyboard: Platform.OS !== 'android',
        // Improve animation performance
        tabBarAllowFontScaling: false,
        // Improve accessibility
        tabBarAccessibilityLabel: language === 'en' ? 'Navigation Tab Bar' : 'Панель навигации',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: language === 'en' ? 'Home' : 'Главная',
          tabBarIcon: ({ color }) => <Home size={tabBarConfig.iconSize} color={color} />,
        }}
      />
      
      <Tabs.Screen
        name="payment"
        options={{
          title: language === 'en' ? 'Payment' : 'Оплата',
          tabBarIcon: ({ color }) => <CreditCard size={tabBarConfig.iconSize} color={color} />,
        }}
      />
      
      <Tabs.Screen
        name="withdraw"
        options={{
          title: language === 'en' ? 'Withdraw' : 'Вывод',
          tabBarIcon: ({ color }) => <DollarSign size={tabBarConfig.iconSize} color={color} />,
        }}
      />
      
      <Tabs.Screen
        name="history"
        options={{
          title: language === 'en' ? 'History' : 'История',
          tabBarIcon: ({ color }) => <History size={tabBarConfig.iconSize} color={color} />,
        }}
      />
      
      <Tabs.Screen
        name="settings"
        options={{
          title: language === 'en' ? 'Settings' : 'Настройки',
          tabBarIcon: ({ color }) => <Settings size={tabBarConfig.iconSize} color={color} />,
        }}
      />
    </Tabs>
  );
}