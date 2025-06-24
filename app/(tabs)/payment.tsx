import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  TextInput,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ErrorPopup } from '@/components/ErrorPopup';
import { useAuthStore } from '@/store/auth-store';
import { useTransactionStore } from '@/store/transaction-store';
import { useLanguageStore } from '@/store/language-store';
import { useThemeStore } from '@/store/theme-store';
import { useProductStore } from '@/store/product-store';
import { createTransaction } from '@/utils/api';
import colors from '@/constants/colors';
import IMAGES from '@/constants/images';
import { CreditCard, Plus, Minus, ShoppingBag, Check } from 'lucide-react-native';
import { scaleFontSize, scaleSpacing, isLargeDevice } from '@/utils/responsive';

export default function PaymentScreen() {
  const router = useRouter();
  const credentials = useAuthStore((state) => state.credentials);
  const addTransaction = useTransactionStore((state) => state.addTransaction);
  const { language } = useLanguageStore();
  const { darkMode } = useThemeStore();
  const { products: storeProducts, addProduct } = useProductStore();
  const theme = darkMode ? colors.dark : colors.light;
  
  const [amount, setAmount] = useState('');
  const [customerInfo, setCustomerInfo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawErrorResponse, setRawErrorResponse] = useState<string | null>(null);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [products, setProducts] = useState<Array<{id: string, name: string, price: number, quantity: number}>>([]);
  const [showProductForm, setShowProductForm] = useState(false);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productQuantity, setProductQuantity] = useState('1');
  const [productErrors, setProductErrors] = useState<{name?: string, price?: string, quantity?: string}>({});
  
  // Translations
  const getTranslation = (en: string, ru: string): string => {
    return language === 'en' ? en : ru;
  };
  
  const validateForm = () => {
    const errors: {amount?: string, customerInfo?: string} = {};
    
    // Validate amount
    if (!amount) {
      errors.amount = getTranslation("Amount is required", "Сумма обязательна");
    } else {
      const numAmount = parseInt(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        errors.amount = getTranslation("Amount must be greater than 0", "Сумма должна быть больше 0");
      }
    }
    
    return errors;
  };
  
  const validateProduct = () => {
    const errors: {name?: string, price?: string, quantity?: string} = {};
    
    // Validate product name
    if (!productName.trim()) {
      errors.name = getTranslation("Product name is required", "Название товара обязательно");
    }
    
    // Validate product price
    if (!productPrice) {
      errors.price = getTranslation("Price is required", "Цена обязательна");
    } else {
      const numPrice = parseFloat(productPrice);
      if (isNaN(numPrice) || numPrice <= 0) {
        errors.price = getTranslation("Price must be greater than 0", "Цена должна быть больше 0");
      }
    }
    
    // Validate product quantity
    if (!productQuantity) {
      errors.quantity = getTranslation("Quantity is required", "Количество обязательно");
    } else {
      const numQuantity = parseInt(productQuantity, 10);
      if (isNaN(numQuantity) || numQuantity <= 0) {
        errors.quantity = getTranslation("Quantity must be greater than 0", "Количество должно быть больше 0");
      }
    }
    
    return errors;
  };
  
  const handleAddProduct = () => {
    const errors = validateProduct();
    
    if (Object.keys(errors).length > 0) {
      setProductErrors(errors);
      return;
    }
    
    const newProduct = {
      id: Date.now().toString(),
      name: productName.trim(),
      price: parseFloat(productPrice),
      quantity: parseInt(productQuantity, 10)
    };
    
    // Add to local products list
    setProducts([...products, newProduct]);
    
    // Add to global product store
    addProduct({
      id: newProduct.id,
      name: newProduct.name,
      price: newProduct.price,
      description: ''
    });
    
    // Update amount to reflect total of all products
    const newTotal = products.reduce(
      (sum, p) => sum + (p.price * p.quantity), 
      newProduct.price * newProduct.quantity
    );
    
    setAmount(newTotal.toString());
    
    // Reset product form
    setProductName('');
    setProductPrice('');
    setProductQuantity('1');
    setProductErrors({});
    setShowProductForm(false);
  };
  
  const handleSelectProduct = (product: { id: string, name: string, price: number }) => {
    // Check if product already exists in cart
    const existingProductIndex = products.findIndex(p => p.id === product.id);
    
    if (existingProductIndex >= 0) {
      // If product exists, increase quantity
      const updatedProducts = [...products];
      updatedProducts[existingProductIndex].quantity += 1;
      setProducts(updatedProducts);
    } else {
      // If product doesn't exist, add it with quantity 1
      setProducts([...products, { ...product, quantity: 1 }]);
    }
    
    // Update amount to reflect total of all products
    const newTotal = products.reduce(
      (sum, p) => sum + (p.price * p.quantity), 
      product.price
    );
    
    setAmount(newTotal.toString());
    setShowProductSelector(false);
  };
  
  const handleRemoveProduct = (id: string) => {
    const updatedProducts = products.filter(p => p.id !== id);
    setProducts(updatedProducts);
    
    // Update amount to reflect total of remaining products
    if (updatedProducts.length > 0) {
      const newTotal = updatedProducts.reduce(
        (sum, p) => sum + (p.price * p.quantity), 
        0
      );
      setAmount(newTotal.toString());
    } else {
      setAmount('');
    }
  };
  
  const handleIncreaseQuantity = (id: string) => {
    const updatedProducts = products.map(product => {
      if (product.id === id) {
        return {
          ...product,
          quantity: product.quantity + 1
        };
      }
      return product;
    });
    
    setProducts(updatedProducts);
    
    // Update amount to reflect new quantities
    const newTotal = updatedProducts.reduce(
      (sum, p) => sum + (p.price * p.quantity), 
      0
    );
    
    setAmount(newTotal.toString());
  };
  
  const handleDecreaseQuantity = (id: string) => {
    const updatedProducts = products.map(product => {
      if (product.id === id && product.quantity > 1) {
        return {
          ...product,
          quantity: product.quantity - 1
        };
      }
      return product;
    });
    
    setProducts(updatedProducts);
    
    // Update amount to reflect new quantities
    const newTotal = updatedProducts.reduce(
      (sum, p) => sum + (p.price * p.quantity), 
      0
    );
    
    setAmount(newTotal.toString());
  };
  
  const handleCreatePayment = async () => {
    if (!credentials) {
      setError(getTranslation(
        "You need to be logged in to create payments",
        "Вы должны быть авторизованы для создания платежей"
      ));
      setShowErrorPopup(true);
      return;
    }
    
    const formErrors = validateForm();
    
    if (Object.keys(formErrors).length > 0) {
      // Show first error
      const firstError = Object.values(formErrors)[0];
      setError(firstError);
      setShowErrorPopup(true);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setRawErrorResponse(null);
    
    try {
      const numAmount = parseInt(amount);
      
      // Create comment based on the new rules
      let paymentComment = '';
      const merchantPrefix = credentials.merchantName || 'Store';
      
      if (customerInfo.trim()) {
        // If customer info exists: merchantName + customer info
        paymentComment = `${merchantPrefix}: ${customerInfo.trim()}`;
      } else if (products.length > 0) {
        // If no customer info but products exist: merchantName + product list
        paymentComment = `${merchantPrefix}: ${products.map(p => `${p.name} x${p.quantity}`).join(', ')}`;
      } else {
        // If no customer info and no products: merchantName + "сумма вручную" + date/time
        const now = new Date();
        const dateTimeStr = `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
        paymentComment = `${merchantPrefix}: ${getTranslation('Manual amount', 'Сумма вручную')} (${dateTimeStr})`;
      }
      
      const result = await createTransaction(
        credentials,
        numAmount,
        products.length > 0 ? products : undefined,
        paymentComment
      );
      
      if (result.success && result.transaction) {
        // Add transaction to store
        addTransaction(result.transaction);
        
        // Navigate to payment details screen with QR code
        router.push({
          pathname: '/payment/id',
          params: { id: result.transaction.id }
        });
      } else {
        setError(result.error || getTranslation(
          "Failed to create payment",
          "Не удалось создать платеж"
        ));
        setRawErrorResponse(result.rawResponse || null);
        setShowErrorPopup(true);
      }
    } catch (err) {
      console.error('Error creating payment:', err);
      
      // Create detailed error message
      let errorMsg = '';
      let rawError = '';
      
      if (err instanceof Error) {
        errorMsg = getTranslation(
          `Error: ${err.message}`,
          `Ошибка: ${err.message}`
        );
        rawError = JSON.stringify({
          name: err.name,
          message: err.message,
          stack: err.stack
        }, null, 2);
      } else {
        errorMsg = getTranslation(
          `Unknown error: ${String(err)}`,
          `Неизвестная ошибка: ${String(err)}`
        );
        rawError = String(err);
      }
      
      setError(errorMsg);
      setRawErrorResponse(rawError);
      setShowErrorPopup(true);
    } finally {
      setIsLoading(false);
    }
  };
  
  const calculateTotal = () => {
    if (products.length === 0) {
      return parseInt(amount) || 0;
    }
    
    return products.reduce((sum, p) => sum + (p.price * p.quantity), 0);
  };
  
  // Check if we should show the empty products message
  const shouldShowEmptyMessage = storeProducts.length === 0 && products.length === 0;
  
  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: false
        }}
      />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header - Updated for large devices */}
          <View style={[styles.header, isLargeDevice && styles.headerLarge]}>
            <Image 
              source={IMAGES.PAYMENT_LOGO} 
              style={styles.logo} 
              resizeMode="contain"
            />
            <View style={styles.headerTextContainer}>
              <Text style={[styles.title, { 
                color: theme.text,
                fontSize: scaleFontSize(24)
              }]} allowFontScaling={false}>
                {getTranslation('Create Payment', 'Создать платеж')}
              </Text>
            </View>
          </View>
          
          <Card style={styles.card}>
            <View style={styles.amountContainer}>
              <Text style={[styles.amountLabel, { color: theme.text }]} allowFontScaling={false}>
                {getTranslation('Amount, RUB', 'Сумма, руб')}
              </Text>
              <View style={styles.amountInputContainer}>
                <TextInput
                  value={amount}
                  onChangeText={(text) => {
                    // Only allow integer values
                    const integerValue = text.replace(/[^0-9]/g, '');
                    setAmount(integerValue);
                  }}
                  placeholder="0"
                  keyboardType="numeric"
                  style={[
                    styles.amountInput,
                    {
                      backgroundColor: theme.inputBackground || theme.background,
                      color: theme.text,
                      borderColor: error && error.includes(getTranslation('Amount', 'Сумма')) ? theme.notification : theme.border,
                      borderWidth: 1,
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      fontSize: scaleFontSize(24),
                      minHeight: 48,
                    }
                  ]}
                  placeholderTextColor={theme.placeholder}
                  allowFontScaling={false}
                />
              </View>
              {error && error.includes(getTranslation('Amount', 'Сумма')) && (
                <Text style={[styles.errorText, { color: theme.notification }]} allowFontScaling={false}>
                  {error}
                </Text>
              )}
            </View>
            
            <View style={styles.customerContainer}>
              <Text style={[styles.customerLabel, { color: theme.text }]} allowFontScaling={false}>
                {getTranslation('Customer', 'Покупатель')}
              </Text>
              <Input
                value={customerInfo}
                onChangeText={setCustomerInfo}
                placeholder={getTranslation('Full name', 'ФИО')}
                style={styles.customerInput}
                darkMode={darkMode}
                placeholderTextColor={darkMode ? colors.dark.placeholder : colors.light.placeholder}
              />
            </View>
          </Card>
          
          <Card style={styles.productsCard}>
            <View style={styles.productsHeader}>
              <Text style={[styles.cardTitle, { color: theme.text }]} allowFontScaling={false}>
                {getTranslation('Products', 'Товары')}
              </Text>
              <View style={styles.productActions}>
                {storeProducts.length > 0 && (
                  <TouchableOpacity 
                    style={[styles.selectProductButton, { backgroundColor: theme.secondary }]}
                    onPress={() => setShowProductSelector(true)}
                  >
                    <ShoppingBag size={16} color="white" />
                    <Text style={styles.selectProductButtonText} allowFontScaling={false}>
                      {getTranslation('Select', 'Выбрать')}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity 
                  style={[styles.addProductButton, { backgroundColor: theme.primary }]}
                  onPress={() => setShowProductForm(true)}
                >
                  <Plus size={20} color="white" />
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Show available products if any exist and no forms are shown */}
            {storeProducts.length > 0 && !showProductForm && !showProductSelector && (
              <View style={styles.availableProductsList}>
                <Text style={[styles.availableProductsTitle, { color: theme.text }]} allowFontScaling={false}>
                  {getTranslation('Available Products', 'Доступные товары')}
                </Text>
                <ScrollView style={styles.availableProductsScroll} horizontal showsHorizontalScrollIndicator={false}>
                  {storeProducts.map((product) => (
                    <TouchableOpacity
                      key={product.id}
                      style={[styles.availableProductItem, { backgroundColor: theme.card, borderColor: theme.border }]}
                      onPress={() => handleSelectProduct(product)}
                    >
                      <Text style={[styles.availableProductName, { color: theme.text }]} allowFontScaling={false}>
                        {product.name}
                      </Text>
                      <Text style={[styles.availableProductPrice, { color: theme.text }]} allowFontScaling={false}>
                        ₽{product.price.toFixed(2)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            
            {products.length > 0 ? (
              <View style={styles.productsList}>
                <Text style={[styles.selectedProductsTitle, { color: theme.text }]} allowFontScaling={false}>
                  {getTranslation('Selected Products', 'Выбранные товары')}
                </Text>
                {products.map((product) => (
                  <View key={product.id} style={[styles.productItem, { backgroundColor: theme.card }]}>
                    <View style={styles.productInfo}>
                      <Text style={[styles.productName, { color: theme.text }]} allowFontScaling={false}>
                        {product.name}
                      </Text>
                      <View style={styles.productDetails}>
                        <Text style={[styles.productPrice, { color: theme.text }]} allowFontScaling={false}>
                          ₽{product.price.toFixed(2)} × {product.quantity}
                        </Text>
                        <Text style={[styles.productTotal, { color: theme.text }]} allowFontScaling={false}>
                          ₽{(product.price * product.quantity).toFixed(2)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.productActions}>
                      <TouchableOpacity 
                        style={[styles.quantityButton, { backgroundColor: theme.primary + '20' }]}
                        onPress={() => handleIncreaseQuantity(product.id)}
                      >
                        <Plus size={16} color={theme.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.quantityButton, { backgroundColor: theme.secondary + '20' }]}
                        onPress={() => handleDecreaseQuantity(product.id)}
                        disabled={product.quantity <= 1}
                      >
                        <Minus size={16} color={product.quantity <= 1 ? theme.inactive : theme.secondary} />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.removeProductButton, { backgroundColor: theme.notification + '20' }]}
                        onPress={() => handleRemoveProduct(product.id)}
                      >
                        <Minus size={16} color={theme.notification} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
                
                <View style={[styles.totalRow, { borderTopColor: theme.border }]}>
                  <Text style={[styles.totalLabel, { color: theme.text }]} allowFontScaling={false}>
                    {getTranslation('Total', 'Итого')}
                  </Text>
                  <Text style={[styles.totalAmount, { color: theme.text }]} allowFontScaling={false}>
                    ₽{calculateTotal().toFixed(2)}
                  </Text>
                </View>
              </View>
            ) : shouldShowEmptyMessage ? (
              <View style={styles.emptyProductsContainer}>
                <ShoppingBag size={48} color={theme.placeholder} style={styles.emptyProductsIcon} />
                <Text style={[styles.emptyProductsText, { color: theme.text }]} allowFontScaling={false}>
                  {getTranslation(
                    'No products added yet. Add products or enter amount directly.',
                    'Товары еще не добавлены. Добавьте товары или введите сумму напрямую.'
                  )}
                </Text>
              </View>
            ) : null}
            
            {showProductForm && (
              <View style={[styles.productForm, { backgroundColor: theme.card }]}>
                <Text style={[styles.productFormTitle, { color: theme.text }]} allowFontScaling={false}>
                  {getTranslation('Add Product', 'Добавить товар')}
                </Text>
                
                <Input
                  label={getTranslation('Product Name', 'Название товара')}
                  value={productName}
                  onChangeText={setProductName}
                  placeholder={getTranslation('Enter product name', 'Введите название товара')}
                  error={productErrors.name}
                  darkMode={darkMode}
                  placeholderTextColor={darkMode ? colors.dark.placeholder : colors.light.placeholder}
                />
                
                <View style={styles.productFormRow}>
                  <View style={styles.priceInput}>
                    <Input
                      label={getTranslation('Price', 'Цена')}
                      value={productPrice}
                      onChangeText={setProductPrice}
                      placeholder="0.00"
                      keyboardType="numeric"
                      error={productErrors.price}
                      darkMode={darkMode}
                      placeholderTextColor={darkMode ? colors.dark.placeholder : colors.light.placeholder}
                    />
                  </View>
                  
                  <View style={styles.quantityInput}>
                    <Input
                      label={getTranslation('Quantity', 'Количество')}
                      value={productQuantity}
                      onChangeText={setProductQuantity}
                      placeholder="1"
                      keyboardType="numeric"
                      error={productErrors.quantity}
                      darkMode={darkMode}
                      placeholderTextColor={darkMode ? colors.dark.placeholder : colors.light.placeholder}
                    />
                  </View>
                </View>
                
                <View style={styles.productFormButtons}>
                  <Button
                    title={getTranslation('Cancel', 'Отмена')}
                    variant="outline"
                    onPress={() => {
                      setShowProductForm(false);
                      setProductErrors({});
                    }}
                    style={styles.cancelProductButton}
                  />
                  
                  <Button
                    title={getTranslation('Add', 'Добавить')}
                    onPress={handleAddProduct}
                    style={styles.confirmProductButton}
                    icon={<Check size={20} color="white" />}
                  />
                </View>
              </View>
            )}
            
            {showProductSelector && storeProducts.length > 0 && (
              <View style={[styles.productSelector, { backgroundColor: theme.card }]}>
                <Text style={[styles.productSelectorTitle, { color: theme.text }]} allowFontScaling={false}>
                  {getTranslation('Select Product', 'Выбрать товар')}
                </Text>
                
                <ScrollView style={styles.productSelectorList}>
                  {storeProducts.map((product) => (
                    <TouchableOpacity
                      key={product.id}
                      style={[styles.productSelectorItem, { borderBottomColor: theme.border }]}
                      onPress={() => handleSelectProduct(product)}
                    >
                      <Text style={[styles.productSelectorName, { color: theme.text }]} allowFontScaling={false}>
                        {product.name}
                      </Text>
                      <Text style={[styles.productSelectorPrice, { color: theme.text }]} allowFontScaling={false}>
                        ₽{product.price.toFixed(2)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                
                <Button
                  title={getTranslation('Cancel', 'Отмена')}
                  variant="outline"
                  onPress={() => setShowProductSelector(false)}
                  style={styles.cancelSelectorButton}
                />
              </View>
            )}
          </Card>
          
          <Button
            title={getTranslation('Create Payment', 'Создать платеж')}
            onPress={handleCreatePayment}
            loading={isLoading}
            disabled={isLoading || !amount || parseInt(amount) <= 0}
            icon={!isLoading ? <CreditCard size={20} color="white" /> : undefined}
            style={styles.createButton}
          />
        </ScrollView>
        
        <ErrorPopup
          visible={showErrorPopup}
          message={error || getTranslation('An error occurred', 'Произошла ошибка')}
          onClose={() => setShowErrorPopup(false)}
          darkMode={darkMode}
          title={getTranslation('Error', 'Ошибка')}
          rawResponse={rawErrorResponse}
        />
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: scaleSpacing(16),
    paddingBottom: scaleSpacing(32),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scaleSpacing(24),
  },
  headerLarge: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  logo: {
    width: 60,
    height: 60,
    marginBottom: scaleSpacing(isLargeDevice ? 12 : 0),
    marginRight: scaleSpacing(isLargeDevice ? 0 : 12),
  },
  headerTextContainer: {
    alignItems: isLargeDevice ? 'center' : 'flex-start',
  },
  title: {
    fontWeight: 'bold',
    textAlign: isLargeDevice ? 'center' : 'left',
  },
  card: {
    marginBottom: scaleSpacing(16),
  },
  cardTitle: {
    fontSize: scaleFontSize(18),
    fontWeight: '600',
    marginBottom: scaleSpacing(16),
  },
  amountContainer: {
    marginBottom: scaleSpacing(16),
  },
  amountLabel: {
    fontSize: scaleFontSize(14),
    marginBottom: scaleSpacing(8),
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountInput: {
    flex: 1,
  },
  customerContainer: {
    marginBottom: scaleSpacing(16),
  },
  customerLabel: {
    fontSize: scaleFontSize(14),
    marginBottom: scaleSpacing(8),
  },
  customerInput: {
    fontSize: scaleFontSize(16),
  },
  errorText: {
    fontSize: scaleFontSize(14),
    marginTop: scaleSpacing(4),
  },
  generalError: {
    fontSize: scaleFontSize(14),
    marginBottom: scaleSpacing(16),
    textAlign: 'center',
  },
  createButton: {
    marginTop: scaleSpacing(8),
    height: 56,
  },
  // Products styles
  productsCard: {
    marginBottom: scaleSpacing(16),
  },
  productsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scaleSpacing(16),
  },
  productActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectProductButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleSpacing(12),
    paddingVertical: scaleSpacing(8),
    borderRadius: 8,
    marginRight: scaleSpacing(8),
  },
  selectProductButtonText: {
    color: 'white',
    marginLeft: scaleSpacing(4),
    fontSize: scaleFontSize(14),
  },
  addProductButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Available products styles
  availableProductsList: {
    marginBottom: scaleSpacing(16),
  },
  availableProductsTitle: {
    fontSize: scaleFontSize(16),
    fontWeight: '600',
    marginBottom: scaleSpacing(12),
  },
  availableProductsScroll: {
    maxHeight: 120,
  },
  availableProductItem: {
    padding: scaleSpacing(12),
    borderRadius: 8,
    marginRight: scaleSpacing(8),
    borderWidth: 1,
    minWidth: 120,
  },
  availableProductName: {
    fontSize: scaleFontSize(14),
    fontWeight: '500',
    marginBottom: scaleSpacing(4),
  },
  availableProductPrice: {
    fontSize: scaleFontSize(14),
    fontWeight: 'bold',
  },
  // Selected products styles
  selectedProductsTitle: {
    fontSize: scaleFontSize(16),
    fontWeight: '600',
    marginBottom: scaleSpacing(12),
  },
  productsList: {
    marginBottom: scaleSpacing(8),
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: scaleSpacing(12),
    borderRadius: 8,
    marginBottom: scaleSpacing(8),
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: scaleFontSize(16),
    fontWeight: '500',
    marginBottom: scaleSpacing(4),
  },
  productDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: scaleFontSize(14),
  },
  productTotal: {
    fontSize: scaleFontSize(16),
    fontWeight: '500',
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scaleSpacing(8),
  },
  removeProductButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: scaleSpacing(12),
    marginTop: scaleSpacing(8),
    borderTopWidth: 1,
  },
  totalLabel: {
    fontSize: scaleFontSize(16),
    fontWeight: '600',
  },
  totalAmount: {
    fontSize: scaleFontSize(18),
    fontWeight: 'bold',
  },
  emptyProductsContainer: {
    alignItems: 'center',
    padding: scaleSpacing(24),
  },
  emptyProductsIcon: {
    marginBottom: scaleSpacing(16),
  },
  emptyProductsText: {
    fontSize: scaleFontSize(14),
    textAlign: 'center',
  },
  // Product form styles
  productForm: {
    padding: scaleSpacing(16),
    borderRadius: 8,
    marginTop: scaleSpacing(16),
  },
  productFormTitle: {
    fontSize: scaleFontSize(16),
    fontWeight: '600',
    marginBottom: scaleSpacing(16),
  },
  productFormRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: scaleSpacing(16),
  },
  priceInput: {
    flex: 3,
    marginRight: scaleSpacing(8),
  },
  quantityInput: {
    flex: 2,
  },
  productFormButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelProductButton: {
    flex: 1,
    marginRight: scaleSpacing(8),
  },
  confirmProductButton: {
    flex: 1,
  },
  // Product selector styles
  productSelector: {
    padding: scaleSpacing(16),
    borderRadius: 8,
    marginTop: scaleSpacing(16),
  },
  productSelectorTitle: {
    fontSize: scaleFontSize(16),
    fontWeight: '600',
    marginBottom: scaleSpacing(16),
  },
  productSelectorList: {
    maxHeight: 200,
    marginBottom: scaleSpacing(16),
  },
  productSelectorItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: scaleSpacing(12),
    borderBottomWidth: 1,
  },
  productSelectorName: {
    fontSize: scaleFontSize(16),
  },
  productSelectorPrice: {
    fontSize: scaleFontSize(16),
    fontWeight: '500',
  },
  cancelSelectorButton: {
    marginTop: scaleSpacing(8),
  },
});