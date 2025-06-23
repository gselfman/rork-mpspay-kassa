import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  TextInput
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
import { formatMoscowTime, formatMoscowTimeForCSV } from '@/utils/timezone';
import colors from '@/constants/colors';
import IMAGES from '@/constants/images';
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
  
  // СКОПИРУЙ И ЗАМЕНИ ЭТОТ БЛОК В history.tsx

  // 1. Стабилизируем функцию fetchAllTransactions, оставляя только 'credentials' в зависимостях.
  // Теперь ее ссылка не будет меняться при каждом рендере.
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
      
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
      
      console.log(`Fetching payment history from ${thirtyDaysAgoStr} to ${tomorrowStr}`);
      
      const apiTransactions = await getPaymentHistory(credentials, thirtyDaysAgoStr, tomorrowStr);
      console.log('Fetched transactions:', apiTransactions);
      
      if (apiTransactions.isSuccess && apiTransactions.items && apiTransactions.items.length > 0) {
        const sortedTransactions = [...apiTransactions.items].sort((a, b) => {
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
  
  // 2. Исправляем useFocusEffect.
  // Мы используем fetchAllTransactions, но не включаем ее в зависимости,
  // так как она уже стабилизирована через useCallback и зависит только от 'credentials'.
  useFocusEffect(
    useCallback(() => {
      if (credentials) {
        fetchAllTransactions();
      }
      // Следующая строка отключает предупреждение линтера, так как мы намеренно
      // не включаем fetchAllTransactions в зависимости, чтобы избежать цикла.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [credentials]) // Эффект перезапустится ТОЛЬКО при изменении credentials.
  );
  
  // 3. Исправляем handleRefresh по тому же принципу.
  const handleRefresh = useCallback(() => {
    if (credentials) {
      fetchAllTransactions(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credentials]);
  
  const handleTransactionPress = useCallback((transaction: PaymentHistoryItem) => {
    // Navigate to transaction details page using id_2.tsx
    router.push({
      pathname: '/transaction/id_2',
      params: { 
        id: transaction.id,
        data: JSON.stringify(transaction)
      }
    });
  }, [router]);
  
  const handleShareTransaction = useCallback((transaction: PaymentHistoryItem) => {
    setSelectedTransaction(transaction);
    setShowShareModal(true);
  }, []);
  
  const handleDateFilterPress = useCallback(() => {
    setShowDateFilterModal(true);
  }, []);
  
  const applyDateFilter = useCallback((filter: 'today' | 'week' | 'month' | 'custom' | null) => {
    if (filter === filterDateRange) return; // Prevent unnecessary updates
    
    if (filter === 'custom') {
      // Validate custom date range
      if (!customStartDate || !customEndDate) {
        setDateFilterError(language === 'en' 
          ? 'Please enter both start and end dates' 
          : 'Пожалуйста, введите начальную и конечную даты');
        return;
      }
      
      try {
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
  }, [filterDateRange, customStartDate, customEndDate, language]);
  
  // Memoize filtered transactions to prevent unnecessary recalculations
  const filteredTransactions = useMemo(() => {
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
          today.setHours(0, 0, 0, 0);
          
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          
          dateFiltered = allTransactions.filter(t => {
            if (!t.createdAt) return false;
            
            const transactionDate = new Date(t.createdAt);
            return transactionDate >= today && transactionDate < tomorrow;
          });
          
          console.log(`Filtered to ${dateFiltered.length} transactions for today`);
          break;
          
        case 'week':
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
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
            startDate.setHours(0, 0, 0, 0);
            
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
  }, [allTransactions, filterDateRange, showSuccessful, showPending, customStartDate, customEndDate]);
  
  const handleSendTelegram = useCallback(async () => {
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
  }, [selectedTransaction, credentials, language]);
  
  const handleSendEmail = useCallback(async () => {
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
  }, [selectedTransaction, credentials, language]);
  
  const exportToCSV = useCallback(async () => {
    setIsExporting(true);
    
    try {
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
        language === 'en' ? 'Date (Moscow Time)' : 'Дата (Московское время)',
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
          transaction.createdAt ? `"${formatMoscowTimeForCSV(transaction.createdAt)}"` : '',
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
        const { Share } = await import('react-native');
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
  }, [filteredTransactions, language]);
  
  const renderItem = useCallback(({ item }: { item: PaymentHistoryItem }) => (
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
        {item.comment ? (
          <Text style={[styles.comment, { color: theme.text }]} numberOfLines={2} allowFontScaling={false}>
            {item.comment}
          </Text>
        ) : null}
        
        <Text style={[styles.paymentId, { color: theme.placeholder }]} allowFontScaling={false}>
          {language === 'en' ? 'Payment ID:' : 'ID платежа:'} {item.id}
        </Text>
        
        {item.tag && item.paymentStatus === 3 ? (
          <Text style={[styles.sbpId, { color: theme.placeholder }]} allowFontScaling={false}>
            {language === 'en' ? 'SBP ID:' : 'СБП ID:'} {item.tag}
          </Text>
        ) : null}
        
        <Text style={[styles.date, { color: theme.placeholder }]} allowFontScaling={false}>
          {formatMoscowTime(item.createdAt, language)}
        </Text>
      </View>
    </TouchableOpacity>
  ), [theme, language, handleTransactionPress, handleShareTransaction]);
  
  const renderHeader = useCallback(() => (
    <View style={styles.header}>
      <Image 
        source={IMAGES.LOGO_REPORTS} 
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
  ), [theme, language, exportToCSV, isExporting, handleDateFilterPress, handleRefresh, isRefreshing]);
  
  const renderEmpty = useCallback(() => {
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
  }, [isLoading, theme, language, error, showErrorPopup, handleRefresh, darkMode, router]);
  
  const renderFilterBanner = useCallback(() => {
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
          fontSize: scaleFontSize(14)
        }]} allowFontScaling={false}>
          {filterText}
        </Text>
        
        <TouchableOpacity 
          style={styles.clearFilterButton}
          onPress={() => {
            setFilterDateRange('month');
            setShowSuccessful(false);
            setShowPending(false);
          }}
        >
          <Text style={[styles.clearFilterText, { 
            color: theme.primary,
            fontSize: scaleFontSize(14)
          }]} allowFontScaling={false}>
            {language === 'en' ? 'Clear' : 'Очистить'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }, [showSuccessful, showPending, language, filterDateRange, customStartDate, customEndDate, theme]);
  
  const renderCheckStatusButton = useCallback(() => (
    <TouchableOpacity 
      style={[styles.checkStatusButton, { backgroundColor: theme.card }]}
      onPress={() => router.push('/transaction/check')}
    >
      <CheckCircle size={20} color={theme.primary} />
      <Text style={[styles.checkStatusText, { color: theme.text }]} allowFontScaling={false}>
        {language === 'en' ? 'Check Transaction Status' : 'Проверить статус транзакции'}
      </Text>
    </TouchableOpacity>
  ), [theme, language, router]);
  
  const renderStatusFilters = useCallback(() => (
    <View style={styles.statusFilters}>
      <TouchableOpacity
        style={[
          styles.statusFilterButton,
          showSuccessful && styles.statusFilterButtonActive,
          { backgroundColor: showSuccessful ? theme.primary + '20' : theme.card, borderColor: theme.border }
        ]}
        onPress={() => setShowSuccessful(!showSuccessful)}
      >
        <Text style={[
          styles.statusFilterButtonText,
          { color: showSuccessful ? theme.primary : theme.text }
        ]} allowFontScaling={false}>
          {language === 'en' ? 'Successful' : 'Успешные'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.statusFilterButton,
          showPending && styles.statusFilterButtonActive,
          { backgroundColor: showPending ? theme.primary + '20' : theme.card, borderColor: theme.border }
        ]}
        onPress={() => setShowPending(!showPending)}
      >
        <Text style={[
          styles.statusFilterButtonText,
          { color: showPending ? theme.primary : theme.text }
        ]} allowFontScaling={false}>
          {language === 'en' ? 'Pending' : 'В ожидании'}
        </Text>
      </TouchableOpacity>
    </View>
  ), [showSuccessful, showPending, theme, language]);

  const renderDateButtons = useCallback(() => (
    <View style={styles.dateButtons}>
      <TouchableOpacity
        style={[
          styles.dateButton,
          filterDateRange === 'today' && styles.dateButtonActive,
          { backgroundColor: filterDateRange === 'today' ? theme.primary + '20' : theme.card, borderColor: theme.border }
        ]}
        onPress={() => applyDateFilter('today')}
      >
        <Text style={[
          styles.dateButtonText,
          { color: filterDateRange === 'today' ? theme.primary : theme.text }
        ]} allowFontScaling={false}>
          {language === 'en' ? 'Today' : 'Сегодня'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.dateButton,
          filterDateRange === 'week' && styles.dateButtonActive,
          { backgroundColor: filterDateRange === 'week' ? theme.primary + '20' : theme.card, borderColor: theme.border }
        ]}
        onPress={() => applyDateFilter('week')}
      >
        <Text style={[
          styles.dateButtonText,
          { color: filterDateRange === 'week' ? theme.primary : theme.text }
        ]} allowFontScaling={false}>
          {language === 'en' ? 'Week' : 'Неделя'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.dateButton,
          filterDateRange === 'month' && styles.dateButtonActive,
          { backgroundColor: filterDateRange === 'month' ? theme.primary + '20' : theme.card, borderColor: theme.border }
        ]}
        onPress={() => applyDateFilter('month')}
      >
        <Text style={[
          styles.dateButtonText,
          { color: filterDateRange === 'month' ? theme.primary : theme.text }
        ]} allowFontScaling={false}>
          {language === 'en' ? 'Month' : 'Месяц'}
        </Text>
      </TouchableOpacity>
    </View>
  ), [filterDateRange, theme, language, applyDateFilter]);

  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: false
        }}
      />
      
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {renderHeader()}
        
        {renderStatusFilters()}
        
        {renderDateButtons()}
        
        {renderFilterBanner()}
        
        <FlatList
          data={filteredTransactions}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderCheckStatusButton}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[theme.primary]}
              tintColor={theme.primary}
            />
          }
        />
        
        {/* Share Modal */}
        <Modal
          visible={showShareModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowShareModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.shareModalContent, { backgroundColor: theme.background }]}>
              <Text style={[styles.shareModalTitle, { color: theme.text }]} allowFontScaling={false}>
                {language === 'en' ? 'Send Transaction Details' : 'Отправить детали операции'}
              </Text>
              
              <View style={styles.shareOptions}>
                <TouchableOpacity 
                  style={[styles.shareOption, { backgroundColor: theme.card }]}
                  onPress={handleSendTelegram}
                  disabled={isSending}
                >
                  <MessageCircle size={24} color={theme.primary} />
                  <Text style={[styles.shareOptionText, { color: theme.text }]} allowFontScaling={false}>
                    {language === 'en' ? 'Send to Telegram' : 'Отправить в Телеграм'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.shareOption, { backgroundColor: theme.card }]}
                  onPress={handleSendEmail}
                  disabled={isSending}
                >
                  <Mail size={24} color={theme.primary} />
                  <Text style={[styles.shareOptionText, { color: theme.text }]} allowFontScaling={false}>
                    {language === 'en' ? 'Send via Email' : 'Отправить по Email'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              <Button
                title={language === 'en' ? 'Cancel' : 'Отмена'}
                variant="outline"
                onPress={() => setShowShareModal(false)}
                style={styles.cancelButton}
                disabled={isSending}
              />
            </View>
          </View>
        </Modal>
        
        {/* Date Filter Modal */}
        <Modal
          visible={showDateFilterModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowDateFilterModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]} allowFontScaling={false}>
                {language === 'en' ? 'Custom Date Range' : 'Произвольный период'}
              </Text>
              
              <ScrollView style={styles.modalScroll}>
                <View style={[styles.customDateContainer, { borderColor: theme.border }]}>
                  <View style={styles.customDateInputs}>
                    <View style={styles.dateInputContainer}>
                      <Text style={[styles.dateInputLabel, { color: theme.placeholder }]} allowFontScaling={false}>
                        {language === 'en' ? 'From' : 'С'}
                      </Text>
                      <View style={[styles.dateInput, { 
                        borderColor: theme.border,
                        backgroundColor: theme.inputBackground
                      }]}>
                        <TextInput
                          placeholder="YYYY-MM-DD"
                          value={customStartDate}
                          onChangeText={setCustomStartDate}
                          style={{ color: theme.text }}
                          placeholderTextColor={theme.placeholder}
                          allowFontScaling={false}
                        />
                      </View>
                    </View>
                    
                    <View style={styles.dateInputContainer}>
                      <Text style={[styles.dateInputLabel, { color: theme.placeholder }]} allowFontScaling={false}>
                        {language === 'en' ? 'To' : 'По'}
                      </Text>
                      <View style={[styles.dateInput, { 
                        borderColor: theme.border,
                        backgroundColor: theme.inputBackground
                      }]}>
                        <TextInput
                          placeholder="YYYY-MM-DD"
                          value={customEndDate}
                          onChangeText={setCustomEndDate}
                          style={{ color: theme.text }}
                          placeholderTextColor={theme.placeholder}
                          allowFontScaling={false}
                        />
                      </View>
                    </View>
                  </View>
                  
                  {dateFilterError ? (
                    <Text style={[styles.dateFilterError, { color: theme.notification }]} allowFontScaling={false}>
                      {dateFilterError}
                    </Text>
                  ) : null}
                  
                  <Button
                    title={language === 'en' ? 'Apply Custom Range' : 'Применить'}
                    onPress={() => applyDateFilter('custom')}
                    style={styles.applyCustomButton}
                    size="small"
                  />
                </View>
              </ScrollView>
              
              <View style={styles.modalButtons}>
                <Button
                  title={language === 'en' ? 'Close' : 'Закрыть'}
                  variant="outline"
                  onPress={() => setShowDateFilterModal(false)}
                  style={styles.modalButton}
                />
              </View>
            </View>
          </View>
        </Modal>
        
        {/* Error Popup */}
        <ErrorPopup
          visible={showErrorPopup}
          message={error || (language === 'en' ? 'An error occurred' : 'Произошла ошибка')}
          onClose={() => setShowErrorPopup(false)}
          darkMode={darkMode}
          title={language === 'en' ? 'Error' : 'Ошибка'}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scaleSpacing(16),
    paddingTop: scaleSpacing(16),
    paddingBottom: scaleSpacing(8),
  },
  logo: {
    width: 40,
    height: 40,
    marginRight: scaleSpacing(8),
  },
  title: {
    fontWeight: 'bold',
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  rotating: {
    transform: Platform.OS === 'web' ? undefined : [{ rotate: '45deg' }],
  },
  listContent: {
    padding: scaleSpacing(16),
    paddingTop: scaleSpacing(8),
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: scaleSpacing(24),
  },
  loadingText: {
    marginTop: scaleSpacing(16),
  },
  filterBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: scaleSpacing(12),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  filterText: {
    fontSize: 14,
    flex: 1,
  },
  clearFilterButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearFilterText: {
    fontWeight: '500',
  },
  // Transaction item styles
  transactionItem: {
    borderRadius: 12,
    padding: scaleSpacing(16),
    marginBottom: scaleSpacing(12),
    borderWidth: 1,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scaleSpacing(12),
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusText: {
    marginLeft: scaleSpacing(8),
    fontSize: scaleFontSize(14),
    fontWeight: '500',
  },
  transactionActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amount: {
    fontSize: scaleFontSize(18),
    fontWeight: 'bold',
    marginRight: scaleSpacing(8),
  },
  shareButton: {
    padding: scaleSpacing(4),
  },
  content: {
    gap: scaleSpacing(4),
  },
  comment: {
    fontSize: scaleFontSize(16),
    fontWeight: '500',
    lineHeight: scaleFontSize(20),
    marginBottom: scaleSpacing(4),
  },
  paymentId: {
    fontSize: scaleFontSize(12),
    fontFamily: 'monospace',
  },
  sbpId: {
    fontSize: scaleFontSize(12),
    fontFamily: 'monospace',
  },
  date: {
    fontSize: scaleFontSize(12),
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalScroll: {
    maxHeight: 400,
  },
  customDateContainer: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
  },
  customDateInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dateInputContainer: {
    width: '48%',
  },
  dateInputLabel: {
    marginBottom: 4,
    fontSize: 14,
  },
  dateInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  dateFilterError: {
    marginBottom: 12,
    fontSize: 14,
  },
  applyCustomButton: {
    marginTop: 8,
  },
  modalButtons: {
    marginTop: 16,
    flexDirection: 'row',
  },
  modalButton: {
    flex: 1,
  },
  // Check status button
  checkStatusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 24,
  },
  checkStatusText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  // Status filters
  statusFilters: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: scaleSpacing(8),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  statusFilterButton: {
    flex: 1,
    padding: scaleSpacing(8),
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    marginHorizontal: scaleSpacing(4),
  },
  statusFilterButtonActive: {
    borderWidth: 2,
  },
  statusFilterButtonText: {
    fontSize: scaleFontSize(14),
    fontWeight: '500',
  },
  // Date buttons
  dateButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: scaleSpacing(8),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  dateButton: {
    flex: 1,
    padding: scaleSpacing(8),
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    marginHorizontal: scaleSpacing(2),
  },
  dateButtonActive: {
    borderWidth: 2,
  },
  dateButtonText: {
    fontSize: scaleFontSize(12),
    fontWeight: '500',
  },
  // Share modal styles
  shareModalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 20,
  },
  shareModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  shareOptions: {
    marginBottom: 20,
  },
  shareOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  shareOptionText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  cancelButton: {
    marginTop: 8,
  },
});