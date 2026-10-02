import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../src/theme/colors';
import { CustomKeypad } from '../../src/components/CustomKeypad';
import { useAuthStore } from '../../src/features/auth/authStore';
import { useLanguage } from '../../src/i18n/useLanguage';
import { LanguageToggle } from '../../src/components/LanguageToggle';

export default function PinScreen() {
  const router = useRouter();
  const { verifyPin, currentUser } = useAuthStore();
  const { l } = useLanguage();
  const [pinDigits, setPinDigits] = useState<string[]>([]);

  const handlePressDigit = (digit: string) => {
    if (pinDigits.length < 4) {
      const nextPin = [...pinDigits, digit];
      setPinDigits(nextPin);

      if (nextPin.length === 4) {
        setTimeout(() => {
          const success = verifyPin(nextPin.join(''));
          if (success) {
            router.replace('/(admin)/(tabs)');
          } else {
            Alert.alert(
              l('Incorrect PIN', 'ভুল পিন'),
              l('Your PIN is incorrect. Default PIN: 1234', 'আপনার পিন কোডটি সঠিক নয়। ডিফল্ট পিন: ১২৩৪')
            );
            setPinDigits([]);
          }
        }, 150);
      }
    }
  };

  const handlePressBackspace = () => {
    if (pinDigits.length > 0) {
      setPinDigits(pinDigits.slice(0, -1));
    }
  };

  const handleBiometricAuth = () => {
    verifyPin('1234');
    router.replace('/(admin)/(tabs)');
  };

  const handleForgotPin = () => {
    Alert.alert(
      l('Forgot PIN?', 'পিন ভুলে গেছেন?'),
      l('Default test PIN is: 1234. Or you can log in again.', 'ডিফল্ট টেস্ট পিন কোড হলো: ১২৩৪। অথবা আপনি পুনরায় লগইন করতে পারেন।'),
      [
        { text: l('Return to Login', 'লগইনে ফিরুন'), onPress: () => router.replace('/(auth)/login') },
        { text: l('OK', 'ঠিক আছে'), style: 'cancel' }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <LanguageToggle />
      </View>
      <View style={styles.content}>
        {/* Top Avatar Circle */}
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {currentUser?.name ? (l('A', currentUser.name.charAt(0))) : l('A', 'আ')}
          </Text>
        </View>

        {/* User Info Header */}
        <Text style={styles.welcomeText}>
          {l('Welcome, Anwar Hossain', `স্বাগতম, ${currentUser?.name || 'আনোয়ার হোসেন'}`)}
        </Text>
        <Text style={styles.roleText}>
          {l('President · Super Admin', currentUser?.role || 'সভাপতি · সুপার অ্যাডমিন')}
        </Text>

        {/* PIN Title */}
        <Text style={styles.pinPromptText}>{l('Enter 4-Digit PIN', '৪ সংখ্যার পিন দিন')}</Text>

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

        {/* Hint */}
        <Text style={styles.hintText}>
          {l('💡 PIN Code: 1234 (or tap biometric icon)', '💡 পিন কোড: ১২৩৪ (বা বায়োমেট্রিক আইকন চাপুন)')}
        </Text>

        {/* Custom Bengali Keypad */}
        <CustomKeypad
          onPressDigit={handlePressDigit}
          onPressBackspace={handlePressBackspace}
          onPressBiometric={handleBiometricAuth}
          showBiometric={true}
        />

        {/* Forgot PIN Link */}
        <TouchableOpacity
          onPress={handleForgotPin}
          style={styles.forgotLinkContainer}
        >
          <Text style={styles.forgotLinkText}>{l('Forgot PIN?', 'পিন ভুলে গেছেন?')}</Text>
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
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    alignItems: 'flex-end',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textMain,
    marginBottom: 4,
    textAlign: 'center',
  },
  roleText: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 28,
  },
  pinPromptText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textMain,
    marginBottom: 16,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginHorizontal: 10,
  },
  pinDotEmpty: {
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
  },
  pinDotFilled: {
    backgroundColor: colors.primary,
  },
  hintText: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 20,
    backgroundColor: colors.primaryLight + '50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  forgotLinkContainer: {
    marginTop: 20,
    paddingVertical: 10,
  },
  forgotLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
});
