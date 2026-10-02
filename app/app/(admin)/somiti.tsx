import React, { useState, useEffect } from 'react';
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
  KeyboardAvoidingView,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSomitiStore } from '../../src/store/somitiStore';
import { useLanguage } from '../../src/i18n/useLanguage';

const AVATAR_COLORS = [
  { bg: '#E0F2FE', text: '#0284C7' },
  { bg: '#DCFCE7', text: '#16A34A' },
  { bg: '#CCFBF1', text: '#0F766E' },
  { bg: '#EDE9FE', text: '#7C3AED' },
];

export default function SomitiProfileScreen() {
  const router = useRouter();
  const { l, formatMoney, formatNum, language } = useLanguage();
  const { somitiInfo, members, projects, updateSomitiInfo } = useSomitiStore();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{
    type: 'constitution' | 'certificate';
    title: string;
    subtitle: string;
  } | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State for Editing
  const [editForm, setEditForm] = useState({
    name: somitiInfo.name,
    tagline: somitiInfo.tagline || '',
    regNo: somitiInfo.regNo,
    establishedYear: somitiInfo.establishedYear,
    address: somitiInfo.address,
    phone: somitiInfo.phone,
    email: somitiInfo.email,
    authority: somitiInfo.authority || 'উপজেলা সমবায় কার্যালয়',
    committeeTenure: somitiInfo.committeeTenure || '২০২৫–২০২৭',
    bankName: somitiInfo.bankName || 'ইসলামী ব্যাংক বাংলাদেশ (মিরপুর শাখা)',
    bankAccountNo: somitiInfo.bankAccountNo || '2050-1402-1028-900',
    bkashNo: somitiInfo.bkashNo || '01711-223344',
    nagadNo: somitiInfo.nagadNo || '01811-223344',
  });

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleOpenEdit = () => {
    setEditForm({
      name: somitiInfo.name,
      tagline: somitiInfo.tagline || '',
      regNo: somitiInfo.regNo,
      establishedYear: somitiInfo.establishedYear,
      address: somitiInfo.address,
      phone: somitiInfo.phone,
      email: somitiInfo.email,
      authority: somitiInfo.authority || 'উপজেলা সমবায় কার্যালয়',
      committeeTenure: somitiInfo.committeeTenure || '২০২৫–২০২৭',
      bankName: somitiInfo.bankName || 'ইসলামী ব্যাংক বাংলাদেশ (মিরপুর শাখা)',
      bankAccountNo: somitiInfo.bankAccountNo || '2050-1402-1028-900',
      bkashNo: somitiInfo.bkashNo || '01711-223344',
      nagadNo: somitiInfo.nagadNo || '01811-223344',
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editForm.name.trim()) {
      Alert.alert(l('Error', 'ত্রুটি'), l('Somiti name cannot be empty', 'সমিতির নাম ফাঁকা রাখা যাবে না'));
      return;
    }
    updateSomitiInfo(editForm);
    setIsEditModalOpen(false);
    triggerToast(l('Somiti profile updated successfully!', 'সমিতির তথ্য সফলভাবে সংরক্ষণ করা হয়েছে!'));
  };

  const handleCall = (phoneNum: string) => {
    const clean = phoneNum.replace(/[^0-9]/g, '');
    if (!clean) return;
    Linking.openURL(`tel:${clean}`).catch(() => {
      Alert.alert(l('Notice', 'বিজ্ঞপ্তি'), l('Phone dialer could not be opened', 'ফোন ডায়লার চালু করা সম্ভব হয়নি'));
    });
  };

  const handleEmail = (emailAddr: string) => {
    if (!emailAddr) return;
    Linking.openURL(`mailto:${emailAddr}`).catch(() => {
      Alert.alert(l('Notice', 'বিজ্ঞপ্তি'), l('Email app could not be opened', 'ইমেইল অ্যাপ চালু করা সম্ভব হয়নি'));
    });
  };

  const handleCopy = (text: string, label: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    triggerToast(`${label} ${l('copied to clipboard', 'ক্লিপবোর্ডে কপি করা হয়েছে!')}`);
  };

  const committeeMembers = members.filter(
    (m) => m.role && m.role !== 'সাধারণ সদস্য'
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F7F2" />

      {/* Screen Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{l('Somiti Profile', 'সমিতির প্রোফাইল')}</Text>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={handleOpenEdit}
          activeOpacity={0.7}
        >
          <Ionicons name="pencil-outline" size={20} color="#1E293B" />
        </TouchableOpacity>
      </View>

      {/* Toast Notification Banner */}
      {toastMessage && (
        <View style={styles.toastContainer}>
          <Ionicons name="checkmark-circle" size={16} color="#0F766E" />
          <Text style={styles.toastText}>{toastMessage}</Text>
          <TouchableOpacity onPress={() => setToastMessage(null)} style={styles.toastCloseBtn}>
            <Ionicons name="close" size={15} color="#64748B" />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Somiti Identity Hero */}
        <View style={styles.identityArea}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>{somitiInfo.name.charAt(0) || 'স'}</Text>
          </View>
          <Text style={styles.somitiName}>{somitiInfo.name}</Text>
          <Text style={styles.somitiSub}>
            {l('Reg. No', 'নিবন্ধন নং')} {somitiInfo.regNo} · {l('Est.', 'প্রতিষ্ঠা')} {formatNum(somitiInfo.establishedYear)}
          </Text>
        </View>

        {/* 3 Stats Cards in a Row */}
        <View style={styles.threeStatsRow}>
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push('/(admin)/(tabs)/members')}
            activeOpacity={0.75}
          >
            <Text style={styles.statCardLabel}>{l('Members', 'সদস্য')}</Text>
            <Text style={styles.statCardVal}>{formatNum(members.length)}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push('/(admin)/finance')}
            activeOpacity={0.75}
          >
            <Text style={styles.statCardLabel}>{l('Fund', 'তহবিল')}</Text>
            <Text style={styles.statCardVal}>
              {somitiInfo.totalFund >= 100000
                ? (language === 'bn' ? `৳${formatNum((somitiInfo.totalFund / 100000).toFixed(1))}ল` : `৳${(somitiInfo.totalFund / 100000).toFixed(1)}L`)
                : formatMoney(somitiInfo.totalFund)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push('/(admin)/(tabs)/projects')}
            activeOpacity={0.75}
          >
            <Text style={styles.statCardLabel}>{l('Projects', 'প্রজেক্ট')}</Text>
            <Text style={styles.statCardVal}>{formatNum(projects.length)}{language === 'bn' ? 'টি' : ''}</Text>
          </TouchableOpacity>
        </View>

        {/* Section: যোগাযোগ */}
        <Text style={styles.sectionTitle}>{l('Contact', 'যোগাযোগ')}</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{l('Address', 'ঠিকানা')}</Text>
            <Text style={styles.rowValue}>{somitiInfo.address}</Text>
          </View>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.row}
            onPress={() => handleCall(somitiInfo.phone)}
            activeOpacity={0.7}
          >
            <Text style={styles.rowLabel}>{l('Phone', 'ফোন')}</Text>
            <Text style={styles.rowValue}>{somitiInfo.phone}</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.row}
            onPress={() => handleEmail(somitiInfo.email)}
            activeOpacity={0.7}
          >
            <Text style={styles.rowLabel}>{l('Email', 'ইমেইল')}</Text>
            <Text style={styles.rowValue}>{somitiInfo.email}</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.rowLabel}>{l('Registration Authority', 'নিবন্ধন কর্তৃপক্ষ')}</Text>
            <Text style={styles.rowValue}>{somitiInfo.authority || l('Upazila Cooperative Office', 'উপজেলা সমবায় কার্যালয়')}</Text>
          </View>
        </View>

        {/* Section: কমিটি */}
        <View style={styles.committeeHeaderRow}>
          <Text style={styles.sectionTitle}>{l('Committee', 'কমিটি')}</Text>
          <TouchableOpacity onPress={() => setIsHistoryModalOpen(true)} activeOpacity={0.7}>
            <Text style={styles.historyLink}>{l('History', 'ইতিহাস')}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.tenureSub}>
          {l('Tenure: ', 'মেয়াদ: ')}{somitiInfo.committeeTenure || '২০২৫–২০২৭'}
        </Text>

        <View style={styles.card}>
          {committeeMembers.map((m, index) => {
            const colorTheme = AVATAR_COLORS[index % AVATAR_COLORS.length];
            const initial = m.name.trim().charAt(0) || 'আ';

            return (
              <React.Fragment key={m.id}>
                <TouchableOpacity
                  style={styles.memberRow}
                  onPress={() => router.push(`/(admin)/member/${m.id}`)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.avatarCircle, { backgroundColor: colorTheme.bg }]}>
                    <Text style={[styles.avatarText, { color: colorTheme.text }]}>{initial}</Text>
                  </View>

                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{m.name}</Text>
                    <Text style={styles.memberRole}>{m.role}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.callIconBox}
                    onPress={() => handleCall(m.phone)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="call" size={16} color="#0F766E" />
                  </TouchableOpacity>
                </TouchableOpacity>
                {index < committeeMembers.length - 1 && <View style={styles.memberRowBorder} />}
              </React.Fragment>
            );
          })}
        </View>

        {/* Section: জমা দেওয়ার হিসাব */}
        <Text style={[styles.sectionTitle, { marginTop: 14 }]}>
          {l('Payment Accounts', 'জমা দেওয়ার হিসাব')}
        </Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{l('Bank', 'ব্যাংক')}</Text>
            <Text style={styles.rowValue}>{somitiInfo.bankName || 'ইসলামী ব্যাংক বাংলাদেশ (মিরপুর শাখা)'}</Text>
          </View>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.row}
            onPress={() => handleCopy(somitiInfo.bankAccountNo || '2050-1402-1028-900', l('Account number', 'হিসাব নম্বর'))}
            activeOpacity={0.7}
          >
            <Text style={styles.rowLabel}>{l('Account Number', 'হিসাব নম্বর')}</Text>
            <Text style={styles.rowValue}>{somitiInfo.bankAccountNo || '2050-1402-1028-900'}</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.row}
            onPress={() => handleCopy(somitiInfo.bkashNo || '01711-223344', l('bKash number', 'বিকাশ নম্বর'))}
            activeOpacity={0.7}
          >
            <Text style={styles.rowLabel}>{l('bKash', 'বিকাশ')}</Text>
            <Text style={styles.rowValue}>{somitiInfo.bkashNo || '01711-223344'}</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.row}
            onPress={() => handleCopy(somitiInfo.nagadNo || '01811-223344', l('Nagad', 'নগদ'))}
            activeOpacity={0.7}
          >
            <Text style={styles.rowLabel}>{l('Nagad', 'নগদ')}</Text>
            <Text style={styles.rowValue}>{somitiInfo.nagadNo || '01811-223344'}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.accountsNotice}>
          {l('This information will be shown on member app and reminder messages', 'এই তথ্য সদস্য অ্যাপ ও রিমাইন্ডার বার্তায় দেখানো হবে')}
        </Text>

        {/* Section: ডকুমেন্ট */}
        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>
          {l('Documents', 'ডকুমেন্ট')}
        </Text>
        <View style={styles.docsList}>
          {/* Doc 1: গঠনতন্ত্র */}
          <TouchableOpacity
            style={styles.docCard}
            onPress={() =>
              setPreviewDoc({
                type: 'constitution',
                title: l('Constitution', 'গঠনতন্ত্র'),
                subtitle: l('Uttara Model Samity - Bylaws (Revised 2026)', 'উত্তরা মডেল সমিতি - বিধিমালা ও উপ-আইন (সংশোধিত ২০২৬)'),
              })
            }
            activeOpacity={0.75}
          >
            <View style={styles.docIconBox}>
              <Ionicons name="document-text-outline" size={20} color="#0F766E" />
            </View>
            <View style={styles.docInfo}>
              <Text style={styles.docTitle}>{l('Constitution', 'গঠনতন্ত্র')}</Text>
              <Text style={styles.docSub}>{l('PDF · Revised January 2026', 'PDF · হালনাগাদ জানুয়ারি ২০২৬')}</Text>
            </View>
            <View style={styles.docDownloadBtn}>
              <Ionicons name="download-outline" size={20} color="#1E293B" />
            </View>
          </TouchableOpacity>

          {/* Doc 2: নিবন্ধন সনদ */}
          <TouchableOpacity
            style={styles.docCard}
            onPress={() =>
              setPreviewDoc({
                type: 'certificate',
                title: l('Registration Certificate', 'নিবন্ধন সনদ'),
                subtitle: l('Department of Cooperatives · Certified Copy', 'সমবায় অধিদপ্তর · সত্যায়িত সনদ'),
              })
            }
            activeOpacity={0.75}
          >
            <View style={styles.docIconBox}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#0F766E" />
            </View>
            <View style={styles.docInfo}>
              <Text style={styles.docTitle}>{l('Registration Certificate', 'নিবন্ধন সনদ')}</Text>
              <Text style={styles.docSub}>PDF</Text>
            </View>
            <View style={styles.docDownloadBtn}>
              <Ionicons name="download-outline" size={20} color="#1E293B" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Edit Somiti Profile Modal */}
      <Modal
        visible={isEditModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsEditModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.editModalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalHeaderTitle}>
                  {l('Edit Somiti Profile', 'সমিতির তথ্য সম্পাদনা')}
                </Text>
                <Text style={styles.modalHeaderSub}>
                  {l('Update contact, accounts & identity details', 'যোগাযোগ, পেমেন্ট অ্যাকাউন্ট ও প্রাথমিক তথ্য পরিবর্তন করুন')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsEditModalOpen(false)}
                style={styles.modalCloseBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Modal Form Scroll */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formScroll}>
              {/* Group 1: Identity */}
              <Text style={styles.formSectionHeader}>
                {l('1. Identity Information', '১. প্রাথমিক পরিচিতি')}
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{l('Somiti Name *', 'সমিতির পূর্ণ নাম *')}</Text>
                <TextInput
                  style={styles.textInput}
                  value={editForm.name}
                  onChangeText={(text) => setEditForm((prev) => ({ ...prev, name: text }))}
                  placeholder={l('Enter somiti name', 'সমিতির নাম লিখুন')}
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{l('Slogan / Tagline', 'স্লোগান / মূলমন্ত্র')}</Text>
                <TextInput
                  style={styles.textInput}
                  value={editForm.tagline}
                  onChangeText={(text) => setEditForm((prev) => ({ ...prev, tagline: text }))}
                  placeholder={l('e.g. All samity accounts in one place', 'যেমন: সমিতির সব হিসাব, এক জায়গায়')}
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>{l('Registration No.', 'নিবন্ধন নম্বর')}</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editForm.regNo}
                    onChangeText={(text) => setEditForm((prev) => ({ ...prev, regNo: text }))}
                    placeholder="১২৮৯/২০২২"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.inputLabel}>{l('Established Year', 'প্রতিষ্ঠার বছর')}</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editForm.establishedYear}
                    onChangeText={(text) => setEditForm((prev) => ({ ...prev, establishedYear: text }))}
                    placeholder="২০২২"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Group 2: Contact */}
              <Text style={styles.formSectionHeader}>
                {l('2. Contact & Address', '২. যোগাযোগ ও ঠিকানা')}
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{l('Office Address', 'অফিসের ঠিকানা')}</Text>
                <TextInput
                  style={styles.textInput}
                  value={editForm.address}
                  onChangeText={(text) => setEditForm((prev) => ({ ...prev, address: text }))}
                  placeholder={l('House, Road, Area, Thana, District', 'বাড়ি, রোড, এলাকা, থানা, জেলা')}
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>{l('Phone / Helpline', 'মোবাইল / হেল্পলাইন')}</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editForm.phone}
                    onChangeText={(text) => setEditForm((prev) => ({ ...prev, phone: text }))}
                    placeholder="০১৭১১-২২৩৩৪৪"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.inputLabel}>{l('Official Email', 'অফিসিয়াল ইমেইল')}</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editForm.email}
                    onChangeText={(text) => setEditForm((prev) => ({ ...prev, email: text }))}
                    placeholder="info@somiti.org"
                    placeholderTextColor="#94A3B8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{l('Registration Authority', 'নিবন্ধন কর্তৃপক্ষ')}</Text>
                <TextInput
                  style={styles.textInput}
                  value={editForm.authority}
                  onChangeText={(text) => setEditForm((prev) => ({ ...prev, authority: text }))}
                  placeholder={l('e.g. Upazila Cooperative Office', 'যেমন: উপজেলা সমবায় কার্যালয়')}
                  placeholderTextColor="#94A3B8"
                />
              </View>

              {/* Group 3: Payment Accounts */}
              <Text style={styles.formSectionHeader}>
                {l('3. Payment Accounts', '৩. জমা নেওয়ার হিসাব')}
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{l('Bank Name & Branch', 'ব্যাংকের নাম ও শাখা')}</Text>
                <TextInput
                  style={styles.textInput}
                  value={editForm.bankName}
                  onChangeText={(text) => setEditForm((prev) => ({ ...prev, bankName: text }))}
                  placeholder="ইসলামী ব্যাংক বাংলাদেশ (মিরপুর শাখা)"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{l('Bank Account Number', 'ব্যাংক হিসাব নম্বর')}</Text>
                <TextInput
                  style={styles.textInput}
                  value={editForm.bankAccountNo}
                  onChangeText={(text) => setEditForm((prev) => ({ ...prev, bankAccountNo: text }))}
                  placeholder="2050-1402-1028-900"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>{l('bKash Number', 'বিকাশ নম্বর')}</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editForm.bkashNo}
                    onChangeText={(text) => setEditForm((prev) => ({ ...prev, bkashNo: text }))}
                    placeholder="01711-223344"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.inputLabel}>{l('Nagad Number', 'নগদ নম্বর')}</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editForm.nagadNo}
                    onChangeText={(text) => setEditForm((prev) => ({ ...prev, nagadNo: text }))}
                    placeholder="01811-223344"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* Group 4: Committee Tenure */}
              <Text style={styles.formSectionHeader}>
                {l('4. Committee Tenure', '৪. পরিচালনা কমিটির মেয়াদ')}
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{l('Executive Committee Tenure', 'বর্তমান কমিটির মেয়াদকাল')}</Text>
                <TextInput
                  style={styles.textInput}
                  value={editForm.committeeTenure}
                  onChangeText={(text) => setEditForm((prev) => ({ ...prev, committeeTenure: text }))}
                  placeholder="২০২৫–২০২৭"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={{ height: 20 }} />
            </ScrollView>

            {/* Modal Bottom Actions */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsEditModalOpen(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>{l('Cancel', 'বাতিল')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveEdit}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                <Text style={styles.saveBtnText}>{l('Save Changes', 'তথ্য সংরক্ষণ করুন')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Committee History Modal */}
      <Modal
        visible={isHistoryModalOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setIsHistoryModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dialogCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="time-outline" size={20} color="#0F766E" />
                <Text style={styles.modalHeaderTitle}>{l('Committee History', 'পরিচালনা কমিটির ইতিহাস')}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsHistoryModalOpen(false)}
                style={styles.modalCloseBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              {/* Term 1 */}
              <View style={styles.historyTermCard}>
                <View style={styles.termTopRow}>
                  <Text style={styles.termTitle}>{l('2025 – 2027 Executive Committee', '২০২৫ – ২০২৭ কার্যনির্বাহী কমিটি')}</Text>
                  <View style={styles.currentBadge}>
                    <Text style={styles.currentBadgeText}>{l('Active', 'বর্তমান')}</Text>
                  </View>
                </View>
                <Text style={styles.termDetail}>
                  • {l('President: Anwar Hossain', 'সভাপতি: আনোয়ার হোসেন')}{'\n'}
                  • {l('General Secretary: Jahid Hasan', 'সাধারণ সম্পাদক: জাহিদ হাসান')}{'\n'}
                  • {l('Treasurer: Mahmuda Khatun', 'কোষাধ্যক্ষ: মাহমুদা খাতুন')}{'\n'}
                  • {l('Executive Member: Habibur Rahman', 'সদস্য: হাবিবুর রহমান')}
                </Text>
              </View>

              {/* Term 2 */}
              <View style={styles.historyTermCard}>
                <View style={styles.termTopRow}>
                  <Text style={styles.termTitle}>{l('2023 – 2025 Committee', '২০২৩ – ২০২৫ পূর্ববর্তী কমিটি')}</Text>
                  <View style={styles.expiredBadge}>
                    <Text style={styles.expiredBadgeText}>{l('Completed', 'মেয়াদ উত্তীর্ণ')}</Text>
                  </View>
                </View>
                <Text style={styles.termDetail}>
                  • {l('President: Md. Rafiqul Islam', 'সভাপতি: মো: রফিকুল ইসলাম')}{'\n'}
                  • {l('General Secretary: Anwar Hossain', 'সাধারণ সম্পাদক: আনোয়ার হোসেন')}{'\n'}
                  • {l('Treasurer: Khalilur Rahman', 'কোষাধ্যক্ষ: খলিলুর রহমান')}
                </Text>
              </View>

              {/* Term 3 */}
              <View style={styles.historyTermCard}>
                <View style={styles.termTopRow}>
                  <Text style={styles.termTitle}>{l('2021 – 2023 Convening Committee', '২০২১ – ২০২৩ আহ্বায়ক কমিটি')}</Text>
                  <View style={styles.expiredBadge}>
                    <Text style={styles.expiredBadgeText}>{l('Founding', 'প্রতিষ্ঠাতা')}</Text>
                  </View>
                </View>
                <Text style={styles.termDetail}>
                  • {l('Convener: Anwar Hossain', 'আহ্বায়ক: আনোয়ার হোসেন')}{'\n'}
                  • {l('Joint Convener: Dr. Shafiqul Islam', 'যুগ্ম আহ্বায়ক: ডা: শফিকুল ইসলাম')}
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.dialogBottomBtn}
              onPress={() => setIsHistoryModalOpen(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.dialogBottomBtnText}>{l('Close', 'বন্ধ করুন')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Document Preview Modal */}
      <Modal
        visible={!!previewDoc}
        animationType="fade"
        transparent
        onRequestClose={() => setPreviewDoc(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dialogCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons
                  name={previewDoc?.type === 'constitution' ? 'document-text' : 'shield-checkmark'}
                  size={20}
                  color="#0F766E"
                />
                <Text style={styles.modalHeaderTitle}>{previewDoc?.title}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setPreviewDoc(null)}
                style={styles.modalCloseBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.docPreviewPaper}>
              <View style={styles.paperEmblem}>
                <Ionicons name="library-outline" size={28} color="#0F766E" />
              </View>
              <Text style={styles.paperOrgName}>{somitiInfo.name}</Text>
              <Text style={styles.paperSubtitle}>{previewDoc?.subtitle}</Text>
              <View style={styles.paperDivider} />

              <View style={styles.paperRow}>
                <Text style={styles.paperLabel}>{l('Registration No:', 'নিবন্ধন নম্বর:')}</Text>
                <Text style={styles.paperValue}>{somitiInfo.regNo}</Text>
              </View>
              <View style={styles.paperRow}>
                <Text style={styles.paperLabel}>{l('Issuing Authority:', 'অনুমোদন কর্তৃপক্ষ:')}</Text>
                <Text style={styles.paperValue}>{somitiInfo.authority || 'সমবায় অধিদপ্তর'}</Text>
              </View>
              <View style={styles.paperRow}>
                <Text style={styles.paperLabel}>{l('Official Address:', 'দাপ্তরিক ঠিকানা:')}</Text>
                <Text style={styles.paperValue}>{somitiInfo.address}</Text>
              </View>

              <View style={styles.paperSealRow}>
                <View style={styles.paperSeal}>
                  <Ionicons name="checkmark-done-circle" size={14} color="#0F766E" />
                  <Text style={styles.paperSealText}>{l('DIGITALLY CERTIFIED & VERIFIED', 'ডিজিটাল সত্যায়িত ও সংরক্ষিত')}</Text>
                </View>
              </View>
            </View>

            <View style={styles.docActionsRow}>
              <TouchableOpacity
                style={styles.docDownloadAction}
                onPress={() => {
                  setPreviewDoc(null);
                  triggerToast(l('Document PDF downloaded to device', 'ডকুমেন্ট PDF ডিভাইসে সংরক্ষিত হয়েছে'));
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="download-outline" size={18} color="#FFFFFF" />
                <Text style={styles.docDownloadActionText}>{l('Download PDF', 'PDF ডাউনলোড')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.docCloseAction}
                onPress={() => setPreviewDoc(null)}
                activeOpacity={0.75}
              >
                <Text style={styles.docCloseActionText}>{l('Close', 'বন্ধ করুন')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 20,
    color: '#1E293B',
  },
  editBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E6F4F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toastContainer: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
    gap: 8,
  },
  toastText: {
    flex: 1,
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 13,
    color: '#065F46',
  },
  toastCloseBtn: {
    padding: 2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  identityArea: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0F766E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#0F766E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  logoText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 28,
    color: '#FFFFFF',
  },
  somitiName: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 22,
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 2,
  },
  somitiTagline: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 13,
    color: '#0F766E',
    textAlign: 'center',
    marginBottom: 4,
  },
  somitiSub: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  threeStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statCardLabel: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
  },
  statCardVal: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 15,
    color: '#1E293B',
  },
  statCardHint: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 10,
    color: '#0F766E',
    marginTop: 4,
  },
  sectionTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 15,
    color: '#1E293B',
  },
  committeeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
    marginTop: 14,
    paddingHorizontal: 4,
  },
  tenureSub: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
    marginLeft: 4,
  },
  historyLink: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 12,
    color: '#64748B',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  rowLabel: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 13,
    color: '#64748B',
  },
  rowValue: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 13,
    color: '#1E293B',
    textAlign: 'right',
    flexShrink: 1,
    marginLeft: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  memberRowBorder: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 14,
    color: '#1E293B',
  },
  memberRole: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: '#64748B',
  },
  callIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E6F4F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountsNotice: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: '#64748B',
    marginLeft: 4,
    marginBottom: 8,
  },
  docsList: {
    gap: 10,
  },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  docIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E6F4F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  docInfo: {
    flex: 1,
  },
  docTitle: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 14,
    color: '#1E293B',
  },
  docSub: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: '#64748B',
  },
  docDownloadBtn: {
    padding: 6,
  },

  // Modals Styling
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  editModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
  },
  modalHeaderTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 18,
    color: '#1E293B',
  },
  modalHeaderSub: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formScroll: {
    paddingVertical: 4,
  },
  formSectionHeader: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 13,
    color: '#0F766E',
    marginTop: 10,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 4,
  },
  inputGroup: {
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: 'row',
  },
  inputLabel: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 12,
    color: '#475569',
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 13,
    color: '#1E293B',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  cancelBtnText: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 14,
    color: '#475569',
  },
  saveBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#0F766E',
  },
  saveBtnText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },

  // Dialog Card for History & Document
  dialogCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    width: '100%',
    maxWidth: 440,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  historyTermCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  termTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  termTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 13,
    color: '#1E293B',
  },
  currentBadge: {
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  currentBadgeText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 10,
    color: '#0F766E',
  },
  expiredBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  expiredBadgeText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 10,
    color: '#64748B',
  },
  termDetail: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  dialogBottomBtn: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  dialogBottomBtnText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 13,
    color: '#FFFFFF',
  },

  // Document Preview Paper
  docPreviewPaper: {
    backgroundColor: '#FAFAF9',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E7E5E4',
    borderStyle: 'dashed',
    alignItems: 'center',
    marginBottom: 14,
  },
  paperEmblem: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  paperOrgName: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 18,
    color: '#134E4A',
    textAlign: 'center',
  },
  paperSubtitle: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 2,
  },
  paperDivider: {
    height: 1,
    backgroundColor: '#D6D3D1',
    width: '100%',
    marginVertical: 12,
  },
  paperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 6,
  },
  paperLabel: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 11,
    color: '#78716C',
  },
  paperValue: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 12,
    color: '#1C1917',
    maxWidth: '65%',
    textAlign: 'right',
  },
  paperSealRow: {
    marginTop: 12,
  },
  paperSeal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E6FFFA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  paperSealText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 9,
    color: '#0F766E',
  },
  docActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  docDownloadAction: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0F766E',
    borderRadius: 10,
    paddingVertical: 10,
  },
  docDownloadActionText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  docCloseAction: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingVertical: 10,
  },
  docCloseActionText: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 13,
    color: '#475569',
  },
});
