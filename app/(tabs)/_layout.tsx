import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { useThemeStore } from '@/store/theme-store';
import colors from '@/constants/colors';
import { Home, CreditCard, Clock, Settings } from 'lucide-react-native';
import { useLanguageStore } from '@/store/language-store';

export default function TabsLayout() {
  const colorScheme = useColorScheme();
  const { darkMode, setDarkMode } = useThemeStore();
  const { language, setLanguage } = useLanguageStore();
  
  // Set theme based on device settings
  useEffect(() => {
    if (colorScheme) {
      setDarkMode(colorScheme === 'dark');
    }
  }, [colorScheme]);
  
  // Set default language to Russian
  useEffect(() => {
    setLanguage('ru');
  }, []);
  
  const theme = darkMode ? colors.dark : colors.light;
  
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.inactive,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
        },
        headerStyle: {
          backgroundColor: theme.background,
        },
        headerTintColor: theme.text,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: language === 'en' ? 'Home' : 'Главная',
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
          headerTitle: '',
        }}
      />
      <Tabs.Screen
        name="payment"
        options={{
          title: language === 'en' ? 'Payment' : 'Оплата',
          tabBarIcon: ({ color }) => <CreditCard size={24} color={color} />,
          headerTitle: '',
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: language === 'en' ? 'History' : 'История',
          tabBarIcon: ({ color }) => <Clock size={24} color={color} />,
          headerTitle: '',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: language === 'en' ? 'Settings' : 'Настройки',
          tabBarIcon: ({ color }) => <Settings size={24} color={color} />,
          headerTitle: '',
        }}
      />
    </Tabs>
  );
}