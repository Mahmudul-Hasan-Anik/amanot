import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors } from '../theme/colors';

interface SectionHeaderProps {
  title: string;
  actionText?: string;
  onActionPress?: () => void;
  badge?: number | string;
  style?: StyleProp<ViewStyle>;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  actionText,
  onActionPress,
  badge,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{title}</Text>
        {badge !== undefined && badge !== null ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
      {actionText && onActionPress ? (
        <TouchableOpacity activeOpacity={0.7} onPress={onActionPress}>
          <Text style={styles.actionText}>{actionText}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  badge: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
    marginLeft: 8,
  },
  badgeText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 12,
    color: colors.textSecondary,
  },
  actionText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 13,
    color: colors.primary,
  },
});
