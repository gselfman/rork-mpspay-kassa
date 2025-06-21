import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Transaction, PaymentHistoryItem } from '@/types/api';
import { useLanguageStore } from '@/store/language-store';
import { formatMoscowTime } from '@/utils/timezone';
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
  const getStatus = (): { code: number, text: string, color: string, icon: React.ReactNode } => {
    if (isPaymentHistoryItem) {
      const item = transaction as PaymentHistoryItem;
      switch (item.paymentStatus) {
        case 3:
          return {
            code: 3,
            text: language === 'en' ? 'Successful' : 'Успешный',
            color: theme.success,
            icon: <CheckCircle size={20} color={theme.success} />
          };
        case 2:
          return {
            code: 2,
            text: language === 'en' ? 'Not paid' : 'Не оплачен',
            color: theme.notification,
            icon: <XCircle size={20} color={theme.notification} />
          };
        case 1:
        default:
          return {
            code: 1,
            text: language === 'en' ? 'Pending' : 'В ожидании',
            color: theme.warning,
            icon: <Clock size={20} color={theme.warning} />
          };
      }
    } else {
      const item = transaction as Transaction;
      switch (item.status) {
        case 'completed':
          return {
            code: 3,
            text: language === 'en' ? 'Successful' : 'Успешный',
            color: theme.success,
            icon: <CheckCircle size={20} color={theme.success} />
          };
        case 'failed':
          return {
            code: 2,
            text: language === 'en' ? 'Not paid' : 'Не оплачен',
            color: theme.notification,
            icon: <XCircle size={20} color={theme.notification} />
          };
        case 'pending':
        default:
          return {
            code: 1,
            text: language === 'en' ? 'Pending' : 'В ожидании',
            color: theme.warning,
            icon: <Clock size={20} color={theme.warning} />
          };
      }
    }
  };
  
  const status = getStatus();
  
  // Get amount
  const amount = transaction.amount;
  
  // Get comment
  const comment = isPaymentHistoryItem 
    ? (transaction as PaymentHistoryItem).comment || ''
    : (transaction as Transaction).customerInfo || '';
  
  // Get date
  const date = isPaymentHistoryItem 
    ? (transaction as PaymentHistoryItem).createdAt || ''
    : (transaction as Transaction).createdAt || '';
  
  // Get СБП ID (only for successful payments)
  const sbpId = isPaymentHistoryItem && status.code === 3 
    ? (transaction as PaymentHistoryItem).tag || ''
    : '';
  
  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.statusContainer}>
          {status.icon}
          <Text style={[styles.statusText, { color: status.color }]} allowFontScaling={false}>
            {status.text}
          </Text>
        </View>
        <Text style={[styles.amount, { color: theme.text }]} allowFontScaling={false}>
          ₽{amount}
        </Text>
      </View>
      
      <View style={styles.content}>
        {comment && (
          <Text style={[styles.comment, { color: theme.text }]} numberOfLines={2} allowFontScaling={false}>
            {comment}
          </Text>
        )}
        
        <Text style={[styles.paymentId, { color: theme.placeholder }]} allowFontScaling={false}>
          {language === 'en' ? 'Payment ID:' : 'ID платежа:'} {transaction.id}
        </Text>
        
        {sbpId && (
          <Text style={[styles.sbpId, { color: theme.placeholder }]} allowFontScaling={false}>
            {language === 'en' ? 'SBP ID:' : 'СБП ID:'} {sbpId}
          </Text>
        )}
        
        <Text style={[styles.date, { color: theme.placeholder }]} allowFontScaling={false}>
          {formatMoscowTime(date, language)}
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
});