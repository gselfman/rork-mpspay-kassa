import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Share,
  ActivityIndicator,
  Linking,
  Platform,
  Alert
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { useTransactionStore } from '@/store/transaction-store';
import { useAuthStore } from '@/store/auth-store';
import { useLanguageStore } from '@/store/language-store';
import { useThemeStore } from '@/store/theme-store';
import { checkTransactionStatus } from '@/utils/api';
import { Transaction } from '@/types/api';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { ErrorPopup } from '@/components/ErrorPopup';
import colors from '@/constants/colors';
import { 
  Clock, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Copy, 
  Share as ShareIcon,
  ExternalLink,
  AlertCircle
} from 'lucide-react-native';
import { scaleFontSize, scaleSpacing } from '@/utils/responsive';

export default function PaymentDetailsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { language } = useLanguageStore();
  const { darkMode } = useThemeStore();
  const theme = darkMode ? colors.dark : colors.light;
  
  // Get transaction ID from params
  const transactionId = params.id as string;
  
  // Get credentials from auth store
  const credentials = useAuthStore((state) => state.credentials);
  
  // Get transaction from store
  const transactions = useTransactionStore((state) => state.transactions);
  const addTransaction = useTransactionStore((state) => state.addTransaction);
  const updateTransaction = useTransactionStore((state) => state.updateTransaction);
  
  // Find transaction by ID
  const storedTransaction = transactions.find(t => t.id === transactionId) || null;
  
  // State for transaction data
  const [transaction, setTransaction] = useState<Transaction | null>(storedTransaction);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [rawErrorResponse, setRawErrorResponse] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState('15:00');
  const [isExpired, setIsExpired] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  
  // Timer ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Translations
  const getTranslation = (en: string, ru: string): string => {
    return language === 'en' ? en : ru;
  };
  
  // Status translations
  const getStatusTranslation = (status: 'pending' | 'completed' | 'failed'): string => {
    switch (status) {
      case 'pending':
        return getTranslation('Awaiting Payment', 'Ожидание оплаты');
      case 'completed':
        return getTranslation('Payment Completed', 'Платеж завершен');
      case 'failed':
        return getTranslation('Payment Failed', 'Платеж не выполнен');
      default:
        return getTranslation('Unknown Status', 'Неизвестный статус');
    }
  };
  
  // Status colors
  const getStatusColor = (status: 'pending' | 'completed' | 'failed'): string => {
    switch (status) {
      case 'pending':
        return theme.warning;
      case 'completed':
        return theme.success;
      case 'failed':
        return theme.notification;
      default:
        return theme.placeholder;
    }
  };
  
  // Status icons
  const getStatusIcon = (status: 'pending' | 'completed' | 'failed') => {
    switch (status) {
      case 'pending':
        return <Clock size={24} color={theme.warning} />;
      case 'completed':
        return <CheckCircle size={24} color={theme.success} />;
      case 'failed':
        return <XCircle size={24} color={theme.notification} />;
      default:
        return <AlertCircle size={24} color={theme.placeholder} />;
    }
  };
  
  // Format date
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };
  
  // Calculate time left
  const calculateTimeLeft = (createdAt: string): void => {
    try {
      const createdDate = new Date(createdAt);
      const expiryDate = new Date(createdDate.getTime() + 15 * 60 * 1000); // 15 minutes
      const now = new Date();
      
      // If expired
      if (now > expiryDate) {
        setTimeLeft('00:00');
        setIsExpired(true);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        return;
      }
      
      // Calculate time difference
      const diffMs = expiryDate.getTime() - now.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffSecs = Math.floor((diffMs % 60000) / 1000);
      
      // Format time
      setTimeLeft(`${diffMins.toString().padStart(2, '0')}:${diffSecs.toString().padStart(2, '0')}`);
      setIsExpired(false);
    } catch (error) {
      console.error('Error calculating time left:', error);
      setTimeLeft('--:--');
    }
  };
  
  // Start timer
  const startTimer = (createdAt: string): void => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    calculateTimeLeft(createdAt);
    
    timerRef.current = setInterval(() => {
      calculateTimeLeft(createdAt);
    }, 1000);
  };
  
  // Fetch transaction status
  const fetchTransactionStatus = async (showLoading = true): Promise<void> => {
    if (!credentials) {
      setError(getTranslation(
        'You need to be logged in to check payment status',
        'Вы должны быть авторизованы для проверки статуса платежа'
      ));
      setShowErrorPopup(true);
      return;
    }
    
    if (!transactionId) {
      setError(getTranslation(
        'Transaction ID is missing',
        'Отсутствует ID транзакции'
      ));
      setShowErrorPopup(true);
      return;
    }
    
    if (showLoading) {
      setIsRefreshing(true);
    }
    
    try {
      const result = await checkTransactionStatus(credentials, transactionId);
      
      if (result.found && result.transaction) {
        setTransaction(result.transaction);
        updateTransaction(result.transaction);
        
        // If transaction is still pending, start timer
        if (result.transaction.status === 'pending' && result.transaction.createdAt) {
          startTimer(result.transaction.createdAt);
        } else {
          // If transaction is completed or failed, stop timer
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        }
      } else {
        setError(result.error || getTranslation(
          'Failed to check payment status',
          'Не удалось проверить статус платежа'
        ));
        setRawErrorResponse(result.rawResponse || null);
        setShowErrorPopup(true);
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      
      // Create detailed error message
      let errorMsg = '';
      let rawError = '';
      
      if (error instanceof Error) {
        errorMsg = getTranslation(
          `Error: ${error.message}`,
          `Ошибка: ${error.message}`
        );
        rawError = JSON.stringify({
          name: error.name,
          message: error.message,
          stack: error.stack
        }, null, 2);
      } else {
        errorMsg = getTranslation(
          `Unknown error: ${String(error)}`,
          `Неизвестная ошибка: ${String(error)}`
        );
        rawError = String(error);
      }
      
      setError(errorMsg);
      setRawErrorResponse(rawError);
      setShowErrorPopup(true);
    } finally {
      if (showLoading) {
        setIsRefreshing(false);
      }
    }
  };
  
  // Copy transaction ID to clipboard
  const copyTransactionId = async (): Promise<void> => {
    if (!transaction) return;
    
    try {
      await navigator.clipboard.writeText(transaction.id);
      Alert.alert(
        getTranslation('Success', 'Успешно'),
        getTranslation('Transaction ID copied to clipboard', 'ID транзакции скопирован в буфер обмена')
      );
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      Alert.alert(
        getTranslation('Error', 'Ошибка'),
        getTranslation('Failed to copy to clipboard', 'Не удалось скопировать в буфер обмена')
      );
    }
  };
  
  // Share payment URL
  const sharePaymentUrl = async (): Promise<void> => {
    if (!transaction || !transaction.paymentUrl) return;
    
    try {
      const result = await Share.share({
        message: getTranslation(
          `Payment link: ${transaction.paymentUrl}`,
          `Ссылка на оплату: ${transaction.paymentUrl}`
        ),
        url: transaction.paymentUrl // iOS only
      });
      
      if (result.action === Share.sharedAction) {
        console.log('Shared successfully');
      } else if (result.action === Share.dismissedAction) {
        console.log('Share dismissed');
      }
    } catch (error) {
      console.error('Error sharing payment URL:', error);
      Alert.alert(
        getTranslation('Error', 'Ошибка'),
        getTranslation('Failed to share payment URL', 'Не удалось поделиться ссылкой на оплату')
      );
    }
  };
  
  // Open payment URL
  const openPaymentUrl = async (): Promise<void> => {
    if (!transaction || !transaction.paymentUrl) return;
    
    try {
      const supported = await Linking.canOpenURL(transaction.paymentUrl);
      
      if (supported) {
        await Linking.openURL(transaction.paymentUrl);
      } else {
        Alert.alert(
          getTranslation('Error', 'Ошибка'),
          getTranslation('Cannot open payment URL', 'Не удалось открыть ссылку на оплату')
        );
      }
    } catch (error) {
      console.error('Error opening payment URL:', error);
      Alert.alert(
        getTranslation('Error', 'Ошибка'),
        getTranslation('Failed to open payment URL', 'Не удалось открыть ссылку на оплату')
      );
    }
  };
  
  // Show debug info
  const showDebugInfo = () => {
    if (!transaction) return;
    
    const debugText = JSON.stringify({
      transactionId,
      transaction,
      hasPaymentUrl: !!transaction.paymentUrl,
      paymentUrl: transaction.paymentUrl || 'Not available',
      status: transaction.status,
      createdAt: transaction.createdAt
    }, null, 2);
    
    setDebugInfo(debugText);
    Alert.alert(
      'Debug Info',
      debugText,
      [{ text: 'OK', onPress: () => setDebugInfo(null) }]
    );
  };
  
  // Set up auto-refresh
  useEffect(() => {
    // Initial fetch
    setIsLoading(true);
    fetchTransactionStatus(false).finally(() => setIsLoading(false));
    
    // Set up auto-refresh every 30 seconds if transaction is pending
    const autoRefreshInterval = setInterval(() => {
      if (transaction && transaction.status === 'pending') {
        fetchTransactionStatus(false);
      } else {
        clearInterval(autoRefreshInterval);
      }
    }, 30000);
    
    return () => {
      // Clean up
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      clearInterval(autoRefreshInterval);
    };
  }, [transactionId]);
  
  // Start timer when transaction is loaded
  useEffect(() => {
    if (transaction && transaction.createdAt && transaction.status === 'pending') {
      startTimer(transaction.createdAt);
    }
    
    // Debug transaction data
    if (transaction) {
      console.log('Transaction data:', JSON.stringify(transaction, null, 2));
    }
  }, [transaction]);
  
  // Render loading state
  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.text }]}>
          {getTranslation('Loading payment details...', 'Загрузка деталей платежа...')}
        </Text>
      </View>
    );
  }
  
  // Render error state if no transaction
  if (!transaction) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.background }]}>
        <AlertCircle size={48} color={theme.notification} />
        <Text style={[styles.errorTitle, { color: theme.text }]}>
          {getTranslation('Payment Not Found', 'Платеж не найден')}
        </Text>
        <Text style={[styles.errorText, { color: theme.placeholder }]}>
          {getTranslation(
            'The payment you are looking for does not exist or has been removed.',
            'Платеж, который вы ищете, не существует или был удален.'
          )}
        </Text>
        <Button
          title={getTranslation('Go Back', 'Вернуться назад')}
          onPress={() => router.back()}
          style={styles.errorButton}
        />
      </View>
    );
  }
  
  return (
    <>
      <Stack.Screen 
        options={{
          title: getTranslation('Payment', 'Платеж'),
          headerRight: () => (
            <View style={styles.headerButtons}>
              <TouchableOpacity 
                onPress={showDebugInfo}
                style={styles.debugButton}
              >
                <Text style={{ color: theme.primary, fontSize: 12 }}>Debug</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => fetchTransactionStatus(true)}
                disabled={isRefreshing}
                style={styles.refreshButton}
              >
                <RefreshCw 
                  size={24} 
                  color={theme.primary} 
                  style={isRefreshing ? styles.rotating : undefined} 
                />
              </TouchableOpacity>
            </View>
          ),
        }} 
      />
      
      <ScrollView 
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Payment Status Card */}
        <Card style={[styles.statusCard, { backgroundColor: getStatusColor(transaction.status) + '20' }]}>
          <View style={styles.statusHeader}>
            {getStatusIcon(transaction.status)}
            <Text style={[styles.statusText, { color: getStatusColor(transaction.status) }]}>
              {getStatusTranslation(transaction.status)}
            </Text>
          </View>
          
          <Text style={[styles.amountText, { color: theme.text }]}>
            ₽{transaction.amount}
          </Text>
          
          {transaction.status === 'pending' && (
            <View style={styles.timerContainer}>
              <Text style={[styles.timerText, { color: theme.text }]}>
                {getTranslation('Time remaining:', 'Осталось времени:')} {timeLeft}
              </Text>
              <Text style={[styles.timerSubtext, { color: theme.placeholder }]}>
                {getTranslation(
                  'Payment link expires in 15 minutes',
                  'Ссылка на оплату истечет через 15 минут'
                )}
              </Text>
            </View>
          )}
        </Card>
        
        {/* Debug Info - Always show transaction data */}
        <Card style={styles.debugCard}>
          <Text style={[styles.debugTitle, { color: theme.text }]}>
            Debug Information
          </Text>
          <Text style={[styles.debugText, { color: theme.placeholder }]}>
            Transaction ID: {transaction.id}{'\n'}
            Status: {transaction.status}{'\n'}
            Has Payment URL: {transaction.paymentUrl ? 'Yes' : 'No'}{'\n'}
            Created At: {transaction.createdAt}
          </Text>
        </Card>
        
        {/* QR Code Card - ALWAYS show if transaction exists */}
        <Card style={styles.qrCard}>
          <View style={styles.qrContainer}>
            {transaction.paymentUrl ? (
              <QRCode
                value={transaction.paymentUrl}
                size={200}
                color={theme.text}
                backgroundColor={theme.card}
              />
            ) : (
              <View style={styles.noQrContainer}>
                <AlertCircle size={48} color={theme.notification} />
                <Text style={[styles.noQrText, { color: theme.notification }]}>
                  {getTranslation(
                    'Payment URL is missing. Cannot generate QR code.',
                    'Отсутствует URL платежа. Невозможно сгенерировать QR-код.'
                  )}
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.urlContainer}>
            <Text 
              style={[styles.urlText, { color: theme.primary }]}
              numberOfLines={1}
              ellipsizeMode="middle"
            >
              {transaction.paymentUrl || getTranslation('No payment URL available', 'URL платежа недоступен')}
            </Text>
            
            {transaction.paymentUrl && (
              <View style={styles.urlButtons}>
                <TouchableOpacity 
                  style={[styles.urlButton, { backgroundColor: theme.primary + '20' }]}
                  onPress={openPaymentUrl}
                >
                  <ExternalLink size={20} color={theme.primary} />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.urlButton, { backgroundColor: theme.primary + '20' }]}
                  onPress={sharePaymentUrl}
                >
                  <ShareIcon size={20} color={theme.primary} />
                </TouchableOpacity>
              </View>
            )}
          </View>
          
          <Text style={[styles.qrInstructions, { color: theme.placeholder }]}>
            {getTranslation(
              'Scan the QR code or open the payment link in your banking app.',
              'Отсканируйте QR-код или откройте ссылку на оплату в приложении вашего банка.'
            )}
          </Text>
        </Card>
        
        {/* Payment Details Card */}
        <Card style={styles.detailsCard}>
          <Text style={[styles.detailsTitle, { color: theme.text }]}>
            {getTranslation('Payment Details', 'Детали платежа')}
          </Text>
          
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.placeholder }]}>
              {getTranslation('Transaction ID', 'ID транзакции')}
            </Text>
            <View style={styles.detailValueContainer}>
              <Text style={[styles.detailValue, { color: theme.text }]}>
                {transaction.id}
              </Text>
              <TouchableOpacity onPress={copyTransactionId}>
                <Copy size={16} color={theme.placeholder} />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.placeholder }]}>
              {getTranslation('Customer', 'Покупатель')}
            </Text>
            <Text style={[styles.detailValue, { color: theme.text }]}>
              {transaction.customerInfo || getTranslation('Not specified', 'Не указан')}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.placeholder }]}>
              {getTranslation('Merchant', 'Продавец')}
            </Text>
            <Text style={[styles.detailValue, { color: theme.text }]}>
              {transaction.merchantName || getTranslation('Not specified', 'Не указан')}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.placeholder }]}>
              {getTranslation('Created', 'Создано')}
            </Text>
            <Text style={[styles.detailValue, { color: theme.text }]}>
              {formatDate(transaction.createdAt)}
            </Text>
          </View>
          
          {transaction.status === 'completed' && transaction.finishedAt && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.placeholder }]}>
                {getTranslation('Completed', 'Завершено')}
              </Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>
                {formatDate(transaction.finishedAt)}
              </Text>
            </View>
          )}
          
          {transaction.commission !== undefined && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.placeholder }]}>
                {getTranslation('Commission', 'Комиссия')}
              </Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>
                ₽{transaction.commission}
              </Text>
            </View>
          )}
        </Card>
        
        {/* Products Card - Only show if transaction has products */}
        {transaction.products && transaction.products.length > 0 && (
          <Card style={styles.productsCard}>
            <Text style={[styles.productsTitle, { color: theme.text }]}>
              {getTranslation('Products', 'Товары')}
            </Text>
            
            {transaction.products.map((product, index) => (
              <View 
                key={`${product.id}-${index}`} 
                style={[
                  styles.productItem, 
                  index < transaction.products!.length - 1 && { 
                    borderBottomWidth: 1, 
                    borderBottomColor: theme.border 
                  }
                ]}
              >
                <View style={styles.productInfo}>
                  <Text style={[styles.productName, { color: theme.text }]}>
                    {product.name}
                  </Text>
                  <Text style={[styles.productPrice, { color: theme.placeholder }]}>
                    ₽{product.price} × {product.quantity}
                  </Text>
                </View>
                <Text style={[styles.productTotal, { color: theme.text }]}>
                  ₽{product.price * product.quantity}
                </Text>
              </View>
            ))}
            
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: theme.text }]}>
                {getTranslation('Total', 'Итого')}
              </Text>
              <Text style={[styles.totalValue, { color: theme.text }]}>
                ₽{transaction.products.reduce((sum, p) => sum + (p.price * p.quantity), 0)}
              </Text>
            </View>
          </Card>
        )}
        
        {/* Payment Instructions Card - Only show if payment is pending */}
        {transaction.status === 'pending' && (
          <Card style={styles.instructionsCard}>
            <Text style={[styles.instructionsTitle, { color: theme.text }]}>
              {getTranslation('Payment Instructions', 'Инструкции по оплате')}
            </Text>
            
            <View style={styles.instructionItem}>
              <View style={[styles.instructionNumber, { backgroundColor: theme.primary }]}>
                <Text style={styles.instructionNumberText}>1</Text>
              </View>
              <Text style={[styles.instructionText, { color: theme.text }]}>
                {getTranslation(
                  'Scan the QR code with your banking app or open the payment link',
                  'Отсканируйте QR-код с помощью банковского приложения или откройте ссылку на оплату'
                )}
              </Text>
            </View>
            
            <View style={styles.instructionItem}>
              <View style={[styles.instructionNumber, { backgroundColor: theme.primary }]}>
                <Text style={styles.instructionNumberText}>2</Text>
              </View>
              <Text style={[styles.instructionText, { color: theme.text }]}>
                {getTranslation(
                  'Complete the payment using your preferred payment method',
                  'Завершите платеж, используя предпочтительный способ оплаты'
                )}
              </Text>
            </View>
            
            <View style={styles.instructionItem}>
              <View style={[styles.instructionNumber, { backgroundColor: theme.primary }]}>
                <Text style={styles.instructionNumberText}>3</Text>
              </View>
              <Text style={[styles.instructionText, { color: theme.text }]}>
                {getTranslation(
                  'Wait for payment confirmation (this page will update automatically)',
                  'Дождитесь подтверждения платежа (эта страница обновится автоматически)'
                )}
              </Text>
            </View>
          </Card>
        )}
        
        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {transaction.status === 'pending' && (
            <Button
              title={getTranslation('Check Payment Status', 'Проверить статус платежа')}
              onPress={() => fetchTransactionStatus(true)}
              loading={isRefreshing}
              icon={!isRefreshing ? <RefreshCw size={20} color="white" /> : undefined}
              style={styles.actionButton}
            />
          )}
          
          <Button
            title={getTranslation('Back to Payments', 'Вернуться к платежам')}
            variant="outline"
            onPress={() => router.push('/(tabs)')}
            style={styles.actionButton}
          />
        </View>
      </ScrollView>
      
      <ErrorPopup
        visible={showErrorPopup}
        message={error || getTranslation('An error occurred', 'Произошла ошибка')}
        onClose={() => setShowErrorPopup(false)}
        darkMode={darkMode}
        title={getTranslation('Error', 'Ошибка')}
        rawResponse={rawErrorResponse}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: scaleSpacing(16),
    paddingBottom: scaleSpacing(32),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: scaleSpacing(16),
  },
  loadingText: {
    marginTop: scaleSpacing(16),
    fontSize: scaleFontSize(16),
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: scaleSpacing(16),
  },
  errorTitle: {
    fontSize: scaleFontSize(20),
    fontWeight: 'bold',
    marginTop: scaleSpacing(16),
    marginBottom: scaleSpacing(8),
    textAlign: 'center',
  },
  errorText: {
    fontSize: scaleFontSize(16),
    textAlign: 'center',
    marginBottom: scaleSpacing(24),
  },
  errorButton: {
    minWidth: 200,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  debugButton: {
    marginRight: scaleSpacing(12),
    padding: scaleSpacing(4),
  },
  refreshButton: {
    padding: scaleSpacing(8),
  },
  rotating: {
    transform: [{ rotate: '45deg' }],
  },
  
  // Debug Card
  debugCard: {
    marginBottom: scaleSpacing(16),
    padding: scaleSpacing(16),
  },
  debugTitle: {
    fontSize: scaleFontSize(16),
    fontWeight: 'bold',
    marginBottom: scaleSpacing(8),
  },
  debugText: {
    fontSize: scaleFontSize(12),
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  
  // Status Card
  statusCard: {
    marginBottom: scaleSpacing(16),
    padding: scaleSpacing(20),
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scaleSpacing(16),
  },
  statusText: {
    fontSize: scaleFontSize(18),
    fontWeight: '600',
    marginLeft: scaleSpacing(8),
  },
  amountText: {
    fontSize: scaleFontSize(32),
    fontWeight: 'bold',
    marginBottom: scaleSpacing(16),
  },
  timerContainer: {
    marginTop: scaleSpacing(8),
  },
  timerText: {
    fontSize: scaleFontSize(16),
    fontWeight: '500',
  },
  timerSubtext: {
    fontSize: scaleFontSize(14),
    marginTop: scaleSpacing(4),
  },
  
  // QR Code Card
  qrCard: {
    marginBottom: scaleSpacing(16),
    padding: scaleSpacing(20),
    alignItems: 'center',
  },
  qrContainer: {
    padding: scaleSpacing(16),
    marginBottom: scaleSpacing(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  noQrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
    width: 200,
  },
  noQrText: {
    textAlign: 'center',
    marginTop: scaleSpacing(16),
    fontSize: scaleFontSize(14),
  },
  urlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: scaleSpacing(16),
  },
  urlText: {
    fontSize: scaleFontSize(14),
    flex: 1,
    marginRight: scaleSpacing(8),
  },
  urlButtons: {
    flexDirection: 'row',
  },
  urlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: scaleSpacing(8),
  },
  qrInstructions: {
    fontSize: scaleFontSize(14),
    textAlign: 'center',
  },
  
  // Details Card
  detailsCard: {
    marginBottom: scaleSpacing(16),
    padding: scaleSpacing(20),
  },
  detailsTitle: {
    fontSize: scaleFontSize(18),
    fontWeight: '600',
    marginBottom: scaleSpacing(16),
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scaleSpacing(12),
  },
  detailLabel: {
    fontSize: scaleFontSize(14),
  },
  detailValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailValue: {
    fontSize: scaleFontSize(14),
    fontWeight: '500',
    marginRight: scaleSpacing(8),
    textAlign: 'right',
  },
  
  // Products Card
  productsCard: {
    marginBottom: scaleSpacing(16),
    padding: scaleSpacing(20),
  },
  productsTitle: {
    fontSize: scaleFontSize(18),
    fontWeight: '600',
    marginBottom: scaleSpacing(16),
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: scaleSpacing(12),
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: scaleFontSize(16),
    fontWeight: '500',
    marginBottom: scaleSpacing(4),
  },
  productPrice: {
    fontSize: scaleFontSize(14),
  },
  productTotal: {
    fontSize: scaleFontSize(16),
    fontWeight: '500',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: scaleSpacing(16),
    paddingTop: scaleSpacing(16),
    borderTopWidth: 1,
  },
  totalLabel: {
    fontSize: scaleFontSize(16),
    fontWeight: '600',
  },
  totalValue: {
    fontSize: scaleFontSize(18),
    fontWeight: 'bold',
  },
  
  // Instructions Card
  instructionsCard: {
    marginBottom: scaleSpacing(16),
    padding: scaleSpacing(20),
  },
  instructionsTitle: {
    fontSize: scaleFontSize(18),
    fontWeight: '600',
    marginBottom: scaleSpacing(16),
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: scaleSpacing(16),
  },
  instructionNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scaleSpacing(12),
  },
  instructionNumberText: {
    color: 'white',
    fontSize: scaleFontSize(16),
    fontWeight: 'bold',
  },
  instructionText: {
    flex: 1,
    fontSize: scaleFontSize(16),
  },
  
  // Action Buttons
  actionButtons: {
    marginTop: scaleSpacing(8),
  },
  actionButton: {
    marginBottom: scaleSpacing(12),
  },
});