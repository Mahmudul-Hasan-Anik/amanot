import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../src/theme/colors';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { useAuthStore } from '../../src/features/auth/authStore';

export default function LoginScreen() {
  const router = useRouter();
  const { setPhone, verifyOtp } = useAuthStore();
  const [phoneNumber, setPhoneNumber] = useState('০১৭১২-৩৪৫৬৭৮');
  const [otpSent, setOtpSent] = useState(true);
  const [otpDigits, setOtpDigits] = useState(['৪', '৮', '২', '৭', '', '']);
  const [timerText, setTimerText] = useState('০:৪২');

  const handleSendOtp = () => {
    setOtpSent(true);
    setPhone('+৮৮০ ' + phoneNumber);
  };

  const handleVerifyOtp = () => {
    verifyOtp(otpDigits.join(''));
    router.replace('/(auth)/pin');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Header */}
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>স</Text>
          </View>
          <Text style={styles.brandTitle}>[সমিতির নাম]</Text>
          <Text style={styles.brandSubtitle}>সমিতির সব হিসাব, এক জায়গায়</Text>
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
            title="ওটিপি পাঠান"
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

            {/* 6 Digit Input Boxes */}
            <View style={styles.otpBoxRow}>
              {otpDigits.map((digit, index) => (
                <View
                  key={index}
                  style={[
                    styles.otpBox,
                    index === 4 && styles.otpBoxActive, // Current cursor box
                  ]}
                >
                  <Text style={styles.otpDigit}>{digit}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.timerText}>
              আবার পাঠাতে পারবেন {timerText} পরে
            </Text>

            <Button
              title="যাচাই করুন"
              variant="primary"
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
    fontSize: 22,
    fontWeight: '700',
    color: colors.textMain,
    marginBottom: 4,
  },
  brandSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  card: {
    width: '100%',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  cardHeader: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textMain,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    backgroundColor: '#FFFFFF',
    marginBottom: 14,
  },
  countryCode: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMain,
    marginRight: 8,
  },
  phoneInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textMain,
  },
  otpSendButton: {
    width: '100%',
  },
  otpSubText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 18,
    lineHeight: 18,
  },
  otpBoxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 14,
  },
  otpBox: {
    width: 44,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpBoxActive: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  otpDigit: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textMain,
  },
  timerText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  verifyButton: {
    width: '100%',
  },
  footerNote: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 10,
    paddingHorizontal: 16,
  },
});
