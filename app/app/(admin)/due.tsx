import React, { useMemo } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Page } from '../../src/components/Page';
import { Button } from '../../src/components/Button';
import { formatHumanDate } from '../../src/components/DateField';
import { useSomitiStore } from '../../src/store/somitiStore';
import { useLanguage } from '../../src/i18n/useLanguage';
import { investmentSchedule, roundMoney } from '../../src/lib/investment';
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
  return <Page title={l('Overdue installments', 'বকেয়া কিস্তি')} backTo="/(admin)/(tabs)">
    <View style={st.hero}><Text style={st.heroLabel}>{l('Total overdue', 'মোট বকেয়া')}</Text><Text style={st.heroAmount}>{money(total)}</Text>
      <Text style={st.heroSub}>{l(`${formatNum(rows.length)} people`, `${formatNum(rows.length)} জন`)}</Text></View>
    <FlatList scrollEnabled={false} data={rows} keyExtractor={r => r.p.id} contentContainerStyle={{ gap: 10 }}
      ListEmptyComponent={<Text style={st.empty}>{l('No overdue installments. All good.', 'কোনো কিস্তি বকেয়া নেই। সব ঠিক আছে।')}</Text>}
      renderItem={({ item: { p, late, amount } }) => <Pressable accessibilityRole="button" onPress={() => router.push(`/(admin)/project/${p.id}` as any)} style={st.card}>
        <View style={st.row}><View style={{ flex: 1 }}><Text style={st.name}>{p.contract!.recipientName}</Text>
          <Text style={st.meta}>{p.contract!.number} · {l(`${formatNum(late.length)} installments since ${formatHumanDate(late[0].dueDate, false)}`, `${formatNum(late.length)} কিস্তি · ${formatHumanDate(late[0].dueDate, true)} থেকে`)}</Text></View>
          <Text style={st.amount}>{money(amount)}</Text></View>
        <View style={st.row}>
          <Button size="sm" style={{ flex: 1 }} title={l('Collect', 'কিস্তি নিন')} onPress={() => router.push(`/(admin)/project/${p.id}?action=collect` as any)} />
          <Button size="sm" style={{ flex: 1 }} variant="outline" title={l('Remind on WhatsApp', 'WhatsApp রিমাইন্ডার')} onPress={() => router.push(`/(admin)/project/${p.id}` as any)} />
        </View>
      </Pressable>} />
  </Page>;
}
const st = StyleSheet.create({
  hero: { backgroundColor: colors.warningSoft, borderRadius: 20, padding: 20, marginBottom: 16 },
  heroLabel: { fontFamily: typography.fontFamily.medium, color: colors.warning, fontSize: 14 },
  heroAmount: { fontFamily: typography.fontFamily.bold, color: colors.warning, fontSize: 30 },
  heroSub: { fontFamily: typography.fontFamily.regular, color: colors.warning, fontSize: 13 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 14, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontFamily: typography.fontFamily.semiBold, fontSize: 16, color: colors.text },
  meta: { fontFamily: typography.fontFamily.regular, fontSize: 13, color: colors.textSecondary },
  amount: { fontFamily: typography.fontFamily.bold, fontSize: 16, color: colors.warning },
  empty: { fontFamily: typography.fontFamily.regular, fontSize: 15, color: colors.textSecondary, textAlign: 'center', paddingVertical: 30 },
});
