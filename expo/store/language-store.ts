import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Language = 'en' | 'ru';

interface LanguageState {
  language: Language;
  setLanguage: (language: Language) => void;
}

interface PersistedLanguageState {
  language: Language;
}

const validateLanguage = (language: any): Language => {
  if (language === 'en' || language === 'ru') {
    return language;
  }
  return 'ru'; // Default fallback
};

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'ru', // Default to Russian
      setLanguage: (language: Language) => set({ language }),
    }),
    {
      name: 'language-storage',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persistedState: any, version: number): PersistedLanguageState => {
        try {
          // Version 1: Initial version with validation
          if (version === 0 || !version) {
            return {
              language: validateLanguage(persistedState?.language),
            };
          }
          
          // Future versions can be handled here
          return persistedState as PersistedLanguageState;
        } catch (error) {
          console.warn('Language store migration failed:', error);
          return {
            language: 'ru',
          };
        }
      },
    }
  )
);