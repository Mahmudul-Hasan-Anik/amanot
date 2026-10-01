import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp
} from 'react-native';
import { colors } from '../theme/colors';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'floating';
  size?: 'sm' | 'md' | 'lg' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
}) => {
  const normalizedSize = size === 'large' ? 'lg' : size;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        styles[variant],
        styles[`size_${normalizedSize}`],
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'floating' || variant === 'danger' ? '#FFFFFF' : colors.primary}
          size="small"
        />
      ) : (
        <>
          {icon && <>{icon}</>}
          <Text
            style={[
              styles.text,
              styles[`text_${variant}`],
              styles[`textSize_${normalizedSize}`],
              icon ? { marginLeft: 8 } : null,
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.primaryLight,
  },
  outline: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
  },
  danger: {
    backgroundColor: colors.danger,
  },
  floating: {
    backgroundColor: colors.primary,
    borderRadius: 30,
    paddingHorizontal: 22,
    paddingVertical: 14,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  disabled: {
    opacity: 0.5,
  },

  // Sizes
  size_sm: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  size_md: {
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  size_lg: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
  },

  // Text
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  text_primary: {
    color: '#FFFFFF',
  },
  text_secondary: {
    color: colors.primary,
  },
  text_outline: {
    color: colors.textMain,
  },
  text_danger: {
    color: '#FFFFFF',
  },
  text_floating: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  textSize_sm: {
    fontSize: 13,
  },
  textSize_md: {
    fontSize: 15,
  },
  textSize_lg: {
    fontSize: 17,
  },
});
