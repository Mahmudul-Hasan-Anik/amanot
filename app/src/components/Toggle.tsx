import React from 'react';
import { TouchableOpacity, Animated, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors } from '../theme/colors';

interface ToggleProps {
  value: boolean;
  onValueChange: (newValue: boolean) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const Toggle: React.FC<ToggleProps> = ({
  value,
  onValueChange,
  disabled = false,
  style,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      style={[
        styles.track,
        value ? styles.trackOn : styles.trackOff,
        disabled ? styles.disabled : null,
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.thumb,
          value ? styles.thumbOn : styles.thumbOff,
        ]}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  track: {
    width: 46,
    height: 26,
    borderRadius: 13,
    padding: 2,
    justifyContent: 'center',
  },
  trackOn: {
    backgroundColor: colors.primary,
  },
  trackOff: {
    backgroundColor: colors.border,
  },
  thumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  thumbOn: {
    alignSelf: 'flex-end',
  },
  thumbOff: {
    alignSelf: 'flex-start',
  },
  disabled: {
    opacity: 0.5,
  },
});
