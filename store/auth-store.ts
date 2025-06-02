import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Credentials {
  readOnlyAccessKey: string;
  currencyCode: string;
  currencyAccountNumber: string;
  clientId: string;
  currencyAccountGuid: string;
  merchantName?: string;
  clientSecret?: string; // Added as optional
}

interface AuthState {
  isAuthenticated: boolean;
  credentials: Credentials | null;
  isInitialized: boolean;
  setCredentials: (credentials: Credentials) => void;
  updateCredentials: (credentials: Credentials) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      credentials: null,
      isInitialized: false,
      
      setCredentials: (credentials: Credentials) => {
        set({ 
          credentials: credentials, 
          isAuthenticated: true,
          isInitialized: true
        });
      },
      
      updateCredentials: (credentials: Credentials) => {
        set({ credentials: credentials });
      },
      
      logout: () => {
        set({ 
          isAuthenticated: false, 
          credentials: null 
        });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        // Set isInitialized to true when rehydration is complete
        if (state) {
          state.isInitialized = true;
        }
      },
    }
  )
);