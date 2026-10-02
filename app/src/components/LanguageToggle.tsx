import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLanguage } from '../i18n/useLanguage';

interface LanguageToggleProps {
  compact?: boolean;
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({ compact = false }) => {
  const { language, setLanguage } = useLanguage();

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <TouchableOpacity
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
          বাংলা
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
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
          English
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 20,
    padding: 3,
    alignItems: 'center',
  },
  containerCompact: {
    borderRadius: 16,
    padding: 2,
  },
  segment: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
  },
  segmentCompact: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 13,
  },
  segmentActive: {
    backgroundColor: '#0F766E',
    shadowColor: '#0F766E',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 12,
    color: '#475569',
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  segmentTextCompact: {
    fontSize: 11,
  },
});
