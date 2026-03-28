import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps, Platform } from 'react-native';
import colors from '@/constants/colors';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string | undefined;
  darkMode?: boolean;
  icon?: React.ReactNode;
  style?: any;
  inputStyle?: any;
  autoFocus?: boolean;
}

export interface InputRef {
  focus: () => void;
  blur: () => void;
}

export const Input = forwardRef<InputRef, InputProps>(({ 
  label, 
  error, 
  style, 
  inputStyle,
  darkMode = false,
  icon,
  autoFocus = false,
  ...props 
}, ref) => {
  const theme = darkMode ? colors.dark : colors.light;
  const inputRef = useRef<TextInput>(null);
  
  // Expose focus and blur methods to parent components
  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
    },
    blur: () => {
      inputRef.current?.blur();
    }
  }));
  
  // Handle auto focus
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      // Small delay to ensure the component is fully mounted
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);
  
  return (
    <View style={[styles.container, style]}>
      {label ? (
        <Text style={[styles.label, { color: theme.text }]} allowFontScaling={false}>
          {label}
        </Text>
      ) : null}
      <View style={styles.inputContainer}>
        {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            { 
              borderColor: error ? theme.notification : theme.border,
              backgroundColor: theme.inputBackground,
              color: theme.text
            },
            icon ? styles.inputWithIcon : null,
            inputStyle
          ]}
          placeholderTextColor={theme.placeholder}
          allowFontScaling={false}
          // Ensure proper text input handling
          textContentType="none"
          autoComplete="off"
          autoCorrect={false}
          spellCheck={false}
          // Prevent input from losing focus on Android unless explicitly set
          blurOnSubmit={props.blurOnSubmit !== undefined ? props.blurOnSubmit : false}
          // Ensure proper keyboard handling
          returnKeyType={props.returnKeyType || "done"}
          // Add selection color for better visibility
          selectionColor={theme.primary}
          // Ensure proper focus behavior
          caretHidden={false}
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
});

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    marginBottom: 6,
    fontSize: 14,
    fontWeight: '500',
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
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 16,
    minHeight: 48,
    // Ensure proper text input behavior
    textAlignVertical: 'center',
  },
  inputWithIcon: {
    paddingLeft: 40,
  },
  error: {
    marginTop: 4,
    fontSize: 12,
  },
});