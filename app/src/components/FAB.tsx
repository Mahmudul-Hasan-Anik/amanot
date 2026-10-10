import React from 'react';
import { StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button } from './Button';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface FABProps {
  label?: string;
  accessibilityLabel?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  iconSize?: number;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  position?: 'bottom-right' | 'bottom-center';
}

export const FAB: React.FC<FABProps> = ({
  label,
  accessibilityLabel,
  iconName = 'add',
  iconSize = 20,
  onPress,
  style,
  position = 'bottom-right',
}) => (
  <Button
    title={label ?? ''}
    accessibilityLabel={accessibilityLabel ?? label ?? iconName}
    onPress={onPress}
    variant="floating"
    icon={<Ionicons name={iconName} size={iconSize} color={colors.surface} style={styles.icon} />}
    textStyle={styles.label}
    style={[
      styles.base,
      position === 'bottom-right' ? styles.bottomRight : styles.bottomCenter,
      style,
    ]}
  />
);

const styles = StyleSheet.create({
  base: {
    position: 'absolute',
    maxWidth: '90%',
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 20,
    zIndex: 99,
  },
  bottomRight: {
    right: 20,
    bottom: 24,
  },
  bottomCenter: {
    alignSelf: 'center',
    bottom: 24,
  },
  icon: {
    flexShrink: 0,
  },
  label: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.base,
  },
});
