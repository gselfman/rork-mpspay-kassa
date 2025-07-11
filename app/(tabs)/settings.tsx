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
  Modal,
  TextInput,
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
  // Check for Telegram Mini App
  if (typeof window !== 'undefined' && 
      ((window as any).TelegramWebviewProxy || (window as any).TelegramWebApp || (window as any).Telegram)) {
    return 'telegram';
  }
  
  // Check for web browser capabilities
  if (typeof window !== 'undefined' && 
      typeof document !== 'undefined' && 
      typeof Blob !== 'undefined' && 
      typeof URL !== 'undefined') {
    return 'web';
  }
  
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
  
  // Добавляем состояние для модального окна импорта
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importText, setImportText] = useState('');
  
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
              console.error('Logout error:', error);
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  const handleExport = async () => {
    if (!credentials) {
      Alert.alert(
        language === 'en' ? 'Error' : 'Ошибка',
        language === 'en' ? 'No credentials to export' : 'Нет данных для экспорта'
      );
      return;
    }

    setIsExporting(true);
    
    try {
      const exportData = {
        credentials,
        products,
        exportedAt: new Date().toISOString(),
        version: '1.0'
      };
      
      const jsonData = JSON.stringify(exportData, null, 2);
      const environment = detectEnvironment();
      
      if (environment === 'telegram' || environment === 'web') {
        // Для Telegram Mini App и веб-версии - показываем алерт с возможностью копирования
        Alert.alert(
          language === 'en' ? 'Export Configuration' : 'Экспорт конфигурации',
          jsonData,
          [
            {
              text: language === 'en' ? 'Copy to Clipboard' : 'Скопировать в буфер',
              onPress: async () => {
                try {
                  if (navigator && navigator.clipboard) {
                    await navigator.clipboard.writeText(jsonData);
                    Alert.alert(
                      language === 'en' ? 'Success' : 'Успех',
                      language === 'en' ? 'Configuration copied to clipboard' : 'Конфигурация скопирована в буфер обмена'
                    );
                  } else {
                    // Fallback для старых браузеров
                    const textArea = document.createElement('textarea');
                    textArea.value = jsonData;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    Alert.alert(
                      language === 'en' ? 'Success' : 'Успех',
                      language === 'en' ? 'Configuration copied to clipboard' : 'Конфигурация скопирована в буфер обмена'
                    );
                  }
                } catch (error) {
                  console.error('Copy error:', error);
                  Alert.alert(
                    language === 'en' ? 'Error' : 'Ошибка',
                    language === 'en' ? 'Failed to copy to clipboard' : 'Не удалось скопировать в буфер обмена'
                  );
                }
              }
            },
            {
              text: language === 'en' ? 'OK' : 'ОК',
              style: 'cancel'
            }
          ],
          { cancelable: true }
        );
      } else {
        // Для мобильных платформ - сохраняем в файл
        const fileName = `mpspay_config_${new Date().toISOString().split('T')[0]}.json`;
        const fileUri = FileSystem.documentDirectory + fileName;
        
        await FileSystem.writeAsStringAsync(fileUri, jsonData, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/json',
            dialogTitle: language === 'en' ? 'Export Configuration' : 'Экспорт конфигурации',
            UTI: 'public.json',
          });
        }
        
        Alert.alert(
          language === 'en' ? 'Success' : 'Успех',
          language === 'en' ? 'Configuration exported successfully' : 'Конфигурация успешно экспортирована'
        );
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert(
        language === 'en' ? 'Error' : 'Ошибка',
        language === 'en' ? 'Failed to export configuration' : 'Не удалось экспортировать конфигурацию'
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    const environment = detectEnvironment();
    
    if (environment === 'telegram' || environment === 'web') {
      // Для Telegram Mini App и веб-версии - показываем модальное окно
      setImportText('');
      setImportModalVisible(true);
    } else {
      // Для мобильных платформ - используем DocumentPicker
      setIsImporting(true);
      
      try {
        const result = await DocumentPicker.getDocumentAsync({
          type: 'application/json',
          copyToCacheDirectory: true,
        });
        
        if (result.type === 'success') {
          const content = await FileSystem.readAsStringAsync(result.uri, {
            encoding: FileSystem.EncodingType.UTF8,
          });
          
          await processImportData(content);
        }
      } catch (error) {
        console.error('Import error:', error);
        Alert.alert(
          language === 'en' ? 'Error' : 'Ошибка',
          language === 'en' ? 'Failed to import configuration' : 'Не удалось импортировать конфигурацию'
        );
      } finally {
        setIsImporting(false);
      }
    }
  };

  const processImportData = async (jsonData: string) => {
    try {
      const importData = JSON.parse(jsonData);
      
      if (importData.credentials) {
        await importCredentials(importData.credentials);
      }
      
      if (importData.products) {
        await importProducts(importData.products);
      }
      
      Alert.alert(
        language === 'en' ? 'Success' : 'Успех',
        language === 'en' ? 'Configuration imported successfully' : 'Конфигурация успешно импортирована'
      );
    } catch (error) {
      console.error('Import processing error:', error);
      Alert.alert(
        language === 'en' ? 'Error' : 'Ошибка',
        language === 'en' ? 'Invalid configuration format' : 'Неверный формат конфигурации'
      );
    }
  };

  const handleImportFromText = async () => {
    if (!importText.trim()) {
      Alert.alert(
        language === 'en' ? 'Error' : 'Ошибка',
        language === 'en' ? 'Please enter configuration data' : 'Пожалуйста, введите данные конфигурации'
      );
      return;
    }
    
    setIsImporting(true);
    
    try {
      await processImportData(importText);
      setImportModalVisible(false);
      setImportText('');
    } catch (error) {
      // Ошибка уже обработана в processImportData
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen 
        options={{ 
          headerShown: true,
          headerTitle: language === 'en' ? 'Settings' : 'Настройки',
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
        }} 
      />
      
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Profile Section */}
        <Card style={[styles.profileCard, { backgroundColor: theme.card }]}>
          <View style={styles.profileHeader}>
            <Image source={IMAGES.logo} style={styles.profileImage} />
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: theme.text }]}>
                {credentials?.merchantName || (language === 'en' ? 'Merchant' : 'Продавец')}
              </Text>
              <Text style={[styles.profileId, { color: theme.textSecondary }]}>
                ID: {credentials?.clientId || '---'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Settings Sections */}
        <View style={styles.sectionsContainer}>
          {/* Account Section */}
          <Card style={[styles.sectionCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {language === 'en' ? 'Account' : 'Аккаунт'}
            </Text>
            
            <TouchableOpacity 
              style={[styles.settingItem, { borderBottomColor: theme.border }]}
              onPress={() => router.push('/profile/edit')}
            >
              <View style={styles.settingItemLeft}>
                <View style={[styles.settingIcon, { backgroundColor: theme.primaryLight }]}>
                  <User size={20} color={theme.primary} />
                </View>
                <Text style={[styles.settingItemText, { color: theme.text }]}>
                  {language === 'en' ? 'Edit Profile' : 'Редактировать профиль'}
                </Text>
              </View>
              <ChevronRight size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </Card>

          {/* Data Management Section */}
          <Card style={[styles.sectionCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {language === 'en' ? 'Data Management' : 'Управление данными'}
            </Text>
            
            <TouchableOpacity 
              style={[styles.settingItem, { borderBottomColor: theme.border }]}
              onPress={handleExport}
              disabled={isExporting}
            >
              <View style={styles.settingItemLeft}>
                <View style={[styles.settingIcon, { backgroundColor: theme.primaryLight }]}>
                  <Download size={20} color={theme.primary} />
                </View>
                <Text style={[styles.settingItemText, { color: theme.text }]}>
                  {language === 'en' ? 'Export Configuration' : 'Экспорт конфигурации'}
                </Text>
              </View>
              <ChevronRight size={20} color={theme.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.settingItem, { borderBottomColor: theme.border }]}
              onPress={handleImport}
              disabled={isImporting}
            >
              <View style={styles.settingItemLeft}>
                <View style={[styles.settingIcon, { backgroundColor: theme.primaryLight }]}>
                  <Upload size={20} color={theme.primary} />
                </View>
                <Text style={[styles.settingItemText, { color: theme.text }]}>
                  {language === 'en' ? 'Import Configuration' : 'Импорт конфигурации'}
                </Text>
              </View>
              <ChevronRight size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </Card>

          {/* Products Section */}
          <Card style={[styles.sectionCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {language === 'en' ? 'Products' : 'Товары'}
            </Text>
            
            <TouchableOpacity 
              style={[styles.settingItem, { borderBottomColor: theme.border }]}
              onPress={() => router.push('/products')}
            >
              <View style={styles.settingItemLeft}>
                <View style={[styles.settingIcon, { backgroundColor: theme.primaryLight }]}>
                  <ShoppingBag size={20} color={theme.primary} />
                </View>
                <Text style={[styles.settingItemText, { color: theme.text }]}>
                  {language === 'en' ? 'Manage Products' : 'Управление товарами'}
                </Text>
              </View>
              <View style={styles.settingItemRight}>
                <Text style={[styles.settingItemCounter, { color: theme.textSecondary }]}>
                  {products.length}
                </Text>
                <ChevronRight size={20} color={theme.textSecondary} />
              </View>
            </TouchableOpacity>
          </Card>

          {/* Preferences Section */}
          <Card style={[styles.sectionCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {language === 'en' ? 'Preferences' : 'Настройки'}
            </Text>
            
            <TouchableOpacity 
              style={[styles.settingItem, { borderBottomColor: theme.border }]}
              onPress={() => {
                setLanguage(language === 'en' ? 'ru' : 'en');
              }}
            >
              <View style={styles.settingItemLeft}>
                <View style={[styles.settingIcon, { backgroundColor: theme.primaryLight }]}>
                  <Globe size={20} color={theme.primary} />
                </View>
                <Text style={[styles.settingItemText, { color: theme.text }]}>
                  {language === 'en' ? 'Language' : 'Язык'}
                </Text>
              </View>
              <View style={styles.settingItemRight}>
                <Text style={[styles.settingItemValue, { color: theme.textSecondary }]}>
                  {language === 'en' ? 'English' : 'Русский'}
                </Text>
                <ChevronRight size={20} color={theme.textSecondary} />
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.settingItem, { borderBottomColor: theme.border }]}
              onPress={toggleDarkMode}
            >
              <View style={styles.settingItemLeft}>
                <View style={[styles.settingIcon, { backgroundColor: theme.primaryLight }]}>
                  {darkMode ? <Moon size={20} color={theme.primary} /> : <Sun size={20} color={theme.primary} />}
                </View>
                <Text style={[styles.settingItemText, { color: theme.text }]}>
                  {language === 'en' ? 'Dark Mode' : 'Тёмная тема'}
                </Text>
              </View>
              <View style={styles.settingItemRight}>
                <Text style={[styles.settingItemValue, { color: theme.textSecondary }]}>
                  {darkMode ? (language === 'en' ? 'On' : 'Вкл') : (language === 'en' ? 'Off' : 'Выкл')}
                </Text>
                <ChevronRight size={20} color={theme.textSecondary} />
              </View>
            </TouchableOpacity>
          </Card>

          {/* Help Section */}
          <Card style={[styles.sectionCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {language === 'en' ? 'Help & Support' : 'Помощь и поддержка'}
            </Text>
            
            <TouchableOpacity 
              style={[styles.settingItem, { borderBottomColor: theme.border }]}
              onPress={() => router.push('/help')}
            >
              <View style={styles.settingItemLeft}>
                <View style={[styles.settingIcon, { backgroundColor: theme.primaryLight }]}>
                  <HelpCircle size={20} color={theme.primary} />
                </View>
                <Text style={[styles.settingItemText, { color: theme.text }]}>
                  {language === 'en' ? 'Help Center' : 'Справочный центр'}
                </Text>
              </View>
              <ChevronRight size={20} color={theme.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.settingItem, { borderBottomColor: theme.border }]}
              onPress={() => router.push('/contact')}
            >
              <View style={styles.settingItemLeft}>
                <View style={[styles.settingIcon, { backgroundColor: theme.primaryLight }]}>
                  <MessageCircle size={20} color={theme.primary} />
                </View>
                <Text style={[styles.settingItemText, { color: theme.text }]}>
                  {language === 'en' ? 'Contact Support' : 'Связаться с поддержкой'}
                </Text>
              </View>
              <ChevronRight size={20} color={theme.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.settingItem, { borderBottomWidth: 0 }]}
              onPress={() => router.push('/about')}
            >
              <View style={styles.settingItemLeft}>
                <View style={[styles.settingIcon, { backgroundColor: theme.primaryLight }]}>
                  <Info size={20} color={theme.primary} />
                </View>
                <Text style={[styles.settingItemText, { color: theme.text }]}>
                  {language === 'en' ? 'About' : 'О приложении'}
                </Text>
              </View>
              <ChevronRight size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </Card>

          {/* Logout Section */}
          <Card style={[styles.sectionCard, { backgroundColor: theme.card }]}>
            <TouchableOpacity 
              style={[styles.settingItem, { borderBottomWidth: 0 }]}
              onPress={handleLogout}
              disabled={isLoggingOut}
            >
              <View style={styles.settingItemLeft}>
                <View style={[styles.settingIcon, { backgroundColor: theme.errorLight }]}>
                  <LogOut size={20} color={theme.error} />
                </View>
                <Text style={[styles.settingItemText, { color: theme.error }]}>
                  {language === 'en' ? 'Logout' : 'Выйти'}
                </Text>
              </View>
              <ChevronRight size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </Card>
        </View>
      </ScrollView>

      {/* Модальное окно для импорта */}
      <Modal
        visible={importModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setImportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {language === 'en' ? 'Import Configuration' : 'Импорт конфигурации'}
            </Text>
            
            <Text style={[styles.modalDescription, { color: theme.textSecondary }]}>
              {language === 'en' 
                ? 'Paste the configuration JSON below:' 
                : 'Вставьте JSON конфигурации ниже:'}
            </Text>
            
            <TextInput
              style={[styles.modalTextInput, { 
                backgroundColor: theme.background, 
                color: theme.text,
                borderColor: theme.border
              }]}
              multiline
              numberOfLines={10}
              value={importText}
              onChangeText={setImportText}
              placeholder={language === 'en' ? 'Paste configuration JSON here...' : 'Вставьте JSON конфигурации сюда...'}
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
            />
            
            <View style={styles.modalButtons}>
              <Button
                title={language === 'en' ? 'Cancel' : 'Отмена'}
                onPress={() => {
                  setImportModalVisible(false);
                  setImportText('');
                }}
                variant="outline"
                style={styles.modalButton}
              />
              <Button
                title={language === 'en' ? 'Import' : 'Импортировать'}
                onPress={handleImportFromText}
                loading={isImporting}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: scaleSpacing(16),
    paddingVertical: scaleSpacing(16),
  },
  profileCard: {
    marginBottom: scaleSpacing(16),
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scaleSpacing(16),
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: scaleSpacing(16),
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: scaleFontSize(18),
    fontWeight: '600',
    marginBottom: scaleSpacing(4),
  },
  profileId: {
    fontSize: scaleFontSize(14),
  },
  sectionsContainer: {
    gap: scaleSpacing(16),
  },
  sectionCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: scaleFontSize(16),
    fontWeight: '600',
    padding: scaleSpacing(16),
    paddingBottom: scaleSpacing(8),
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: scaleSpacing(16),
    borderBottomWidth: 1,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scaleSpacing(12),
  },
  settingItemText: {
    fontSize: scaleFontSize(16),
    flex: 1,
  },
  settingItemValue: {
    fontSize: scaleFontSize(14),
    marginRight: scaleSpacing(8),
  },
  settingItemCounter: {
    fontSize: scaleFontSize(14),
    marginRight: scaleSpacing(8),
    backgroundColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: scaleSpacing(8),
    paddingVertical: scaleSpacing(2),
    borderRadius: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 16,
    padding: scaleSpacing(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: scaleFontSize(18),
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: scaleSpacing(8),
  },
  modalDescription: {
    fontSize: scaleFontSize(14),
    textAlign: 'center',
    marginBottom: scaleSpacing(16),
  },
  modalTextInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: scaleSpacing(12),
    fontSize: scaleFontSize(14),
    textAlignVertical: 'top',
    minHeight: 120,
    marginBottom: scaleSpacing(16),
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: scaleSpacing(12),
  },
  modalButton: {
    flex: 1,
  },
});
