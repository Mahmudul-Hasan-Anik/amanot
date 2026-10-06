import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { AppModal } from '../../src/components/AppModal';
import { useAuthStore } from '../../src/features/auth/authStore';
import { isSupabaseConfigured } from '../../src/lib/supabase';

const REMOTE = isSupabaseConfigured();
import { useSomitiStore } from '../../src/store/somitiStore';
import {
  toBengaliDigits,
  toEnglishDigits,
  normalizeMobileNumber,
  isValidMobileNumber,
} from '../../src/lib/money';
import { useLanguage } from '../../src/i18n/useLanguage';
import { LanguageToggle } from '../../src/components/LanguageToggle';

export default function LoginScreen() {
  const router = useRouter();
  const { requestOtp, verifyOtp, setPhone, checkPhoneRegistration, loginAs, registerSomiti, continueWithPhone, registerSomitiRemote } = useAuthStore();
  const [busy, setBusy] = useState(false);
  const { members, somitiInfo } = useSomitiStore();
  const { l, isBengali, useBengaliDigits, formatNum } = useLanguage();

  // Internal English 10-digit number (e.g. '1712345678')
  const [phoneDigits, setPhoneDigits] = useState('1712345678');
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(42);
  const [canResend, setCanResend] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const hiddenOtpInputRef = useRef<TextInput>(null);

  // Unregistered & Registration Modals
  const [showUnregisteredModal, setShowUnregisteredModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regSomitiName, setRegSomitiName] = useState('');
  const [regAdminName, setRegAdminName] = useState('');
  const [regAdminPhone, setRegAdminPhone] = useState('');
  const [regAdminPin, setRegAdminPin] = useState('1234');

  // Format phone display with South Asian phone space (e.g. "১৭১২ ৩৪৫৬৭৮" or "1712 345678")
  const formatPhoneDisplay = (digits: string): string => {
    const formatted = digits.length <= 4
      ? digits
      : `${digits.slice(0, 4)} ${digits.slice(4)}`;
    return (useBengaliDigits || isBengali) ? toBengaliDigits(formatted) : formatted;
  };

  const isPhoneValid = isValidMobileNumber(phoneDigits);

  // Handle phone input typing
  const handlePhoneChange = (text: string) => {
    const normalized = normalizeMobileNumber(text);
    setPhoneDigits(normalized);
  };

  // Timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (otpSent && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpSent, timerSeconds]);

  const handleSendOtp = () => {
    if (!isPhoneValid) {
      Alert.alert(
        l('Invalid Number', 'ভুল নম্বর'),
        l('Please enter a valid 10-digit mobile number.', 'অনুগ্রহ করে সঠিক ১০ সংখ্যার মোবাইল নম্বর লিখুন।')
      );
      return;
    }

    const fullPhone = '0' + phoneDigits;

    if (REMOTE) {
      // Backend mode: phone + PIN (no SMS). Check the number, then ask for the PIN.
      setBusy(true);
      continueWithPhone(fullPhone).then((res) => {
        setBusy(false);
        if (res.error) {
          Alert.alert(l('Connection problem', 'সংযোগ সমস্যা'), res.error);
        } else if (!res.found) {
          setShowUnregisteredModal(true);
        } else {
          router.replace('/(auth)/pin');
        }
      });
      return;
    }

    // Check phone registration in Somiti membership pool
    const check = checkPhoneRegistration(fullPhone, members);
    if (!check.found) {
      setShowUnregisteredModal(true);
      return;
    }

    const countryPrefix = isBengali || useBengaliDigits ? '+৮৮০' : '+880';
    requestOtp(fullPhone);
    setPhone(`${countryPrefix} ${formatPhoneDisplay(phoneDigits)}`);
    setOtpSent(true);
    setTimerSeconds(42);
    setCanResend(false);
    setOtpValue('');

    // Focus on OTP input
    setTimeout(() => {
      hiddenOtpInputRef.current?.focus();
    }, 300);
  };

  const handleVerifyOtp = () => {
    if (otpValue.length < 6) {
      Alert.alert(
        l('Incomplete OTP', 'অসম্পূর্ণ ওটিপি'),
        l('Please enter the 6-digit OTP code.', 'অনুগ্রহ করে ৬ সংখ্যার ওটিপি কোডটি লিখুন।')
      );
      return;
    }

    setIsVerifying(true);
    const success = verifyOtp(otpValue);
    setIsVerifying(false);

    if (success) {
      router.replace('/(auth)/pin');
    } else {
      Alert.alert(
        l('Incorrect Code', 'ভুল কোড'),
        l('OTP code is incorrect. Demo OTP: 482700', 'ওটিপি কোডটি সঠিক নয়। ডেমো ওটিপি: ৪৮২৭০০')
      );
    }
  };

  const handleRegisterSomitiSubmit = () => {
    if (!regSomitiName.trim() || !regAdminName.trim() || !regAdminPhone.trim()) {
      Alert.alert(
        l('Incomplete Info', 'অসম্পূর্ণ তথ্য'),
        l('Please enter somiti name, admin name and phone.', 'অনুগ্রহ করে সমিতির নাম, অ্যাডমিনের নাম ও ফোন নম্বর লিখুন।')
      );
      return;
    }
    const cleanPin = regAdminPin.trim() || '1234';
    if (REMOTE) {
      setBusy(true);
      registerSomitiRemote(regSomitiName, regAdminName, regAdminPhone, cleanPin).then((res) => {
        setBusy(false);
        if (!res.ok) {
          Alert.alert(l('Registration failed', 'নিবন্ধন ব্যর্থ'), res.error || '');
          return;
        }
        setShowRegisterModal(false);
        router.replace('/(admin)/(tabs)');
      });
      return;
    }
    registerSomiti(regSomitiName, regAdminName, regAdminPhone, cleanPin);
    setShowRegisterModal(false);
    router.replace('/(admin)/(tabs)');
  };

  const handleCallHelpline = () => {
    const num = somitiInfo.phone || '01712345678';
    Linking.openURL(`tel:${num}`);
  };

  // Convert current OTP value into an array of 6 items formatted by locale preference
  const otpDigitsArray = Array(6)
    .fill('')
    .map((_, i) => (otpValue[i] ? formatNum(otpValue[i]) : ''));

  const formatTimer = () => {
    const mins = Math.floor(timerSeconds / 60);
    const secs = timerSeconds % 60;
    return `${formatNum(mins)}:${secs < 10 ? formatNum('0') : ''}${formatNum(secs)}`;
  };

  // Dynamic logo initial letter (first letter of somiti name)
  const somitiInitial = isBengali
    ? ((somitiInfo.name && somitiInfo.name.trim().length > 0) ? somitiInfo.name.trim().charAt(0) : 'আ')
    : ((somitiInfo.nameEn && somitiInfo.nameEn.trim().length > 0) ? somitiInfo.nameEn.trim().charAt(0) : 'A');

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top Language Switcher (Dev-only) */}
        {__DEV__ && (
          <View style={styles.topBar}>
            <LanguageToggle />
          </View>
        )}

        {/* Brand Header */}
        <View style={styles.header}>
          <View style={styles.logoTile}>
            <Text style={styles.logoText}>{somitiInitial}</Text>
          </View>
          <Text style={styles.brandTitle}>
            {l(somitiInfo.nameEn || 'Amanot Samity', somitiInfo.name || 'আমানত সমিতি')}
          </Text>
          <Text style={styles.brandSubtitle}>
            {l('Justice in Accounts, Security in Amanat', somitiInfo.tagline || 'সমিতির সব হিসাব, এক জায়গায়')}
          </Text>
        </View>

        {/* Card 1: লগইন করুন (মোবাইল নম্বর) */}
        <Card style={styles.card}>
          <Text style={styles.cardHeader}>{l('Login', 'লগইন করুন')}</Text>
          <Text style={styles.inputLabel}>{l('Mobile Number', 'মোবাইল নম্বর')}</Text>

          <View style={styles.phoneInputContainer}>
            <Text style={styles.countryCode}>
              {isBengali || useBengaliDigits ? '+৮৮০' : '+880'}
            </Text>
            <TextInput
              style={styles.phoneInput}
              value={formatPhoneDisplay(phoneDigits)}
              onChangeText={handlePhoneChange}
              keyboardType="phone-pad"
              placeholder={(isBengali || useBengaliDigits) ? '১৭১২ ৩৪৫৬৭৮' : '1712 345678'}
              placeholderTextColor={colors.textSecondary}
              maxLength={12}
            />
          </View>

          <Button
            loading={busy}
            title={REMOTE ? l('Continue', 'এগিয়ে যান') : otpSent ? l('Resend OTP', 'ওটিপি পুনরায় পাঠান') : l('Send OTP', 'ওটিপি পাঠান')}
            variant={isPhoneValid ? 'primary' : 'mint'}
            onPress={handleSendOtp}
            disabled={!isPhoneValid}
            style={styles.otpSendButton}
          />
        </Card>

        {/* Card 2: যাচাই কোড লিখুন (ওটিপি ইনপুট) - Appears only after Send OTP */}
        {otpSent && (
          <Card style={styles.card}>
            <Text style={styles.cardHeader}>{l('Enter Verification Code', 'যাচাই কোড লিখুন')}</Text>
            <Text style={styles.otpSubText}>
              {l(
                `6-digit code sent to +880 ${formatPhoneDisplay(phoneDigits)}`,
                `+৮৮০ ${formatPhoneDisplay(phoneDigits)} নম্বরে ৬ সংখ্যার কোড পাঠানো হয়েছে`
              )}
            </Text>

            {/* Hidden Input for Real Keyboard Capture */}
            <TextInput
              ref={hiddenOtpInputRef}
              value={otpValue}
              onChangeText={(val) => {
                const clean = toEnglishDigits(val.replace(/\D/g, '')).slice(0, 6);
                setOtpValue(clean);
                if (clean.length === 6) {
                  setTimeout(() => {
                    verifyOtp(clean);
                    router.replace('/(auth)/pin');
                  }, 250);
                }
              }}
              keyboardType="number-pad"
              maxLength={6}
              style={styles.hiddenInput}
              caretHidden
            />

            {/* 6 Digit Display Boxes */}
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => hiddenOtpInputRef.current?.focus()}
              style={styles.otpBoxRow}
            >
              {otpDigitsArray.map((digit, index) => {
                const isActive = index === Math.min(otpValue.length, 5);
                return (
                  <View
                    key={index}
                    style={[
                      styles.otpBox,
                      isActive && styles.otpBoxActive,
                      digit !== '' && styles.otpBoxFilled,
                    ]}
                  >
                    <Text style={styles.otpDigit}>{digit}</Text>
                  </View>
                );
              })}
            </TouchableOpacity>

            {/* Timer or Resend Button */}
            {canResend ? (
              <TouchableOpacity
                onPress={handleSendOtp}
                style={styles.resendButton}
              >
                <Text style={styles.resendText}>{l('Resend OTP', 'ওটিপি পুনরায় পাঠান')}</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.timerText}>
                {l(
                  `Resend code in ${formatTimer()}`,
                  `আবার পাঠাতে পারবেন ${formatTimer()} পরে`
                )}
              </Text>
            )}

            {/* Demo Hint (Dev-only) */}
            {__DEV__ && (
              <View style={styles.demoHintBox}>
                <Text style={styles.demoHintText}>
                  {l(
                    '💡 Demo OTP: 482700 (or any 6 digits)',
                    '💡 ডেমো ওটিপি কোড: ৪৮২৭০০ (বা যেকোনো ৬ ডিজিট)'
                  )}
                </Text>
              </View>
            )}

            <Button
              title={l('Verify Code', 'যাচাই করুন')}
              variant="primary"
              loading={isVerifying}
              onPress={handleVerifyOtp}
              style={styles.verifyButton}
            />
          </Card>
        )}

        {/* 1-Tap Testing Switcher (Dev-only, clean non-overflowing vertical layout) */}
        {__DEV__ && !REMOTE && (
          <View style={styles.demoSection}>
            <Text style={styles.demoSectionTitle}>
              {l('⚡ Instant Testing Switcher (Dev Only)', '⚡ টেস্ট ড্রাইভ (১-ক্লিক প্রবেশ)')}
            </Text>
            <View style={styles.demoButtonsColumn}>
              <TouchableOpacity
                style={styles.demoCard}
                onPress={() => {
                  loginAs('1', 'admin');
                  router.replace('/(admin)/(tabs)');
                }}
              >
                <View style={styles.demoIconCircle}>
                  <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
                </View>
                <View style={styles.demoCardTextContainer}>
                  <Text style={styles.demoRoleTitle}>{l('Super Admin View', 'সুপার অ্যাডমিন ভিউ')}</Text>
                  <Text style={styles.demoRoleSub}>{l('Anwar Hossain (President)', 'আনোয়ার হোসেন (সভাপতি)')}</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color={colors.primary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.demoCard}
                onPress={() => {
                  loginAs('2', 'member');
                  router.replace('/(member)');
                }}
              >
                <View style={styles.demoIconCircle}>
                  <Ionicons name="person" size={16} color={colors.primary} />
                </View>
                <View style={styles.demoCardTextContainer}>
                  <Text style={styles.demoRoleTitle}>{l('General Member View', 'সাধারণ সদস্য ভিউ')}</Text>
                  <Text style={styles.demoRoleSub}>{l('Karim Uddin (ID: SM-042)', 'করিম উদ্দিন (আইডি: SM-042)')}</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Super Admin Registration Link (Dev-only / Initial Setup) */}
        {__DEV__ && (
          <TouchableOpacity
            onPress={() => setShowRegisterModal(true)}
            style={styles.superAdminRegLink}
          >
            <Ionicons name="shield-checkmark-outline" size={15} color={colors.primary} />
            <Text style={styles.superAdminRegText}>
              {l('First Time? Register New Somiti as Admin', 'নতুন সমিতি? সুপার অ্যাডমিন হিসেবে নিবন্ধন করুন')}
            </Text>
          </TouchableOpacity>
        )}

        {/* Bottom Helper Note */}
        <Text style={styles.footerNote}>
          {l(
            'Only members registered with the society can log in. If having trouble, contact the secretary.',
            'শুধু সমিতিতে নিবন্ধিত নম্বর দিয়ে লগইন করা যাবে। সমস্যা হলে সম্পাদকের সাথে যোগাযোগ করুন।'
          )}
        </Text>
      </ScrollView>

      {/* Unregistered Phone Modal */}
      <AppModal
        visible={showUnregisteredModal}
        onClose={() => setShowUnregisteredModal(false)}
      >
        <View style={styles.unregModalHeader}>
          <View style={styles.unregIconCircle}>
            <Ionicons name="information-circle" size={32} color={colors.warning} />
          </View>
          <Text style={styles.unregTitle}>{l('Number Not Registered', 'নম্বরটি নিবন্ধিত নয়')}</Text>
          <Text style={styles.unregDesc}>
            {l(
              'General members cannot self-register. Please contact the society committee to be added as a member.',
              'সাধারণ সদস্যদের জন্য অ্যাপে উন্মুক্ত স্ব-নিবন্ধন নেই। সমিতি আপনাকে সদস্য হিসেবে যুক্ত করলে আপনি লগইন করতে পারবেন।'
            )}
          </Text>
        </View>

        <View style={styles.unregActionButtons}>
          <TouchableOpacity
            style={styles.helplineButton}
            onPress={() => {
              setShowUnregisteredModal(false);
              handleCallHelpline();
            }}
          >
            <Ionicons name="call" size={18} color={colors.surface} />
            <Text style={styles.helplineButtonText}>{l('Call Somiti Helpline', 'সমিতির হেল্পলাইনে কল করুন')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.modalCloseBtn}
            onPress={() => setShowUnregisteredModal(false)}
          >
            <Text style={styles.modalCloseText}>{l('Close', 'বন্ধ করুন')}</Text>
          </TouchableOpacity>
        </View>
      </AppModal>

      {/* Super Admin Setup Modal */}
      <AppModal
        visible={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
      >
        <View style={styles.regModalHeader}>
          <Text style={styles.regModalTitle}>
            {l('Super Admin Registration', 'সুপার অ্যাডমিন নিবন্ধন')}
          </Text>
          <TouchableOpacity onPress={() => setShowRegisterModal(false)}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.modalInputLabel}>{l('Somiti Name *', 'সমিতির নাম *')}</Text>
          <TextInput
            style={styles.modalInput}
            value={regSomitiName}
            onChangeText={setRegSomitiName}
            placeholder={l('e.g. Amanot Somiti', 'যেমন: আমানত সমবায় সমিতি')}
            placeholderTextColor={colors.textSecondary}
          />

          <Text style={styles.modalInputLabel}>{l('Admin Name *', 'আপনার নাম *')}</Text>
          <TextInput
            style={styles.modalInput}
            value={regAdminName}
            onChangeText={setRegAdminName}
            placeholder={l('e.g. Anwar Hossain', 'যেমন: মোঃ আনোয়ার হোসেন')}
            placeholderTextColor={colors.textSecondary}
          />

          <Text style={styles.modalInputLabel}>{l('Mobile Number *', 'মোবাইল নম্বর *')}</Text>
          <TextInput
            style={styles.modalInput}
            value={regAdminPhone}
            onChangeText={(t) => setRegAdminPhone(toEnglishDigits(t))}
            keyboardType="phone-pad"
            placeholder="01712345678"
            placeholderTextColor={colors.textSecondary}
          />

          <Text style={styles.modalInputLabel}>{l('4-Digit PIN *', '৪ সংখ্যার পিন *')}</Text>
          <TextInput
            style={styles.modalInput}
            value={regAdminPin}
            onChangeText={(t) => setRegAdminPin(toEnglishDigits(t).slice(0, 4))}
            keyboardType="number-pad"
            maxLength={4}
            secureTextEntry
            placeholder="1234"
            placeholderTextColor={colors.textSecondary}
          />

          <Button
            title={l('Create Somiti & Login', 'সমিতি তৈরি করুন ও লগইন')}
            variant="primary"
            onPress={handleRegisterSomitiSubmit}
            loading={busy}
            style={{ marginTop: 16 }}
          />
        </ScrollView>
      </AppModal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    alignItems: 'center',
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  header: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 24,
  },
  logoTile: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  logoText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: typography.size.logo,
    lineHeight: typography.lineHeight.logo,
    fontWeight: '700',
    color: colors.surface,
    includeFontPadding: false,
  },
  brandTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: typography.size.otp,
    lineHeight: typography.lineHeight.otp,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  brandSubtitle: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    padding: 20,
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  cardHeader: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: typography.size.title,
    lineHeight: typography.lineHeight.title,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  inputLabel: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    marginBottom: 16,
    height: 52,
  },
  countryCode: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    fontWeight: '600',
    color: colors.text,
    marginRight: 10,
  },
  phoneInput: {
    flex: 1,
    fontFamily: 'HindSiliguri-Regular',
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.text,
    height: '100%',
  },
  otpSendButton: {
    width: '100%',
  },
  otpSubText: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.textSecondary,
    marginBottom: 18,
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  otpBoxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  otpBox: {
    width: 44,
    height: 52,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  otpBoxActive: {
    borderColor: colors.primary,
  },
  otpBoxFilled: {
    borderColor: colors.primary,
  },
  otpDigit: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: typography.size.otp,
    lineHeight: typography.lineHeight.otp,
    fontWeight: '700',
    color: colors.text,
  },
  timerText: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  resendButton: {
    alignSelf: 'center',
    marginBottom: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  resendText: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    fontWeight: '600',
    color: colors.primary,
  },
  demoHintBox: {
    backgroundColor: colors.primarySoft,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 14,
    alignItems: 'center',
  },
  demoHintText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    fontWeight: '600',
    color: colors.primary,
  },
  verifyButton: {
    width: '100%',
  },
  footerNote: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 12,
  },
  demoSection: {
    width: '100%',
    marginTop: 12,
    marginBottom: 12,
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  demoSectionTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 10,
    textAlign: 'center',
  },
  demoButtonsColumn: {
    flexDirection: 'column',
    gap: 8,
  },
  demoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 10,
  },
  demoIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoCardTextContainer: {
    flex: 1,
  },
  demoRoleTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    fontWeight: '700',
    color: colors.text,
  },
  demoRoleSub: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: typography.size.tiny,
    lineHeight: typography.lineHeight.tiny,
    color: colors.textSecondary,
  },
  superAdminRegLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  superAdminRegText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    fontWeight: '600',
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  unregModalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  unregIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.warningSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  unregTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: typography.size.title,
    lineHeight: typography.lineHeight.title,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  unregDesc: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  unregActionButtons: {
    gap: 10,
    marginTop: 8,
  },
  helplineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 9999,
    gap: 8,
  },
  helplineButtonText: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    fontWeight: '600',
    color: colors.surface,
  },
  modalCloseBtn: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  modalCloseText: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.textSecondary,
  },
  regModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  regModalTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: typography.size.title,
    lineHeight: typography.lineHeight.title,
    fontWeight: '700',
    color: colors.text,
  },
  modalInputLabel: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    fontWeight: '600',
    color: colors.text,
    marginTop: 8,
    marginBottom: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: 'HindSiliguri-Regular',
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    color: colors.text,
    backgroundColor: colors.surface,
  },
});
