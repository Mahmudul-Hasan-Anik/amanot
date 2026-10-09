import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

export type StatusType =
  | 'paid'        // জমা ✓
  | 'due'         // বকেয়া
  | 'highRisk'    // উচ্চ ঝুঁকি
  | 'partial'     // আংশিক
  | 'inactive'    // নিষ্ক্রিয়
  | 'ongoing'     // চলমান
  | 'delayed'     // বিলম্বিত
  | 'completed'   // সমাপ্ত
  | 'new';        // নতুন

interface StatusChipProps {
  label: string;
  type?: StatusType;
  style?: StyleProp<ViewStyle>;
}

export const StatusChip: React.FC<StatusChipProps> = ({ label, type = 'paid', style }) => {
  const config = getChipConfig(type);

  return (
    <View style={[styles.base, { backgroundColor: config.bg }, style]}>
      <Text style={[styles.text, { color: config.color }]}>
        {label}
      </Text>
    </View>
  );
};

function getChipConfig(type: StatusType) {
  switch (type) {
    case 'paid':
      return { bg: colors.statusPaidBg, color: colors.statusPaid };
    case 'due':
      return { bg: colors.statusDueBg, color: colors.statusDue };
    case 'highRisk':
      return { bg: colors.statusHighRiskBg, color: colors.statusHighRisk };
    case 'partial':
      return { bg: colors.statusPartialBg, color: colors.statusPartial };
    case 'inactive':
      return { bg: colors.statusInactiveBg, color: colors.statusInactive };
    case 'ongoing':
      return { bg: colors.primaryLight, color: colors.primary };
    case 'delayed':
      return { bg: colors.statusDueBg, color: colors.statusDue };
    case 'completed':
      return { bg: colors.statusInactiveBg, color: colors.statusInactive };
    case 'new':
      return { bg: '#1E293B', color: '#FFFFFF' };
    default:
      return { bg: colors.borderLight, color: colors.textSecondary };
  }
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    fontWeight: '600',
  },
});
