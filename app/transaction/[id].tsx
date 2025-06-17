import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
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
  const { credentials } = useAuthStore();
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
  const convertPaymentHistoryItemToTransaction = useCallback((item: PaymentHistoryItem): Transaction => {
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
  }, []);
  
  // Fetch transaction status
  const fetchTransactionStatus = useCallback(async (showLoading = true) => {
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
  }, [credentials, transactionId, getTranslation, addTransaction]);
  
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
  const printReceipt = async () => {
    if (!transaction) return;
    
    try {
      // Generate receipt data
      const receiptData = {
        transactionId: transaction.id,
        amount: transaction.amount,
        status: getStatusText(transaction.status),
        date: formatDate(transaction.createdAt),
        customerInfo: transaction.customerInfo || '',
        merchantName: transaction.merchantName || '',
        tag: transaction.tag || '',
        commission: transaction.commission || 0
      };
      
      // Create HTML content for receipt
      const htmlContent = generateReceiptHTML(receiptData);
      
      // Open HTML in browser for printing
      if (Platform.OS === 'web') {
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      } else {
        // For mobile, create a data URL
        const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
        await Linking.openURL(dataUrl);
      }
    } catch (error) {
      console.error('Error printing receipt:', error);
      Alert.alert(
        getTranslation('Error', 'Ошибка'),
        getTranslation(
          'Failed to print receipt',
          'Не удалось распечатать чек'
        )
      );
    }
  };
  
  // Generate HTML receipt with proper encoding and logo
  const generateReceiptHTML = (data: any): string => {
    return `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Чек - ${data.transactionId}</title>
    <style>
        body { 
            font-family: 'Arial', sans-serif; 
            max-width: 400px; 
            margin: 0 auto; 
            padding: 20px; 
            background: white;
            color: #333;
        }
        .header { 
            text-align: center; 
            border-bottom: 2px solid #000; 
            padding-bottom: 15px; 
            margin-bottom: 20px; 
        }
        .logo { 
            width: 80px; 
            height: 80px; 
            margin: 0 auto 15px; 
            border-radius: 12px;
            background: #f0f0f0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
        }
        .company-name {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 5px;
            color: #007AFF;
        }
        .receipt-title {
            font-size: 16px;
            color: #666;
        }
        .row { 
            display: flex; 
            justify-content: space-between; 
            margin: 12px 0; 
            padding: 8px 0;
            border-bottom: 1px dotted #ccc;
        }
        .row:last-child {
            border-bottom: none;
        }
        .label {
            font-weight: 500;
            color: #555;
        }
        .value {
            font-weight: bold;
            color: #000;
        }
        .total { 
            font-weight: bold; 
            font-size: 1.3em; 
            border-top: 2px solid #000; 
            padding-top: 15px; 
            margin-top: 20px;
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
        }
        .status {
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: bold;
            display: inline-block;
        }
        .status.completed {
            background: #d4edda;
            color: #155724;
        }
        .status.failed {
            background: #f8d7da;
            color: #721c24;
        }
        .status.pending {
            background: #fff3cd;
            color: #856404;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #666;
            font-size: 12px;
        }
        @media print { 
            body { 
                margin: 0; 
                padding: 10px;
            } 
            .no-print {
                display: none;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">
            <img src="https://i.imgur.com/QCp2zDE.png" alt="MPSPAY" style="width: 100%; height: 100%; object-fit: contain; border-radius: 12px;" onerror="this.style.display='none'; this.parentNode.innerHTML='💳'">
        </div>
        <div class="company-name">MPSPAY</div>
        <div class="receipt-title">Чек об оплате</div>
    </div>
    
    <div class="row">
        <span class="label">ID транзакции:</span>
        <span class="value">${data.transactionId}</span>
    </div>
    
    <div class="row">
        <span class="label">Сумма:</span>
        <span class="value">₽${data.amount.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</span>
    </div>
    
    <div class="row">
        <span class="label">Статус:</span>
        <span class="value">
            <span class="status ${data.status.toLowerCase().includes('выполнено') || data.status.toLowerCase().includes('completed') ? 'completed' : 
                                data.status.toLowerCase().includes('ошибка') || data.status.toLowerCase().includes('failed') ? 'failed' : 'pending'}">
                ${data.status}
            </span>
        </span>
    </div>
    
    <div class="row">
        <span class="label">Дата:</span>
        <span class="value">${data.date}</span>
    </div>
    
    ${data.customerInfo ? `
    <div class="row">
        <span class="label">Покупатель:</span>
        <span class="value">${data.customerInfo}</span>
    </div>
    ` : ''}
    
    ${data.merchantName ? `
    <div class="row">
        <span class="label">Продавец:</span>
        <span class="value">${data.merchantName}</span>
    </div>
    ` : ''}
    
    ${data.commission && data.commission > 0 ? `
    <div class="row">
        <span class="label">Комиссия:</span>
        <span class="value">₽${data.commission.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</span>
    </div>
    ` : ''}
    
    ${data.tag ? `
    <div class="row">
        <span class="label">СБП ID:</span>
        <span class="value">${data.tag}</span>
    </div>
    ` : ''}
    
    <div class="total">
        <div class="row">
            <span class="label">Итого:</span>
            <span class="value">₽${data.amount.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</span>
        </div>
    </div>
    
    <div class="footer">
        <p>Спасибо за использование MPSPAY!</p>
        <p>Дата печати: ${new Date().toLocaleString('ru-RU')}</p>
    </div>
    
    <script>
        window.onload = function() {
            setTimeout(function() {
                window.print();
            }, 500);
        }
    </script>
</body>
</html>`;
  };
  
  // Initialize transaction data
  useEffect(() => {
    let mounted = true;
    
    const initializeTransaction = async () => {
      // If we have transaction data from params, use it
      if (transactionData && mounted) {
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
        return;
      }
      
      // Try to find transaction in store
      const storedTransaction = transactions.find(t => t.id === transactionId);
      
      if (storedTransaction && mounted) {
        setTransaction(storedTransaction);
        setIsLoading(false);
      } else if (mounted) {
        // Fetch transaction status from API
        await fetchTransactionStatus(true);
      }
    };
    
    initializeTransaction();
    
    return () => {
      mounted = false;
    };
  }, [transactionId, transactionData, convertPaymentHistoryItemToTransaction, addTransaction, transactions, fetchTransactionStatus]);

  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: false
        }}
      />
      
      <ScrollView 
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.headerContainer}>
          <Text style={[styles.headerTitle, { color: theme.text }]} allowFontScaling={false}>
            {getTranslation('Transaction Details', 'Детали транзакции')}
          </Text>
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
        
        {isLoading ? (
          <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
            <Text style={[styles.loadingText, { color: theme.text }]} allowFontScaling={false}>
              {getTranslation('Loading transaction details...', 'Загрузка деталей транзакции...')}
            </Text>
          </View>
        ) : !transaction ? (
          <View style={[styles.errorContainer, { backgroundColor: theme.background }]}>
            <AlertCircle size={48} color={theme.notification} />
            <Text style={[styles.errorTitle, { color: theme.text }]} allowFontScaling={false}>
              {getTranslation('Transaction Not Found', 'Транзакция не найдена')}
            </Text>
            <Text style={[styles.errorText, { color: theme.placeholder }]} allowFontScaling={false}>
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
        ) : (
          <>
            {/* Status Card */}
            <Card style={styles.statusCard}>
              <View style={styles.statusHeader}>
                {getStatusIcon(transaction.status)}
                <Text style={[styles.statusText, { color: getStatusColor(transaction.status) }]} allowFontScaling={false}>
                  {getStatusText(transaction.status)}
                </Text>
              </View>
              
              <Text style={[styles.amountText, { color: theme.text }]} allowFontScaling={false}>
                ₽{transaction.amount.toLocaleString()}
              </Text>
              
              <View style={styles.idContainer}>
                <Text style={[styles.idLabel, { color: theme.placeholder }]} allowFontScaling={false}>
                  {getTranslation('Transaction ID:', 'ID транзакции:')}
                </Text>
                <Text style={[styles.idValue, { color: theme.text }]} allowFontScaling={false}>
                  {transaction.id}
                </Text>
              </View>
            </Card>
            
            {/* Details Card */}
            <Card style={styles.detailsCard}>
              <Text style={[styles.sectionTitle, { color: theme.text }]} allowFontScaling={false}>
                {getTranslation('Transaction Details', 'Детали транзакции')}
              </Text>
              
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.placeholder }]} allowFontScaling={false}>
                  {getTranslation('Created', 'Создано')}
                </Text>
                <Text style={[styles.detailValue, { color: theme.text }]} allowFontScaling={false}>
                  {formatDate(transaction.createdAt)}
                </Text>
              </View>
              
              {transaction.finishedAt && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.placeholder }]} allowFontScaling={false}>
                    {getTranslation('Completed', 'Завершено')}
                  </Text>
                  <Text style={[styles.detailValue, { color: theme.text }]} allowFontScaling={false}>
                    {formatDate(transaction.finishedAt)}
                  </Text>
                </View>
              )}
              
              {transaction.customerInfo && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.placeholder }]} allowFontScaling={false}>
                    {getTranslation('Customer', 'Покупатель')}
                  </Text>
                  <Text style={[styles.detailValue, { color: theme.text }]} allowFontScaling={false}>
                    {transaction.customerInfo}
                  </Text>
                </View>
              )}
              
              {transaction.merchantName && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.placeholder }]} allowFontScaling={false}>
                    {getTranslation('Merchant', 'Продавец')}
                  </Text>
                  <Text style={[styles.detailValue, { color: theme.text }]} allowFontScaling={false}>
                    {transaction.merchantName}
                  </Text>
                </View>
              )}
              
              {transaction.commission !== undefined && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.placeholder }]} allowFontScaling={false}>
                    {getTranslation('Commission', 'Комиссия')}
                  </Text>
                  <Text style={[styles.detailValue, { color: theme.text }]} allowFontScaling={false}>
                    ₽{transaction.commission.toLocaleString()}
                  </Text>
                </View>
              )}
              
              {transaction.tag && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.placeholder }]} allowFontScaling={false}>
                    {getTranslation('SBP ID', 'СБП ID')}
                  </Text>
                  <Text style={[styles.detailValue, { color: theme.text }]} allowFontScaling={false}>
                    {transaction.tag}
                  </Text>
                </View>
              )}
              
              {transaction.paymentUrl && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.placeholder }]} allowFontScaling={false}>
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
                      allowFontScaling={false}
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
                <Text style={[styles.sectionTitle, { color: theme.text }]} allowFontScaling={false}>
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
                      <Text style={[styles.productName, { color: theme.text }]} allowFontScaling={false}>
                        {product.name}
                      </Text>
                      <Text style={[styles.productPrice, { color: theme.placeholder }]} allowFontScaling={false}>
                        ₽{product.price.toLocaleString()} × {product.quantity}
                      </Text>
                    </View>
                    <Text style={[styles.productTotal, { color: theme.text }]} allowFontScaling={false}>
                      ₽{(product.price * product.quantity).toLocaleString()}
                    </Text>
                  </View>
                ))}
                
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, { color: theme.text }]} allowFontScaling={false}>
                    {getTranslation('Total', 'Итого')}
                  </Text>
                  <Text style={[styles.totalValue, { color: theme.text }]} allowFontScaling={false}>
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
          </>
        )}
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
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scaleSpacing(16),
  },
  headerTitle: {
    fontSize: scaleFontSize(20),
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: scaleSpacing(24),
    minHeight: 300,
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
    minHeight: 300,
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