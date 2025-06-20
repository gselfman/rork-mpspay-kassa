import React, { useState, useRef, useCallback } from 'react';
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
  TextInput
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
  
  // Refs for input fields
  const nameInputRef = useRef<any>(null);
  const priceInputRef = useRef<TextInput>(null);
  
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
  
  // Optimized price change handler with useCallback
  const handlePriceChange = useCallback((text: string) => {
    // Only filter if there are non-numeric characters
    const numericText = text.replace(/[^0-9]/g, '');
    
    // Only update if value actually changed
    if (numericText !== price) {
      setPrice(numericText);
    }
    
    // Clear price error when user starts typing (only if needed)
    if (errors.price && numericText && !errors.price.includes('required')) {
      setErrors(prev => ({ ...prev, price: '' }));
    }
  }, [price, errors.price]);
  
  // Optimized name change handler with useCallback
  const handleNameChange = useCallback((text: string) => {
    setName(text);
    
    // Clear name error when user starts typing (only if needed)
    if (errors.name && text.trim()) {
      setErrors(prev => ({ ...prev, name: '' }));
    }
  }, [errors.name]);
  
  const focusNextInput = () => {
    if (priceInputRef.current) {
      priceInputRef.current.focus();
    }
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.title, { color: theme.text }]} allowFontScaling={false}>
              {language === 'en' ? 'Create New Product' : 'Создать новый товар'}
            </Text>
            
            <View style={[styles.formContainer, { backgroundColor: theme.card }]}>
              <Input
                ref={nameInputRef}
                label={language === 'en' ? 'Product Name' : 'Название товара и услуги'}
                placeholder={language === 'en' ? 'Enter product name (max 64 characters)' : 'Введите название товара (макс. 64 символа)'}
                value={name}
                onChangeText={handleNameChange}
                error={errors.name}
                darkMode={darkMode}
                maxLength={64}
                autoFocus={true}
                returnKeyType="next"
                onSubmitEditing={focusNextInput}
                blurOnSubmit={false}
              />
              
              {/* Use native TextInput for price to avoid focus issues */}
              <View style={styles.priceInputContainer}>
                <Text style={[styles.priceLabel, { color: theme.text }]} allowFontScaling={false}>
                  {language === 'en' ? 'Price (RUB)' : 'Цена (руб.)'}
                </Text>
                <TextInput
                  ref={priceInputRef}
                  style={[
                    styles.priceInput, 
                    { 
                      backgroundColor: theme.inputBackground,
                      color: theme.text,
                      borderColor: errors.price ? theme.notification : theme.border
                    }
                  ]}
                  placeholder={language === 'en' ? 'Enter price (1 - 1,000,000)' : 'Введите цену (1 - 1 000 000)'}
                  placeholderTextColor={theme.placeholder}
                  value={price}
                  onChangeText={handlePriceChange}
                  keyboardType="numeric"
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                  blurOnSubmit={false}
                  textContentType="none"
                  autoComplete="off"
                  autoCorrect={false}
                  spellCheck={false}
                  selectionColor={theme.primary}
                  caretHidden={false}
                  allowFontScaling={false}
                />
                {errors.price ? (
                  <Text style={[styles.priceError, { color: theme.notification }]} allowFontScaling={false}>
                    {errors.price}
                  </Text>
                ) : null}
              </View>
              
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
                  disabled={isLoading}
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
    flexGrow: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  formContainer: {
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  // Price input specific styles
  priceInputContainer: {
    marginBottom: 12,
  },
  priceLabel: {
    marginBottom: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  priceInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 16,
    minHeight: 48,
    textAlignVertical: 'center',
  },
  priceError: {
    marginTop: 4,
    fontSize: 12,
  },
  buttonContainer: {
    marginTop: 24,
    gap: 12,
  },
  submitButton: {
    marginBottom: 0,
  },
  cancelButton: {
    marginBottom: 0,
  },
});