import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSomitiStore } from '../../../src/store/somitiStore';
import { useAuthStore } from '../../../src/features/auth/authStore';
import { DateField } from '../../../src/components/DateField';
import { isoToday } from '../../../src/lib/investment';
import { uuid } from '../../../src/lib/api';
import { toEnglishDigits, toBengaliDigits } from '../../../src/lib/bengali';
import { useLanguage } from '../../../src/i18n/useLanguage';
import { safeBack } from '../../../src/utils/navigation';

import { colors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';

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


export default function NewExpenseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ amount?: string; title?: string }>();
  const { addExpense, members } = useSomitiStore();
  const me = useAuthStore(s => s.currentUser);
  // People who usually spend for the society: staff first, then everyone else.
  const spenders = [...members.filter(m => (m as any).appRole && (m as any).appRole !== 'member'), ...members.filter(m => !(m as any).appRole || (m as any).appRole === 'member')];
  const { l, isBengali, formatMoney } = useLanguage();

  const [rawAmount, setRawAmount] = useState(params.amount ? String(Math.round(Number(params.amount))) : '');
  const [selectedCategoryKey, setSelectedCategoryKey] = useState('meeting');
  const [source, setSource] = useState<'treasurer' | 'bank' | 'bkash'>('treasurer');
  const [date, setDate] = useState(isoToday());
  const [selectedSpender, setSelectedSpender] = useState<string>(me?.name || '');
  const requestId = React.useRef(uuid());
  const [showSpenderModal, setShowSpenderModal] = useState(false);
  const [reason, setReason] = useState(params.title || '');
  const [hasReceipt, setHasReceipt] = useState(false);

  const numericAmount = Number(toEnglishDigits(rawAmount).replace(/[^0-9.]/g, '')) || 0;

  const handleAmountChange = (val: string) => {
    const clean = toEnglishDigits(val).replace(/[^\d]/g, '');
    setRawAmount(clean);
  };

  const handleReceiptToggle = () => {
    const nextState = !hasReceipt;
    setHasReceipt(nextState);
    Alert.alert(
      l('Receipt Attachment', 'রসিদ সংযুক্তি'),
      nextState
        ? l('Receipt photo attached successfully.', 'রসিদের ছবি সফলভাবে যোগ করা হয়েছে।')
        : l('Receipt removed.', 'রসিদ সরানো হয়েছে।')
    );
  };

  const [saving, setSaving] = useState(false);
  const handleSubmit = async () => {
    if (saving) return;
    if (numericAmount <= 0) {
      Alert.alert(
        l('Error', 'ত্রুটি'),
        l('Please enter a valid expense amount.', 'অনুগ্রহ করে খরচের সঠিক পরিমাণ লিখুন।')
      );
      return;
    }
    if (!reason.trim()) {
      Alert.alert(
        l('Error', 'ত্রুটি'),
        l('Please enter a reason or description.', 'অনুগ্রহ করে খরচের কারণ বা বিবরণ লিখুন।')
      );
      return;
    }

    const currentCat = EXPENSE_CATEGORIES.find((c) => c.key === selectedCategoryKey);
    const catName = isBengali ? (currentCat?.bn || 'সভা ও আপ্যায়ন') : (currentCat?.en || 'Meeting & Refreshment');
    const voucherNo = '';
    const paymentSource =
      source === 'bank'
        ? l('Bank', 'ব্যাংক')
        : source === 'bkash'
        ? l('bKash', 'বিকাশ')
        : l("Treasurer's Hand", 'কোষাধ্যক্ষের হাতে');

    const status = 'approved' as const;
    const spenderName = selectedSpender;

    setSaving(true);
    try {
    const saved = await addExpense({
      title: reason,
      category: catName,
      amount: numericAmount,
      paymentSource,
      voucherNo,
      note: spenderName ? `${l('Spender:', 'ব্যয়কারী:')} ${spenderName}` : undefined,
      status,
      date,
      spender: spenderName,
      id: requestId.current,
    });

    void saved;
    Alert.alert(
      l('Expense saved', 'খরচ সংরক্ষণ হয়েছে'),
      l(`${formatMoney(numericAmount)} for "${reason.trim()}" is in the khata.`, `"${reason.trim()}" — ${formatMoney(numericAmount)} খাতায় উঠেছে।`),
      [
        { text: l('Another entry', 'আরেকটা এন্ট্রি'), onPress: () => { requestId.current = uuid(); setRawAmount(''); setReason(''); } },
        { text: l('Done', 'ঠিক আছে'), onPress: () => router.replace('/(admin)/finance') },
      ]
    );
    } catch (e: any) { Alert.alert(l('Save failed', 'সংরক্ষণ ব্যর্থ'), e.message); } finally { setSaving(false); }
  };

  const formattedAmountDisplay = numericAmount
    ? (isBengali
        ? toBengaliDigits(numericAmount.toLocaleString('en-IN'))
        : numericAmount.toLocaleString('en-US'))
    : '';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => safeBack(router, '/(admin)/finance')}
          style={styles.closeBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{l('Record Expense', 'খরচ লিখুন')}</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Amount Hero Card */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>{l('Amount', 'পরিমাণ')}</Text>
          <View style={styles.amountInputRow}>
            <Text style={styles.currencySymbol}>{l('৳', '৳')}</Text>
            <TextInput
              style={styles.amountInput}
              value={formattedAmountDisplay || (isBengali ? toBengaliDigits(rawAmount) : rawAmount)}
              onChangeText={handleAmountChange}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
              selectionColor={colors.primary}
            />
          </View>
          <View style={styles.amountUnderline} />
        </View>

        {/* Category Section */}
        <Text style={styles.sectionLabel}>{l('Category', 'খাত')}</Text>
        <View style={styles.categoriesWrap}>
          {EXPENSE_CATEGORIES.map((cat) => {
            const isSelected = selectedCategoryKey === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                onPress={() => setSelectedCategoryKey(cat.key)}
                activeOpacity={0.8}
              >
                {isSelected && (
                  <Ionicons name="checkmark" size={14} color={colors.primary} style={styles.chipCheckIcon} />
                )}
                <Text style={[styles.categoryText, isSelected && styles.categoryTextActive]}>
                  {isBengali ? cat.bn : cat.en}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Date & Spender 2-Column Row */}
        <View style={styles.twoColRow}>
          {/* Date Column */}
          <View style={styles.colHalf}>
            <DateField label={l('Date', 'তারিখ')} value={date} max={isoToday()} onChange={setDate} />
          </View>

          {/* Spender Column */}
          <View style={styles.colHalf}>
            <Text style={styles.colLabel}>{l('Spender', 'ব্যয়কারী')}</Text>
            <TouchableOpacity
              style={styles.fieldBox}
              onPress={() => setShowSpenderModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.fieldText} numberOfLines={1}>
                {selectedSpender || l('Choose', 'বাছুন')}
              </Text>
              <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Payment Source Section */}
        <Text style={styles.sectionLabel}>{l('Payment Source', 'পরিশোধের উৎস')}</Text>
        <View style={styles.sourceSegmentTrack}>
          <TouchableOpacity
            style={[styles.sourceSegmentBtn, source === 'treasurer' && styles.sourceSegmentBtnActive]}
            onPress={() => setSource('treasurer')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.sourceSegmentText,
                source === 'treasurer' && styles.sourceSegmentTextActive,
              ]}
            >
              {l("Treasurer's Hand", 'কোষাধ্যক্ষের হাতে')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sourceSegmentBtn, source === 'bank' && styles.sourceSegmentBtnActive]}
            onPress={() => setSource('bank')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.sourceSegmentText,
                source === 'bank' && styles.sourceSegmentTextActive,
              ]}
            >
              {l('Bank', 'ব্যাংক')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sourceSegmentBtn, source === 'bkash' && styles.sourceSegmentBtnActive]}
            onPress={() => setSource('bkash')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.sourceSegmentText,
                source === 'bkash' && styles.sourceSegmentTextActive,
              ]}
            >
              {l('bKash', 'বিকাশ')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Reason / Purpose Section */}
        <Text style={styles.sectionLabel}>{l('Reason', 'কারণ')}</Text>
        <View style={styles.reasonCard}>
          <TextInput
            style={styles.reasonInput}
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={2}
            placeholder={l('Enter purpose of expense', 'খরচের বিবরণ বা কারণ লিখুন')}
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        {/* Receipt Upload Dashed Box */}
        <TouchableOpacity
          style={[styles.receiptBox, hasReceipt && styles.receiptBoxActive]}
          onPress={handleReceiptToggle}
          activeOpacity={0.8}
        >
          <Ionicons
            name={hasReceipt ? 'camera' : 'camera-outline'}
            size={24}
            color={colors.primary}
          />
          <Text style={styles.receiptTitle}>
            {hasReceipt
              ? l('Receipt Photo Attached ✓', 'রসিদের ছবি সংযুক্ত হয়েছে ✓')
              : l('Add receipt photo (optional)', 'রসিদের ছবি যোগ করুন (ঐচ্ছিক)')}
          </Text>
          <Text style={styles.receiptSub}>
            {l('Keep the voucher with the khata.', 'ভাউচার খাতার সাথে রাখুন।')}
          </Text>
        </TouchableOpacity>


        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Bottom Sticky Action Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={handleSubmit} disabled={saving}
          activeOpacity={0.85}
        >
          <Ionicons
            name="checkmark"
            size={18}
            color={colors.surface}
          />
          <Text style={styles.ctaButtonText}>
            {l('Save Expense', 'খরচ সংরক্ষণ করুন')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Spender Picker Modal */}
      <Modal
        visible={showSpenderModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSpenderModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSpenderModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{l('Select Spender', 'ব্যয়কারী নির্বাচন করুন')}</Text>
              <TouchableOpacity onPress={() => setShowSpenderModal(false)}>
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 360 }}>
            {spenders.map((sp) => {
              const isChosen = sp.name === selectedSpender;
              return (
                <TouchableOpacity
                  key={sp.id}
                  style={[styles.spenderOption, isChosen && styles.spenderOptionChosen]}
                  onPress={() => {
                    setSelectedSpender(sp.name);
                    setShowSpenderModal(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.spenderInfo}>
                    <Text style={[styles.spenderName, isChosen && styles.spenderNameChosen]}>{sp.name}</Text>
                    <Text style={styles.spenderRole}>{sp.role || sp.code}</Text>
                  </View>
                  {isChosen && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
            </ScrollView>
          </View>
        </TouchableOpacity>
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
    paddingBottom: 6,
  },
  closeBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.title,
    color: colors.text,
  },
  headerRightSpacer: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
  },
  amountCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  amountLabel: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.hero,
    lineHeight: typography.lineHeight.hero,
    color: colors.text,
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.hero,
    lineHeight: typography.lineHeight.hero,
    color: colors.text,
    padding: 0,
  },
  amountUnderline: {
    height: 2.5,
    backgroundColor: colors.primary,
    marginTop: 6,
    borderRadius: 2,
  },
  sectionLabel: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.subhead,
    color: colors.text,
    marginBottom: 6,
  },
  categoriesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  chipCheckIcon: {
    marginRight: 4,
  },
  categoryText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  categoryTextActive: {
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  colHalf: {
    flex: 1,
  },
  colLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  fieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    height: 42,
  },
  fieldInput: {
    flex: 1,
    minWidth: 0,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.subhead,
    color: colors.text,
    padding: 0,
    marginRight: 4,
  },
  fieldText: {
    flex: 1,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.subhead,
    color: colors.text,
  },
  sourceSegmentTrack: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
    gap: 4,
  },
  sourceSegmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  sourceSegmentBtnActive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sourceSegmentText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  sourceSegmentTextActive: {
    fontFamily: typography.fontFamily.bold,
    color: colors.text,
  },
  reasonCard: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    marginBottom: 14,
  },
  reasonInput: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.subhead,
    color: colors.text,
    minHeight: 52,
    textAlignVertical: 'top',
    padding: 0,
  },
  receiptBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 12,
    gap: 3,
  },
  receiptBoxActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  receiptTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.subhead,
    color: colors.text,
  },
  receiptSub: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  warningNoticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: colors.aging.month1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 12,
    gap: 8,
  },
  warningIcon: {
    flexShrink: 0,
  },
  warningNoticeText: {
    flex: 1,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.warning,
  },
  bottomSpacer: {
    height: 12,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.bg,
  },
  ctaButton: {
    backgroundColor: colors.primary,
    borderRadius: 28,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaButtonText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.base,
    color: colors.surface,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.base,
    color: colors.text,
  },
  spenderOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  spenderOptionChosen: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  spenderInfo: {
    flex: 1,
  },
  spenderName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.subhead,
    color: colors.text,
  },
  spenderNameChosen: {
    color: colors.primary,
  },
  spenderRole: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
