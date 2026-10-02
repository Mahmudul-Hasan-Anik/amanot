import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface CheckboxProps {
  checked: boolean;
  onPress: () => void;
  label?: string;
  sublabel?: string;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onPress,
  label,
  sublabel,
  style,
  disabled = false,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={disabled}
      style={[styles.container, style]}
    >
      <View style={[styles.box, checked ? styles.boxChecked : styles.boxUnchecked]}>
        {checked ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
      </View>
      {label || sublabel ? (
        <View style={styles.textContainer}>
          {label ? <Text style={styles.label}>{label}</Text> : null}
          {sublabel ? <Text style={styles.sublabel}>{sublabel}</Text> : null}
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  box: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  boxUnchecked: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  textContainer: {
    marginLeft: 10,
    flex: 1,
  },
  label: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 14,
    color: colors.text,
  },
  sublabel: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
});
