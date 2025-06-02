import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Share,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';
import { useLanguageStore } from '@/store/language-store';
import { useThemeStore } from '@/store/theme-store';
import { checkTransactionStatus, checkPaymentStatus } from '@/utils/api';
import { Transaction } from '@/types/api';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ErrorPopup } from '@/components/ErrorPopup';
import colors from '@/constants/colors';
import { 
  CheckCircle, 
  Clock, 
  XCircle, 
  Share2, 
  Copy,
  ExternalLink,
  RefreshCw,
  ArrowLeft
} from 'lucide-react-native';
import { scaleFontSize, scaleSpacing } from '@/utils/responsive';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';

export default function PaymentDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const credentials = useAuthStore((state) => state.credentials);
  const { language } = useLanguageStore();
  const { darkMode } = useThemeStore();
  const theme = darkMode ? colors.dark : colors.light;
  
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes in seconds
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'completed' | 'failed'>('pending');
  
  // Refs for intervals
  const statusCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Fetch transaction details on mount
  useEffect(() => {
    fetchTransactionDetails();
    
    // Set up timer countdown
    timerIntervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Clear interval when timer reaches 0
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    // Set up status check interval (every 10 seconds)
    statusCheckIntervalRef.current = setInterval(() => {
      checkStatus();
    }, 10000);
    
    // Cleanup intervals on unmount
    return () => {
      if (statusCheckIntervalRef.current) {
        clearInterval(statusCheckIntervalRef.current);
        statusCheckIntervalRef.current = null;
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [id]);
  
  // Update status check behavior when transaction status changes
  useEffect(() => {
    if (paymentStatus !== 'pending') {
      // Clear status check interval if payment is completed or failed
      if (statusCheckIntervalRef.current) {
        clearInterval(statusCheckIntervalRef.current);
        statusCheckIntervalRef.current = null;
      }
      
      // Clear timer interval if payment is completed or failed
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      
      // If payment is completed or failed, navigate to transaction details after a delay
      if (id && transaction) {
        setTimeout(() => {
          router.replace({
            pathname: '/transaction/[id]',
            params: { 
              id: id,
              data: JSON.stringify(transaction)
            }
          });
        }, 2000);
      }
    }
  }, [paymentStatus, id, transaction]);
  
  const fetchTransactionDetails = async () => {
    if (!credentials || !id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await checkTransactionStatus(credentials, id);
      
      if (result.found && result.transaction) {
        setTransaction(result.transaction);
        
        // Set payment status based on transaction status
        if (result.transaction.status === 'completed') {
          setPaymentStatus('completed');
        } else if (result.transaction.status === 'failed') {
          setPaymentStatus('failed');
        } else {
          setPaymentStatus('pending');
        }
      } else {
        setError(result.error || (language === 'en' ? 'Transaction not found' : 'Транзакция не найдена'));
        setShowErrorPopup(true);
      }
    } catch (err) {
      console.error('Error fetching transaction details:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      setShowErrorPopup(true);
    } finally {
      setIsLoading(false);
    }
  };
  
  const checkStatus = async () => {
    if (!credentials || !id || paymentStatus !== 'pending') return;
    
    try {
      setIsRefreshing(true);
      
      const result = await checkPaymentStatus(credentials, id);
      
      // Update payment status based on API response
      if (result.status === 3) {
        setPaymentStatus('completed');
        
        // Update transaction with new status
        if (transaction) {
          setTransaction({
            ...transaction,
            status: 'completed'
          });
        }
      } else if (result.status === 2) {
        setPaymentStatus('failed');
        
        // Update transaction with new status
        if (transaction) {
          setTransaction({
            ...transaction,
            status: 'failed'
          });
        }
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    } finally {
      setIsRefreshing(false);
    }
  };
  
  const handleRefresh = () => {
    checkStatus();
  };
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert(
        language === 'en' ? 'Copied' : 'Скопировано',
        `${label} ${language === 'en' ? 'copied to clipboard' : 'скопировано в буфер обмена'}`
      );
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };
  
  const openPaymentLink = async () => {
    if (!transaction?.paymentUrl) return;
    
    try {
      const canOpen = await Linking.canOpenURL(transaction.paymentUrl);
      
      if (canOpen) {
        await Linking.openURL(transaction.paymentUrl);
      } else {
        Alert.alert(
          language === 'en' ? 'Error' : 'Ошибка',
          language === 'en' 
            ? 'Cannot open payment link' 
            : 'Невозможно открыть ссылку на оплату'
        );
      }
    } catch (error) {
      console.error('Error opening payment link:', error);
      Alert.alert(
        language === 'en' ? 'Error' : 'Ошибка',
        language === 'en' 
          ? 'Failed to open payment link' 
          : 'Не удалось открыть ссылку на оплату'
      );
    }
  };
  
  const sharePaymentLink = async () => {
    if (!transaction?.paymentUrl) return;
    
    try {
      const message = language === 'en'
        ? `Payment link for transaction ${id}: ${transaction.paymentUrl}`
        : `Ссылка на оплату для транзакции ${id}: ${transaction.paymentUrl}`;
      
      if (Platform.OS === 'web') {
        // On web, use clipboard API instead of Share API
        await Clipboard.setStringAsync(transaction.paymentUrl);
        Alert.alert(
          language === 'en' ? 'Link Copied' : 'Ссылка скопирована',
          language === 'en' 
            ? 'Payment link copied to clipboard' 
            : 'Ссылка на оплату скопирована в буфер обмена'
        );
      } else {
        try {
          await Share.share({
            message,
            url: transaction.paymentUrl // This will be used on iOS
          });
        } catch (shareError) {
          console.error('Error sharing payment link:', shareError);
          // Fallback to clipboard if sharing fails
          await Clipboard.setStringAsync(transaction.paymentUrl);
          Alert.alert(
            language === 'en' ? 'Link Copied' : 'Ссылка скопирована',
            language === 'en' 
              ? 'Payment link copied to clipboard' 
              : 'Ссылка на оплату скопирована в буфер обмена'
          );
        }
      }
    } catch (error) {
      console.error('Error sharing payment link:', error);
      // Fallback to clipboard if sharing fails
      try {
        await Clipboard.setStringAsync(transaction.paymentUrl || '');
        Alert.alert(
          language === 'en' ? 'Link Copied' : 'Ссылка скопирована',
          language === 'en' 
            ? 'Payment link copied to clipboard' 
            : 'Ссылка на оплату скопирована в буфер обмена'
        );
      } catch (clipboardError) {
        console.error('Error copying to clipboard:', clipboardError);
      }
    }
  };
  
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Stack.Screen 
          options={{ 
            title: language === 'en' ? 'Payment' : 'Платеж',
            headerStyle: { backgroundColor: theme.background },
            headerTintColor: theme.text,
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()}>
                <ArrowLeft size={24} color={theme.text} />
              </TouchableOpacity>
            ),
          }} 
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>
            {language === 'en' ? 'Loading payment details...' : 'Загрузка деталей платежа...'}
          </Text>
        </View>
      </View>
    );
  }
  
  if (!transaction) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Stack.Screen 
          options={{ 
            title: language === 'en' ? 'Payment' : 'Платеж',
            headerStyle: { backgroundColor: theme.background },
            headerTintColor: theme.text,
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()}>
                <ArrowLeft size={24} color={theme.text} />
              </TouchableOpacity>
            ),
          }} 
        />
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.notification }]}>
            {error || (language === 'en' ? 'Payment not found' : 'Платеж не найден')}
          </Text>
          <Button
            title={language === 'en' ? 'Go Back' : 'Назад'}
            onPress={() => router.back()}
            style={styles.backButton}
          />
        </View>
      </View>
    );
  }
  
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen 
        options={{ 
          title: language === 'en' ? 'Payment' : 'Платеж',
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color={theme.text} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={handleRefresh} disabled={isRefreshing || paymentStatus !== 'pending'}>
              <RefreshCw 
                size={24} 
                color={paymentStatus === 'pending' ? theme.primary : theme.inactive} 
                style={isRefreshing ? styles.rotating : undefined}
              />
            </TouchableOpacity>
          ),
        }} 
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <Card style={styles.statusCard}>
          <View style={styles.statusHeader}>
            {paymentStatus === 'completed' ? (
              <CheckCircle size={24} color={theme.success} />
            ) : paymentStatus === 'failed' ? (
              <XCircle size={24} color={theme.notification} />
            ) : (
              <Clock size={24} color={theme.warning} />
            )}
            <Text style={[styles.statusText, { 
              color: paymentStatus === 'completed' 
                ? theme.success 
                : paymentStatus === 'failed' 
                  ? theme.notification 
                  : theme.warning 
            }]}>
              {paymentStatus === 'completed' 
                ? (language === 'en' ? 'Payment Completed' : 'Платеж выполнен') 
                : paymentStatus === 'failed' 
                  ? (language === 'en' ? 'Payment Failed' : 'Платеж не выполнен') 
                  : (language === 'en' ? 'Waiting for Payment' : 'Ожидание оплаты')}
            </Text>
          </View>
          
          <Text style={[styles.amount, { color: theme.text }]}>
            ₽{transaction.amount.toLocaleString(undefined, {maximumFractionDigits: 2})}
          </Text>
          
          {paymentStatus === 'pending' && (
            <View style={styles.timerContainer}>
              <Text style={[styles.timerText, { 
                color: timeLeft > 300 ? theme.text : theme.warning,
                fontSize: scaleFontSize(16)
              }]}>
                {language === 'en' ? 'Time left: ' : 'Осталось времени: '}
                {formatTime(timeLeft)}
              </Text>
              <Text style={[styles.timerDescription, { color: theme.placeholder }]}>
                {language === 'en' 
                  ? 'The payment link will expire in 15 minutes' 
                  : 'Ссылка на оплату истечет через 15 минут'}
              </Text>
            </View>
          )}
        </Card>
        
        {/* QR Code and Payment Link - Show if paymentUrl exists */}
        {transaction.paymentUrl && (
          <Card style={styles.qrCard}>
            <Text style={[styles.qrTitle, { color: theme.text }]}>
              {language === 'en' ? 'Scan QR Code to Pay' : 'Отсканируйте QR-код для оплаты'}
            </Text>
            
            <View style={styles.qrContainer}>
              <QRCode
                value={transaction.paymentUrl}
                size={200}
                color={theme.text}
                backgroundColor={theme.card}
              />
            </View>
            
            <View style={styles.paymentLinkContainer}>
              <Text style={[styles.paymentLinkLabel, { color: theme.placeholder }]}>
                {language === 'en' ? 'Payment Link:' : 'Ссылка на оплату:'}
              </Text>
              <TouchableOpacity 
                style={styles.paymentLink}
                onPress={() => copyToClipboard(transaction.paymentUrl || '', language === 'en' ? 'Payment link' : 'Ссылка на оплату')}
              >
                <Text 
                  style={[styles.paymentLinkText, { color: theme.primary }]}
                  numberOfLines={1}
                  ellipsizeMode="middle"
                >
                  {transaction.paymentUrl}
                </Text>
                <Copy size={16} color={theme.primary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.paymentActions}>
              <Button
                title={language === 'en' ? 'Open Link' : 'Открыть ссылку'}
                onPress={openPaymentLink}
                icon={<ExternalLink size={18} color="white" />}
                style={styles.paymentActionButton}
              />
              
              <Button
                title={language === 'en' ? 'Share Link' : 'Поделиться'}
                variant="outline"
                onPress={sharePaymentLink}
                icon={<Share2 size={18} color={theme.primary} />}
                style={styles.paymentActionButton}
              />
            </View>
          </Card>
        )}
        
        {/* Transaction Details */}
        <Card style={styles.detailsCard}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {language === 'en' ? 'Payment Details' : 'Детали платежа'}
          </Text>
          
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.placeholder }]}>
              {language === 'en' ? 'Transaction ID' : 'ID транзакции'}
            </Text>
            <TouchableOpacity 
              style={styles.copyableValue}
              onPress={() => copyToClipboard(transaction.id, language === 'en' ? 'Transaction ID' : 'ID транзакции')}
            >
              <Text style={[styles.detailValue, { color: theme.text }]}>
                {transaction.id}
              </Text>
              <Copy size={16} color={theme.placeholder} />
            </TouchableOpacity>
          </View>
          
          {transaction.customerInfo && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.placeholder }]}>
                {language === 'en' ? 'Customer' : 'Покупатель'}
              </Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>
                {transaction.customerInfo}
              </Text>
            </View>
          )}
          
          {transaction.merchantName && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.placeholder }]}>
                {language === 'en' ? 'Merchant' : 'Продавец'}
              </Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>
                {transaction.merchantName}
              </Text>
            </View>
          )}
          
          {transaction.createdAt && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.placeholder }]}>
                {language === 'en' ? 'Created' : 'Создано'}
              </Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>
                {new Date(transaction.createdAt).toLocaleString()}
              </Text>
            </View>
          )}
          
          {transaction.paymentUrl && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.placeholder }]}>
                {language === 'en' ? 'Payment URL' : 'Ссылка на оплату'}
              </Text>
              <TouchableOpacity 
                style={styles.copyableValue}
                onPress={() => copyToClipboard(transaction.paymentUrl || '', language === 'en' ? 'Payment URL' : 'Ссылка на оплату')}
              >
                <Text 
                  style={[styles.detailValue, { color: theme.primary }]}
                  numberOfLines={1}
                  ellipsizeMode="middle"
                >
                  {transaction.paymentUrl}
                </Text>
                <Copy size={16} color={theme.primary} />
              </TouchableOpacity>
            </View>
          )}
          
          {transaction.products && transaction.products.length > 0 && (
            <View style={styles.productsContainer}>
              <Text style={[styles.productsTitle, { color: theme.text }]}>
                {language === 'en' ? 'Products' : 'Товары'}
              </Text>
              
              {transaction.products.map((product, index) => (
                <View key={index} style={styles.productItem}>
                  <View style={styles.productNameContainer}>
                    <Text style={[styles.productName, { color: theme.text }]}>
                      {product.name}
                    </Text>
                    <Text style={[styles.productQuantity, { color: theme.placeholder }]}>
                      x{product.quantity}
                    </Text>
                  </View>
                  <Text style={[styles.productPrice, { color: theme.text }]}>
                    ₽{(product.price * product.quantity).toLocaleString(undefined, {maximumFractionDigits: 2})}
                  </Text>
                </View>
              ))}
              
              <View style={[styles.totalRow, { borderTopColor: theme.border }]}>
                <Text style={[styles.totalLabel, { color: theme.text }]}>
                  {language === 'en' ? 'Total' : 'Итого'}
                </Text>
                <Text style={[styles.totalAmount, { color: theme.text }]}>
                  ₽{transaction.amount.toLocaleString(undefined, {maximumFractionDigits: 2})}
                </Text>
              </View>
            </View>
          )}
        </Card>
        
        {/* Instructions for payments */}
        <Card style={styles.instructionsCard}>
          <Text style={[styles.instructionsTitle, { color: theme.text }]}>
            {language === 'en' ? 'Payment Instructions' : 'Инструкции по оплате'}
          </Text>
          
          <View style={styles.instructionStep}>
            <View style={[styles.instructionNumber, { backgroundColor: theme.primary }]}>
              <Text style={styles.instructionNumberText}>1</Text>
            </View>
            <Text style={[styles.instructionText, { color: theme.text }]}>
              {language === 'en' 
                ? 'Scan the QR code with your banking app or open the payment link'
                : 'Отсканируйте QR-код с помощью банковского приложения или откройте ссылку на оплату'}
            </Text>
          </View>
          
          <View style={styles.instructionStep}>
            <View style={[styles.instructionNumber, { backgroundColor: theme.primary }]}>
              <Text style={styles.instructionNumberText}>2</Text>
            </View>
            <Text style={[styles.instructionText, { color: theme.text }]}>
              {language === 'en' 
                ? 'Complete the payment using your preferred payment method'
                : 'Завершите платеж, используя предпочтительный способ оплаты'}
            </Text>
          </View>
          
          <View style={styles.instructionStep}>
            <View style={[styles.instructionNumber, { backgroundColor: theme.primary }]}>
              <Text style={styles.instructionNumberText}>3</Text>
            </View>
            <Text style={[styles.instructionText, { color: theme.text }]}>
              {language === 'en' 
                ? 'Wait for the payment confirmation (this page will update automatically)'
                : 'Дождитесь подтверждения платежа (эта страница обновится автоматически)'}
            </Text>
          </View>
        </Card>
      </ScrollView>
      
      {/* Error Popup */}
      <ErrorPopup
        visible={showErrorPopup}
        message={error || (language === 'en' ? 'An error occurred' : 'Произошла ошибка')}
        onClose={() => setShowErrorPopup(false)}
        darkMode={darkMode}
        title={language === 'en' ? 'Error' : 'Ошибка'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: scaleSpacing(16),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: scaleSpacing(24),
  },
  loadingText: {
    marginTop: scaleSpacing(16),
    fontSize: scaleFontSize(16),
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: scaleSpacing(24),
  },
  errorText: {
    fontSize: scaleFontSize(16),
    textAlign: 'center',
    marginBottom: scaleSpacing(24),
  },
  backButton: {
    minWidth: 120,
  },
  statusCard: {
    alignItems: 'center',
    padding: scaleSpacing(24),
    marginBottom: scaleSpacing(16),
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scaleSpacing(16),
  },
  statusText: {
    fontSize: scaleFontSize(18),
    fontWeight: '600',
    marginLeft: scaleSpacing(12),
  },
  amount: {
    fontSize: scaleFontSize(32),
    fontWeight: 'bold',
    marginBottom: scaleSpacing(16),
  },
  timerContainer: {
    alignItems: 'center',
  },
  timerText: {
    fontWeight: '600',
    marginBottom: scaleSpacing(4),
  },
  timerDescription: {
    fontSize: scaleFontSize(12),
  },
  qrCard: {
    alignItems: 'center',
    padding: scaleSpacing(24),
    marginBottom: scaleSpacing(16),
  },
  qrTitle: {
    fontSize: scaleFontSize(18),
    fontWeight: '600',
    marginBottom: scaleSpacing(16),
    textAlign: 'center',
  },
  qrContainer: {
    padding: scaleSpacing(16),
    marginBottom: scaleSpacing(16),
    alignItems: 'center',
  },
  paymentLinkContainer: {
    width: '100%',
    marginBottom: scaleSpacing(16),
  },
  paymentLinkLabel: {
    fontSize: scaleFontSize(14),
    marginBottom: scaleSpacing(4),
  },
  paymentLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paymentLinkText: {
    fontSize: scaleFontSize(14),
    fontWeight: '500',
    flex: 1,
    marginRight: scaleSpacing(8),
  },
  paymentActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  paymentActionButton: {
    flex: 1,
    marginHorizontal: scaleSpacing(4),
  },
  detailsCard: {
    padding: scaleSpacing(20),
    marginBottom: scaleSpacing(16),
  },
  sectionTitle: {
    fontSize: scaleFontSize(18),
    fontWeight: '600',
    marginBottom: scaleSpacing(16),
  },
  detailRow: {
    marginBottom: scaleSpacing(16),
  },
  detailLabel: {
    fontSize: scaleFontSize(14),
    marginBottom: scaleSpacing(4),
  },
  detailValue: {
    fontSize: scaleFontSize(16),
    fontWeight: '500',
  },
  copyableValue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productsContainer: {
    marginTop: scaleSpacing(16),
  },
  productsTitle: {
    fontSize: scaleFontSize(16),
    fontWeight: '600',
    marginBottom: scaleSpacing(12),
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scaleSpacing(8),
  },
  productNameContainer: {
    flex: 1,
    marginRight: scaleSpacing(8),
  },
  productName: {
    fontSize: scaleFontSize(14),
    fontWeight: '500',
  },
  productQuantity: {
    fontSize: scaleFontSize(12),
  },
  productPrice: {
    fontSize: scaleFontSize(14),
    fontWeight: '500',
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
    fontSize: scaleFontSize(16),
    fontWeight: 'bold',
  },
  instructionsCard: {
    padding: scaleSpacing(20),
    marginBottom: scaleSpacing(24),
  },
  instructionsTitle: {
    fontSize: scaleFontSize(18),
    fontWeight: '600',
    marginBottom: scaleSpacing(16),
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: scaleSpacing(16),
  },
  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scaleSpacing(12),
    marginTop: 2,
  },
  instructionNumberText: {
    color: 'white',
    fontSize: scaleFontSize(14),
    fontWeight: 'bold',
  },
  instructionText: {
    flex: 1,
    fontSize: scaleFontSize(14),
    lineHeight: scaleFontSize(20),
  },
  rotating: {
    transform: Platform.OS === 'web' ? undefined : [{ rotate: '45deg' }],
  },
});