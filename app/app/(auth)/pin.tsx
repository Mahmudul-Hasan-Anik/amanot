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
import { typography } from '../../src/theme/typography';
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
            const role = useAuthStore.getState().userRole;
            if (role === 'member') {
              router.replace('/(member)');
            } else {
              router.replace('/(admin)/(tabs)');
            }
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
    const role = useAuthStore.getState().userRole;
    if (role === 'member') {
      router.replace('/(member)');
    } else {
      router.replace('/(admin)/(tabs)');
    }
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

  const userInitial = currentUser?.name
    ? currentUser.name.trim().charAt(0)
    : 'আ';

  return (
    <SafeAreaView style={styles.container}>
      {__DEV__ && (
        <View style={styles.topBar}>
          <LanguageToggle />
        </View>
      )}

      <View style={styles.content}>
        {/* Top Avatar Circle in Mint Soft background */}
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{userInitial}</Text>
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

        {/* Hint (Dev-only) */}
        {__DEV__ && (
          <Text style={styles.hintText}>
            {l('💡 PIN Code: 1234 (or tap biometric icon)', '💡 পিন কোড: ১২৩৪ (বা বায়োমেট্রিক আইকন চাপুন)')}
          </Text>
        )}

        {/* Custom Bengali Keypad with wide stadium pills */}
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
    backgroundColor: colors.bg,
  },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    alignItems: 'flex-end',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: typography.size.hero,
    lineHeight: typography.lineHeight.hero,
    fontWeight: '700',
    color: colors.primary,
    includeFontPadding: false,
  },
  welcomeText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: typography.size.xl,
    lineHeight: typography.lineHeight.xl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  roleText: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    color: colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  pinPromptText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: typography.size.base,
    lineHeight: typography.lineHeight.base,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  pinDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginHorizontal: 8,
  },
  pinDotEmpty: {
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pinDotFilled: {
    backgroundColor: colors.primary,
  },
  hintText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.primary,
    marginBottom: 16,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
  },
  forgotLinkContainer: {
    marginTop: 16,
    paddingVertical: 8,
  },
  forgotLinkText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    fontWeight: '600',
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});
