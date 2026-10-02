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
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'floating' | 'mint' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'large';
  disabled?: boolean;
  loading?: boolean;
  pill?: boolean;
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
  pill = true,
  icon,
  style,
  textStyle,
}) => {
  const normalizedSize = size === 'large' ? 'lg' : size;
  const isMint = variant === 'mint' || variant === 'secondary';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        pill && styles.pill,
        styles[variant],
        styles[`size_${normalizedSize}`],
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={isMint || variant === 'outline' || variant === 'ghost' ? colors.primary : '#FFFFFF'}
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
    borderRadius: 9999,
  },
  pill: {
    borderRadius: 9999,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.primarySoft,
  },
  mint: {
    backgroundColor: colors.primarySoft,
  },
  outline: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  danger: {
    backgroundColor: colors.danger,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  floating: {
    backgroundColor: colors.primary,
    borderRadius: 9999,
    paddingHorizontal: 22,
    paddingVertical: 14,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  disabled: {
    opacity: 0.5,
  },

  // Sizes
  size_sm: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  size_md: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  size_lg: {
    paddingVertical: 15,
    paddingHorizontal: 24,
  },

  // Text
  text: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontWeight: '600',
    textAlign: 'center',
  },
  text_primary: {
    color: '#FFFFFF',
  },
  text_secondary: {
    color: colors.primary,
  },
  text_mint: {
    color: colors.primary,
  },
  text_outline: {
    color: colors.text,
  },
  text_danger: {
    color: '#FFFFFF',
  },
  text_ghost: {
    color: colors.primary,
  },
  text_floating: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'HindSiliguri-Bold',
    fontWeight: '700',
  },

  textSize_sm: {
    fontSize: 13,
    lineHeight: 18,
  },
  textSize_md: {
    fontSize: 15,
    lineHeight: 22,
  },
  textSize_lg: {
    fontSize: 17,
    lineHeight: 24,
  },
});
