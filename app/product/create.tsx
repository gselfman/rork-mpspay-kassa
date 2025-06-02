import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform, 
  TouchableWithoutFeedback, 
  Keyboard,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { useProductStore } from '@/store/product-store';
import { useLanguageStore } from '@/store/language-store';
import { useThemeStore } from '@/store/theme-store';
import { Product } from '@/types/api';
import colors from '@/constants/colors';

export default function CreateProductScreen() {
  const router = useRouter();
  const { addProduct } = useProductStore();
  const { language } = useLanguageStore();
  const { darkMode } = useThemeStore();
  const theme = darkMode ? colors.dark : colors.light;
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [sku, setSku] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  
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
    if (!validate()) return;
    
    setIsLoading(true);
    
    try {
      // Create new product
      const newProduct: Product = {
        id: Date.now().toString(),
        name,
        description,
        price: parseFloat(price.replace(',', '.')),
        sku: sku || undefined
      };
      
      // Add to store
      addProduct(newProduct);
      
      // Show success message
      Alert.alert(
        language === 'en' ? 'Success' : 'Успех',
        language === 'en' ? 'Product created successfully' : 'Товар успешно создан',
        [
          { 
            text: 'OK', 
            onPress: () => router.back() 
          }
        ]
      );
    } catch (error) {
      console.error('Error creating product:', error);
      Alert.alert(
        language === 'en' ? 'Error' : 'Ошибка',
        language === 'en' ? 'Failed to create product' : 'Не удалось создать товар'
      );
    } finally {
      setIsLoading(false);
    }
  };
  
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
              {language === 'en' ? 'Create New Product' : 'Создать новый товар'}
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
                  title={language === 'en' ? 'Create Product' : 'Создать товар'}
                  onPress={handleSubmit}
                  loading={isLoading}
                  style={styles.submitButton}
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
  cancelButton: {
  },
});