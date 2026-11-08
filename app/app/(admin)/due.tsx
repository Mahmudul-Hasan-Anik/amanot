import React, { useMemo } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Page } from '../../src/components/Page';
import { Button } from '../../src/components/Button';
import { Avatar } from '../../src/components/Avatar';
import Ionicons from '@expo/vector-icons/Ionicons';
import { formatHumanDate } from '../../src/components/DateField';
import { useSomitiStore } from '../../src/store/somitiStore';
import { useLanguage } from '../../src/i18n/useLanguage';
import { investmentSchedule, isoToday, roundMoney } from '../../src/lib/investment';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';

/**
 * Overdue installments. Savings are voluntary (no monthly due, no late fee),
 * so the only real dues are investment installments past their date.
 */
export default function DueListScreen() {
  const router = useRouter();
  const { l, formatMoneyPrecise: money, formatNum } = useLanguage();
  const projects = useSomitiStore(s => s.projects);
  const rows = useMemo(() => projects.filter(p => p.contract && p.status !== 'completed').map(p => {
    const schedule = investmentSchedule(p.contract!, p.returnedAmount);
    const late = schedule.filter(i => i.overdue);
    return { p, late, amount: roundMoney(late.reduce((sum, i) => sum + i.remaining, 0)) };
  }).filter(r => r.amount > 0).sort((a, b) => a.late[0].dueDate.localeCompare(b.late[0].dueDate)), [projects]);
  const total = roundMoney(rows.reduce((sum, r) => sum + r.amount, 0));
  const today = isoToday();
  const daysLate = (d: string) => Math.max(0, Math.round((new Date(today + 'T00:00:00Z').getTime() - new Date(d + 'T00:00:00Z').getTime()) / 86400000));
  const buckets = [
    { key: 'a', label: l('Up to 30 days', '৩০ দিন পর্যন্ত'), color: colors.aging.month1, rows: rows.filter(r => daysLate(r.late[0].dueDate) <= 30) },
    { key: 'b', label: l('31–60 days', '৩১–৬০ দিন'), color: colors.aging.month2, rows: rows.filter(r => { const d = daysLate(r.late[0].dueDate); return d > 30 && d <= 60; }) },
    { key: 'c', label: l('Over 60 days', '৬০ দিনের বেশি'), color: colors.aging.month3Plus, rows: rows.filter(r => daysLate(r.late[0].dueDate) > 60) },
  ].map(b => ({ ...b, amount: roundMoney(b.rows.reduce((s, r) => s + r.amount, 0)) }));
  if (!rows.length) return <Page title={l('Overdue installments', 'বকেয়া কিস্তি')} backTo="/(admin)/(tabs)">
    <View style={st.okHero}>
      <View style={st.okIcon}><Ionicons name="checkmark" size={30} color={colors.surface} /></View>
      <Text style={st.okTitle}>{l('No overdue installments', 'কোনো কিস্তি বকেয়া নেই')}</Text>
      <Text style={st.okSub}>{l('Everyone is paying on time. Overdue installments of investments will show up here.', 'সবাই সময়মতো দিচ্ছেন। কোনো বিনিয়োগের কিস্তি তারিখ পার হলে এখানে দেখাবে।')}</Text>
    </View>
    <Button variant="outline" title={l('See all investments', 'সব বিনিয়োগ দেখুন')} onPress={() => router.push('/(admin)/(tabs)/projects')} />
  </Page>;
  return <Page title={l('Overdue installments', 'বকেয়া কিস্তি')} backTo="/(admin)/(tabs)">
    <View style={st.hero}><Text style={st.heroLabel}>{l('Total overdue', 'মোট বকেয়া')}</Text><Text style={st.heroAmount}>{money(total)}</Text>
      <Text style={st.heroSub}>{l(`${formatNum(rows.length)} people · investment installments`, `${formatNum(rows.length)} জন · বিনিয়োগের কিস্তি`)}</Text></View>
    <View style={st.card}>
      <Text style={st.cardTitle}>{l('How late', 'কত দিনের বকেয়া')}</Text>
      <View style={st.bar}>{buckets.filter(b => b.amount > 0).map(b => <View key={b.key} style={{ flex: b.amount, backgroundColor: b.color }} />)}</View>
      {buckets.map(b => <View key={b.key} style={st.legend}>
        <View style={[st.swatch, { backgroundColor: b.color }]} /><Text style={st.legendLabel}>{b.label}</Text>
        <Text style={st.legendMeta}>{l(`${formatNum(b.rows.length)} people`, `${formatNum(b.rows.length)} জন`)}</Text><Text style={st.legendAmount}>{money(b.amount)}</Text>
      </View>)}
    </View>
    <Text style={st.section}>{l('People', 'কার কত বাকি')}</Text>
    <FlatList scrollEnabled={false} data={rows} keyExtractor={r => r.p.id}
      renderItem={({ item: { p, late, amount } }) => <Pressable accessibilityRole="button" onPress={() => router.push(`/(admin)/project/${p.id}` as any)} style={st.card}>
        <View style={st.row}>
          <Avatar name={p.contract!.recipientName} size="md" />
          <View style={{ flex: 1, minWidth: 0 }}><Text style={st.name} numberOfLines={1}>{p.contract!.recipientName}</Text>
            <Text style={st.meta} numberOfLines={2}>{p.contract!.number} · {l(`${formatNum(late.length)} installments · ${formatNum(daysLate(late[0].dueDate))} days late`, `${formatNum(late.length)} কিস্তি · ${formatNum(daysLate(late[0].dueDate))} দিন পার`)}</Text></View>
          <Text style={st.amount}>{money(amount)}</Text></View>
        <View style={[st.row, { marginTop: 12 }]}>
          <Button size="sm" style={{ flex: 1 }} title={l('Collect', 'কিস্তি নিন')} onPress={() => router.push(`/(admin)/project/${p.id}?action=collect` as any)} />
          <Button size="sm" style={{ flex: 1 }} variant="outline" title={l('Remind', 'রিমাইন্ডার')} onPress={() => router.push(`/(admin)/project/${p.id}` as any)} />
        </View>
      </Pressable>} />
  </Page>;
}
const st = StyleSheet.create({
  hero: { backgroundColor: colors.warningSoft, borderRadius: 20, padding: 20, marginBottom: 14 },
  heroLabel: { fontFamily: typography.fontFamily.medium, color: colors.warning, fontSize: typography.size.subhead, lineHeight: typography.lineHeight.subhead },
  heroAmount: { ...typography.displayAmount, color: colors.warning, marginVertical: 6 },
  heroSub: { fontFamily: typography.fontFamily.regular, color: colors.warning, fontSize: 13, lineHeight: 20 },
  okHero: { backgroundColor: colors.surface, borderRadius: 20, padding: 28, alignItems: 'center', marginBottom: 16, marginTop: 24, gap: 8, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  okIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  okTitle: { fontFamily: typography.fontFamily.bold, fontSize: typography.size.lg, lineHeight: typography.lineHeight.lg, color: colors.text, textAlign: 'center' },
  okSub: { fontFamily: typography.fontFamily.regular, fontSize: 14, lineHeight: 22, color: colors.textSecondary, textAlign: 'center' },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontFamily: typography.fontFamily.bold, fontSize: typography.size.base, lineHeight: typography.lineHeight.base, color: colors.text, marginBottom: 12 },
  bar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: colors.surfaceMuted, marginBottom: 12, gap: 2 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  legendLabel: { flex: 1, fontFamily: typography.fontFamily.medium, fontSize: 14, color: colors.text },
  legendMeta: { fontFamily: typography.fontFamily.regular, fontSize: 13, color: colors.textSecondary },
  legendAmount: { fontFamily: typography.fontFamily.bold, fontSize: 14, color: colors.text, minWidth: 80, textAlign: 'right' },
  section: { fontFamily: typography.fontFamily.bold, fontSize: typography.size.base, lineHeight: typography.lineHeight.base, color: colors.text, marginTop: 6, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontFamily: typography.fontFamily.semiBold, fontSize: 16, lineHeight: 24, color: colors.text },
  meta: { fontFamily: typography.fontFamily.regular, fontSize: 13, lineHeight: 19, color: colors.textSecondary },
  amount: { fontFamily: typography.fontFamily.bold, fontSize: 16, color: colors.warning },
});
