import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, NativeModules } from 'react-native';

// Define language type
export type Language = 'en' | 'ru';

/**
 * Gets the device language
 * Returns 'en' or 'ru' based on device settings
 */
const getDeviceLanguage = (): Language => {
  try {
    // Get device language
    let deviceLanguage: string;
    
    if (Platform.OS === 'ios') {
      deviceLanguage = NativeModules.SettingsManager.settings.AppleLocale || 
                       NativeModules.SettingsManager.settings.AppleLanguages[0] || 
                       'ru';
    } else if (Platform.OS === 'android') {
      deviceLanguage = NativeModules.I18nManager.localeIdentifier || 'ru';
    } else {
      // For web and other platforms
      deviceLanguage = navigator.language || 'ru';
    }
    
    // Check if language starts with 'en'
    if (deviceLanguage.startsWith('en')) {
      return 'en';
    }
    
    // Default to Russian
    return 'ru';
  } catch (error) {
    console.error('Error determining device language:', error);
    return 'ru'; // Default to Russian
  }
};

// Interface for language store
interface LanguageState {
  language: Language;
  setLanguage: (language: Language) => void;
}

/**
 * Language store for managing application language
 * Uses AsyncStorage for persistence
 */
export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: getDeviceLanguage(),
      setLanguage: (language: Language) => set({ language }),
    }),
    {
      name: 'language-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);