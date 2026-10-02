import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors } from '../theme/colors';

interface FilterChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  count?: number | string;
  showCheckmark?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const FilterChip: React.FC<FilterChipProps> = ({
  label,
  selected,
  onPress,
  count,
  showCheckmark = true,
  style,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.chip,
        selected ? styles.chipSelected : styles.chipUnselected,
        style,
      ]}
    >
      <Text style={[styles.text, selected ? styles.textSelected : styles.textUnselected]}>
        {selected && showCheckmark ? '✓ ' : ''}
        {label}
        {count !== undefined && count !== null ? ` ${count}` : ''}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9999,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  chipSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primarySoft,
  },
  chipUnselected: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  text: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 13,
    lineHeight: 18,
  },
  textSelected: {
    color: colors.primary,
    fontFamily: 'HindSiliguri-SemiBold',
    fontWeight: '600',
  },
  textUnselected: {
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
