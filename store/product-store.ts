import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product } from '@/types/api';

interface ProductState {
  products: Product[];
  addProduct: (product: Product) => void;
  updateProduct: (id: string, updatedProduct: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  importProducts: (products: Product[]) => void;
}

export const useProductStore = create<ProductState>()(
  persist(
    (set) => ({
      products: [],
      addProduct: (product) => 
        set((state) => ({ 
          products: [...state.products, product] 
        })),
      updateProduct: (id, updatedProduct) => 
        set((state) => ({
          products: state.products.map((product) => 
            product.id === id 
              ? { ...product, ...updatedProduct } 
              : product
          )
        })),
      deleteProduct: (id) => 
        set((state) => ({
          products: state.products.filter((product) => product.id !== id)
        })),
      importProducts: (products) => 
        set({ products }),
    }),
    {
      name: 'product-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);