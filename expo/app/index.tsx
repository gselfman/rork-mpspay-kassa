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
  Image,
  TouchableOpacity,
  Dimensions,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, Redirect, Stack } from 'expo-router';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { ErrorPopup } from '@/components/ErrorPopup';
import { useAuthStore } from '@/store/auth-store';
import { validateCredentials } from '@/utils/validation';
import { 
  validateCredentialsStep1,
  validateCredentialsStep2,
  validateCredentialsStep3
} from '@/utils/api';
import colors from '@/constants/colors';
import IMAGES from '@/constants/images';
import { useThemeStore } from '@/store/theme-store';
import { useLanguageStore } from '@/store/language-store';

export default function AuthScreen() {
  const router = useRouter();
  const { isAuthenticated, setCredentials } = useAuthStore();
  const { darkMode, setDarkMode } = useThemeStore();
  const { language, setLanguage } = useLanguageStore();
  const theme = darkMode ? colors.dark : colors.light;
  
  const [showSetupForm, setShowSetupForm] = useState(false);
  const [readOnlyAccessKey, setReadOnlyAccessKey] = useState('');
  const [currencyCode, setCurrencyCode] = useState('');
  const [currencyAccountNumber, setCurrencyAccountNumber] = useState('');
  const [clientId, setClientId] = useState('');
  const [currencyAccountGuid, setCurrencyAccountGuid] = useState('');
  const [merchantName, setMerchantName] = useState('');
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [validationStep, setValidationStep] = useState(0);
  const [errorPopupVisible, setErrorPopupVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [rawErrorResponse, setRawErrorResponse] = useState(null);
  const [accountBalance, setAccountBalance] = useState(null);
  const [customerBalance, setCustomerBalance] = useState(null);

  // Get screen dimensions to adjust font sizes for different devices
  const { width, height } = Dimensions.get('window');
  const isSmallDevice = width < 375 || height < 700;

  // Set default language to Russian and theme to light
  useEffect(() => {
    setLanguage('ru');
    setDarkMode(false); // Default to light theme
  }, [setLanguage, setDarkMode]);

  // Use Redirect component instead of programmatic navigation
  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  const validate = () => {
    const credentials = {
      readOnlyAccessKey,
      currencyCode,
      currencyAccountNumber,
      clientId,
      currencyAccountGuid,
      merchantName
    };
    
    const validationErrors = validateCredentials(credentials, language);
    
    // Check merchant name
    if (merchantName && merchantName.length > 50) {
      validationErrors.merchantName = language === 'en' 
        ? 'Merchant name should not exceed 50 characters' 
        : 'Имя продавца не должно превышать 50 символов';
    }
    
    // Convert ValidationErrors to Record to fix TypeScript error
    const errorsRecord: Record<string, string> = {};
    Object.entries(validationErrors).forEach(([key, value]) => {
      if (value != undefined) {
        errorsRecord[key] = value;
      }
    });
    
    setErrors(errorsRecord);
    
    return Object.keys(validationErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    
    setIsLoading(true);
    setValidationStep(0);
    
    try {
      const credentials = {
        readOnlyAccessKey,
        currencyCode,
        currencyAccountNumber,
        clientId,
        currencyAccountGuid,
        merchantName: merchantName.trim() || undefined
      };
      
      // Step 1: Validate ReadOnlyKey and AccountGUID
      const step1Result = await validateCredentialsStep1(
        readOnlyAccessKey,
        currencyAccountGuid,
        currencyCode
      );
      
      if (!step1Result.success) {
        setErrorMessage(step1Result.error || 'Error validating credentials');
        setRawErrorResponse(step1Result.rawResponse || null);
        setErrorPopupVisible(true);
        setValidationStep(step1Result.step || 0);
        setIsLoading(false);
        return;
      }
      
      setValidationStep(1);
      
      // Step 2: Validate accountId
      const step2Result = await validateCredentialsStep2(
        readOnlyAccessKey,
        currencyAccountGuid,
        currencyAccountNumber
      );
      
      if (!step2Result.success) {
        setErrorMessage(step2Result.error || 'Error validating account number');
        setRawErrorResponse(step2Result.rawResponse || null);
        setErrorPopupVisible(true);
        setValidationStep(step2Result.step || 1);
        setIsLoading(false);
        return;
      }
      
      // Store account balance from step 2 response
      try {
        if (step2Result.data) {
          if (step2Result.data.value && typeof step2Result.data.value.balance === 'number') {
            setAccountBalance(step2Result.data.value.balance);
          } else if (typeof step2Result.data.balance === 'number') {
            setAccountBalance(step2Result.data.balance);
          }
        }
      } catch (balanceError) {
        console.error('Error extracting account balance:', balanceError);
      }
      
      setValidationStep(2);
      
      // Step 3: Validate CustomerID
      const step3Result = await validateCredentialsStep3(
        readOnlyAccessKey,
        clientId
      );
      
      if (!step3Result.success) {
        setErrorMessage(step3Result.error || 'Error validating client ID');
        setRawErrorResponse(step3Result.rawResponse || null);
        setErrorPopupVisible(true);
        setValidationStep(step3Result.step || 2);
        setIsLoading(false);
        return;
      }
      
      // Store customer balance from step 3 response
      try {
        if (step3Result.data) {
          if (step3Result.data.value && typeof step3Result.data.value.balance === 'number') {
            setCustomerBalance(step3Result.data.value.balance);
          } else if (typeof step3Result.data.balance === 'number') {
            setCustomerBalance(step3Result.data.balance);
          }
        }
      } catch (balanceError) {
        console.error('Error extracting customer balance:', balanceError);
      }
      
      setValidationStep(3);
      
      // All validation steps passed, save credentials
      setCredentials(credentials);
      
    } catch (error) {
      console.error('Authentication error:', error);
      
      // Create detailed error message
      let errorMsg = '';
      let rawError = '';
      
      if (error instanceof Error) {
        errorMsg = `Failed to authenticate: ${error.message}`;
        rawError = JSON.stringify({
          name: error.name,
          message: error.message,
          stack: error.stack
        }, null, 2);
      } else {
        errorMsg = `Failed to authenticate: ${String(error)}`;
        rawError = String(error);
      }
      
      setErrorMessage(errorMsg);
      setRawErrorResponse(rawError);
      setErrorPopupVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Fill in example credentials
  const fillExampleCredentials = () => {
    // Example credentials from the API documentation
    setReadOnlyAccessKey('9cda1144-63ef-496a-a4da-24e03bba2608');
    setCurrencyCode('112');
    setCurrencyAccountNumber('14744');
    setClientId('10221');
    setCurrencyAccountGuid('3a4e346b-1a30-404e-b12e-4ba3414c30f8');
    setMerchantName('Отель Снежинка');
  };

  const getInputStyle = (field: string) => {
    if (validationStep > 0) {
      if (field === 'readOnlyAccessKey' || field === 'currencyAccountGuid' || field === 'currencyCode') {
        return validationStep >= 1 ? styles.validatedInput : styles.inputError;
      }
      if (field === 'currencyAccountNumber') {
        return validationStep >= 2 ? styles.validatedInput : styles.inputError;
      }
      if (field === 'clientId') {
        return validationStep >= 3 ? styles.validatedInput : styles.inputError;
      }
    }
    return errors[field] ? styles.inputError : {};
  };

  // Display the start screen if the setup form is not shown
  if (!showSetupForm) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar style={darkMode ? 'light' : 'dark'} />
        
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
          <View style={[styles.welcomeContainer, { backgroundColor: theme.background }]}>
            <View style={styles.logoContainer}>
              <Image source={IMAGES.logo} style={styles.welcomeLogo} />
            </View>
            
            <Text style={[styles.welcomeTitle, { color: theme.text }]}>
               {language === 'en' ? 'Terminal' : 'Касса'}
            </Text>
            
            <Text style={[styles.welcomeSubtitle, { color: theme.text }]}>
              {language === 'en' 
                ? 'Mobile terminal for payment processing' 
                : 'Мобильная касса для приёма платежей'}
            </Text>
            
            <View style={styles.welcomeButtons}>
              <Button
                title={language === 'en' ? 'Setup Terminal' : 'Настроить кассу'}
                onPress={() => setShowSetupForm(true)}
                style={styles.setupButton}
              />
            </View>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style={darkMode ? 'light' : 'dark'} />
      
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.header}>
                <Image source={IMAGES.logo} style={styles.logo} />
                <Text style={[styles.title, { color: theme.text }]}>
                   {language === 'en' ? 'Terminal' : 'Касса'}
                </Text>
                <Text style={[styles.subtitle, { color: theme.text }]}>
                  {language === 'en' 
                    ? 'To work with the terminal, you need to authorize your workplace. Please prepare the following data from your personal account at merch.mpspay.ru:' 
                    : 'Для работы в кассе вам нужно авторизовать рабочее место, для этого приготовьте следующие данные из личного кабинета merch.mpspay.ru:'}
                </Text>
              </View>

              <View style={styles.form}>
                {errors.form && (
                  <Text style={[styles.formError, { color: theme.notification }]}>
                    {errors.form}
                  </Text>
                )}
                
                {/* ReadOnly Access Key */}
                {Platform.OS === 'web' ? (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ 
                      color: theme.text, 
                      fontSize: 16, 
                      fontWeight: '500', 
                      marginBottom: 8 
                    }}>
                      {language === 'en' ? 'ReadOnly Access Key *' : 'ReadOnly ключ доступа *'}
                    </Text>
                    <input
                      style={{
                        width: '100%',
                        height: 48,
                        borderWidth: 1,
                        borderColor: errors.readOnlyAccessKey ? theme.notification : theme.border,
                        borderRadius: 8,
                        padding: '12px',
                        fontSize: 16,
                        backgroundColor: theme.background,
                        color: theme.text,
                        outline: 'none',
                        borderStyle: 'solid',
                        boxSizing: 'border-box',
                        ...StyleSheet.flatten(getInputStyle('readOnlyAccessKey'))
                      }}
                      placeholder=""
                      value={readOnlyAccessKey}
                      onChange={e => setReadOnlyAccessKey(e.target.value)}
                      autoFocus
                    />
                    {errors.readOnlyAccessKey && (
                      <Text style={{ color: theme.notification, fontSize: 12, marginTop: 4 }}>
                        {errors.readOnlyAccessKey}
                      </Text>
                    )}
                  </View>
                ) : (
                  <Input
                    label={language === 'en' ? 'ReadOnly Access Key *' : 'ReadOnly ключ доступа *'}
                    value={readOnlyAccessKey}
                    onChangeText={setReadOnlyAccessKey}
                    error={errors.readOnlyAccessKey}
                    darkMode={darkMode}
                    style={getInputStyle('readOnlyAccessKey')}
                    autoFocus
                  />
                )}

                {/* Currency Code */}
                {Platform.OS === 'web' ? (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ 
                      color: theme.text, 
                      fontSize: 16, 
                      fontWeight: '500', 
                      marginBottom: 8 
                    }}>
                      {language === 'en' ? 'Currency Code *' : 'Код валюты *'}
                    </Text>
                    <input
                      style={{
                        width: '100%',
                        height: 48,
                        borderWidth: 1,
                        borderColor: errors.currencyCode ? theme.notification : theme.border,
                        borderRadius: 8,
                        padding: '12px',
                        fontSize: 16,
                        backgroundColor: theme.background,
                        color: theme.text,
                        outline: 'none',
                        borderStyle: 'solid',
                        boxSizing: 'border-box',
                        ...StyleSheet.flatten(getInputStyle('currencyCode'))
                      }}
                      placeholder=""
                      value={currencyCode}
                      onChange={e => setCurrencyCode(e.target.value)}
                      type="number"
                    />
                    {errors.currencyCode && (
                      <Text style={{ color: theme.notification, fontSize: 12, marginTop: 4 }}>
                        {errors.currencyCode}
                      </Text>
                    )}
                  </View>
                ) : (
                  <Input
                    label={language === 'en' ? 'Currency Code *' : 'Код валюты *'}
                    value={currencyCode}
                    onChangeText={setCurrencyCode}
                    error={errors.currencyCode}
                    darkMode={darkMode}
                    style={getInputStyle('currencyCode')}
                    keyboardType="numeric"
                  />
                )}

                {/* Currency Account Number */}
                {Platform.OS === 'web' ? (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ 
                      color: theme.text, 
                      fontSize: 16, 
                      fontWeight: '500', 
                      marginBottom: 8 
                    }}>
                      {language === 'en' ? 'Currency Account Number *' : 'Номер счёта валюты *'}
                    </Text>
                    <input
                      style={{
                        width: '100%',
                        height: 48,
                        borderWidth: 1,
                        borderColor: errors.currencyAccountNumber ? theme.notification : theme.border,
                        borderRadius: 8,
                        padding: '12px',
                        fontSize: 16,
                        backgroundColor: theme.background,
                        color: theme.text,
                        outline: 'none',
                        borderStyle: 'solid',
                        boxSizing: 'border-box',
                        ...StyleSheet.flatten(getInputStyle('currencyAccountNumber'))
                      }}
                      placeholder=""
                      value={currencyAccountNumber}
                      onChange={e => setCurrencyAccountNumber(e.target.value)}
                      type="number"
                    />
                    {errors.currencyAccountNumber && (
                      <Text style={{ color: theme.notification, fontSize: 12, marginTop: 4 }}>
                        {errors.currencyAccountNumber}
                      </Text>
                    )}
                  </View>
                ) : (
                  <Input
                    label={language === 'en' ? 'Currency Account Number *' : 'Номер счёта валюты *'}
                    value={currencyAccountNumber}
                    onChangeText={setCurrencyAccountNumber}
                    error={errors.currencyAccountNumber}
                    darkMode={darkMode}
                    style={getInputStyle('currencyAccountNumber')}
                    keyboardType="numeric"
                  />
                )}

                {/* Client ID */}
                {Platform.OS === 'web' ? (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ 
                      color: theme.text, 
                      fontSize: 16, 
                      fontWeight: '500', 
                      marginBottom: 8 
                    }}>
                      {language === 'en' ? 'Client ID *' : 'ID клиента *'}
                    </Text>
                    <input
                      style={{
                        width: '100%',
                        height: 48,
                        borderWidth: 1,
                        borderColor: errors.clientId ? theme.notification : theme.border,
                        borderRadius: 8,
                        padding: '12px',
                        fontSize: 16,
                        backgroundColor: theme.background,
                        color: theme.text,
                        outline: 'none',
                        borderStyle: 'solid',
                        boxSizing: 'border-box',
                        ...StyleSheet.flatten(getInputStyle('clientId'))
                      }}
                      placeholder=""
                      value={clientId}
                      onChange={e => setClientId(e.target.value)}
                      type="number"
                    />
                    {errors.clientId && (
                      <Text style={{ color: theme.notification, fontSize: 12, marginTop: 4 }}>
                        {errors.clientId}
                      </Text>
                    )}
                  </View>
                ) : (
                  <Input
                    label={language === 'en' ? 'Client ID *' : 'ID клиента *'}
                    value={clientId}
                    onChangeText={setClientId}
                    error={errors.clientId}
                    darkMode={darkMode}
                    style={getInputStyle('clientId')}
                    keyboardType="numeric"
                  />
                )}

                {/* Currency Account GUID */}
                {Platform.OS === 'web' ? (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ 
                      color: theme.text, 
                      fontSize: 16, 
                      fontWeight: '500', 
                      marginBottom: 8 
                    }}>
                      {language === 'en' ? 'Currency Account GUID *' : 'GUID счёта валюты *'}
                    </Text>
                    <input
                      style={{
                        width: '100%',
                        height: 48,
                        borderWidth: 1,
                        borderColor: errors.currencyAccountGuid ? theme.notification : theme.border,
                        borderRadius: 8,
                        padding: '12px',
                        fontSize: 16,
                        backgroundColor: theme.background,
                        color: theme.text,
                        outline: 'none',
                        borderStyle: 'solid',
                        boxSizing: 'border-box',
                        ...StyleSheet.flatten(getInputStyle('currencyAccountGuid'))
                      }}
                      placeholder=""
                      value={currencyAccountGuid}
                      onChange={e => setCurrencyAccountGuid(e.target.value)}
                    />
                    {errors.currencyAccountGuid && (
                      <Text style={{ color: theme.notification, fontSize: 12, marginTop: 4 }}>
                        {errors.currencyAccountGuid}
                      </Text>
                    )}
                  </View>
                ) : (
                  <Input
                    label={language === 'en' ? 'Currency Account GUID *' : 'GUID счёта валюты *'}
                    value={currencyAccountGuid}
                    onChangeText={setCurrencyAccountGuid}
                    error={errors.currencyAccountGuid}
                    darkMode={darkMode}
                    style={getInputStyle('currencyAccountGuid')}
                  />
                )}

                {/* Merchant Name */}
                {Platform.OS === 'web' ? (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ 
                      color: theme.text, 
                      fontSize: 16, 
                      fontWeight: '500', 
                      marginBottom: 8 
                    }}>
                      {language === 'en' ? 'Merchant Name (Optional)' : 'Имя продавца (необязательно)'}
                    </Text>
                    <input
                      style={{
                        width: '100%',
                        height: 48,
                        borderWidth: 1,
                        borderColor: errors.merchantName ? theme.notification : theme.border,
                        borderRadius: 8,
                        padding: '12px',
                        fontSize: 16,
                        backgroundColor: theme.background,
                        color: theme.text,
                        outline: 'none',
                        borderStyle: 'solid',
                        boxSizing: 'border-box'
                      }}
                      placeholder=""
                      value={merchantName}
                      onChange={e => setMerchantName(e.target.value)}
                      maxLength={50}
                    />
                    {errors.merchantName && (
                      <Text style={{ color: theme.notification, fontSize: 12, marginTop: 4 }}>
                        {errors.merchantName}
                      </Text>
                    )}
                  </View>
                ) : (
                  <Input
                    label={language === 'en' ? 'Merchant Name (Optional)' : 'Имя продавца (необязательно)'}
                    value={merchantName}
                    onChangeText={setMerchantName}
                    error={errors.merchantName}
                    darkMode={darkMode}
                    maxLength={50}
                  />
                )}

                {/* Display account balance if available */}
                {accountBalance !== null && validationStep >= 2 && (
                  <View style={[styles.balanceInfo, { backgroundColor: theme.card }]}>
                    <Text style={[styles.balanceLabel, { color: theme.text }]}>
                      {language === 'en' ? 'Account Balance:' : 'Баланс счета:'}
                    </Text>
                    <Text style={[styles.balanceValue, { color: theme.text }]}>
                      ₽{accountBalance.toLocaleString()}
                    </Text>
                  </View>
                )}
                
                {/* Display customer balance if available */}
                {customerBalance !== null && validationStep >= 3 && (
                  <View style={[styles.balanceInfo, { backgroundColor: theme.card }]}>
                    <Text style={[styles.balanceLabel, { color: theme.text }]}>
                      {language === 'en' ? 'Customer Balance:' : 'Баланс клиента:'}
                    </Text>
                    <Text style={[styles.balanceValue, { color: theme.text }]}>
                      ₽{customerBalance.toLocaleString()}
                    </Text>
                  </View>
                )}

                <Button
                  title={language === 'en' ? 'Authorize Terminal' : 'Авторизовать кассу'}
                  onPress={handleSubmit}
                  loading={isLoading}
                  disabled={isLoading}
                  style={styles.submitButton}
                />
                
                <Button
                  title={language === 'en' ? 'Fill Test Data' : 'Заполнить тестовыми данными'}
                  onPress={fillExampleCredentials}
                  variant="outline"
                  style={styles.testButton}
                />
                
                <Button
                  title={language === 'en' ? 'Back' : 'Назад'}
                  onPress={() => setShowSetupForm(false)}
                  variant="outline"
                  style={styles.backButton}
                />
              </View>

              <Text style={[styles.helpText, { color: theme.textSecondary }]}>
                {language === 'en' 
                  ? 'Need help? Contact your manager or visit merch.mpspay.ru' 
                  : 'Нужна помощь? Свяжитесь с вашим менеджером или посетите merch.mpspay.ru'}
              </Text>
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
      
      <ErrorPopup
        visible={errorPopupVisible}
        message={errorMessage}
        onClose={() => setErrorPopupVisible(false)}
        darkMode={darkMode}
        title={language === 'en' ? 'Validation Error' : 'Ошибка валидации'}
        rawResponse={rawErrorResponse || undefined}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: Platform.OS === 'ios' ? 30 : 20, // Increase top padding for iOS
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 10,
    borderRadius: 50,
  },
  title: {
    fontSize: Platform.OS === 'android' ? 24 : 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: Platform.OS === 'android' ? 13 : 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  form: {
    marginBottom: 24,
  },
  formError: {
    textAlign: 'center',
    marginBottom: 16,
  },
  submitButton: {
    marginTop: 16,
    // Increase button height for iOS
    height: Platform.OS === 'ios' ? 52 : 48,
  },
  testButton: {
    marginTop: 12,
    // Increase button height for iOS
    height: Platform.OS === 'ios' ? 52 : 48,
  },
  backButton: {
    marginTop: 12,
    // Increase button height for iOS
    height: Platform.OS === 'ios' ? 52 : 48,
  },
  helpText: {
    textAlign: 'center',
    fontSize: Platform.OS === 'android' ? 12 : 14,
    marginBottom: Platform.OS === 'ios' ? 20 : 0, // Add bottom padding for iOS
  },
  validatedInput: {
    borderColor: colors.light.secondary,
    backgroundColor: colors.light.secondary + '10',
  },
  inputError: {
    borderColor: colors.light.notification,
  },
  // Styles for the start screen
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logoContainer: {
    marginBottom: 20,
  },
  welcomeLogo: {
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  welcomeTitle: {
    fontSize: Platform.OS === 'android' ? 32 : 36,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: Platform.OS === 'android' ? 16 : 18,
    textAlign: 'center',
    marginBottom: 40,
  },
  welcomeButtons: {
    width: '100%',
    maxWidth: 300,
  },
  setupButton: {
    height: Platform.OS === 'android' ? 52 : 56,
  },
  // Balance info styles
  balanceInfo: {
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  balanceValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
