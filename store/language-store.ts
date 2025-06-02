import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, NativeModules } from 'react-native';

// Определение типа для языка
export type Language = 'en' | 'ru';

/**
 * Gets the device language
 * Returns 'en' or 'ru' based on device settings
 */
const getDeviceLanguage = (): Language => {
  try {
    // Получаем язык устройства
    let deviceLanguage: string;
    
    if (Platform.OS === 'ios') {
      deviceLanguage = NativeModules.SettingsManager.settings.AppleLocale || 
                       NativeModules.SettingsManager.settings.AppleLanguages[0] || 
                       'ru';
    } else if (Platform.OS === 'android') {
      deviceLanguage = NativeModules.I18nManager.localeIdentifier || 'ru';
    } else {
      // Для веб и других платформ
      deviceLanguage = navigator.language || 'ru';
    }
    
    // Проверяем, начинается ли язык с 'en'
    if (deviceLanguage.startsWith('en')) {
      return 'en';
    }
    
    // По умолчанию используем русский
    return 'ru';
  } catch (error) {
    console.error('Ошибка при определении языка устройства:', error);
    return 'ru'; // По умолчанию русский
  }
};

// Интерфейс для хранилища языка
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