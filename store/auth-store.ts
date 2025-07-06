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
  clientSecret?: string;
  commentNumber?: number;
}

interface AuthState {
  isAuthenticated: boolean;
  credentials: Credentials | null;
  isInitialized: boolean;
  setCredentials: (credentials: Credentials) => void;
  updateCredentials: (credentials: Credentials) => void;
  importCredentials: (credentials: Credentials) => void;
  logout: () => void;
}

interface PersistedAuthState {
  isAuthenticated: boolean;
  credentials: Credentials | null;
  isInitialized: boolean;
}

const validateCredentials = (credentials: any): Credentials | null => {
  if (!credentials || typeof credentials !== 'object') return null;
  
  const required = ['readOnlyAccessKey', 'currencyCode', 'currencyAccountNumber', 'clientId', 'currencyAccountGuid'];
  const hasRequired = required.every(field => typeof credentials[field] === 'string' && credentials[field].length > 0);
  
  if (!hasRequired) return null;
  
  return {
    readOnlyAccessKey: credentials.readOnlyAccessKey,
    currencyCode: credentials.currencyCode,
    currencyAccountNumber: credentials.currencyAccountNumber,
    clientId: credentials.clientId,
    currencyAccountGuid: credentials.currencyAccountGuid,
    merchantName: credentials.merchantName || undefined,
    clientSecret: credentials.clientSecret || undefined,
    commentNumber: typeof credentials.commentNumber === 'number' ? credentials.commentNumber : undefined,
  };
};

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
      
      importCredentials: (credentials: Credentials) => {
        set({ 
          credentials: credentials,
          isAuthenticated: true,
          isInitialized: true
        });
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
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persistedState: any, version: number): PersistedAuthState => {
        try {
          // Version 1: Initial version with validation
          if (version === 0 || !version) {
            const validatedCredentials = persistedState?.credentials 
              ? validateCredentials(persistedState.credentials)
              : null;
            
            return {
              isAuthenticated: Boolean(validatedCredentials),
              credentials: validatedCredentials,
              isInitialized: true,
            };
          }
          
          // Future versions can be handled here
          return persistedState as PersistedAuthState;
        } catch (error) {
          console.warn('Auth store migration failed:', error);
          return {
            isAuthenticated: false,
            credentials: null,
            isInitialized: true,
          };
        }
      },
      onRehydrateStorage: () => (state) => {
        // Set isInitialized to true when rehydration is complete
        if (state) {
          state.isInitialized = true;
        }
      },
    }
  )
);