import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Image,
  Alert,
  Platform,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Linking
} from 'react-native';
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { ErrorPopup } from '@/components/ErrorPopup';
import { useAuthStore } from '@/store/auth-store';
import { useLanguageStore } from '@/store/language-store';
import { useThemeStore } from '@/store/theme-store';
import { useTransactionStore } from '@/store/transaction-store';
import { 
  getAccountBalance, 
  getPaymentHistory, 
  checkTransactionStatus,
  mapPaymentStatusToAppStatus
} from '@/utils/api';
import { PaymentHistoryItem, PaymentStats, Transaction } from '@/types/api';
import colors from '@/constants/colors';
import IMAGES from '@/constants/images';
import { 
  CreditCard, 
  RefreshCw, 
  ArrowRight,
  BarChart,
  Clock,
  TrendingUp,
  Calendar,
  ShoppingBag,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink
} from 'lucide-react-native';
import {
  scaleFontSize,
  scaleSpacing,
  isSmallDevice,
  isLargeDevice,
  getContainerPadding
} from '@/utils/responsive';

export default function HomeScreen() {
  const router = useRouter();
  const { credentials } = useAuthStore();
  const { language } = useLanguageStore();
  const { darkMode } = useThemeStore();
  const theme = darkMode ? colors.dark : colors.light;
  const { transactions, addTransaction } = useTransactionStore();
  
  const [balance, setBalance] = useState<number | null>(null);
  const [accountName, setAccountName] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<PaymentHistoryItem[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshingStats, setIsRefreshingStats] = useState(false);
  const [stats, setStats] = useState<PaymentStats>({
    successfulOperationsMonth: 0,
    successfulOperationsToday: 0,
    incomeMonth: 0,
    incomeToday: 0
  });
  const [error, setError] = useState<string | null>(null);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  
  // Transaction check state
  const [transactionIdToCheck, setTransactionIdToCheck] = useState('');
  const [isCheckingTransaction, setIsCheckingTransaction] = useState(false);
  const [checkedTransaction, setCheckedTransaction] = useState<any>(null);
  const [transactionCheckError, setTransactionCheckError] = useState<string | null>(null);
  
  // Ref for refresh interval
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Define calculateStats before it's used in fetchPaymentHistory
  const calculateStats = useCallback((transactions: PaymentHistoryItem[]) => {
    // Get today's date (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get tomorrow's date (start of tomorrow)
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    // Filter successful transactions (paymentStatus === 3)
    const successfulTransactions = transactions.filter(t => t.paymentStatus === 3);
    
    // Count successful transactions for the month (all in the response)
    const successfulOperationsMonth = successfulTransactions.length;
    
    // Filter successful transactions for today
    const successfulTransactionsToday = successfulTransactions.filter(t => {
      if (!t.createdAt) return false;
      const transactionDate = new Date(t.createdAt);
      
      // Check if transaction is between start of today and start of tomorrow
      return transactionDate >= today && transactionDate < tomorrow;
    });
    
    // Count successful transactions for today
    const successfulOperationsToday = successfulTransactionsToday.length;
    
    // Calculate income for the month (sum of amounts for successful transactions)
    const incomeMonth = successfulTransactions.reduce((sum, t) => sum + t.amount, 0);
    
    // Income for today
    const incomeToday = successfulTransactionsToday.reduce((sum, t) => sum + t.amount, 0);
    
    console.log('Statistics calculated:', {
      successfulOperationsMonth,
      successfulOperationsToday,
      incomeMonth,
      incomeToday,
      todayTransactions: successfulTransactionsToday.length,
      todayRange: `${today.toISOString()} - ${tomorrow.toISOString()}`
    });
    
    setStats({
      successfulOperationsMonth,
      successfulOperationsToday,
      incomeMonth,
      incomeToday
    });
  }, []);

  const fetchBalance = useCallback(async (showLoadingIndicator = true) => {
    if (!credentials) return;
    
    if (showLoadingIndicator) {
      setIsRefreshing(true);
    }
    
    try {
      console.log('Fetching balance data...');
      
      // Fetch account balance
      const accountBalanceData = await getAccountBalance(credentials);
      console.log('Account balance data:', accountBalanceData);
      
      setBalance(accountBalanceData.available);
      setAccountName(accountBalanceData.accountName || '');
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Error fetching balance:', err);
      if (!isInitialLoading) { // Don't show error on initial load
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(language === 'en' 
          ? 'Failed to fetch balance. Please try again later.'
          : 'Не удалось получить баланс. Пожалуйста, попробуйте позже.');
        setErrorDetails(errorMessage);
        setShowErrorPopup(true);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [credentials, language, isInitialLoading]);

  const fetchPaymentHistory = useCallback(async (showLoadingIndicator = true) => {
    if (!credentials) return;
    
    if (showLoadingIndicator) {
      setIsLoadingTransactions(true);
    }
    
    try {
      console.log('Fetching payment history...');
      
      // Calculate date range (last 30 days)
      const today = new Date();
      
      // Date for tomorrow (to include all of today's transactions)
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0]; // Format: YYYY-MM-DD
      
      // Date 30 days ago
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]; // Format: YYYY-MM-DD
      
      console.log(`Fetching payment history from ${thirtyDaysAgoStr} to ${tomorrowStr}`);
      
      // Fetch payment history for the last 30 days
      const historyData = await getPaymentHistory(
        credentials,
        thirtyDaysAgoStr,
        tomorrowStr
      );
      
      console.log('Payment history data:', historyData);
      
      if (historyData.isSuccess && historyData.items && historyData.items.length > 0) {
        // Sort transactions by ID (largest first)
        const sortedTransactions = [...historyData.items].sort((a, b) => {
          // Parse IDs as integers and sort in descending order
          return parseInt(b.id) - parseInt(a.id);
        });
        
        // Show 10 latest transactions (pending and completed)
        const latestTransactions = sortedTransactions.slice(0, 10);
        
        setRecentTransactions(latestTransactions);
        
        // Calculate stats
        calculateStats(historyData.items);
      } else {
        setRecentTransactions([]);
        setStats({
          successfulOperationsMonth: 0,
          successfulOperationsToday: 0,
          incomeMonth: 0,
          incomeToday: 0
        });
      }
    } catch (error) {
      console.error('Error fetching payment history:', error);
      setRecentTransactions([]);
      setStats({
        successfulOperationsMonth: 0,
        successfulOperationsToday: 0,
        incomeMonth: 0,
        incomeToday: 0
      });
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(language === 'en' 
        ? 'Failed to fetch payment history. Please try again later.'
        : 'Не удалось получить историю платежей. Пожалуйста, попробуйте позже.');
      setErrorDetails(errorMessage);
      setShowErrorPopup(true);
    } finally {
      setIsLoadingTransactions(false);
      setIsRefreshingStats(false);
      setIsInitialLoading(false);
    }
  }, [credentials, calculateStats, language]);

  const fetchData = useCallback(async (showLoadingIndicator = true) => {
    if (!credentials) return;
    
    if (showLoadingIndicator) {
      setIsRefreshing(true);
    }
    
    try {
      // Fetch balance
      await fetchBalance(false);
      
      // Fetch payment history
      await fetchPaymentHistory(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(language === 'en' 
        ? 'Failed to fetch data. Please try again later.'
        : 'Не удалось получить данные. Пожалуйста, попробуйте позже.');
      setErrorDetails(errorMessage);
      setShowErrorPopup(true);
    } finally {
      setIsRefreshing(false);
      setIsInitialLoading(false);
    }
  }, [fetchBalance, fetchPaymentHistory, language]);

  // Refresh data when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (credentials) {
        fetchData(false);
      }
    }, [credentials])
  );

  // Initial data fetch and interval setup
  useEffect(() => {
    let mounted = true;
    
    if (credentials && mounted) {
      fetchData();
      
      // Set up interval to refresh data every 2 minutes
      refreshIntervalRef.current = setInterval(() => {
        if (mounted && credentials) {
          fetchData(false);
        }
      }, 120000);
    }
    
    return () => {
      mounted = false;
      // Clear interval when component unmounts
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [credentials]);

  const handleCreatePayment = useCallback(() => {
    router.push('/payment');
  }, [router]);

  const handleWithdraw = useCallback(() => {
    router.push('/withdraw');
  }, [router]);

  const handleViewHistory = useCallback(() => {
    router.push('/history');
  }, [router]);

  const handleRefreshBalance = useCallback(() => {
    fetchBalance(true);
  }, [fetchBalance]);

  const handleRefreshStats = useCallback(() => {
    setIsRefreshingStats(true);
    fetchPaymentHistory(true);
  }, [fetchPaymentHistory]);

  const handleCheckTransaction = useCallback(async () => {
    if (!transactionIdToCheck.trim()) {
      setTransactionCheckError(language === 'en' 
        ? 'Please enter a transaction ID' 
        : 'Пожалуйста, введите ID транзакции');
      return;
    }
    
    if (!credentials) {
      setTransactionCheckError(language === 'en' 
        ? 'You need to be logged in to check transaction status' 
        : 'Вы должны быть авторизованы для проверки статуса транзакции');
      return;
    }
    
    setIsCheckingTransaction(true);
    setTransactionCheckError(null);
    setCheckedTransaction(null);
    
    try {
      const result = await checkTransactionStatus(credentials, transactionIdToCheck.trim());
      
      if (result.found && result.transaction) {
        setCheckedTransaction(result.transaction);
        
        // Add transaction to store for future reference
        addTransaction(result.transaction);
      } else {
        setTransactionCheckError(result.error || (language === 'en' 
          ? 'Transaction not found' 
          : 'Транзакция не найдена'));
      }
    } catch (error) {
      console.error('Error checking transaction:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setTransactionCheckError(language === 'en' 
        ? 'Failed to check transaction status' 
        : 'Не удалось проверить статус транзакции');
    } finally {
      setIsCheckingTransaction(false);
    }
  }, [transactionIdToCheck, credentials, language, addTransaction]);

  const handleViewTransactionDetails = useCallback((id: string) => {
    router.push(`/transaction/${id}`);
  }, [router]);

  const handleOpenPersonalCabinet = useCallback(() => {
    Linking.openURL('https://merch.mpspay.ru');
  }, []);

  // Determine container padding based on device size
  const containerPadding = getContainerPadding();

  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: false
        }}
      />
      
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView 
            contentContainerStyle={[styles.contentContainer, { padding: containerPadding }]}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => fetchData(true)}
                colors={[theme.primary]}
                tintColor={theme.primary}
              />
            }
            keyboardShouldPersistTaps="handled"
          >
            {/* Header with Logo and Title */}
            <View style={styles.header}>
              <Image 
                source={{ uri: IMAGES.LOGO }} 
                style={styles.logo} 
                resizeMode="contain"
              />
              <View style={styles.headerTextContainer}>
                <Text style={[styles.title, { color: theme.text, fontSize: scaleFontSize(24) }]} allowFontScaling={false}>
                  MPSPAY {language === 'en' ? 'Terminal' : 'Касса'}
                </Text>
                <Text style={[styles.subtitle, { color: theme.placeholder, fontSize: scaleFontSize(14) }]} allowFontScaling={false}>
                  {language === 'en' 
                    ? 'Mobile terminal for accepting payments' 
                    : 'Мобильная касса для приёма платежей'}
                </Text>
              </View>
            </View>
            
            {/* Quick Actions - MOVED BEFORE BALANCE */}
            <View style={styles.actionsContainer}>
              <Text style={[styles.sectionTitle, { color: theme.text, fontSize: scaleFontSize(18) }]} allowFontScaling={false}>
                {language === 'en' ? 'Quick Actions' : 'Быстрые действия'}
              </Text>
              
              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: theme.card }]}
                  onPress={handleCreatePayment}
                >
                  <View style={[styles.actionIconContainer, { backgroundColor: theme.primary }]}>
                    <CreditCard size={24} color="white" />
                  </View>
                  <Text style={[styles.actionButtonText, { 
                    color: theme.text,
                    fontSize: scaleFontSize(isSmallDevice ? 12 : 14)
                  }]} allowFontScaling={false}>
                    {language === 'en' ? 'New Payment' : 'Новый платеж'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: theme.card }]}
                  onPress={handleWithdraw}
                >
                  <View style={[styles.actionIconContainer, { backgroundColor: theme.secondary }]}>
                    <TrendingUp size={24} color="white" />
                  </View>
                  <Text style={[styles.actionButtonText, { 
                    color: theme.text,
                    fontSize: scaleFontSize(isSmallDevice ? 12 : 14)
                  }]} allowFontScaling={false}>
                    {language === 'en' ? 'Withdraw' : 'Вывод средств'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: theme.card }]}
                  onPress={handleViewHistory}
                >
                  <View style={[styles.actionIconContainer, { backgroundColor: '#6c5ce7' }]}>
                    <Clock size={24} color="white" />
                  </View>
                  <Text style={[styles.actionButtonText, { 
                    color: theme.text,
                    fontSize: scaleFontSize(isSmallDevice ? 12 : 14)
                  }]} allowFontScaling={false}>
                    {language === 'en' ? 'History' : 'История'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Current Balance Card */}
            <Card style={styles.balanceCard}>
              <View style={styles.balanceHeader}>
                <Text style={[styles.balanceTitle, { 
                  color: theme.text,
                  fontSize: scaleFontSize(16)
                }]} allowFontScaling={false}>
                  {language === 'en' ? 'Current Balance' : 'Текущий баланс'}
                </Text>
                <TouchableOpacity 
                  onPress={handleRefreshBalance}
                  style={styles.refreshButton}
                  disabled={isRefreshing}
                >
                  <RefreshCw 
                    size={20} 
                    color={theme.primary} 
                    style={isRefreshing ? styles.rotating : undefined}
                  />
                </TouchableOpacity>
              </View>
              
              <Text style={[styles.balanceAmount, { 
                color: theme.text,
                fontSize: scaleFontSize(isSmallDevice ? 28 : isLargeDevice ? 36 : 32)
              }]} allowFontScaling={false}>
                ₽{balance !== null ? balance.toLocaleString(undefined, {maximumFractionDigits: 2}) : '—'}
              </Text>
              
              {accountName && (
                <Text style={[styles.accountName, { color: theme.placeholder }]} allowFontScaling={false}>
                  {accountName}
                </Text>
              )}
              
              {lastRefreshed && (
                <View style={styles.lastRefreshedContainer}>
                  <Clock size={12} color={theme.placeholder} />
                  <Text style={[styles.lastRefreshedText, { 
                    color: theme.placeholder,
                    fontSize: scaleFontSize(12)
                  }]} allowFontScaling={false}>
                    {language === 'en' ? 'Last updated: ' : 'Последнее обновление: '}
                    {lastRefreshed.toLocaleTimeString()}
                  </Text>
                </View>
              )}
            </Card>
            
            {/* Stats Cards */}
            <View style={styles.statsHeaderContainer}>
              <Text style={[styles.sectionTitle, { 
                color: theme.text,
                fontSize: scaleFontSize(18),
              }]} allowFontScaling={false}>
                {language === 'en' ? 'Statistics' : 'Статистика'}
              </Text>
              <TouchableOpacity 
                onPress={handleRefreshStats}
                style={styles.refreshButton}
                disabled={isRefreshingStats}
              >
                <RefreshCw 
                  size={20} 
                  color={theme.primary} 
                  style={isRefreshingStats ? styles.rotating : undefined}
                />
              </TouchableOpacity>
            </View>
            
            <View style={styles.statsContainer}>
              <View style={styles.statsRow}>
                <Card style={styles.statCard}>
                  <View style={[styles.statIconContainer, { backgroundColor: theme.background }]}>
                    <ShoppingBag size={20} color={theme.primary} />
                  </View>
                  <Text style={[styles.statValue, { 
                    color: theme.text,
                    fontSize: scaleFontSize(isSmallDevice ? 16 : 18)
                  }]} allowFontScaling={false}>
                    {stats.successfulOperationsMonth}
                  </Text>
                  <Text style={[styles.statLabel, { 
                    color: theme.placeholder,
                    fontSize: scaleFontSize(isSmallDevice ? 11 : 12)
                  }]} allowFontScaling={false}>
                    {language === 'en' ? 'Operations (30 days)' : 'Операций (30 дней)'}
                  </Text>
                </Card>
                
                <Card style={styles.statCard}>
                  <View style={[styles.statIconContainer, { backgroundColor: theme.background }]}>
                    <Calendar size={20} color="#6c5ce7" />
                  </View>
                  <Text style={[styles.statValue, { 
                    color: theme.text,
                    fontSize: scaleFontSize(isSmallDevice ? 16 : 18)
                  }]} allowFontScaling={false}>
                    {stats.successfulOperationsToday}
                  </Text>
                  <Text style={[styles.statLabel, { 
                    color: theme.placeholder,
                    fontSize: scaleFontSize(isSmallDevice ? 11 : 12)
                  }]} allowFontScaling={false}>
                    {language === 'en' ? 'Operations Today' : 'Операций сегодня'}
                  </Text>
                </Card>
              </View>
              
              <View style={styles.statsRow}>
                <Card style={styles.statCard}>
                  <View style={[styles.statIconContainer, { backgroundColor: theme.background }]}>
                    <TrendingUp size={20} color={theme.secondary} />
                  </View>
                  <Text style={[styles.statValue, { 
                    color: theme.text,
                    fontSize: scaleFontSize(isSmallDevice ? 16 : 18)
                  }]} allowFontScaling={false}>
                    ₽{stats.incomeMonth.toLocaleString(undefined, {maximumFractionDigits: 2})}
                  </Text>
                  <Text style={[styles.statLabel, { 
                    color: theme.placeholder,
                    fontSize: scaleFontSize(isSmallDevice ? 11 : 12)
                  }]} allowFontScaling={false}>
                    {language === 'en' ? 'Income (30 days)' : 'Доход (30 дней)'}
                  </Text>
                </Card>
                
                <Card style={styles.statCard}>
                  <View style={[styles.statIconContainer, { backgroundColor: theme.background }]}>
                    <BarChart size={20} color="#00b894" />
                  </View>
                  <Text style={[styles.statValue, { 
                    color: theme.text,
                    fontSize: scaleFontSize(isSmallDevice ? 16 : 18)
                  }]} allowFontScaling={false}>
                    ₽{stats.incomeToday.toLocaleString(undefined, {maximumFractionDigits: 2})}
                  </Text>
                  <Text style={[styles.statLabel, { 
                    color: theme.placeholder,
                    fontSize: scaleFontSize(isSmallDevice ? 11 : 12)
                  }]} allowFontScaling={false}>
                    {language === 'en' ? 'Income Today' : 'Доход сегодня'}
                  </Text>
                </Card>
              </View>
            </View>
            
            {/* Recent Transactions */}
            <View style={styles.recentTransactionsContainer}>
              <View style={styles.recentTransactionsHeader}>
                <Text style={[styles.sectionTitle, { 
                  color: theme.text,
                  fontSize: scaleFontSize(18)
                }]} allowFontScaling={false}>
                  {language === 'en' ? 'Recent Transactions' : 'Последние операции'}
                </Text>
                <TouchableOpacity onPress={handleViewHistory}>
                  <Text style={[styles.viewAllText, { 
                    color: theme.primary,
                    fontSize: scaleFontSize(14)
                  }]} allowFontScaling={false}>
                    {language === 'en' ? 'View All' : 'Смотреть все'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              {isLoadingTransactions ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={theme.primary} />
                </View>
              ) : recentTransactions.length > 0 ? (
                <View style={styles.transactionsList}>
                  {recentTransactions.map((transaction) => (
                    <TouchableOpacity
                      key={transaction.id}
                      style={[
                        styles.transactionItem,
                        { backgroundColor: theme.card }
                      ]}
                      onPress={() => handleViewTransactionDetails(transaction.id)}
                    >
                      <View style={styles.transactionHeader}>
                        <Text style={[styles.transactionIdLarge, { color: theme.text }]} allowFontScaling={false}>
                          {transaction.id}
                        </Text>
                        <View style={styles.statusContainer}>
                          {transaction.paymentStatus === 3 ? (
                            <CheckCircle size={16} color={theme.success} />
                          ) : transaction.paymentStatus === 2 ? (
                            <XCircle size={16} color={theme.notification} />
                          ) : (
                            <AlertCircle size={16} color={theme.warning} />
                          )}
                          <Text style={[
                            styles.statusText, 
                            { 
                              color: transaction.paymentStatus === 3 
                                ? theme.success 
                                : transaction.paymentStatus === 2 
                                  ? theme.notification 
                                  : theme.warning 
                            }
                          ]} allowFontScaling={false}>
                            {transaction.paymentStatus === 3 
                              ? (language === 'en' ? 'Completed' : 'Оплачен') 
                              : transaction.paymentStatus === 2 
                                ? (language === 'en' ? 'Failed' : 'Не оплачен') 
                                : (language === 'en' ? 'Pending' : 'В ожидании')}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.transactionDetails}>
                        <View style={styles.transactionDetail}>
                          <Text style={[styles.detailLabel, { color: theme.placeholder }]} allowFontScaling={false}>
                            {language === 'en' ? 'Amount:' : 'Сумма:'}
                          </Text>
                          <Text style={[styles.detailValue, { color: theme.text }]} allowFontScaling={false}>
                            ₽{transaction.amount.toLocaleString(undefined, {maximumFractionDigits: 2})}
                          </Text>
                        </View>
                        
                        {transaction.finishedAt && (
                          <View style={styles.transactionDetail}>
                            <Text style={[styles.detailLabel, { color: theme.placeholder }]} allowFontScaling={false}>
                              {language === 'en' ? 'Date:' : 'Дата:'}
                            </Text>
                            <Text style={[styles.detailValue, { color: theme.text }]} allowFontScaling={false}>
                              {new Date(transaction.finishedAt).toLocaleString()}
                            </Text>
                          </View>
                        )}
                        
                        {transaction.comment && (
                          <View style={styles.transactionDetail}>
                            <Text style={[styles.detailLabel, { color: theme.placeholder }]} allowFontScaling={false}>
                              {language === 'en' ? 'Comment:' : 'Комментарий:'}
                            </Text>
                            <Text 
                              style={[styles.detailValue, { color: theme.text }]}
                              numberOfLines={1}
                              ellipsizeMode="tail"
                              allowFontScaling={false}
                            >
                              {transaction.comment}
                            </Text>
                          </View>
                        )}
                        
                        {transaction.paymentStatus === 3 && transaction.tag && (
                          <View style={styles.transactionDetail}>
                            <Text style={[styles.detailLabel, { color: theme.placeholder }]} allowFontScaling={false}>
                              {language === 'en' ? 'SBP ID:' : 'СБП ID:'}
                            </Text>
                            <Text 
                              style={[styles.detailValue, { color: theme.text }]}
                              numberOfLines={1}
                              ellipsizeMode="tail"
                              allowFontScaling={false}
                            >
                              {transaction.tag}
                            </Text>
                          </View>
                        )}
                      </View>
                      
                      <View style={styles.viewDetailsContainer}>
                        <ArrowRight size={16} color={theme.primary} />
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={[styles.emptyTransactionsContainer, { backgroundColor: theme.card }]}>
                  <Text style={[styles.emptyTransactionsText, { 
                    color: theme.placeholder,
                    fontSize: scaleFontSize(14)
                  }]} allowFontScaling={false}>
                    {language === 'en' 
                      ? 'No recent transactions found' 
                      : 'Нет недавних транзакций'}
                  </Text>
                </View>
              )}
            </View>
            
            {/* Transaction Check Form */}
            <Card style={styles.transactionCheckCard}>
              <Text style={[styles.transactionCheckTitle, { color: theme.text }]} allowFontScaling={false}>
                {language === 'en' ? 'Check Transaction Status' : 'Проверить статус операции'}
              </Text>
              
              <View style={styles.transactionCheckForm}>
                <TextInput
                  style={[
                    styles.transactionCheckInput,
                    { 
                      backgroundColor: theme.background,
                      color: theme.text,
                      borderColor: transactionCheckError ? theme.notification : theme.border
                    }
                  ]}
                  placeholder={language === 'en' ? 'Enter transaction ID' : 'Введите ID операции'}
                  placeholderTextColor={theme.placeholder}
                  value={transactionIdToCheck}
                  onChangeText={setTransactionIdToCheck}
                  keyboardType="numeric"
                  allowFontScaling={false}
                />
                
                <Button
                  title={language === 'en' ? 'Check' : 'Проверить'}
                  onPress={handleCheckTransaction}
                  loading={isCheckingTransaction}
                  icon={!isCheckingTransaction ? <Search size={18} color="white" /> : undefined}
                  style={styles.checkButton}
                />
              </View>
              
              {transactionCheckError ? (
                <Text style={[styles.transactionCheckError, { color: theme.notification }]} allowFontScaling={false}>
                  {transactionCheckError}
                </Text>
              ) : null}
              
              {checkedTransaction && (
                <View style={styles.checkedTransactionContainer}>
                  <View style={styles.checkedTransactionHeader}>
                    {checkedTransaction.status === 'completed' ? (
                      <CheckCircle size={20} color={theme.success} />
                    ) : checkedTransaction.status === 'failed' ? (
                      <XCircle size={20} color={theme.notification} />
                    ) : (
                      <AlertCircle size={20} color={theme.warning} />
                    )}
                    <Text style={[
                      styles.checkedTransactionStatus, 
                      { 
                        color: checkedTransaction.status === 'completed' 
                          ? theme.success 
                          : checkedTransaction.status === 'failed' 
                            ? theme.notification 
                            : theme.warning 
                      }
                    ]} allowFontScaling={false}>
                      {checkedTransaction.status === 'completed' 
                        ? (language === 'en' ? 'Completed' : 'Оплачен') 
                        : checkedTransaction.status === 'failed' 
                          ? (language === 'en' ? 'Failed' : 'Не оплачен') 
                          : (language === 'en' ? 'Pending' : 'В ожидании')}
                    </Text>
                  </View>
                  
                  <View style={styles.checkedTransactionDetails}>
                    <View style={styles.checkedTransactionDetail}>
                      <Text style={[styles.checkedTransactionLabel, { color: theme.placeholder }]} allowFontScaling={false}>
                        {language === 'en' ? 'Amount:' : 'Сумма:'}
                      </Text>
                      <Text style={[styles.checkedTransactionValue, { color: theme.text }]} allowFontScaling={false}>
                        ₽{checkedTransaction.amount.toLocaleString(undefined, {maximumFractionDigits: 2})}
                      </Text>
                    </View>
                    
                    {checkedTransaction.commission !== undefined && (
                      <View style={styles.checkedTransactionDetail}>
                        <Text style={[styles.checkedTransactionLabel, { color: theme.placeholder }]} allowFontScaling={false}>
                          {language === 'en' ? 'Commission:' : 'Комиссия:'}
                        </Text>
                        <Text style={[styles.checkedTransactionValue, { color: theme.text }]} allowFontScaling={false}>
                          ₽{checkedTransaction.commission.toLocaleString(undefined, {maximumFractionDigits: 2})}
                        </Text>
                      </View>
                    )}
                    
                    {checkedTransaction.customerInfo && (
                      <View style={styles.checkedTransactionDetail}>
                        <Text style={[styles.checkedTransactionLabel, { color: theme.placeholder }]} allowFontScaling={false}>
                          {language === 'en' ? 'Comment:' : 'Комментарий:'}
                        </Text>
                        <Text style={[styles.checkedTransactionValue, { color: theme.text }]} allowFontScaling={false}>
                          {checkedTransaction.customerInfo}
                        </Text>
                      </View>
                    )}
                    
                    {checkedTransaction.tag && (
                      <View style={styles.checkedTransactionDetail}>
                        <Text style={[styles.checkedTransactionLabel, { color: theme.placeholder }]} allowFontScaling={false}>
                          {language === 'en' ? 'SBP ID:' : 'СБП ID:'}
                        </Text>
                        <Text 
                          style={[styles.checkedTransactionValue, { color: theme.text }]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                          allowFontScaling={false}
                        >
                          {checkedTransaction.tag}
                        </Text>
                      </View>
                    )}
                  </View>
                  
                  <Button
                    title={language === 'en' ? 'View Details' : 'Подробнее'}
                    onPress={() => handleViewTransactionDetails(checkedTransaction.id)}
                    style={styles.viewDetailsButton}
                  />
                </View>
              )}
            </Card>
            
            {/* Personal Cabinet Button */}
            <TouchableOpacity 
              style={[styles.personalCabinetButton, { backgroundColor: theme.card }]}
              onPress={handleOpenPersonalCabinet}
            >
              <View style={styles.personalCabinetContent}>
                <View style={styles.personalCabinetIconContainer}>
                  <ExternalLink size={24} color={theme.primary} />
                </View>
                <View style={styles.personalCabinetTextContainer}>
                  <Text style={[styles.personalCabinetTitle, { color: theme.text }]} allowFontScaling={false}>
                    {language === 'en' ? 'Personal Cabinet' : 'Личный кабинет'}
                  </Text>
                  <Text style={[styles.personalCabinetDescription, { color: theme.placeholder }]} allowFontScaling={false}>
                    {language === 'en' 
                      ? 'Account management, withdrawals, statistics, API keys' 
                      : 'Управление счётами, вывод средств, статистика, API ключи'}
                  </Text>
                </View>
                <ArrowRight size={20} color={theme.primary} />
              </View>
            </TouchableOpacity>
            
            {credentials && (
              <View style={styles.merchantInfoContainer}>
                <Text style={[styles.merchantName, { 
                  color: theme.text,
                  fontSize: scaleFontSize(16)
                }]} allowFontScaling={false}>
                  {credentials.merchantName || (language === 'en' ? 'Your Account' : 'Ваш аккаунт')}
                </Text>
                <Text style={[styles.merchantId, { 
                  color: theme.placeholder,
                  fontSize: scaleFontSize(14)
                }]} allowFontScaling={false}>
                  ID: {credentials.clientId}
                </Text>
              </View>
            )}
          </ScrollView>
          
          {/* Error Popup */}
          <ErrorPopup
            visible={showErrorPopup}
            message={error || (language === 'en' ? 'An error occurred' : 'Произошла ошибка')}
            onClose={() => setShowErrorPopup(false)}
            darkMode={darkMode}
            title={language === 'en' ? 'Error' : 'Ошибка'}
            rawResponse={errorDetails}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: scaleSpacing(32),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scaleSpacing(24),
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontWeight: '400',
  },
  balanceCard: {
    marginBottom: scaleSpacing(16),
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceTitle: {
    fontWeight: '500',
  },
  refreshButton: {
    padding: 4,
  },
  rotating: {
    transform: Platform.OS === 'web' ? undefined : [{ rotate: '45deg' }],
  },
  balanceAmount: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  accountName: {
    fontSize: 14,
    marginBottom: 4,
  },
  lastRefreshedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastRefreshedText: {
    marginLeft: 4,
  },
  // Stats styles
  statsHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scaleSpacing(12),
  },
  statsContainer: {
    marginBottom: scaleSpacing(24),
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: scaleSpacing(12),
  },
  statCard: {
    width: '48%',
    padding: scaleSpacing(12),
    alignItems: 'center',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    textAlign: 'center',
  },
  // Actions styles
  actionsContainer: {
    marginBottom: scaleSpacing(24),
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: scaleSpacing(16),
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '31%',
    borderRadius: 12,
    padding: scaleSpacing(12),
    alignItems: 'center',
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionButtonText: {
    fontWeight: '500',
    textAlign: 'center',
  },
  // Recent transactions styles
  recentTransactionsContainer: {
    marginBottom: scaleSpacing(24),
  },
  recentTransactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scaleSpacing(12),
  },
  viewAllText: {
    fontWeight: '500',
  },
  loadingContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionsList: {
    marginBottom: scaleSpacing(8),
  },
  transactionItem: {
    borderRadius: 12,
    padding: scaleSpacing(12),
    marginBottom: scaleSpacing(12),
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  transactionIdLarge: {
    fontWeight: 'bold',
    fontSize: scaleFontSize(18),
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    marginLeft: 4,
    fontWeight: '500',
    fontSize: 14,
  },
  transactionDetails: {
    marginBottom: 8,
  },
  transactionDetail: {
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  viewDetailsContainer: {
    alignItems: 'flex-end',
  },
  emptyTransactionsContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  emptyTransactionsText: {
    textAlign: 'center',
  },
  // Transaction check styles
  transactionCheckCard: {
    marginBottom: scaleSpacing(24),
  },
  transactionCheckTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  transactionCheckForm: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  transactionCheckInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  checkButton: {
    height: 44,
  },
  transactionCheckError: {
    fontSize: 14,
    marginBottom: 8,
  },
  checkedTransactionContainer: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  checkedTransactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkedTransactionStatus: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  checkedTransactionDetails: {
    marginBottom: 16,
  },
  checkedTransactionDetail: {
    marginBottom: 8,
  },
  checkedTransactionLabel: {
    fontSize: 14,
    marginBottom: 2,
  },
  checkedTransactionValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  viewDetailsButton: {
    marginTop: 8,
  },
  // Personal Cabinet Button
  personalCabinetButton: {
    borderRadius: 12,
    marginBottom: scaleSpacing(24),
    padding: scaleSpacing(16),
  },
  personalCabinetContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  personalCabinetIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scaleSpacing(12),
  },
  personalCabinetTextContainer: {
    flex: 1,
  },
  personalCabinetTitle: {
    fontSize: scaleFontSize(16),
    fontWeight: '600',
    marginBottom: scaleSpacing(4),
  },
  personalCabinetDescription: {
    fontSize: scaleFontSize(12),
  },
  // Merchant info styles
  merchantInfoContainer: {
    alignItems: 'center',
    marginBottom: scaleSpacing(16),
  },
  merchantName: {
    fontWeight: '500',
    marginBottom: 4,
  },
  merchantId: {
    fontWeight: '400',
  },
});