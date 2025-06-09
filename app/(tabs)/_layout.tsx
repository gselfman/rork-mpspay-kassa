import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import { useColorScheme, Platform } from 'react-native';
import { useThemeStore } from '@/store/theme-store';
import colors from '@/constants/colors';
import { Home, CreditCard, Clock, Settings } from 'lucide-react-native';
import { useLanguageStore } from '@/store/language-store';

export default function TabsLayout() {
  const colorScheme = useColorScheme();
  const { darkMode, setDarkMode } = useThemeStore();
  const { language, setLanguage } = useLanguageStore();
  
  // Set default theme to light and language to Russian
  useEffect(() => {
    setDarkMode(false); // Default to light theme
    setLanguage('ru'); // Default to Russian
  }, [setDarkMode, setLanguage]);
  
  const theme = darkMode ? colors.dark : colors.light;
  
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.inactive,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
          paddingBottom: Platform.OS === 'android' ? 8 : 0, // Add padding for Android
          height: Platform.OS === 'android' ? 70 : 60, // Increase height for Android
          paddingTop: Platform.OS === 'android' ? 8 : 0, // Add top padding for Android
        },
        headerShown: false, // Hide all tab headers
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: language === 'en' ? 'Home' : 'Главная',
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="payment"
        options={{
          title: language === 'en' ? 'Payment' : 'Оплата',
          tabBarIcon: ({ color }) => <CreditCard size={24} color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: language === 'en' ? 'History' : 'История',
          tabBarIcon: ({ color }) => <Clock size={24} color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: language === 'en' ? 'Settings' : 'Настройки',
          tabBarIcon: ({ color }) => <Settings size={24} color={color} />,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}