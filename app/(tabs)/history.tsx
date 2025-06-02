import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { TransactionItem } from '@/components/TransactionItem';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/Button';
import { ErrorPopup } from '@/components/ErrorPopup';
import { useAuthStore } from '@/store/auth-store';
import { useLanguageStore } from '@/store/language-store';
import { useThemeStore } from '@/store/theme-store';
import { getPaymentHistory } from '@/utils/api';
import { PaymentHistoryItem } from '@/types/api';
import colors from '@/constants/colors';
import { Calendar, RefreshCw, AlertCircle, CalendarIcon, CheckCircle } from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import { scaleFontSize, scaleSpacing } from '@/utils/responsive';

export default function HistoryScreen() {
  const router = useRouter();
  const credentials = useAuthStore((state) => state.credentials);
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
  
  // Fetch all transactions for the last 30 days
  const fetchAllTransactions = async (refresh = false) => {
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
      const today = now.toISOString().split('T')[0]; // Format: YYYY-MM-DD
      
      // Date 30 days ago
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]; // Format: YYYY-MM-DD
      
      console.log(`Fetching payment history from ${thirtyDaysAgoStr} to ${today}`);
      
      const apiTransactions = await getPaymentHistory(credentials, thirtyDaysAgoStr, today);
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
  };
  
  // Fetch transactions when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchAllTransactions();
    }, [credentials])
  );
  
  const handleRefresh = () => {
    fetchAllTransactions(true);
  };
  
  const handleTransactionPress = (transaction: PaymentHistoryItem) => {
    // Navigate to transaction details with the payment history item data
    router.push({
      pathname: '/transaction/[id]',
      params: { 
        id: transaction.id,
        // Pass additional data as JSON string
        data: JSON.stringify(transaction)
      }
    });
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
      let startDate: Date;
      
      switch (filterDateRange) {
        case 'today':
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
          dateFiltered = allTransactions.filter(t => {
            // Fix: Ensure transaction date is valid before comparison
            if (!t.createdAt) return false;
            const transactionDate = new Date(t.createdAt);
            return !isNaN(transactionDate.getTime()) && transactionDate >= startDate;
          });
          break;
        case 'week':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          dateFiltered = allTransactions.filter(t => {
            // Fix: Ensure transaction date is valid before comparison
            if (!t.createdAt) return false;
            const transactionDate = new Date(t.createdAt);
            return !isNaN(transactionDate.getTime()) && transactionDate >= startDate;
          });
          break;
        case 'custom':
          if (customStartDate && customEndDate) {
            const startDate = new Date(customStartDate);
            const endDate = new Date(customEndDate);
            endDate.setHours(23, 59, 59, 999); // End of the day
            
            dateFiltered = allTransactions.filter(t => {
              // Fix: Ensure transaction date is valid before comparison
              if (!t.createdAt) return false;
              const transactionDate = new Date(t.createdAt);
              return !isNaN(transactionDate.getTime()) && transactionDate >= startDate && transactionDate <= endDate;
            });
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
    
    console.log(`Filtered to ${statusFiltered.length} transactions`);
    return statusFiltered;
  };
  
  const filteredTransactions = getFilteredTransactions();
  
  const renderItem = ({ item }: { item: PaymentHistoryItem }) => (
    <TransactionItem 
      transaction={item} 
      onPress={() => handleTransactionPress(item)}
      darkMode={darkMode}
    />
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
      }]}>
        {language === 'en' ? 'Report' : 'Отчёт'}
      </Text>
      
      <View style={styles.actions}>
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
          }]}>
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
          fontSize: scaleFontSize(14)
        }]}>
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
          }]}>
            {language === 'en' ? 'Clear' : 'Очистить'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };
  
  const renderCheckStatusButton = () => (
    <TouchableOpacity 
      style={[styles.checkStatusButton, { backgroundColor: theme.card }]}
      onPress={() => router.push('/transaction/check')}
    >
      <CheckCircle size={20} color={theme.primary} />
      <Text style={[styles.checkStatusText, { color: theme.text }]}>
        {language === 'en' ? 'Check Transaction Status' : 'Проверить статус транзакции'}
      </Text>
    </TouchableOpacity>
  );
  
  const renderStatusFilters = () => (
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
        ]}>
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
        ]}>
          {language === 'en' ? 'Pending' : 'В ожидании'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderDateButtons = () => (
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
        ]}>
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
        ]}>
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
        ]}>
          {language === 'en' ? 'Month' : 'Месяц'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
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
      
      {/* Date Filter Modal */}
      <Modal
        visible={showDateFilterModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDateFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {language === 'en' ? 'Custom Date Range' : 'Произвольный период'}
            </Text>
            
            <ScrollView style={styles.modalScroll}>
              <View style={[styles.customDateContainer, { borderColor: theme.border }]}>
                <View style={styles.customDateInputs}>
                  <View style={styles.dateInputContainer}>
                    <Text style={[styles.dateInputLabel, { color: theme.placeholder }]}>
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
                      />
                    </View>
                  </View>
                  
                  <View style={styles.dateInputContainer}>
                    <Text style={[styles.dateInputLabel, { color: theme.placeholder }]}>
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
                      />
                    </View>
                  </View>
                </View>
                
                {dateFilterError && (
                  <Text style={[styles.dateFilterError, { color: theme.notification }]}>
                    {dateFilterError}
                  </Text>
                )}
                
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
});