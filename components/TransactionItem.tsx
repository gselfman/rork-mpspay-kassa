import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Transaction, PaymentHistoryItem } from '@/types/api';
import { useLanguageStore } from '@/store/language-store';
import colors from '@/constants/colors';
import { CheckCircle, Clock, XCircle } from 'lucide-react-native';
import { scaleFontSize, scaleSpacing } from '@/utils/responsive';

interface TransactionItemProps {
  transaction: Transaction | PaymentHistoryItem;
  onPress: () => void;
  darkMode?: boolean;
}

export function TransactionItem({ transaction, onPress, darkMode = false }: TransactionItemProps) {
  const { language } = useLanguageStore();
  const theme = darkMode ? colors.dark : colors.light;
  
  // Check if it's a PaymentHistoryItem or Transaction
  const isPaymentHistoryItem = 'paymentStatus' in transaction;
  
  // Get status based on transaction type
  const getStatus = (): 'pending' | 'completed' | 'failed' => {
    if (isPaymentHistoryItem) {
      const item = transaction as PaymentHistoryItem;
      switch (item.paymentStatus) {
        case 3:
          return 'completed';
        case 2:
          return 'failed';
        case 1:
        default:
          return 'pending';
      }
    } else {
      return (transaction as Transaction).status;
    }
  };
  
  const status = getStatus();
  
  // Get amount
  const amount = transaction.amount;
  
  // Get description/comment
  const description = isPaymentHistoryItem 
    ? (transaction as PaymentHistoryItem).comment || ''
    : (transaction as Transaction).customerInfo || '';
  
  // Get date
  const date = isPaymentHistoryItem 
    ? (transaction as PaymentHistoryItem).createdAt || ''
    : (transaction as Transaction).createdAt || '';
  
  // Get merchant name
  const merchantName = isPaymentHistoryItem 
    ? (transaction as PaymentHistoryItem).accountToName || ''
    : (transaction as Transaction).merchantName || '';
  
  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={20} color={theme.success} />;
      case 'failed':
        return <XCircle size={20} color={theme.notification} />;
      case 'pending':
      default:
        return <Clock size={20} color={theme.warning} />;
    }
  };
  
  const getStatusText = () => {
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
        minute: '2-digit'
      });
    } catch (error) {
      return dateString || '';
    }
  };
  
  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.statusContainer}>
          {getStatusIcon()}
          <Text style={[styles.statusText, { color: getStatusColor() }]} allowFontScaling={false}>
            {getStatusText()}
          </Text>
        </View>
        <Text style={[styles.amount, { color: theme.text }]} allowFontScaling={false}>
          {amount} ₽
        </Text>
      </View>
      
      <View style={styles.content}>
        <Text style={[styles.description, { color: theme.text }]} numberOfLines={2} allowFontScaling={false}>
          {description || (language === 'en' ? 'No description' : 'Без описания')}
        </Text>
        
        {merchantName && (
          <Text style={[styles.merchant, { color: theme.placeholder }]} numberOfLines={1} allowFontScaling={false}>
            {merchantName}
          </Text>
        )}
        
        <Text style={[styles.date, { color: theme.placeholder }]} allowFontScaling={false}>
          {formatDate(date)}
        </Text>
        
        <Text style={[styles.id, { color: theme.placeholder }]} allowFontScaling={false}>
          ID: {transaction.id}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: scaleSpacing(16),
    marginBottom: scaleSpacing(12),
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scaleSpacing(12),
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    marginLeft: scaleSpacing(8),
    fontSize: scaleFontSize(14),
    fontWeight: '500',
  },
  amount: {
    fontSize: scaleFontSize(18),
    fontWeight: 'bold',
  },
  content: {
    gap: scaleSpacing(4),
  },
  description: {
    fontSize: scaleFontSize(16),
    fontWeight: '500',
    lineHeight: scaleFontSize(20),
  },
  merchant: {
    fontSize: scaleFontSize(14),
  },
  date: {
    fontSize: scaleFontSize(12),
  },
  id: {
    fontSize: scaleFontSize(12),
    fontFamily: 'monospace',
  },
});