import React, { useState, useEffect } from 'react';
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
  Modal,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';
import { useLanguageStore } from '@/store/language-store';
import { useThemeStore } from '@/store/theme-store';
import { checkTransactionStatus } from '@/utils/api';
import { Transaction, PaymentHistoryItem } from '@/types/api';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ErrorPopup } from '@/components/ErrorPopup';
import colors from '@/constants/colors';
import { 
  CheckCircle, 
  Clock, 
  XCircle, 
  Share2, 
  FileText, 
  Copy,
  Download,
  Mail,
  X
} from 'lucide-react-native';
import { scaleFontSize, scaleSpacing } from '@/utils/responsive';
import * as Clipboard from 'expo-clipboard';

export default function TransactionDetailsScreen() {
  const { id, data } = useLocalSearchParams<{ id: string; data?: string }>();
  const router = useRouter();
  const credentials = useAuthStore((state) => state.credentials);
  const { language } = useLanguageStore();
  const { darkMode } = useThemeStore();
  const theme = darkMode ? colors.dark : colors.light;
  
  const [transaction, setTransaction] = useState<Transaction | PaymentHistoryItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  useEffect(() => {
    if (data) {
      // Parse the passed data
      try {
        const parsedData = JSON.parse(data);
        setTransaction(parsedData);
      } catch (error) {
        console.error('Error parsing transaction data:', error);
        fetchTransactionDetails();
      }
    } else {
      fetchTransactionDetails();
    }
  }, [id, data]);
  
  const fetchTransactionDetails = async () => {
    if (!credentials || !id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await checkTransactionStatus(credentials, id);
      
      if (result.found && result.transaction) {
        setTransaction(result.transaction);
      } else {
        setError(result.error || (language === 'en' ? 'Transaction not found' : 'Транзакция не найдена'));
        setShowErrorPopup(true);
      }
    } catch (err) {
      console.error('Error fetching transaction details:', err);
      setError(err instanceof Error ? err.message : String(err));
      setShowErrorPopup(true);
    } finally {
      setIsLoading(false);
    }
  };
  
  const isPaymentHistoryItem = (item: any): item is PaymentHistoryItem => {
    return item && 'paymentStatus' in item;
  };
  
  const getStatus = (): 'pending' | 'completed' | 'failed' => {
    if (!transaction) return 'pending';
    
    if (isPaymentHistoryItem(transaction)) {
      switch (transaction.paymentStatus) {
        case 3:
          return 'completed';
        case 2:
          return 'failed';
        case 1:
        default:
          return 'pending';
      }
    } else {
      return transaction.status;
    }
  };
  
  const getStatusIcon = () => {
    const status = getStatus();
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
  
  const getStatusText = () => {
    const status = getStatus();
    switch (status) {
      case 'completed':
        return language === 'en' ? 'Completed' : 'Выполнено';
      case 'failed':
        return language === 'en' ? 'Failed' : 'Ошибка';
      case 'pending':
      default:
        return language === 'en' ? 'Pending' : 'В обработке';
    }
  };
  
  const getStatusColor = () => {
    const status = getStatus();
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
  
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(language === 'en' ? 'en-US' : 'ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (error) {
      return dateString || '';
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
    }
  };
  
  const shareTransaction = async () => {
    if (!transaction) return;
    
    const status = getStatus();
    const description = isPaymentHistoryItem(transaction) 
      ? transaction.comment || ''
      : transaction.customerInfo || '';
    
    const shareText = `${language === 'en' ? 'Transaction Details' : 'Детали транзакции'}:
${language === 'en' ? 'ID' : 'ID'}: ${transaction.id}
${language === 'en' ? 'Amount' : 'Сумма'}: ${transaction.amount} ₽
${language === 'en' ? 'Status' : 'Статус'}: ${getStatusText()}
${language === 'en' ? 'Description' : 'Описание'}: ${description}`;
    
    try {
      if (Platform.OS === 'web') {
        // Web fallback - check if navigator.share is available
        if (navigator.share) {
          await navigator.share({
            title: language === 'en' ? 'Transaction Details' : 'Детали транзакции',
            text: shareText,
          });
        } else {
          // Fallback to copying to clipboard
          await navigator.clipboard.writeText(shareText);
          Alert.alert(
            language === 'en' ? 'Copied' : 'Скопировано',
            language === 'en' ? 'Transaction details copied to clipboard' : 'Детали транзакции скопированы в буфер обмена'
          );
        }
      } else {
        await Share.share({
          message: shareText,
          title: language === 'en' ? 'Transaction Details' : 'Детали транзакции',
        });
      }
    } catch (error) {
      console.error('Error sharing transaction:', error);
      // Fallback to copying to clipboard
      try {
        await Clipboard.setStringAsync(shareText);
        Alert.alert(
          language === 'en' ? 'Copied' : 'Скопировано',
          language === 'en' ? 'Transaction details copied to clipboard' : 'Детали транзакции скопированы в буфер обмена'
        );
      } catch (clipboardError) {
        console.error('Error copying to clipboard:', clipboardError);
      }
    }
  };
  
  const generatePDFReceipt = async () => {
    if (!transaction) return;
    
    setIsGeneratingPDF(true);
    
    try {
      // Simulate PDF generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      Alert.alert(
        language === 'en' ? 'PDF Generated' : 'PDF создан',
        language === 'en' 
          ? 'Receipt has been generated successfully. In a real app, this would download or share the PDF file.'
          : 'Чек успешно создан. В реальном приложении это бы скачало или поделилось PDF файлом.',
        [
          {
            text: language === 'en' ? 'OK' : 'ОК',
            style: 'default'
          }
        ]
      );
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert(
        language === 'en' ? 'Error' : 'Ошибка',
        language === 'en' 
          ? 'Failed to generate PDF receipt'
          : 'Не удалось создать PDF чек'
      );
    } finally {
      setIsGeneratingPDF(false);
    }
  };
  
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Stack.Screen 
          options={{ 
            title: language === 'en' ? 'Transaction Details' : 'Детали транзакции',
            headerStyle: { backgroundColor: theme.background },
            headerTintColor: theme.text,
          }} 
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>
            {language === 'en' ? 'Loading transaction details...' : 'Загрузка деталей транзакции...'}
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
            title: language === 'en' ? 'Transaction Details' : 'Детали транзакции',
            headerStyle: { backgroundColor: theme.background },
            headerTintColor: theme.text,
          }} 
        />
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.notification }]}>
            {language === 'en' ? 'Transaction not found' : 'Транзакция не найдена'}
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
  
  const status = getStatus();
  const description = isPaymentHistoryItem(transaction) 
    ? transaction.comment || ''
    : transaction.customerInfo || '';
  const merchantName = isPaymentHistoryItem(transaction) 
    ? transaction.accountToName || ''
    : transaction.merchantName || '';
  const createdAt = isPaymentHistoryItem(transaction) 
    ? transaction.createdAt || ''
    : transaction.createdAt || '';
  const finishedAt = isPaymentHistoryItem(transaction) 
    ? transaction.finishedAt || ''
    : transaction.finishedAt || '';
  
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen 
        options={{ 
          title: language === 'en' ? 'Transaction Details' : 'Детали транзакции',
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
        }} 
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <Card style={styles.statusCard}>
          <View style={styles.statusHeader}>
            {getStatusIcon()}
            <Text style={[styles.statusText, { color: getStatusColor() }]}>
              {getStatusText()}
            </Text>
          </View>
          <Text style={[styles.amount, { color: theme.text }]}>
            {transaction.amount} ₽
          </Text>
        </Card>
        
        {/* Transaction Details */}
        <Card style={styles.detailsCard}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {language === 'en' ? 'Transaction Details' : 'Детали транзакции'}
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
          
          {description && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.placeholder }]}>
                {language === 'en' ? 'Description' : 'Описание'}
              </Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>
                {description}
              </Text>
            </View>
          )}
          
          {merchantName && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.placeholder }]}>
                {language === 'en' ? 'Merchant' : 'Мерчант'}
              </Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>
                {merchantName}
              </Text>
            </View>
          )}
          
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.placeholder }]}>
              {language === 'en' ? 'Created' : 'Создано'}
            </Text>
            <Text style={[styles.detailValue, { color: theme.text }]}>
              {formatDate(createdAt)}
            </Text>
          </View>
          
          {finishedAt && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.placeholder }]}>
                {language === 'en' ? 'Completed' : 'Завершено'}
              </Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>
                {formatDate(finishedAt)}
              </Text>
            </View>
          )}
          
          {isPaymentHistoryItem(transaction) && transaction.totalCommission > 0 && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.placeholder }]}>
                {language === 'en' ? 'Commission' : 'Комиссия'}
              </Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>
                {transaction.totalCommission} ₽
              </Text>
            </View>
          )}
        </Card>
        
        {/* Actions */}
        <Card style={styles.actionsCard}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {language === 'en' ? 'Actions' : 'Действия'}
          </Text>
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: theme.primary + '20' }]}
            onPress={shareTransaction}
          >
            <Share2 size={20} color={theme.primary} />
            <Text style={[styles.actionButtonText, { color: theme.primary }]}>
              {language === 'en' ? 'Share Transaction' : 'Поделиться транзакцией'}
            </Text>
          </TouchableOpacity>
          
          {status === 'completed' && (
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: theme.success + '20' }]}
              onPress={generatePDFReceipt}
              disabled={isGeneratingPDF}
            >
              {isGeneratingPDF ? (
                <ActivityIndicator size={20} color={theme.success} />
              ) : (
                <FileText size={20} color={theme.success} />
              )}
              <Text style={[styles.actionButtonText, { color: theme.success }]}>
                {isGeneratingPDF 
                  ? (language === 'en' ? 'Generating...' : 'Создание...')
                  : (language === 'en' ? 'Generate PDF Receipt' : 'Создать PDF чек')
                }
              </Text>
            </TouchableOpacity>
          )}
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
  },
  detailsCard: {
    padding: scaleSpacing(20),
    marginBottom: scaleSpacing(16),
  },
  actionsCard: {
    padding: scaleSpacing(20),
    marginBottom: scaleSpacing(24),
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
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scaleSpacing(16),
    borderRadius: 12,
    marginBottom: scaleSpacing(12),
  },
  actionButtonText: {
    fontSize: scaleFontSize(16),
    fontWeight: '500',
    marginLeft: scaleSpacing(12),
  },
});