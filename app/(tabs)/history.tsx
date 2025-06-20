import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  RefreshControl, 
  TouchableOpacity, 
  Alert,
  Platform,
  ActivityIndicator,
  Modal,
  ScrollView,
  Image,
  TextInput,
  Share
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/Button';
import { ErrorPopup } from '@/components/ErrorPopup';
import { useAuthStore } from '@/store/auth-store';
import { useLanguageStore } from '@/store/language-store';
import { useThemeStore } from '@/store/theme-store';
import { getPaymentHistory, sendTransactionDetailsTelegram, sendTransactionDetailsEmail } from '@/utils/api';
import { PaymentHistoryItem } from '@/types/api';
import colors from '@/constants/colors';
import { Calendar, RefreshCw, AlertCircle, CalendarIcon, CheckCircle, Send, Mail, MessageCircle, Clock, XCircle, Download } from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import { scaleFontSize, scaleSpacing } from '@/utils/responsive';

export default function HistoryScreen() {
  const router = useRouter();
  const { credentials } = useAuthStore();
  const { language } = useLanguageStore();
  const { darkMode } = useThemeStore();
  const theme = darkMode ? colors.dark : colors.light;
  
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [filterDateRange, setFilterDateRange] = useState<'today' | 'week' | 'month' | 'custom' | null>('month');
  const [showDateFilterModal, setShowDateFilterModal] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [dateFilterError, setDateFilterError] = useState<string | null>(null);
  const [showSuccessful, setShowSuccessful] = useState(false);
  const [showPending, setShowPending] = useState(false);
  const [allTransactions, setAllTransactions] = useState<PaymentHistoryItem[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<PaymentHistoryItem | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Fetch all transactions for the last 30 days
  const fetchAllTransactions = useCallback(async (refresh = false) => {
    if (!credentials) return;
    
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    
    setError(null);
    
    try {
      console.log('Fetching all transactions for the last 30 days...');
      
      // Calculate date range (last 30 days)
      const now = new Date();
      
      // Date for tomorrow (to include all of today's transactions)
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0]; // Format: YYYY-MM-DD
      
      // Date 30 days ago
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]; // Format: YYYY-MM-DD
      
      console.log(`Fetching payment history from ${thirtyDaysAgoStr} to ${tomorrowStr}`);
      
      const apiTransactions = await getPaymentHistory(credentials, thirtyDaysAgoStr, tomorrowStr);
      console.log('Fetched transactions:', apiTransactions);
      
      if (apiTransactions.isSuccess && apiTransactions.items && apiTransactions.items.length > 0) {
        // Sort transactions by ID (largest first)
        const sortedTransactions = [...apiTransactions.items].sort((a, b) => {
          // Parse IDs as integers and sort in descending order
          return parseInt(b.id) - parseInt(a.id);
        });
        
        setAllTransactions(sortedTransactions);
        console.log(`Set ${sortedTransactions.length} transactions in state`);
      } else {
        console.log('No transactions found or API returned empty array');
        setAllTransactions([]);
      }
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
      
      // Create detailed error message
      let errorMsg = '';
      
      if (err instanceof Error) {
        errorMsg = `Failed to load transaction history: ${err.message}`;
      } else {
        errorMsg = `Failed to load transaction history: ${String(err)}`;
      }
      
      setError(errorMsg);
      setShowErrorPopup(true);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [credentials]);
  
  // Fetch transactions when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (credentials) {
        fetchAllTransactions();
      }
    }, [credentials, fetchAllTransactions])
  );
  
  const handleRefresh = () => {
    fetchAllTransactions(true);
  };
  
  const handleTransactionPress = (transaction: PaymentHistoryItem) => {
    // Navigate to transaction details page using id_2.tsx
    router.push({
      pathname: '/transaction/id_2',
      params: { 
        id: transaction.id,
        data: JSON.stringify(transaction)
      }
    });
  };
  
  const handleShareTransaction = (transaction: PaymentHistoryItem) => {
    setSelectedTransaction(transaction);
    setShowShareModal(true);
  };
  
  const handleDateFilterPress = () => {
    setShowDateFilterModal(true);
  };
  
  const applyDateFilter = (filter: 'today' | 'week' | 'month' | 'custom' | null) => {
    if (filter === 'custom') {
      // Validate custom date range
      if (!customStartDate || !customEndDate) {
        setDateFilterError(language === 'en' 
          ? 'Please enter both start and end dates' 
          : 'Пожалуйста, введите начальную и конечную даты');
        return;
      }
      
      try {
        // Fix: Add null checks before creating Date objects
        if (customStartDate && customEndDate) {
          const startDate = new Date(customStartDate);
          const endDate = new Date(customEndDate);
          
          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            setDateFilterError(language === 'en' 
              ? 'Invalid date format. Use YYYY-MM-DD' 
              : 'Неверный формат даты. Используйте ГГГГ-ММ-ДД');
            return;
          }
          
          if (startDate > endDate) {
            setDateFilterError(language === 'en' 
              ? 'Start date must be before end date' 
              : 'Начальная дата должна быть раньше конечной');
            return;
          }
        }
      } catch (error) {
        setDateFilterError(language === 'en' 
          ? 'Invalid date format. Use YYYY-MM-DD' 
          : 'Неверный формат даты. Используйте ГГГГ-ММ-ДД');
        return;
      }
    }
    
    setFilterDateRange(filter);
    setShowDateFilterModal(false);
    setDateFilterError(null);
  };
  
  const getFilteredTransactions = (): PaymentHistoryItem[] => {
    if (!allTransactions || allTransactions.length === 0) {
      console.log('No transactions to filter');
      return [];
    }
    
    console.log(`Filtering ${allTransactions.length} transactions`);
    
    // First filter by date
    let dateFiltered = allTransactions;
    
    if (filterDateRange) {
      const now = new Date();
      
      switch (filterDateRange) {
        case 'today':
          const today = new Date();
          today.setHours(0, 0, 0, 0); // Start of today
          
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1); // Start of tomorrow
          
          dateFiltered = allTransactions.filter(t => {
            if (!t.createdAt) return false;
            
            const transactionDate = new Date(t.createdAt);
            return transactionDate >= today && transactionDate < tomorrow;
          });
          
          console.log(`Filtered to ${dateFiltered.length} transactions for today`);
          break;
          
        case 'week':
          // 7 days ago from start of today
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0); // Start of today
          const weekAgo = new Date(todayStart);
          weekAgo.setDate(todayStart.getDate() - 7);
          
          dateFiltered = allTransactions.filter(t => {
            if (!t.createdAt) return false;
            
            const transactionDate = new Date(t.createdAt);
            return transactionDate >= weekAgo;
          });
          
          console.log(`Filtered to ${dateFiltered.length} transactions for last 7 days`);
          break;
          
        case 'custom':
          if (customStartDate && customEndDate) {
            const startDate = new Date(customStartDate);
            startDate.setHours(0, 0, 0, 0); // Start of start date
            
            // Set end date to end of the day (23:59:59.999)
            const endDate = new Date(customEndDate);
            endDate.setHours(23, 59, 59, 999);
            
            dateFiltered = allTransactions.filter(t => {
              if (!t.createdAt) return false;
              
              const transactionDate = new Date(t.createdAt);
              return transactionDate >= startDate && transactionDate <= endDate;
            });
            
            console.log(`Filtered to ${dateFiltered.length} transactions for custom range`);
          }
          break;
          
        case 'month':
        default:
          // Already have all transactions for the last 30 days
          break;
      }
    }
    
    // Then filter by status
    let statusFiltered = dateFiltered;
    
    if (showSuccessful && !showPending) {
      statusFiltered = dateFiltered.filter(t => t.paymentStatus === 3);
    } else if (!showSuccessful && showPending) {
      statusFiltered = dateFiltered.filter(t => t.paymentStatus === 1);
    } else if (showSuccessful && showPending) {
      statusFiltered = dateFiltered.filter(t => t.paymentStatus === 3 || t.paymentStatus === 1);
    } else {
      // If neither is selected, show all transactions
      statusFiltered = dateFiltered;
    }
    
    console.log(`Filtered to ${statusFiltered.length} transactions after status filter`);
    return statusFiltered;
  };
  
  const handleSendTelegram = async () => {
    if (!selectedTransaction || !credentials) return;
    
    setIsSending(true);
    try {
      const success = await sendTransactionDetailsTelegram(selectedTransaction, credentials, language);
      if (success) {
        Alert.alert(
          language === 'en' ? 'Success' : 'Успех',
          language === 'en' ? 'Transaction details sent to Telegram' : 'Детали операции отправлены в Телеграм'
        );
      } else {
        Alert.alert(
          language === 'en' ? 'Error' : 'Ошибка',
          language === 'en' ? 'Failed to send to Telegram' : 'Не удалось отправить в Телеграм'
        );
      }
    } catch (error) {
      Alert.alert(
        language === 'en' ? 'Error' : 'Ошибка',
        language === 'en' ? 'Failed to send to Telegram' : 'Не удалось отправить в Телеграм'
      );
    } finally {
      setIsSending(false);
      setShowShareModal(false);
    }
  };
  
  const handleSendEmail = async () => {
    if (!selectedTransaction || !credentials) return;
    
    // Prompt for email address
    Alert.prompt(
      language === 'en' ? 'Send via Email' : 'Отправить по Email',
      language === 'en' ? 'Enter email address:' : 'Введите email адрес:',
      async (email) => {
        if (!email || !email.includes('@')) {
          Alert.alert(
            language === 'en' ? 'Error' : 'Ошибка',
            language === 'en' ? 'Please enter a valid email address' : 'Пожалуйста, введите корректный email адрес'
          );
          return;
        }
        
        setIsSending(true);
        try {
          const success = await sendTransactionDetailsEmail(selectedTransaction, email, credentials, language);
          if (success) {
            Alert.alert(
              language === 'en' ? 'Success' : 'Успех',
              language === 'en' ? 'Transaction details sent to email' : 'Детали операции отправлены на email'
            );
          } else {
            Alert.alert(
              language === 'en' ? 'Error' : 'Ошибка',
              language === 'en' ? 'Failed to send email' : 'Не удалось отправить email'
            );
          }
        } catch (error) {
          Alert.alert(
            language === 'en' ? 'Error' : 'Ошибка',
            language === 'en' ? 'Failed to send email' : 'Не удалось отправить email'
          );
        } finally {
          setIsSending(false);
          setShowShareModal(false);
        }
      },
      'plain-text'
    );
  };
  
  const exportToCSV = async () => {
    setIsExporting(true);
    
    try {
      const filteredTransactions = getFilteredTransactions();
      
      if (filteredTransactions.length === 0) {
        Alert.alert(
          language === 'en' ? 'No Data' : 'Нет данных',
          language === 'en' ? 'No transactions to export' : 'Нет транзакций для экспорта'
        );
        return;
      }
      
      // Create CSV content
      const headers = [
        language === 'en' ? 'ID' : 'ID',
        language === 'en' ? 'Amount' : 'Сумма',
        language === 'en' ? 'Status' : 'Статус',
        language === 'en' ? 'Date' : 'Дата',
        language === 'en' ? 'Comment' : 'Комментарий',
        language === 'en' ? 'SBP ID' : 'СБП ID',
        language === 'en' ? 'Commission' : 'Комиссия'
      ];
      
      const csvRows = [headers.join(',')];
      
      filteredTransactions.forEach(transaction => {
        const statusText = transaction.paymentStatus === 3 
          ? (language === 'en' ? 'Successful' : 'Успешный')
          : transaction.paymentStatus === 2 
            ? (language === 'en' ? 'Failed' : 'Неуспешный')
            : (language === 'en' ? 'Pending' : 'В ожидании');
        
        const row = [
          transaction.id,
          transaction.amount,
          `"${statusText}"`,
          transaction.createdAt ? `"${new Date(transaction.createdAt).toLocaleString()}"` : '',
          transaction.comment ? `"${transaction.comment.replace(/"/g, '""')}"` : '',
          transaction.tag || '',
          transaction.totalCommission || 0
        ];
        
        csvRows.push(row.join(','));
      });
      
      const csvContent = csvRows.join('\n');
      
      // Create filename with current date
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const filename = `transactions_${dateStr}.csv`;
      
      if (Platform.OS === 'web') {
        // For web, create a download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        Alert.alert(
          language === 'en' ? 'Success' : 'Успех',
          language === 'en' ? 'Transactions exported successfully' : 'Транзакции успешно экспортированы'
        );
      } else {
        // For mobile, use sharing
        await Share.share({
          message: csvContent,
          title: filename
        });
      }
    } catch (error) {
      console.error('Error exporting CSV:', error);
      Alert.alert(
        language === 'en' ? 'Error' : 'Ошибка',
        language === 'en' ? 'Failed to export transactions' : 'Не удалось экспортировать транзакции'
      );
    } finally {
      setIsExporting(false);
    }
  };
  
  const filteredTransactions = getFilteredTransactions();
  
  const renderItem = ({ item }: { item: PaymentHistoryItem }) => (
    <TouchableOpacity 
      style={[styles.transactionItem, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={() => handleTransactionPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.transactionHeader}>
        <View style={styles.statusContainer}>
          {item.paymentStatus === 3 ? (
            <CheckCircle size={20} color={theme.success} />
          ) : item.paymentStatus === 2 ? (
            <XCircle size={20} color={theme.notification} />
          ) : (
            <Clock size={20} color={theme.warning} />
          )}
          <Text style={[styles.statusText, { 
            color: item.paymentStatus === 3 
              ? theme.success 
              : item.paymentStatus === 2 
                ? theme.notification 
                : theme.warning 
          }]} allowFontScaling={false}>
            {item.paymentStatus === 3 
              ? (language === 'en' ? 'Successful' : 'Успешный') 
              : item.paymentStatus === 2 
                ? (language === 'en' ? 'Not paid' : 'Не оплачен') 
                : (language === 'en' ? 'Pending' : 'В ожидании')}
          </Text>
        </View>
        <View style={styles.transactionActions}>
          <Text style={[styles.amount, { color: theme.text }]} allowFontScaling={false}>
            ₽{item.amount}
          </Text>
          <TouchableOpacity 
            style={styles.shareButton}
            onPress={(e) => {
              e.stopPropagation();
              handleShareTransaction(item);
            }}
          >
            <Send size={16} color={theme.primary} />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.content}>
        {item.comment && (
          <Text style={[styles.comment, { color: theme.text }]} numberOfLines={2} allowFontScaling={false}>
            {item.comment}
          </Text>
        )}
        
        <Text style={[styles.paymentId, { color: theme.placeholder }]} allowFontScaling={false}>
          {language === 'en' ? 'Payment ID:' : 'ID платежа:'} {item.id}
        </Text>
        
        {item.tag && item.paymentStatus === 3 && (
          <Text style={[styles.sbpId, { color: theme.placeholder }]} allowFontScaling={false}>
            {language === 'en' ? 'SBP ID:' : 'СБП ID:'} {item.tag}
          </Text>
        )}
        
        <Text style={[styles.date, { color: theme.placeholder }]} allowFontScaling={false}>
          {item.createdAt ? new Date(item.createdAt).toLocaleDateString(language === 'en' ? 'en-US' : 'ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }) : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );
  
  const renderHeader = () => (
    <View style={styles.header}>
      <Image 
        source={{ uri: 'https://i.imgur.com/QCp2zDE.png' }} 
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={[styles.title, { 
        color: theme.text,
        fontSize: scaleFontSize(Platform.OS === 'android' ? 20 : 22)
      }]} allowFontScaling={false}>
        {language === 'en' ? 'Report' : 'Отчёт'}
      </Text>
      
      <View style={styles.actions}>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: theme.card }]}
          onPress={exportToCSV}
          disabled={isExporting}
        >
          <Download size={20} color={theme.primary} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: theme.card }]}
          onPress={handleDateFilterPress}
        >
          <CalendarIcon size={20} color={theme.primary} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: theme.card }]}
          onPress={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw 
            size={20} 
            color={theme.primary} 
            style={isRefreshing ? styles.rotating : undefined}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
  
  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { 
            color: theme.text,
            fontSize: scaleFontSize(16)
          }]} allowFontScaling={false}>
            {language === 'en' ? 'Loading transactions...' : 'Загрузка транзакций...'}
          </Text>
        </View>
      );
    }
    
    if (error && !showErrorPopup) {
      return (
        <EmptyState
          title={language === 'en' ? 'Error Loading Transactions' : 'Ошибка загрузки транзакций'}
          message={error}
          buttonTitle={language === 'en' ? 'Try Again' : 'Попробовать снова'}
          onButtonPress={handleRefresh}
          icon={<AlertCircle size={48} color={theme.notification} />}
          darkMode={darkMode}
        />
      );
    }
    
    return (
      <EmptyState
        title={language === 'en' ? 'No Transactions Found' : 'Транзакции не найдены'}
        message={language === 'en' 
          ? 'No transactions match your current filters. Try changing your filters or create a new payment.'
          : 'Нет транзакций, соответствующих текущим фильтрам. Попробуйте изменить фильтры или создать новый платеж.'}
        buttonTitle={language === 'en' ? 'Create Payment' : 'Создать платеж'}
        onButtonPress={() => router.push('/(tabs)/payment')}
        icon={<Calendar size={48} color={theme.primary} />}
        darkMode={darkMode}
      />
    );
  };
  
  const renderFilterBanner = () => {
    let filterText = '';
    
    if (showSuccessful || showPending) {
      filterText += language === 'en' ? 'Status: ' : 'Статус: ';
      if (showSuccessful && !showPending) {
        filterText += language === 'en' ? 'Successful only' : 'Только успешные';
      } else if (!showSuccessful && showPending) {
        filterText += language === 'en' ? 'Pending only' : 'Только в ожидании';
      } else if (showSuccessful && showPending) {
        filterText += language === 'en' ? 'Successful and Pending' : 'Успешные и в ожидании';
      }
    }
    
    if (filterDateRange) {
      if (filterText) filterText += ' • ';
      
      filterText += language === 'en' ? 'Period: ' : 'Период: ';
      
      switch (filterDateRange) {
        case 'today':
          filterText += language === 'en' ? 'Today' : 'Сегодня';
          break;
        case 'week':
          filterText += language === 'en' ? 'Last 7 days' : 'Последние 7 дней';
          break;
        case 'month':
          filterText += language === 'en' ? 'Last 30 days' : 'Последние 30 дней';
          break;
        case 'custom':
          filterText += `${customStartDate} - ${customEndDate}`;
          break;
      }
    }
    
    if (!filterText) return null;
    
    return (
      <View style={[styles.filterBanner, { backgroundColor: theme.card }]}>
        <Text style={[styles.filterText, { 
          color: theme.text,