import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../src/theme/colors';
import { CustomKeypad } from '../../src/components/CustomKeypad';
import { useAuthStore } from '../../src/features/auth/authStore';

export default function PinScreen() {
  const router = useRouter();
  const { verifyPin, currentUser } = useAuthStore();
  const [pinDigits, setPinDigits] = useState<string[]>(['১', '২']); // Initial 2 filled dots like design

  const handlePressDigit = (digit: string) => {
    if (pinDigits.length < 4) {
      const nextPin = [...pinDigits, digit];
      setPinDigits(nextPin);

      if (nextPin.length === 4) {
        setTimeout(() => {
          verifyPin(nextPin.join(''));
          router.replace('/(admin)/(tabs)');
        }, 200);
      }
    }
  };

  const handlePressBackspace = () => {
    if (pinDigits.length > 0) {
      setPinDigits(pinDigits.slice(0, -1));
    }
  };

  const handleBiometricAuth = () => {
    verifyPin('১২৩৪');
    router.replace('/(admin)/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Top Avatar Circle */}
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>আ</Text>
        </View>

        {/* User Info Header */}
        <Text style={styles.welcomeText}>
          স্বাগতম, {currentUser?.name || 'আনোয়ার হোসেন'}
        </Text>
        <Text style={styles.roleText}>
          {currentUser?.role || 'সভাপতি · সুপার অ্যাডমিন'}
        </Text>

        {/* PIN Title */}
        <Text style={styles.pinPromptText}>৪ সংখ্যার পিন দিন</Text>

        {/* 4 PIN Dots Indicator */}
        <View style={styles.dotsRow}>
          {[0, 1, 2, 3].map((index) => {
            const isFilled = index < pinDigits.length;
            return (
              <View
                key={index}
                style={[
                  styles.pinDot,
                  isFilled ? styles.pinDotFilled : styles.pinDotEmpty,
                ]}
              />
            );
          })}
        </View>

        {/* Custom Bengali Keypad */}
        <CustomKeypad
          onPressDigit={handlePressDigit}
          onPressBackspace={handlePressBackspace}
          onPressBiometric={handleBiometricAuth}
          showBiometric={true}
        />

        {/* Forgot PIN Link */}
        <TouchableOpacity style={styles.forgotLinkContainer}>
          <Text style={styles.forgotLinkText}>পিন ভুলে গেছেন?</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
  },
  welcomeText: {
    fontSize: 21,
    fontWeight: '700',
    color: colors.textMain,
    marginBottom: 4,
    textAlign: 'center',
  },
  roleText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 28,
    textAlign: 'center',
  },
  pinPromptText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMain,
    marginBottom: 16,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  pinDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginHorizontal: 8,
  },
  pinDotFilled: {
    backgroundColor: colors.primary,
  },
  pinDotEmpty: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.textMuted,
  },
  forgotLinkContainer: {
    marginTop: 16,
    padding: 8,
  },
  forgotLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});
