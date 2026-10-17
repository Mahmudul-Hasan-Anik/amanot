import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, Linking, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuthStore } from '../../src/features/auth/authStore';
import { useSomitiStore } from '../../src/store/somitiStore';
import { useLanguage } from '../../src/i18n/useLanguage';
import { LanguageToggle } from '../../src/components/LanguageToggle';

import { bnDate } from '../../src/lib/api';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import {useLedgerPage} from '../../src/hooks/useLedgerPage';
import {Button} from '../../src/components/Button';
import {signedTransactionAmount} from '../../src/lib/ledger';
import {MemberBalanceSummary} from '../../src/components/MemberBalanceSummary';
import {somitiName} from '../../src/utils/somitiBranding';

export default function MemberDashboardScreen() {
  const router = useRouter();
  const { currentUser, switchRole, actualRole } = useAuthStore();
  const { somitiInfo, members, notices,withdrawalRequests } = useSomitiStore();
  const canSwitchToAdmin = actualRole !== 'member';
  const { l, formatMoney } = useLanguage();

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

  const history=useLedgerPage({memberId:member.id},!!member.id);

  const handleCopy = async (text: string, label: string) => {
    if (!text) return;
    try { await Share.share({ message: `${label}: ${text}` }); }
    catch (e: any) { Alert.alert(l('Sharing failed', 'শেয়ার ব্যর্থ'), e.message); }
  };

  const handleCallHelpline = () => {
    const num = (somitiInfo as any).helpline || somitiInfo.phone;
    if (!num) { Alert.alert(l('Contact unavailable', 'যোগাযোগ নম্বর দেওয়া নেই')); return; }
    Linking.openURL(`tel:${num}`).catch(() => {});
  };

  const handleWhatsAppHelpline = () => {
    if (!somitiInfo.phone) { Alert.alert(l('Contact unavailable', 'যোগাযোগ নম্বর দেওয়া নেই')); return; }
    const raw = somitiInfo.phone
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
            {somitiName(somitiInfo, l('Your society', 'আপনার সমিতি'))}
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 1. Hero Financial Summary Card */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>{l('My remaining balance', 'আমার অবশিষ্ট ব্যালেন্স')}</Text>
          <Text style={styles.heroAmount}>{formatMoney(member.totalDeposit || 0)}</Text>
          <Text style={styles.heroLabel}>{l('Net withdrawals','মোট নিট উত্তোলন')}: {formatMoney(member.totalWithdrawn||0)}</Text>

          <View style={styles.heroDivider} />

          <View style={styles.heroMetricsRow}>
            <View style={styles.heroMetricCol}>
              <Text style={styles.metricSub}>{l('Deposit rule', 'জমার নিয়ম')}</Text>
              <Text style={styles.metricVal}>{l('Any amount', 'ইচ্ছামতো পরিমাণ')}</Text>
            </View>

            <View style={styles.metricSeparator} />

            <View style={styles.heroMetricCol}>
              <Text style={styles.metricSub}>{l('Status','স্ট্যাটাস')}</Text><Text style={styles.metricVal}>{member.status==='inactive'?l('Inactive','নিষ্ক্রিয়'):l('Active','সক্রিয়')}</Text>
            </View>

            <View style={styles.metricSeparator} />

            <View style={styles.heroMetricCol}>
              <Text style={styles.metricSub}>{l('Estimated Profit', 'অর্জিত মুনাফা')}</Text>
              <Text style={[styles.metricVal, { color: colors.surface }]}>
                {formatMoney((member as any).profitBalance ?? (member as any).profit2025 ?? 0)}
              </Text>
            </View>
          </View>
        </View>

        {/* 2. Pay Due / Payment Accounts */}
        <Button title={l('Request savings withdrawal','সঞ্চয় উত্তোলনের আবেদন')} onPress={()=>router.push('/(member)/withdrawals')} style={{marginBottom:16}}/>
        <MemberBalanceSummary member={member} requests={withdrawalRequests}/>
        {withdrawalRequests.some(r=>r.member_id===member.id&&['submitted','approved'].includes(r.status))&&<View style={styles.sectionCard}>
          <Text style={styles.cardSectionTitle}>{l('My withdrawal requests','আমার উত্তোলনের আবেদন')}</Text>
          {withdrawalRequests.filter(r=>r.member_id===member.id&&['submitted','approved'].includes(r.status)).slice(0,3).map(r=><Text key={r.id} style={styles.cardSubText}>{formatMoney(r.amount)} · {r.status==='submitted'?l('Waiting for approval','অনুমোদনের অপেক্ষায়'):l('Approved · payment pending','অনুমোদিত · টাকা প্রদান বাকি')}</Text>)}
        </View>}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="wallet-outline" size={18} color={colors.primary} />
            <Text style={styles.cardSectionTitle}>
              {l('Somiti Payment Accounts', 'সমিতির পেমেন্ট অ্যাকাউন্ট')}
            </Text>
          </View>
          <Text style={styles.cardSubText}>
            {l(
              'Deposit any amount and confirm with cashier.',
              'নিচের নম্বরে কিস্তির টাকা পাঠিয়ে কোষাধ্যক্ষকে অবগত করুন।'
            )}
          </Text>

          <View style={styles.accountRow}>
            <View style={styles.accLeft}>
              <Text style={styles.accTitle}>{l('bKash Merchant', 'বিকাশ মার্চেন্ট')}</Text>
              <Text style={styles.accNumber}>{somitiInfo.bkashNo || l('Not configured', 'নম্বর দেওয়া নেই')}</Text>
            </View>
            <TouchableOpacity
              style={styles.copyBtn}
              disabled={!somitiInfo.bkashNo}
              onPress={() => handleCopy(somitiInfo.bkashNo, 'বিকাশ নম্বর')}
              activeOpacity={0.7}
            >
              <Ionicons name="copy-outline" size={15} color={colors.primary} />
              <Text style={styles.copyBtnText}>{l('Share', 'শেয়ার')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.accountRow}>
            <View style={styles.accLeft}>
              <Text style={styles.accTitle}>
                {somitiInfo.bankName || l('Bank account', 'ব্যাংক হিসাব')}
              </Text>
              <Text style={styles.accNumber}>
                {somitiInfo.bankAccountNo || l('Not configured', 'হিসাব নম্বর দেওয়া নেই')}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.copyBtn}
              disabled={!somitiInfo.bankAccountNo}
              onPress={() => handleCopy(somitiInfo.bankAccountNo, 'ব্যাংক হিসাব')}
              activeOpacity={0.7}
            >
              <Ionicons name="copy-outline" size={15} color={colors.primary} />
              <Text style={styles.copyBtnText}>{l('Share', 'শেয়ার')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.cardSectionTitle}>{l('Deposit history', 'জমার ইতিহাস')}</Text>
          <Button title={l('Withdrawal requests & receipts','উত্তোলনের আবেদন ও রসিদ')} variant="outline" onPress={()=>router.push('/(member)/withdrawals')}/>
          {history.rows.filter(t=>['deposit','withdrawal','withdrawal_reversal'].includes(t.type)).map(t=><View key={t.id} style={{paddingVertical:12}}><Text>{t.receiptNo} · {t.date}</Text><Text>{t.type==='withdrawal'?l('Savings withdrawal','সঞ্চয় উত্তোলন'):t.type==='withdrawal_reversal'?l('Withdrawal reversal','উত্তোলন সংশোধন'):l('Deposit','জমা')}</Text><Text>{formatMoney(signedTransactionAmount(t))}</Text></View>)}
          {history.loading && <Text>{l('Loading…','লোড হচ্ছে…')}</Text>}
          {!!history.error && <TouchableOpacity onPress={history.reload}><Text>{l('Could not load history. Try again.','ইতিহাস পাওয়া যায়নি। আবার চেষ্টা করুন।')}</Text></TouchableOpacity>}
          {!history.loading && !history.error && history.rows.length===0 && <Text>{l('No deposits yet','এখনো কোনো জমা নেই')}</Text>}
          {history.hasMore && <TouchableOpacity onPress={history.loadMore}><Text>{l('Load more','আরও দেখুন')}</Text></TouchableOpacity>}
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
                  {l('No notices yet', 'এখনো কোনো নোটিশ নেই')}
                </Text>
                <Text style={styles.noticeBody}>
                  {l(
                    'New notices from the committee will appear here.',
                    'কমিটির নতুন নোটিশ এখানে দেখা যাবে।'
                  )}
                </Text>
                <Text style={styles.noticeTime}>
                  {''}
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
  bottomSpacer: {
    height: 40,
  },
});
