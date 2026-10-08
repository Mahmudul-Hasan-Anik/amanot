import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Linking,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/features/auth/authStore';
import { useSomitiStore } from '../../src/store/somitiStore';
import { useLanguage } from '../../src/i18n/useLanguage';
import { LanguageToggle } from '../../src/components/LanguageToggle';
import { BENGALI_MONTHS_FULL, toBengaliDigits } from '../../src/lib/bengali';
import { bnDate } from '../../src/lib/api';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';

const MONTH_NAMES_BN = [
  'জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'
];

const MONTH_NAMES_EN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export default function MemberDashboardScreen() {
  const router = useRouter();
  const { currentUser, switchRole, logout, actualRole } = useAuthStore();
  const { somitiInfo, members, transactions, notices } = useSomitiStore() as any;
  const canSwitchToAdmin = actualRole !== 'member';
  const year = 2026;
  const { l, formatMoney, formatNum, language, isBengali } = useLanguage();

  const [selectedVoucherMonth, setSelectedVoucherMonth] = useState<number | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const liveMember = members.find((m: any) => m.id === currentUser?.id);
  const member: any = liveMember || currentUser || {
    id: 'm1',
    code: 'SM-001',
    name: isBengali ? 'আনোয়ার হোসেন' : 'Anwar Hossain',
    phone: '01711000001',
    totalDeposit: 144000,
    monthlyAmount: 2000,
    dueAmount: 0,
    dueMonths: 0,
    status: 'paid',
  };

  // The deposit transaction that paid a given month (1-12)
  const txnForMonth = (mNum: number) =>
    (transactions || []).find(
      (t: any) =>
        t.memberId === member.id &&
        t.type === 'deposit' &&
        (t.months || []).includes(BENGALI_MONTHS_FULL[mNum - 1])
    );

  const isDue = (member.dueAmount || 0) > 0;

  const handleCopy = (text: string, label: string) => {
    setCopyFeedback(`${label} ${l('copied!', 'কপি হয়েছে!')}`);
    setTimeout(() => setCopyFeedback(null), 2500);
  };

  const handleCallHelpline = () => {
    const num = (somitiInfo as any).helpline || somitiInfo.phone || '01711000000';
    Linking.openURL(`tel:${num}`).catch(() => {});
  };

  const handleWhatsAppHelpline = () => {
    const raw = (somitiInfo.phone || somitiInfo.bkashNo || '01711000000')
      .replace(/[০-৯]/g, (c: string) => String('০১২৩৪৫৬৭৮৯'.indexOf(c)))
      .replace(/\D/g, '');
    const num = raw.startsWith('88') ? raw : `88${raw}`;
    const msg = encodeURIComponent(
      `আসসালামু আলাইকুম। আমি ${member.name} (আইডি: ${member.code})। আমার কিস্তি সংক্রান্ত তথ্য জানতে যোগাযোগ করছি।`
    );
    Linking.openURL(`https://wa.me/${num}?text=${msg}`).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      {/* Screen Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.somitiName}>
            {somitiInfo.name || (isBengali ? 'আমানত সমিতি' : 'Amanot Somiti')}
          </Text>
          <Text style={styles.memberTag}>
            {member.name} • <Text style={styles.memberCode}>{member.code}</Text>
          </Text>
        </View>

        <View style={styles.headerRight}>
          <LanguageToggle />
          <TouchableOpacity
            style={styles.profileBtn}
            onPress={() => router.push('/(member)/profile')}
            activeOpacity={0.7}
          >
            <Ionicons name="person-circle-outline" size={28} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Role Switcher Banner */}
      {canSwitchToAdmin && (
        <View style={styles.roleBanner}>
          <View style={styles.roleTagActive}>
            <Ionicons name="person" size={12} color={colors.primary} />
            <Text style={styles.roleTagActiveText}>{l('Member View', 'সদস্য ভিউ')}</Text>
          </View>
          <TouchableOpacity
            style={styles.roleSwitchBtn}
            onPress={() => {
              switchRole('admin');
              router.replace('/(admin)/(tabs)');
            }}
            activeOpacity={0.75}
          >
            <Ionicons name="shield-checkmark-outline" size={13} color={colors.textSecondary} />
            <Text style={styles.roleSwitchBtnText}>
              {l('Switch to Admin View ➔', 'অ্যাডমিন ভিউতে যান ➔')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Copy Toast Feedback */}
      {copyFeedback && (
        <View style={styles.copyToast}>
          <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
          <Text style={styles.copyToastText}>{copyFeedback}</Text>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 1. Hero Financial Summary Card */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>{l('My Total Savings', 'আমার মোট সঞ্চয়')}</Text>
          <Text style={styles.heroAmount}>{formatMoney(member.totalDeposit || 0)}</Text>

          <View style={styles.heroDivider} />

          <View style={styles.heroMetricsRow}>
            <View style={styles.heroMetricCol}>
              <Text style={styles.metricSub}>{l('Monthly Savings', 'মাসিক সঞ্চয়')}</Text>
              <Text style={styles.metricVal}>{formatMoney(member.monthlyAmount || 0)}</Text>
            </View>

            <View style={styles.metricSeparator} />

            <View style={styles.heroMetricCol}>
              <Text style={styles.metricSub}>{l('Status / Due', 'স্ট্যাটাস / বকেয়া')}</Text>
              {isDue ? (
                <View style={styles.dueBadge}>
                  <Text style={styles.dueBadgeText}>
                    {l('Due: ', 'বকেয়া: ')}{formatMoney(member.dueAmount)}
                  </Text>
                </View>
              ) : (
                <View style={styles.paidBadge}>
                  <Text style={styles.paidBadgeText}>{l('All Paid ✓', 'পরিশোধিত ✓')}</Text>
                </View>
              )}
            </View>

            <View style={styles.metricSeparator} />

            <View style={styles.heroMetricCol}>
              <Text style={styles.metricSub}>{l('Estimated Profit', 'অর্জিত মুনাফা')}</Text>
              <Text style={[styles.metricVal, { color: colors.accentYellow }]}>
                {formatMoney((member as any).estimatedProfit2026 || (member as any).profit2025 || 7714)}
              </Text>
            </View>
          </View>
        </View>

        {/* 2. Pay Due / Payment Accounts */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="wallet-outline" size={18} color={colors.primary} />
            <Text style={styles.cardSectionTitle}>
              {l('Somiti Payment Accounts', 'সমিতির পেমেন্ট অ্যাকাউন্ট')}
            </Text>
          </View>
          <Text style={styles.cardSubText}>
            {l(
              'Pay your due amount and confirm with cashier.',
              'নিচের নম্বরে কিস্তির টাকা পাঠিয়ে কোষাধ্যক্ষকে অবগত করুন।'
            )}
          </Text>

          <View style={styles.accountRow}>
            <View style={styles.accLeft}>
              <Text style={styles.accTitle}>{l('bKash Merchant', 'বিকাশ মার্চেন্ট')}</Text>
              <Text style={styles.accNumber}>{somitiInfo.bkashNo || '০১৭০০-১১২২৩৩'}</Text>
            </View>
            <TouchableOpacity
              style={styles.copyBtn}
              onPress={() => handleCopy(somitiInfo.bkashNo || '০১৭০০-১১২২৩৩', 'বিকাশ নম্বর')}
              activeOpacity={0.7}
            >
              <Ionicons name="copy-outline" size={15} color={colors.primary} />
              <Text style={styles.copyBtnText}>{l('Copy', 'কপি')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.accountRow}>
            <View style={styles.accLeft}>
              <Text style={styles.accTitle}>
                {somitiInfo.bankName || (isBengali ? 'ইসলামী ব্যাংক বাংলাদেশ' : 'Islami Bank Bangladesh')}
              </Text>
              <Text style={styles.accNumber}>
                {somitiInfo.bankAccountNo || '২০৫০১২৩৪৫৬৭৮৯'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.copyBtn}
              onPress={() => handleCopy(somitiInfo.bankAccountNo || '২০৫০১২৩৪৫৬৭৮৯', 'ব্যাংক হিসাব')}
              activeOpacity={0.7}
            >
              <Ionicons name="copy-outline" size={15} color={colors.primary} />
              <Text style={styles.copyBtnText}>{l('Copy', 'কপি')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. 12-Month Digital Passbook */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
            <Text style={styles.cardSectionTitle}>
              {l(
                `12-Month Digital Passbook (${year})`,
                `১২ মাসের ডিজিটাল পাসবুক (${toBengaliDigits(year)})`
              )}
            </Text>
          </View>

          <View style={styles.monthsGrid}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((mNum) => {
              const isPaid = mNum <= 9; // Jan-Sep paid in sample
              const isDueMonth = mNum === 10 && isDue;
              const isUpcoming = !isPaid && !isDueMonth;

              return (
                <TouchableOpacity
                  key={mNum}
                  style={[
                    styles.monthItemBox,
                    isPaid && styles.monthBoxPaid,
                    isDueMonth && styles.monthBoxDue,
                    isUpcoming && styles.monthBoxUpcoming,
                  ]}
                  onPress={() => {
                    if (isPaid) setSelectedVoucherMonth(mNum);
                  }}
                  activeOpacity={isPaid ? 0.75 : 1}
                >
                  <Text style={styles.monthNameText}>
                    {language === 'en' ? MONTH_NAMES_EN[mNum - 1] : MONTH_NAMES_BN[mNum - 1]}
                  </Text>
                  <Text
                    style={[
                      styles.monthStatusText,
                      isPaid && styles.statusPaidText,
                      isDueMonth && styles.statusDueText,
                      isUpcoming && styles.statusUpcomingText,
                    ]}
                  >
                    {isPaid
                      ? l('Paid ✓', 'জমা ✓')
                      : isDueMonth
                      ? l('Due ✗', 'বকেয়া ✗')
                      : l('Pending', 'আসন্ন')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.gridHint}>
            {l(
              '💡 Tap on any paid month to view official money receipt voucher.',
              '💡 পরিশোধিত মাসে ট্যাপ করে অফিশিয়াল মানি রিসিট ভাউচার দেখুন।'
            )}
          </Text>
        </View>

        {/* 4. Notice Board */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="megaphone-outline" size={18} color={colors.primary} />
            <Text style={styles.cardSectionTitle}>
              {l('Somiti Notice Board', 'সমিতির নোটিশ বোর্ড')}
            </Text>
          </View>

          {(!notices || notices.length === 0) ? (
            <View style={styles.sampleNotice}>
              <View style={styles.noticeDot} />
              <View style={styles.noticeContent}>
                <Text style={styles.noticeTitle}>
                  {l('Annual General Meeting 2026', 'বার্ষিক সাধারণ সভা ২০২৬')}
                </Text>
                <Text style={styles.noticeBody}>
                  {l(
                    'All members are requested to attend the upcoming AGM on October 25th.',
                    'সকল সদস্যকে আগামী ২৫ অক্টোবর অনুষ্ঠিতব্য সাধারণ সভায় উপস্থিত থাকার অনুরোধ করা যাচ্ছে।'
                  )}
                </Text>
                <Text style={styles.noticeTime}>
                  {l('10 Oct 2026 • Secretary', '১০ অক্টোবর ২০২৬ • সাধারণ সম্পাদক')}
                </Text>
              </View>
            </View>
          ) : (
            notices.slice(0, 3).map((n: any, i: number, arr: any[]) => (
              <View
                key={n.id}
                style={[
                  styles.noticeItem,
                  i === arr.length - 1 && styles.noticeItemLast,
                ]}
              >
                <View style={styles.noticeDot} />
                <View style={styles.noticeContent}>
                  <Text style={styles.noticeTitle}>{n.title}</Text>
                  {!!n.body && <Text style={styles.noticeBody}>{n.body}</Text>}
                  <Text style={styles.noticeTime}>
                    {bnDate(n.createdAt)} • {n.createdBy}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* 5. Helpline Support Bar */}
        <View style={styles.helplineCard}>
          <View style={styles.helpTextCol}>
            <Text style={styles.helpTitle}>
              {l('Need Help or Verification?', 'যেকোনো জিজ্ঞাসা বা সহায়তা?')}
            </Text>
            <Text style={styles.helpSub}>
              {l(
                'Contact Somiti Helpline directly',
                'সমিতির কর্মকর্তাদের সাথে সরাসরি যোগাযোগ করুন'
              )}
            </Text>
          </View>
          <View style={styles.helpActionsRow}>
            <TouchableOpacity
              style={styles.helpBtn}
              onPress={handleCallHelpline}
              activeOpacity={0.8}
            >
              <Ionicons name="call" size={16} color={colors.surface} />
              <Text style={styles.helpBtnText}>{l('Call', 'কল')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.helpBtnWhatsApp}
              onPress={handleWhatsAppHelpline}
              activeOpacity={0.8}
            >
              <Ionicons name="logo-whatsapp" size={16} color={colors.surface} />
              <Text style={styles.helpBtnText}>{l('WhatsApp', 'হোয়াটসঅ্যাপ')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Voucher Modal */}
      {selectedVoucherMonth !== null && (
        <View style={styles.webModalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setSelectedVoucherMonth(null)}
          />
          <View style={styles.voucherCard}>
            <View style={styles.voucherHeader}>
              <View>
                <Text style={styles.voucherSomitiTitle}>
                  {somitiInfo.name || (isBengali ? 'আমানত সমিতি' : 'Amanot Somiti')}
                </Text>
                <Text style={styles.voucherSubtitle}>
                  {l('Official Money Receipt', 'অফিশিয়াল মানি রিসিট')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedVoucherMonth(null)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.voucherBody}>
              <View style={styles.voucherRow}>
                <Text style={styles.voucherLabel}>{l('Voucher No:', 'ভাউচার নং:')}</Text>
                <Text style={styles.voucherValBold}>
                  {txnForMonth(selectedVoucherMonth)?.receiptNo || `VR-2026-${String(selectedVoucherMonth).padStart(2, '0')}`}
                </Text>
              </View>
              <View style={styles.voucherRow}>
                <Text style={styles.voucherLabel}>{l('Member Name:', 'সদস্যের নাম:')}</Text>
                <Text style={styles.voucherVal}>{member.name} ({member.code})</Text>
              </View>
              <View style={styles.voucherRow}>
                <Text style={styles.voucherLabel}>{l('Month of Payment:', 'পরিশোধিত মাস:')}</Text>
                <Text style={styles.voucherVal}>
                  {BENGALI_MONTHS_FULL[selectedVoucherMonth - 1]} {toBengaliDigits(year)}
                </Text>
              </View>
              <View style={styles.voucherRow}>
                <Text style={styles.voucherLabel}>{l('Amount Paid:', 'জমার পরিমাণ:')}</Text>
                <Text style={[styles.voucherValBold, { color: colors.primary }]}>
                  {formatMoney(member.monthlyAmount || 2000)}
                </Text>
              </View>
              <View style={styles.voucherRow}>
                <Text style={styles.voucherLabel}>{l('Payment Method:', 'মাধ্যম:')}</Text>
                <Text style={styles.voucherVal}>
                  {({ cash: 'হাতে নগদ', bkash: 'বিকাশ', nagad: 'নগদ', bank: 'ব্যাংক' } as any)[
                    txnForMonth(selectedVoucherMonth)?.paymentMethod || 'bkash'
                  ]}
                </Text>
              </View>
              <View style={styles.voucherRow}>
                <Text style={styles.voucherLabel}>{l('Status:', 'অবস্থা:')}</Text>
                <Text style={[styles.voucherValBold, { color: colors.primary }]}>
                  {l('Approved & Recorded ✓', 'অনুমোদিত ও সংরক্ষিত ✓')}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.voucherCloseBtn}
              onPress={() => setSelectedVoucherMonth(null)}
              activeOpacity={0.8}
            >
              <Text style={styles.voucherCloseBtnText}>{l('Close Voucher', 'বন্ধ করুন')}</Text>
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
  headerLeft: {
    flex: 1,
  },
  somitiName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.base,
    lineHeight: typography.lineHeight.base,
    color: colors.primary,
  },
  memberTag: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text,
    marginTop: 2,
  },
  memberCode: {
    fontFamily: typography.fontFamily.bold,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  profileBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  roleTagActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  roleTagActiveText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xs,
    color: colors.primary,
  },
  roleSwitchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleSwitchBtnText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  copyToast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  copyToastText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.caption,
    color: colors.primary,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
  },
  heroLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.primarySoft,
  },
  heroAmount: {
    ...typography.displayAmount,
    color: colors.surface,
    marginTop: 4,
  },
  heroDivider: {
    height: 1,
    backgroundColor: colors.primarySoft,
    opacity: 0.25,
    marginVertical: 14,
  },
  heroMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroMetricCol: {
    flex: 1,
  },
  metricSeparator: {
    width: 1,
    height: 32,
    backgroundColor: colors.primarySoft,
    opacity: 0.25,
    marginHorizontal: 8,
  },
  metricSub: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.primarySoft,
    marginBottom: 3,
  },
  metricVal: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.subhead,
    color: colors.surface,
  },
  paidBadge: {
    backgroundColor: colors.primarySoft,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  paidBadgeText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xs,
    color: colors.primary,
  },
  dueBadge: {
    backgroundColor: colors.warningSoft,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  dueBadgeText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xs,
    color: colors.warning,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  cardSectionTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.text,
  },
  cardSubText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
  },
  accLeft: {
    flex: 1,
  },
  accTitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    color: colors.textSecondary,
  },
  accNumber: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.subhead,
    color: colors.text,
    marginTop: 2,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  copyBtnText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.caption,
    color: colors.primary,
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthItemBox: {
    width: '23%',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  monthBoxPaid: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  monthBoxDue: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.warning,
  },
  monthBoxUpcoming: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
  },
  monthNameText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.subhead,
    color: colors.text,
  },
  monthStatusText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.xs,
    marginTop: 2,
  },
  statusPaidText: {
    color: colors.primary,
  },
  statusDueText: {
    color: colors.warning,
  },
  statusUpcomingText: {
    color: colors.textSecondary,
  },
  gridHint: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 10,
  },
  sampleNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 6,
  },
  noticeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceMuted,
  },
  noticeItemLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  noticeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 6,
  },
  noticeContent: {
    flex: 1,
  },
  noticeTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.subhead,
    color: colors.text,
  },
  noticeBody: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  noticeTime: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 4,
  },
  helplineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },
  helpTextCol: {
    flex: 1,
  },
  helpTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.subhead,
    color: colors.text,
  },
  helpSub: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  helpActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  helpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  helpBtnWhatsApp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  helpBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xs,
    color: colors.surface,
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
  voucherCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
  },
  voucherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceMuted,
    paddingBottom: 12,
    marginBottom: 12,
  },
  voucherSomitiTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.base,
    color: colors.primary,
  },
  voucherSubtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    color: colors.textSecondary,
  },
  closeBtn: {
    padding: 4,
  },
  voucherBody: {
    gap: 8,
    marginBottom: 16,
  },
  voucherRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  voucherLabel: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    color: colors.textSecondary,
  },
  voucherVal: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.caption,
    color: colors.text,
  },
  voucherValBold: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.subhead,
    color: colors.text,
  },
  voucherCloseBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  voucherCloseBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.subhead,
    color: colors.surface,
  },
  bottomSpacer: {
    height: 40,
  },
});
