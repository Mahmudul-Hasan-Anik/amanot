import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Page } from '../../src/components/Page';
import { SearchBar } from '../../src/components/SearchBar';
import { Avatar } from '../../src/components/Avatar';
import Ionicons from '@expo/vector-icons/Ionicons';
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
  const totalOverdue = roundMoney(rows.reduce((t, r) => t + r.overdue, 0));
  return <Page title={l('Collect installment', 'কিস্তি নিন')} backTo="/(admin)/(tabs)">
    <SearchBar value={query} onChangeText={setQuery} placeholder={l('Name, phone or contract no.', 'নাম, ফোন বা চুক্তি নম্বর')} />
    <Text style={st.hint}>{totalOverdue > 0 ? l(`Who is paying? Overdue first · ${money(totalOverdue)} overdue in total`, `কে টাকা দিচ্ছেন বাছুন · মোট বকেয়া ${money(totalOverdue)}`) : l('Who is paying? Earliest installment first.', 'কে টাকা দিচ্ছেন বাছুন · আগের কিস্তি আগে')}</Text>
    {!visible.length && !legacyVisible.length ? <View style={st.emptyBox}><Ionicons name="briefcase-outline" size={28} color={colors.textSecondary} /><Text style={st.empty}>{q ? l('No match.', 'কিছু পাওয়া যায়নি।') : l('No running investments.', 'চলমান কোনো বিনিয়োগ নেই।')}</Text></View> : null}
    {visible.length ? <View style={st.card}>{visible.map(({ p, next, overdue }, i) => <Pressable key={p.id} accessibilityRole="button" onPress={() => router.replace(`/(admin)/project/${p.id}?action=collect` as any)} style={({ pressed }) => [st.row, i > 0 && st.divider, pressed && { opacity: 0.7 }]}>
      <Avatar name={p.contract!.recipientName} size="md" />
      <View style={{ flex: 1, minWidth: 0 }}><Text style={st.name} numberOfLines={1}>{p.contract!.recipientName}</Text>
        <Text style={st.meta} numberOfLines={1}>{p.contract!.number} · {`${l('Next', 'পরবর্তী')} ${formatHumanDate(next!.dueDate, isBengali)}`}</Text>
        {overdue > 0 ? <View style={st.warnTag}><Text style={st.warnText}>{l(`Overdue ${money(overdue)}`, `বকেয়া ${money(overdue)}`)}</Text></View> : null}</View>
      <View style={{ alignItems: 'flex-end' }}><Text style={st.amount}>{money(next!.remaining)}</Text><Ionicons name="chevron-forward" size={16} color={colors.textSecondary} /></View>
    </Pressable>)}</View> : null}
    {legacyVisible.length ? <Text style={st.section}>{l('Older investments', 'পুরনো বিনিয়োগ')}</Text> : null}
    {legacyVisible.length ? <View style={st.card}>{legacyVisible.map((p, i) => <Pressable key={p.id} accessibilityRole="button" onPress={() => router.replace(`/(admin)/project/${p.id}` as any)} style={[st.row, i > 0 && st.divider]}>
      <View style={st.tile}><Ionicons name="briefcase-outline" size={18} color={colors.primary} /></View>
      <View style={{ flex: 1, minWidth: 0 }}><Text style={st.name} numberOfLines={1}>{p.name}</Text><Text style={st.meta}>{l('Principal outstanding', 'মূলধন বাকি')}</Text></View>
      <Text style={st.amount}>{money(p.remainingAmount)}</Text>
    </Pressable>)}</View> : null}
  </Page>;
}
const st = StyleSheet.create({
  hint: { fontFamily: typography.fontFamily.regular, fontSize: 13, lineHeight: 20, color: colors.textSecondary, marginTop: 12, marginBottom: 10 },
  card: { backgroundColor: colors.surface, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 4, marginBottom: 12, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  tile: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: typography.fontFamily.semiBold, fontSize: 15, lineHeight: 22, color: colors.text },
  meta: { fontFamily: typography.fontFamily.regular, fontSize: 13, lineHeight: 19, color: colors.textSecondary },
  warnTag: { alignSelf: 'flex-start', backgroundColor: colors.warningSoft, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 1, marginTop: 4 },
  warnText: { fontFamily: typography.fontFamily.semiBold, fontSize: 12, lineHeight: 18, color: colors.warning },
  amount: { fontFamily: typography.fontFamily.bold, fontSize: 16, color: colors.primary },
  section: { fontFamily: typography.fontFamily.bold, fontSize: typography.size.base, color: colors.text, marginTop: 8, marginBottom: 10 },
  emptyBox: { alignItems: 'center', gap: 8, paddingVertical: 32 },
  empty: { fontFamily: typography.fontFamily.regular, fontSize: 15, color: colors.textSecondary, textAlign: 'center' },
});
