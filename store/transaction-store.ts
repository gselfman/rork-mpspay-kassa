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
            // Update existing transaction but preserve paymentUrl if it exists and the new one doesn't
            const updatedTransactions = [...state.transactions];
            if (!transaction.paymentUrl && updatedTransactions[existingIndex].paymentUrl) {
              transaction.paymentUrl = updatedTransactions[existingIndex].paymentUrl;
            }
            updatedTransactions[existingIndex] = transaction;
            return { transactions: updatedTransactions };
          } else {
            // Add new transaction
            return { transactions: [transaction, ...state.transactions] };
          }
        });
      },
      
      updateTransaction: (transaction: Transaction) => {
        set((state) => {
          const existingTransaction = state.transactions.find(t => t.id === transaction.id);
          
          // If the transaction exists and has a paymentUrl but the new one doesn't,
          // preserve the existing paymentUrl
          if (existingTransaction && existingTransaction.paymentUrl && !transaction.paymentUrl) {
            transaction.paymentUrl = existingTransaction.paymentUrl;
          }
          
          return {
            transactions: state.transactions.map(t => 
              t.id === transaction.id ? transaction : t
            )
          };
        });
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