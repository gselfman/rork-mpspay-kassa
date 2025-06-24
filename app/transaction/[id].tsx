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
  Linking,
  Image
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
import IMAGES from '@/constants/images';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw, 
  ArrowLeft, 
  Printer,
  AlertCircle
} from 'lucide-react-native';
import { scaleFontSize, scaleSpacing } from '@/utils/responsive';
import { formatMoscowTime } from '@/utils/timezone';

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
      return formatMoscowTime(dateString, language);
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
  
  // Generate PDF receipt
  const generatePDFReceipt = async () => {
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
      
      // Create PDF-optimized HTML content
      const htmlContent = generatePDFReceiptHTML(receiptData);
      
      if (Platform.OS === 'web') {
        // For web, create a new window with print-optimized content
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          
          // Wait for content to load, then trigger print dialog
          printWindow.onload = () => {
            setTimeout(() => {
              printWindow.print();
            }, 500);
          };
        }
      } else {
        // For mobile - use Blob API
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        await Linking.openURL(url);
        
        // Clean up URL after 5 seconds
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }
    } catch (error) {
      console.error('Error generating PDF receipt:', error);
      Alert.alert(
        getTranslation('Error', 'Ошибка'),
        getTranslation(
          'Failed to generate PDF receipt',
          'Не удалось создать PDF чек'
        )
      );
    }
  };
  
  // Generate PDF-optimized HTML receipt
  const generatePDFReceiptHTML = (data: any): string => {
    return `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Чек - ${data.transactionId}</title>
    <style>
        @page {
            size: A4;
            margin: 20mm;
        }
        
        body { 
            font-family: 'Arial', sans-serif; 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px; 
            background: white;
            color: #333;
            line-height: 1.4;
        }
        
        .header { 
            text-align: center; 
            border-bottom: 3px solid #007AFF; 
            padding-bottom: 20px; 
            margin-bottom: 30px; 
        }
        
        .logo { 
            width: 100px; 
            height: 100px; 
            margin: 0 auto 20px; 
            border-radius: 16px;
            background: linear-gradient(135deg, #007AFF, #5856D6);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            color: white;
            font-weight: bold;
        }
        
        .company-name {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 8px;
            color: #FF8C00;
        }
        
        .receipt-title {
            font-size: 20px;
            color: #666;
            font-weight: 500;
        }
        
        .content {
            margin: 30px 0;
        }
        
        .row { 
            display: flex; 
            justify-content: space-between; 
            margin: 16px 0; 
            padding: 12px 0;
            border-bottom: 1px dotted #ddd;
            align-items: center;
        }
        
        .row:last-child {
            border-bottom: none;
        }
        
        .label {
            font-weight: 600;
            color: #555;
            font-size: 16px;
        }
        
        .value {
            font-weight: bold;
            color: #000;
            font-size: 16px;
            text-align: right;
        }
        
        .total { 
            font-weight: bold; 
            font-size: 1.5em; 
            border-top: 3px solid #007AFF; 
            padding-top: 20px; 
            margin-top: 30px;
            background: linear-gradient(135deg, #f8f9fa, #e9ecef);
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .status {
            padding: 8px 16px;
            border-radius: 25px;
            font-size: 14px;
            font-weight: bold;
            display: inline-block;
        }
        
        .status.completed {
            background: #d4edda;
            color: #155724;
            border: 2px solid #c3e6cb;
        }
        
        .status.failed {
            background: #f8d7da;
            color: #721c24;
            border: 2px solid #f5c6cb;
        }
        
        .status.pending {
            background: #fff3cd;
            color: #856404;
            border: 2px solid #ffeaa7;
        }
        
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 30px;
            border-top: 2px solid #eee;
            color: #666;
            font-size: 14px;
        }
        
        @media print { 
            body { 
                margin: 0; 
                padding: 15px;
                font-size: 14px;
            }
            
            .no-print {
                display: none;
            }
            
            .header {
                break-inside: avoid;
            }
            
            .total {
                break-inside: avoid;
            }
        }
        
        @media screen {
            body {
                box-shadow: 0 0 20px rgba(0,0,0,0.1);
                border-radius: 8px;
                margin: 20px auto;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">
            <img src="https://i.imgur.com/5la0Aov.png" alt="MPSPAY" style="width: 80px; height: 80px; border-radius: 12px;" />
        </div>
        <div class="company-name">MPSPAY Kassa</div>
        <div class="receipt-title">Чек об оплате</div>
    </div>
    
    <div class="content">
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
            <span class="label">Дата и время:</span>
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
                <span class="label">Итого к оплате:</span>
                <span class="value">₽${data.amount.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</span>
            </div>
        </div>
    </div>
    
    <div class="footer">
        <p><strong>Спасибо за использование MPSPAY!</strong></p>
        <p>Дата печати: ${new Date().toLocaleString('ru-RU')}</p>
        <p>Этот документ является электронным чеком</p>
    </div>
    
    <script>
        // Auto-print for PDF generation
        window.onload = function() {
            setTimeout(function() {
                if (window.location.search.includes('print=true')) {
                    window.print();
                }
            }, 1000);
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
          <Image 
            source={IMAGES.LOGO} 
            style={styles.logo}
            resizeMode="contain"
          />
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
                title={getTranslation('PDF Receipt', 'Счёт PDF')}
                onPress={generatePDFReceipt}
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
  logo: {
    width: 40,
    height: 40,
    marginRight: scaleSpacing(8),
  },
  headerTitle: {
    fontSize: scaleFontSize(20),
    fontWeight: 'bold',
    flex: 1,
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