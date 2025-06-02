import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  TouchableOpacity,
  Keyboard,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ErrorPopup } from '@/components/ErrorPopup';
import { useAuthStore } from '@/store/auth-store';
import { useLanguageStore } from '@/store/language-store';
import { useThemeStore } from '@/store/theme-store';
import { validateCredentials, ValidationErrors } from '@/utils/validation';
import { validateCredentialsStep1, validateCredentialsStep2, validateCredentialsStep3 } from '@/utils/api';
import colors from '@/constants/colors';
import { Save, ArrowLeft, CheckCircle, XCircle, AlertCircle } from 'lucide-react-native';

export default function EditProfileScreen() {
  const router = useRouter();
  const { credentials, updateCredentials } = useAuthStore();
  const { language } = useLanguageStore();
  const { darkMode } = useThemeStore();
  const theme = darkMode ? colors.dark : colors.light;
  
  const [readOnlyAccessKey, setReadOnlyAccessKey] = useState('');
  const [currencyCode, setCurrencyCode] = useState('');
  const [currencyAccountNumber, setCurrencyAccountNumber] = useState('');
  const [clientId, setClientId] = useState('');
  const [currencyAccountGuid, setCurrencyAccountGuid] = useState('');
  const [merchantName, setMerchantName] = useState('');
  
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationStep, setValidationStep] = useState(0);
  const [validationResults, setValidationResults] = useState<{
    step1: boolean;
    step2: boolean;
    step3: boolean;
  }>({
    step1: false,
    step2: false,
    step3: false
  });
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  
  // Initialize form with current credentials
  useEffect(() => {
    if (credentials) {
      setReadOnlyAccessKey(credentials.readOnlyAccessKey || '');
      setCurrencyCode(credentials.currencyCode || '');
      setCurrencyAccountNumber(credentials.currencyAccountNumber || '');
      setClientId(credentials.clientId || '');
      setCurrencyAccountGuid(credentials.currencyAccountGuid || '');
      setMerchantName(credentials.merchantName || '');
    }
  }, [credentials]);
  
  const validate = () => {
    const newCredentials = {
      readOnlyAccessKey,
      currencyCode,
      currencyAccountNumber,
      clientId,
      currencyAccountGuid,
      merchantName
    };
    
    const validationErrors = validateCredentials(newCredentials, language);
    
    // Check merchant name
    if (merchantName && merchantName.length > 50) {
      validationErrors.merchantName = language === 'en' 
        ? 'Merchant name should not exceed 50 characters'
        : 'Имя продавца не должно превышать 50 символов';
    }
    
    setErrors(validationErrors);
    
    return Object.keys(validationErrors).length === 0;
  };
  
  const validateWithAPI = async () => {
    if (!validate()) return false;
    
    setIsValidating(true);
    setValidationStep(1);
    setValidationResults({
      step1: false,
      step2: false,
      step3: false
    });
    
    try {
      // Step 1: Validate ReadOnlyKey and AccountGUID
      const step1Result = await validateCredentialsStep1(
        readOnlyAccessKey,
        currencyAccountGuid,
        currencyCode
      );
      
      if (!step1Result.success) {
        const errorMessage = step1Result.error || (language === 'en' ? "API validation failed" : "Ошибка валидации API");
        setErrors({
          ...errors,
          readOnlyAccessKey: language === 'en' 
            ? `API Error: ${step1Result.error || "Unknown error"}`
            : `Ошибка API: ${step1Result.error || "Неизвестная ошибка"}`,
          form: errorMessage
        });
        setErrorDetails(step1Result.rawResponse || null);
        setShowErrorPopup(true);
        setValidationResults({...validationResults, step1: false});
        return false;
      }
      
      setValidationResults({...validationResults, step1: true});
      setValidationStep(2);
      
      // Step 2: Validate AccountNumber
      const step2Result = await validateCredentialsStep2(
        readOnlyAccessKey,
        currencyAccountGuid,
        currencyAccountNumber
      );
      
      if (!step2Result.success) {
        const errorMessage = step2Result.error || (language === 'en' ? "API validation failed" : "Ошибка валидации API");
        setErrors({
          ...errors,
          currencyAccountNumber: language === 'en' 
            ? `API Error: ${step2Result.error || "Unknown error"}`
            : `Ошибка API: ${step2Result.error || "Неизвестная ошибка"}`,
          form: errorMessage
        });
        setErrorDetails(step2Result.rawResponse || null);
        setShowErrorPopup(true);
        setValidationResults({...validationResults, step1: true, step2: false});
        return false;
      }
      
      setValidationResults({...validationResults, step1: true, step2: true});
      setValidationStep(3);
      
      // Step 3: Validate ClientID
      const step3Result = await validateCredentialsStep3(
        readOnlyAccessKey,
        clientId
      );
      
      if (!step3Result.success) {
        const errorMessage = step3Result.error || (language === 'en' ? "API validation failed" : "Ошибка валидации API");
        setErrors({
          ...errors,
          clientId: language === 'en' 
            ? `API Error: ${step3Result.error || "Unknown error"}`
            : `Ошибка API: ${step3Result.error || "Неизвестная ошибка"}`,
          form: errorMessage
        });
        setErrorDetails(step3Result.rawResponse || null);
        setShowErrorPopup(true);
        setValidationResults({...validationResults, step1: true, step2: true, step3: false});
        return false;
      }
      
      setValidationResults({step1: true, step2: true, step3: true});
      return true;
    } catch (error) {
      console.error('Error validating credentials with API:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setErrors({
        ...errors,
        form: language === 'en' 
          ? `Error validating credentials: ${errorMessage}`
          : `Ошибка проверки учетных данных: ${errorMessage}`
      });
      setErrorDetails(error instanceof Error ? error.stack || error.message : String(error));
      setShowErrorPopup(true);
      return false;
    } finally {
      setIsValidating(false);
    }
  };
  
  const handleSave = async () => {
    if (!validate()) return;
    
    setIsLoading(true);
    
    try {
      // Validate with API
      const isValid = await validateWithAPI();
      
      if (!isValid) {
        setIsLoading(false);
        return;
      }
      
      // Update credentials in store
      const updatedCredentials = {
        readOnlyAccessKey,
        currencyCode,
        currencyAccountNumber,
        clientId,
        currencyAccountGuid,
        merchantName: merchantName.trim() || undefined
      };
      
      updateCredentials(updatedCredentials);
      
      Alert.alert(
        language === 'en' ? 'Profile Updated' : 'Профиль обновлен',
        language === 'en' 
          ? 'Your profile information has been successfully updated.'
          : 'Информация вашего профиля была успешно обновлена.',
        [{ 
          text: 'OK', 
          onPress: () => router.back() 
        }]
      );
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert(
        language === 'en' ? 'Update Failed' : 'Ошибка обновления',
        language === 'en'
          ? 'Failed to update profile information. Please try again.'
          : 'Не удалось обновить информацию профиля. Пожалуйста, попробуйте снова.'
      );
    } finally {
      setIsLoading(false);
    }
  };
  
  const renderValidationStatus = () => {
    if (!isValidating && validationStep === 0) return null;
    
    return (
      <Card style={styles.validationCard}>
        <Text style={[styles.validationTitle, { color: theme.text }]}>
          {language === 'en' ? 'API Validation Status' : 'Статус проверки API'}
        </Text>
        
        <View style={styles.validationStep}>
          <View style={styles.validationStepIcon}>
            {validationResults.step1 ? (
              <CheckCircle size={20} color={theme.success} />
            ) : validationStep > 1 ? (
              <XCircle size={20} color={theme.notification} />
            ) : validationStep === 1 ? (
              isValidating ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <AlertCircle size={20} color={theme.warning} />
              )
            ) : (
              <AlertCircle size={20} color={theme.placeholder} />
            )}
          </View>
          <View style={styles.validationStepContent}>
            <Text style={[styles.validationStepTitle, { 
              color: validationStep >= 1 ? theme.text : theme.placeholder 
            }]}>
              {language === 'en' ? 'Step 1: Validate API Key & Account GUID' : 'Шаг 1: Проверка ключа API и GUID счета'}
            </Text>
          </View>
        </View>
        
        <View style={styles.validationStep}>
          <View style={styles.validationStepIcon}>
            {validationResults.step2 ? (
              <CheckCircle size={20} color={theme.success} />
            ) : validationStep > 2 ? (
              <XCircle size={20} color={theme.notification} />
            ) : validationStep === 2 ? (
              isValidating ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <AlertCircle size={20} color={theme.warning} />
              )
            ) : (
              <AlertCircle size={20} color={theme.placeholder} />
            )}
          </View>
          <View style={styles.validationStepContent}>
            <Text style={[styles.validationStepTitle, { 
              color: validationStep >= 2 ? theme.text : theme.placeholder 
            }]}>
              {language === 'en' ? 'Step 2: Validate Account Number' : 'Шаг 2: Проверка номера счета'}
            </Text>
          </View>
        </View>
        
        <View style={styles.validationStep}>
          <View style={styles.validationStepIcon}>
            {validationResults.step3 ? (
              <CheckCircle size={20} color={theme.success} />
            ) : validationStep > 3 ? (
              <XCircle size={20} color={theme.notification} />
            ) : validationStep === 3 ? (
              isValidating ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <AlertCircle size={20} color={theme.warning} />
              )
            ) : (
              <AlertCircle size={20} color={theme.placeholder} />
            )}
          </View>
          <View style={styles.validationStepContent}>
            <Text style={[styles.validationStepTitle, { 
              color: validationStep >= 3 ? theme.text : theme.placeholder 
            }]}>
              {language === 'en' ? 'Step 3: Validate Client ID' : 'Шаг 3: Проверка ID клиента'}
            </Text>
          </View>
        </View>
      </Card>
    );
  };
  
  return (
    <>
      <Stack.Screen 
        options={{
          title: language === 'en' ? 'Edit Profile' : 'Редактировать профиль',
          headerTintColor: theme.text,
          headerStyle: {
            backgroundColor: theme.background,
          },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color={theme.text} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={handleSave} disabled={isLoading || isValidating}>
              <Save size={24} color={theme.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {language === 'en' ? 'Account Information' : 'Информация об аккаунте'}
          </Text>
          
          <View style={[styles.formContainer, { backgroundColor: theme.card }]}>
            <Input
              label={language === 'en' ? 'Read Only Access Key' : 'Ключ доступа Read Only'}
              placeholder="9cda1144-63ef-496a-a4da-24e03bba2608"
              value={readOnlyAccessKey}
              onChangeText={setReadOnlyAccessKey}
              error={errors.readOnlyAccessKey}
              autoCapitalize="none"
              darkMode={darkMode}
            />
            
            <Input
              label={language === 'en' ? 'Currency Code' : 'Код валюты'}
              placeholder={language === 'en' ? 'e.g., 112 for RUB' : 'например, 112 для RUB'}
              value={currencyCode}
              onChangeText={setCurrencyCode}
              error={errors.currencyCode}
              keyboardType="numeric"
              darkMode={darkMode}
            />
            
            <Input
              label={language === 'en' ? 'Currency Account Number' : 'Номер счета валюты'}
              placeholder={language === 'en' ? '5-8 digits, e.g.: 14744' : '5-8 цифр, например: 14744'}
              value={currencyAccountNumber}
              onChangeText={setCurrencyAccountNumber}
              error={errors.currencyAccountNumber}
              keyboardType="numeric"
              darkMode={darkMode}
            />
            
            <Input
              label={language === 'en' ? 'Client ID' : 'Клиентский номер'}
              placeholder={language === 'en' ? '5-8 digits, e.g.: 10221' : '5-8 цифр, например: 10221'}
              value={clientId}
              onChangeText={setClientId}
              error={errors.clientId}
              keyboardType="numeric"
              darkMode={darkMode}
            />
            
            <Input
              label={language === 'en' ? 'Currency Account GUID' : 'GUID счета валюты'}
              placeholder="3a4e346b-1a30-404e-b12e-4ba3414c30f8"
              value={currencyAccountGuid}
              onChangeText={setCurrencyAccountGuid}
              error={errors.currencyAccountGuid}
              autoCapitalize="none"
              darkMode={darkMode}
            />
          </View>
          
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {language === 'en' ? 'Business Information' : 'Информация о бизнесе'}
          </Text>
          
          <View style={[styles.formContainer, { backgroundColor: theme.card }]}>
            <Input
              label={language === 'en' ? 'Merchant Name' : 'Имя продавца'}
              placeholder={language === 'en' ? 'e.g.: Snow Hotel or Shoelace Online Store' : 'Например: Отель Снежинка или Интернет магазин шнурков'}
              value={merchantName}
              onChangeText={setMerchantName}
              error={errors.merchantName}
              maxLength={50}
              darkMode={darkMode}
            />
          </View>
          
          {renderValidationStatus()}
          
          {errors.form && (
            <View style={styles.formErrorContainer}>
              <Text style={[styles.formErrorText, { color: theme.notification }]}>
                {errors.form}
              </Text>
            </View>
          )}
          
          <Button
            title={language === 'en' ? 'Validate & Save Changes' : 'Проверить и сохранить'}
            onPress={handleSave}
            loading={isLoading || isValidating}
            style={styles.saveButton}
          />
          
          <Button
            title={language === 'en' ? 'Cancel' : 'Отмена'}
            variant="outline"
            onPress={() => router.back()}
            style={styles.cancelButton}
            disabled={isLoading || isValidating}
          />
          
          <Text style={[styles.disclaimer, { color: theme.placeholder }]}>
            {language === 'en' 
              ? 'These credentials are used to connect to the MPSPAY payment system. Please ensure they are entered correctly.'
              : 'Эти учетные данные используются для подключения к платежной системе MPSPAY. Пожалуйста, убедитесь, что они введены правильно.'}
          </Text>
        </ScrollView>
        
        <ErrorPopup
          visible={showErrorPopup}
          message={errors.form || (language === 'en' ? 'An error occurred' : 'Произошла ошибка')}
          onClose={() => setShowErrorPopup(false)}
          darkMode={darkMode}
          title={language === 'en' ? 'Validation Error' : 'Ошибка проверки'}
          rawResponse={errorDetails}
        />
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 16,
  },
  formContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  saveButton: {
    marginTop: 24,
  },
  cancelButton: {
    marginTop: 12,
  },
  disclaimer: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24,
    marginHorizontal: 16,
  },
  validationCard: {
    marginTop: 16,
    marginBottom: 16,
    padding: 16,
  },
  validationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  validationStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  validationStepIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  validationStepContent: {
    flex: 1,
  },
  validationStepTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  formErrorContainer: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  formErrorText: {
    fontSize: 14,
  },
});