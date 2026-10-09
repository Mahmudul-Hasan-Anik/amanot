import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Modal,
  TextInput,
  Linking,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSomitiStore } from '../../src/store/somitiStore';
import { useLanguage } from '../../src/i18n/useLanguage';
import { safeBack } from '../../src/utils/navigation';
import { toBengaliDigits } from '../../src/lib/bengali';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';

export default function SomitiProfileScreen() {
  const router = useRouter();
  const { l, formatNum, isBengali } = useLanguage();
  const { somitiInfo, members, projects, updateSomitiInfo } = useSomitiStore();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: somitiInfo.name || '',
    regNo: somitiInfo.regNo || '',
    establishedYear: somitiInfo.establishedYear || '',
    address: somitiInfo.address || '',
    phone: somitiInfo.phone || '',
    email: somitiInfo.email || '',
    authority: somitiInfo.authority || '',
    committeeTenure: somitiInfo.committeeTenure || '',
    bankName: somitiInfo.bankName || '',
    bankAccountNo: somitiInfo.bankAccountNo || '',
    bkashNo: somitiInfo.bkashNo || '',
    nagadNo: somitiInfo.nagadNo || '',
  });

  const handleOpenEdit = () => {
    setEditForm({
      name: somitiInfo.name || '',
      regNo: somitiInfo.regNo || '',
      establishedYear: somitiInfo.establishedYear || '',
      address: somitiInfo.address || '',
      phone: somitiInfo.phone || '',
      email: somitiInfo.email || '',
      authority: somitiInfo.authority || '',
      committeeTenure: somitiInfo.committeeTenure || '',
      bankName: somitiInfo.bankName || '',
      bankAccountNo: somitiInfo.bankAccountNo || '',
      bkashNo: somitiInfo.bkashNo || '',
      nagadNo: somitiInfo.nagadNo || '',
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    try { await updateSomitiInfo(editForm);
    setIsEditModalOpen(false);
    Alert.alert(
      l('Success', 'সফল'),
      l('Somiti profile updated successfully.', 'সমিতির তথ্য সফলভাবে সংরক্ষিত হয়েছে।')
    );} catch(e:any){Alert.alert(l('Save failed','সংরক্ষণ ব্যর্থ'),e.message);}
  };

  const handleCall = (phoneNumber: string) => {
    if (!phoneNumber || phoneNumber.includes('[')) {
      Alert.alert(
        l('Phone Call', 'কল করুন'),
        l('No phone number configured.', 'কোনো ফোন নম্বর নির্ধারণ করা হয়নি।')
      );
      return;
    }
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      Alert.alert(l('Error', 'ত্রুটি'), l('Cannot initiate phone call.', 'কল শুরু করা যায়নি।'));
    });
  };

  // Committee members matching Page 23
  const committeeMembers = [
    {
      id: 'c1',
      name: isBengali ? 'আনোয়ার হোসেন' : 'Anwar Hossain',
      role: isBengali ? 'সভাপতি' : 'President',
      initial: isBengali ? 'আ' : 'A',
      phone: '01711000001',
      avatarBg: colors.avatarPastels[1].bg,
      avatarColor: colors.avatarPastels[1].text,
    },
    {
      id: 'c2',
      name: isBengali ? 'জাহিদ হাসান' : 'Zahid Hasan',
      role: isBengali ? 'সাধারণ সম্পাদক' : 'General Secretary',
      initial: isBengali ? 'জ' : 'Z',
      phone: '01711000002',
      avatarBg: colors.avatarPastels[0].bg,
      avatarColor: colors.avatarPastels[0].text,
    },
    {
      id: 'c3',
      name: isBengali ? 'মাহমুদা খাতুন' : 'Mahmuda Khatun',
      role: isBengali ? 'কোষাধ্যক্ষ' : 'Treasurer',
      initial: isBengali ? 'ম' : 'M',
      phone: '01711000003',
      avatarBg: colors.avatarPastels[2].bg,
      avatarColor: colors.avatarPastels[2].text,
    },
    {
      id: 'c4',
      name: isBengali ? 'হাবিবুর রহমান' : 'Habibur Rahman',
      role: isBengali ? 'সদস্য' : 'Member',
      initial: isBengali ? 'হ' : 'H',
      phone: '01711000004',
      avatarBg: colors.avatarPastels[1].bg,
      avatarColor: colors.avatarPastels[1].text,
    },
  ];

  const somitiDisplayName = somitiInfo.name || '';
  const somitiInitial = somitiDisplayName.trim().charAt(0) || (isBengali ? 'স' : 'S');
  const regNoText = somitiInfo.regNo || '';
  const estYearText = somitiInfo.establishedYear || '';

  const memberCountDisplay = members.length > 0 ? members.length : 100;
  const projectCountDisplay = projects.length > 0 ? projects.length : 4;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      {/* Screen Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => safeBack(router, '/(admin)/(tabs)/more')}
          style={styles.headerIconBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{l('Somiti Profile', 'সমিতির প্রোফাইল')}</Text>
        <TouchableOpacity
          onPress={handleOpenEdit}
          style={styles.headerIconBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="create-outline" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Somiti Hero Tile */}
        <View style={styles.heroSection}>
          <View style={styles.somitiTile}>
            <Text style={styles.somitiTileText}>{somitiInitial}</Text>
          </View>
          <Text style={styles.somitiName}>{somitiDisplayName}</Text>
          <Text style={styles.somitiSubtitle}>
            {l(
              `Reg No. ${regNoText} • Est. ${estYearText}`,
              `নিবন্ধন নং ${regNoText} • প্রতিষ্ঠা ${estYearText}`
            )}
          </Text>
        </View>

        {/* 3-Stat Pill Cards Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{l('Members', 'সদস্য')}</Text>
            <Text style={styles.statValue}>
              {isBengali ? toBengaliDigits(memberCountDisplay) : memberCountDisplay}
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{l('Fund', 'তহবিল')}</Text>
            <Text style={styles.statValue}>
              {isBengali ? '৳৪৮.৫L' : '৳48.5L'}
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{l('Projects', 'প্রজেক্ট')}</Text>
            <Text style={styles.statValue}>
              {isBengali ? `${toBengaliDigits(projectCountDisplay)}টি` : `${projectCountDisplay}`}
            </Text>
          </View>
        </View>

        {/* Section 1: যোগাযোগ (Contact Info) */}
        <Text style={styles.sectionTitle}>{l('Contact Information', 'যোগাযোগ')}</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{l('Address', 'ঠিকানা')}</Text>
            <Text style={styles.infoValue}>
              {somitiInfo.address || ''}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{l('Phone', 'ফোন')}</Text>
            <Text style={styles.infoValue}>
              {somitiInfo.phone || ''}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{l('Email', 'ইমেইল')}</Text>
            <Text style={styles.infoValue}>
              {somitiInfo.email || ''}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>
              {l('Registration Authority', 'নিবন্ধন কর্তৃপক্ষ')}
            </Text>
            <Text style={styles.infoValue}>
              {somitiInfo.authority || ''}
            </Text>
          </View>
        </View>

        {/* Section 2: কমিটি (Committee) */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{l('Committee', 'কমিটি')}</Text>
          <TouchableOpacity
            onPress={() => setIsHistoryModalOpen(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.historyLink}>{l('History', 'ইতিহাস')}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.tenureSub}>
          {l(
            `Tenure: ${somitiInfo.committeeTenure || ''}`,
            `মেয়াদ: ${somitiInfo.committeeTenure || ''}`
          )}
        </Text>

        <View style={styles.committeeCard}>
          {committeeMembers.map((m, index) => (
            <View
              key={m.id}
              style={[
                styles.memberRow,
                index < committeeMembers.length - 1 && styles.memberRowBorder,
              ]}
            >
              <View style={[styles.avatarCircle, { backgroundColor: m.avatarBg }]}>
                <Text style={[styles.avatarText, { color: m.avatarColor }]}>
                  {m.initial}
                </Text>
              </View>

              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{m.name}</Text>
                <Text style={styles.memberRole}>{m.role}</Text>
              </View>

              <TouchableOpacity
                style={styles.callBtn}
                onPress={() => handleCall(m.phone)}
                activeOpacity={0.7}
              >
                <Ionicons name="call-outline" size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Section 3: জমা দেওয়ার হিসাব (Deposit Accounts) */}
        <Text style={styles.sectionTitle}>
          {l('Deposit Payment Accounts', 'জমা দেওয়ার হিসাব')}
        </Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{l('Bank', 'ব্যাংক')}</Text>
            <Text style={styles.infoValue}>
              {somitiInfo.bankName || ''}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{l('Account No.', 'হিসাব নম্বর')}</Text>
            <Text style={styles.infoValue}>
              {somitiInfo.bankAccountNo || ''}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{l('bKash', 'বিকাশ')}</Text>
            <Text style={styles.infoValue}>
              {somitiInfo.bkashNo || ''}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{l('Nagad', 'নগদ')}</Text>
            <Text style={styles.infoValue}>
              {somitiInfo.nagadNo || ''}
            </Text>
          </View>

          <Text style={styles.accountNoticeText}>
            {l(
              'This information is shown in member apps and reminder messages.',
              'এই তথ্য সদস্য অ্যাপ ও রিমাইন্ডার বার্তায় দেখানো হবে'
            )}
          </Text>
        </View>

        {/* Section 4: ডকুমেন্ট (Documents) */}
        <Text style={styles.sectionTitle}>{l('Documents', 'ডকুমেন্ট')}</Text>
        <View style={styles.card}>
          {/* গঠনতন্ত্র */}
          <View style={styles.docRow}>
            <View style={styles.docIconBox}>
              <Ionicons name="document-text-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.docDetails}>
              <Text style={styles.docTitle}>{l('Constitution', 'গঠনতন্ত্র')}</Text>
              <Text style={styles.docSub}>
                {l('PDF • Updated [Date]', 'PDF • হালনাগাদ [তারিখ]')}
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() =>
                Alert.alert(l('Download', 'ডাউনলোড'), l('Downloading Constitution PDF...', 'গঠনতন্ত্র PDF ডাউনলোড হচ্ছে...'))
              }
            >
              <Ionicons name="download-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* নিবন্ধন সনদ */}
          <View style={styles.docRow}>
            <View style={styles.docIconBox}>
              <Ionicons name="ribbon-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.docDetails}>
              <Text style={styles.docTitle}>
                {l('Registration Certificate', 'নিবন্ধন সনদ')}
              </Text>
              <Text style={styles.docSub}>{l('PDF', 'PDF')}</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() =>
                Alert.alert(l('Download', 'ডাউনলোড'), l('Downloading Registration Certificate PDF...', 'নিবন্ধন সনদ PDF ডাউনলোড হচ্ছে...'))
              }
            >
              <Ionicons name="download-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={isEditModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {l('Edit Somiti Info', 'সমিতির তথ্য সম্পাদনা')}
            </Text>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              <Text style={styles.inputLabel}>{l('Somiti Name', 'সমিতির নাম')}</Text>
              <TextInput
                style={styles.modalInput}
                value={editForm.name}
                onChangeText={(t) => setEditForm((p) => ({ ...p, name: t }))}
                placeholder="[সমিতির নাম]"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.inputLabel}>{l('Address', 'অফিসের ঠিকানা')}</Text>
              <TextInput
                style={styles.modalInput}
                value={editForm.address}
                onChangeText={(t) => setEditForm((p) => ({ ...p, address: t }))}
                placeholder="[অফিসের ঠিকানা]"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.inputLabel}>{l('Phone', 'ফোন নম্বর')}</Text>
              <TextInput
                style={styles.modalInput}
                value={editForm.phone}
                onChangeText={(t) => setEditForm((p) => ({ ...p, phone: t }))}
                placeholder="[ফোন নম্বর]"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.inputLabel}>{l('Email', 'ইমেইল')}</Text>
              <TextInput
                style={styles.modalInput}
                value={editForm.email}
                onChangeText={(t) => setEditForm((p) => ({ ...p, email: t }))}
                placeholder="[ইমেইল]"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.inputLabel}>{l('Bank Name & Branch', 'ব্যাংক ও শাখা')}</Text>
              <TextInput
                style={styles.modalInput}
                value={editForm.bankName}
                onChangeText={(t) => setEditForm((p) => ({ ...p, bankName: t }))}
                placeholder="[ব্যাংকের নাম], [শাখা]"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.inputLabel}>{l('Account No.', 'হিসাব নম্বর')}</Text>
              <TextInput
                style={styles.modalInput}
                value={editForm.bankAccountNo}
                onChangeText={(t) => setEditForm((p) => ({ ...p, bankAccountNo: t }))}
                placeholder="[হিসাব নম্বর]"
                placeholderTextColor={colors.textSecondary}
              />
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsEditModalOpen(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>{l('Cancel', 'বাতিল')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveEdit}
                activeOpacity={0.8}
              >
                <Text style={styles.modalSaveText}>{l('Save', 'সংরক্ষণ')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* History Modal */}
      <Modal visible={isHistoryModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {l('Committee History', 'পূর্ববর্তী কমিটির ইতিহাস')}
            </Text>
            <Text style={styles.historyDesc}>
              {l(
                'Previous committee terms and executive member records are archived securely.',
                'পূর্ববর্তী মেয়াদের সকল কার্যনির্বাহী কমিটি ও দায়িত্বপ্রাপ্ত সদস্যদের বিবরণ এখানে সংরক্ষিত।'
              )}
            </Text>
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setIsHistoryModalOpen(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalCancelText}>{l('Close', 'বন্ধ করুন')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  headerIconBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xl,
    lineHeight: typography.lineHeight.xl,
    color: colors.text,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  somitiTile: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  somitiTileText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.hero,
    lineHeight: typography.lineHeight.hero,
    color: colors.surface,
  },
  somitiName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xl,
    lineHeight: typography.lineHeight.xl,
    color: colors.text,
    textAlign: 'center',
  },
  somitiSubtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
  },
  statLabel: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
    color: colors.text,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    color: colors.text,
    marginBottom: 8,
    marginTop: 8,
    marginLeft: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 2,
    paddingHorizontal: 4,
  },
  historyLink: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.primary,
  },
  tenureSub: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.textSecondary,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoLabel: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    color: colors.textSecondary,
  },
  infoValue: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    color: colors.text,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: colors.surfaceMuted,
  },
  committeeCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 14,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  memberRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceMuted,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.base,
    lineHeight: typography.lineHeight.base,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    color: colors.text,
  },
  memberRole: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  callBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountNoticeText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.textSecondary,
    paddingVertical: 12,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  docIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  docDetails: {
    flex: 1,
  },
  docTitle: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    color: colors.text,
  },
  docSub: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalScroll: {
    marginBottom: 16,
  },
  inputLabel: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    color: colors.textSecondary,
    marginBottom: 4,
    marginTop: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.subhead,
    color: colors.text,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
  },
  modalCancelText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.subhead,
    color: colors.text,
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  modalSaveText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.subhead,
    color: colors.surface,
  },
  historyDesc: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 40,
  },
});
