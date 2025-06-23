import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  Platform,
  Image,
  ActivityIndicator,
  Linking,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ErrorPopup } from '@/components/ErrorPopup';
import { useAuthStore } from '@/store/auth-store';
import { useLanguageStore } from '@/store/language-store';
import { useThemeStore } from '@/store/theme-store';
import { checkTransactionStatus } from '@/utils/api';
import { PaymentHistoryItem, Transaction } from '@/types/api';
import { formatMoscowTime } from '@/utils/timezone';
import colors from '@/constants/colors';
import IMAGES from '@/constants/images';
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Copy, 
  RefreshCw,
  ExternalLink,
  Calendar,
  CreditCard,
  User,
  Hash,
  DollarSign,
  AlertCircle,
  Printer
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { scaleFontSize, scaleSpacing } from '@/utils/responsive';

const { width: screenWidth } = Dimensions.get('window');

export default function TransactionDetailsScreen() {
  const router = useRouter();
  const { id, data } = useLocalSearchParams();
  const { credentials } = useAuthStore();
  const { language } = useLanguageStore();
  const { darkMode } = useThemeStore();
  const theme = darkMode ? colors.dark : colors.light;
  
  const [transaction, setTransaction] = useState<PaymentHistoryItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  
  // Load transaction data
  useEffect(() => {
    if (data && typeof data === 'string') {
      try {
        const parsedTransaction = JSON.parse(data);
        setTransaction(parsedTransaction);
      } catch (error) {
        console.error('Error parsing transaction data:', error);
        setError(language === 'en' ? 'Invalid transaction data' : 'Неверные данные транзакции');
        setShowErrorPopup(true);
      }
    } else if (id && credentials) {
      // If no data provided, fetch from API
      fetchTransactionDetails();
    }
  }, [id, data, credentials, language]);
  
  const fetchTransactionDetails = async () => {
    if (!id || !credentials) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await checkTransactionStatus(credentials, id as string);
      
      if (result.found && result.transaction) {
        // Convert Transaction to PaymentHistoryItem format
        const convertedTransaction: PaymentHistoryItem = {
          id: result.transaction.id,
          amount: result.transaction.amount,
          totalCommission: result.transaction.commission || 0,
          currency: 643, // RUB
          paymentDirection: 1,
          paymentType: 1,
          paymentStatus: result.transaction.status === 'completed' ? 3 : result.transaction.status === 'failed' ? 2 : 1,
          comment: result.transaction.customerInfo || '',
          accountToName: result.transaction.merchantName || '',
          amountFrom: result.transaction.amount,
          amountTo: result.transaction.amount,
          rubRate: 1,
          currencyFrom: 643,
          currencyTo: 643,
          totalCommissionFrom: result.transaction.commission || 0,
          totalCommissionTo: result.transaction.commission || 0,
          createdAt: result.transaction.createdAt,
          finishedAt: result.transaction.finishedAt,
          tag: result.transaction.tag
        };
        setTransaction(convertedTransaction);
      } else {
        setError(result.error || (language === 'en' ? 'Transaction not found' : 'Транзакция не найдена'));
        setShowErrorPopup(true);
      }
    } catch (error) {
      console.error('Error fetching transaction details:', error);
      setError(language === 'en' ? 'Failed to load transaction details' : 'Не удалось загрузить детали транзакции');
      setShowErrorPopup(true);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRefresh = async () => {
    if (!id || !credentials) return;
    
    setIsRefreshing(true);
    
    try {
      const result = await checkTransactionStatus(credentials, id as string);
      
      if (result.found && result.transaction) {
        // Convert Transaction to PaymentHistoryItem format
        const convertedTransaction: PaymentHistoryItem = {
          id: result.transaction.id,
          amount: result.transaction.amount,
          totalCommission: result.transaction.commission || 0,
          currency: 643, // RUB
          paymentDirection: 1,
          paymentType: 1,
          paymentStatus: result.transaction.status === 'completed' ? 3 : result.transaction.status === 'failed' ? 2 : 1,
          comment: result.transaction.customerInfo || '',
          accountToName: result.transaction.merchantName || '',
          amountFrom: result.transaction.amount,
          amountTo: result.transaction.amount,
          rubRate: 1,
          currencyFrom: 643,
          currencyTo: 643,
          totalCommissionFrom: result.transaction.commission || 0,
          totalCommissionTo: result.transaction.commission || 0,
          createdAt: result.transaction.createdAt,
          finishedAt: result.transaction.finishedAt,
          tag: result.transaction.tag
        };
        setTransaction(convertedTransaction);
        Alert.alert(
          language === 'en' ? 'Updated' : 'Обновлено',
          language === 'en' ? 'Transaction status updated' : 'Статус транзакции обновлен'
        );
      } else {
        Alert.alert(
          language === 'en' ? 'Error' : 'Ошибка',
          result.error || (language === 'en' ? 'Transaction not found' : 'Транзакция не найдена')
        );
      }
    } catch (error) {
      console.error('Error refreshing transaction:', error);
      Alert.alert(
        language === 'en' ? 'Error' : 'Ошибка',
        language === 'en' ? 'Failed to refresh transaction' : 'Не удалось обновить транзакцию'
      );
    } finally {
      setIsRefreshing(false);
    }
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
      Alert.alert(
        language === 'en' ? 'Error' : 'Ошибка',
        language === 'en' ? 'Failed to copy to clipboard' : 'Не удалось скопировать в буфер обмена'
      );
    }
  };
  
  const generatePDFReceipt = async () => {
    if (!transaction) return;
    
    try {
      // Generate receipt data
      const receiptData = {
        transactionId: transaction.id,
        amount: transaction.amount,
        status: getStatusText(transaction.paymentStatus),
        date: formatMoscowTime(transaction.createdAt, language),
        customerInfo: transaction.comment || '',
        merchantName: transaction.accountToName || '',
        tag: transaction.tag || '',
        commission: transaction.totalCommission || 0
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
        language === 'en' ? 'Error' : 'Ошибка',
        language === 'en' ? 'Failed to generate PDF receipt' : 'Не удалось создать PDF чек'
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
            color: #007AFF;
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
        
        .qr-placeholder {
            width: 100px;
            height: 100px;
            background: #f0f0f0;
            border: 2px dashed #ccc;
            margin: 20px auto;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
            font-size: 12px;
            color: #999;
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
            <img src="${IMAGES.LOGO}" alt="MPSPAY" style="width: 80px; height: 80px; border-radius: 12px;" />
        </div>
        <div class="company-name">MPSPAY</div>
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
        <div class="qr-placeholder">
            QR-код для проверки
        </div>
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
  
  const getStatusIcon = (paymentStatus: number) => {
    switch (paymentStatus) {
      case 3:
        return <CheckCircle size={24} color={theme.success} />;
      case 2:
        return <XCircle size={24} color={theme.notification} />;
      default:
        return <Clock size={24} color={theme.warning} />;
    }
  };
  
  const getStatusText = (paymentStatus: number) => {
    switch (paymentStatus) {
      case 3:
        return language === 'en' ? 'Completed' : 'Оплачен';
      case 2:
        return language === 'en' ? 'Failed' : 'Не оплачен';
      default:
        return language === 'en' ? 'Pending' : 'В ожидании';
    }
  };
  
  const getStatusColor = (paymentStatus: number) => {
    switch (paymentStatus) {
      case 3:
        return theme.success;
      case 2:
        return theme.notification;
      default:
        return theme.warning;
    }
  };
  
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <Stack.Screen 
          options={{
            title: language === 'en' ? 'Transaction Details' : 'Детали операции',
            headerShown: true,
            headerStyle: { backgroundColor: theme.background },
            headerTintColor: theme.text,
            headerTitleStyle: { color: theme.text },
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]} allowFontScaling={false}>
            {language === 'en' ? 'Loading transaction details...' : 'Загрузка деталей транзакции...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }
  
  if (!transaction) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <Stack.Screen 
          options={{
            title: language === 'en' ? 'Transaction Details' : 'Детали операции',
            headerShown: true,
            headerStyle: { backgroundColor: theme.background },
            headerTintColor: theme.text,
            headerTitleStyle: { color: theme.text },
          }}
        />
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color={theme.notification} />
          <Text style={[styles.errorTitle, { color: theme.text }]} allowFontScaling={false}>
            {language === 'en' ? 'Transaction Not Found' : 'Транзакция не найдена'}
          </Text>
          <Text style={[styles.errorMessage, { color: theme.placeholder }]} allowFontScaling={false}>
            {language === 'en' 
              ? 'The requested transaction could not be found or loaded.'
              : 'Запрашиваемая транзакция не найдена или не может быть загружена.'}
          </Text>
          <Button
            title={language === 'en' ? 'Go Back' : 'Назад'}
            onPress={() => router.back()}
            style={styles.backButton}
          />
        </View>
        
        <ErrorPopup
          visible={showErrorPopup}
          message={error || (language === 'en' ? 'An error occurred' : 'Произошла ошибка')}
          onClose={() => setShowErrorPopup(false)}
          darkMode={darkMode}
          title={language === 'en' ? 'Error' : 'Ошибка'}
        />
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <Stack.Screen 
        options={{
          title: language === 'en' ? 'Transaction Details' : 'Детали операции',
          headerShown: true,
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          headerTitleStyle: { color: theme.text },
          headerRight: () => (
            <TouchableOpacity 
              onPress={handleRefresh}
              style={styles.headerButton}
              disabled={isRefreshing}
            >
              <RefreshCw 
                size={20} 
                color={theme.primary} 
                style={isRefreshing ? styles.rotating : undefined}
              />
            </TouchableOpacity>
          ),
        }}
      />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Card */}
        <Card style={styles.statusCard}>
          <View style={styles.statusHeader}>
            {getStatusIcon(transaction.paymentStatus)}
            <View style={styles.statusTextContainer}>
              <Text style={[styles.statusTitle, { color: getStatusColor(transaction.paymentStatus) }]} allowFontScaling={false}>
                {getStatusText(transaction.paymentStatus)}
              </Text>
              <Text style={[styles.transactionId, { color: theme.placeholder }]} allowFontScaling={false}>
                {language === 'en' ? 'Transaction' : 'Транзакция'} #{transaction.id}
              </Text>
            </View>
          </View>
          
          <View style={styles.amountContainer}>
            <Text style={[styles.amountLabel, { color: theme.placeholder }]} allowFontScaling={false}>
              {language === 'en' ? 'Amount' : 'Сумма'}
            </Text>
            <Text style={[styles.amountValue, { color: theme.text }]} allowFontScaling={false}>
              ₽{transaction.amount.toLocaleString(undefined, {maximumFractionDigits: 2})}
            </Text>
          </View>
        </Card>
        
        {/* Transaction Details */}
        <Card style={styles.detailsCard}>
          <Text style={[styles.sectionTitle, { color: theme.text }]} allowFontScaling={false}>
            {language === 'en' ? 'Transaction Details' : 'Детали транзакции'}
          </Text>
          
          <View style={styles.detailsList}>
            {/* Transaction ID */}
            <View style={styles.detailItem}>
              <View style={styles.detailHeader}>
                <Hash size={16} color={theme.placeholder} />
                <Text style={[styles.detailLabel, { color: theme.placeholder }]} allowFontScaling={false}>
                  {language === 'en' ? 'Transaction ID' : 'ID транзакции'}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.copyableValue}
                onPress={() => copyToClipboard(transaction.id, language === 'en' ? 'Transaction ID' : 'ID транзакции')}
              >
                <Text style={[styles.detailValue, { color: theme.text }]} allowFontScaling={false}>
                  {transaction.id}
                </Text>
                <Copy size={16} color={theme.primary} />
              </TouchableOpacity>
            </View>
            
            {/* Amount */}
            <View style={styles.detailItem}>
              <View style={styles.detailHeader}>
                <DollarSign size={16} color={theme.placeholder} />
                <Text style={[styles.detailLabel, { color: theme.placeholder }]} allowFontScaling={false}>
                  {language === 'en' ? 'Amount' : 'Сумма'}
                </Text>
              </View>
              <Text style={[styles.detailValue, { color: theme.text }]} allowFontScaling={false}>
                ₽{transaction.amount.toLocaleString(undefined, {maximumFractionDigits: 2})}
              </Text>
            </View>
            
            {/* Commission */}
            {transaction.totalCommission !== undefined && transaction.totalCommission > 0 && (
              <View style={styles.detailItem}>
                <View style={styles.detailHeader}>
                  <CreditCard size={16} color={theme.placeholder} />
                  <Text style={[styles.detailLabel, { color: theme.placeholder }]} allowFontScaling={false}>
                    {language === 'en' ? 'Commission' : 'Комиссия'}
                  </Text>
                </View>
                <Text style={[styles.detailValue, { color: theme.text }]} allowFontScaling={false}>
                  ₽{transaction.totalCommission.toLocaleString(undefined, {maximumFractionDigits: 2})}
                </Text>
              </View>
            )}
            
            {/* Customer Info / Comment */}
            {transaction.comment && (
              <View style={styles.detailItem}>
                <View style={styles.detailHeader}>
                  <User size={16} color={theme.placeholder} />
                  <Text style={[styles.detailLabel, { color: theme.placeholder }]} allowFontScaling={false}>
                    {language === 'en' ? 'Comment' : 'Комментарий'}
                  </Text>
                </View>
                <Text style={[styles.detailValue, { color: theme.text }]} allowFontScaling={false}>
                  {transaction.comment}
                </Text>
              </View>
            )}
            
            {/* SBP ID */}
            {transaction.tag && transaction.paymentStatus === 3 && (
              <View style={styles.detailItem}>
                <View style={styles.detailHeader}>
                  <ExternalLink size={16} color={theme.placeholder} />
                  <Text style={[styles.detailLabel, { color: theme.placeholder }]} allowFontScaling={false}>
                    {language === 'en' ? 'SBP ID' : 'СБП ID'}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.copyableValue}
                  onPress={() => copyToClipboard(transaction.tag!, language === 'en' ? 'SBP ID' : 'СБП ID')}
                >
                  <Text style={[styles.detailValue, { color: theme.text }]} allowFontScaling={false}>
                    {transaction.tag}
                  </Text>
                  <Copy size={16} color={theme.primary} />
                </TouchableOpacity>
              </View>
            )}
            
            {/* Created Date */}
            {transaction.createdAt && (
              <View style={styles.detailItem}>
                <View style={styles.detailHeader}>
                  <Calendar size={16} color={theme.placeholder} />
                  <Text style={[styles.detailLabel, { color: theme.placeholder }]} allowFontScaling={false}>
                    {language === 'en' ? 'Created' : 'Создано'}
                  </Text>
                </View>
                <Text style={[styles.detailValue, { color: theme.text }]} allowFontScaling={false}>
                  {formatMoscowTime(transaction.createdAt, language, {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </Text>
              </View>
            )}
            
            {/* Finished Date */}
            {transaction.finishedAt && (
              <View style={styles.detailItem}>
                <View style={styles.detailHeader}>
                  <CheckCircle size={16} color={theme.placeholder} />
                  <Text style={[styles.detailLabel, { color: theme.placeholder }]} allowFontScaling={false}>
                    {language === 'en' ? 'Completed' : 'Завершено'}
                  </Text>
                </View>
                <Text style={[styles.detailValue, { color: theme.text }]} allowFontScaling={false}>
                  {formatMoscowTime(transaction.finishedAt, language, {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </Text>
              </View>
            )}
          </View>
        </Card>
        
        {/* Action Buttons */}
        <Card style={styles.actionsCard}>
          <Text style={[styles.sectionTitle, { color: theme.text }]} allowFontScaling={false}>
            {language === 'en' ? 'Actions' : 'Действия'}
          </Text>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: theme.card }]}
              onPress={generatePDFReceipt}
            >
              <Printer size={20} color={theme.primary} />
              <Text style={[styles.actionButtonText, { color: theme.text }]} allowFontScaling={false}>
                {language === 'en' ? 'PDF Receipt' : 'Счёт PDF'}
              </Text>
            </TouchableOpacity>
          </View>
        </Card>
        
        {/* Receipt Card */}
        <Card style={styles.receiptCard}>
          <View style={styles.receiptHeader}>
            <Image 
              source={{ uri: IMAGES.LOGO_TRANSACTION }} 
              style={styles.receiptLogo}
              resizeMode="contain"
            />
            <Text style={[styles.receiptTitle, { color: theme.text }]} allowFontScaling={false}>
              MPSPAY {language === 'en' ? 'Receipt' : 'Чек'}
            </Text>
          </View>
          
          <View style={styles.receiptDivider} />
          
          <View style={styles.receiptDetails}>
            <View style={styles.receiptRow}>
              <Text style={[styles.receiptLabel, { color: theme.placeholder }]} allowFontScaling={false}>
                {language === 'en' ? 'Transaction:' : 'Транзакция:'}
              </Text>
              <Text style={[styles.receiptValue, { color: theme.text }]} allowFontScaling={false}>
                #{transaction.id}
              </Text>
            </View>
            
            <View style={styles.receiptRow}>
              <Text style={[styles.receiptLabel, { color: theme.placeholder }]} allowFontScaling={false}>
                {language === 'en' ? 'Amount:' : 'Сумма:'}
              </Text>
              <Text style={[styles.receiptValue, { color: theme.text }]} allowFontScaling={false}>
                ₽{transaction.amount.toLocaleString(undefined, {maximumFractionDigits: 2})}
              </Text>
            </View>
            
            {transaction.totalCommission !== undefined && transaction.totalCommission > 0 && (
              <View style={styles.receiptRow}>
                <Text style={[styles.receiptLabel, { color: theme.placeholder }]} allowFontScaling={false}>
                  {language === 'en' ? 'Commission:' : 'Комиссия:'}
                </Text>
                <Text style={[styles.receiptValue, { color: theme.text }]} allowFontScaling={false}>
                  ₽{transaction.totalCommission.toLocaleString(undefined, {maximumFractionDigits: 2})}
                </Text>
              </View>
            )}
            
            <View style={styles.receiptRow}>
              <Text style={[styles.receiptLabel, { color: theme.placeholder }]} allowFontScaling={false}>
                {language === 'en' ? 'Status:' : 'Статус:'}
              </Text>
              <Text style={[styles.receiptValue, { color: getStatusColor(transaction.paymentStatus) }]} allowFontScaling={false}>
                {getStatusText(transaction.paymentStatus)}
              </Text>
            </View>
            
            {transaction.createdAt && (
              <View style={styles.receiptRow}>
                <Text style={[styles.receiptLabel, { color: theme.placeholder }]} allowFontScaling={false}>
                  {language === 'en' ? 'Date:' : 'Дата:'}
                </Text>
                <Text style={[styles.receiptValue, { color: theme.text }]} allowFontScaling={false}>
                  {formatMoscowTime(transaction.createdAt, language)}
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.receiptDivider} />
          
          <Text style={[styles.receiptFooter, { color: theme.placeholder }]} allowFontScaling={false}>
            {language === 'en' 
              ? 'Thank you for using MPSPAY!' 
              : 'Спасибо за использование MPSPAY!'}
          </Text>
        </Card>
      </ScrollView>
      
      <ErrorPopup
        visible={showErrorPopup}
        message={error || (language === 'en' ? 'An error occurred' : 'Произошла ошибка')}
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
  errorTitle: {
    fontSize: scaleFontSize(20),
    fontWeight: 'bold',
    marginTop: scaleSpacing(16),
    marginBottom: scaleSpacing(8),
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: scaleFontSize(14),
    textAlign: 'center',
    marginBottom: scaleSpacing(24),
  },
  backButton: {
    minWidth: 120,
  },
  headerButton: {
    padding: scaleSpacing(8),
    marginRight: scaleSpacing(8),
  },
  rotating: {
    transform: Platform.OS === 'web' ? undefined : [{ rotate: '45deg' }],
  },
  // Status Card
  statusCard: {
    marginBottom: scaleSpacing(16),
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scaleSpacing(16),
  },
  statusTextContainer: {
    marginLeft: scaleSpacing(12),
    flex: 1,
  },
  statusTitle: {
    fontSize: scaleFontSize(20),
    fontWeight: 'bold',
    marginBottom: scaleSpacing(4),
  },
  transactionId: {
    fontSize: scaleFontSize(14),
  },
  amountContainer: {
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: scaleFontSize(14),
    marginBottom: scaleSpacing(4),
  },
  amountValue: {
    fontSize: scaleFontSize(32),
    fontWeight: 'bold',
  },
  // Details Card
  detailsCard: {
    marginBottom: scaleSpacing(16),
  },
  sectionTitle: {
    fontSize: scaleFontSize(18),
    fontWeight: '600',
    marginBottom: scaleSpacing(16),
  },
  detailsList: {
    gap: scaleSpacing(16),
  },
  detailItem: {
    gap: scaleSpacing(8),
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleSpacing(8),
  },
  detailLabel: {
    fontSize: scaleFontSize(14),
    fontWeight: '500',
  },
  detailValue: {
    fontSize: scaleFontSize(16),
    fontWeight: '400',
  },
  copyableValue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // Actions Card
  actionsCard: {
    marginBottom: scaleSpacing(16),
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: scaleSpacing(12),
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: scaleSpacing(12),
    borderRadius: 8,
    gap: scaleSpacing(8),
  },
  actionButtonText: {
    fontSize: scaleFontSize(14),
    fontWeight: '500',
  },
  // Receipt Card
  receiptCard: {
    marginBottom: scaleSpacing(16),
  },
  receiptHeader: {
    alignItems: 'center',
    marginBottom: scaleSpacing(16),
  },
  receiptLogo: {
    width: 60,
    height: 60,
    marginBottom: scaleSpacing(8),
  },
  receiptTitle: {
    fontSize: scaleFontSize(18),
    fontWeight: 'bold',
  },
  receiptDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginVertical: scaleSpacing(16),
  },
  receiptDetails: {
    gap: scaleSpacing(12),
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptLabel: {
    fontSize: scaleFontSize(14),
  },
  receiptValue: {
    fontSize: scaleFontSize(14),
    fontWeight: '500',
  },
  receiptFooter: {
    textAlign: 'center',
    fontSize: scaleFontSize(12),
    fontStyle: 'italic',
  },
});