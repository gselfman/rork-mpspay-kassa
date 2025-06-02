import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  Platform,
  Share,
  Linking
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';
import { useLanguageStore } from '@/store/language-store';
import { useThemeStore } from '@/store/theme-store';
import { useTransactionStore } from '@/store/transaction-store';
import { checkTransactionStatus, mapPaymentStatusToAppStatus } from '@/utils/api';
import { Transaction, PaymentHistoryItem } from '@/types/api';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { ErrorPopup } from '@/components/ErrorPopup';
import colors from '@/constants/colors';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw, 
  ArrowLeft, 
  Share as ShareIcon,
  Printer,
  AlertCircle
} from 'lucide-react-native';
import { scaleFontSize, scaleSpacing } from '@/utils/responsive';

export default function TransactionDetailsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const credentials = useAuthStore((state) => state.credentials);
  const { language } = useLanguageStore();
  const { darkMode } = useThemeStore();
  const theme = darkMode ? colors.dark : colors.light;
  const { transactions, addTransaction } = useTransactionStore();
  
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  
  // Get transaction ID from params
  const transactionId = params.id as string;
  
  // Get transaction data from params if available
  const transactionData = params.data ? JSON.parse(params.data as string) : null;
  
  // Translations
  const getTranslation = (en: string, ru: string): string => {
    return language === 'en' ? en : ru;
  };
  
  // Format date
  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString || '';
    }
  };
  
  // Get status text
  const getStatusText = (status: 'pending' | 'completed' | 'failed' | number): string => {
    // If status is a number (from PaymentHistoryItem)
    if (typeof status === 'number') {
      switch (status) {
        case 3:
          return getTranslation('Completed', 'Выполнено');
        case 2:
          return getTranslation('Failed', 'Ошибка');
        case 1:
        default:
          return getTranslation('Pending', 'В обработке');
      }
    }
    
    // If status is a string (from Transaction)
    switch (status) {
      case 'completed':
        return getTranslation('Completed', 'Выполнено');
      case 'failed':
        return getTranslation('Failed', 'Ошибка');
      case 'pending':
      default:
        return getTranslation('Pending', 'В обработке');
    }
  };
  
  // Get status color
  const getStatusColor = (status: 'pending' | 'completed' | 'failed' | number): string => {
    // If status is a number (from PaymentHistoryItem)
    if (typeof status === 'number') {
      switch (status) {
        case 3:
          return theme.success;
        case 2:
          return theme.notification;
        case 1:
        default:
          return theme.warning;
      }
    }
    
    // If status is a string (from Transaction)
    switch (status) {
      case 'completed':
        return theme.success;
      case 'failed':
        return theme.notification;
      case 'pending':
      default:
        return theme.warning;
    }
  };
  
  // Get status icon
  const getStatusIcon = (status: 'pending' | 'completed' | 'failed' | number) => {
    // If status is a number (from PaymentHistoryItem)
    if (typeof status === 'number') {
      switch (status) {
        case 3:
          return <CheckCircle size={24} color={theme.success} />;
        case 2:
          return <XCircle size={24} color={theme.notification} />;
        case 1:
        default:
          return <Clock size={24} color={theme.warning} />;
      }
    }
    
    // If status is a string (from Transaction)
    switch (status) {
      case 'completed':
        return <CheckCircle size={24} color={theme.success} />;
      case 'failed':
        return <XCircle size={24} color={theme.notification} />;
      case 'pending':
      default:
        return <Clock size={24} color={theme.warning} />;
    }
  };
  
  // Convert PaymentHistoryItem to Transaction
  const convertPaymentHistoryItemToTransaction = (item: PaymentHistoryItem): Transaction => {
    return {
      id: item.id,
      amount: item.amount,
      status: mapPaymentStatusToAppStatus(item.paymentStatus),
      createdAt: item.createdAt || new Date().toISOString(),
      customerInfo: item.comment,
      merchantName: item.accountToName,
      tag: item.tag,
      commission: item.totalCommission,
      finishedAt: item.finishedAt
    };
  };
  
  // Fetch transaction status
  const fetchTransactionStatus = async (showLoading = true) => {
    if (!credentials) {
      setError(getTranslation(
        'You need to be logged in to view transaction details',
        'Вы должны быть авторизованы для просмотра деталей транзакции'
      ));
      setShowErrorPopup(true);
      setIsLoading(false);
      return;
    }
    
    if (showLoading) {
      setIsRefreshing(true);
    }
    
    try {
      const result = await checkTransactionStatus(credentials, transactionId);
      
      if (result.found && result.transaction) {
        setTransaction(result.transaction);
        addTransaction(result.transaction);
      } else {
        setError(result.error || getTranslation(
          'Failed to fetch transaction details',
          'Не удалось получить детали транзакции'
        ));
        setShowErrorPopup(true);
      }
    } catch (error) {
      console.error('Error fetching transaction status:', error);
      setError(getTranslation(
        'Failed to fetch transaction details',
        'Не удалось получить детали транзакции'
      ));
      setShowErrorPopup(true);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };
  
  // Share transaction details
  const shareTransactionDetails = async () => {
    if (!transaction) return;
    
    try {
      const message = `
${getTranslation('Transaction Details', 'Детали транзакции')}:
${getTranslation('ID', 'ID')}: ${transaction.id}
${getTranslation('Amount', 'Сумма')}: ₽${transaction.amount}
${getTranslation('Status', 'Статус')}: ${getStatusText(transaction.status)}
${getTranslation('Date', 'Дата')}: ${formatDate(transaction.createdAt)}
${transaction.customerInfo ? `${getTranslation('Customer', 'Покупатель')}: ${transaction.customerInfo}` : ''}
${transaction.tag ? `${getTranslation('SBP ID', 'СБП ID')}: ${transaction.tag}` : ''}
`;
      
      await Share.share({
        message: message.trim()
      });
    } catch (error) {
      console.error('Error sharing transaction details:', error);
      Alert.alert(
        getTranslation('Error', 'Ошибка'),
        getTranslation(
          'Failed to share transaction details',
          'Не удалось поделиться деталями транзакции'
        )
      );
    }
  };
  
  // Print receipt
  const printReceipt = () => {
    Alert.alert(
      getTranslation('Print Receipt', 'Печать чека'),
      getTranslation(
        'This feature is not available yet',
        'Эта функция пока недоступна'
      )
    );
  };
  
  // Initialize transaction data
  useEffect(() => {
    // If we have transaction data from params, use it
    if (transactionData) {
      // Check if it's a PaymentHistoryItem or Transaction
      if ('paymentStatus' in transactionData) {
        // Convert PaymentHistoryItem to Transaction
        const convertedTransaction = convertPaymentHistoryItemToTransaction(transactionData);
        setTransaction(convertedTransaction);
        addTransaction(convertedTransaction);
      } else {
        // It's already a Transaction
        setTransaction(transactionData);
        addTransaction(transactionData);
      }
      setIsLoading(false);
    } else {
      // Try to find transaction in store
      const storedTransaction = transactions.find(t => t.id === transactionId);
      
      if (storedTransaction) {
        setTransaction(storedTransaction);
        setIsLoading(false);
      } else {
        // Fetch transaction status from API
        fetchTransactionStatus(true);
      }
    }
  }, [transactionId, transactionData]);
  
  // Render loading state
  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.text }]}>
          {getTranslation('Loading transaction details...', 'Загрузка деталей транзакции...')}
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
          {getTranslation('Transaction Not Found', 'Транзакция не найдена')}
        </Text>
        <Text style={[styles.errorText, { color: theme.placeholder }]}>
          {getTranslation(
            'The transaction you are looking for does not exist or has been removed.',
            'Транзакция, которую вы ищете, не существует или была удалена.'
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
          title: getTranslation('Transaction Details', 'Детали транзакции'),
          headerRight: () => (
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
          ),
        }} 
      />
      
      <ScrollView 
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Status Card */}
        <Card style={styles.statusCard}>
          <View style={styles.statusHeader}>
            {getStatusIcon(transaction.status)}
            <Text style={[styles.statusText, { color: getStatusColor(transaction.status) }]}>
              {getStatusText(transaction.status)}
            </Text>
          </View>
          
          <Text style={[styles.amountText, { color: theme.text }]}>
            ₽{transaction.amount.toLocaleString()}
          </Text>
          
          <View style={styles.idContainer}>
            <Text style={[styles.idLabel, { color: theme.placeholder }]}>
              {getTranslation('Transaction ID:', 'ID транзакции:')}
            </Text>
            <Text style={[styles.idValue, { color: theme.text }]}>
              {transaction.id}
            </Text>
          </View>
        </Card>
        
        {/* Details Card */}
        <Card style={styles.detailsCard}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {getTranslation('Transaction Details', 'Детали транзакции')}
          </Text>
          
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.placeholder }]}>
              {getTranslation('Created', 'Создано')}
            </Text>
            <Text style={[styles.detailValue, { color: theme.text }]}>
              {formatDate(transaction.createdAt)}
            </Text>
          </View>
          
          {transaction.finishedAt && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.placeholder }]}>
                {getTranslation('Completed', 'Завершено')}
              </Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>
                {formatDate(transaction.finishedAt)}
              </Text>
            </View>
          )}
          
          {transaction.customerInfo && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.placeholder }]}>
                {getTranslation('Customer', 'Покупатель')}
              </Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>
                {transaction.customerInfo}
              </Text>
            </View>
          )}
          
          {transaction.merchantName && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.placeholder }]}>
                {getTranslation('Merchant', 'Продавец')}
              </Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>
                {transaction.merchantName}
              </Text>
            </View>
          )}
          
          {transaction.commission !== undefined && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.placeholder }]}>
                {getTranslation('Commission', 'Комиссия')}
              </Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>
                ₽{transaction.commission.toLocaleString()}
              </Text>
            </View>
          )}
          
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
          
          {transaction.paymentUrl && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.placeholder }]}>
                {getTranslation('Payment URL', 'URL платежа')}
              </Text>
              <TouchableOpacity 
                onPress={() => Linking.openURL(transaction.paymentUrl!)}
                style={styles.urlContainer}
              >
                <Text 
                  style={[styles.urlText, { color: theme.primary }]}
                  numberOfLines={1}
                  ellipsizeMode="middle"
                >
                  {transaction.paymentUrl}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </Card>
        
        {/* Products Card - Only show if transaction has products */}
        {transaction.products && transaction.products.length > 0 && (
          <Card style={styles.productsCard}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
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
                    ₽{product.price.toLocaleString()} × {product.quantity}
                  </Text>
                </View>
                <Text style={[styles.productTotal, { color: theme.text }]}>
                  ₽{(product.price * product.quantity).toLocaleString()}
                </Text>
              </View>
            ))}
            
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: theme.text }]}>
                {getTranslation('Total', 'Итого')}
              </Text>
              <Text style={[styles.totalValue, { color: theme.text }]}>
                ₽{transaction.products.reduce((sum, p) => sum + (p.price * p.quantity), 0).toLocaleString()}
              </Text>
            </View>
          </Card>
        )}
        
        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            title={getTranslation('Share', 'Поделиться')}
            onPress={shareTransactionDetails}
            icon={<ShareIcon size={20} color="white" />}
            style={styles.actionButton}
          />
          
          <Button
            title={getTranslation('Print Receipt', 'Печать чека')}
            onPress={printReceipt}
            icon={<Printer size={20} color="white" />}
            style={styles.actionButton}
          />
          
          <Button
            title={getTranslation('Back', 'Назад')}
            variant="outline"
            onPress={() => router.back()}
            icon={<ArrowLeft size={20} color={theme.primary} />}
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
  },
  loadingText: {
    marginTop: scaleSpacing(16),
    fontSize: scaleFontSize(16),
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
  refreshButton: {
    padding: scaleSpacing(8),
  },
  rotating: {
    transform: Platform.OS === 'web' ? undefined : [{ rotate: '45deg' }],
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
  idContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  idLabel: {
    fontSize: scaleFontSize(14),
    marginRight: scaleSpacing(8),
  },
  idValue: {
    fontSize: scaleFontSize(14),
    fontWeight: '500',
  },
  
  // Details Card
  detailsCard: {
    marginBottom: scaleSpacing(16),
    padding: scaleSpacing(20),
  },
  sectionTitle: {
    fontSize: scaleFontSize(18),
    fontWeight: '600',
    marginBottom: scaleSpacing(16),
  },
  detailRow: {
    marginBottom: scaleSpacing(12),
  },
  detailLabel: {
    fontSize: scaleFontSize(14),
    marginBottom: scaleSpacing(4),
  },
  detailValue: {
    fontSize: scaleFontSize(16),
    fontWeight: '500',
  },
  urlContainer: {
    marginTop: scaleSpacing(4),
  },
  urlText: {
    fontSize: scaleFontSize(14),
    textDecorationLine: 'underline',
  },
  
  // Products Card
  productsCard: {
    marginBottom: scaleSpacing(16),
    padding: scaleSpacing(20),
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
  
  // Action Buttons
  actionButtons: {
    gap: scaleSpacing(12),
  },
  actionButton: {
    marginBottom: 0,
  },
});