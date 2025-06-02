import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction } from '@/types/api';

interface TransactionState {
  transactions: Transaction[];
  addTransaction: (transaction: Transaction) => void;
  updateTransaction: (transaction: Transaction) => void;
  removeTransaction: (id: string) => void;
  clearTransactions: () => void;
}

export const useTransactionStore = create<TransactionState>()(
  persist(
    (set, get) => ({
      transactions: [],
      
      addTransaction: (transaction: Transaction) => {
        set((state) => {
          // Check if transaction already exists
          const existingIndex = state.transactions.findIndex(t => t.id === transaction.id);
          if (existingIndex >= 0) {
            // Update existing transaction
            const updatedTransactions = [...state.transactions];
            updatedTransactions[existingIndex] = transaction;
            return { transactions: updatedTransactions };
          } else {
            // Add new transaction
            return { transactions: [transaction, ...state.transactions] };
          }
        });
      },
      
      updateTransaction: (transaction: Transaction) => {
        set((state) => ({
          transactions: state.transactions.map(t => 
            t.id === transaction.id ? transaction : t
          )
        }));
      },
      
      removeTransaction: (id: string) => {
        set((state) => ({
          transactions: state.transactions.filter(t => t.id !== id)
        }));
      },
      
      clearTransactions: () => {
        set({ transactions: [] });
      }
    }),
    {
      name: 'transaction-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);