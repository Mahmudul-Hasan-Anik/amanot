import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  StatusBar,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSomitiStore } from '../../../src/store/somitiStore';
import { Member, mockMembers } from '../../../src/mocks/mockData';
import { useLanguage } from '../../../src/i18n/useLanguage';
import { safeBack } from '../../../src/utils/navigation';
import { AppModal } from '../../../src/components/AppModal';
import { Avatar } from '../../../src/components/Avatar';
import { Checkbox } from '../../../src/components/Checkbox';
import { toEnglishDigits } from '../../../src/lib/money';
import { toBengaliDigits, BENGALI_MONTHS_FULL } from '../../../src/lib/bengali';
import { colors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { getDepositMonthOptions, defaultSelectedMonths, MonthOption, todayDMY, parseDMY } from '../../../src/lib/months';
import { uuid } from '../../../src/lib/api';

type PaymentMethodType = 'cash' | 'bkash' | 'nagad' | 'bank';

export default function RecordDepositScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { members, recordDeposit, somitiInfo } = useSomitiStore();
  const { l, isBengali, formatMoney, formatNum } = useLanguage();

  const displayMembers = useMemo(() => (members), [members]);

  // Find selected member, default to Karim Uddin (id: '2') or first due member
  const initialMemberId = (params.memberId as string) ||
    displayMembers.find((m) => m.id === '2')?.id ||
    displayMembers.find((m) => m.status === 'due')?.id ||
    displayMembers[0]?.id || '1';

  const [selectedMemberId, setSelectedMemberId] = useState<string>(initialMemberId);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  const currentMember: Member | undefined = useMemo(() => {
    return displayMembers.find((m) => m.id === selectedMemberId) || displayMembers[0];
  }, [displayMembers, selectedMemberId]);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('bkash');
  const [trxId, setTrxId] = useState('');
  const [saving, setSaving] = useState(false);
  const requestId = useRef(uuid());

  // Deposit date & Comment
  const [depositDate, setDepositDate] = useState(todayDMY());
  const [comment, setComment] = useState('');

  // DatePicker modal state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerDay, setPickerDay] = useState(new Date().getDate());
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth() + 1);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());

  const MONTH_NAMES_BN = BENGALI_MONTHS_FULL;
  const MONTH_NAMES_EN = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const openDatePicker = () => {
    if (depositDate) {
      const parts = toEnglishDigits(depositDate).split(/[\/\-\.]/);
      if (parts.length === 3) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const y = parseInt(parts[2], 10);
        if (!isNaN(d) && d >= 1 && d <= 31) setPickerDay(d);
        if (!isNaN(m) && m >= 1 && m <= 12) setPickerMonth(m);
        if (!isNaN(y) && y >= 1930 && y <= 2030) setPickerYear(y);
      }
    } else {
      const now = new Date();
      setPickerDay(now.getDate());
      setPickerMonth(now.getMonth() + 1);
      setPickerYear(now.getFullYear());
    }
    setShowDatePicker(true);
  };

  const handleConfirmDate = () => {
    const dd = pickerDay < 10 ? `0${pickerDay}` : `${pickerDay}`;
    const mm = pickerMonth < 10 ? `0${pickerMonth}` : `${pickerMonth}`;
    const yyyy = `${pickerYear}`;
    const dateStr = `${dd}/${mm}/${yyyy}`;
    setDepositDate(dateStr);
    setShowDatePicker(false);
  };

  // Notification delivery methods
  const [sendSMS, setSendSMS] = useState(false);

  const [customAmount,setCustomAmount]=useState('');
  const handleSelectMember=(id:string)=>{setSelectedMemberId(id);setShowMemberModal(false);setCustomAmount('');requestId.current=uuid();};

  // Payment methods segmented control options
  const paymentMethodsList: Array<{ id: PaymentMethodType; label: string }> = [
    { id: 'cash', label: l('Cash', 'হাতে নগদ') },
    { id: 'bkash', label: l('bKash', 'বিকাশ') },
    { id: 'nagad', label: l('Nagad', 'নগদ') },
    { id: 'bank', label: l('Bank', 'ব্যাংক') },
  ];

  // Numeric total amount for calculation
  const numericAmount = Number(toEnglishDigits(customAmount).replace(/[^0-9.]/g, ''));
  const newTotalDeposit = (currentMember?.totalDeposit || 0) + numericAmount;

  const methodNameText = paymentMethodsList.find((p) => p.id === paymentMethod)?.label || l('bKash', 'বিকাশ');

  const handleConfirmDeposit = async () => {
    if (saving || !currentMember) return;
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      Alert.alert(
        l('Invalid Amount', 'ভুল টাকার পরিমাণ'),
        l('Please enter a valid deposit amount.', 'অনুগ্রহ করে সঠিক জমার টাকার পরিমাণ লিখুন।')
      );
      return;
    }

    if (paymentMethod !== 'cash' && !trxId.trim()) {
      Alert.alert(
        l('Transaction ID Needed', 'ট্রানজ্যাকশন আইডি দিন'),
        l('Please enter transaction ID.', 'অনুগ্রহ করে ট্রানজ্যাকশন আইডি লিখুন।')
      );
      return;
    }

    const depositISO = parseDMY(toEnglishDigits(depositDate));
    if (!depositISO) {
      Alert.alert(
        l('Invalid Date', 'ভুল তারিখ'),
        l('Deposit date must be in DD/MM/YYYY format.', 'জমার তারিখ DD/MM/YYYY ফরম্যাটে দিন।')
      );
      return;
    }

    setSaving(true);
    try {
      const newTxn = await recordDeposit({
        id: requestId.current,
        memberId: currentMember.id,
        months: [],
        baseAmount: numericAmount,
        lateFee: 0,
        totalAmount: numericAmount,
        paymentMethod,
        trxId: paymentMethod !== 'cash' ? trxId.trim() : undefined,
        note: comment.trim() || l('Deposit', 'জমা'),
        date: depositISO,
        sendSMS,
      });

      router.replace(`/(admin)/receipt/${newTxn.id}`);
    } catch (e: any) { Alert.alert(l('Save failed', 'সংরক্ষণ ব্যর্থ'), e.message); } finally { setSaving(false); }
  };

  const filteredMembersForModal = useMemo(() => {
    if (!memberSearchQuery.trim()) return displayMembers;
    const q = memberSearchQuery.toLowerCase().trim();
    return displayMembers.filter(
      (m) => (m.name || '').toLowerCase().includes(q) || (m.code || '').toLowerCase().includes(q)
    );
  }, [displayMembers, memberSearchQuery]);

  if (!currentMember) return <SafeAreaView style={styles.container}><View style={{padding:24}}><Text>{l('Add a member before recording a deposit.', 'জমা নেওয়ার আগে একজন সদস্য যোগ করুন।')}</Text><TouchableOpacity onPress={() => router.push('/(admin)/member/new')}><Text style={{color: colors.primary, marginTop:16}}>{l('Add member', 'সদস্য যোগ করুন')}</Text></TouchableOpacity></View></SafeAreaView>;
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => safeBack(router, '/(admin)/(tabs)/collection')}
          style={styles.closeBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{l('Record Deposit', 'জমা গ্রহণ')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Member Selector Card */}
        <View style={styles.memberCard}>
          <Avatar
            name={currentMember?.name || 'ক'}
            size="md"
            index={1}
          />
          <View style={styles.memberDetails}>
            <Text style={styles.memberName}>{l(currentMember?.nameEn || currentMember?.name, currentMember?.name)}</Text>
            <Text style={styles.memberSub}>
              {currentMember?.code} · {l('Voluntary deposits', 'ইচ্ছামতো জমা')}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowMemberModal(true)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.changeLink}>{l('Change', 'বদলান')}</Text>
          </TouchableOpacity>
        </View>

        {/* 1. Month Selection */}
        {/* 2. Amount Card with Green Underline & Breakdown */}
        <View style={styles.amountCard}>
          <Text style={styles.amountSectionLabel}>{l('Deposit Amount', 'পরিমাণ')}</Text>
          <Text style={styles.amountHint}>{l('Enter the amount received. No fixed rate or late fee.', 'যত টাকা জমা দিয়েছেন লিখুন। নির্দিষ্ট হার বা বিলম্ব ফি নেই।')}</Text>

          {/* Large Amount Input Container */}
          <View style={styles.largeAmountContainer}>
            <Text style={styles.largeCurrencySymbol}>৳</Text>
            <TextInput
              style={styles.largeAmountInput}
              accessibilityLabel={l('Deposit Amount', 'পরিমাণ')}
              value={isBengali ? toBengaliDigits(customAmount) : customAmount}
              onChangeText={(t) => setCustomAmount(toEnglishDigits(t))}
              keyboardType="numeric"
              placeholder="০"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          {/* Solid Green Underline Divider */}
          <View style={styles.greenUnderline} />

        </View>

        {/* 3. Payment Method */}
        <Text style={styles.sectionTitle}>{l('Payment Method', 'পেমেন্টের মাধ্যম')}</Text>
        <View style={styles.segmentedMethodTrack}>
          {paymentMethodsList.map((m) => {
            const isSelected = paymentMethod === m.id;
            return (
              <TouchableOpacity
                key={m.id}
                style={[styles.segmentedMethodBtn, isSelected && styles.segmentedMethodBtnActive]}
                onPress={() => setPaymentMethod(m.id)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.segmentedMethodText,
                    isSelected ? styles.segmentedMethodTextActive : styles.segmentedMethodTextInactive,
                  ]}
                >
                  {m.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 4. 2-Column Row for TrxID and Date */}
        <View style={styles.twoColRow}>
          <View style={styles.colLeft}>
            <Text style={styles.fieldLabel}>{l('Transaction ID', 'লেনদেন নম্বর')}</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.inputText}
                value={trxId}
                onChangeText={setTrxId}
                placeholder="BK7X29QM4L"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="characters"
              />
            </View>
          </View>

          <View style={styles.colRight}>
            <Text style={styles.fieldLabel}>{l('Date', 'তারিখ')}</Text>
            <View style={styles.dateInputWithIcon}>
              <TextInput
                testID="input-deposit-date"
                style={styles.dateInputText}
                value={formatNum(depositDate)}
                onChangeText={(t) => setDepositDate(toEnglishDigits(t))}
                placeholder={todayDMY()}
                placeholderTextColor={colors.textSecondary}
              />
              <TouchableOpacity
                testID="btn-deposit-date-calendar"
                style={styles.calendarIconBtn}
                onPress={openDatePicker}
                activeOpacity={0.7}
              >
                <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 5. Comment / Note Field */}
        <View style={styles.commentGroup}>
          <Text style={styles.fieldLabel}>{l('Comment / Note (Optional)', 'মন্তব্য / নোট (ঐচ্ছিক)')}</Text>
          <View style={styles.commentInputBox}>
            <TextInput
              testID="input-deposit-comment"
              style={styles.commentInput}
              value={comment}
              onChangeText={setComment}
              placeholder={l(
                'e.g. Received on 1st, entry delayed due to office closure',
                'যেমন: ১ তারিখে প্রাপ্ত, অফিস বন্ধ থাকার কারণে বিলম্বে এন্ট্রি'
              )}
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={2}
            />
          </View>
        </View>

        {/* 5. Send Receipt Notification Channels Card */}
        <Text style={styles.sectionTitle}>{l('Send Receipt to Member', 'সদস্যকে রসিদ পাঠান')}</Text>
        <View style={styles.deliveryCard}>
          <TouchableOpacity
            style={styles.deliveryRow}
            onPress={() => setSendSMS(!sendSMS)}
            activeOpacity={0.7}
          >
            <Checkbox
              checked={sendSMS}
              onPress={() => setSendSMS(!sendSMS)}
            />
            <Text style={styles.deliveryLabel}>{l('SMS', 'এসএমএস')}</Text>
          </TouchableOpacity>

          <View style={styles.deliveryDivider} />

          <Text style={[styles.deliveryLabel,{padding:16}]}>{l('Share via WhatsApp from the saved receipt. Push is not connected.', 'সংরক্ষিত রসিদ থেকে হোয়াটসঅ্যাপে শেয়ার করুন। পুশ সংযুক্ত নেই।')}</Text>
        </View>

        {/* 6. Info Notice Box */}
        <View style={styles.infoBox}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={colors.text}
            style={{ marginTop: 2 }}
          />
          <Text style={styles.infoText}>
            {l(
              `${l(currentMember?.nameEn || currentMember?.name, currentMember?.name)}'s deposit of ${formatMoney(numericAmount)} will be received via ${methodNameText}. Total deposit after this will be ${formatMoney(newTotalDeposit)}.`,
              `${currentMember?.name}ের জমা ${formatMoney(numericAmount)} ${methodNameText}ে গ্রহণ করা হবে। জমার পর মোট জমা হবে ${formatMoney(newTotalDeposit)}।`
            )}
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Member Selection Modal */}
      <AppModal
        visible={showMemberModal}
        onClose={() => setShowMemberModal(false)}
      >
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{l('Select Member', 'সদস্য নির্বাচন করুন')}</Text>
          <TouchableOpacity
            onPress={() => setShowMemberModal(false)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.modalSearchBox}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.modalSearchInput}
            placeholder={l('Search by name or code...', 'নাম বা কোড দিয়ে খুঁজুন...')}
            placeholderTextColor={colors.textSecondary}
            value={memberSearchQuery}
            onChangeText={setMemberSearchQuery}
          />
        </View>

        <FlatList
          data={filteredMembersForModal}
          keyExtractor={(item) => item.id}
          style={{ maxHeight: 360 }}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              style={[
                styles.modalMemberItem,
                item.id === selectedMemberId && styles.modalMemberItemActive,
              ]}
              onPress={() => handleSelectMember(item.id)}
              activeOpacity={0.7}
            >
              <Avatar
                name={item.name}
                size="md"
                index={index}
              />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.memberName}>{l(item.nameEn || item.name, item.name)}</Text>
                <Text style={styles.memberSub}>
                  {item.code}
                </Text>
              </View>
              {item.dueAmount > 0 && (
                <View style={styles.duePill}>
                  <Text style={styles.duePillText}>
                    {l('Due', 'বকেয়া')} {formatMoney(item.dueAmount)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      </AppModal>

      {/* Date Picker Modal */}
      <AppModal
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
      >
        <View style={styles.datePickerHeader}>
          <View style={styles.datePickerTitleRow}>
            <Ionicons name="calendar" size={20} color={colors.primary} />
            <Text style={styles.datePickerTitle}>
              {l('Select Deposit Date', 'জমার তারিখ নির্বাচন করুন')}
            </Text>
          </View>
          <TouchableOpacity
            testID="btn-close-datepicker"
            onPress={() => setShowDatePicker(false)}
            style={styles.datePickerCloseBtn}
          >
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Selected Date Preview Banner */}
        <View style={styles.datePreviewBox}>
          <Text style={styles.datePreviewLabel}>
            {l('Selected Date', 'নির্বাচিত তারিখ')}
          </Text>
          <Text style={styles.datePreviewVal}>
            {isBengali
              ? `${toBengaliDigits(pickerDay)} ${MONTH_NAMES_BN[pickerMonth - 1]} ${toBengaliDigits(pickerYear)}`
              : `${pickerDay} ${MONTH_NAMES_EN[pickerMonth - 1]} ${pickerYear}`}
          </Text>
        </View>

        {/* 3 Column Picker */}
        <View style={styles.pickerColumnsRow}>
          {/* Day Column */}
          <View style={styles.pickerCol}>
            <Text style={styles.pickerColHeader}>{l('Day', 'দিন')}</Text>
            <ScrollView
              style={styles.pickerScrollView}
              showsVerticalScrollIndicator={false}
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
                const isSelected = d === pickerDay;
                return (
                  <TouchableOpacity
                    key={`day-${d}`}
                    style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                    onPress={() => setPickerDay(d)}
                  >
                    <Text style={[styles.pickerItemText, isSelected && styles.pickerItemTextSelected]}>
                      {isBengali ? toBengaliDigits(d) : d}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Month Column */}
          <View style={[styles.pickerCol, { flex: 1.4 }]}>
            <Text style={styles.pickerColHeader}>{l('Month', 'মাস')}</Text>
            <ScrollView
              style={styles.pickerScrollView}
              showsVerticalScrollIndicator={false}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                const isSelected = m === pickerMonth;
                const mName = isBengali ? MONTH_NAMES_BN[m - 1] : MONTH_NAMES_EN[m - 1];
                return (
                  <TouchableOpacity
                    key={`month-${m}`}
                    style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                    onPress={() => setPickerMonth(m)}
                  >
                    <Text
                      numberOfLines={1}
                      style={[styles.pickerItemText, isSelected && styles.pickerItemTextSelected]}
                    >
                      {mName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Year Column */}
          <View style={styles.pickerCol}>
            <Text style={styles.pickerColHeader}>{l('Year', 'বছর')}</Text>
            <ScrollView
              style={styles.pickerScrollView}
              showsVerticalScrollIndicator={false}
            >
              {Array.from({ length: 15 }, (_, i) => new Date().getFullYear() + 1 - i).map((y) => {
                const isSelected = y === pickerYear;
                return (
                  <TouchableOpacity
                    key={`year-${y}`}
                    style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                    onPress={() => setPickerYear(y)}
                  >
                    <Text style={[styles.pickerItemText, isSelected && styles.pickerItemTextSelected]}>
                      {isBengali ? toBengaliDigits(y) : y}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity
          testID="btn-confirm-datepicker"
          style={styles.datePickerConfirmBtn}
          onPress={handleConfirmDate}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark" size={18} color={colors.textWhite} />
          <Text style={styles.datePickerConfirmBtnText}>
            {l('Confirm Date', 'তারিখ নিশ্চিত করুন')}
          </Text>
        </TouchableOpacity>
      </AppModal>

      {/* Pinned Bottom CTA */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={handleConfirmDeposit} disabled={saving}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark" size={20} color={colors.surface} />
          <Text style={styles.confirmBtnText}>{l('Confirm Deposit', 'জমা নিশ্চিত করুন')}</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  closeBtn: {
    padding: 6,
  },
  headerTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.title,
    lineHeight: typography.lineHeight.title,
    color: colors.text,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  memberDetails: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.text,
  },
  memberSub: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  changeLink: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.primary,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    color: colors.text,
    marginBottom: 10,
    marginTop: 4,
  },
  monthPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  monthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 9999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  monthPillActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primarySoft,
  },
  monthPillText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text,
  },
  monthPillTextActive: {
    color: colors.primary,
    fontFamily: typography.fontFamily.bold,
  },
  amountCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  amountSectionLabel: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  amountHint: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  largeAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    minHeight: 56,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
  },
  largeCurrencySymbol: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.hero,
    lineHeight: typography.lineHeight.hero,
    color: colors.text,
    marginRight: 6,
  },
  largeAmountInput: {
    flex: 1,
    minWidth: 0,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.hero,
    lineHeight: typography.lineHeight.hero,
    color: colors.text,
    padding: 0,
  },
  greenUnderline: {
    height: 2,
    backgroundColor: colors.primary,
    marginTop: 6,
    marginBottom: 12,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  amountLabel: {
    flex: 1,
    minWidth: 0,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    color: colors.textSecondary,
  },
  amountVal: {
    flexShrink: 0,
    marginLeft: 12,
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    color: colors.text,
  },
  segmentedMethodTrack: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 9999,
    padding: 3,
    marginBottom: 16,
  },
  segmentedMethodBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
  },
  segmentedMethodBtnActive: {
    backgroundColor: colors.surface,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentedMethodText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
  },
  segmentedMethodTextActive: {
    color: colors.text,
    fontFamily: typography.fontFamily.bold,
  },
  segmentedMethodTextInactive: {
    color: colors.textSecondary,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  colLeft: {
    flex: 1,
  },
  colRight: {
    flex: 1,
  },
  fieldLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  inputBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    justifyContent: 'center',
  },
  inputText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    color: colors.text,
    padding: 0,
  },
  dateInputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
  },
  dateInputText: {
    flex: 1,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    color: colors.text,
    padding: 0,
    outlineStyle: 'none' as any,
  },
  calendarIconBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentGroup: {
    marginBottom: 16,
  },
  commentInputBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 68,
  },
  commentInput: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    color: colors.text,
    padding: 0,
    textAlignVertical: 'top',
    outlineStyle: 'none' as any,
  },
  deliveryCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  deliveryLabel: {
    marginLeft: 12,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    color: colors.text,
  },
  deliveryDivider: {
    height: 1,
    backgroundColor: colors.surfaceMuted,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    padding: 12,
    gap: 10,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.text,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.title,
    lineHeight: typography.lineHeight.title,
    color: colors.text,
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
    marginBottom: 12,
    gap: 8,
  },
  modalSearchInput: {
    flex: 1,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.text,
    padding: 0,
  },
  modalMemberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  modalMemberItemActive: {
    backgroundColor: colors.surfaceMuted,
  },
  duePill: {
    backgroundColor: colors.warningSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  duePillText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.tiny,
    lineHeight: typography.lineHeight.tiny,
    color: colors.warning,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.bg,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 9999,
    paddingVertical: 14,
    gap: 8,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  confirmBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.surface,
  },
  datePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  datePickerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  datePickerTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.base,
    color: colors.text,
  },
  datePickerCloseBtn: {
    padding: 4,
  },
  datePreviewBox: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    marginBottom: 14,
  },
  datePreviewLabel: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  datePreviewVal: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.base,
    color: colors.primary,
  },
  pickerColumnsRow: {
    flexDirection: 'row',
    gap: 8,
    height: 190,
    marginBottom: 16,
  },
  pickerCol: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: 10,
    padding: 6,
  },
  pickerColHeader: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 6,
  },
  pickerScrollView: {
    flex: 1,
  },
  pickerItem: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 3,
  },
  pickerItemSelected: {
    backgroundColor: colors.primarySoft,
  },
  pickerItemText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.caption,
    color: colors.text,
  },
  pickerItemTextSelected: {
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
  },
  datePickerConfirmBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  datePickerConfirmBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    color: colors.textWhite,
  },
});
