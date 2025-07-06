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

interface PersistedTransactionState {
  transactions: Transaction[];
}

const validateTransaction = (transaction: any): Transaction | null => {
  if (!transaction || typeof transaction !== 'object') return null;
  
  if (typeof transaction.id !== 'string' || transaction.id.length === 0) return null;
  if (typeof transaction.amount !== 'number' || transaction.amount <= 0) return null;
  if (typeof transaction.status !== 'number' && typeof transaction.status !== 'string') return null;
  
  return {
    id: transaction.id,
    amount: transaction.amount,
    status: transaction.status,
    createdAt: typeof transaction.createdAt === 'string' ? transaction.createdAt : new Date().toISOString(),
    paymentUrl: typeof transaction.paymentUrl === 'string' ? transaction.paymentUrl : undefined,
    customerInfo: typeof transaction.customerInfo === 'string' ? transaction.customerInfo : undefined,
    merchantName: typeof transaction.merchantName === 'string' ? transaction.merchantName : undefined,
    tag: typeof transaction.tag === 'string' ? transaction.tag : undefined,
    mpspayId: typeof transaction.mpspayId === 'string' ? transaction.mpspayId : undefined,
    products: Array.isArray(transaction.products) ? transaction.products : undefined,
    commission: typeof transaction.commission === 'number' ? transaction.commission : undefined,
    finishedAt: typeof transaction.finishedAt === 'string' ? transaction.finishedAt : undefined,
  };
};

const validateTransactions = (transactions: any[]): Transaction[] => {
  if (!Array.isArray(transactions)) return [];
  
  return transactions
    .map(validateTransaction)
    .filter((transaction): transaction is Transaction => transaction !== null);
};

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
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persistedState: any, version: number): PersistedTransactionState => {
        try {
          // Version 1: Initial version with validation
          if (version === 0 || !version) {
            const validatedTransactions = persistedState?.transactions 
              ? validateTransactions(persistedState.transactions)
              : [];
            
            return {
              transactions: validatedTransactions,
            };
          }
          
          // Future versions can be handled here
          return persistedState as PersistedTransactionState;
        } catch (error) {
          console.warn('Transaction store migration failed:', error);
          return {
            transactions: [],
          };
        }
      },
    }
  )
);