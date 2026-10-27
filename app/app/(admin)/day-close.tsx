import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Page, pageStyles as ps } from '../../src/components/Page';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Input } from '../../src/components';
import { useSomitiStore, REMOTE } from '../../src/store/somitiStore';
import { useLanguage } from '../../src/i18n/useLanguage';
import { isoToday, parseInvestmentAmount, roundMoney } from '../../src/lib/investment';
import { signedTransactionAmount } from '../../src/lib/ledger';
import { entryDisplay } from '../../src/lib/entryDisplay';
import { uuid, recordCashCount, fetchCashCounts, CashCount } from '../../src/lib/api';
import { formatHumanDate } from '../../src/components/DateField';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';

type Method = 'cash' | 'bank' | 'bkash' | 'nagad';

/**
 * Day close: what came in and went out of an account today, what the app says
 * should be there, and what the cashier actually counted. Only the count is
 * saved; a difference is fixed with a real entry.
 */
export default function DayCloseScreen() {
  const { l, isBengali, formatMoneyPrecise: money } = useLanguage();
  const accounts = useSomitiStore(s => s.cashAccounts);
  const transactions = useSomitiStore(s => s.transactions);
  const [method, setMethod] = useState<Method>('cash');
  const [counted, setCounted] = useState(''), [note, setNote] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [history, setHistory] = useState<CashCount[]>([]);
  const requestId = useRef(uuid());
  const account = accounts.find(a => a.type === (method === 'cash' ? 'cashier' : method));
  const today = isoToday();
  const todays = transactions.filter(t => t.dateISO === today && t.paymentMethod === method && t.type !== 'reversal' && !t.voided);
  const inToday = roundMoney(todays.reduce((s, t) => s + Math.max(0, signedTransactionAmount(t)), 0));
  const outToday = roundMoney(todays.reduce((s, t) => s + Math.max(0, -signedTransactionAmount(t)), 0));
  const expected = account?.amount || 0;
  const value = parseInvestmentAmount(counted);
  const diff = Number.isFinite(value) ? roundMoney(value - expected) : null;
  const load = () => { if (REMOTE) fetchCashCounts().then(setHistory, () => {}); };
  useEffect(load, []);
  const save = async () => {
    if (busy) return;
    if (!Number.isFinite(value) || value < 0) { setError(l('Enter the cash you counted.', 'গুনে কত টাকা পেলেন লিখুন।')); return; }
    setBusy(true); setError('');
    try {
      if (REMOTE) await recordCashCount({ id: requestId.current, method, counted: value, note: note.trim() });
      else setHistory(h => [{ id: requestId.current, count_date: today, account_id: account?.id || method, expected, counted: value, difference: roundMoney(value - expected), note: note.trim(), created_at: new Date().toISOString() }, ...h]);
      requestId.current = uuid(); setCounted(''); setNote(''); load();
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };
  const label = (m: Method) => accounts.find(a => a.type === (m === 'cash' ? 'cashier' : m))?.name || m;
  return <Page title={l('Day close', 'দিন শেষের হিসাব')} subtitle={formatHumanDate(today, isBengali)}
    footer={<Button title={l('Save the count', 'গোনা সংরক্ষণ করুন')} icon={<Ionicons name="checkmark-done-outline" size={18} color={colors.surface} />} loading={busy} onPress={save} />}>
    <View style={ps.chips}>{(['cash', 'bkash', 'nagad', 'bank'] as Method[]).filter(m => accounts.some(a => a.type === (m === 'cash' ? 'cashier' : m))).map(m =>
      <Pressable key={m} accessibilityRole="radio" accessibilityState={{ checked: method === m }} onPress={() => { setMethod(m); setCounted(''); }} style={[s.chip, method === m && s.chipOn]}><Text style={[s.chipText, method === m && { color: colors.surface }]}>{label(m)}</Text></Pressable>)}</View>
    <View style={ps.hero}>
      <Text style={ps.heroLabel}>{l('Should be in hand now', 'এখন থাকার কথা')}</Text>
      <Text style={ps.heroValue}>{money(expected)}</Text>
      <View style={s.heroRow}>
        <View style={s.heroCell}><Ionicons name="arrow-down-circle-outline" size={16} color={colors.surface} /><Text style={s.heroCellText}>{l('In today', 'আজ এসেছে')} {money(inToday)}</Text></View>
        <View style={s.heroCell}><Ionicons name="arrow-up-circle-outline" size={16} color={colors.surface} /><Text style={s.heroCellText}>{l('Out today', 'আজ গেছে')} {money(outToday)}</Text></View>
      </View>
    </View>
    <View style={ps.card}>
      <Text style={ps.title}>{l('Count the cash', 'টাকা গুনে লিখুন')}</Text>
      <Input label={l('Cash counted', 'গুনে পেলাম ৳')} value={counted} keyboardType="decimal-pad" onChangeText={v => { setCounted(v); setError(''); }} />
      {diff !== null ? <View style={[s.diff, { backgroundColor: diff === 0 ? colors.primarySoft : colors.warningSoft }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Ionicons name={diff === 0 ? 'checkmark-circle' : 'alert-circle'} size={20} color={diff === 0 ? colors.primary : colors.warning} />
          <Text style={[s.bold, { color: diff === 0 ? colors.primary : colors.warning }]}>{diff === 0 ? l('Matches. All good.', 'মিলে গেছে।') : diff < 0 ? l(`${money(-diff)} short`, `${money(-diff)} কম`) : l(`${money(diff)} extra`, `${money(diff)} বেশি`)}</Text></View>
        {diff !== 0 ? <Text style={s.small}>{l('Check the khata for a missed or wrong entry. Saving the count does not move money.', 'খাতায় কোনো এন্ট্রি বাদ পড়েছে বা ভুল হয়েছে কিনা দেখুন। গোনা সংরক্ষণ করলে টাকা নড়ে না।')}</Text> : null}
      </View> : null}
      {diff !== null && diff !== 0 ? <Input label={l('Note (optional)', 'নোট (ঐচ্ছিক)')} value={note} onChangeText={setNote} placeholder={l('e.g. change given to a member', 'যেমন: সদস্যকে খুচরা দেওয়া')} /> : null}
      {error ? <Text style={s.error}>{error}</Text> : null}
    </View>
    <View style={ps.card}><Text style={ps.title}>{l("Today's entries in this account", 'এই হিসাবে আজকের এন্ট্রি')}</Text>
      {todays.length ? todays.map((t, i) => { const d = entryDisplay(t, l, isBengali), v = signedTransactionAmount(t); return <View key={t.id} style={[s.row, i > 0 && ps.divider]}><Text style={s.body} numberOfLines={1}>{d.title}</Text><Text style={[s.val, { color: v < 0 ? colors.warning : colors.primary }]}>{v < 0 ? '−' : '+'}{money(Math.abs(v))}</Text></View>; })
        : <Text style={s.small}>{l('No entries in this account today.', 'আজ এই হিসাবে কোনো এন্ট্রি নেই।')}</Text>}</View>
    {history.length ? <View style={ps.card}><Text style={ps.title}>{l('Recent counts', 'আগের গোনা')}</Text>
      {history.map((h, i) => <View key={h.id} style={[s.row, i > 0 && ps.divider]}><Text style={s.body}>{formatHumanDate(h.count_date, isBengali)}{h.counted_by_name ? ` · ${h.counted_by_name}` : ''}</Text>
        <View style={[s.tag, { backgroundColor: h.difference === 0 ? colors.primarySoft : colors.warningSoft }]}><Text style={[s.val, { fontSize: 12, color: h.difference === 0 ? colors.primary : colors.warning }]}>{h.difference === 0 ? l('matched', 'মিলেছে') : `${h.difference > 0 ? '+' : '−'}${money(Math.abs(h.difference))}`}</Text></View></View>)}</View> : null}
  </Page>;
}
const s = StyleSheet.create({
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  heroRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  heroCell: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  heroCellText: { fontFamily: typography.fontFamily.semiBold, fontSize: 13, color: colors.surface },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  chipText: { fontFamily: typography.fontFamily.semiBold, fontSize: 14, color: colors.text },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, paddingVertical: 10 },
  top: { borderTopWidth: 1, borderTopColor: colors.borderLight, marginTop: 4, paddingTop: 10 },
  body: { flex: 1, fontFamily: typography.fontFamily.regular, fontSize: 14, color: colors.text },
  bold: { fontFamily: typography.fontFamily.semiBold, fontSize: 15, color: colors.text },
  val: { fontFamily: typography.fontFamily.semiBold, fontSize: 14 },
  big: { fontFamily: typography.fontFamily.bold, fontSize: 20, color: colors.primary },
  diff: { borderRadius: 12, padding: 12, marginTop: -4, marginBottom: 12, gap: 4 },
  small: { fontFamily: typography.fontFamily.regular, fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  error: { fontFamily: typography.fontFamily.regular, fontSize: 13, color: colors.warning, marginBottom: 10 },
});
