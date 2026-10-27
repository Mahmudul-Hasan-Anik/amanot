import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSomitiStore, REMOTE } from '../../src/store/somitiStore';
import { useAuthStore } from '../../src/features/auth/authStore';
import { useLanguage } from '../../src/i18n/useLanguage';
import { Page, HeaderIcon } from '../../src/components/Page';
import * as api from '../../src/lib/api';
import { Button, Input } from '../../src/components';
import { formatHumanDate } from '../../src/components/DateField';
import { fiscalPeriod, fiscalYearOf, parseProfitPercent, takaMonthShares, SavingsMember } from '../../src/lib/profitAllocation';
import { isoToday } from '../../src/lib/investment';
import { exportReport } from '../../src/utils/reportExport';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';

type Mode = 'full' | 'rate';
type Preview = {
  year: number; periodStart: string; periodEnd: string; alreadyDistributed: boolean; complete?: boolean; mode: Mode; ratePct?: number | null;
  projectProfit: number; otherIncome?: number; expenses: number; netProfit: number; reservePct: number; managementPct: number;
  distributable?: number; distributed: number; reserveAmount?: number; exceedsProfit?: boolean; totalTakaMonths?: number;
  shares: { memberId: string; name: string; code: string; balance: number; takaMonths: number; share: number }[];
};

/**
 * Yearly profit, the khata way: each member's share follows taka-months
 * (savings × months it stayed with the society). A deposit counts from the
 * next month; a withdrawal from its own month. Year = society's fiscal year.
 * Two methods: share the whole profit, or the society sets a yearly rate.
 */
export default function ProfitDistributionScreen() {
  const { l, isBengali, formatMoneyPrecise: money, formatNum } = useLanguage();
  const somitiInfo = useSomitiStore(s => s.somitiInfo);
  const members = useSomitiStore(s => s.members);
  const transactions = useSomitiStore(s => s.transactions);
  const updateSomitiInfo = useSomitiStore(s => s.updateSomitiInfo);
  const role = useAuthStore(s => s.actualRole);
  const canManage = role === 'admin' || role === 'super_admin';
  const info: any = somitiInfo;
  const startMonth = Math.min(12, Math.max(1, Number(info.fiscalYearStartMonth) || 7));
  const currentFy = fiscalYearOf(isoToday(), startMonth);
  const [fy, setFy] = useState(currentFy - 1);
  const [mode, setMode] = useState<Mode>(info.profitMode === 'rate' ? 'rate' : 'full');
  const [reserve, setReserve] = useState(String(info.profitReservePct ?? 0));
  const [management, setManagement] = useState(String(info.profitManagementPct ?? 0));
  const [rate, setRate] = useState(String(info.profitRatePct || ''));
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState(''), [loading, setLoading] = useState(false), [busy, setBusy] = useState(false);
  const reservePct = parseProfitPercent(reserve), managementPct = parseProfitPercent(management), ratePct = parseProfitPercent(rate);
  const rulesValid = mode === 'full' ? reservePct !== null && managementPct !== null && reservePct + managementPct <= 100 : ratePct !== null && ratePct > 0;
  const period = fiscalPeriod(fy, startMonth);
  const yearLabel = `${formatHumanDate(period.start, isBengali).replace(/^\S+\s/, '')} – ${formatHumanDate(addDays(period.end, -1), isBengali).replace(/^\S+\s/, '')}`;

  // Demo (no backend): same rule computed on the device from the local khata.
  const demoPreview = useMemo((): Preview => {
    const savings: SavingsMember[] = members.map(m => ({ id: m.id, name: m.name, code: m.code, balanceNow: m.totalDeposit,
      events: transactions.filter(t => t.memberId === m.id && !t.voided && ['deposit', 'withdrawal', 'withdrawal_reversal'].includes(t.type) && t.dateISO)
        .map(t => ({ date: t.dateISO!, delta: t.type === 'withdrawal' ? -t.amount : t.amount })) }));
    const inPeriod = (d?: string) => !!d && d >= period.start && d < period.end;
    const projectProfit = transactions.filter(t => inPeriod(t.dateISO) && !t.voided && t.profitPart).reduce((s, t) => s + (t.investmentReversal ? -1 : 1) * (t.profitPart || 0), 0);
    const otherIncome = transactions.filter(t => inPeriod(t.dateISO) && !t.voided && t.type === 'fund' && t.memberCode === 'FUND-INC').reduce((s, t) => s + t.amount, 0);
    const expenses = transactions.filter(t => inPeriod(t.dateISO) && !t.voided && t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const net = projectProfit + otherIncome - expenses;
    const pool = Math.max(0, Math.round(net * (100 - (reservePct || 0) - (managementPct || 0))) / 100);
    const shares = takaMonthShares(savings, period.start, period.end, mode, pool, ratePct || 0);
    const distributed = Math.round(shares.reduce((s, r) => s + r.share, 0) * 100) / 100;
    return { year: fy, periodStart: period.start, periodEnd: addDays(period.end, -1), alreadyDistributed: false, complete: period.end <= addDays(isoToday(), 1), mode, ratePct,
      projectProfit, otherIncome, expenses, netProfit: net, reservePct: mode === 'full' ? reservePct || 0 : 0, managementPct: mode === 'full' ? managementPct || 0 : 0,
      distributable: mode === 'full' ? pool : distributed, distributed, reserveAmount: Math.max(0, net - distributed), exceedsProfit: distributed > Math.max(net, 0),
      totalTakaMonths: shares.reduce((s, r) => s + r.takaMonths, 0), shares };
  }, [members, transactions, fy, mode, reservePct, managementPct, ratePct, period.start, period.end]);

  const load = async () => {
    if (!REMOTE) { setPreview(demoPreview); return; }
    if (!rulesValid) return;
    setLoading(true); setError('');
    try { setPreview(await api.profitPreviewFy(fy, mode, ratePct || 0, reservePct || 0, managementPct || 0)); }
    catch (e: any) { setError(e.message); setPreview(null); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [fy, mode, reserve, management, rate, demoPreview]); // eslint-disable-line react-hooks/exhaustive-deps

  const p = preview;
  const done = !!p?.alreadyDistributed;
  const complete = !!p?.complete;
  const saveRules = async () => {
    try { await updateSomitiInfo({ profitMode: mode, profitReservePct: reservePct ?? 0, profitManagementPct: managementPct ?? 0, profitRatePct: ratePct ?? 0 } as any); Alert.alert(l('Saved', 'সংরক্ষণ হয়েছে')); }
    catch (e: any) { Alert.alert(l('Save failed', 'সংরক্ষণ ব্যর্থ'), e.message); }
  };
  const distribute = () => {
    if (!p || busy) return;
    Alert.alert(l('Distribute profit?', 'মুনাফা বণ্টন করবেন?'),
      l(`${money(p.distributed)} goes to ${formatNum(p.shares.length)} members' savings for ${yearLabel}. Entries in this year are then locked.`, `${yearLabel} বছরের ${money(p.distributed)} ${formatNum(p.shares.length)} জন সদস্যের সঞ্চয়ে যোগ হবে। এরপর এই বছরের এন্ট্রি বন্ধ হয়ে যাবে।`),
      [{ text: l('Not now', 'এখন না'), style: 'cancel' }, { text: l('Distribute', 'বণ্টন করুন'), onPress: async () => {
        setBusy(true);
        try { await api.distributeProfitFy(fy, mode, ratePct || 0, reservePct || 0, managementPct || 0); await useSomitiStore.getState().syncFromServer(); await load(); }
        catch (e: any) { Alert.alert(l('Could not distribute', 'বণ্টন হয়নি'), e.message); } finally { setBusy(false); }
      } }]);
  };
  const exportPdf = async () => {
    if (!p) return;
    try {
      await exportReport({ language: isBengali ? 'bn' : 'en', title: l(`Profit distribution ${yearLabel}`, `মুনাফা বণ্টন ${yearLabel}`),
        columns: [l('Member', 'সদস্য'), l('Savings at year end', 'বছর শেষে সঞ্চয়'), l('Taka-months', 'টাকা-মাস'), l('Share', 'ভাগ')],
        rows: [...p.shares.map(s => [`${s.name} (${s.code})`, s.balance, s.takaMonths, s.share]), [l('Total', 'মোট'), '', p.totalTakaMonths ?? '', p.distributed]] }, somitiInfo.name, `profit-${fy}`, 'PDF');
    } catch (e: any) { Alert.alert(l('Export failed', 'ডাউনলোড ব্যর্থ'), e.message); }
  };

  const percentField = (label: string, value: string, set: (v: string) => void) => <View style={{ flex: 1 }}><Input label={label} accessibilityLabel={label} value={value} onChangeText={set} keyboardType="decimal-pad" editable={canManage && !done} /></View>;
  const steps = [l('Rules', 'নিয়ম'), l('Draft', 'খসড়া'), l('Distribute', 'বণ্টন')];
  const active = done ? 3 : p && complete ? 2 : p ? 1 : 0;
  const canDistribute = canManage && !done && REMOTE;
  return <Page title={l('Profit distribution', 'মুনাফা বণ্টন')} subtitle={yearLabel} backTo="/(admin)/(tabs)"
    actions={p ? <HeaderIcon icon="download-outline" label={l('Download PDF', 'PDF ডাউনলোড')} onPress={exportPdf} /> : null}
    footer={p ? <View style={s.footer}>
      <Button variant="outline" style={{ flex: 1 }} title={l('PDF', 'PDF')} icon={<Ionicons name="document-text-outline" size={18} color={colors.primary} />} onPress={exportPdf} />
      {canDistribute ? <Button style={{ flex: 2 }} title={l('Distribute profit', 'মুনাফা বণ্টন করুন')} loading={busy} disabled={!complete || !rulesValid || p.distributed <= 0 || !!p.exceedsProfit} onPress={distribute} /> : null}
    </View> : undefined}>
    <View style={s.content}>
      <View style={[s.card, s.stepper]}>{steps.map((label, i) => <React.Fragment key={label}>
        {i > 0 ? <View style={[s.stepLine, i <= active && s.stepLineOn]} /> : null}
        <View style={s.step}>
          <View style={[s.stepDot, i < active && s.stepDone, i === active && s.stepActive]}>{i < active ? <Ionicons name="checkmark" size={14} color={colors.surface} /> : <Text style={[s.stepNum, i === active && { color: colors.primary }]}>{formatNum(i + 1)}</Text>}</View>
          <Text style={[s.stepLabel, i <= active && { color: colors.text }]}>{label}</Text>
        </View></React.Fragment>)}</View>
      <View style={s.chips}>{[currentFy - 1, currentFy].map(y => { const pp = fiscalPeriod(y, startMonth); return <Pressable key={y} accessibilityRole="radio" accessibilityState={{ checked: fy === y }} onPress={() => setFy(y)} style={[s.chip, fy === y && s.chipOn]}>
        <Text style={[s.chipText, fy === y && s.chipTextOn]}>{formatHumanDate(pp.start, isBengali).replace(/^\S+\s/, '')} – {formatHumanDate(addDays(pp.end, -1), isBengali).replace(/^\S+\s/, '')}</Text></Pressable>; })}</View>

      {done ? <View style={[s.banner, { backgroundColor: colors.primarySoft }]}><Ionicons name="checkmark-circle" size={18} color={colors.primary} /><Text style={[s.bannerText, { color: colors.primary }]}>{l('Distributed. Shares are in members\' savings.', 'বণ্টন হয়েছে। ভাগের টাকা সদস্যদের সঞ্চয়ে যোগ হয়েছে।')}</Text></View>
        : !complete ? <View style={s.banner}><Ionicons name="time-outline" size={18} color={colors.warning} /><Text style={s.bannerText}>{l(`This is a draft. You can distribute after the year closes on ${formatHumanDate(addDays(period.end, -1), false)}.`, `এটি খসড়া। ${formatHumanDate(addDays(period.end, -1), true)} বছর শেষ হলে বণ্টন করা যাবে।`)}</Text></View> : null}

      {!done ? <View style={s.card}>
        <Text style={s.cardTitle}>{l('How to share', 'কীভাবে ভাগ হবে')}</Text>
        <View style={s.segment}>{([['full', l('Share the whole profit', 'পুরো মুনাফা ভাগ')], ['rate', l('Society sets a rate', 'সমিতির হার (%)')]] as const).map(([key, label]) =>
          <Pressable key={key} disabled={!canManage} accessibilityRole="radio" accessibilityState={{ checked: mode === key }} onPress={() => setMode(key)} style={[s.segItem, mode === key && s.segOn]}><Text style={[s.segText, mode === key && s.segTextOn]}>{label}</Text></Pressable>)}</View>
        {mode === 'full' ? <><View style={s.two}>{percentField(l('Reserve fund (%)', 'রিজার্ভ (%)'), reserve, setReserve)}{percentField(l('Management share (%)', 'পরিচালক অংশ (%)'), management, setManagement)}</View>
          <Text style={s.hint}>{l('The rest of the profit goes to members by taka-months. Use 0 if a share does not apply.', 'বাকি মুনাফা টাকা-মাস অনুযায়ী সদস্যদের মধ্যে ভাগ হবে। কোনো অংশ না থাকলে ০ দিন।')}</Text></>
          : <>{percentField(l('Yearly profit rate (%)', 'বছরে মুনাফার হার (%)'), rate, setRate)}
          <Text style={s.hint}>{l('Each member gets taka-months × rate ÷ 12. What is left goes to the reserve.', 'প্রত্যেকে পাবেন টাকা-মাস × হার ÷ ১২। যা বাঁচবে তা রিজার্ভে যাবে।')}</Text></>}
        {!rulesValid ? <Text style={s.error}>{mode === 'full' ? l('Enter 0–100%; the two together cannot pass 100%.', '০–১০০% দিন; দুটো মিলে ১০০% এর বেশি নয়।') : l('Enter a rate above 0%.', '০% এর বেশি হার দিন।')}</Text> : null}
        {canManage ? <Button variant="outline" size="sm" title={l('Keep these rules', 'এই নিয়ম সংরক্ষণ করুন')} disabled={!rulesValid} onPress={saveRules} /> : null}
      </View> : null}

      {error ? <Pressable onPress={load}><Text style={s.error}>{error} · {l('Retry', 'আবার চেষ্টা')}</Text></Pressable> : null}
      {loading && !p ? <Text style={s.hint}>{l('Calculating…', 'হিসাব হচ্ছে…')}</Text> : null}

      {p ? <>
        <View style={s.hero}>
          <Text style={s.heroLabel}>{l('To members', 'সদস্যদের ভাগ')}</Text>
          <Text style={s.heroValue}>{money(p.distributed)}</Text>
          <Text style={s.heroSub}>{l(`Net profit ${money(p.netProfit)} · ${formatNum(p.shares.length)} members`, `নিট মুনাফা ${money(p.netProfit)} · ${formatNum(p.shares.length)} জন সদস্য`)}</Text>
        </View>
        <View style={s.card}>
          <Text style={s.cardTitle}>{l('Calculation', 'হিসাব')}</Text>
          {[[l('Profit from investments', 'বিনিয়োগ থেকে মুনাফা'), p.projectProfit], [l('Other income', 'অন্যান্য আয়'), p.otherIncome ?? 0], [l('Expenses', 'খরচ'), -p.expenses]].map(([label, v]) =>
            <View key={String(label)} style={s.row}><Text style={s.body}>{label}</Text><Text style={s.value}>{money(Number(v))}</Text></View>)}
          <View style={[s.row, s.top]}><Text style={s.bodyBold}>{l('Net profit', 'নিট মুনাফা')}</Text><Text style={s.big}>{money(p.netProfit)}</Text></View>
          <View style={s.row}><Text style={s.body}>{l('To members', 'সদস্যদের ভাগ')}</Text><Text style={s.value}>{money(p.distributed)}</Text></View>
          {(p.reserveAmount ?? 0) > 0 ? <View style={s.row}><Text style={s.body}>{l('Reserve / management', 'রিজার্ভ / পরিচালক')}</Text><Text style={s.value}>{money(p.reserveAmount || 0)}</Text></View> : null}
          {p.exceedsProfit ? <Text style={s.error}>{l('At this rate members would get more than the society earned. Lower the rate.', 'এই হারে সদস্যরা সমিতির আয়ের চেয়ে বেশি পাবেন। হার কমান।')}</Text> : null}
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>{l('Each member', 'প্রত্যেক সদস্য')}</Text>
          <Text style={s.hint}>{l('Taka-months = savings in each month added up. A deposit counts from the next month; a withdrawal from its own month.', 'টাকা-মাস = প্রতি মাসের সঞ্চয়ের যোগফল। জমা পরের মাস থেকে গণনা, উত্তোলন সেই মাস থেকেই বাদ।')}</Text>
          <View style={[s.tr, s.th]}><Text style={[s.td, { flex: 2 }]}>{l('Member', 'সদস্য')}</Text><Text style={s.td}>{l('Taka-months', 'টাকা-মাস')}</Text><Text style={[s.td, s.num]}>{l('Share', 'ভাগ')}</Text></View>
          {p.shares.map(r => <View key={r.memberId} style={s.tr}><View style={{ flex: 2 }}><Text style={s.name}>{r.name}</Text><Text style={s.small}>{r.code} · {l('year end', 'বছর শেষে')} {money(r.balance)}</Text></View>
            <Text style={[s.td, s.mono]}>{formatNum(Math.round(r.takaMonths))}</Text><Text style={[s.td, s.num, s.shareText]}>{money(r.share)}</Text></View>)}
          {!p.shares.length ? <Text style={s.hint}>{l('No member had savings in this year.', 'এই বছরে কারও সঞ্চয় ছিল না।')}</Text> : null}
        </View>

        {!canManage && !done ? <Text style={s.hint}>{l('Only an admin can distribute.', 'শুধু admin বণ্টন করতে পারবেন।')}</Text> : null}
      </> : null}
    </View>
  </Page>;
}

function addDays(iso: string, days: number) { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); }

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  back: { padding: 8 },
  title: { fontFamily: typography.fontFamily.bold, fontSize: 19, color: colors.text },
  sub: { fontFamily: typography.fontFamily.regular, fontSize: 13, color: colors.textSecondary },
  content: { gap: 12 },
  footer: { flexDirection: 'row', gap: 10 },
  stepper: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 14 },
  step: { alignItems: 'center', gap: 6, width: 64 },
  stepDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  stepActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  stepDone: { borderColor: colors.primary, backgroundColor: colors.primary },
  stepNum: { fontFamily: typography.fontFamily.bold, fontSize: 13, color: colors.textSecondary },
  stepLabel: { fontFamily: typography.fontFamily.medium, fontSize: 12.5, color: colors.textSecondary },
  stepLine: { flex: 1, height: 2, backgroundColor: colors.border, marginTop: 13 },
  stepLineOn: { backgroundColor: colors.primary },
  hero: { backgroundColor: colors.primary, borderRadius: 20, padding: 20 },
  heroLabel: { fontFamily: typography.fontFamily.medium, fontSize: typography.size.subhead, color: colors.surface, opacity: 0.9 },
  heroValue: { ...typography.displayAmount, color: colors.surface, marginVertical: 6 },
  heroSub: { fontFamily: typography.fontFamily.regular, fontSize: 13, color: colors.surface, opacity: 0.85 },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  chipText: { fontFamily: typography.fontFamily.semiBold, fontSize: 13, color: colors.text }, chipTextOn: { color: colors.surface },
  banner: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: colors.warningSoft, borderRadius: 12, padding: 12 },
  bannerText: { flex: 1, fontFamily: typography.fontFamily.regular, fontSize: 14, color: colors.warning, lineHeight: 21 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontFamily: typography.fontFamily.bold, fontSize: 16, color: colors.text, marginBottom: 8 },
  segment: { flexDirection: 'row', backgroundColor: colors.surfaceMuted, borderRadius: 12, padding: 3, marginBottom: 14 },
  segItem: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 10 }, segOn: { backgroundColor: colors.surface, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 1 },
  segText: { fontFamily: typography.fontFamily.medium, fontSize: 13, color: colors.textSecondary }, segTextOn: { color: colors.primary, fontFamily: typography.fontFamily.semiBold },
  two: { flexDirection: 'row', gap: 10 },
  hint: { fontFamily: typography.fontFamily.regular, fontSize: 13, color: colors.textSecondary, lineHeight: 20, marginBottom: 8 },
  error: { fontFamily: typography.fontFamily.regular, fontSize: 13, color: colors.warning, marginVertical: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, gap: 10 },
  top: { borderTopWidth: 1, borderTopColor: colors.borderLight, marginTop: 4, paddingTop: 10 },
  body: { fontFamily: typography.fontFamily.regular, fontSize: 14, color: colors.text }, bodyBold: { fontFamily: typography.fontFamily.semiBold, fontSize: 15, color: colors.text },
  value: { fontFamily: typography.fontFamily.semiBold, fontSize: 14, color: colors.text, fontVariant: ['tabular-nums'] },
  big: { fontFamily: typography.fontFamily.bold, fontSize: 18, color: colors.primary },
  tr: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.borderLight },
  th: { borderTopWidth: 0 },
  td: { flex: 1, fontFamily: typography.fontFamily.medium, fontSize: 12.5, color: colors.textSecondary },
  num: { textAlign: 'right' }, mono: { fontVariant: ['tabular-nums'], color: colors.text },
  name: { fontFamily: typography.fontFamily.semiBold, fontSize: 14, color: colors.text },
  small: { fontFamily: typography.fontFamily.regular, fontSize: 12, color: colors.textSecondary },
  shareText: { fontFamily: typography.fontFamily.bold, fontSize: 14, color: colors.primary, fontVariant: ['tabular-nums'] },
});
