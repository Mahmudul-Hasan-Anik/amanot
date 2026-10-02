import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useLanguage } from '../i18n/useLanguage';

interface CustomKeypadProps {
  onPressDigit: (digit: string) => void;
  onPressBackspace: () => void;
  onPressBiometric?: () => void;
  showBiometric?: boolean;
}

export const CustomKeypad: React.FC<CustomKeypadProps> = ({
  onPressDigit,
  onPressBackspace,
  onPressBiometric,
  showBiometric = true,
}) => {
  const { formatNum } = useLanguage();
  const rows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
  ];

  return (
    <View style={styles.container}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((digit) => (
            <TouchableOpacity
              key={digit}
              style={styles.key}
              activeOpacity={0.7}
              onPress={() => onPressDigit(digit)}
            >
              <Text style={styles.digitText}>{formatNum(digit)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}

      {/* Row 4: Biometric, 0, Backspace */}
      <View style={styles.row}>
        {showBiometric ? (
          <TouchableOpacity
            style={[styles.key, styles.biometricKey]}
            activeOpacity={0.7}
            onPress={onPressBiometric}
          >
            <Ionicons name="finger-print" size={28} color={colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.emptyKey} />
        )}

        <TouchableOpacity
          style={styles.key}
          activeOpacity={0.7}
          onPress={() => onPressDigit('0')}
        >
          <Text style={styles.digitText}>{formatNum('0')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.key}
          activeOpacity={0.7}
          onPress={onPressBackspace}
        >
          <Ionicons name="backspace-outline" size={26} color={colors.textMain} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 24,
    alignItems: 'center',
    marginVertical: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginVertical: 8,
    maxWidth: 320,
  },
  key: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  biometricKey: {
    backgroundColor: colors.primaryLight,
  },
  emptyKey: {
    width: 76,
    height: 76,
  },
  digitText: {
    fontSize: 26,
    fontWeight: '600',
    color: colors.textMain,
  },
});
