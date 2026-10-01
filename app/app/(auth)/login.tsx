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
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../src/theme/colors';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { useAuthStore } from '../../src/features/auth/authStore';
import { toBengaliDigits, toEnglishDigits } from '../../src/lib/bengali';

export default function LoginScreen() {
  const router = useRouter();
  const { requestOtp, verifyOtp, setPhone } = useAuthStore();

  const [phoneNumber, setPhoneNumber] = useState('০১৭১২-৩৪৫৬৭৮');
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const hiddenOtpInputRef = useRef<TextInput>(null);

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
      Alert.alert('ভুল নম্বর', 'অনুগ্রহ করে সঠিক ১১ ডিজিটের মোবাইল নম্বর লিখুন।');
      return;
    }

    const otp = requestOtp(phoneNumber);
    setPhone('+৮৮০ ' + phoneNumber);
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
      Alert.alert('অসম্পূর্ণ ওটিপি', 'অনুগ্রহ করে ৬ সংখ্যার ওটিপি কোডটি লিখুন।');
      return;
    }

    setIsVerifying(true);
    const success = verifyOtp(otpValue);
    setIsVerifying(false);

    if (success) {
      router.replace('/(auth)/pin');
    } else {
      Alert.alert('ভুল কোড', 'ওটিপি কোডটি সঠিক নয়। ডেমো ওটিপি: ৪৮২৭০০');
    }
  };

  // Convert current OTP value into an array of 6 items
  const otpDigitsArray = Array(6)
    .fill('')
    .map((_, i) => (otpValue[i] ? toBengaliDigits(otpValue[i]) : ''));

  const formatTimer = () => {
    const mins = Math.floor(timerSeconds / 60);
    const secs = timerSeconds % 60;
    return `${toBengaliDigits(mins)}:${secs < 10 ? '০' : ''}${toBengaliDigits(secs)}`;
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
        {/* Brand Header */}
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>আ</Text>
          </View>
          <Text style={styles.brandTitle}>আমানত সমিতি</Text>
          <Text style={styles.brandSubtitle}>হিসাবে ইনসাফ, আমানতে সুরক্ষা</Text>
        </View>

        {/* Card 1: লগইন করুন (মোবাইল নম্বর) */}
        <Card style={styles.card}>
          <Text style={styles.cardHeader}>লগইন করুন</Text>
          <Text style={styles.inputLabel}>মোবাইল নম্বর</Text>

          <View style={styles.phoneInputContainer}>
            <Text style={styles.countryCode}>+৮৮০</Text>
            <TextInput
              style={styles.phoneInput}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              placeholder="০১৭১২ ৩৪৫৬৭৮"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <Button
            title={otpSent ? 'ওটিপি পুনরায় পাঠান' : 'ওটিপি পাঠান'}
            variant="secondary"
            onPress={handleSendOtp}
            style={styles.otpSendButton}
          />
        </Card>

        {/* Card 2: যাচাই কোড লিখুন (ওটিপি ইনপুট) */}
        {otpSent && (
          <Card style={styles.card}>
            <Text style={styles.cardHeader}>যাচাই কোড লিখুন</Text>
            <Text style={styles.otpSubText}>
              +৮৮০ {phoneNumber} নম্বরে ৬ সংখ্যার কোড পাঠানো হয়েছে
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
              <Text style={styles.demoHintText}>💡 ডেমো ওটিপি কোড: ৪৮২৭০০ (বা যেকোনো ৬ ডিজিট)</Text>
            </View>

            {/* Timer or Resend Button */}
            {canResend ? (
              <TouchableOpacity
                onPress={handleSendOtp}
                style={styles.resendButton}
              >
                <Text style={styles.resendText}>ওটিপি পুনরায় পাঠান</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.timerText}>
                আবার পাঠাতে পারবেন {formatTimer()} পরে
              </Text>
            )}

            <Button
              title="যাচাই করুন"
              variant="primary"
              loading={isVerifying}
              onPress={handleVerifyOtp}
              style={styles.verifyButton}
            />
          </Card>
        )}

        {/* Bottom Helper Note */}
        <Text style={styles.footerNote}>
          শুধু সমিতিতে নিবন্ধিত নম্বর দিয়ে লগইন করা যাবে। সমস্যা হলে সম্পাদকের সাথে যোগাযোগ করুন।
        </Text>
      </ScrollView>
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
});
