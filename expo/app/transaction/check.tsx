import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ErrorPopup } from '@/components/ErrorPopup';
import { useAuthStore } from '@/store/auth-store';
import { useLanguageStore } from '@/store/language-store';
import { useThemeStore } from '@/store/theme-store';
import { checkTransactionStatus } from '@/utils/api';
import { Transaction } from '@/types/api';
import colors from '@/constants/colors';
import { ArrowLeft, Search, CheckCircle, XCircle, Clock, ArrowRight } from 'lucide-react-native';

export default function CheckTransactionScreen() {
  const router = useRouter();
  const credentials = useAuthStore((state) => state.credentials);
  const { language } = useLanguageStore();
  const { darkMode } = useThemeStore();
  const theme = darkMode ? colors.dark : colors.light;
  
  const [transactionId, setTransactionId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawErrorResponse, setRawErrorResponse] = useState<string | null>(null);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  
  // Translations
  const getTranslation = (en: string, ru: string): string => {
    return language === 'en' ? en : ru;
  };
  
  const handleCheck = async () => {
    if (!transactionId.trim()) {
      setError(getTranslation(
        'Please enter a transaction ID',
        'Пожалуйста, введите ID транзакции'
      ));
      return;
    }
    
    if (!credentials) {
      setError(getTranslation(
        'You need to be logged in to check transaction status',
        'Вы должны быть авторизованы для проверки статуса транзакции'
      ));
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setTransaction(null);
    
    try {
      const result = await checkTransactionStatus(credentials, transactionId.trim());
      
      if (result.found && result.transaction) {
        setTransaction(result.transaction);
      } else {
        setError(result.error || getTranslation(
          'Transaction not found',
          'Транзакция не найдена'
        ));
        setRawErrorResponse(result.rawResponse || null);
        setShowErrorPopup(true);
      }
    } catch (err) {
      console.error('Error checking transaction status:', err);
      
      // Create detailed error message
      let errorMsg = '';
      let rawError = '';
      
      if (err instanceof Error) {
        errorMsg = `Error: ${err.message}`;
        rawError = JSON.stringify({
          name: err.name,
          message: err.message,
          stack: err.stack
        }, null, 2);
      } else {
        errorMsg = `Unknown error: ${String(err)}`;
        rawError = String(err);
      }
      
      setError(errorMsg);
      setRawErrorResponse(rawError);
      setShowErrorPopup(true);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleViewDetails = () => {
    if (transaction) {
      router.push(`/transaction/${transaction.id}`);
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': // Success
        return theme.secondary;
      case 'failed': // Failed
        return theme.notification;
      case 'pending': // Processing
      default:
        return theme.primary;
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': // Success
        return <CheckCircle size={24} color={theme.secondary} />;
      case 'failed': // Failed
        return <XCircle size={24} color={theme.notification} />;
      case 'pending': // Processing
      default:
        return <Clock size={24} color={theme.primary} />;
    }
  };
  
  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return getTranslation('Completed', 'Оплачен');
      case 'failed':
        return getTranslation('Failed', 'Не оплачен');
      case 'pending':
      default:
        return getTranslation('Processing', 'В обработке');
    }
  };
  
  return (
    <>
      <Stack.Screen 
        options={{ 
          title: getTranslation('Check Transaction Status', 'Проверка статуса транзакции'),
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <ArrowLeft size={24} color={theme.text} />
            </TouchableOpacity>
          ),
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
          <Card style={styles.card}>
            <Text style={[styles.title, { color: theme.text }]}>
              {getTranslation('Check Transaction Status', 'Проверка статуса транзакции')}
            </Text>
            
            <Text style={[styles.description, { color: theme.placeholder }]}>
              {getTranslation(
                'Enter the transaction ID to check its current status',
                'Введите ID транзакции для проверки ее текущего статуса'
              )}
            </Text>
            
            <View style={styles.inputContainer}>
              <Input
                placeholder={getTranslation('Transaction ID', 'ID транзакции')}
                value={transactionId}
                onChangeText={setTransactionId}
                darkMode={darkMode}
                autoCapitalize="none"
                style={styles.input}
                keyboardType="numeric"
              />
              
              <Button
                title={getTranslation('Check', 'Проверить')}
                onPress={handleCheck}
                loading={isLoading}
                icon={!isLoading ? <Search size={20} color="white" /> : undefined}
                style={styles.checkButton}
              />
            </View>
            
            {error && !showErrorPopup && (
              <Text style={[styles.errorText, { color: theme.notification }]}>
                {error}
              </Text>
            )}
            
            {transaction && (
              <View style={styles.resultContainer}>
                <View style={styles.statusHeader}>
                  {getStatusIcon(transaction.status)}
                  <Text style={[styles.statusText, { color: getStatusColor(transaction.status) }]}>
                    {getStatusText(transaction.status)}
                  </Text>
                </View>
                
                <View style={styles.transactionDetails}>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.placeholder }]}>
                      {getTranslation('Transaction ID', 'ID транзакции')}
                    </Text>
                    <Text style={[styles.detailValue, { color: theme.text }]}>
                      {transaction.id}
                    </Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.placeholder }]}>
                      {getTranslation('Amount', 'Сумма')}
                    </Text>
                    <Text style={[styles.detailValue, { color: theme.text }]}>
                      ₽{transaction.amount.toLocaleString(undefined, {maximumFractionDigits: 2})}
                    </Text>
                  </View>
                  
                  {transaction.commission !== undefined && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: theme.placeholder }]}>
                        {getTranslation('Commission', 'Комиссия')}
                      </Text>
                      <Text style={[styles.detailValue, { color: theme.text }]}>
                        ₽{transaction.commission.toLocaleString(undefined, {maximumFractionDigits: 2})}
                      </Text>
                    </View>
                  )}
                  
                  {transaction.customerInfo && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: theme.placeholder }]}>
                        {getTranslation('Description', 'Описание')}
                      </Text>
                      <Text style={[styles.detailValue, { color: theme.text }]}>
                        {transaction.customerInfo}
                      </Text>
                    </View>
                  )}
                  
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.placeholder }]}>
                      {getTranslation('Date', 'Дата')}
                    </Text>
                    <Text style={[styles.detailValue, { color: theme.text }]}>
                      {new Date(transaction.finishedAt || transaction.createdAt).toLocaleString(
                        language === 'ru' ? 'ru-RU' : 'en-US'
                      )}
                    </Text>
                  </View>
                  
                  {transaction.tag && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: theme.placeholder }]}>
                        {getTranslation('SBP ID', 'СБП ID')}
                      </Text>
                      <Text style={[styles.detailValue, { color: theme.text }]}>
                        {transaction.tag}
                      </Text>
                    </View>
                  )}
                </View>
                
                <Button
                  title={getTranslation('View Details', 'Подробнее')}
                  onPress={handleViewDetails}
                  icon={<ArrowRight size={20} color="white" />}
                  style={styles.viewDetailsButton}
                />
              </View>
            )}
          </Card>
          
          <Button
            title={getTranslation('Go Back', 'Назад')}
            variant="outline"
            onPress={() => router.back()}
            style={styles.backButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
      
      <ErrorPopup
        visible={showErrorPopup}
        message={error || getTranslation('An error occurred', 'Произошла ошибка')}
        onClose={() => setShowErrorPopup(false)}
        darkMode={darkMode}
        title={getTranslation('Error', 'Ошибка')}
        rawResponse={rawErrorResponse || undefined}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  headerButton: {
    padding: 8,
  },
  card: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  input: {
    flex: 1,
    marginRight: 8,
  },
  checkButton: {
    width: 100,
  },
  errorText: {
    fontSize: 14,
    marginBottom: 16,
  },
  resultContainer: {
    marginTop: 8,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  transactionDetails: {
    marginBottom: 20,
  },
  detailRow: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  viewDetailsButton: {
    marginTop: 8,
  },
  backButton: {
    marginTop: 8,
  },
});