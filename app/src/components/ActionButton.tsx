import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../theme/colors';

interface ActionButtonProps {
  label: string;
  iconName: keyof typeof Ionicons.glyphMap;
  iconSize?: number;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  iconColor?: string;
  badge?: number | string;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  label,
  iconName,
  iconSize = 22,
  onPress,
  style,
  iconColor = colors.primary,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.button, style]}
    >
      <Ionicons name={iconName} size={iconSize} color={iconColor} />
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  label: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 12,
    lineHeight: 16,
    color: colors.text,
    marginTop: 6,
    textAlign: 'center',
  },
});
