import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ThemeState {
  darkMode: boolean;
  setDarkMode: (darkMode: boolean) => void;
  toggleDarkMode: () => void;
  useSystemTheme: boolean;
  setUseSystemTheme: (useSystemTheme: boolean) => void;
}

interface PersistedThemeState {
  darkMode: boolean;
  useSystemTheme: boolean;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      darkMode: false, // Default to light theme
      setDarkMode: (darkMode: boolean) => set({ darkMode }),
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
      useSystemTheme: false, // Default to not using system theme
      setUseSystemTheme: (useSystemTheme: boolean) => set({ useSystemTheme }),
    }),
    {
      name: 'theme-storage',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persistedState: any, version: number): PersistedThemeState => {
        try {
          // Version 1: Initial version with validation
          if (version === 0 || !version) {
            return {
              darkMode: Boolean(persistedState?.darkMode),
              useSystemTheme: Boolean(persistedState?.useSystemTheme),
            };
          }
          
          // Future versions can be handled here
          return persistedState as PersistedThemeState;
        } catch (error) {
          console.warn('Theme store migration failed:', error);
          return {
            darkMode: false,
            useSystemTheme: false,
          };
        }
      },
    }
  )
);