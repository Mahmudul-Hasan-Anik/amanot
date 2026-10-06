import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSomitiStore } from '../../../src/store/somitiStore';
import { useLanguage } from '../../../src/i18n/useLanguage';
import { safeBack } from '../../../src/utils/navigation';
import { AppModal } from '../../../src/components/AppModal';
import { toEnglishDigits } from '../../../src/lib/money';
import { colors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { getDepositMonthOptions, defaultSelectedMonths, MonthOption } from '../../../src/lib/months';
import { bnDate } from '../../../src/lib/api';

export default function RecordDepositScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { members, recordDeposit } = useSomitiStore();
  const { l, formatMoney, formatNum } = useLanguage();

  // Find selected member or default to করিম উদ্দিন (or first due member)
  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    (params.memberId as string) || (members.find((m) => m.status === 'due')?.id || members[0]?.id || '1')
  );
  const [showMemberModal, setShowMemberModal] = useState(false);

  const currentMember = members.find((m) => m.id === selectedMemberId) || members[0];

  const { somitiInfo } = useSomitiStore();
  const lateFeePerMonth = Number((somitiInfo as any).lateFee ?? 100) || 0;

  // Months this member can pay for (due months, current month, next month advance)
  const monthOptions: MonthOption[] = useMemo(() => getDepositMonthOptions(currentMember), [currentMember]);
  const [selectedMonths, setSelectedMonths] = useState<number[]>(() => defaultSelectedMonths(getDepositMonthOptions(currentMember)));

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bkash' | 'nagad' | 'bank'>('cash');
  const [trxId, setTrxId] = useState('');
  const todayStr = new Date().toISOString().slice(0, 10);
  const date = l(
    new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    bnDate(todayStr)
  );

  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [sendSMS, setSendSMS] = useState(false);
  const [sendPush, setSendPush] = useState(true);

  const rate = currentMember?.monthlyAmount || 0;
  const partialCredit = Number((currentMember as any)?.partialCredit || 0);
  const calc = (sel: number[], r: number) => {
    const chosen = monthOptions.filter((o) => sel.includes(o.index));
    const fee = chosen.filter((o) => o.overdue).length * lateFeePerMonth;
    return { count: chosen.length, fee, total: Math.max(0, chosen.length * r + fee - partialCredit) };
  };
  const { count: monthsCount, fee: lateFee } = calc(selectedMonths, rate);
  const baseAmount = monthsCount * rate;
  const defaultTotal = calc(selectedMonths, rate).total;

  // Fully editable amount state (defaults to calculated total, but user can edit e.g. 1500 or 5000)
  const [customAmount, setCustomAmount] = useState<string>(String(defaultTotal));

  const toggleMonth = (idx: number) => {
    const next = selectedMonths.includes(idx) ? selectedMonths.filter((i) => i !== idx) : [...selectedMonths, idx].sort((a, b) => a - b);
    setSelectedMonths(next);
    setCustomAmount(String(calc(next, rate).total));
  };

  // members arrive from the server after mount: pick a default once they do
  useEffect(() => {
    if (!members.find((m) => m.id === selectedMemberId) && members.length) {
      setSelectedMemberId((params.memberId as string) || members.find((m) => m.dueAmount > 0)?.id || members[0].id);
    }
  }, [members.length]);

  // reset months + amount whenever the member changes
  useEffect(() => {
    if (currentMember) resetForMember(currentMember.id);
  }, [currentMember?.id]);

  const handleSelectMember = (mId: string) => {
    setSelectedMemberId(mId);
    setShowMemberModal(false);
  };

  const resetForMember = (mId: string) => {
    const m = members.find((x) => x.id === mId);
    const opts = getDepositMonthOptions(m);
    const sel = defaultSelectedMonths(opts);
    setSelectedMonths(sel);
    const chosen = opts.filter((o) => sel.includes(o.index));
    const fee = chosen.filter((o) => o.overdue).length * lateFeePerMonth;
    const credit = Number((m as any)?.partialCredit || 0);
    setCustomAmount(String(Math.max(0, chosen.length * (m?.monthlyAmount || 0) + fee - credit)));
  };

  const handleConfirmDeposit = () => {
    const cleanAmount = parseInt(toEnglishDigits(customAmount).replace(/\D/g, ''), 10);
    if (!cleanAmount || cleanAmount <= 0) {
      Alert.alert(
        l('Invalid Amount', 'ভুল টাকার পরিমাণ'),
        l('Please enter a valid deposit amount.', 'অনুগ্রহ করে সঠিক জমার টাকার পরিমাণ লিখুন।')
      );
      return;
    }

    if (!currentMember) {
      Alert.alert(l('No member', 'সদস্য নেই'), l('Please add a member first.', 'আগে একজন সদস্য যোগ করুন।'));
      return;
    }
    if (paymentMethod !== 'cash' && !trxId.trim()) {
      Alert.alert(l('Transaction ID needed', 'ট্রানজ্যাকশন আইডি দিন'), l('Enter the TrxID for this payment.', 'এই পেমেন্টের TrxID লিখুন।'));
      return;
    }
    const monthNames = monthOptions.filter((o) => selectedMonths.includes(o.index)).map((o) => o.bn);

    const newTxn = recordDeposit({
      memberId: currentMember.id,
      months: monthNames,
      baseAmount: Math.max(0, cleanAmount - Math.min(lateFee, cleanAmount)),
      lateFee: Math.min(lateFee, cleanAmount),
      totalAmount: cleanAmount,
      paymentMethod,
      trxId: paymentMethod !== 'cash' ? trxId : undefined,
      note: monthNames.length ? `${monthNames.join(', ')} কিস্তি` : 'অতিরিক্ত / সাধারণ জমা',
      sendWhatsApp,
      sendSMS,
    });

    router.replace(`/(admin)/receipt/${newTxn.id}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F7F2" />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => safeBack(router, '/(admin)/(tabs)/collection')}
          style={styles.closeBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={24} color="#1E293B" />
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
          <View style={styles.memberAvatar}>
            <Text style={styles.avatarText}>{currentMember?.name?.charAt(0) || 'S'}</Text>
          </View>
          <View style={styles.memberDetails}>
            <Text style={styles.memberName}>{currentMember?.name}</Text>
            <Text style={styles.memberSub}>
              {currentMember?.code} · {l('Monthly', 'মাসিক')} {formatMoney(currentMember?.monthlyAmount || 2000)}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowMemberModal(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.changeLink}>{l('Change', 'বদলান')}</Text>
          </TouchableOpacity>
        </View>

        {/* 1. Month Selection */}
        <Text style={styles.sectionTitle}>{l('Which month deposit?', 'কোন মাসের জমা?')}</Text>
        <View style={styles.monthPillsRow}>
          {monthOptions.length === 0 && (
            <Text style={styles.amountHintText}>
              {l('No dues. Amount will be saved as general deposit.', 'কোনো বকেয়া নেই। টাকা সাধারণ জমা হিসেবে যোগ হবে।')}
            </Text>
          )}
          {monthOptions.map((o) => {
            const active = selectedMonths.includes(o.index);
            const label =
              o.kind === 'due'
                ? l(`${o.en} Due`, `${o.bn} বকেয়া`)
                : o.kind === 'advance'
                ? l(`${o.en} Advance`, `${o.bn} অগ্রিম`)
                : l(o.en, o.bn);
            return (
              <TouchableOpacity
                key={o.index}
                style={[styles.monthPill, active && styles.monthPillActive]}
                onPress={() => toggleMonth(o.index)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={active ? 'checkmark-circle' : 'ellipse-outline'}
                  size={16}
                  color={active ? '#0F766E' : '#94A3B8'}
                />
                <Text style={[styles.monthPillText, active && styles.monthPillTextActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 2. Amount Breakdown & Editable Amount Card */}
        <View style={styles.amountCard}>
          <Text style={styles.amountSectionLabel}>{l('Deposit Amount', 'পরিমাণ')}</Text>

          {/* Large Amount Input Container */}
          <View style={styles.largeAmountContainer}>
            <Text style={styles.largeCurrencySymbol}>৳</Text>
            <TextInput
              style={styles.largeAmountInput}
              value={customAmount}
              onChangeText={(t) => setCustomAmount(toEnglishDigits(t))}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <Text style={styles.amountHintText}>
            {l('Editable: type custom, partial or advance amount', 'সম্পাদনযোগ্য: আংশিক বা অগ্রিম হলে পরিবর্তন করতে পারেন')}
          </Text>

          <View style={styles.divider} />

          {/* Breakdown Lines */}
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>
              {l(`Regular deposit (${monthsCount} mo × ${formatMoney(rate)})`, `নিয়মিত জমা (${formatNum(monthsCount)} মাস × ${formatMoney(rate)})`)}
            </Text>
            <Text style={styles.amountVal}>{formatMoney(baseAmount)}</Text>
          </View>

          {lateFee > 0 && (
            <View style={styles.amountRow}>
              <View style={styles.lateFeeLabelRow}>
                <Text style={styles.amountLabel}>{l('Late fee', 'বিলম্ব ফি')}</Text>
                <View style={styles.lateFeeBadge}>
                  <Text style={styles.lateFeeBadgeText}>+{formatMoney(lateFee)}</Text>
                </View>
              </View>
              <Text style={styles.amountVal}>+{formatMoney(lateFee)}</Text>
            </View>
          )}
        </View>

        {partialCredit > 0 && (
          <Text style={[styles.amountHintText, { marginTop: -8, marginBottom: 12 }]}>
            {l(`Previous partial payment ${formatMoney(partialCredit)} adjusted`, `আগের আংশিক জমা ${formatMoney(partialCredit)} সমন্বয় করা হয়েছে`)}
          </Text>
        )}

        {/* 3. Payment Method */}
        <Text style={styles.sectionTitle}>{l('Payment Method', 'পরিশোধের মাধ্যম')}</Text>
        <View style={styles.methodGrid}>
          <TouchableOpacity
            style={[styles.methodBtn, paymentMethod === 'cash' && styles.methodBtnActive]}
            onPress={() => setPaymentMethod('cash')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="cash-outline"
              size={20}
              color={paymentMethod === 'cash' ? '#0F766E' : '#64748B'}
            />
            <Text style={[styles.methodBtnText, paymentMethod === 'cash' && styles.methodBtnTextActive]}>
              {l('Cash', 'নগদ টাকা')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.methodBtn, paymentMethod === 'bkash' && styles.methodBtnActive]}
            onPress={() => setPaymentMethod('bkash')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="phone-portrait-outline"
              size={20}
              color={paymentMethod === 'bkash' ? '#0F766E' : '#64748B'}
            />
            <Text style={[styles.methodBtnText, paymentMethod === 'bkash' && styles.methodBtnTextActive]}>
              {l('bKash', 'বিকাশ')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.methodBtn, paymentMethod === 'nagad' && styles.methodBtnActive]}
            onPress={() => setPaymentMethod('nagad')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="flash-outline"
              size={20}
              color={paymentMethod === 'nagad' ? '#0F766E' : '#64748B'}
            />
            <Text style={[styles.methodBtnText, paymentMethod === 'nagad' && styles.methodBtnTextActive]}>
              {l('Nagad (App)', 'নগদ (অ্যাপ)')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.methodBtn, paymentMethod === 'bank' && styles.methodBtnActive]}
            onPress={() => setPaymentMethod('bank')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="business-outline"
              size={20}
              color={paymentMethod === 'bank' ? '#0F766E' : '#64748B'}
            />
            <Text style={[styles.methodBtnText, paymentMethod === 'bank' && styles.methodBtnTextActive]}>
              {l('Bank', 'ব্যাংক')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* TrxID / Date Input */}
        {paymentMethod !== 'cash' && (
          <View style={styles.inputCard}>
            <Text style={styles.inputCardLabel}>{l('Transaction ID (TrxID)', 'ট্রানজ্যাকশন আইডি (TrxID)')}</Text>
            <TextInput
              style={styles.textInput}
              value={trxId}
              onChangeText={setTrxId}
              placeholder={l("e.g. BK7X29QM4L", "যেমন: BK7X29QM4L")}
              placeholderTextColor="#94A3B8"
            />
          </View>
        )}

        <View style={styles.inputCard}>
          <Text style={styles.inputCardLabel}>{l('Deposit Date', 'জমার তারিখ')}</Text>
          <Text style={styles.textInput}>{date}</Text>
        </View>

        {/* 4. Notification Channels */}
        <Text style={styles.sectionTitle}>{l('Receipt Delivery Method', 'রসিদ পাঠানোর মাধ্যম')}</Text>
        <View style={styles.notifyCard}>
          <TouchableOpacity
            style={styles.notifyRow}
            onPress={() => setSendWhatsApp(!sendWhatsApp)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={sendWhatsApp ? 'checkbox' : 'square-outline'}
              size={20}
              color={sendWhatsApp ? '#0F766E' : '#94A3B8'}
            />
            <Text style={styles.notifyLabel}>{l('Send receipt via WhatsApp', 'হোয়াটসঅ্যাপে রসিদ পাঠান')}</Text>
          </TouchableOpacity>

          <View style={styles.dividerLight} />

          <TouchableOpacity
            style={styles.notifyRow}
            onPress={() => setSendSMS(!sendSMS)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={sendSMS ? 'checkbox' : 'square-outline'}
              size={20}
              color={sendSMS ? '#0F766E' : '#94A3B8'}
            />
            <Text style={styles.notifyLabel}>{l('Send SMS (Optional)', 'এসএমএস পাঠান (ঐচ্ছিক)')}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Member Selection Modal */}
      <AppModal
        visible={showMemberModal}
        onClose={() => setShowMemberModal(false)}
      >
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{l('Select Member', 'সদস্য নির্বাচন করুন')}</Text>
          <TouchableOpacity onPress={() => setShowMemberModal(false)}>
            <Ionicons name="close" size={24} color="#1E293B" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          style={{ maxHeight: 350 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.modalMemberItem,
                item.id === selectedMemberId && styles.modalMemberItemActive,
              ]}
              onPress={() => handleSelectMember(item.id)}
            >
              <View style={styles.memberAvatar}>
                <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.memberName}>{item.name}</Text>
                <Text style={styles.memberSub}>
                  {item.code} · {formatMoney(item.monthlyAmount)}
                </Text>
              </View>
              {item.dueAmount > 0 && (
                <Text style={{ fontSize: 12, color: '#DC2626', fontWeight: '600' }}>
                  {l('Due', 'বাকি')} {formatMoney(item.dueAmount)}
                </Text>
              )}
            </TouchableOpacity>
          )}
        />
      </AppModal>

      {/* Bottom Confirm Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={handleConfirmDeposit}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark" size={20} color="#FFFFFF" />
          <Text style={styles.confirmBtnText}>{l('Confirm Deposit', 'জমা নিশ্চিত করুন')}</Text>
        </TouchableOpacity>
      </View>
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
  closeBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 18,
    color: '#1E293B',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#134E4A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 18,
    color: '#FFFFFF',
  },
  memberDetails: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 15,
    color: '#1E293B',
  },
  memberSub: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#64748B',
  },
  changeLink: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 13,
    color: '#0F766E',
  },
  sectionTitle: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 14,
    color: '#334155',
    marginBottom: 8,
  },
  monthPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  monthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
  },
  monthPillActive: {
    backgroundColor: '#CCFBF1',
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  monthPillText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 12,
    color: '#64748B',
  },
  monthPillTextActive: {
    fontFamily: 'HindSiliguri-Bold',
    color: '#0F766E',
  },
  amountCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  amountLabel: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 13,
    color: '#64748B',
  },
  amountVal: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 14,
    color: '#1E293B',
  },
  lateFeeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lateFeeBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  lateFeeBadgeText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 11,
    color: '#D97706',
  },
  amountSectionLabel: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  largeAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    width: '100%',
  },
  largeCurrencySymbol: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: typography.size.headline,
    lineHeight: typography.lineHeight.headline,
    color: colors.primary,
    marginRight: 8,
  },
  largeAmountInput: {
    flex: 1,
    fontFamily: 'HindSiliguri-Bold',
    fontSize: typography.size.headline,
    lineHeight: typography.lineHeight.headline,
    color: colors.primary,
    padding: 0,
  },
  amountHintText: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.textSecondary,
    marginTop: 6,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  methodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  methodBtn: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  methodBtnActive: {
    borderColor: '#0F766E',
    backgroundColor: '#CCFBF1',
  },
  methodBtnText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 13,
    color: '#475569',
  },
  methodBtnTextActive: {
    fontFamily: 'HindSiliguri-Bold',
    color: '#0F766E',
  },
  inputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  inputCardLabel: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 12,
    color: '#64748B',
    marginBottom: 6,
  },
  textInput: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 14,
    color: '#1E293B',
    height: 38,
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
    paddingVertical: 4,
  },
  notifyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  notifyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  notifyLabel: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 13,
    color: '#334155',
  },
  dividerLight: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#134E4A',
    borderRadius: 12,
    paddingVertical: 14,
  },
  confirmBtnText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 18,
    color: '#1E293B',
  },
  modalMemberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalMemberItemActive: {
    backgroundColor: '#CCFBF1',
  },
});
