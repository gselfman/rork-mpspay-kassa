import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Alert,
  Platform
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProductItem } from '@/components/ProductItem';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/Button';
import { useProductStore } from '@/store/product-store';
import { useLanguageStore } from '@/store/language-store';
import colors from '@/constants/colors';
import { Package, Plus, Edit, Trash2 } from 'lucide-react-native';

interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
  image?: string;
}

export default function ProductsScreen() {
  const router = useRouter();
  const products = useProductStore((state) => state.products);
  const removeProduct = useProductStore((state) => state.removeProduct);
  const { language } = useLanguageStore();
  
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  
  const handleAddProduct = () => {
    router.push('/product/create');
  };
  
  const handleEditProduct = (productId: string) => {
    router.push({
      pathname: '/product/edit',
      params: { id: productId }
    });
  };
  
  const handleDeleteProduct = (productId: string) => {
    Alert.alert(
      language === 'en' ? 'Delete Product' : 'Удалить товар',
      language === 'en' 
        ? 'Are you sure you want to delete this product?' 
        : 'Вы уверены, что хотите удалить этот товар?',
      [
        {
          text: language === 'en' ? 'Cancel' : 'Отмена',
          style: 'cancel'
        },
        {
          text: language === 'en' ? 'Delete' : 'Удалить',
          style: 'destructive',
          onPress: () => {
            removeProduct(productId);
            setSelectedProduct(null);
          }
        }
      ]
    );
  };
  
  const renderProductItem = ({ item }: { item: Product }) => {
    const isSelected = selectedProduct === item.id;
    
    return (
      <TouchableOpacity
        onPress={() => setSelectedProduct(isSelected ? null : item.id)}
        activeOpacity={0.7}
      >
        <ProductItem
          product={item}
          selected={isSelected}
          rightContent={
            isSelected ? (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleEditProduct(item.id)}
                >
                  <Edit size={20} color={colors.light.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDeleteProduct(item.id)}
                >
                  <Trash2 size={20} color={colors.light.notification} />
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      </TouchableOpacity>
    );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: language === 'en' ? 'Products' : 'Товары',
          headerShown: true,
          headerRight: () => (
            <TouchableOpacity
              onPress={handleAddProduct}
              style={styles.headerButton}
            >
              <Plus size={24} color={colors.light.primary} />
            </TouchableOpacity>
          ),
        }} 
      />
      
      {products.length > 0 ? (
        <FlatList
          data={products}
          renderItem={renderProductItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <EmptyState
          icon={<Package size={48} color={colors.light.placeholder} />}
          title={language === 'en' ? 'No Products' : 'Нет товаров'}
          message={language === 'en' 
            ? 'You have not added any products yet. Add your first product to start creating payments.' 
            : 'Вы еще не добавили ни одного товара. Добавьте свой первый товар, чтобы начать создавать платежи.'}
          buttonTitle={language === 'en' ? 'Add Product' : 'Добавить товар'}
          onButtonPress={handleAddProduct}
        />
      )}
      
      <View style={styles.buttonContainer}>
        <Button
          title={language === 'en' ? 'Return to Main Menu' : 'Вернуться в главное меню'}
          variant="outline"
          onPress={() => router.push('/(tabs)')}
          style={styles.backButton}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  headerButton: {
    padding: 8,
    marginRight: 8,
  },
  listContent: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: colors.light.background,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  backButton: {
    width: '100%',
  },
});