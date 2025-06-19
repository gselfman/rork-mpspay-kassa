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
  const [price, setPrice] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  
  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    // Validate name (required, max 64 characters)
    if (!name.trim()) {
      newErrors.name = language === 'en' ? 'Product name is required' : 'Название товара обязательно';
    } else if (name.trim().length > 64) {
      newErrors.name = language === 'en' ? 'Product name must be 64 characters or less' : 'Название товара должно быть не более 64 символов';
    }
    
    // Validate price (required, integer, 1-1000000)
    if (!price.trim()) {
      newErrors.price = language === 'en' ? 'Price is required' : 'Цена обязательна';
    } else {
      const numPrice = parseInt(price, 10);
      if (isNaN(numPrice) || numPrice < 1 || numPrice > 1000000) {
        newErrors.price = language === 'en' ? 'Price must be a whole number between 1 and 1,000,000' : 'Цена должна быть целым числом от 1 до 1 000 000';
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
        name: name.trim(),
        description: '',
        price: parseInt(price, 10)
      };
      
      // Add to store
      addProduct(newProduct);
      
      // Show success message and navigate back to products page
      Alert.alert(
        language === 'en' ? 'Success' : 'Успех',
        language === 'en' ? 'Product created successfully' : 'Товар успешно создан',
        [
          { 
            text: 'OK', 
            onPress: () => router.push('/product')
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
  
  const handlePriceChange = (text: string) => {
    // Only allow digits
    const numericText = text.replace(/[^0-9]/g, '');
    setPrice(numericText);
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
                label={language === 'en' ? 'Product Name' : 'Название товара и услуги'}
                placeholder={language === 'en' ? 'Enter product name (max 64 characters)' : 'Введите название товара (макс. 64 символа)'}
                value={name}
                onChangeText={setName}
                error={errors.name}
                darkMode={darkMode}
                maxLength={64}
              />
              
              <Input
                label={language === 'en' ? 'Price (RUB)' : 'Цена (руб.)'}
                placeholder={language === 'en' ? 'Enter price (1 - 1,000,000)' : 'Введите цену (1 - 1 000 000)'}
                value={price}
                onChangeText={handlePriceChange}
                keyboardType="numeric"
                error={errors.price}
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
  buttonContainer: {
    marginTop: 16,
  },
  submitButton: {
    marginBottom: 12,
  },
  cancelButton: {
  },
});