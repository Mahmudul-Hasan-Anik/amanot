import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Image,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, useRouter } from 'expo-router';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { CustomKeypad } from '../../src/components/CustomKeypad';
import { useAuthStore } from '../../src/features/auth/authStore';
import { isSupabaseConfigured } from '../../src/lib/supabase';
import { isValidPhone } from '../../src/lib/phoneAuth';

const REMOTE = isSupabaseConfigured();
import { useLanguage } from '../../src/i18n/useLanguage';
import { LanguageToggle } from '../../src/components/LanguageToggle';

export default function PinScreen() {
  const router = useRouter();
  const verifyPin = useAuthStore(s => s.verifyPin);
  const currentUser = useAuthStore(s => s.currentUser);
  const loginWithPin = useAuthStore(s => s.loginWithPin);
  const phoneRegistered = useAuthStore(s => s.phoneRegistered);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const phone = useAuthStore(s => s.phone);
  const [checking, setChecking] = useState(false);
  const [slow, setSlow] = useState(false);
  const busy = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (!checking) { setSlow(false); return; }
    const timer = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(timer);
  }, [checking]);
  const pinLength = REMOTE ? 6 : 4;

  const goHome = () => {
    if (useAuthStore.getState().mustChangePin) { router.replace('/(auth)/change-pin'); return; }
    const role = useAuthStore.getState().userRole;
    router.replace(role === 'member' ? '/(member)' : '/(admin)/(tabs)');
  };
  const { l } = useLanguage();
  const [pinDigits, setPinDigits] = useState<string[]>([]);
  if (REMOTE && (!isAuthenticated || !isValidPhone(phone))) return <Redirect href="/(auth)/login" />;

  const handlePressDigit = (digit: string) => {
    if (busy.current) return;
    if (pinDigits.length < pinLength) {
      const nextPin = [...pinDigits, digit];
      setPinDigits(nextPin);

      if (nextPin.length === pinLength && REMOTE) {
        busy.current = true;
        setChecking(true);
        loginWithPin(nextPin.join('')).then((res) => {
          if (!mounted.current || !useAuthStore.getState().isAuthenticated || useAuthStore.getState().phone !== phone) return;
          if (res.ok) {
            goHome();
          } else {
            Alert.alert(l('Login failed', 'লগইন ব্যর্থ'), res.error || l('Incorrect PIN', 'পিন সঠিক নয়'));
            setPinDigits([]);
          }
        }).catch(() => {
          if (!mounted.current || !useAuthStore.getState().isAuthenticated || useAuthStore.getState().phone !== phone) return;
          Alert.alert(l('Login failed', 'লগইন ব্যর্থ'), l('Could not verify your PIN. Please try again.', 'পিন যাচাই করা যায়নি। আবার চেষ্টা করুন।'));
          setPinDigits([]);
        }).finally(() => {
          busy.current = false;
          if (mounted.current) setChecking(false);
        });
        return;
      }

      if (!REMOTE && nextPin.length === pinLength) {
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
    if (busy.current) return;
    if (pinDigits.length > 0) {
      setPinDigits(pinDigits.slice(0, -1));
    }
  };

  const handleBiometricAuth = () => {
    if (REMOTE) {
      Alert.alert(l('Not available', 'চালু নেই'), l('Please enter your PIN.', 'অনুগ্রহ করে পিন দিন।'));
      return;
    }
    verifyPin('1234');
    const role = useAuthStore.getState().userRole;
    if (role === 'member') {
      router.replace('/(member)');
    } else {
      router.replace('/(admin)/(tabs)');
    }
  };

  const handleForgotPin = () => {
    if (REMOTE) {
      Alert.alert(
        l('Forgot PIN?', 'পিন ভুলে গেছেন?'),
        l('Ask your somiti admin to reset your PIN, then log in with the new PIN.', 'সমিতির অ্যাডমিনকে আপনার পিন রিসেট করতে বলুন, তারপর নতুন পিন দিয়ে লগইন করুন।'),
        [
          { text: l('Return to Login', 'লগইনে ফিরুন'), onPress: () => { useAuthStore.getState().logout(); router.replace('/(auth)/login'); } },
          { text: l('OK', 'ঠিক আছে'), style: 'cancel' },
        ]
      );
      return;
    }
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
      {__DEV__ && (
        <View style={styles.topBar}>
          <LanguageToggle />
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Image source={require('../../assets/logo-transparent.png')} style={styles.brandLogo} resizeMode="contain" accessibilityLabel={l('Amanot logo','আমানত লোগো')} />

        {/* User Info Header */}
        <Text style={styles.welcomeText}>
          {REMOTE
            ? l(`Welcome${currentUser?.name && currentUser.name.length > 1 ? ', ' + (currentUser.nameEn || currentUser.name) : ''}`, `স্বাগতম${currentUser?.name && currentUser.name.length > 1 ? ', ' + currentUser.name : ''}`)
            : l('Welcome, Anwar Hossain', `স্বাগতম, ${currentUser?.name || 'আনোয়ার হোসেন'}`)}
        </Text>
        <Text style={styles.roleText}>
          {REMOTE
            ? (phoneRegistered ? (currentUser?.role || '') : l('First login: use the PIN your admin gave you', 'প্রথমবার: অ্যাডমিনের দেওয়া পিন দিন'))
            : l('President · Super Admin', currentUser?.role || 'সভাপতি · সুপার অ্যাডমিন')}
        </Text>

        {/* PIN Title */}
        <Text style={styles.pinPromptText}>{l('Enter PIN', 'পিন দিন')}</Text>

        {/* PIN Dots Indicator */}
        <View style={styles.dotsRow}>
          {Array.from({length:pinLength}, (_,index)=>index).map((index) => {
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
        {checking && <View style={styles.checkingStatus} accessibilityLiveRegion="polite" accessibilityState={{ busy: true }}>
          <ActivityIndicator color={colors.primary} size="small" />
          <Text style={styles.statusText}>{slow
            ? l('This is taking longer than usual. Please keep your internet connected.', 'স্বাভাবিকের চেয়ে বেশি সময় লাগছে। ইন্টারনেট সংযোগ চালু রাখুন।')
            : l('Verifying PIN…', 'পিন যাচাই হচ্ছে…')}</Text>
        </View>}

        {/* Hint (Dev-only, demo mode) */}
        {__DEV__ && !REMOTE && (
          <Text style={styles.hintText}>
            {l('💡 PIN Code: 1234 (or tap biometric icon)', '💡 পিন কোড: ১২৩৪ (বা বায়োমেট্রিক আইকন চাপুন)')}
          </Text>
        )}

        {/* Custom Bengali Keypad with wide stadium pills */}
        <CustomKeypad
          onPressDigit={handlePressDigit}
          onPressBackspace={handlePressBackspace}
          onPressBiometric={handleBiometricAuth}
          showBiometric={!REMOTE}
          disabled={checking}
        />

        {/* Forgot PIN Link */}
        <TouchableOpacity
          onPress={handleForgotPin}
          disabled={checking}
          style={styles.forgotLinkContainer}
        >
          <Text style={styles.forgotLinkText}>{l('Forgot PIN?', 'পিন ভুলে গেছেন?')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  checkingStatus: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, paddingHorizontal: 16 },
  statusText: { flexShrink: 1, color: colors.primary, fontFamily: typography.fontFamily.regular, textAlign: 'center' },
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
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  brandLogo: {width: 96, height: 96, marginBottom: 16},
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
