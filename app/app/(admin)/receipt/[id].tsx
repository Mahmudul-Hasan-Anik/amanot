import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSomitiStore } from '../../../src/store/somitiStore';
import { mockMembers } from '../../../src/mocks/mockData';
import { useLanguage } from '../../../src/i18n/useLanguage';
import { BENGALI_MONTHS_FULL, toBengaliDigits } from '../../../src/lib/bengali';
import { colors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';

export default function ReceiptScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { getTransactionById, getMemberById, transactions, members, somitiInfo } = useSomitiStore();
  const { l, isBengali, formatMoney, formatNum } = useLanguage();

  const displayMembers = members.length > 0 ? members : mockMembers;

  const txn = getTransactionById(id as string) || transactions[0];
  const member = txn
    ? getMemberById(txn.memberId) || displayMembers.find((m) => m.id === txn.memberId)
    : displayMembers.find((m) => m.id === '2') || displayMembers[0];

  const defaultNum = isBengali ? '১০৮৮' : '1088';
  const receiptNo = txn?.receiptNo || ('#' + defaultNum);
  const amount = txn?.amount || 4100;
  const memberName = l(member?.nameEn || txn?.memberName || member?.name || 'করিম উদ্দিন', txn?.memberName || member?.name || 'করিম উদ্দিন');
  const memberCode = txn?.memberCode || member?.code || 'SM-042';

  const defaultMonthsBn = 'আগস্ট, সেপ্টেম্বর ২০২৬';
  const defaultMonthsEn = 'August, September 2026';
  const monthsStr = txn?.months && txn.months.length > 0
    ? txn.months.join(', ')
    : l(defaultMonthsEn, defaultMonthsBn);

  const lateFee = txn?.lateFee !== undefined ? txn.lateFee : 100;
  const baseDeposit = amount - lateFee;

  // Date and Time formatting
  const now = new Date();
  const day = now.getDate();
  const monthBn = BENGALI_MONTHS_FULL[now.getMonth()];
  const monthEn = now.toLocaleDateString('en-GB', { month: 'short' });
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  const timeFormatted = `${hours}:${mins}`;

  const defaultDateBn = `${toBengaliDigits(day)} ${monthBn} ${toBengaliDigits(year)}, ${toBengaliDigits(timeFormatted)}`;
  const defaultDateEn = `${day} ${monthEn} ${year}, ${timeFormatted}`;
  const dateStr = txn?.date ? txn.date : l(defaultDateEn, defaultDateBn);

  const trxIdStr = txn?.trxId || 'BK7X29QM4L';
  const methodStr =
    txn?.paymentMethod === 'bkash'
      ? `${l('bKash', 'বিকাশ')} · ${trxIdStr}`
      : txn?.paymentMethod === 'nagad'
      ? `${l('Nagad', 'নগদ')} · ${trxIdStr}`
      : txn?.paymentMethod === 'bank'
      ? l('Bank Transfer', 'ব্যাংক ট্রান্সফার')
      : txn?.paymentMethod === 'cash'
      ? l('Cash', 'হাতে নগদ')
      : `${l('bKash', 'বিকাশ')} · ${trxIdStr}`;

  const somitiTitle = l((somitiInfo as any).nameEn || 'Amanot Somiti', somitiInfo.name || 'আমানত সমিতি');
  const totalDepositNow = (member?.totalDeposit || 108000) + baseDeposit;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${somitiTitle}\n${l('Deposit Receipt', 'জমা রসিদ')} ${receiptNo}\n--------------------\n${l('Member:', 'সদস্য:')} ${memberName} (${memberCode})\n${l('Month:', 'মাস:')} ${monthsStr}\n${l('Deposit:', 'জমা:')} ${formatMoney(baseDeposit)}\n${lateFee > 0 ? `${l('Late Fee:', 'বিলম্ব ফি:')} ${formatMoney(lateFee)}\n` : ''}${l('Total Collection:', 'মোট আদায়:')} ${formatMoney(amount)}\n${l('Method:', 'মাধ্যম:')} ${methodStr}\n${l('Date:', 'তারিখ:')} ${dateStr}\n${l('Total Deposit Now:', 'এখন মোট জমা:')} ${formatMoney(totalDepositNow)}\n--------------------\n${l('Thank you for your payment.', 'আপনার কিস্তির টাকা সঠিকভাবে জমা হয়েছে। ধন্যবাদ।')}`,
      });
    } catch (e) {}
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Top Success Badge */}
        <View style={styles.successArea}>
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={40} color={colors.primary} />
          </View>

          <Text style={styles.successTitle}>{l('Deposit Successful', 'জমা সফল হয়েছে')}</Text>
          <Text style={styles.amountLarge}>{formatMoney(amount)}</Text>

          <View style={styles.whatsappNoticePill}>
            <Text style={styles.whatsappNoticeText}>
              {l('Receipt sent via WhatsApp ✓', 'হোয়াটসঅ্যাপে রসিদ পাঠানো হয়েছে ✓')}
            </Text>
          </View>
        </View>

        {/* Voucher Card */}
        <View style={styles.voucherCard}>
          <View style={styles.voucherTop}>
            <Text style={styles.voucherNo}>{l('Receipt', 'রসিদ')} {receiptNo}</Text>
            <Text style={styles.voucherSomiti}>[{somitiTitle}]</Text>
          </View>

          <View style={styles.detailList}>
            <View style={styles.row}>
              <Text style={styles.label}>{l('Member', 'সদস্য')}</Text>
              <Text style={styles.value}>{memberName} ({memberCode})</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>{l('Month', 'মাস')}</Text>
              <Text style={styles.value}>{monthsStr}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>{l('Deposit', 'জমা')}</Text>
              <Text style={styles.value}>{formatMoney(baseDeposit)}</Text>
            </View>

            {lateFee > 0 && (
              <View style={styles.row}>
                <Text style={styles.label}>{l('Late Fee', 'বিলম্ব ফি')}</Text>
                <Text style={styles.value}>{formatMoney(lateFee)}</Text>
              </View>
            )}

            <View style={styles.row}>
              <Text style={styles.label}>{l('Method', 'মাধ্যম')}</Text>
              <Text style={styles.value}>{methodStr}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>{l('Date', 'তারিখ')}</Text>
              <Text style={styles.value}>{dateStr}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>{l('Received By', 'গ্রহণকারী')}</Text>
              <Text style={styles.value}>{l('Mahmuda Khatun (Treasurer)', 'মাহমুদা খাতুন (কোষাধ্যক্ষ)')}</Text>
            </View>
          </View>

          <View style={styles.dottedDivider} />

          <View style={styles.rowTotal}>
            <Text style={styles.labelTotal}>{l('Total Deposit Now', 'এখন মোট জমা')}</Text>
            <Text style={styles.valueTotal}>{formatMoney(totalDepositNow)}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonsGroup}>
          {/* Share Button (outlined stadium pill) */}
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={handleShare}
            activeOpacity={0.8}
          >
            <Ionicons name="paper-plane-outline" size={18} color={colors.text} />
            <Text style={styles.shareBtnText}>{l('Share Receipt', 'রসিদ শেয়ার করুন')}</Text>
          </TouchableOpacity>

          {/* Another Deposit Button (deep green solid pill) */}
          <TouchableOpacity
            style={styles.anotherBtn}
            onPress={() => router.replace('/(admin)/deposit/new')}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={20} color={colors.surface} />
            <Text style={styles.anotherBtnText}>{l('+ Record Another Deposit', '+ আরেকটি জমা নিন')}</Text>
          </TouchableOpacity>

          {/* Back to Home Link */}
          <TouchableOpacity
            style={styles.homeLinkBtn}
            onPress={() => router.replace('/(admin)/(tabs)')}
            activeOpacity={0.7}
          >
            <Text style={styles.homeLinkText}>{l('Back to Home', 'হোমে ফিরুন')}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 36,
  },
  successArea: {
    alignItems: 'center',
    marginBottom: 20,
  },
  checkCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xxl,
    lineHeight: typography.lineHeight.xxl,
    color: colors.text,
  },
  amountLarge: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.hero,
    lineHeight: typography.lineHeight.hero,
    color: colors.text,
    marginVertical: 4,
  },
  whatsappNoticePill: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9999,
    marginTop: 8,
  },
  whatsappNoticeText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.primary,
  },
  voucherCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  voucherTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceMuted,
    marginBottom: 14,
  },
  voucherNo: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.text,
  },
  voucherSomiti: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.textSecondary,
  },
  detailList: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.textSecondary,
  },
  value: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text,
  },
  dottedDivider: {
    height: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    marginVertical: 14,
  },
  rowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelTotal: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    color: colors.text,
  },
  valueTotal: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.title,
    lineHeight: typography.lineHeight.title,
    color: colors.primary,
  },
  buttonsGroup: {
    gap: 12,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 9999,
    paddingVertical: 14,
  },
  shareBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.text,
  },
  anotherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 9999,
    paddingVertical: 14,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  anotherBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.surface,
  },
  homeLinkBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  homeLinkText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    color: colors.primary,
  },
});
