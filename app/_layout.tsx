import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { useThemeStore } from '@/store/theme-store';
import { useLanguageStore } from '@/store/language-store';
import colors from '@/constants/colors';

export default function Layout() {
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
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.background,
        },
        headerTintColor: theme.text,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        contentStyle: {
          backgroundColor: theme.background,
        },
        headerShown: true,
        headerTitle: '',
      }}
    />
  );
}