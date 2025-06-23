import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { useAuthStore } from '@/store/auth-store';
import { useLanguageStore } from '@/store/language-store';
import { useThemeStore } from '@/store/theme-store';
import { getAccountBalance, sendWithdrawalRequestTelegram } from '@/utils/api';
import { trpcClient } from '@/lib/trpc';
import colors from '@/constants/colors';
import IMAGES from '@/constants/images';
import { TrendingUp, Wallet, MessageCircle, AlertCircle, RefreshCw } from 'lucide-react-native';
import { scaleFontSize, scaleSpacing } from '@/utils/responsive';

export default function WithdrawScreen() {
  const router = useRouter();
  const credentials = useAuthStore((state) => state.credentials);
  const { language } = useLanguageStore();
  const { darkMode } = useThemeStore();
  const theme = darkMode ? colors.dark : colors.light;
  
  const [amount, setAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [telegramContact, setTelegramContact] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [errors, setErrors] = useState<{
    amount?: string;
    walletAddress?: string;
    telegramContact?: string;
  }>({});
  const [requestSent, setRequestSent] = useState(false);
  const [cooldownTimer, setCooldownTimer] = useState(0);
  
  // Exchange rate state
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [isLoadingRate, setIsLoadingRate] = useState(true);
  const [rateError, setRateError] = useState<string | null>(null);
  
  // Translations
  const getTranslation = (en: string, ru: string): string => {
    return language === 'en' ? en : ru;
  };
  
  useEffect(() => {
    fetchBalance();
    fetchExchangeRate();
  }, []);
  
  // Cooldown timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (cooldownTimer > 0) {
      interval = setInterval(() => {
        setCooldownTimer(prev => prev - 1);
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [cooldownTimer]);
  
  const fetchBalance = async () => {
    if (!credentials) return;
    
    setIsLoadingBalance(true);
    try {
      const accountBalance = await getAccountBalance(credentials);
      setBalance(accountBalance.available);
    } catch (error) {
      console.error('Error fetching balance:', error);
      Alert.alert(
        getTranslation('Error', 'Ошибка'),
        getTranslation(
          'Failed to fetch balance. Please try again.',
          'Не удалось получить баланс. Пожалуйста, попробуйте еще раз.'
        )
      );
    } finally {
      setIsLoadingBalance(false);
    }
  };
  
  const fetchExchangeRate = async () => {
    setIsLoadingRate(true);
    setRateError(null);
    
    try {
      const result = await trpcClient.exchangeRate.query();
      
      if (result.success && result.rate) {
        setExchangeRate(result.rate);
      } else {
        const errorMessage = result.success === false && 'error' in result ? result.error : getTranslation(
          'Failed to load exchange rate',
          'Не удалось загрузить курс'
        );
        setRateError(errorMessage);
      }
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      setRateError(getTranslation(
        'Failed to load exchange rate',
        'Не удалось загрузить курс'
      ));
    } finally {
      setIsLoadingRate(false);
    }
  };
  
  const validateForm = () => {
    const newErrors: typeof errors = {};
    
    // Validate amount
    if (!amount) {
      newErrors.amount = getTranslation(
        'Amount is required',
        'Сумма обязательна'
      );
    } else {
      const numAmount = parseInt(amount);
      if (isNaN(numAmount) || numAmount < 1000) {
        newErrors.amount = getTranslation(
          'Minimum withdrawal amount is 1,000 RUB',
          'Минимальная сумма вывода 1,000 руб'
        );
      } else if (balance !== null && numAmount > balance) {
        newErrors.amount = getTranslation(
          'Amount exceeds available balance',
          'Сумма превышает доступный баланс'
        );
      }
    }
    
    // Validate TRON wallet address
    if (!walletAddress) {
      newErrors.walletAddress = getTranslation(
        'TRON wallet address is required',
        'Адрес TRON кошелька обязателен'
      );
    } else if (!/^T[a-zA-Z0-9]{33}$/.test(walletAddress)) {
      newErrors.walletAddress = getTranslation(
        'Invalid TRON wallet address. Must start with T and be 34 characters long',
        'Неверный адрес TRON кошелька. Должен начинаться с T и содержать 34 символа'
      );
    }
    
    // Validate Telegram contact
    if (!telegramContact) {
      newErrors.telegramContact = getTranslation(
        'Telegram contact is required',
        'Telegram контакт обязателен'
      );
    } else if (!telegramContact.startsWith('@') || telegramContact.length < 5) {
      newErrors.telegramContact = getTranslation(
        'Telegram contact must start with @ and be at least 5 characters long',
        'Telegram контакт должен начинаться с @ и содержать минимум 5 символов'
      );
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async () => {
    if (!credentials) {
      Alert.alert(
        getTranslation('Error', 'Ошибка'),
        getTranslation(
          'You need to be logged in to request withdrawal',
          'Вы должны быть авторизованы для запроса вывода средств'
        )
      );
      return;
    }
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const numAmount = parseInt(amount);
      const success = await sendWithdrawalRequestTelegram(
        credentials,
        numAmount,
        walletAddress,
        telegramContact,
        balance || 0
      );
      
      if (success) {
        setRequestSent(true);
        setCooldownTimer(30); // Set 30 second cooldown
        
        Alert.alert(
          getTranslation('Request Sent', 'Заявка отправлена'),
          getTranslation(
            'Your withdrawal request has been sent successfully. You will be contacted via Telegram.',
            'Ваша заявка на вывод средств успешно отправлена. С вами свяжутся через Telegram.'
          ),
          [
            {
              text: getTranslation('OK', 'ОК'),
              onPress: () => {
                // Don't navigate back, just show success state
              }
            }
          ]
        );
      } else {
        Alert.alert(
          getTranslation('Error', 'Ошибка'),
          getTranslation(
            'Failed to send withdrawal request. Please try again.',
            'Не удалось отправить заявку на вывод. Пожалуйста, попробуйте еще раз.'
          )
        );
      }
    } catch (error) {
      console.error('Error sending withdrawal request:', error);
      Alert.alert(
        getTranslation('Error', 'Ошибка'),
        getTranslation(
          'An error occurred while sending the request. Please try again.',
          'Произошла ошибка при отправке заявки. Пожалуйста, попробуйте еще раз.'
        )
      );
    } finally {
      setIsLoading(false);
    }
  };
  
  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  const calculateUSDTAmount = (): string => {
    if (!amount || !exchangeRate) return '';
    const numAmount = parseInt(amount);
    if (isNaN(numAmount)) return '';
    const usdtAmount = numAmount / exchangeRate;
    return usdtAmount.toFixed(2);
  };
  
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Image 
            source={{ uri: IMAGES.LOGO }} 
            style={styles.logo} 
            resizeMode="contain"
          />
          <Text style={[styles.title, { 
            color: theme.text,
            fontSize: scaleFontSize(24)
          }]}>
            {getTranslation('Withdraw Funds', 'Вывод средств')}
          </Text>
        </View>
        
        {/* Balance Card */}
        <Card style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <TrendingUp size={24} color={theme.primary} />
            <Text style={[styles.balanceTitle, { color: theme.text }]}>
              {getTranslation('Available Balance', 'Доступный баланс')}
            </Text>
          </View>
          
          {isLoadingBalance ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <Text style={[styles.balanceAmount, { color: theme.text }]}>
              ₽{balance !== null ? formatNumber(balance) : '—'}
            </Text>
          )}
        </Card>
        
        {/* Exchange Rate Card */}
        <Card style={styles.exchangeRateCard}>
          <View style={styles.exchangeRateHeader}>
            <TrendingUp size={20} color={theme.secondary} />
            <Text style={[styles.exchangeRateTitle, { color: theme.text }]}>
              {getTranslation('Current Exchange Rate', 'Текущий курс')}
            </Text>
            <Button
              title=""
              onPress={fetchExchangeRate}
              style={styles.refreshRateButton}
              icon={<RefreshCw size={16} color={theme.primary} />}
              variant="outline"
              size="small"
            />
          </View>
          
          {isLoadingRate ? (
            <View style={styles.rateLoadingContainer}>
              <ActivityIndicator size="small" color={theme.primary} />
              <Text style={[styles.rateLoadingText, { color: theme.placeholder }]}>
                {getTranslation('Loading rate...', 'Загрузка курса...')}
              </Text>
            </View>
          ) : rateError ? (
            <Text style={[styles.rateError, { color: theme.notification }]}>
              {rateError}
            </Text>
          ) : exchangeRate ? (
            <View style={styles.rateContainer}>
              <Text style={[styles.rateText, { color: theme.text }]}>
                1 USDT ≈ {exchangeRate.toFixed(2)} ₽
              </Text>
              {amount && (
                <Text style={[styles.conversionText, { color: theme.placeholder }]}>
                  {getTranslation(
                    `≈ ${calculateUSDTAmount()} USDT`,
                    `≈ ${calculateUSDTAmount()} USDT`
                  )}
                </Text>
              )}
            </View>
          ) : null}
        </Card>
        
        {/* Success Message */}
        {requestSent && (
          <Card style={[styles.successCard, { backgroundColor: theme.success + '20' }]}>
            <View style={styles.successHeader}>
              <TrendingUp size={24} color={theme.success} />
              <Text style={[styles.successTitle, { color: theme.success }]}>
                {getTranslation('Request Sent', 'Заявка отправлена')}
              </Text>
            </View>
            <Text style={[styles.successMessage, { color: theme.text }]}>
              {getTranslation(
                'Your withdrawal request has been sent successfully. You will be contacted via Telegram.',
                'Ваша заявка на вывод средств успешно отправлена. С вами свяжутся через Telegram.'
              )}
            </Text>
            {cooldownTimer > 0 && (
              <Text style={[styles.cooldownText, { color: theme.placeholder }]}>
                {getTranslation(
                  `You can submit another request in ${formatTime(cooldownTimer)}`,
                  `Вы можете отправить еще одну заявку через ${formatTime(cooldownTimer)}`
                )}
              </Text>
            )}
          </Card>
        )}
        
        {/* Withdrawal Form */}
        <Card style={styles.formCard}>
          <Text style={[styles.formTitle, { color: theme.text }]}>
            {getTranslation('Withdrawal Request', 'Заявка на вывод')}
          </Text>
          
          <View style={styles.formSection}>
            <Input
              label={getTranslation('Amount (RUB)', 'Сумма (руб)')}
              value={amount}
              onChangeText={(text) => {
                // Only allow integer values
                const integerValue = text.replace(/[^0-9]/g, '');
                setAmount(integerValue);
              }}
              placeholder="1000"
              keyboardType="numeric"
              error={errors.amount}
              darkMode={darkMode}
              icon={<Wallet size={20} color={theme.primary} />}
            />
            <Text style={[styles.helperText, { color: theme.placeholder }]}>
              {getTranslation(
                'Minimum withdrawal: 1,000 RUB',
                'Минимальный вывод: 1,000 руб'
              )}
            </Text>
          </View>
          
          <View style={styles.formSection}>
            <Input
              label={getTranslation('TRON Wallet Address (TRC-20)', 'Адрес TRON кошелька (TRC-20)')}
              value={walletAddress}
              onChangeText={(text) => {
                setWalletAddress(text);
                if (errors.walletAddress) {
                  setErrors({ ...errors, walletAddress: undefined });
                }
              }}
              placeholder="TLgCPf8Lhayy3uhdvePJyZzRq3LUQW9c2c"
              autoCapitalize="none"
              error={errors.walletAddress}
              darkMode={darkMode}
              icon={<TrendingUp size={20} color={theme.primary} />}
            />
            <Text style={[styles.helperText, { color: theme.placeholder }]}>
              {getTranslation(
                'Must start with T and be 34 characters long',
                'Должен начинаться с T и содержать 34 символа'
              )}
            </Text>
          </View>
          
          <View style={styles.formSection}>
            <Input
              label={getTranslation('Telegram Contact', 'Telegram контакт')}
              value={telegramContact}
              onChangeText={(text) => {
                // Ensure it starts with @
                let formattedText = text;
                if (!formattedText.startsWith('@') && formattedText.length > 0) {
                  formattedText = '@' + formattedText;
                }
                setTelegramContact(formattedText);
                if (errors.telegramContact) {
                  setErrors({ ...errors, telegramContact: undefined });
                }
              }}
              placeholder="@username"
              autoCapitalize="none"
              error={errors.telegramContact}
              darkMode={darkMode}
              icon={<MessageCircle size={20} color={theme.primary} />}
            />
            <Text style={[styles.helperText, { color: theme.placeholder }]}>
              {getTranslation(
                'Your Telegram username for contact',
                'Ваш Telegram username для связи'
              )}
            </Text>
          </View>
        </Card>
        
        {/* Info Card */}
        <Card style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <AlertCircle size={20} color={theme.warning} />
            <Text style={[styles.infoTitle, { color: theme.text }]}>
              {getTranslation('Important Information', 'Важная информация')}
            </Text>
          </View>
          
          <View style={styles.infoContent}>
            <Text style={[styles.infoText, { color: theme.text }]}>
              {getTranslation(
                '• Minimum withdrawal amount: 1,000 RUB\n• Processing time: 1-3 business days\n• You will be contacted via Telegram\n• USDT will be sent to your TRON wallet',
                '• Минимальная сумма вывода: 1,000 руб\n• Время обработки: 1-3 рабочих дня\n• С вами свяжутся через Telegram\n• USDT будет отправлен на ваш TRON кошелек'
              )}
            </Text>
          </View>
        </Card>
        
        <Button
          title={cooldownTimer > 0 
            ? getTranslation(`Wait (${formatTime(cooldownTimer)})`, `Подождите (${formatTime(cooldownTimer)})`) 
            : getTranslation('Submit Request', 'Отправить заявку')}
          onPress={handleSubmit}
          loading={isLoading}
          disabled={isLoading || isLoadingBalance || !amount || !walletAddress || !telegramContact || cooldownTimer > 0}
          icon={!isLoading && cooldownTimer === 0 ? <TrendingUp size={20} color="white" /> : undefined}
          style={styles.submitButton}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: scaleSpacing(16),
    paddingBottom: scaleSpacing(32),
  },
  header: {
    alignItems: 'center',
    marginBottom: scaleSpacing(24),
  },
  logo: {
    width: 120,
    height: 60,
    marginBottom: scaleSpacing(8),
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  balanceCard: {
    marginBottom: scaleSpacing(16),
    padding: scaleSpacing(20),
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scaleSpacing(12),
  },
  balanceTitle: {
    fontSize: scaleFontSize(16),
    fontWeight: '500',
    marginLeft: scaleSpacing(8),
  },
  balanceAmount: {
    fontSize: scaleFontSize(28),
    fontWeight: 'bold',
  },
  // Exchange rate card styles
  exchangeRateCard: {
    marginBottom: scaleSpacing(16),
    padding: scaleSpacing(16),
  },
  exchangeRateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scaleSpacing(12),
  },
  exchangeRateTitle: {
    fontSize: scaleFontSize(14),
    fontWeight: '500',
    marginLeft: scaleSpacing(8),
    flex: 1,
  },
  refreshRateButton: {
    width: 32,
    height: 32,
    padding: 0,
    minWidth: 32,
  },
  rateLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rateLoadingText: {
    marginLeft: scaleSpacing(8),
    fontSize: scaleFontSize(14),
  },
  rateError: {
    fontSize: scaleFontSize(14),
  },
  rateContainer: {
    alignItems: 'flex-start',
  },
  rateText: {
    fontSize: scaleFontSize(16),
    fontWeight: '600',
    marginBottom: scaleSpacing(4),
  },
  conversionText: {
    fontSize: scaleFontSize(14),
  },
  // Success card styles
  successCard: {
    marginBottom: scaleSpacing(16),
    padding: scaleSpacing(20),
  },
  successHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scaleSpacing(12),
  },
  successTitle: {
    fontSize: scaleFontSize(16),
    fontWeight: '600',
    marginLeft: scaleSpacing(8),
  },
  successMessage: {
    fontSize: scaleFontSize(14),
    lineHeight: scaleFontSize(20),
    marginBottom: scaleSpacing(12),
  },
  cooldownText: {
    fontSize: scaleFontSize(14),
    fontWeight: '500',
    textAlign: 'center',
  },
  formCard: {
    marginBottom: scaleSpacing(16),
  },
  formTitle: {
    fontSize: scaleFontSize(18),
    fontWeight: '600',
    marginBottom: scaleSpacing(20),
  },
  formSection: {
    marginBottom: scaleSpacing(16),
  },
  helperText: {
    fontSize: scaleFontSize(12),
    marginTop: scaleSpacing(4),
  },
  infoCard: {
    marginBottom: scaleSpacing(24),
    padding: scaleSpacing(16),
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scaleSpacing(12),
  },
  infoTitle: {
    fontSize: scaleFontSize(16),
    fontWeight: '600',
    marginLeft: scaleSpacing(8),
  },
  infoContent: {
    marginLeft: scaleSpacing(28),
  },
  infoText: {
    fontSize: scaleFontSize(14),
    lineHeight: scaleFontSize(20),
  },
  submitButton: {
    height: 56,
  },
});