import { Stack } from 'expo-router';
import { useColorScheme, StatusBar, Platform } from 'react-native';
import { useThemeStore } from '@/store/theme-store';
import { useLanguageStore } from '@/store/language-store';
import colors from '@/constants/colors';

export default function Layout() {
  const colorScheme = useColorScheme();
  const { darkMode } = useThemeStore();
  const { language } = useLanguageStore();
  
  const theme = darkMode ? colors.dark : colors.light;
  
  return (
    <>
      <StatusBar 
        barStyle={darkMode ? "light-content" : "dark-content"} 
        backgroundColor={theme.background}
        hidden={false}
        translucent={false}
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