import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
  TextInputProps,
  TouchableOpacity,
} from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helper?: string;
  prefix?: string;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  variant?: 'surface' | 'muted';
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helper,
  prefix,
  rightIcon,
  onRightIconPress,
  containerStyle,
  inputStyle,
  variant = 'surface',
  editable = true,
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputContainer,
          variant === 'muted' || !editable ? styles.mutedBg : styles.surfaceBg,
          error ? styles.errorBorder : null,
        ]}
      >
        {prefix ? (
          <View style={styles.prefixContainer}>
            <Text style={styles.prefixText}>{prefix}</Text>
          </View>
        ) : null}
        <TextInput
          editable={editable}
          placeholderTextColor={colors.textSecondary}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={[
            styles.input,
            prefix ? styles.inputWithPrefix : null,
            inputStyle,
          ]}
          {...rest}
        />
        {rightIcon ? (
          <TouchableOpacity
            disabled={!onRightIconPress}
            onPress={onRightIconPress}
            style={styles.rightIcon}
          >
            {rightIcon}
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {helper && !error ? <Text style={styles.helperText}>{helper}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: typography.size.subhead,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  surfaceBg: {
    backgroundColor: colors.surface,
  },
  mutedBg: {
    backgroundColor: colors.surfaceMuted,
  },
  errorBorder: {
    borderColor: colors.warning,
  },
  prefixContainer: {
    marginRight: 8,
  },
  prefixText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: typography.size.md,
    color: colors.text,
  },
  input: {
    flex: 1,
    fontFamily: 'HindSiliguri-Regular',
    fontSize: typography.size.md,
    color: colors.text,
    paddingVertical: 10,
  },
  inputWithPrefix: {
    paddingLeft: 0,
  },
  rightIcon: {
    marginLeft: 8,
    padding: 4,
  },
  errorText: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: typography.size.caption,
    color: colors.warning,
    marginTop: 4,
  },
  helperText: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: typography.size.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
});
