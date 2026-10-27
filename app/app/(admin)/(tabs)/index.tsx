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
import { signedTransactionAmount } from '../../../src/lib/ledger';
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

  const month = today.slice(0, 7);
  const monthTx = transactions.filter(t => t.dateISO?.startsWith(month));
  const monthIn = monthTx.length ? roundMoney(monthTx.reduce((s, t) => s + Math.max(0, signedTransactionAmount(t)), 0)) : (somitiInfo.monthlyIncome || 0);
  const monthOut = monthTx.length ? roundMoney(monthTx.reduce((s, t) => s + Math.max(0, -signedTransactionAmount(t)), 0)) : (somitiInfo.monthlyExpense || 0);
  const monthNet = roundMoney(monthIn - monthOut);
  const total = cashAndBank + invested;
  const investedPct = total > 0 ? Math.min(100, Math.round((invested / total) * 100)) : 0;
  const activeCount = projects.filter(p => p.status !== 'completed').length;
  const quick: [keyof typeof Ionicons.glyphMap, string, string][] = [
    ['add', l('Deposit', 'জমা নিন'), '/(admin)/deposit/new'],
    ['repeat-outline', l('Installment', 'কিস্তি নিন'), '/(admin)/collect'],
    ['arrow-undo-outline', l('Pay back', 'টাকা ফেরত'), '/(admin)/withdrawals?new=1'],
    ['receipt-outline', l('Expense', 'খরচ লিখুন'), '/(admin)/expense/new'],
  ];

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
        <TouchableOpacity style={styles.bell} accessibilityRole="button" accessibilityLabel={l('Notices', 'নোটিশ')} onPress={() => router.push((legacyPending ? '/(admin)/approvals' : '/(admin)/notices') as any)} activeOpacity={0.7}>
          <Ionicons name="notifications-outline" size={20} color={colors.text} />
          {legacyPending > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{formatNum(legacyPending)}</Text></View>}
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}>

        <Pressable accessibilityRole="button" onPress={() => router.push('/(admin)/finance')} style={({ pressed }) => [styles.hero, pressed && { opacity: 0.95 }]}>
          <View style={styles.heroTop}>
            <Text style={styles.heroTitle}>{l('Total fund', 'মোট তহবিল')}</Text>
            {monthNet !== 0 && <View style={styles.pill}>
              <Ionicons name={monthNet < 0 ? 'arrow-down' : 'arrow-up'} size={12} color={colors.primary} />
              <Text style={styles.pillText}>{formatMoney(Math.abs(monthNet))} {l('this month', 'এ মাসে')}</Text>
            </View>}
          </View>
          <Text style={styles.heroAmount}>{formatMoney(total)}</Text>
          <View style={styles.bar}><View style={[styles.barFill, { width: `${investedPct}%` }]} /></View>
          <View style={styles.heroFoot}>
            <View style={{ flex: 1 }}><Text style={styles.heroFootLabel}>{l('Invested out', 'বিনিয়োগে আছে')}</Text><Text style={styles.heroFootValue}>{formatMoney(invested)} · {formatNum(investedPct)}%</Text></View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}><Text style={styles.heroFootLabel}>{l('Cash & bank', 'হাতে ও ব্যাংকে')}</Text><Text style={styles.heroFootValue}>{formatMoney(cashAndBank)} · {formatNum(total > 0 ? 100 - investedPct : 0)}%</Text></View>
          </View>
        </Pressable>

        <View style={styles.quickRow}>
          {quick.map(([icon, label, href]) => <TouchableOpacity key={href} style={styles.quickBtn} accessibilityRole="button" onPress={() => router.push(href as any)} activeOpacity={0.8}>
            <View style={styles.quickCircle}><Ionicons name={icon} size={icon === 'add' ? 26 : 22} color={colors.primary} /></View>
            <Text style={styles.quickLabel} numberOfLines={1}>{label}</Text>
          </TouchableOpacity>)}
        </View>

        <Pressable accessibilityRole="button" onPress={() => router.push('/(admin)/ledger')} style={styles.card}>
          <Text style={[styles.cardTitle, { marginBottom: 12 }]}>{l('This month', 'এ মাসের হিসাব')}</Text>
          <View style={styles.threeCol}>
            <View style={styles.col}><Text style={styles.colLabel}>{l('Money in', 'এসেছে')}</Text><Text style={styles.colValue} numberOfLines={1} adjustsFontSizeToFit>{formatMoney(monthIn)}</Text></View>
            <View style={styles.colDivider} />
            <View style={styles.col}><Text style={styles.colLabel}>{l('Money out', 'গেছে')}</Text><Text style={styles.colValue} numberOfLines={1} adjustsFontSizeToFit>{formatMoney(monthOut)}</Text></View>
            <View style={styles.colDivider} />
            <View style={styles.col}><Text style={styles.colLabel}>{l('Net', 'নিট')}</Text><Text style={[styles.colValue, { color: monthNet < 0 ? colors.warning : colors.primary }]} numberOfLines={1} adjustsFontSizeToFit>{formatMoney(monthNet)}</Text></View>
          </View>
        </Pressable>

        <View style={styles.twoCol}>
          <Pressable accessibilityRole="button" onPress={() => router.push('/(admin)/(tabs)/projects')} style={[styles.card, styles.half]}>
            <View style={styles.halfHead}><Ionicons name="briefcase-outline" size={16} color={colors.primary} /><Text style={styles.halfTitle}>{l('Active investments', 'চলমান বিনিয়োগ')}</Text></View>
            <Text style={styles.halfValue}>{formatNum(activeCount)}{l('', 'টি')}</Text>
            <Text style={styles.halfSub} numberOfLines={1}>{l('Out', 'বাইরে')} {formatMoney(invested)}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.push('/(admin)/due')} style={[styles.card, styles.half, overdue.length ? styles.halfWarn : null]}>
            <View style={styles.halfHead}><Ionicons name={overdue.length ? 'alert-circle-outline' : 'checkmark-circle-outline'} size={16} color={overdue.length ? colors.warning : colors.primary} /><Text style={styles.halfTitle}>{l('Overdue', 'বকেয়া কিস্তি')}</Text></View>
            <Text style={[styles.halfValue, overdue.length ? { color: colors.warning } : null]} numberOfLines={1} adjustsFontSizeToFit>{overdue.length ? formatMoney(overdueAmount) : l('None', 'নেই')}</Text>
            <Text style={[styles.halfSub, overdue.length ? { color: colors.warning } : null]} numberOfLines={1}>{overdue.length ? l(`${formatNum(overdue.length)} people`, `${formatNum(overdue.length)} জন`) : l('All on time', 'সবাই সময়মতো')}</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={[styles.cardTitle, { marginBottom: 4 }]}>{l("Today's work", 'আজকের কাজ')}</Text>
          {tasks.filter(t => t.key !== 'due').map((t, i) => <Pressable key={t.key} accessibilityRole="button" onPress={() => router.push(t.href as any)} style={[styles.task, i > 0 && styles.divider]}>
            <View style={[styles.dot, t.warn ? styles.dotWarn : styles.dotOk]}><Text style={[styles.dotText, { color: t.warn ? colors.warning : colors.primary }]} numberOfLines={1}>{t.dot}</Text></View>
            <View style={{ flex: 1, minWidth: 0 }}><Text style={styles.taskTitle}>{t.title}</Text><Text style={styles.small} numberOfLines={2}>{t.sub}</Text></View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </Pressable>)}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHead}><Text style={styles.cardTitle}>{l('Latest entries', 'সাম্প্রতিক এন্ট্রি')}</Text>
            <Pressable accessibilityRole="button" onPress={() => router.push('/(admin)/ledger')} hitSlop={8}><Text style={styles.link}>{l('See all', 'সব দেখুন')}</Text></Pressable></View>
          {recent.length ? recent.map((t, i) => <View key={t.id} style={i > 0 ? styles.divider : undefined}><EntryRow entry={t} onPress={() => t.type === 'withdrawal' ? router.push({ pathname: '/(admin)/withdrawals', params: { requestId: t.id } }) : t.projectId ? router.push(`/(admin)/project/${t.projectId}` as any) : setOpen(t)} /></View>)
            : <View style={styles.empty}><Ionicons name="document-text-outline" size={28} color={colors.textSecondary} /><Text style={[styles.small, { textAlign: 'center' }]}>{l('Nothing entered yet. Tap + below to make the first entry.', 'এখনো কোনো এন্ট্রি নেই। নিচের + চেপে প্রথম এন্ট্রি দিন।')}</Text></View>}
        </View>
        <View style={{ height: 24 }} />
      </ScrollView>
      <EntryActions entry={open} onClose={() => setOpen(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10, backgroundColor: colors.bg, gap: 12 },
  headerLeft: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIdentity: { flex: 1, minWidth: 0 },
  brandLogo: { width: 48, height: 48, flexShrink: 0 },
  somitiName: { fontFamily: typography.fontFamily.bold, fontSize: typography.size.title, lineHeight: typography.lineHeight.title, color: colors.text },
  subHeader: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.caption, lineHeight: typography.lineHeight.caption, color: colors.textSecondary },
  bell: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 2, right: 2, backgroundColor: colors.warning, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText: { fontFamily: typography.fontFamily.bold, fontSize: 10, lineHeight: 14, color: colors.surface },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },
  hero: { backgroundColor: colors.primary, borderRadius: 20, padding: 20, marginBottom: 18, shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 4 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  heroTitle: { fontFamily: typography.fontFamily.medium, fontSize: typography.size.subhead, lineHeight: typography.lineHeight.subhead, color: colors.surface, opacity: 0.9 },
  pill: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primarySoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, gap: 4, flexShrink: 1 },
  pillText: { fontFamily: typography.fontFamily.bold, fontSize: typography.size.xs, lineHeight: typography.lineHeight.xs, color: colors.primary },
  heroAmount: { ...typography.displayAmount, color: colors.surface, marginVertical: 10 },
  bar: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden', marginBottom: 14 },
  barFill: { height: '100%', backgroundColor: colors.surface, borderRadius: 3 },
  heroFoot: { flexDirection: 'row', gap: 12 },
  heroFootLabel: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.xs, lineHeight: typography.lineHeight.xs, color: colors.surface, opacity: 0.8, marginBottom: 2 },
  heroFootValue: { fontFamily: typography.fontFamily.bold, fontSize: typography.size.sm, lineHeight: typography.lineHeight.sm, color: colors.surface },
  quickRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18, paddingHorizontal: 2 },
  quickBtn: { flex: 1, alignItems: 'center' },
  quickCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: 6, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  quickLabel: { fontFamily: typography.fontFamily.medium, fontSize: typography.size.caption, lineHeight: typography.lineHeight.caption, color: colors.text },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  cardTitle: { fontFamily: typography.fontFamily.bold, fontSize: typography.size.base, lineHeight: typography.lineHeight.base, color: colors.text },
  threeCol: { flexDirection: 'row', alignItems: 'center' },
  col: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  colDivider: { width: 1, height: 30, backgroundColor: colors.border },
  colLabel: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.caption, lineHeight: typography.lineHeight.caption, color: colors.textSecondary, marginBottom: 4 },
  colValue: { fontFamily: typography.fontFamily.bold, fontSize: typography.size.md, lineHeight: typography.lineHeight.md, color: colors.text },
  twoCol: { flexDirection: 'row', gap: 12 },
  half: { flex: 1, minHeight: 110, justifyContent: 'space-between', padding: 14 },
  halfWarn: { backgroundColor: colors.warningSoft, shadowOpacity: 0 },
  halfHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  halfTitle: { fontFamily: typography.fontFamily.medium, fontSize: typography.size.sm, lineHeight: typography.lineHeight.sm, color: colors.text },
  halfValue: { fontFamily: typography.fontFamily.bold, fontSize: typography.size.xl, lineHeight: typography.lineHeight.xl, color: colors.primary, marginVertical: 4 },
  halfSub: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.xs, lineHeight: typography.lineHeight.xs, color: colors.textSecondary },
  small: { fontFamily: typography.fontFamily.regular, fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  task: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  dot: { minWidth: 36, height: 36, paddingHorizontal: 6, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dotWarn: { backgroundColor: colors.warningSoft }, dotOk: { backgroundColor: colors.primarySoft },
  dotText: { fontFamily: typography.fontFamily.bold, fontSize: 13 },
  taskTitle: { fontFamily: typography.fontFamily.semiBold, fontSize: 15, lineHeight: 22, color: colors.text },
  link: { fontFamily: typography.fontFamily.medium, fontSize: typography.size.subhead, color: colors.primary },
  empty: { alignItems: 'center', gap: 6, paddingVertical: 16 },
});
