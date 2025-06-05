import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { useColorScheme, StatusBar, Platform } from 'react-native';
import { useThemeStore } from '@/store/theme-store';
import { useLanguageStore } from '@/store/language-store';
import colors from '@/constants/colors';

export default function Layout() {
  const colorScheme = useColorScheme();
  const { darkMode, setDarkMode } = useThemeStore();
  const { language, setLanguage } = useLanguageStore();
  
  // Set default theme to light and language to Russian
  useEffect(() => {
    setDarkMode(false); // Default to light theme
    setLanguage('ru'); // Default to Russian
  }, []);
  
  const theme = darkMode ? colors.dark : colors.light;
  
  return (
    <>
      <StatusBar 
        barStyle={darkMode ? "light-content" : "dark-content"} 
        backgroundColor={theme.background}
        hidden={false}
      />
      <Stack
        screenOptions={{
          headerShown: false, // Hide all headers by default
          contentStyle: {
            backgroundColor: theme.background,
          },
        }}
      />
    </>
  );
}