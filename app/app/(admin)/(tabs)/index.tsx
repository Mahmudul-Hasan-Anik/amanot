import React, { useState, useMemo, useCallback } from 'react';
import { View, Image, Text, ScrollView, TouchableOpacity, Pressable, StyleSheet, StatusBar, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { BENGALI_MONTHS_FULL, toBengaliDigits } from '../../../src/lib/bengali';
import { useSomitiStore, Transaction } from '../../../src/store/somitiStore';
import { useLanguage } from '../../../src/i18n/useLanguage';
import { somitiName } from '../../../src/utils/somitiBranding';
import { investmentSchedule, isoToday, roundMoney } from '../../../src/lib/investment';
import { EntryRow, EntryActions } from '../../../src/components/EntryActions';
import { formatHumanDate } from '../../../src/components/DateField';

/** Days until the society's year closes (fiscal year, default July–June). */
function yearEnd(startMonth: number, today = isoToday()) {
  const [y, m] = today.split('-').map(Number);
  const endYear = startMonth > 1 && m >= startMonth ? y + 1 : y;
  const endMonth = startMonth === 1 ? 12 : startMonth - 1;
  const end = new Date(Date.UTC(endYear, endMonth, 0));
  const iso = end.toISOString().slice(0, 10);
  const days = Math.round((end.getTime() - new Date(today + 'T00:00:00Z').getTime()) / 86400000);
  return { iso, days };
}

/** Home = what needs doing today. One total, a task list, then the latest entries. */
export default function HomeDashboardScreen() {
  const router = useRouter();
  const somitiInfo = useSomitiStore(s => s.somitiInfo);
  const members = useSomitiStore(s => s.members);
  const projects = useSomitiStore(s => s.projects);
  const cashAccounts = useSomitiStore(s => s.cashAccounts);
  const transactions = useSomitiStore(s => s.transactions);
  const legacyPending = useSomitiStore(s => s.approvals.length + s.investmentProposals.filter(p => ['submitted', 'approved'].includes(p.status)).length + s.withdrawalRequests.filter(r => ['submitted', 'approved'].includes(r.status)).length);
  const { l, formatMoney, formatNum } = useLanguage();
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState<Transaction | null>(null);
  const onRefresh = useCallback(() => { setRefreshing(true); useSomitiStore.getState().syncFromServer().finally(() => setRefreshing(false)); }, []);

  const invested = useMemo(() => projects.reduce((acc, p) => acc + (p.remainingAmount ?? p.investedAmount ?? 0), 0), [projects]);
  const cashAndBank = useMemo(() => cashAccounts.reduce((acc, c) => acc + (c.amount || 0), 0), [cashAccounts]);
  const overdue = useMemo(() => projects.filter(p => p.contract && p.status !== 'completed').map(p => investmentSchedule(p.contract!, p.returnedAmount).filter(i => i.overdue)).filter(x => x.length), [projects]);
  const overdueAmount = roundMoney(overdue.flat().reduce((sum, i) => sum + i.remaining, 0));
  const today = isoToday();
  const todays = transactions.filter(t => t.dateISO === today && t.type !== 'reversal' && !t.voided);
  const sumOf = (type: string) => todays.filter(t => t.type === type).reduce((s, t) => s + t.amount, 0);
  const cash = cashAccounts.find(a => a.type === 'cashier');
  const fy = yearEnd(Number(somitiInfo.fiscalYearStartMonth) || 7, today);
  const recent = transactions.filter(t => t.type !== 'reversal').slice(0, 6);
  const somitiDisplayName = somitiName(somitiInfo, l('Your society', 'আপনার সমিতি'));

  const tasks: { key: string; dot: string; warn?: boolean; title: string; sub: string; href: string }[] = [];
  if (overdue.length) tasks.push({ key: 'due', dot: formatNum(overdue.length), warn: true, title: l(`${formatNum(overdue.length)} people have overdue installments`, `${formatNum(overdue.length)} জনের কিস্তি মেয়াদ পার`), sub: l(`Total ${formatMoney(overdueAmount)} · send a reminder`, `মোট ${formatMoney(overdueAmount)} · রিমাইন্ডার পাঠান`), href: '/(admin)/due' });
  if (legacyPending) tasks.push({ key: 'legacy', dot: formatNum(legacyPending), warn: true, title: l('Older requests to close', 'পুরনো আবেদন শেষ করা বাকি'), sub: l('Made before approvals moved outside the app', 'অনুমোদন অ্যাপের বাইরে নেওয়ার আগের আবেদন'), href: '/(admin)/approvals' });
  if (fy.days >= 0 && fy.days <= 90) tasks.push({ key: 'fy', dot: formatNum(fy.days), title: l(`${formatNum(fy.days)} days to year end`, `বছর শেষ হতে ${formatNum(fy.days)} দিন`), sub: l(`${formatHumanDate(fy.iso, false)} · check the profit draft`, `${formatHumanDate(fy.iso, true)} · মুনাফা বণ্টনের খসড়া দেখুন`), href: '/(admin)/distribution' });
  tasks.push({ key: 'today', dot: formatNum(todays.length), title: l(`${formatNum(todays.length)} entries today`, `আজ ${formatNum(todays.length)}টা এন্ট্রি`), sub: [l(`Deposits ${formatMoney(sumOf('deposit'))}`, `জমা ${formatMoney(sumOf('deposit'))}`), sumOf('expense') ? l(`Expenses ${formatMoney(sumOf('expense'))}`, `খরচ ${formatMoney(sumOf('expense'))}`) : '', cash ? l(`Cash in hand ${formatMoney(cash.amount)}`, `হাতে নগদ ${formatMoney(cash.amount)}`) : ''].filter(Boolean).join(' · '), href: '/(admin)/ledger' });

  tasks.push({ key: 'close', dot: '৳', title: l('Day close: count the cash', 'দিন শেষের হিসাব মেলান'), sub: l('Count cash in hand and match it with the app', 'হাতের টাকা গুনে অ্যাপের সাথে মেলান'), href: '/(admin)/day-close' });

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerLeft} onPress={() => router.push('/(admin)/somiti')} activeOpacity={0.7}>
          <Image source={require('../../../assets/logo-transparent.png')} style={styles.brandLogo} resizeMode="contain" accessibilityLabel={l('Amanot logo', 'আমানত লোগো')} />
          <View style={styles.headerIdentity}>
            <Text style={styles.somitiName} numberOfLines={2}>{somitiDisplayName}</Text>
            <Text style={styles.subHeader}>{l(new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }), `${BENGALI_MONTHS_FULL[new Date().getMonth()]} ${toBengaliDigits(new Date().getFullYear())}`)} · {formatNum(members.length)} {l('Members', 'জন সদস্য')}</Text>
          </View>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}>
        <Pressable accessibilityRole="button" onPress={() => router.push('/(admin)/finance')} style={styles.card}>
          <Text style={styles.label}>{l('Total fund (cash, bank and investments out)', 'মোট তহবিল (হাতে, ব্যাংকে ও বাইরে বিনিয়োগ)')}</Text>
          <Text style={styles.total}>{formatMoney(cashAndBank + invested)}</Text>
          <View style={styles.split}><Text style={styles.small}>{l('Cash & bank', 'হাতে ও ব্যাংকে')} {formatMoney(cashAndBank)}</Text><Text style={styles.small}>{l('Invested', 'বাইরে বিনিয়োগ')} {formatMoney(invested)}</Text></View>
        </Pressable>

        <View style={styles.card}>
          <View style={styles.cardHead}><Text style={styles.cardTitle}>{l("Today's work", 'আজকের কাজ')}</Text></View>
          {tasks.map((t, i) => <Pressable key={t.key} accessibilityRole="button" onPress={() => router.push(t.href as any)} style={[styles.task, i > 0 && styles.divider]}>
            <View style={[styles.dot, t.warn ? styles.dotWarn : styles.dotOk]}><Text style={[styles.dotText, { color: t.warn ? colors.warning : colors.primary }]} numberOfLines={1}>{t.dot}</Text></View>
            <View style={{ flex: 1, minWidth: 0 }}><Text style={styles.taskTitle}>{t.title}</Text><Text style={styles.small}>{t.sub}</Text></View>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </Pressable>)}
          {!overdue.length && !legacyPending ? <Text style={[styles.small, { marginTop: 8 }]}>{l('No overdue installments. All good.', 'কোনো কিস্তি বকেয়া নেই। সব ঠিক আছে।')}</Text> : null}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHead}><Text style={styles.cardTitle}>{l('Latest entries', 'সাম্প্রতিক')}</Text>
            <Pressable accessibilityRole="button" onPress={() => router.push('/(admin)/ledger')}><Text style={styles.link}>{l('See all', 'সব দেখুন')}</Text></Pressable></View>
          {recent.length ? recent.map((t, i) => <View key={t.id} style={i > 0 ? styles.divider : undefined}><EntryRow entry={t} onPress={() => t.type === 'withdrawal' ? router.push({ pathname: '/(admin)/withdrawals', params: { requestId: t.id } }) : t.projectId ? router.push(`/(admin)/project/${t.projectId}` as any) : setOpen(t)} /></View>)
            : <Text style={styles.small}>{l('Nothing entered yet. Tap + below to make the first entry.', 'এখনো কোনো এন্ট্রি নেই। নিচের + চেপে প্রথম এন্ট্রি দিন।')}</Text>}
        </View>

        <View style={styles.shortcuts}>
          {([['wallet-outline', l('Accounts', 'হিসাব'), '/(admin)/finance'], ['document-text-outline', l('Reports', 'রিপোর্ট'), '/(admin)/reports'], ['megaphone-outline', l('Notices', 'নোটিশ'), '/(admin)/notices']] as const).map(([icon, label, href]) =>
            <Pressable key={href} accessibilityRole="button" onPress={() => router.push(href as any)} style={styles.shortcut}><Ionicons name={icon} size={20} color={colors.primary} /><Text style={styles.shortcutText}>{label}</Text></Pressable>)}
        </View>
        <View style={{ height: 24 }} />
      </ScrollView>
      <EntryActions entry={open} onClose={() => setOpen(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10, backgroundColor: colors.bg },
  headerLeft: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIdentity: { flex: 1, minWidth: 0 },
  brandLogo: { width: 48, height: 48, flexShrink: 0 },
  somitiName: { fontFamily: typography.fontFamily.bold, fontSize: typography.size.title, lineHeight: typography.lineHeight.title, color: colors.text },
  subHeader: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.caption, lineHeight: typography.lineHeight.caption, color: colors.textSecondary },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  card: { backgroundColor: colors.surface, borderRadius: 18, padding: 16 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  cardTitle: { fontFamily: typography.fontFamily.bold, fontSize: 16, color: colors.text },
  label: { fontFamily: typography.fontFamily.regular, fontSize: 13, color: colors.textSecondary },
  total: { fontFamily: typography.fontFamily.bold, fontSize: 30, color: colors.primary, marginVertical: 4 },
  split: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  small: { fontFamily: typography.fontFamily.regular, fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  task: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  divider: { borderTopWidth: 1, borderTopColor: colors.borderLight },
  dot: { minWidth: 34, height: 34, paddingHorizontal: 6, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dotWarn: { backgroundColor: colors.warningSoft }, dotOk: { backgroundColor: colors.primarySoft },
  dotText: { fontFamily: typography.fontFamily.bold, fontSize: 13 },
  taskTitle: { fontFamily: typography.fontFamily.semiBold, fontSize: 15, color: colors.text },
  link: { fontFamily: typography.fontFamily.semiBold, fontSize: 14, color: colors.primary },
  shortcuts: { flexDirection: 'row', gap: 10 },
  shortcut: { flex: 1, backgroundColor: colors.surface, borderRadius: 14, paddingVertical: 12, alignItems: 'center', gap: 4 },
  shortcutText: { fontFamily: typography.fontFamily.semiBold, fontSize: 13, color: colors.text },
});
