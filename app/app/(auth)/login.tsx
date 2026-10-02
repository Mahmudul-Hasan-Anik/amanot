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
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { AppModal } from '../../src/components/AppModal';
import { useAuthStore } from '../../src/features/auth/authStore';
import { useSomitiStore } from '../../src/store/somitiStore';
import { toBengaliDigits, toEnglishDigits } from '../../src/lib/bengali';
import { useLanguage } from '../../src/i18n/useLanguage';
import { LanguageToggle } from '../../src/components/LanguageToggle';

export default function LoginScreen() {
  const router = useRouter();
  const { requestOtp, verifyOtp, setPhone, checkPhoneRegistration, loginAs, registerSomiti } = useAuthStore();
  const { members, somitiInfo } = useSomitiStore();
  const { l, formatNum } = useLanguage();

  const [phoneNumber, setPhoneNumber] = useState('01712-345678');
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(60);
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
    const rawDigits = toEnglishDigits(phoneNumber.replace(/\D/g, ''));
    if (rawDigits.length < 10) {
      Alert.alert(
        l('Invalid Number', 'ভুল নম্বর'),
        l('Please enter a valid 11-digit mobile number.', 'অনুগ্রহ করে সঠিক ১১ ডিজিটের মোবাইল নম্বর লিখুন।')
      );
      return;
    }

    // Step 1: Check phone registration in Somiti membership pool
    const check = checkPhoneRegistration(phoneNumber, members);
    if (!check.found) {
      setShowUnregisteredModal(true);
      return;
    }

    const otp = requestOtp(phoneNumber);
    setPhone('+880 ' + phoneNumber);
    setOtpSent(true);
    setTimerSeconds(60);
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
    registerSomiti(regSomitiName, regAdminName, regAdminPhone, cleanPin);
    setShowRegisterModal(false);
    router.replace('/(admin)/(tabs)');
  };

  const handleCallHelpline = () => {
    const num = somitiInfo.phone || '01711223344';
    Linking.openURL(`tel:${num}`);
  };

  // Convert current OTP value into an array of 6 items formatted by user preference
  const otpDigitsArray = Array(6)
    .fill('')
    .map((_, i) => (otpValue[i] ? formatNum(otpValue[i]) : ''));

  const formatTimer = () => {
    const mins = Math.floor(timerSeconds / 60);
    const secs = timerSeconds % 60;
    return `${formatNum(mins)}:${secs < 10 ? formatNum('0') : ''}${formatNum(secs)}`;
  };

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
        {/* Top Language Switcher */}
        <View style={styles.topBar}>
          <LanguageToggle />
        </View>

        {/* Brand Header */}
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>{l('A', 'আ')}</Text>
          </View>
          <Text style={styles.brandTitle}>{l('Amanot Samity', 'আমানত সমিতি')}</Text>
          <Text style={styles.brandSubtitle}>
            {l('Justice in Accounts, Security in Amanat', 'হিসাবে ইনসাফ, আমানতে সুরক্ষা')}
          </Text>
        </View>

        {/* Card 1: লগইন করুন (মোবাইল নম্বর) */}
        <Card style={styles.card}>
          <Text style={styles.cardHeader}>{l('Login', 'লগইন করুন')}</Text>
          <Text style={styles.inputLabel}>{l('Mobile Number', 'মোবাইল নম্বর')}</Text>

          <View style={styles.phoneInputContainer}>
            <Text style={styles.countryCode}>+880</Text>
            <TextInput
              style={styles.phoneInput}
              value={phoneNumber}
              onChangeText={(text) => setPhoneNumber(toEnglishDigits(text))}
              keyboardType="phone-pad"
              placeholder="01712 345678"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <Button
            title={otpSent ? l('Resend OTP', 'ওটিপি পুনরায় পাঠান') : l('Send OTP', 'ওটিপি পাঠান')}
            variant="secondary"
            onPress={handleSendOtp}
            style={styles.otpSendButton}
          />
        </Card>

        {/* Card 2: যাচাই কোড লিখুন (ওটিপি ইনপুট) */}
        {otpSent && (
          <Card style={styles.card}>
            <Text style={styles.cardHeader}>{l('Enter Verification Code', 'যাচাই কোড লিখুন')}</Text>
            <Text style={styles.otpSubText}>
              {l(
                `6-digit code sent to +880 ${phoneNumber}`,
                `+৮৮০ ${phoneNumber} নম্বরে ৬ সংখ্যার কোড পাঠানো হয়েছে`
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
                  // Auto verify on 6 digits
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

            {/* Demo Hint */}
            <View style={styles.demoHintBox}>
              <Text style={styles.demoHintText}>
                {l(
                  '💡 Demo OTP: 482700 (or any 6 digits)',
                  '💡 ডেমো ওটিপি কোড: ৪৮২৭০০ (বা যেকোনো ৬ ডিজিট)'
                )}
              </Text>
            </View>

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
                  `Resend code in ${timerSeconds}s`,
                  `আবার পাঠাতে পারবেন ${formatTimer()} পরে`
                )}
              </Text>
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

        {/* 1-Tap Demo Switcher Section */}
        <View style={styles.demoSection}>
          <Text style={styles.demoSectionTitle}>
            {l('⚡ Instant Testing Switcher (1-Tap)', '⚡ টেস্ট ড্রাইভ / ১-ক্লিকে প্রবেশ')}
          </Text>
          <View style={styles.demoButtonsRow}>
            <TouchableOpacity
              style={styles.demoAdminCard}
              onPress={() => {
                loginAs('1', 'admin');
                router.replace('/(admin)/(tabs)');
              }}
            >
              <Text style={styles.demoAdminIcon}>👑</Text>
              <View>
                <Text style={styles.demoRoleTitle}>{l('Super Admin View', 'অ্যাডমিন ভিউ')}</Text>
                <Text style={styles.demoRoleSub}>{l('Anwar Hossain (President)', 'আনোয়ার হোসেন (সভাপতি)')}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.demoMemberCard}
              onPress={() => {
                loginAs('2', 'member');
                router.replace('/(member)');
              }}
            >
              <Text style={styles.demoMemberIcon}>👤</Text>
              <View>
                <Text style={styles.demoRoleTitle}>{l('General Member View', 'সাধারণ সদস্য ভিউ')}</Text>
                <Text style={styles.demoRoleSub}>{l('Karim Uddin (ID: M-002)', 'করিম উদ্দিন (আইডি: M-002)')}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Super Admin Registration Link */}
        <TouchableOpacity
          onPress={() => setShowRegisterModal(true)}
          style={styles.superAdminRegLink}
        >
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} />
          <Text style={styles.superAdminRegText}>
            {l('First Time? Register New Somiti as Admin', 'নতুন সমিতি? সুপার অ্যাডমিন হিসেবে নিবন্ধন করুন')}
          </Text>
        </TouchableOpacity>

        {/* Bottom Helper Note */}
        <Text style={styles.footerNote}>
          {l(
            'Only members registered with the society can log in. Members cannot register themselves.',
            'শুধু সমিতিতে নিবন্ধিত সদস্যরাই প্রবেশ করতে পারবেন। সাধারণ সদস্য স্ব-নিবন্ধন বন্ধ রয়েছে।'
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
            <Ionicons name="information-circle" size={32} color="#D97706" />
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
            <Ionicons name="call" size={18} color="#FFFFFF" />
            <Text style={styles.helplineButtonText}>{l('Call Somiti Helpline', 'সমিতির হেল্পলাইনে কল করুন')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.openSomitiButton}
            onPress={() => {
              setShowUnregisteredModal(false);
              setRegAdminPhone(phoneNumber);
              setShowRegisterModal(true);
            }}
          >
            <Ionicons name="business-outline" size={18} color={colors.primary} />
            <Text style={styles.openSomitiButtonText}>
              {l('Register New Society (Admin)', 'আমি নতুন সমিতি খুলতে চাই (সুপার অ্যাডমিন)')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.modalCloseBtn}
            onPress={() => setShowUnregisteredModal(false)}
          >
            <Text style={styles.modalCloseText}>{l('Close', 'বন্ধ করুন')}</Text>
          </TouchableOpacity>
        </View>
      </AppModal>

      {/* Super Admin Somiti Registration Modal */}
      <AppModal
        visible={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
      >
        <View style={styles.regModalHeader}>
          <Text style={styles.regModalTitle}>
            {l('Register New Somiti', 'নতুন সমিতি নিবন্ধন')}
          </Text>
          <TouchableOpacity onPress={() => setShowRegisterModal(false)}>
            <Ionicons name="close" size={24} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <Text style={styles.modalInputLabel}>{l('Somiti Name *', 'সমিতির নাম *')}</Text>
        <TextInput
          style={styles.modalInput}
          value={regSomitiName}
          onChangeText={setRegSomitiName}
          placeholder="যেমন: ধানমন্ডি সঞ্চয় সমিতি"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.modalInputLabel}>{l('Admin / President Name *', 'সুপার অ্যাডমিন / সভাপতির নাম *')}</Text>
        <TextInput
          style={styles.modalInput}
          value={regAdminName}
          onChangeText={setRegAdminName}
          placeholder="যেমন: রফিকুল ইসলাম"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.modalInputLabel}>{l('Mobile Number *', 'মোবাইল নম্বর *')}</Text>
        <TextInput
          style={styles.modalInput}
          value={regAdminPhone}
          onChangeText={(t) => setRegAdminPhone(toEnglishDigits(t))}
          keyboardType="phone-pad"
          placeholder="01712 345678"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.modalInputLabel}>{l('Initial 4-Digit PIN (Default: 1234)', '৪ সংখ্যার পিন কোড (ডিফল্ট: 1234)')}</Text>
        <TextInput
          style={styles.modalInput}
          value={regAdminPin}
          onChangeText={(t) => setRegAdminPin(toEnglishDigits(t))}
          keyboardType="number-pad"
          maxLength={4}
          placeholder="1234"
          placeholderTextColor={colors.textMuted}
        />

        <Button
          title={l('Create Somiti & Login', 'সমিতি তৈরি ও প্রবেশ করুন')}
          variant="primary"
          onPress={handleRegisterSomitiSubmit}
          style={{ marginTop: 14 }}
        />
      </AppModal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 40,
    alignItems: 'center',
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textMain,
    marginBottom: 4,
  },
  brandSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
  },
  card: {
    width: '100%',
    padding: 20,
    marginBottom: 16,
  },
  cardHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textMain,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMain,
    marginBottom: 8,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    marginBottom: 16,
    height: 48,
  },
  countryCode: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMain,
    marginRight: 10,
  },
  phoneInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textMain,
    height: '100%',
  },
  otpSendButton: {
    width: '100%',
  },
  otpSubText: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 18,
    lineHeight: 18,
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
    marginBottom: 14,
  },
  otpBox: {
    width: 44,
    height: 50,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  otpBoxActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '20',
  },
  otpBoxFilled: {
    borderColor: colors.primary,
  },
  otpDigit: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textMain,
  },
  demoHintBox: {
    backgroundColor: colors.primaryLight,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 14,
    alignItems: 'center',
  },
  demoHintText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  timerText: {
    fontSize: 13,
    color: colors.textMuted,
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
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  verifyButton: {
    width: '100%',
  },
  footerNote: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
    paddingHorizontal: 10,
  },
  demoSection: {
    width: '100%',
    marginTop: 10,
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  demoSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMain,
    marginBottom: 12,
    textAlign: 'center',
  },
  demoButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  demoAdminCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    padding: 10,
    gap: 8,
  },
  demoMemberCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    padding: 10,
    gap: 8,
  },
  demoAdminIcon: {
    fontSize: 20,
  },
  demoMemberIcon: {
    fontSize: 20,
  },
  demoRoleTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMain,
  },
  demoRoleSub: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  superAdminRegLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  superAdminRegText: {
    fontSize: 13,
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
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  unregTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textMain,
    marginBottom: 8,
    textAlign: 'center',
  },
  unregDesc: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
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
    borderRadius: 8,
    gap: 8,
  },
  helplineButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  openSomitiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    backgroundColor: '#F8FAFC',
  },
  openSomitiButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  modalCloseBtn: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  regModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  regModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textMain,
  },
  modalInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMain,
    marginTop: 8,
    marginBottom: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.textMain,
    backgroundColor: '#F8FAFC',
  },
});
