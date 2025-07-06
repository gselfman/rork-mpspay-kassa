import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product } from '@/types/api';

interface ProductState {
  products: Product[];
  addProduct: (product: Product) => void;
  updateProduct: (id: string, updatedProduct: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  removeProduct: (id: string) => void; // Alias for deleteProduct for compatibility
  importProducts: (products: Product[]) => void;
  bulkImportProducts: (productLines: string[]) => {
    added: number;
    updated: number;
    errors: Array<{ line: number; message: string; originalLine: string }>;
  };
}

interface PersistedProductState {
  products: Product[];
}

const validateProduct = (product: any): Product | null => {
  if (!product || typeof product !== 'object') return null;
  
  if (typeof product.id !== 'string' || product.id.length === 0) return null;
  if (typeof product.name !== 'string' || product.name.length === 0) return null;
  if (typeof product.price !== 'number' || product.price <= 0) return null;
  
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    description: typeof product.description === 'string' ? product.description : '',
  };
};

const validateProducts = (products: any[]): Product[] => {
  if (!Array.isArray(products)) return [];
  
  return products
    .map(validateProduct)
    .filter((product): product is Product => product !== null);
};

export const useProductStore = create<ProductState>()(
  persist(
    (set, get) => ({
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
      removeProduct: (id) => 
        set((state) => ({
          products: state.products.filter((product) => product.id !== id)
        })),
      importProducts: (products) => 
        set({ products }),
      bulkImportProducts: (productLines) => {
        const state = get();
        const errors: Array<{ line: number; message: string; originalLine: string }> = [];
        const validProducts: Product[] = [];
        const existingProductsMap = new Map(state.products.map(p => [p.name.toLowerCase(), p]));
        
        let added = 0;
        let updated = 0;
        
        productLines.forEach((line, index) => {
          const trimmedLine = line.trim();
          if (!trimmedLine) return; // Skip empty lines
          
          const parts = trimmedLine.split(',');
          if (parts.length !== 2) {
            errors.push({
              line: index + 1,
              message: 'Invalid format. Use: Product Name, Price',
              originalLine: trimmedLine
            });
            return;
          }
          
          const name = parts[0].trim();
          const priceStr = parts[1].trim();
          
          // Validate name
          if (!name) {
            errors.push({
              line: index + 1,
              message: 'Product name cannot be empty',
              originalLine: trimmedLine
            });
            return;
          }
          
          // Validate price
          const price = parseFloat(priceStr);
          if (isNaN(price) || price <= 0) {
            errors.push({
              line: index + 1,
              message: 'Price must be a positive number',
              originalLine: trimmedLine
            });
            return;
          }
          
          // Check if product already exists (case-insensitive)
          const existingProduct = existingProductsMap.get(name.toLowerCase());
          if (existingProduct) {
            // Update existing product price
            existingProduct.price = price;
            updated++;
          } else {
            // Add new product
            const newProduct: Product = {
              id: `bulk_${Date.now()}_${index}`,
              name,
              price,
              description: ''
            };
            validProducts.push(newProduct);
            existingProductsMap.set(name.toLowerCase(), newProduct);
            added++;
          }
        });
        
        // Update the store with new and updated products
        const updatedProducts = Array.from(existingProductsMap.values());
        set({ products: updatedProducts });
        
        return { added, updated, errors };
      },
    }),
    {
      name: 'product-storage',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persistedState: any, version: number): PersistedProductState => {
        try {
          // Version 1: Initial version with validation
          if (version === 0 || !version) {
            const validatedProducts = persistedState?.products 
              ? validateProducts(persistedState.products)
              : [];
            
            return {
              products: validatedProducts,
            };
          }
          
          // Future versions can be handled here
          return persistedState as PersistedProductState;
        } catch (error) {
          console.warn('Product store migration failed:', error);
          return {
            products: [],
          };
        }
      },
    }
  )
);