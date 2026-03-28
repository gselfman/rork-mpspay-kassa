import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  Alert
} from 'react-native';
import { Button } from './Button';
import { Card } from './Card';
import { X, Upload, AlertCircle, CheckCircle } from 'lucide-react-native';
import colors from '@/constants/colors';
import { useThemeStore } from '@/store/theme-store';
import { useLanguageStore } from '@/store/language-store';
import { useProductStore } from '@/store/product-store';

interface BulkImportModalProps {
  visible: boolean;
  onClose: () => void;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  visible,
  onClose
}) => {
  const { darkMode } = useThemeStore();
  const { language } = useLanguageStore();
  const { bulkImportProducts } = useProductStore();
  const theme = darkMode ? colors.dark : colors.light;
  
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    added: number;
    updated: number;
    errors: Array<{ line: number; message: string; originalLine: string }>;
  } | null>(null);
  
  const getTranslation = (en: string, ru: string): string => {
    return language === 'en' ? en : ru;
  };
  
  const handleImport = async () => {
    if (!importText.trim()) {
      Alert.alert(
        getTranslation('Error', 'Ошибка'),
        getTranslation('Please enter product data to import', 'Пожалуйста, введите данные товаров для импорта')
      );
      return;
    }
    
    setIsImporting(true);
    
    try {
      const lines = importText.split('\n').filter(line => line.trim());
      
      if (lines.length > 1000) {
        Alert.alert(
          getTranslation('Error', 'Ошибка'),
          getTranslation('Maximum 1000 products allowed', 'Максимум 1000 товаров разрешено')
        );
        setIsImporting(false);
        return;
      }
      
      const result = bulkImportProducts(lines);
      setImportResult(result);
      
      if (result.errors.length === 0) {
        // If no errors, show success and close after delay
        setTimeout(() => {
          handleClose();
        }, 2000);
      }
    } catch (error) {
      Alert.alert(
        getTranslation('Error', 'Ошибка'),
        getTranslation('Failed to import products', 'Не удалось импортировать товары')
      );
    } finally {
      setIsImporting(false);
    }
  };
  
  const handleClose = () => {
    setImportText('');
    setImportResult(null);
    onClose();
  };
  
  const renderImportResult = () => {
    if (!importResult) return null;
    
    return (
      <Card style={[styles.resultCard, { backgroundColor: theme.card }]}>
        <View style={styles.resultHeader}>
          <CheckCircle size={24} color={theme.success} />
          <Text style={[styles.resultTitle, { color: theme.text }]}>
            {getTranslation('Import Results', 'Результаты импорта')}
          </Text>
        </View>
        
        <View style={styles.resultStats}>
          <Text style={[styles.resultStat, { color: theme.success }]}>
            {getTranslation(`Added: ${importResult.added}`, `Добавлено: ${importResult.added}`)}
          </Text>
          <Text style={[styles.resultStat, { color: theme.primary }]}>
            {getTranslation(`Updated: ${importResult.updated}`, `Обновлено: ${importResult.updated}`)}
          </Text>
          <Text style={[styles.resultStat, { color: theme.notification }]}>
            {getTranslation(`Errors: ${importResult.errors.length}`, `Ошибок: ${importResult.errors.length}`)}
          </Text>
        </View>
        
        {importResult.errors.length > 0 && (
          <View style={styles.errorsContainer}>
            <Text style={[styles.errorsTitle, { color: theme.notification }]}>
              {getTranslation('Errors:', 'Ошибки:')}
            </Text>
            <ScrollView style={styles.errorsList} nestedScrollEnabled>
              {importResult.errors.map((error, index) => (
                <View key={index} style={[styles.errorItem, { backgroundColor: theme.notification + '10' }]}>
                  <Text style={[styles.errorLine, { color: theme.notification }]}>
                    {getTranslation(`Line ${error.line}:`, `Строка ${error.line}:`)} {error.message}
                  </Text>
                  <Text style={[styles.errorOriginal, { color: theme.placeholder }]}>
                    "{error.originalLine}"
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </Card>
    );
  };
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Upload size={24} color={theme.primary} style={styles.icon} />
              <Text style={[styles.title, { color: theme.text }]}>
                {getTranslation('Import Product List', 'Импорт списка товаров')}
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
            <Card style={[styles.instructionCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.instructionTitle, { color: theme.text }]}>
                {getTranslation('Instructions:', 'Инструкции:')}
              </Text>
              <Text style={[styles.instructionText, { color: theme.placeholder }]}>
                {getTranslation(
                  'Paste your product list in the format: Product Name, Price (one per line, up to 1000 lines).',
                  'Вставьте список товаров в формате: Название товара, Цена (по одному на строку, до 1000 строк).'
                )}
              </Text>
              <Text style={[styles.exampleTitle, { color: theme.text }]}>
                {getTranslation('Example:', 'Пример:')}
              </Text>
              <Text style={[styles.exampleText, { color: theme.placeholder }]}>
                Strawberries packed, 450{'\n'}
                Freeze-dried ice cream, 120{'\n'}
                Coffee beans premium, 890
              </Text>
            </Card>
            
            <Card style={[styles.inputCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>
                {getTranslation('Product Data:', 'Данные товаров:')}
              </Text>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    backgroundColor: theme.inputBackground,
                    color: theme.text,
                    borderColor: theme.border
                  }
                ]}
                value={importText}
                onChangeText={setImportText}
                placeholder={getTranslation(
                  'Product Name, Price\nAnother Product, Price\n...',
                  'Название товара, Цена\nДругой товар, Цена\n...'
                )}
                placeholderTextColor={theme.placeholder}
                multiline
                numberOfLines={10}
                textAlignVertical="top"
              />
            </Card>
            
            {renderImportResult()}
          </ScrollView>
          
          <View style={styles.buttonContainer}>
            <Button
              title={getTranslation('Cancel', 'Отмена')}
              variant="outline"
              onPress={handleClose}
              style={styles.cancelButton}
              disabled={isImporting}
            />
            <Button
              title={getTranslation('Import', 'Импорт')}
              onPress={handleImport}
              loading={isImporting}
              disabled={isImporting || !importText.trim()}
              style={styles.importButton}
              icon={!isImporting ? <Upload size={20} color="white" /> : undefined}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '95%',
    maxWidth: 600,
    maxHeight: '90%',
    borderRadius: 12,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    marginBottom: 16,
  },
  instructionCard: {
    marginBottom: 16,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  exampleTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  exampleText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 16,
  },
  inputCard: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 200,
    maxHeight: 300,
  },
  resultCard: {
    marginBottom: 16,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  resultStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  resultStat: {
    fontSize: 14,
    fontWeight: '500',
  },
  errorsContainer: {
    marginTop: 12,
  },
  errorsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorsList: {
    maxHeight: 150,
  },
  errorItem: {
    padding: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  errorLine: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  errorOriginal: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
  },
  importButton: {
    flex: 1,
  },
});