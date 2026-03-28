import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform, 
  TouchableWithoutFeedback, 
  Keyboard,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { useProductStore } from '@/store/product-store';
import { useLanguageStore } from '@/store/language-store';
import { useThemeStore } from '@/store/theme-store';
import colors from '@/constants/colors';

export default function EditProductScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { products, updateProduct, deleteProduct } = useProductStore();
  const { language } = useLanguageStore();
  const { darkMode } = useThemeStore();
  const theme = darkMode ? colors.dark : colors.light;
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [sku, setSku] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [productLoaded, setProductLoaded] = useState(false);
  
  useEffect(() => {
    if (id) {
      const product = products.find(p => p.id === id);
      if (product) {
        setName(product.name);
        setDescription(product.description || '');
        setPrice(product.price.toString());
        setSku(product.sku || '');
        setProductLoaded(true);
      } else {
        Alert.alert(
          language === 'en' ? 'Error' : 'Ошибка',
          language === 'en' ? 'Product not found' : 'Товар не найден',
          [
            { 
              text: 'OK', 
              onPress: () => router.back() 
            }
          ]
        );
      }
    }
  }, [id, products, language, router]);
  
  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!name.trim()) {
      newErrors.name = language === 'en' ? 'Product name is required' : 'Название товара обязательно';
    }
    
    if (!price.trim()) {
      newErrors.price = language === 'en' ? 'Price is required' : 'Цена обязательна';
    } else {
      const numPrice = parseFloat(price.replace(',', '.'));
      if (isNaN(numPrice) || numPrice <= 0) {
        newErrors.price = language === 'en' ? 'Please enter a valid price' : 'Пожалуйста, введите корректную цену';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = () => {
    if (!validate() || !id) return;
    
    setIsLoading(true);
    
    try {
      // Update product
      updateProduct(id, {
        name,
        description: description || undefined,
        price: parseFloat(price.replace(',', '.')),
        sku: sku || undefined
      });
      
      // Show success message
      Alert.alert(
        language === 'en' ? 'Success' : 'Успех',
        language === 'en' ? 'Product updated successfully' : 'Товар успешно обновлен',
        [
          { 
            text: 'OK', 
            onPress: () => router.back() 
          }
        ]
      );
    } catch (error) {
      console.error('Error updating product:', error);
      Alert.alert(
        language === 'en' ? 'Error' : 'Ошибка',
        language === 'en' ? 'Failed to update product' : 'Не удалось обновить товар'
      );
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDelete = () => {
    if (!id) return;
    
    Alert.alert(
      language === 'en' ? 'Delete Product' : 'Удалить товар',
      language === 'en' ? 'Are you sure you want to delete this product?' : 'Вы уверены, что хотите удалить этот товар?',
      [
        { 
          text: language === 'en' ? 'Cancel' : 'Отмена', 
          style: 'cancel' 
        },
        { 
          text: language === 'en' ? 'Delete' : 'Удалить', 
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              deleteProduct(id);
              router.back();
            } catch (error) {
              console.error('Error deleting product:', error);
              Alert.alert(
                language === 'en' ? 'Error' : 'Ошибка',
                language === 'en' ? 'Failed to delete product' : 'Не удалось удалить товар'
              );
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };
  
  if (!productLoaded) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
          >
            <Text style={[styles.title, { color: theme.text }]}>
              {language === 'en' ? 'Edit Product' : 'Редактировать товар'}
            </Text>
            
            <View style={[styles.formContainer, { backgroundColor: theme.card }]}>
              <Input
                label={language === 'en' ? 'Product Name' : 'Название товара'}
                placeholder={language === 'en' ? 'Enter product name' : 'Введите название товара'}
                value={name}
                onChangeText={setName}
                error={errors.name}
                darkMode={darkMode}
              />
              
              <Input
                label={language === 'en' ? 'Description (optional)' : 'Описание (необязательно)'}
                placeholder={language === 'en' ? 'Enter product description' : 'Введите описание товара'}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                style={styles.textArea}
                darkMode={darkMode}
              />
              
              <Input
                label={language === 'en' ? 'Price (RUB)' : 'Цена (руб.)'}
                placeholder={language === 'en' ? 'Enter price' : 'Введите цену'}
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
                error={errors.price}
                darkMode={darkMode}
              />
              
              <Input
                label={language === 'en' ? 'SKU / Article (optional)' : 'Артикул (необязательно)'}
                placeholder={language === 'en' ? 'Enter SKU or article number' : 'Введите артикул'}
                value={sku}
                onChangeText={setSku}
                darkMode={darkMode}
              />
              
              <View style={styles.buttonContainer}>
                <Button
                  title={language === 'en' ? 'Save Changes' : 'Сохранить изменения'}
                  onPress={handleSubmit}
                  loading={isLoading}
                  style={styles.submitButton}
                />
                
                <Button
                  title={language === 'en' ? 'Delete Product' : 'Удалить товар'}
                  variant="danger"
                  onPress={handleDelete}
                  loading={isDeleting}
                  style={styles.deleteButton}
                />
                
                <Button
                  title={language === 'en' ? 'Cancel' : 'Отмена'}
                  variant="outline"
                  onPress={() => router.back()}
                  style={styles.cancelButton}
                />
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  formContainer: {
    borderRadius: 12,
    padding: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    marginTop: 16,
  },
  submitButton: {
    marginBottom: 12,
  },
  deleteButton: {
    marginBottom: 12,
  },
  cancelButton: {
  },
});