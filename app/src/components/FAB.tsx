import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface FABProps {
  label?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  iconSize?: number;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  position?: 'bottom-right' | 'bottom-center';
}

export const FAB: React.FC<FABProps> = ({
  label,
  iconName = 'add',
  iconSize = 20,
  onPress,
  style,
  position = 'bottom-right',
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.base,
        position === 'bottom-right' ? styles.bottomRight : styles.bottomCenter,
        style,
      ]}
    >
      <Ionicons name={iconName} size={iconSize} color={colors.surface} />
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 9999,
    paddingVertical: 13,
    paddingHorizontal: 20,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 6,
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
  label: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    fontWeight: '700',
    color: colors.surface,
    marginLeft: 6,
  },
});
