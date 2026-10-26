import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Page } from '../../src/components/Page';
import { Input } from '../../src/components/Input';
import { formatHumanDate } from '../../src/components/DateField';
import { useSomitiStore } from '../../src/store/somitiStore';
import { useLanguage } from '../../src/i18n/useLanguage';
import { investmentSchedule, roundMoney } from '../../src/lib/investment';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';

/** "Collect installment" from the + button: pick who is paying, then the collection form opens. */
export default function CollectInstallmentScreen() {
  const router = useRouter();
  const { l, isBengali, formatMoneyPrecise: money } = useLanguage();
  const projects = useSomitiStore(s => s.projects);
  const [query, setQuery] = useState('');
  const rows = useMemo(() => projects.filter(p => p.contract && p.status !== 'completed').map(p => {
    const schedule = investmentSchedule(p.contract!, p.returnedAmount);
    const next = schedule.find(i => i.remaining > 0);
    const overdue = roundMoney(schedule.filter(i => i.overdue).reduce((sum, i) => sum + i.remaining, 0));
    return { p, next, overdue };
  }).filter(r => r.next).sort((a, b) => a.next!.dueDate.localeCompare(b.next!.dueDate)), [projects]);
  // Older investments (before contracts) are collected on their own screen.
  const legacy = projects.filter(p => !p.contract && p.status !== 'completed');
  const q = query.trim().toLowerCase();
  const legacyVisible = legacy.filter(p => !q || p.name.toLowerCase().includes(q));
  const visible = rows.filter(r => !q || [r.p.contract!.recipientName, r.p.contract!.phone, r.p.contract!.number].join(' ').toLowerCase().includes(q));
  return <Page title={l('Collect installment', 'কিস্তি নিন')} backTo="/(admin)/(tabs)">
    <Input value={query} onChangeText={setQuery} placeholder={l('Name, phone or contract no.', 'নাম, ফোন বা চুক্তি নম্বর')} accessibilityLabel={l('Search', 'খুঁজুন')} />
    {!visible.length && !legacyVisible.length ? <Text style={st.empty}>{l('No running investments.', 'চলমান কোনো বিনিয়োগ নেই।')}</Text> : null}
    <View style={{ gap: 8 }}>{visible.map(({ p, next, overdue }) => <Pressable key={p.id} accessibilityRole="button" onPress={() => router.replace(`/(admin)/project/${p.id}?action=collect` as any)} style={[st.card, overdue > 0 && { borderColor: colors.warning }]}>
      <View style={{ flex: 1 }}><Text style={st.name}>{p.contract!.recipientName}</Text>
        <Text style={[st.meta, overdue > 0 && { color: colors.warning }]}>{overdue > 0 ? l(`Overdue ${money(overdue)}`, `বকেয়া ${money(overdue)}`) : `${l('Next', 'পরবর্তী')} ${formatHumanDate(next!.dueDate, isBengali)}`} · {p.contract!.number}</Text></View>
      <Text style={st.amount}>{money(next!.remaining)}</Text>
    </Pressable>)}</View>
    {legacyVisible.length ? <Text style={st.section}>{l('Older investments', 'পুরনো বিনিয়োগ')}</Text> : null}
    <View style={{ gap: 8 }}>{legacyVisible.map(p => <Pressable key={p.id} accessibilityRole="button" onPress={() => router.replace(`/(admin)/project/${p.id}` as any)} style={st.card}>
      <View style={{ flex: 1 }}><Text style={st.name}>{p.name}</Text><Text style={st.meta}>{l('Principal outstanding', 'মূলধন বাকি')}</Text></View>
      <Text style={st.amount}>{money(p.remainingAmount)}</Text>
    </Pressable>)}</View>
  </Page>;
}
const st = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.borderLight },
  name: { fontFamily: typography.fontFamily.semiBold, fontSize: 16, color: colors.text },
  meta: { fontFamily: typography.fontFamily.regular, fontSize: 13, color: colors.textSecondary },
  amount: { fontFamily: typography.fontFamily.bold, fontSize: 16, color: colors.primary },
  section: { fontFamily: typography.fontFamily.semiBold, fontSize: 14, color: colors.textSecondary, marginTop: 18, marginBottom: 8 },
  empty: { fontFamily: typography.fontFamily.regular, fontSize: 15, color: colors.textSecondary, textAlign: 'center', paddingVertical: 24 },
});
