import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLanguage } from '../i18n/useLanguage';
import { colors } from '../theme/colors';

interface LanguageToggleProps {
  compact?: boolean;
  shortLabels?: boolean;
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({ compact = false, shortLabels = false }) => {
  const { language, setLanguage } = useLanguage();

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="বাংলা"
        accessibilityState={{ selected: language === 'bn' }}
        style={[
          styles.segment,
          language === 'bn' && styles.segmentActive,
          compact && styles.segmentCompact,
        ]}
        onPress={() => setLanguage('bn')}
        activeOpacity={0.8}
      >
        <Text
          style={[
            styles.segmentText,
            language === 'bn' && styles.segmentTextActive,
            compact && styles.segmentTextCompact,
          ]}
        >
          {shortLabels ? 'BN' : 'বাংলা'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="English"
        accessibilityState={{ selected: language === 'en' }}
        style={[
          styles.segment,
          language === 'en' && styles.segmentActive,
          compact && styles.segmentCompact,
        ]}
        onPress={() => setLanguage('en')}
        activeOpacity={0.8}
      >
        <Text
          style={[
            styles.segmentText,
            language === 'en' && styles.segmentTextActive,
            compact && styles.segmentTextCompact,
          ]}
        >
          {shortLabels ? 'EN' : 'English'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.primarySoft,
    borderRadius: 20,
    padding: 3,
    alignItems: 'center',
  },
  containerCompact: {
    borderRadius: 16,
    padding: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  segment: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
  },
  segmentCompact: {
    minWidth: 32,
    minHeight: 26,
    paddingHorizontal: 8,
    paddingVertical: 0,
    borderRadius: 13,
    shadowOpacity: 0,
    elevation: 0,
  },
  segmentActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 12,
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.surface,
    fontWeight: '700',
  },
  segmentTextCompact: {
    fontSize: 11,
    lineHeight: 16,
    includeFontPadding: false,
  },
});
