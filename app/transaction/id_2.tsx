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
import { checkTransactionStatus, sendTransactionDetailsTelegram, sendTransactionDetailsEmail } from '@/utils/api';
import { PaymentHistoryItem } from '@/types/api';
import colors from '@/constants/colors';
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Copy, 
  Share, 
  RefreshCw,
  MessageCircle,
  Mail,
  ExternalLink,
  Calendar,
  CreditCard,
  User,
  Hash,
  DollarSign,
  AlertCircle
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
  const [isSending, setIsSending] = useState(false);
  
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
        setTransaction(result.transaction);
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
        setTransaction(result.transaction);
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
  
  const handleSendTelegram = async () => {
    if (!transaction || !credentials) return;
    
    setIsSending(true);
    try {
      const success = await sendTransactionDetailsTelegram(transaction, credentials, language);
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
    }
  };
  
  const handleSendEmail = async () => {
    if (!transaction || !credentials) return;
    
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
          const success = await sendTransactionDetailsEmail(transaction, email, credentials, language);
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
        }
      },
      'plain-text'
    );
  };
  
  const handleShare = async () => {
    if (!transaction) return;
    
    try {
      const statusText = transaction.status === 'completed' 
        ? (language === 'en' ? 'Completed' : 'Оплачен')
        : transaction.status === 'failed' 
          ? (language === 'en' ? 'Failed' : 'Не оплачен')
          : (language === 'en' ? 'Pending' : 'В ожидании');
      
      const shareText = `${language === 'en' ? 'Transaction' : 'Транзакция'} #${transaction.id}
${language === 'en' ? 'Amount:' : 'Сумма:'} ₽${transaction.amount}
${language === 'en' ? 'Status:' : 'Статус:'} ${statusText}
${transaction.customerInfo ? `${language === 'en' ? 'Comment:' : 'Комментарий:'} ${transaction.customerInfo}` : ''}`;
      
      if (Platform.OS === 'web') {
        await navigator.share({
          title: language === 'en' ? 'Transaction Details' : 'Детали транзакции',
          text: shareText
        });
      } else {
        const { Share } = await import('react-native');
        await Share.share({
          message: shareText,
          title: language === 'en' ? 'Transaction Details' : 'Детали транзакции'
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
      // Fallback to copying to clipboard
      if (transaction) {
        const statusText = transaction.status === 'completed' 
          ? (language === 'en' ? 'Completed' : 'Оплачен')
          : transaction.status === 'failed' 
            ? (language === 'en' ? 'Failed' : 'Не оплачен')
            : (language === 'en' ? 'Pending' : 'В ожидании');
        
        const shareText = `${language === 'en' ? 'Transaction' : 'Транзакция'} #${transaction.id}
${language === 'en' ? 'Amount:' : 'Сумма:'} ₽${transaction.amount}
${language === 'en' ? 'Status:' : 'Статус:'} ${statusText}`;
        
        await copyToClipboard(shareText, language === 'en' ? 'Transaction details' : 'Детали транзакции');
      }
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={24} color={theme.success} />;
      case 'failed':
        return <XCircle size={24} color={theme.notification} />;
      default:
        return <Clock size={24} color={theme.warning} />;
    }
  };
  
  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return language === 'en' ? 'Completed' : 'Оплачен';
      case 'failed':
        return language === 'en' ? 'Failed' : 'Не оплачен';
      default:
        return language === 'en' ? 'Pending' : 'В ожидании';
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return theme.success;
      case 'failed':
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
            {getStatusIcon(transaction.status)}
            <View style={styles.statusTextContainer}>
              <Text style={[styles.statusTitle, { color: getStatusColor(transaction.status) }]} allowFontScaling={false}>
                {getStatusText(transaction.status)}
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
            {transaction.commission !== undefined && (
              <View style={styles.detailItem}>
                <View style={styles.detailHeader}>
                  <CreditCard size={16} color={theme.placeholder} />
                  <Text style={[styles.detailLabel, { color: theme.placeholder }]} allowFontScaling={false}>
                    {language === 'en' ? 'Commission' : 'Комиссия'}
                  </Text>
                </View>
                <Text style={[styles.detailValue, { color: theme.text }]} allowFontScaling={false}>
                  ₽{transaction.commission.toLocaleString(undefined, {maximumFractionDigits: 2})}
                </Text>
              </View>
            )}
            
            {/* Customer Info / Comment */}
            {transaction.customerInfo && (
              <View style={styles.detailItem}>
                <View style={styles.detailHeader}>
                  <User size={16} color={theme.placeholder} />
                  <Text style={[styles.detailLabel, { color: theme.placeholder }]} allowFontScaling={false}>
                    {language === 'en' ? 'Comment' : 'Комментарий'}
                  </Text>
                </View>
                <Text style={[styles.detailValue, { color: theme.text }]} allowFontScaling={false}>
                  {transaction.customerInfo}
                </Text>
              </View>
            )}
            
            {/* SBP ID */}
            {transaction.tag && transaction.status === 'completed' && (
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
                  {new Date(transaction.createdAt).toLocaleString(language === 'en' ? 'en-US' : 'ru-RU', {
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
                  {new Date(transaction.finishedAt).toLocaleString(language === 'en' ? 'en-US' : 'ru-RU', {
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
              onPress={handleShare}
            >
              <Share size={20} color={theme.primary} />
              <Text style={[styles.actionButtonText, { color: theme.text }]} allowFontScaling={false}>
                {language === 'en' ? 'Share' : 'Поделиться'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: theme.card }]}
              onPress={handleSendTelegram}
              disabled={isSending}
            >
              <MessageCircle size={20} color={theme.primary} />
              <Text style={[styles.actionButtonText, { color: theme.text }]} allowFontScaling={false}>
                {language === 'en' ? 'Telegram' : 'Телеграм'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: theme.card }]}
              onPress={handleSendEmail}
              disabled={isSending}
            >
              <Mail size={20} color={theme.primary} />
              <Text style={[styles.actionButtonText, { color: theme.text }]} allowFontScaling={false}>
                {language === 'en' ? 'Email' : 'Email'}
              </Text>
            </TouchableOpacity>
          </View>
        </Card>
        
        {/* Receipt Card */}
        <Card style={styles.receiptCard}>
          <View style={styles.receiptHeader}>
            <Image 
              source={{ uri: 'https://i.imgur.com/QCp2zDE.png' }} 
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
            
            {transaction.commission !== undefined && (
              <View style={styles.receiptRow}>
                <Text style={[styles.receiptLabel, { color: theme.placeholder }]} allowFontScaling={false}>
                  {language === 'en' ? 'Commission:' : 'Комиссия:'}
                </Text>
                <Text style={[styles.receiptValue, { color: theme.text }]} allowFontScaling={false}>
                  ₽{transaction.commission.toLocaleString(undefined, {maximumFractionDigits: 2})}
                </Text>
              </View>
            )}
            
            <View style={styles.receiptRow}>
              <Text style={[styles.receiptLabel, { color: theme.placeholder }]} allowFontScaling={false}>
                {language === 'en' ? 'Status:' : 'Статус:'}
              </Text>
              <Text style={[styles.receiptValue, { color: getStatusColor(transaction.status) }]} allowFontScaling={false}>
                {getStatusText(transaction.status)}
              </Text>
            </View>
            
            {transaction.createdAt && (
              <View style={styles.receiptRow}>
                <Text style={[styles.receiptLabel, { color: theme.placeholder }]} allowFontScaling={false}>
                  {language === 'en' ? 'Date:' : 'Дата:'}
                </Text>
                <Text style={[styles.receiptValue, { color: theme.text }]} allowFontScaling={false}>
                  {new Date(transaction.createdAt).toLocaleString(language === 'en' ? 'en-US' : 'ru-RU')}
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
    justifyContent: 'space-around',
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