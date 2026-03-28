import { create } from 'zustand';
import { CartItem, Product } from '@/types/api';

interface CartState {
  items: CartItem[];
  manualAmount: number | null;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setManualAmount: (amount: number | null) => void;
  getTotalAmount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  manualAmount: null,
  
  addItem: (product, quantity = 1) => {
    set((state) => {
      const existingItem = state.items.find(item => item.id === product.id);
      
      if (existingItem) {
        return {
          items: state.items.map(item => 
            item.id === product.id 
              ? { ...item, quantity: item.quantity + quantity } 
              : item
          ),
          manualAmount: null // Clear manual amount when adding products
        };
      }
      
      return {
        items: [...state.items, { ...product, quantity }],
        manualAmount: null // Clear manual amount when adding products
      };
    });
  },
  
  removeItem: (productId) => {
    set((state) => ({
      items: state.items.filter(item => item.id !== productId)
    }));
  },
  
  updateQuantity: (productId, quantity) => {
    set((state) => ({
      items: state.items.map(item => 
        item.id === productId 
          ? { ...item, quantity: Math.max(1, quantity) } 
          : item
      )
    }));
  },
  
  clearCart: () => {
    set({ items: [], manualAmount: null });
  },
  
  setManualAmount: (amount) => {
    set({ 
      manualAmount: amount,
      items: [] // Clear items when setting manual amount
    });
  },
  
  getTotalAmount: () => {
    const { items, manualAmount } = get();
    
    if (manualAmount !== null) {
      return manualAmount;
    }
    
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
  }
}));