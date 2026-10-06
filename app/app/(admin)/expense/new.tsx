import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSomitiStore } from '../../../src/store/somitiStore';
import { toEnglishDigits, toBengaliDigits } from '../../../src/lib/bengali';
import { useLanguage } from '../../../src/i18n/useLanguage';
import { safeBack } from '../../../src/utils/navigation';
import { AppModal } from '../../../src/components/AppModal';
import { useAuthStore } from '../../../src/features/auth/authStore';
import { bnDate } from '../../../src/lib/api';

export default function NewExpenseScreen() {
  const router = useRouter();
  const { addExpense, somitiInfo, cashAccounts } = useSomitiStore();
  const { l, formatMoney, formatNum } = useLanguage();

  const { currentUser, actualRole } = useAuthStore();
  const canApproveOwn = actualRole === 'super_admin' || actualRole === 'admin';
  const [amount, setAmount] = useState('');
  const [selectedCategoryKey, setSelectedCategoryKey] = useState('meeting');
  const [source, setSource] = useState<'treasurer' | 'bank' | 'bkash'>('treasurer');
  const todayStr = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(
    l(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), bnDate(todayStr))
  );
  const [spender, setSpender] = useState(currentUser?.name || '');
  const [reason, setReason] = useState('');
  const [showLimitModal, setShowLimitModal] = useState(false);

  const expenseLimit = Number(somitiInfo?.expenseApprovalLimit) || 10000;

  const EXPENSE_CATEGORIES = [
    { key: 'meeting', en: 'Meeting & Refreshment', bn: 'সভা ও আপ্যায়ন' },
    { key: 'travel', en: 'Travel', bn: 'যাতায়াত' },
    { key: 'rent', en: 'Office Rent', bn: 'অফিস ভাড়া' },
    { key: 'sms', en: 'SMS & App', bn: 'এসএমএস ও অ্যাপ' },
    { key: 'stationery', en: 'Stationery', bn: 'স্টেশনারি' },
    { key: 'legal', en: 'Legal Fees', bn: 'আইনি ফি' },
    { key: 'honorarium', en: 'Field Staff Honorarium', bn: 'মাঠকর্মী সম্মানী' },
    { key: 'others', en: 'Others', bn: 'অন্যান্য' },
  ];

  const processExpense = (status: 'approved' | 'pending') => {
    const cleanAmount = Number(toEnglishDigits(amount.replace(/[^\d]/g, ''))) || 0;
    const currentCat = EXPENSE_CATEGORIES.find((c) => c.key === selectedCategoryKey);
    const catName = l(currentCat?.en || 'Meeting & Refreshment', currentCat?.bn || 'সভা ও আপ্যায়ন');
    const voucherNo = `V-${Math.floor(1000 + Math.random() * 9000)}`;
    const paymentSource = source === 'bank' ? l('Bank', 'ব্যাংক') : source === 'bkash' ? l('bKash', 'বিকাশ') : l('Cash In Hand', 'কোষাধ্যক্ষের হাত (হাতে নগদ)');

    addExpense({
      title: reason,
      category: catName,
      amount: cleanAmount,
      paymentSource,
      voucherNo,
      note: `${l('Spender:', 'ব্যয়কারী:')} ${spender}`,
      status,
    });

    setShowLimitModal(false);

    if (status === 'pending') {
      Alert.alert(
        l('Submitted for Approval', 'অনুমোদনের জন্য পাঠানো হয়েছে'),
        l(
          `Expense ${voucherNo} for ${formatMoney(cleanAmount)} has been submitted to the management committee for review.`,
          `ভাউচার নং ${voucherNo} - ${formatMoney(cleanAmount)} টাকার খরচটি পরিচালনা কমিটির অনুমোদনের অপেক্ষমাণ তালিকায় পাঠানো হয়েছে।`
        ),
        [{ text: l('View Approvals', 'অনুমোদন তালিকা দেখুন'), onPress: () => router.replace('/(admin)/approvals') }]
      );
    } else {
      Alert.alert(
        l('Expense Saved', 'খরচ সংরক্ষিত হয়েছে'),
        `${l('Voucher No', 'ভাউচার নং')} ${voucherNo} - ${formatMoney(cleanAmount)} ${l('has been recorded.', 'টাকা খরচ লিপিবদ্ধ করা হয়েছে।')}`,
        [{ text: l('OK', 'ঠিক আছে'), onPress: () => router.replace('/(admin)/(tabs)') }]
      );
    }
  };

  const handleSubmit = () => {
    const cleanAmount = Number(toEnglishDigits(amount.replace(/[^\d]/g, ''))) || 0;
    if (cleanAmount <= 0) {
      Alert.alert(l('Error', 'ত্রুটি'), l('Please enter a valid expense amount.', 'অনুগ্রহ করে খরচের সঠিক পরিমাণ লিখুন।'));
      return;
    }
    if (!reason.trim()) {
      Alert.alert(l('Error', 'ত্রুটি'), l('Please enter reason or description of the expense.', 'অনুগ্রহ করে খরচের কারণ বা বিবরণ লিখুন।'));
      return;
    }

    if (cleanAmount > expenseLimit && actualRole !== 'super_admin') {
      setShowLimitModal(true);
      return;
    }

    // the paying account must have enough money (server checks too)
    const accType = source === 'bank' ? 'bank' : source === 'bkash' ? 'bkash' : 'cashier';
    const acc = cashAccounts.find((a) => a.type === accType);
    if (canApproveOwn && acc && acc.amount < cleanAmount) {
      Alert.alert(
        l('Insufficient balance', 'পর্যাপ্ত ব্যালেন্স নেই'),
        l(`${acc.name} has only ${formatMoney(acc.amount)}.`, `${acc.name}-এ আছে মাত্র ${formatMoney(acc.amount)}।`)
      );
      return;
    }

    // cashier / field worker entries always go to the committee (maker-checker)
    if (!canApproveOwn) {
      processExpense('pending');
      return;
    }

    processExpense('approved');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F7F2" />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => safeBack(router, '/(admin)/finance')}
          style={styles.closeBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{l('Record Expense', 'খরচ লিখুন')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Amount Box */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>{l('Amount (BDT)', 'পরিমাণ (টাকা)')}</Text>
          <TextInput
            style={styles.amountDisplay}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor="#94A3B8"
          />
          <View style={styles.amountUnderline} />
          <View style={styles.limitBadge}>
            <Ionicons name="shield-checkmark-outline" size={14} color="#0F766E" />
            <Text style={styles.limitBadgeText}>
              {l('Max limit without committee approval:', 'অনুমোদনহীন ব্যয়ের সর্বোচ্চ সীমা:')} {formatMoney(expenseLimit)}
            </Text>
          </View>
        </View>

        {/* Section: খাত */}
        <Text style={styles.sectionTitle}>{l('Category', 'খাত')}</Text>
        <View style={styles.categoriesGrid}>
          {EXPENSE_CATEGORIES.map((cat) => {
            const isSelected = selectedCategoryKey === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                onPress={() => setSelectedCategoryKey(cat.key)}
                activeOpacity={0.8}
              >
                {isSelected && <Ionicons name="checkmark" size={14} color="#0F766E" />}
                <Text style={[styles.categoryText, isSelected && styles.categoryTextActive]}>
                  {l(cat.en, cat.bn)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Date and Spender Two Inputs Row */}
        <View style={styles.twoInputsRow}>
          <View style={styles.inputCol}>
            <Text style={styles.inputLabel}>{l('Date', 'তারিখ')}</Text>
            <View style={styles.pickerBox}>
              <TextInput
                style={styles.pickerText}
                value={date}
                onChangeText={setDate}
              />
              <Ionicons name="calendar-outline" size={18} color="#64748B" />
            </View>
          </View>

          <View style={styles.inputCol}>
            <Text style={styles.inputLabel}>{l('Spender', 'ব্যয়কারী')}</Text>
            <View style={styles.pickerBox}>
              <TextInput
                style={styles.pickerText}
                value={spender}
                onChangeText={setSpender}
              />
              <Ionicons name="person-outline" size={18} color="#64748B" />
            </View>
          </View>
        </View>

        {/* Section: পরিশোধের উৎস */}
        <Text style={styles.sectionTitle}>{l('Payment Source', 'পরিশোধের উৎস')}</Text>
        <View style={styles.segmentedContainer}>
          <TouchableOpacity
            style={[styles.segmentBtn, source === 'treasurer' && styles.segmentBtnActive]}
            onPress={() => setSource('treasurer')}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentText, source === 'treasurer' && styles.segmentTextActive]}>
              {l("Treasurer's Hand", 'কোষাধ্যক্ষের হাতে')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, source === 'bank' && styles.segmentBtnActive]}
            onPress={() => setSource('bank')}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentText, source === 'bank' && styles.segmentTextActive]}>
              {l('Bank', 'ব্যাংক')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, source === 'bkash' && styles.segmentBtnActive]}
            onPress={() => setSource('bkash')}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentText, source === 'bkash' && styles.segmentTextActive]}>
              {l('bKash', 'বিকাশ')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Section: কারণ */}
        <Text style={styles.sectionTitle}>{l('Reason / Description', 'কারণ')}</Text>
        <View style={styles.reasonCard}>
          <TextInput
            style={styles.reasonInput}
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={3}
            placeholder={l('Enter expense description', 'খরচের বিবরণ লিখুন')}
            placeholderTextColor="#94A3B8"
          />
        </View>

        {/* Section: রসিদের ছবি যোগ করুন */}
        <TouchableOpacity
          style={styles.voucherDashedBox}
          onPress={() => Alert.alert(l('Attach Photo', 'ছবি যুক্ত করুন'), l('Receipt photo captured from camera or gallery.', 'ভাউচারের ছবি তোলা বা গ্যালারি থেকে যোগ করা সম্পন্ন হয়েছে'))}
          activeOpacity={0.8}
        >
          <Ionicons name="camera-outline" size={26} color="#0F766E" />
          <Text style={styles.voucherTitle}>{l('Add Receipt Photo', 'রসিদের ছবি যোগ করুন')}</Text>
          <Text style={styles.voucherSub}>{l('Attach voucher for expenses over ৳1,000', '৳১,০০০ এর বেশি ব্যয়ে ভাউচার যুক্ত রাখুন')}</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Bottom Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleSubmit}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark" size={18} color="#FFFFFF" />
          <Text style={styles.submitBtnText}>{l('Save Expense', 'খরচ সংরক্ষণ করুন')}</Text>
        </TouchableOpacity>
      </View>

      {/* Expense Approval Limit Modal */}
      <AppModal
        visible={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        title={l('Expense Limit Warning', 'ব্যয় অনুমোদন সীমা সতর্কতা')}
      >
        <View style={styles.modalContentBox}>
          <View style={styles.modalAlertIconBox}>
            <Ionicons name="warning-outline" size={32} color="#D97706" />
          </View>

          <Text style={styles.modalAlertTitle}>
            {l('Committee Approval Required', 'পরিচালনা পর্ষদের অনুমোদন প্রয়োজন')}
          </Text>

          <Text style={styles.modalAlertDesc}>
            {l(
              `The somiti's auto-approval limit is ${formatMoney(expenseLimit)}. Current expense is ${formatMoney(Number(toEnglishDigits(amount.replace(/[^\d]/g, ''))) || 0)}.`,
              `সমিতির নির্ধারিত একক ব্যয়ের সর্বোচ্চ সীমা ${formatMoney(expenseLimit)}। বর্তমান খরচের পরিমাণ ${formatMoney(Number(toEnglishDigits(amount.replace(/[^\d]/g, ''))) || 0)}।`
            )}
          </Text>

          <Text style={styles.modalAlertSub}>
            {l(
              'Expenses above the threshold must be submitted to the committee for review before funds can be released.',
              'সমিতির নীতিমালা অনুযায়ী এই পরিমাণের খরচ সরাসরি অনুমোদনযোগ্য নয়। এটি পরিচালনা কমিটির অনুমোদনের অপেক্ষমাণ তালিকায় পাঠাতে হবে।'
            )}
          </Text>

          <View style={styles.modalActionsCol}>
            <TouchableOpacity
              style={styles.modalPrimaryBtn}
              onPress={() => processExpense('pending')}
              activeOpacity={0.85}
            >
              <Ionicons name="paper-plane-outline" size={18} color="#FFFFFF" />
              <Text style={styles.modalPrimaryBtnText}>
                {l('Submit for Committee Approval', 'অনুমোদনের জন্য পাঠান')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalSecondaryBtn}
              onPress={() => setShowLimitModal(false)}
              activeOpacity={0.85}
            >
              <Ionicons name="create-outline" size={18} color="#0F766E" />
              <Text style={styles.modalSecondaryBtnText}>
                {l('Adjust Expense Amount', 'পরিমাণ সংশোধন করুন')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </AppModal>
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
  amountCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  amountLabel: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 13,
    color: '#64748B',
    marginBottom: 6,
  },
  amountDisplay: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 32,
    color: '#1E293B',
    textAlign: 'center',
    minWidth: 160,
  },
  amountUnderline: {
    width: 80,
    height: 2,
    backgroundColor: '#0F766E',
    marginTop: 4,
  },
  sectionTitle: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 14,
    color: '#334155',
    marginBottom: 8,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryChipActive: {
    borderColor: '#0F766E',
    backgroundColor: '#CCFBF1',
  },
  categoryText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 12,
    color: '#475569',
  },
  categoryTextActive: {
    fontFamily: 'HindSiliguri-Bold',
    color: '#0F766E',
  },
  twoInputsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  inputCol: {
    flex: 1,
  },
  inputLabel: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 12,
    color: '#64748B',
    marginBottom: 6,
  },
  pickerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  pickerText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 13,
    color: '#1E293B',
    flex: 1,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  segmentText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 12,
    color: '#64748B',
  },
  segmentTextActive: {
    fontFamily: 'HindSiliguri-Bold',
    color: '#0F766E',
  },
  reasonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 16,
  },
  reasonInput: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 13,
    color: '#1E293B',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  voucherDashedBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#99F6E4',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  voucherTitle: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 13,
    color: '#0F766E',
    marginTop: 6,
  },
  voucherSub: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#134E4A',
    borderRadius: 12,
    paddingVertical: 14,
  },
  submitBtnText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },
  limitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 10,
  },
  limitBadgeText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 11,
    color: '#0F766E',
  },
  modalContentBox: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  modalAlertIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalAlertTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 17,
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalAlertDesc: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 14,
    color: '#0F766E',
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 20,
  },
  modalAlertSub: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  modalActionsCol: {
    width: '100%',
    gap: 10,
  },
  modalPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F766E',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  modalPrimaryBtnText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  modalSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#0F766E',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  modalSecondaryBtnText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#0F766E',
  },
});
