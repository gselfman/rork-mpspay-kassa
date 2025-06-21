import React, { useState, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Alert,
  TextInput,
  TouchableOpacity,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ErrorPopup } from '@/components/ErrorPopup';
import { useProductStore } from '@/store/product-store';
import { useLanguageStore } from '@/store/language-store';
import { useThemeStore } from '@/store/theme-store';
import { Product } from '@/types/api';
import colors from '@/constants/colors';
import { ArrowLeft, Package, DollarSign, FileText, Hash } from 'lucide-react-native';
import { scaleFontSize, scaleSpacing } from '@/utils/responsive';

export default function CreateProductScreen() {
  const router = useRouter();
  const { addProduct } = useProductStore();
  const { language } = useLanguageStore();
  const { darkMode } = useThemeStore();
  const theme = darkMode ? colors.dark : colors.light;
  
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [sku, setSku] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    price?: string;
    description?: string;
    sku?: string;
  }>({});
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Refs for input focus management
  const nameInputRef = useRef<TextInput>(null);
  const priceInputRef = useRef<TextInput>(null);
  const descriptionInputRef = useRef<TextInput>(null);
  const skuInputRef = useRef<TextInput>(null);
  
  const validateForm = useCallback(() => {
    const newErrors: typeof errors = {};
    
    if (!name.trim()) {
      newErrors.name = language === 'en' ? 'Product name is required' : 'Название товара обязательно';
    } else if (name.trim().length < 2) {
      newErrors.name = language === 'en' ? 'Product name must be at least 2 characters' : 'Название товара должно содержать минимум 2 символа';
    } else if (name.trim().length > 100) {
      newErrors.name = language === 'en' ? 'Product name must be less than 100 characters' : 'Название товара должно содержать менее 100 символов';
    }
    
    if (!price.trim()) {
      newErrors.price = language === 'en' ? 'Price is required' : 'Цена обязательна';
    } else {
      const numericPrice = parseFloat(price);
      if (isNaN(numericPrice) || numericPrice <= 0) {
        newErrors.price = language === 'en' ? 'Price must be a positive number' : 'Цена должна быть положительным числом';
      } else if (numericPrice > 1000000) {
        newErrors.price = language === 'en' ? 'Price cannot exceed 1,000,000 RUB' : 'Цена не может превышать 1 000 000 руб.';
      }
    }
    
    if (description.trim().length > 500) {
      newErrors.description = language === 'en' ? 'Description must be less than 500 characters' : 'Описание должно содержать менее 500 символов';
    }
    
    if (sku.trim().length > 50) {
      newErrors.sku = language === 'en' ? 'SKU must be less than 50 characters' : 'Артикул должен содержать менее 50 символов';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, price, description, sku, language]);
  
  const handleNameChange = useCallback((text: string) => {
    setName(text);
    
    if (errors.name && text.trim()) {
      setErrors(prev => ({ ...prev, name: '' }));
    }
  }, [errors.name]);
  
  const handlePriceChange = useCallback((text: string) => {
    // Only allow numbers and decimal point
    const numericText = text.replace(/[^0-9.]/g, '');
    
    // Prevent multiple decimal points
    const parts = numericText.split('.');
    if (parts.length > 2) {
      return;
    }
    
    // Limit decimal places to 2
    if (parts[1] && parts[1].length > 2) {
      return;
    }
    
    setPrice(numericText);
    
    if (errors.price && numericText && !errors.price.includes('required')) {
      setErrors(prev => ({ ...prev, price: '' }));
    }
  }, [errors.price]);
  
  const handleDescriptionChange = useCallback((text: string) => {
    setDescription(text);
    
    if (errors.description && text.trim().length <= 500) {
      setErrors(prev => ({ ...prev, description: '' }));
    }
  }, [errors.description]);
  
  const handleSkuChange = useCallback((text: string) => {
    setSku(text);
    
    if (errors.sku && text.trim().length <= 50) {
      setErrors(prev => ({ ...prev, sku: '' }));
    }
  }, [errors.sku]);
  
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const newProduct: Product = {
        id: Date.now().toString(),
        name: name.trim(),
        price: parseFloat(price),
        description: description.trim() || undefined,
        sku: sku.trim() || undefined,
      };
      
      addProduct(newProduct);
      
      Alert.alert(
        language === 'en' ? 'Success' : 'Успех',
        language === 'en' ? 'Product created successfully!' : 'Товар успешно создан!',
        [
          {
            text: language === 'en' ? 'OK' : 'ОК',
            onPress: () => router.back()
          }
        ]
      );
    } catch (error) {
      console.error('Error creating product:', error);
      setErrorMessage(language === 'en' ? 'Failed to create product' : 'Не удалось создать товар');
      setShowErrorPopup(true);
    } finally {
      setIsLoading(false);
    }
  }, [validateForm, name, price, description, sku, addProduct, language, router]);
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <Stack.Screen 
        options={{
          title: language === 'en' ? 'Create Product' : 'Создать товар',
          headerShown: true,
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          headerTitleStyle: { color: theme.text },
        }}
      />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.formCard}>
          <View style={styles.formHeader}>
            <Package size={24} color={theme.primary} />
            <Text style={[styles.formTitle, { color: theme.text }]} allowFontScaling={false}>
              {language === 'en' ? 'Product Information' : 'Информация о товаре'}
            </Text>
          </View>
          
          {/* Product Name */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.text }]} allowFontScaling={false}>
              {language === 'en' ? 'Product Name' : 'Название товара'} *
            </Text>
            <TextInput
              ref={nameInputRef}
              style={[
                styles.textInput, 
                { 
                  backgroundColor: theme.inputBackground,
                  color: theme.text,
                  borderColor: errors.name ? colors.error : theme.border
                }
              ]}
              placeholder={language === 'en' ? 'Enter product name' : 'Введите название товара'}
              placeholderTextColor={theme.placeholder}
              value={name}
              onChangeText={handleNameChange}
              returnKeyType="next"
              onSubmitEditing={() => priceInputRef.current?.focus()}
              blurOnSubmit={false}
              allowFontScaling={false}
            />
            {errors.name && (
              <Text style={[styles.errorText, { color: colors.error }]} allowFontScaling={false}>
                {errors.name}
              </Text>
            )}
          </View>
          
          {/* Price */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.text }]} allowFontScaling={false}>
              {language === 'en' ? 'Price (RUB)' : 'Цена (руб.)'} *
            </Text>
            <View style={styles.priceInputContainer}>
              <DollarSign size={20} color={theme.placeholder} style={styles.priceIcon} />
              <TextInput
                ref={priceInputRef}
                style={[
                  styles.priceInput, 
                  { 
                    backgroundColor: theme.inputBackground,
                    color: theme.text,
                    borderColor: errors.price ? colors.error : theme.border
                  }
                ]}
                placeholder={language === 'en' ? 'Enter price (1 - 1,000,000)' : 'Введите цену (1 - 1 000 000)'}
                placeholderTextColor={theme.placeholder}
                value={price}
                onChangeText={handlePriceChange}
                keyboardType="decimal-pad"
                returnKeyType="next"
                onSubmitEditing={() => descriptionInputRef.current?.focus()}
                blurOnSubmit={false}
                allowFontScaling={false}
              />
            </View>
            {errors.price && (
              <Text style={[styles.errorText, { color: colors.error }]} allowFontScaling={false}>
                {errors.price}
              </Text>
            )}
          </View>
          
          {/* Description */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.text }]} allowFontScaling={false}>
              {language === 'en' ? 'Description' : 'Описание'} ({language === 'en' ? 'optional' : 'необязательно'})
            </Text>
            <TextInput
              ref={descriptionInputRef}
              style={[
                styles.textAreaInput, 
                { 
                  backgroundColor: theme.inputBackground,
                  color: theme.text,
                  borderColor: errors.description ? colors.error : theme.border
                }
              ]}
              placeholder={language === 'en' ? 'Enter product description (max 500 characters)' : 'Введите описание товара (макс. 500 символов)'}
              placeholderTextColor={theme.placeholder}
              value={description}
              onChangeText={handleDescriptionChange}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              returnKeyType="next"
              onSubmitEditing={() => skuInputRef.current?.focus()}
              blurOnSubmit={false}
              allowFontScaling={false}
            />
            <Text style={[styles.characterCount, { color: theme.placeholder }]} allowFontScaling={false}>
              {description.length}/500
            </Text>
            {errors.description && (
              <Text style={[styles.errorText, { color: colors.error }]} allowFontScaling={false}>
                {errors.description}
              </Text>
            )}
          </View>
          
          {/* SKU */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.text }]} allowFontScaling={false}>
              {language === 'en' ? 'SKU / Article' : 'Артикул'} ({language === 'en' ? 'optional' : 'необязательно'})
            </Text>
            <View style={styles.skuInputContainer}>
              <Hash size={20} color={theme.placeholder} style={styles.skuIcon} />
              <TextInput
                ref={skuInputRef}
                style={[
                  styles.skuInput, 
                  { 
                    backgroundColor: theme.inputBackground,
                    color: theme.text,
                    borderColor: errors.sku ? colors.error : theme.border
                  }
                ]}
                placeholder={language === 'en' ? 'Enter SKU or article number' : 'Введите артикул или номер товара'}
                placeholderTextColor={theme.placeholder}
                value={sku}
                onChangeText={handleSkuChange}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
                allowFontScaling={false}
              />
            </View>
            {errors.sku && (
              <Text style={[styles.errorText, { color: colors.error }]} allowFontScaling={false}>
                {errors.sku}
              </Text>
            )}
          </View>
        </Card>
        
        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <Button
            title={language === 'en' ? 'Create Product' : 'Создать товар'}
            onPress={handleSubmit}
            loading={isLoading}
            disabled={isLoading}
            style={styles.createButton}
          />
          
          <Button
            title={language === 'en' ? 'Cancel' : 'Отмена'}
            variant="outline"
            onPress={() => router.back()}
            disabled={isLoading}
            style={styles.cancelButton}
          />
        </View>
      </ScrollView>
      
      <ErrorPopup
        visible={showErrorPopup}
        message={errorMessage}
        onClose={() => setShowErrorPopup(false)}
        darkMode={darkMode}
        title={language === 'en' ? 'Error' : 'Ошибка'}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: scaleSpacing(16),
    paddingBottom: scaleSpacing(32),
  },
  formCard: {
    marginBottom: scaleSpacing(24),
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scaleSpacing(24),
  },
  formTitle: {
    fontSize: scaleFontSize(20),
    fontWeight: 'bold',
    marginLeft: scaleSpacing(12),
  },
  inputContainer: {
    marginBottom: scaleSpacing(20),
  },
  label: {
    fontSize: scaleFontSize(16),
    fontWeight: '500',
    marginBottom: scaleSpacing(8),
  },
  textInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: scaleSpacing(16),
    fontSize: scaleFontSize(16),
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  priceIcon: {
    position: 'absolute',
    left: scaleSpacing(12),
    zIndex: 1,
  },
  priceInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingLeft: scaleSpacing(40),
    paddingRight: scaleSpacing(16),
    fontSize: scaleFontSize(16),
  },
  textAreaInput: {
    minHeight: 100,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: scaleSpacing(16),
    paddingVertical: scaleSpacing(12),
    fontSize: scaleFontSize(16),
  },
  characterCount: {
    fontSize: scaleFontSize(12),
    textAlign: 'right',
    marginTop: scaleSpacing(4),
  },
  skuInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  skuIcon: {
    position: 'absolute',
    left: scaleSpacing(12),
    zIndex: 1,
  },
  skuInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingLeft: scaleSpacing(40),
    paddingRight: scaleSpacing(16),
    fontSize: scaleFontSize(16),
  },
  errorText: {
    fontSize: scaleFontSize(14),
    marginTop: scaleSpacing(4),
  },
  buttonContainer: {
    gap: scaleSpacing(12),
  },
  createButton: {
    marginBottom: scaleSpacing(8),
  },
  cancelButton: {
    marginBottom: scaleSpacing(8),
  },
});