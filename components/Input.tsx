import React from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps, Platform } from 'react-native';
import colors from '@/constants/colors';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string | undefined;
  darkMode?: boolean;
  icon?: React.ReactNode;
  style?: any;
  inputStyle?: any; // Add inputStyle prop
}

export const Input: React.FC<InputProps> = ({ 
  label, 
  error, 
  style, 
  inputStyle, // Add inputStyle prop
  darkMode = false,
  icon,
  ...props 
}) => {
  const theme = darkMode ? colors.dark : colors.light;
  
  return (
    <View style={[styles.container, style]}>
      {label ? (
        <Text style={[styles.label, { color: theme.text }]} allowFontScaling={false}>
          {label}
        </Text>
      ) : null}
      <View style={styles.inputContainer}>
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <TextInput
          style={[
            styles.input,
            { 
              borderColor: error ? theme.notification : theme.border,
              backgroundColor: theme.inputBackground,
              color: theme.text
            },
            icon ? styles.inputWithIcon : null,
            inputStyle // Apply inputStyle prop
          ]}
          placeholderTextColor={theme.placeholder}
          allowFontScaling={false}
          {...props}
        />
      </View>
      {error ? (
        <Text style={[styles.error, { color: theme.notification }]} allowFontScaling={false}>
          {error}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    marginBottom: 6,
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  iconContainer: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 16,
    minHeight: 48, // Ensure minimum height for better touch targets
  },
  inputWithIcon: {
    paddingLeft: 40,
  },
  error: {
    marginTop: 4,
    fontSize: 12,
  },
});