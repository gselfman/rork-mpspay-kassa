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
import { useProductStore } from '@/store/product-store';
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
  MessageCircle,
  Download,
  Upload,
  FileText
} from 'lucide-react-native';
import { scaleFontSize, scaleSpacing } from '@/utils/responsive';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// Environment detection function
const detectEnvironment = () => {
  // Check if we're in Telegram Mini App
  if (typeof window !== 'undefined' && 
      (window.TelegramWebviewProxy || window.TelegramWebApp || window.Telegram)) {
    return 'telegram';
  }
  
  // Check if we're in a regular web browser
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    return 'web';
  }
  
  // Mobile platform
  return 'mobile';
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function SettingsScreen() {
  const router = useRouter();
  const { credentials, logout, importCredentials } = useAuthStore();
  const { language, setLanguage } = useLanguageStore();
  const { darkMode, toggleDarkMode } = useThemeStore();
  const { products, importProducts } = useProductStore();
  const theme = darkMode ? colors.dark : colors.light;
  
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
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

  const handleExportConfiguration = async () => {
    if (!credentials) {
      Alert.alert(
        language === 'en' ? 'Error' : 'Ошибка',
        language === 'en' ? 'No configuration to export. Please set up your credentials first.' : 'Нет конфигурации для экспорта. Пожалуйста, сначала настройте учетные данные.'
      );
      return;
    }

    Alert.alert(
      language === 'en' ? 'Export Configuration' : 'Экспорт конфигурации',
      language === 'en' 
        ? '⚠️ Security Warning\n\nThis file will contain sensitive data including API keys and credentials. Keep it secure and do not share it publicly.\n\nContinue with export?'
        : '⚠️ Предупреждение безопасности\n\nЭтот файл будет содержать конфиденциальные данные, включая API ключи и учетные данные. Храните его в безопасности и не делитесь им публично.\n\nПродолжить экспорт?',
      [
        {
          text: language === 'en' ? 'Cancel' : 'Отмена',
          style: 'cancel'
        },
        {
          text: language === 'en' ? 'Export' : 'Экспорт',
          style: 'default',
          onPress: performExport
        }
      ]
    );
  };

  const performExport = async () => {
    setIsExporting(true);
    
    try {
      const configuration = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        appName: 'MPSPAY Kassa',
        credentials: {
          clientId: credentials?.clientId || '',
          merchantName: credentials?.merchantName || '',
          readOnlyAccessKey: credentials?.readOnlyAccessKey || '',
          clientSecret: credentials?.clientSecret || '',
          currencyAccountNumber: credentials?.currencyAccountNumber || '',
          currencyAccountGuid: credentials?.currencyAccountGuid || '',
          currencyCode: credentials?.currencyCode || '643',
          commentNumber: credentials?.commentNumber || 1,
          apiKey: credentials?.apiKey || credentials?.readOnlyAccessKey || '',
          secretKey: credentials?.secretKey || credentials?.clientSecret || '',
          accountNumber: credentials?.accountNumber || credentials?.currencyAccountNumber || '',
          accountGuid: credentials?.accountGuid || credentials?.currencyAccountGuid || ''
        },
        settings: {
          language,
          darkMode
        },
        products: products.map(product => ({
          id: product.id,
          name: product.name,
          price: product.price,
          description: product.description || '',
          sku: product.sku || '',
          imageUrl: product.imageUrl || ''
        })),
        statistics: {
          totalProducts: products.length,
          exportedBy: credentials?.merchantName || 'Unknown',
          exportTimestamp: Date.now()
        }
      };

      const configJson = JSON.stringify(configuration, null, 2);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const fileName = `kassa-config-${timestamp}.json`;
      
      const environment = detectEnvironment();
      
      if (environment === 'web' || environment === 'telegram') {
        // Always use download approach for web/telegram
        try {
          const blob = new Blob([configJson], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          
          Alert.alert(
            language === 'en' ? 'Export Successful' : 'Экспорт успешен',
            language === 'en' 
              ? `Configuration file "${fileName}" has been downloaded.`
              : `Файл конфигурации "${fileName}" был загружен.`
          );
        } catch (webError) {
          // Fallback: show JSON in alert for copying
          Alert.alert(
            language === 'en' ? 'Export Data' : 'Данные экспорта',
            language === 'en' 
              ? 'Copy this configuration data and save it manually:'
              : 'Скопируйте эти данные конфигурации и сохраните вручную:',
            [
              {
                text: language === 'en' ? 'Copy' : 'Копировать',
                onPress: () => {
                  if (typeof navigator !== 'undefined' && navigator.clipboard) {
                    navigator.clipboard.writeText(configJson);
                  }
                }
              }
            ]
          );
        }
      } else {
        // Mobile platform - use file system + multiple sharing options
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(fileUri, configJson);
        
        // Try multiple sharing methods
        let shareSuccess = false;
        
        // Method 1: Try expo-sharing
        try {
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri, {
              mimeType: 'application/json',
              dialogTitle: language === 'en' ? 'Save Configuration File' : 'Сохранить файл конфигурации'
            });
            shareSuccess = true;
          }
        } catch (sharingError) {
          console.log('Sharing failed, trying alternative:', sharingError);
        }
        
        // Method 2: If sharing failed, show file location
        if (!shareSuccess) {
          Alert.alert(
            language === 'en' ? 'Export Complete' : 'Экспорт завершен',
            language === 'en' 
              ? `Configuration saved to: ${fileUri}\n\nYou can find this file in your device's file manager.`
              : `Конфигурация сохранена в: ${fileUri}\n\nВы можете найти этот файл в файловом менеджере устройства.`
          );
        }
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert(
        language === 'en' ? 'Export Error' : 'Ошибка экспорта',
        language === 'en' 
          ? `Failed to export configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
          : `Не удалось экспортировать конфигурацию: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportConfiguration = async () => {
    Alert.alert(
      language === 'en' ? 'Import Configuration' : 'Импорт конфигурации',
      language === 'en' 
        ? '⚠️ Warning\n\nThis will replace ALL current settings, credentials, and products with data from the imported file.\n\nMake sure you have exported your current configuration as backup before proceeding.\n\nContinue with import?'
        : '⚠️ Предупреждение\n\nЭто заменит ВСЕ текущие настройки, учетные данные и товары данными из импортируемого файла.\n\nУбедитесь, что вы экспортировали текущую конфигурацию как резервную копию перед продолжением.\n\nПродолжить импорт?',
      [
        {
          text: language === 'en' ? 'Cancel' : 'Отмена',
          style: 'cancel'
        },
        {
          text: language === 'en' ? 'Import' : 'Импорт',
          style: 'destructive',
          onPress: performImport
        }
      ]
    );
  };

  const performImport = async () => {
    setIsImporting(true);

    try {
      let configContent = '';
      let fileName = '';
      
      const environment = detectEnvironment();
      
      if (environment === 'web' || environment === 'telegram') {
        // Web/Telegram approach
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.multiple = false;
        input.style.display = 'none';
        
        const filePromise = new Promise<{content: string, name: string}>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('File selection timeout'));
          }, 30000); // 30 second timeout
          
          input.onchange = (event: any) => {
            clearTimeout(timeout);
            const file = event.target.files?.[0];
            if (file) {
              if (!file.name.toLowerCase().endsWith('.json')) {
                reject(new Error('Please select a JSON file'));
                return;
              }
              
              const reader = new FileReader();
              reader.onload = (e) => {
                const content = e.target?.result;
                if (typeof content === 'string') {
                  resolve({ content, name: file.name });
                } else {
                  reject(new Error('Failed to read file content'));
                }
              };
              reader.onerror = () => reject(new Error('Failed to read file'));
              reader.readAsText(file);
            } else {
              reject(new Error('No file selected'));
            }
          };
          
          input.oncancel = () => {
            clearTimeout(timeout);
            reject(new Error('File selection cancelled'));
          };
        });

        // Add to DOM and trigger click
        document.body.appendChild(input);
        input.click();
        
        try {
          const result = await filePromise;
          configContent = result.content;
          fileName = result.name;
        } finally {
          document.body.removeChild(input);
        }
      } else {
        // Mobile approach
        const result = await DocumentPicker.getDocumentAsync({
          type: ['application/json', 'text/json', '*/*'], // Accept all files as fallback
          copyToCacheDirectory: true,
          multiple: false
        });

        if (result.canceled) {
          setIsImporting(false);
          return;
        }

        const asset = result.assets[0];
        fileName = asset.name;
        
        if (!fileName.toLowerCase().endsWith('.json')) {
          throw new Error('Please select a JSON configuration file');
        }

        configContent = await FileSystem.readAsStringAsync(asset.uri);
      }

      // Parse and validate configuration
      let configuration;
      try {
        configuration = JSON.parse(configContent);
      } catch (parseError) {
        throw new Error('Invalid JSON format in configuration file');
      }
      
      if (!configuration || typeof configuration !== 'object') {
        throw new Error('Configuration file does not contain valid data');
      }
      
      if (!configuration.credentials) {
        throw new Error('Configuration file is missing credentials');
      }

      // Show preview and confirmation
      const productCount = configuration.products?.length || 0;
      const previewMessage = language === 'en' 
        ? `Import Configuration from "${fileName}"?\n\nContains:\n• Credentials and API keys\n• ${productCount} products\n• App settings\n\n⚠️ This will replace ALL current data!\n\nContinue?`
        : `Импортировать конфигурацию из "${fileName}"?\n\nСодержит:\n• Учетные данные и API ключи\n• ${productCount} товаров\n• Настройки приложения\n\n⚠️ Это заменит ВСЕ текущие данные!\n\nПродолжить?`;

      Alert.alert(
        language === 'en' ? 'Confirm Import' : 'Подтвердить импорт',
        previewMessage,
        [
          {
            text: language === 'en' ? 'Cancel' : 'Отмена',
            style: 'cancel'
          },
          {
            text: language === 'en' ? 'Import' : 'Импортировать',
            style: 'destructive',
            onPress: () => applyConfiguration(configuration)
          }
        ]
      );

    } catch (error) {
      console.error('Import error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert(
        language === 'en' ? 'Import Error' : 'Ошибка импорта',
        language === 'en' 
          ? `Failed to import configuration: ${errorMessage}`
          : `Не удалось импортировать конфигурацию: ${errorMessage}`
      );
    } finally {
      setIsImporting(false);
    }
  };

  const applyConfiguration = async (configuration: any) => {
    try {
      let appliedItems = [];
      
      if (configuration.credentials) {
        const requiredFields = ['clientId', 'readOnlyAccessKey', 'currencyAccountNumber', 'currencyAccountGuid'];
        const missingFields = requiredFields.filter(field => !configuration.credentials[field]);
        
        if (missingFields.length > 0) {
          throw new Error(`Missing required credential fields: ${missingFields.join(', ')}`);
        }
        
        importCredentials(configuration.credentials);
        appliedItems.push(language === 'en' ? 'Credentials' : 'Учетные данные');
      }

      if (configuration.settings) {
        if (configuration.settings.language && configuration.settings.language !== language) {
          setLanguage(configuration.settings.language);
          appliedItems.push(language === 'en' ? 'Language' : 'Язык');
        }
        if (typeof configuration.settings.darkMode === 'boolean' && configuration.settings.darkMode !== darkMode) {
          toggleDarkMode();
          appliedItems.push(language === 'en' ? 'Theme' : 'Тема');
        }
      }

      if (configuration.products && Array.isArray(configuration.products)) {
        const validProducts = configuration.products.filter((product: any) => {
          return product && 
                 typeof product.name === 'string' && 
                 product.name.length > 0 &&
                 typeof product.price === 'number' && 
                 product.price > 0;
        });
        
        if (validProducts.length > 0) {
          importProducts(validProducts);
          appliedItems.push(`${validProducts.length} ${language === 'en' ? 'products' : 'товаров'}`);
        }
        
        if (validProducts.length < configuration.products.length) {
          const skipped = configuration.products.length - validProducts.length;
          console.warn(`Skipped ${skipped} invalid products during import`);
        }
      }

      const appliedItemsText = appliedItems.length > 0 
        ? appliedItems.join(', ')
        : (language === 'en' ? 'No items' : 'Нет элементов');

      Alert.alert(
        language === 'en' ? 'Import Successful' : 'Импорт успешен',
        language === 'en' 
          ? `Successfully imported: ${appliedItemsText}\n\nSome changes may require restarting the app to take full effect.`
          : `Успешно импортировано: ${appliedItemsText}\n\nНекоторые изменения могут потребовать перезапуска приложения для полного применения.`,
        [
          {
            text: 'OK',
            style: 'default'
          }
        ]
      );
    } catch (error) {
      console.error('Apply configuration error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert(
        language === 'en' ? 'Apply Error' : 'Ошибка применения',
        language === 'en' 
          ? `Failed to apply configuration:\n${errorMessage}`
          : `Не удалось применить конфигурацию:\n${errorMessage}`
      );
    }
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
          {subtitle && (
            <Text style={[styles.settingSubtitle, { color: theme.placeholder }]} allowFontScaling={false}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.settingRight}>
        {rightElement ? rightElement : <ChevronRight size={20} color={theme.placeholder} />}
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

          <Card style={styles.settingsCard}>
            <Text style={[styles.sectionTitle, { color: theme.text }]} allowFontScaling={false}>
              {language === 'en' ? 'Configuration' : 'Конфигурация'}
            </Text>
            
            {renderSettingItem(
              <Download size={20} color={theme.primary} />,
              language === 'en' ? 'Export' : 'Экспорт',
              language === 'en' ? 'Save all settings and products to file' : 'Сохранить все настройки и товары в файл',
              handleExportConfiguration,
              isExporting ? <Text style={[styles.loadingText, { color: theme.placeholder }]}>...</Text> : null
            )}
            
            {renderSettingItem(
              <Upload size={20} color={theme.primary} />,
              language === 'en' ? 'Import' : 'Импорт',
              language === 'en' ? 'Load settings and products from file' : 'Загрузить настройки и товары из файла',
              handleImportConfiguration,
              isImporting ? <Text style={[styles.loadingText, { color: theme.placeholder }]}>...</Text> : null
            )}
          </Card>
          
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
  loadingText: {
    fontSize: scaleFontSize(14),
  },
});