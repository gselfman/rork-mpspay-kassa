import React from 'react';
import { 
  Modal, 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  Platform
} from 'react-native';
import { Button } from './Button';
import { X, AlertCircle } from 'lucide-react-native';
import colors from '@/constants/colors';

interface ErrorPopupProps {
  visible: boolean;
  message: string;
  onClose: () => void;
  darkMode?: boolean;
  title?: string;
  rawResponse?: string | null;
}

export const ErrorPopup: React.FC<ErrorPopupProps> = ({
  visible,
  message,
  onClose,
  darkMode = false,
  title = 'Error',
  rawResponse
}) => {
  const theme = darkMode ? colors.dark : colors.light;
  const [showDetails, setShowDetails] = React.useState(false);
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <AlertCircle size={24} color={theme.notification} style={styles.icon} />
              <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.content}>
            <Text style={[styles.message, { color: theme.text }]}>
              {message}
            </Text>
            
            {rawResponse && (
              <>
                {showDetails ? (
                  <View style={[styles.detailsContainer, { backgroundColor: theme.card }]}>
                    <Text style={[styles.detailsTitle, { color: theme.text }]}>
                      Response Details:
                    </Text>
                    <ScrollView style={styles.detailsScroll}>
                      <Text style={[styles.detailsText, { color: theme.placeholder }]}>
                        {rawResponse}
                      </Text>
                    </ScrollView>
                    <TouchableOpacity 
                      onPress={() => setShowDetails(false)}
                      style={[styles.hideDetailsButton, { backgroundColor: theme.border }]}
                    >
                      <Text style={[styles.hideDetailsText, { color: theme.text }]}>
                        Hide Details
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity 
                    onPress={() => setShowDetails(true)}
                    style={styles.showDetailsButton}
                  >
                    <Text style={[styles.showDetailsText, { color: theme.primary }]}>
                      Show Technical Details
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </ScrollView>
          
          <Button
            title="Close"
            onPress={onClose}
            style={styles.button}
          />
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
    width: '90%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
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
  },
  icon: {
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    marginBottom: 20,
    maxHeight: 400,
  },
  message: {
    fontSize: 16,
    marginBottom: 16,
    lineHeight: 22,
  },
  button: {
    marginTop: 8,
  },
  showDetailsButton: {
    padding: 8,
    alignSelf: 'flex-start',
  },
  showDetailsText: {
    fontSize: 14,
    fontWeight: '500',
  },
  detailsContainer: {
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 16,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  detailsScroll: {
    maxHeight: 200,
  },
  detailsText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  hideDetailsButton: {
    padding: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  hideDetailsText: {
    fontSize: 12,
    fontWeight: '500',
  },
});