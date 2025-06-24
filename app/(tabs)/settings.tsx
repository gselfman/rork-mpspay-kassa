import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  Platform,
  Image,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';
import { useLanguageStore } from '@/store/language-store';
import { useThemeStore } from '@/store/theme-store';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import colors from '@/constants/colors';
import IMAGES from '@/constants/images';
import { 
  User, 
  Globe, 
  Moon, 
  Sun, 
  LogOut, 
  Settings as SettingsIcon,
  Info,
  ChevronRight,
  Shield,
  HelpCircle,
  ShoppingBag,
  MessageCircle
} from 'lucide-react-native';
import { scaleFontSize, scaleSpacing } from '@/utils/responsive';

export default function SettingsScreen() {
  const router = useRouter();
  const { credentials, logout } = useAuthStore();
  const { language, setLanguage } = useLanguageStore();
  const { darkMode, toggleDarkMode } = useThemeStore();
  const theme = darkMode ? colors.dark : colors.light;
  
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const handleLogout = () => {
    Alert.alert(
      language === 'en' ? 'Logout' : 'Выход',
      language === 'en' ? 'Are you sure you want to logout?' : 'Вы уверены, что хотите выйти?',
      [
        {
          text: language === 'en' ? 'Cancel' : 'Отмена',
          style: 'cancel',
        },
        {
          text: language === 'en' ? 'Logout' : 'Выйти',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              await logout();
              router.replace('/');
            } catch (error) {
              console.error('Error during logout:', error);
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ]
    );
  };
  
  const handleLanguageChange = () => {
    const newLanguage = language === 'en' ? 'ru' : 'en';
    setLanguage(newLanguage);
  };
  
  const handleEditProfile = () => {
    router.push('/profile/edit');
  };

  const handleManageProducts = () => {
    router.push('/product');
  };

  const handleTelegramSupport = () => {
    Alert.alert(
      language === 'en' ? 'Telegram Support' : 'Поддержка в Telegram',
      language === 'en' 
        ? 'Contact our support team via Telegram: @max_support_main'
        : 'Свяжитесь с нашей службой поддержки через Telegram: @max_support_main',
      [
        {
          text: 'OK',
          style: 'default'
        }
      ]
    );
  };
  
  const renderSettingItem = (
    icon: React.ReactNode,
    title: string,
    subtitle?: string,
    onPress?: () => void,
    rightElement?: React.ReactNode
  ) => (
    <TouchableOpacity 
      style={[styles.settingItem, { borderBottomColor: theme.border }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.iconContainer, { backgroundColor: theme.primary + '20' }]}>
          {icon}
        </View>
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, { color: theme.text }]} allowFontScaling={false}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.settingSubtitle, { color: theme.placeholder }]} allowFontScaling={false}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.settingRight}>
        {rightElement || <ChevronRight size={20} color={theme.placeholder} />}
      </View>
    </TouchableOpacity>
  );
  
  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: false
        }}
      />
      
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Image 
              source={IMAGES.LOGO_SET} 
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={[styles.title, { 
              color: theme.text,
              fontSize: scaleFontSize(Platform.OS === 'android' ? 20 : 22)
            }]} allowFontScaling={false}>
              {language === 'en' ? 'Settings' : 'Настройки'}
            </Text>
          </View>
          
          {/* Profile Section */}
          <Card style={styles.profileCard}>
            <View style={styles.profileInfo}>
              <View style={[styles.profileAvatar, { backgroundColor: theme.primary + '20' }]}>
                <User size={32} color={theme.primary} />
              </View>
              <View style={styles.profileText}>
                <Text style={[styles.profileName, { color: theme.text }]} allowFontScaling={false}>
                  {credentials?.merchantName || (language === 'en' ? 'Merchant' : 'Мерчант')}
                </Text>
                <Text style={[styles.profileEmail, { color: theme.placeholder }]} allowFontScaling={false}>
                  {language === 'en' ? 'Client ID' : 'ID клиента'}: {credentials?.clientId || 'N/A'}
                </Text>
              </View>
            </View>
            <Button
              title={language === 'en' ? 'Edit Profile' : 'Редактировать профиль'}
              variant="outline"
              size="small"
              onPress={handleEditProfile}
              style={styles.editButton}
            />
          </Card>
          
          {/* App Settings */}
          <Card style={styles.settingsCard}>
            <Text style={[styles.sectionTitle, { color: theme.text }]} allowFontScaling={false}>
              {language === 'en' ? 'App Settings' : 'Настройки приложения'}
            </Text>
            
            {renderSettingItem(
              <Globe size={20} color={theme.primary} />,
              language === 'en' ? 'Language' : 'Язык',
              language === 'en' ? 'English' : 'Русский',
              handleLanguageChange
            )}
            
            {renderSettingItem(
              darkMode ? <Moon size={20} color={theme.primary} /> : <Sun size={20} color={theme.primary} />,
              language === 'en' ? 'Theme' : 'Тема',
              darkMode ? (language === 'en' ? 'Dark' : 'Тёмная') : (language === 'en' ? 'Light' : 'Светлая'),
              toggleDarkMode
            )}
          </Card>
          
          {/* Products Management */}
          <Card style={styles.settingsCard}>
            <Text style={[styles.sectionTitle, { color: theme.text }]} allowFontScaling={false}>
              {language === 'en' ? 'Products' : 'Товары'}
            </Text>
            
            {renderSettingItem(
              <ShoppingBag size={20} color={theme.primary} />,
              language === 'en' ? 'Manage Products' : 'Управление товарами',
              language === 'en' ? 'Add, edit or remove products' : 'Добавление, редактирование или удаление товаров',
              handleManageProducts
            )}
          </Card>
          
          {/* Security */}
          <Card style={styles.settingsCard}>
            <Text style={[styles.sectionTitle, { color: theme.text }]} allowFontScaling={false}>
              {language === 'en' ? 'Security' : 'Безопасность'}
            </Text>
            
            {renderSettingItem(
              <Shield size={20} color={theme.primary} />,
              language === 'en' ? 'Privacy & Security' : 'Конфиденциальность и безопасность',
              language === 'en' ? 'Manage your privacy settings' : 'Управление настройками конфиденциальности',
              () => Alert.alert(
                language === 'en' ? 'Privacy & Security' : 'Конфиденциальность и безопасность',
                language === 'en' ? 'Privacy settings will be available in future updates.' : 'Настройки конфиденциальности будут доступны в будущих обновлениях.'
              )
            )}
          </Card>
          
          {/* Support */}
          <Card style={styles.settingsCard}>
            <Text style={[styles.sectionTitle, { color: theme.text }]} allowFontScaling={false}>
              {language === 'en' ? 'Support' : 'Поддержка'}
            </Text>
            
            {renderSettingItem(
              <HelpCircle size={20} color={theme.primary} />,
              language === 'en' ? 'Help & Support' : 'Помощь и поддержка',
              language === 'en' ? 'Get help with the app' : 'Получить помощь с приложением',
              () => Alert.alert(
                language === 'en' ? 'Help & Support' : 'Помощь и поддержка',
                language === 'en' ? 'Support features will be available in future updates.' : 'Функции поддержки будут доступны в будущих обновлениях.'
              )
            )}
            
            {renderSettingItem(
              <MessageCircle size={20} color={theme.primary} />,
              language === 'en' ? 'Telegram Support' : 'Поддержка в Telegram',
              '@max_support_main',
              handleTelegramSupport
            )}
            
            {renderSettingItem(
              <Info size={20} color={theme.primary} />,
              language === 'en' ? 'About' : 'О приложении',
              language === 'en' ? 'Version 1.1.1' : 'Версия 1.1.1',
              () => Alert.alert(
                language === 'en' ? 'About' : 'О приложении',
                language === 'en' 
                  ? "MPS Pay Mobile App\nVersion 1.1.1\n\nA secure payment processing application for merchants."
                  : "Мобильное приложение MPS Pay\nВерсия 1.1.1\n\nБезопасное приложение для обработки платежей для мерчантов."
              )
            )}
          </Card>
          
          {/* Logout */}
          <Card style={styles.logoutCard}>
            <Button
              title={language === 'en' ? 'Logout' : 'Выйти'}
              variant="outline"
              onPress={handleLogout}
              loading={isLoggingOut}
              style={styles.logoutButton}
              textStyle={{ color: theme.notification }}
              icon={<LogOut size={20} color={theme.notification} />}
            />
          </Card>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleSpacing(16),
    paddingTop: scaleSpacing(16),
    paddingBottom: scaleSpacing(8),
  },
  logo: {
    width: 40,
    height: 40,
    marginRight: scaleSpacing(12),
  },
  title: {
    fontWeight: 'bold',
    flex: 1,
  },
  profileCard: {
    margin: scaleSpacing(16),
    padding: scaleSpacing(20),
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scaleSpacing(16),
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scaleSpacing(16),
  },
  profileText: {
    flex: 1,
  },
  profileName: {
    fontSize: scaleFontSize(18),
    fontWeight: '600',
    marginBottom: scaleSpacing(4),
  },
  profileEmail: {
    fontSize: scaleFontSize(14),
  },
  editButton: {
    alignSelf: 'flex-start',
  },
  settingsCard: {
    marginHorizontal: scaleSpacing(16),
    marginBottom: scaleSpacing(16),
    padding: scaleSpacing(20),
  },
  logoutCard: {
    marginHorizontal: scaleSpacing(16),
    marginBottom: scaleSpacing(32),
    padding: scaleSpacing(20),
  },
  sectionTitle: {
    fontSize: scaleFontSize(16),
    fontWeight: '600',
    marginBottom: scaleSpacing(16),
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: scaleSpacing(12),
    borderBottomWidth: 1,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scaleSpacing(12),
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: scaleFontSize(16),
    fontWeight: '500',
    marginBottom: scaleSpacing(2),
  },
  settingSubtitle: {
    fontSize: scaleFontSize(14),
  },
  settingRight: {
    marginLeft: scaleSpacing(12),
  },
  logoutButton: {
    width: '100%',
    borderColor: Platform.OS === 'web' ? undefined : 'rgba(255, 59, 48, 0.5)',
  },
});