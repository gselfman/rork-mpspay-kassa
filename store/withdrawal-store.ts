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
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);