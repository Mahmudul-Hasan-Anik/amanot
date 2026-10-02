import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors } from '../theme/colors';

interface SegmentOption<T extends string = string> {
  value: T;
  label: string;
  badge?: number | string;
}

interface SegmentedControlProps<T extends string = string> {
  options: SegmentOption<T>[];
  selectedValue: T;
  onSelect: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}

export function SegmentedControl<T extends string = string>({
  options,
  selectedValue,
  onSelect,
  style,
}: SegmentedControlProps<T>) {
  return (
    <View style={[styles.container, style]}>
      {options.map((opt) => {
        const isSelected = opt.value === selectedValue;
        return (
          <TouchableOpacity
            key={opt.value}
            activeOpacity={0.8}
            onPress={() => onSelect(opt.value)}
            style={[styles.segment, isSelected ? styles.selectedSegment : null]}
          >
            <Text
              style={[
                styles.segmentText,
                isSelected ? styles.selectedText : styles.unselectedText,
              ]}
            >
              {opt.label}
              {opt.badge !== undefined && opt.badge !== null ? ` ${opt.badge}` : ''}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 9999,
    padding: 3,
    width: '100%',
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
  },
  selectedSegment: {
    backgroundColor: colors.surface,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 13,
  },
  selectedText: {
    color: colors.text,
    fontFamily: 'HindSiliguri-Bold',
    fontWeight: '700',
  },
  unselectedText: {
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
