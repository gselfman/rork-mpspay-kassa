import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WithdrawalRequest } from '@/types/api';

interface WithdrawalState {
  requests: WithdrawalRequest[];
  addRequest: (request: WithdrawalRequest) => void;
  updateRequest: (id: string, updates: Partial<WithdrawalRequest>) => void;
  clearRequests: () => void;
}

interface PersistedWithdrawalState {
  requests: WithdrawalRequest[];
}

const validateWithdrawalRequest = (request: any): WithdrawalRequest | null => {
  if (!request || typeof request !== 'object') return null;
  
  if (typeof request.id !== 'string' || request.id.length === 0) return null;
  if (typeof request.amount !== 'number' || request.amount <= 0) return null;
  if (typeof request.status !== 'string' || request.status.length === 0) return null;
  
  return {
    id: request.id,
    amount: request.amount,
    status: request.status,
    createdAt: typeof request.createdAt === 'string' ? request.createdAt : new Date().toISOString(),
    description: typeof request.description === 'string' ? request.description : '',
    bankDetails: typeof request.bankDetails === 'string' ? request.bankDetails : undefined,
  };
};

const validateWithdrawalRequests = (requests: any[]): WithdrawalRequest[] => {
  if (!Array.isArray(requests)) return [];
  
  return requests
    .map(validateWithdrawalRequest)
    .filter((request): request is WithdrawalRequest => request !== null);
};

export const useWithdrawalStore = create<WithdrawalState>()(
  persist(
    (set) => ({
      requests: [],
      addRequest: (request) => 
        set((state) => ({ 
          requests: [request, ...state.requests] 
        })),
      updateRequest: (id, updates) => 
        set((state) => ({
          requests: state.requests.map((request) => 
            request.id === id 
              ? { ...request, ...updates } 
              : request
          )
        })),
      clearRequests: () => set({ requests: [] }),
    }),
    {
      name: 'withdrawal-storage',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persistedState: any, version: number): PersistedWithdrawalState => {
        try {
          // Version 1: Initial version with validation
          if (version === 0 || !version) {
            const validatedRequests = persistedState?.requests 
              ? validateWithdrawalRequests(persistedState.requests)
              : [];
            
            return {
              requests: validatedRequests,
            };
          }
          
          // Future versions can be handled here
          return persistedState as PersistedWithdrawalState;
        } catch (error) {
          console.warn('Withdrawal store migration failed:', error);
          return {
            requests: [],
          };
        }
      },
    }
  )
);