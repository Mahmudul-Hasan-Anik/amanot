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
  const year = new Date().getFullYear();
  const { l, formatMoney, formatNum, language } = useLanguage();

  const [selectedVoucherMonth, setSelectedVoucherMonth] = useState<number | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const liveMember = members.find((m: any) => m.id === currentUser?.id);
  const member: any = liveMember || currentUser || {
    id: '',
    code: '',
    name: '',
    phone: '',
    totalDeposit: 0,
    monthlyAmount: 0,
    dueAmount: 0,
    dueMonths: 0,
    status: 'paid',
  };

  // the deposit that paid a given month (1-12)
  const txnForMonth = (mNum: number) =>
    (transactions || []).find(
      (t: any) => t.memberId === member.id && t.type === 'deposit' && (t.months || []).includes(BENGALI_MONTHS_FULL[mNum - 1])
    );

  const isDue = (member.dueAmount || 0) > 0;

  const handleCopy = (text: string, label: string) => {
    setCopyFeedback(`${label} ${l('copied!', 'কপি হয়েছে!')}`);
    setTimeout(() => setCopyFeedback(null), 2500);
  };

  const handleCallHelpline = () => {
    const num = (somitiInfo as any).helpline || somitiInfo.phone || '';
    if (!num) return;
    Linking.openURL(`tel:${num}`);
  };

  const handleWhatsAppHelpline = () => {
    const raw = (somitiInfo.phone || somitiInfo.bkashNo || '').replace(/[০-৯]/g, (c: string) => String('০১২৩৪৫৬৭৮৯'.indexOf(c))).replace(/\D/g, '');
    if (!raw) return;
    const num = raw.startsWith('88') ? raw : `88${raw}`;
    const msg = encodeURIComponent(`আসসালামু আলাইকুম। আমি ${member.name} (আইডি: ${member.code})। আমার কিস্তি সংক্রান্ত তথ্য জানতে যোগাযোগ করছি।`);
    Linking.openURL(`https://wa.me/${num}?text=${msg}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F7F2" />

      {/* Screen Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.somitiName}>
            {l((somitiInfo as any).nameEn || 'Amanot Somiti', somitiInfo.name || 'আমানত সমিতি')}
          </Text>
          <Text style={styles.memberTag}>
            {member.name} · <Text style={{ fontFamily: 'HindSiliguri-Bold' }}>{member.code}</Text>
          </Text>
        </View>

        <View style={styles.headerRight}>
          <LanguageToggle />
          <TouchableOpacity
            style={styles.profileBtn}
            onPress={() => router.push('/(member)/profile')}
            activeOpacity={0.7}
          >
            <Ionicons name="person-circle-outline" size={28} color="#0F766E" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Demo Role Switcher Banner */}
      {canSwitchToAdmin && (
      <View style={styles.roleBanner}>
        <View style={styles.roleTagActive}>
          <Ionicons name="person" size={12} color="#0F766E" />
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
          <Ionicons name="shield-checkmark-outline" size={13} color="#64748B" />
          <Text style={styles.roleSwitchBtnText}>
            {l('Switch to Admin View', 'অ্যাডমিন ভিউতে যান ➔')}
          </Text>
        </TouchableOpacity>
      </View>
      )}

      {/* Toast Feedback */}
      {copyFeedback && (
        <View style={styles.copyToast}>
          <Ionicons name="checkmark-circle" size={16} color="#0F766E" />
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
                  <Text style={styles.paidBadgeText}>{l('All Paid', 'পরিশোধিত ✓')}</Text>
                </View>
              )}
            </View>

            <View style={styles.metricSeparator} />

            <View style={styles.heroMetricCol}>
              <Text style={styles.metricSub}>{l('Estimated Profit', 'অর্জিত মুনাফা')}</Text>
              <Text style={[styles.metricVal, { color: '#059669' }]}>
                {formatMoney((member as any).estimatedProfit2026 || (member as any).profit2025 || 0)}
              </Text>
            </View>
          </View>
        </View>

        {/* 2. Pay Due Quick Numbers */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="wallet-outline" size={18} color="#0F766E" />
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
              <Text style={styles.accNumber}>{somitiInfo.bkashNo || '—'}</Text>
            </View>
            <TouchableOpacity
              style={styles.copyBtn}
              onPress={() => handleCopy(somitiInfo.bkashNo || '', 'বিকাশ নম্বর')}
            >
              <Ionicons name="copy-outline" size={15} color="#0F766E" />
              <Text style={styles.copyBtnText}>{l('Copy', 'কপি')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.accountRow}>
            <View style={styles.accLeft}>
              <Text style={styles.accTitle}>{l('Islami Bank', 'ইসলামী ব্যাংক বাংলাদেশ')}</Text>
              <Text style={styles.accNumber}>{somitiInfo.bankAccountNo || '—'}</Text>
            </View>
            <TouchableOpacity
              style={styles.copyBtn}
              onPress={() => handleCopy(somitiInfo.bankAccountNo || '', 'ব্যাংক হিসাব')}
            >
              <Ionicons name="copy-outline" size={15} color="#0F766E" />
              <Text style={styles.copyBtnText}>{l('Copy', 'কপি')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. 12-Month Digital Passbook */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="calendar-outline" size={18} color="#0F766E" />
            <Text style={styles.cardSectionTitle}>
              {l(`12-Month Digital Passbook (${year})`, `১২ মাসের ডিজিটাল পাসবুক (${toBengaliDigits(year)})`)}
            </Text>
          </View>

          <View style={styles.monthsGrid}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((mNum) => {
              const st = member.monthsStatus?.[mNum - 1];
              const isPaid = st === 'paid';
              const isDueMonth = st === 'due';
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
                      isPaid && { color: '#059669' },
                      isDueMonth && { color: '#DC2626' },
                      isUpcoming && { color: '#94A3B8' },
                    ]}
                  >
                    {isPaid
                      ? l('Paid', 'জমা ✓')
                      : isDueMonth
                      ? l('Due', 'বকেয়া ✗')
                      : l('Pending', 'আসন্ন')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.gridHint}>
            {l('💡 Tap on any paid month to view official money receipt voucher.', '💡 পরিশোধিত মাসে ট্যাপ করে অফিশিয়াল মানি রিসিট ভাউচার দেখুন।')}
          </Text>
        </View>

        {/* 4. Notice Board */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="megaphone-outline" size={18} color="#0F766E" />
            <Text style={styles.cardSectionTitle}>
              {l('Somiti Notice Board', 'সমিতির নোটিশ বোর্ড')}
            </Text>
          </View>

          {(!notices || notices.length === 0) && (
            <Text style={styles.noticeBody}>{l('No notices yet.', 'এখনো কোনো নোটিশ নেই।')}</Text>
          )}
          {(notices || []).slice(0, 5).map((n: any, i: number, arr: any[]) => (
            <View
              key={n.id}
              style={[styles.noticeItem, i === arr.length - 1 && { borderBottomWidth: 0, paddingBottom: 0 }]}
            >
              <View style={[styles.noticeDot, i % 2 === 1 && { backgroundColor: '#059669' }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.noticeTitle}>{n.title}</Text>
                {!!n.body && <Text style={styles.noticeBody}>{n.body}</Text>}
                <Text style={styles.noticeTime}>
                  {bnDate(n.createdAt)} · {n.createdBy}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* 5. Helpline Support Bar */}
        <View style={styles.helplineCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.helpTitle}>{l('Need Help or Verification?', 'যেকোনো জিজ্ঞাসা বা সহায়তা?')}</Text>
            <Text style={styles.helpSub}>
              {l('Contact Somiti Helpline directly', 'সমিতির কর্মকর্তাদের সাথে সরাসরি যোগাযোগ করুন')}
            </Text>
          </View>
          <View style={styles.helpActionsRow}>
            <TouchableOpacity
              style={styles.helpBtn}
              onPress={handleCallHelpline}
              activeOpacity={0.8}
            >
              <Ionicons name="call" size={16} color="#FFFFFF" />
              <Text style={styles.helpBtnText}>{l('Call', 'কল')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.helpBtn, { backgroundColor: '#25D366' }]}
              onPress={handleWhatsAppHelpline}
              activeOpacity={0.8}
            >
              <Ionicons name="logo-whatsapp" size={16} color="#FFFFFF" />
              <Text style={styles.helpBtnText}>{l('WhatsApp', 'হোয়াটসঅ্যাপ')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Voucher Modal */}
      {selectedVoucherMonth !== null && (
        <View style={styles.webModalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedVoucherMonth(null)} />
          <View style={styles.voucherCard}>
            <View style={styles.voucherHeader}>
              <View>
                <Text style={styles.voucherSomitiTitle}>
                  {somitiInfo.name || 'আমানত সমিতি'}
                </Text>
                <Text style={styles.voucherSubtitle}>{l('Official Money Receipt', 'অফিশিয়াল মানি রিসিট')}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedVoucherMonth(null)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.voucherBody}>
              <View style={styles.voucherRow}>
                <Text style={styles.voucherLabel}>{l('Voucher No:', 'ভাউচার নং:')}</Text>
                <Text style={styles.voucherValBold}>{txnForMonth(selectedVoucherMonth)?.receiptNo || '—'}</Text>
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
                <Text style={[styles.voucherValBold, { color: '#059669', fontSize: 16 }]}>
                  {formatMoney(member.monthlyAmount || 0)}
                </Text>
              </View>
              <View style={styles.voucherRow}>
                <Text style={styles.voucherLabel}>{l('Payment Method:', 'মাধ্যম:')}</Text>
                <Text style={styles.voucherVal}>
                  {({ cash: 'হাতে নগদ', bkash: 'বিকাশ', nagad: 'নগদ', bank: 'ব্যাংক' } as any)[txnForMonth(selectedVoucherMonth)?.paymentMethod] || '—'}
                  {txnForMonth(selectedVoucherMonth)?.date ? ` · ${txnForMonth(selectedVoucherMonth)?.date}` : ''}
                </Text>
              </View>
              <View style={styles.voucherRow}>
                <Text style={styles.voucherLabel}>{l('Status:', 'অবস্থা:')}</Text>
                <Text style={[styles.voucherValBold, { color: '#059669' }]}>অনুমোদিত ও সংরক্ষিত ✓</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.voucherCloseBtn}
              onPress={() => setSelectedVoucherMonth(null)}
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
  headerLeft: {
    flex: 1,
  },
  somitiName: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 16,
    color: '#0F766E',
  },
  memberTag: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 13,
    color: '#334155',
    marginTop: 1,
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
    backgroundColor: '#E6F4F2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#CCFBF1',
  },
  roleTagActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleTagActiveText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 11,
    color: '#0F766E',
  },
  roleSwitchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  roleSwitchBtnText: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 12,
    color: '#0F766E',
  },
  copyToast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CCFBF1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginTop: 8,
    gap: 6,
  },
  copyToastText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 12,
    color: '#0F766E',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  heroCard: {
    backgroundColor: '#134E4A',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  heroLabel: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 13,
    color: '#A7F3D0',
  },
  heroAmount: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 32,
    color: '#FFFFFF',
    marginTop: 2,
  },
  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
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
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: 8,
  },
  metricSub: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: '#99F6E4',
  },
  metricVal: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#FFFFFF',
    marginTop: 2,
  },
  dueBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  dueBadgeText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 11,
    color: '#DC2626',
  },
  paidBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  paidBadgeText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 11,
    color: '#059669',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardSectionTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 15,
    color: '#1E293B',
  },
  cardSubText: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 12,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  accLeft: {
    flex: 1,
  },
  accTitle: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 12,
    color: '#64748B',
  },
  accNumber: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#0F766E',
    marginTop: 2,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E6F4F2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  copyBtnText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 12,
    color: '#0F766E',
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  monthItemBox: {
    width: '23%',
    aspectRatio: 1.2,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  monthBoxPaid: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  monthBoxDue: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  monthBoxUpcoming: {
    backgroundColor: '#F8FAFC',
    borderColor: '#F1F5F9',
  },
  monthNameText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 13,
    color: '#1E293B',
  },
  monthStatusText: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 10,
    marginTop: 2,
  },
  gridHint: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: '#64748B',
    marginTop: 10,
  },
  noticeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  noticeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0284C7',
    marginTop: 6,
  },
  noticeTitle: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 13,
    color: '#1E293B',
  },
  noticeBody: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
    lineHeight: 18,
  },
  noticeTime: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4,
  },
  helplineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  helpTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 13,
    color: '#1E293B',
  },
  helpSub: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  helpActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 10,
  },
  helpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0F766E',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  helpBtnText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 12,
    color: '#FFFFFF',
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
  voucherCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  voucherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  voucherSomitiTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 15,
    color: '#0F766E',
  },
  voucherSubtitle: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#64748B',
  },
  voucherBody: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  voucherRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  voucherLabel: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#64748B',
  },
  voucherVal: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 12,
    color: '#1E293B',
  },
  voucherValBold: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 13,
    color: '#1E293B',
  },
  voucherCloseBtn: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  voucherCloseBtnText: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 13,
    color: '#475569',
  },
});
