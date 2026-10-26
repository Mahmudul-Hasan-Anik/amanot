import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSomitiStore, REMOTE, Transaction } from '../../../src/store/somitiStore';
import { useLanguage } from '../../../src/i18n/useLanguage';
import { fetchMemberStatementSnapshot } from '../../../src/lib/api';
import { buildMemberStatement } from '../../../src/lib/memberStatement';
import { exportReport } from '../../../src/utils/reportExport';
import { formatHumanDate } from '../../../src/components/DateField';
import { Button } from '../../../src/components/Button';
import { safeBack } from '../../../src/utils/navigation';
import { colors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import type { Member } from '../../../src/mocks/mockData';

type Line = { date: string; receipt: string; what: string; inAmt: number; outAmt: number; balance: number };

/** A member's passbook: every deposit and withdrawal with the running balance, like a khata page. */
export default function PassbookScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { l, isBengali, formatMoneyPrecise: money } = useLanguage();
  const storeMember = useSomitiStore(s => s.members.find(m => m.id === id));
  const storeTx = useSomitiStore(s => s.transactions);
  const society = useSomitiStore(s => s.somitiInfo);
  const [data, setData] = useState<{ member: Member; transactions: Transaction[] } | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    if (!REMOTE) { if (storeMember) setData({ member: storeMember, transactions: storeTx.filter(t => t.memberId === id) }); return; }
    fetchMemberStatementSnapshot(String(id)).then(v => { if (live) setData(v); }, e => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  let lines: Line[] = [], opening = 0, report: ReturnType<typeof buildMemberStatement> | null = null, problem = '';
  if (data) {
    try {
      report = buildMemberStatement(data.member, data.transactions, isBengali ? 'bn' : 'en');
      const body = report.rows.slice(1, report.rows.length - 3);
      opening = Number(report.rows[0][6]);
      lines = body.map(r => ({ date: String(r[0]), receipt: String(r[1]), what: String(r[2]), inAmt: Number(r[3]) + Number(r[5]), outAmt: Number(r[4]), balance: Number(r[6]) }));
    } catch (e: any) { problem = e.message; }
  }
  const m = data?.member || storeMember;
  return <SafeAreaView style={s.root}>
    <View style={s.header}>
      <Pressable accessibilityRole="button" accessibilityLabel={l('Back', 'ফিরুন')} onPress={() => safeBack(router, `/(admin)/member/${id}`)} style={{ padding: 8 }}><Ionicons name="arrow-back" size={24} color={colors.text} /></Pressable>
      <View style={{ flex: 1 }}><Text style={s.title}>{l('Passbook', 'পাসবই')}</Text>{m ? <Text style={s.sub}>{m.name} · {m.code}</Text> : null}</View>
    </View>
    <ScrollView contentContainerStyle={s.content}>
      {error || problem ? <Text style={s.error}>{error || problem}</Text> : null}
      {!data && !error ? <Text style={s.muted}>{l('Loading…', 'লোড হচ্ছে…')}</Text> : null}
      {m ? <View style={s.summary}>
        <View style={{ flex: 1 }}><Text style={s.muted}>{l('Savings now', 'এখন সঞ্চয়')}</Text><Text style={s.big}>{money(m.totalDeposit)}</Text></View>
        {(m.profitBalance || 0) > 0 ? <View style={{ alignItems: 'flex-end' }}><Text style={s.muted}>{l('of which profit', 'এর মধ্যে মুনাফা')}</Text><Text style={s.mid}>{money(m.profitBalance || 0)}</Text></View> : null}
      </View> : null}
      {report ? <View style={s.table}>
        <View style={[s.tr, s.th]}><Text style={[s.c1, s.thText]}>{l('Date', 'তারিখ')}</Text><Text style={[s.c2, s.thText]}>{l('In', 'জমা')}</Text><Text style={[s.c2, s.thText]}>{l('Out', 'উত্তোলন')}</Text><Text style={[s.c3, s.thText]}>{l('Balance', 'ব্যালেন্স')}</Text></View>
        <View style={s.tr}><Text style={[s.c1, s.muted]}>{l('Opening', 'শুরুর ব্যালেন্স')}</Text><Text style={s.c2} /><Text style={s.c2} /><Text style={[s.c3, s.bal]}>{money(opening)}</Text></View>
        {lines.map((r, i) => <View key={i} style={s.tr}>
          <View style={s.c1}><Text style={s.date}>{/^\d{4}-\d{2}-\d{2}$/.test(r.date) ? formatHumanDate(r.date, isBengali) : r.date}</Text><Text style={s.small} numberOfLines={1}>{r.receipt}</Text></View>
          <Text style={[s.c2, s.in]}>{r.inAmt ? money(r.inAmt) : ''}</Text><Text style={[s.c2, s.out]}>{r.outAmt ? money(r.outAmt) : ''}</Text><Text style={[s.c3, s.bal]}>{money(r.balance)}</Text></View>)}
        {!lines.length ? <Text style={[s.muted, { padding: 12 }]}>{l('No deposits yet', 'এখনো কোনো জমা নেই')}</Text> : null}
        <Text style={[s.small, { padding: 10 }]}>{l('Balance here is own savings. Distributed profit is shown above, separately.', 'এখানের ব্যালেন্স নিজের জমা। বণ্টিত মুনাফা উপরে আলাদা দেখানো।')}</Text>
      </View> : null}
      {report && m ? <Button variant="outline" title={l('Download PDF', 'PDF ডাউনলোড')} onPress={() => exportReport(report!, society.name, m.code, 'PDF').catch(e => setError(e.message))} /> : null}
    </ScrollView>
  </SafeAreaView>;
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  title: { fontFamily: typography.fontFamily.bold, fontSize: 19, color: colors.text },
  sub: { fontFamily: typography.fontFamily.regular, fontSize: 13, color: colors.textSecondary },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  error: { fontFamily: typography.fontFamily.regular, color: colors.warning, backgroundColor: colors.warningSoft, padding: 12, borderRadius: 12 },
  muted: { fontFamily: typography.fontFamily.regular, fontSize: 13, color: colors.textSecondary },
  summary: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: colors.surface, borderRadius: 16, padding: 16 },
  big: { fontFamily: typography.fontFamily.bold, fontSize: 26, color: colors.primary },
  mid: { fontFamily: typography.fontFamily.semiBold, fontSize: 16, color: colors.text },
  table: { backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' },
  tr: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 9, borderTopWidth: 1, borderTopColor: colors.borderLight, gap: 6 },
  th: { backgroundColor: colors.surfaceMuted, borderTopWidth: 0 },
  thText: { fontFamily: typography.fontFamily.semiBold, fontSize: 12, color: colors.textSecondary },
  c1: { flex: 1.4 }, c2: { flex: 1, textAlign: 'right' }, c3: { flex: 1.1, textAlign: 'right' },
  date: { fontFamily: typography.fontFamily.medium, fontSize: 13, color: colors.text },
  small: { fontFamily: typography.fontFamily.regular, fontSize: 11, color: colors.textSecondary },
  in: { fontFamily: typography.fontFamily.semiBold, fontSize: 13, color: colors.primary },
  out: { fontFamily: typography.fontFamily.semiBold, fontSize: 13, color: colors.warning },
  bal: { fontFamily: typography.fontFamily.bold, fontSize: 13, color: colors.text },
});
