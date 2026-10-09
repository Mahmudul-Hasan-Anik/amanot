import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/features/auth/authStore';
import { useLanguage } from '../../src/i18n/useLanguage';
import { safeBack } from '../../src/utils/navigation';
import { toEnglishDigits } from '../../src/lib/bengali';
import { useSomitiStore } from '../../src/store/somitiStore';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';

export default function MemberProfileScreen() {
  const router = useRouter();
  const { currentUser, setCustomPin, switchRole, logout, actualRole } = useAuthStore();
  const { members } = useSomitiStore();
  const { l, formatMoney, isBengali } = useLanguage();

  const [showPinModal, setShowPinModal] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinToast, setPinToast] = useState<string | null>(null);
  const [savingPin, setSavingPin] = useState(false);

  const liveMember = members.find((m) => m.id === currentUser?.id);
  const member: any = liveMember || currentUser || {
    id: 'm1',
    code: 'SM-001',
    name: isBengali ? 'আনোয়ার হোসেন' : 'Anwar Hossain',
    phone: '01711000001',
    address: isBengali ? 'উত্তরা, ঢাকা' : 'Uttara, Dhaka',
    nomineeName: isBengali ? 'মোসাঃ রোকেয়া বেগম' : 'Rokeya Begum',
    nomineeRelation: isBengali ? 'স্ত্রী' : 'Wife',
    nomineePhone: '01711000009',
    joinDate: isBengali ? '১ জানুয়ারি ২০২২' : '1 January 2022',
    monthlyAmount: 2000,
    totalDeposit: 144000,
  };

  const handleChangePin = async () => {
    if (savingPin) return;
    const cleanNew = toEnglishDigits(newPin).replace(/\D/g, '');
    const cleanConfirm = toEnglishDigits(confirmPin).replace(/\D/g, '');

    if (cleanNew.length !== 4) {
      Alert.alert(
        l('Invalid PIN', 'ভুল পিন'),
        l('PIN must be exactly 4 digits.', 'পিন অবশ্যই ৪ সংখ্যার হতে হবে।')
      );
      return;
    }

    if (cleanNew !== cleanConfirm) {
      Alert.alert(
        l('PIN Mismatch', 'পিন মেলেনি'),
        l('Both PIN fields must match.', 'উভয় পিন এক হতে হবে।')
      );
      return;
    }

    setSavingPin(true);
    try {
    await setCustomPin(cleanNew);
    setShowPinModal(false);
    setNewPin('');
    setConfirmPin('');
    setPinToast(l('PIN changed successfully!', 'পিন সফলভাবে পরিবর্তিত হয়েছে!'));
    setTimeout(() => setPinToast(null), 3000);
    } catch (e: any) {
      Alert.alert(l('PIN change failed', 'পিন পরিবর্তন ব্যর্থ'), e.message);
    } finally { setSavingPin(false); }
  };

  const handleLogout = () => {
    logout();
    router.replace('/(auth)/login');
  };

  const avatarInitial = member.name.trim().charAt(0) || (isBengali ? 'আ' : 'A');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      {/* Screen Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => safeBack(router, '/(member)')}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{l('My Profile', 'আমার প্রোফাইল')}</Text>
        <View style={styles.backBtn} />
      </View>

      {/* Toast Notification */}
      {pinToast && (
        <View style={styles.toast}>
          <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
          <Text style={styles.toastText}>{pinToast}</Text>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Avatar Card */}
        <View style={styles.profileAvatarCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarLetter}>{avatarInitial}</Text>
          </View>
          <Text style={styles.profileName}>{member.name}</Text>
          <Text style={styles.profileCode}>
            {l('Member ID: ', 'সদস্য কোড: ')}{member.code}
          </Text>
          <View style={styles.memberTagBadge}>
            <Text style={styles.memberTagBadgeText}>
              {l('General Member', 'সাধারণ সদস্য')}
            </Text>
          </View>
        </View>

        {/* Section 1: Personal Information */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>{l('Personal Information', 'ব্যক্তিগত তথ্য')}</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{l('Mobile Number', 'মোবাইল নম্বর')}</Text>
            <Text style={styles.infoVal}>{member.phone}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{l('Address', 'ঠিকানা')}</Text>
            <Text style={styles.infoVal}>
              {member.address || (isBengali ? 'উত্তরা, ঢাকা' : 'Uttara, Dhaka')}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{l('Join Date', 'ভর্তির তারিখ')}</Text>
            <Text style={styles.infoVal}>
              {member.joinDate || (isBengali ? '১ জানুয়ারি ২০২২' : '1 January 2022')}
            </Text>
          </View>

          <View style={[styles.infoRow, styles.infoRowLast]}>
            <Text style={styles.infoLabel}>{l('Monthly Rate', 'মাসিক জমার হার')}</Text>
            <Text style={styles.infoValPrimary}>
              {formatMoney(member.monthlyAmount || 2000)}
            </Text>
          </View>
        </View>

        {/* Section 2: Nominee Information */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>{l('Nominee Information', 'নমিনীর তথ্য')}</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{l('Nominee Name', 'নমিনীর নাম')}</Text>
            <Text style={styles.infoVal}>
              {member.nomineeName || (isBengali ? 'মোসাঃ রোকেয়া বেগম' : 'Rokeya Begum')}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{l('Relation', 'সম্পর্ক')}</Text>
            <Text style={styles.infoVal}>
              {member.nomineeRelation || (isBengali ? 'স্ত্রী' : 'Wife')}
            </Text>
          </View>

          <View style={[styles.infoRow, styles.infoRowLast]}>
            <Text style={styles.infoLabel}>{l('Nominee Contact', 'নমিনীর মোবাইল')}</Text>
            <Text style={styles.infoVal}>{member.nomineePhone || member.phone}</Text>
          </View>
        </View>

        {/* Section 3: Security & PIN */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>{l('Security & PIN', 'নিরাপত্তা ও পিন')}</Text>
          <TouchableOpacity
            style={styles.actionBtnRow}
            onPress={() => setShowPinModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.actionBtnLeft}>
              <View style={styles.iconBox}>
                <Ionicons name="key-outline" size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.actionBtnTitle}>
                  {l('Change 4-Digit PIN', '৪ ডিজিটের পিন পরিবর্তন')}
                </Text>
                <Text style={styles.actionBtnSub}>
                  {l('Update your login secret PIN', 'আপনার গোপন লগইন পিন বদলান')}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Committee Role Switcher */}
        {actualRole !== 'member' && (
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>
              {l('Role Switcher', 'টেস্টিং ও রোল পরিবর্তন')}
            </Text>
            <TouchableOpacity
              style={styles.roleSwitchCard}
              onPress={() => {
                switchRole('admin');
                router.replace('/(admin)/(tabs)');
              }}
              activeOpacity={0.7}
            >
              <View style={styles.actionBtnLeft}>
                <View style={styles.iconBox}>
                  <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.roleSwitchTitle}>
                    {l('Switch to Admin View', 'অ্যাডমিন ড্যাশবোর্ডে প্রবেশ')}
                  </Text>
                  <Text style={styles.actionBtnSub}>
                    {l('Inspect all management & finance screens', 'সকল প্রশাসনিক ও ফান্ড ফিচার দেখুন')}
                  </Text>
                </View>
              </View>
              <Ionicons name="arrow-forward" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.warning} />
          <Text style={styles.logoutBtnText}>{l('Log Out', 'লগআউট করুন')}</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Change PIN Modal */}
      {showPinModal && (
        <View style={styles.webModalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowPinModal(false)}
          />
          <View style={styles.pinModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{l('Change PIN', 'পিন পরিবর্তন করুন')}</Text>
              <TouchableOpacity onPress={() => setShowPinModal(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>{l('New 4-Digit PIN', 'নতুন ৪ সংখ্যার পিন')}</Text>
            <TextInput
              style={styles.pinInput}
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry
              value={newPin}
              onChangeText={setNewPin}
              placeholder="••••"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={[styles.inputLabel, { marginTop: 12 }]}>
              {l('Confirm New PIN', 'নতুন পিন পুনরায় লিখুন')}
            </Text>
            <TextInput
              style={styles.pinInput}
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry
              value={confirmPin}
              onChangeText={setConfirmPin}
              placeholder="••••"
              placeholderTextColor={colors.textSecondary}
            />

            <TouchableOpacity
              style={styles.savePinBtn}
              onPress={handleChangePin}
              activeOpacity={0.85}
            >
              <Text style={styles.savePinBtnText}>
                {l('Save New PIN', 'নতুন পিন সংরক্ষণ করুন')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.title,
    lineHeight: typography.lineHeight.title,
    color: colors.text,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  toastText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.caption,
    color: colors.primary,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  profileAvatarCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.avatarPastels[0].bg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarLetter: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xxl,
    lineHeight: typography.lineHeight.xxl,
    color: colors.avatarPastels[0].text,
  },
  profileName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.title,
    lineHeight: typography.lineHeight.title,
    color: colors.text,
  },
  profileCode: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  memberTagBadge: {
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 8,
  },
  memberTagBadgeText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xs,
    color: colors.primary,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
  },
  cardTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    color: colors.text,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceMuted,
  },
  infoRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 2,
  },
  infoLabel: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  infoVal: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  infoValPrimary: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.sm,
    color: colors.primary,
  },
  actionBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  actionBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnTitle: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  actionBtnSub: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  roleSwitchCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  roleSwitchTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.sm,
    color: colors.primary,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  logoutBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.subhead,
    color: colors.warning,
  },
  webModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pinModalCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.base,
    color: colors.text,
  },
  inputLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.caption,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  pinInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.title,
    color: colors.text,
    letterSpacing: 6,
    textAlign: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  savePinBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 18,
  },
  savePinBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.subhead,
    color: colors.surface,
  },
  bottomSpacer: {
    height: 40,
  },
});
