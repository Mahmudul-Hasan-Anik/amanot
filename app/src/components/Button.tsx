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
import { typography } from '../theme/typography';

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
  testID?: string;
  accessibilityLabel?: string;
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
  testID,
  accessibilityLabel,
}) => {
  const normalizedSize = size === 'large' ? 'lg' : size;
  const isMint = variant === 'mint' || variant === 'secondary';

  return (
    <TouchableOpacity
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
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
          color={isMint || variant === 'outline' || variant === 'ghost' ? colors.primary : colors.textWhite}
          size="small"
        />
      ) : (
        <>
          {icon && <>{icon}</>}
          {title ? <Text
            style={[
              styles.text,
              styles[`text_${variant}`],
              styles[`textSize_${normalizedSize}`],
              icon ? { marginLeft: 8 } : null,
              textStyle,
            ]}
          >
            {title}
          </Text> : null}
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
    flexShrink: 1,
    fontFamily: 'HindSiliguri-SemiBold',
    fontWeight: '600',
    textAlign: 'center',
  },
  text_primary: {
    color: colors.textWhite,
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
    color: colors.textWhite,
  },
  text_ghost: {
    color: colors.primary,
  },
  text_floating: {
    color: colors.textWhite,
    fontSize: typography.size.base,
    fontFamily: 'HindSiliguri-Bold',
    fontWeight: '700',
  },

  textSize_sm: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
  },
  textSize_md: {
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
  },
  textSize_lg: {
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
  },
});
