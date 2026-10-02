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

export default function MemberProfileScreen() {
  const router = useRouter();
  const { currentUser, setCustomPin, switchRole, logout } = useAuthStore();
  const { members } = useSomitiStore();
  const { l, formatMoney } = useLanguage();

  const [showPinModal, setShowPinModal] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinToast, setPinToast] = useState<string | null>(null);

  const liveMember = members.find((m) => m.id === currentUser?.id);
  const member = liveMember || currentUser || {
    id: '2',
    code: 'SM-042',
    name: 'করিম উদ্দিন',
    phone: '01712-345678',
    address: 'বাড়ি ১৮, রোড ২, সেক্টর ১০, উত্তরা, ঢাকা',
    nomineeName: 'মরিয়ম আক্তার',
    nomineeRelation: 'স্ত্রী',
    nomineePhone: '01712-998877',
    joinDate: 'ফেব্রুয়ারি ২০২২',
    monthlyAmount: 2000,
    totalDeposit: 72000,
  };

  const handleChangePin = () => {
    const cleanNew = toEnglishDigits(newPin.replace(/\D/g, ''));
    const cleanConfirm = toEnglishDigits(confirmPin.replace(/\D/g, ''));

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

    setCustomPin(cleanNew);
    setShowPinModal(false);
    setNewPin('');
    setConfirmPin('');
    setPinToast(l('PIN changed successfully!', 'পিন সফলভাবে পরিবর্তিত হয়েছে!'));
    setTimeout(() => setPinToast(null), 3000);
  };

  const handleLogout = () => {
    logout();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F7F2" />

      {/* Screen Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => safeBack(router, '/(member)')}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{l('My Profile', 'আমার প্রোফাইল')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Toast Notification */}
      {pinToast && (
        <View style={styles.toast}>
          <Ionicons name="checkmark-circle" size={16} color="#0F766E" />
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
            <Text style={styles.avatarLetter}>{member.name.charAt(0)}</Text>
          </View>
          <Text style={styles.profileName}>{member.name}</Text>
          <Text style={styles.profileCode}>{l('Member ID: ', 'সদস্য কোড: ')}{member.code}</Text>
          <View style={styles.memberTagBadge}>
            <Text style={styles.memberTagBadgeText}>{l('General Member', 'সাধারণ সদস্য')}</Text>
          </View>
        </View>

        {/* Section: Personal Info */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>{l('Personal Information', 'ব্যক্তিগত তথ্য')}</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{l('Mobile Number', 'মোবাইল নম্বর')}</Text>
            <Text style={styles.infoVal}>{member.phone}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{l('Address', 'ঠিকানা')}</Text>
            <Text style={styles.infoVal}>{member.address || l('Uttara, Dhaka', 'উত্তরা, ঢাকা')}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{l('Join Date', 'ভর্তির তারিখ')}</Text>
            <Text style={styles.infoVal}>{member.joinDate || 'ফেব্রুয়ারি ২০২২'}</Text>
          </View>

          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoLabel}>{l('Monthly Rate', 'মাসিক জমার হার')}</Text>
            <Text style={[styles.infoValBold, { color: '#0F766E' }]}>
              {formatMoney(member.monthlyAmount || 2000)}
            </Text>
          </View>
        </View>

        {/* Section: Nominee Info */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>{l('Nominee Information', 'নমিনীর তথ্য')}</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{l('Nominee Name', 'নমিনীর নাম')}</Text>
            <Text style={styles.infoVal}>{member.nomineeName || 'মরিয়ম আক্তার'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{l('Relation', 'সম্পর্ক')}</Text>
            <Text style={styles.infoVal}>{member.nomineeRelation || 'স্ত্রী'}</Text>
          </View>

          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoLabel}>{l('Nominee Contact', 'নমিনীর মোবাইল')}</Text>
            <Text style={styles.infoVal}>{member.nomineePhone || member.phone}</Text>
          </View>
        </View>

        {/* Section: Security */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>{l('Security & PIN', 'নিরাপত্তা ও পিন')}</Text>
          <TouchableOpacity
            style={styles.actionBtnRow}
            onPress={() => setShowPinModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.actionBtnLeft}>
              <Ionicons name="key-outline" size={20} color="#0F766E" />
              <View>
                <Text style={styles.actionBtnTitle}>{l('Change 4-Digit PIN', '৪ ডিজিটের পিন পরিবর্তন')}</Text>
                <Text style={styles.actionBtnSub}>{l('Update your login secret PIN', 'আপনার গোপন লগইন পিন বদলান')}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Demo Role Switcher */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>{l('Developer / Demo Switcher', 'টেস্টিং ও রোল পরিবর্তন')}</Text>
          <TouchableOpacity
            style={[styles.actionBtnRow, { backgroundColor: '#E6F4F2', borderColor: '#CCFBF1' }]}
            onPress={() => {
              switchRole('admin');
              router.replace('/(admin)/(tabs)');
            }}
            activeOpacity={0.7}
          >
            <View style={styles.actionBtnLeft}>
              <Ionicons name="shield-checkmark" size={20} color="#0F766E" />
              <View>
                <Text style={[styles.actionBtnTitle, { color: '#0F766E' }]}>
                  {l('Switch to Admin View', 'অ্যাডমিন ড্যাশবোর্ডে প্রবেশ')}
                </Text>
                <Text style={styles.actionBtnSub}>
                  {l('Inspect all management & finance screens', 'সকল প্রশাসনিক ও ফান্ড ফিচার দেখুন')}
                </Text>
              </View>
            </View>
            <Ionicons name="arrow-forward" size={18} color="#0F766E" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color="#DC2626" />
          <Text style={styles.logoutBtnText}>{l('Log Out', 'লগআউট করুন')}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Change PIN Modal */}
      {showPinModal && (
        <View style={styles.webModalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowPinModal(false)} />
          <View style={styles.pinModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{l('Change PIN', 'পিন পরিবর্তন করুন')}</Text>
              <TouchableOpacity onPress={() => setShowPinModal(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
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
            />

            <TouchableOpacity
              style={styles.savePinBtn}
              onPress={handleChangePin}
              activeOpacity={0.85}
            >
              <Text style={styles.savePinBtnText}>{l('Save New PIN', 'নতুন পিন সংরক্ষণ করুন')}</Text>
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
    backgroundColor: '#F6F7F2',
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
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 18,
    color: '#1E293B',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CCFBF1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 6,
  },
  toastText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 12,
    color: '#0F766E',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  profileAvatarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarLetter: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 28,
    color: '#0F766E',
  },
  profileName: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 18,
    color: '#1E293B',
  },
  profileCode: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  memberTagBadge: {
    backgroundColor: '#E6F4F2',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 8,
  },
  memberTagBadgeText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 11,
    color: '#0F766E',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#1E293B',
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoLabel: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 13,
    color: '#64748B',
  },
  infoVal: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 13,
    color: '#1E293B',
  },
  infoValBold: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 13,
  },
  actionBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  actionBtnTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 13,
    color: '#1E293B',
  },
  actionBtnSub: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    paddingVertical: 12,
    gap: 8,
    marginTop: 8,
  },
  logoutBtnText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#DC2626',
  },
  webModalOverlay: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 99999,
  },
  pinModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
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
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 16,
    color: '#1E293B',
  },
  inputLabel: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 12,
    color: '#475569',
    marginBottom: 4,
  },
  pinInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 18,
    fontFamily: 'HindSiliguri-Bold',
    letterSpacing: 4,
    textAlign: 'center',
  },
  savePinBtn: {
    backgroundColor: '#0F766E',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 18,
  },
  savePinBtnText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
});
