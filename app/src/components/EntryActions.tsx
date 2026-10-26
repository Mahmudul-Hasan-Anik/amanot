import React, { useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AppModal } from './AppModal';
import { Button } from './Button';
import { Input } from './Input';
import { useSomitiStore, Transaction } from '../store/somitiStore';
import { useAuthStore } from '../features/auth/authStore';
import { useLanguage } from '../i18n/useLanguage';
import { entryDisplay } from '../lib/entryDisplay';
import { signedTransactionAmount } from '../lib/ledger';
import { formatHumanDate } from './DateField';
import { uuid } from '../lib/api';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

export const canCorrect = (t: Transaction) => ['deposit', 'expense', 'fund'].includes(t.type) && !t.voided;

/**
 * Cancel or edit an entry. Edit = cancel with a reason, then the same form
 * opens filled in so the right entry can be saved. Nothing is deleted; both
 * rows stay in the khata and the audit log.
 */
export function EntryActions({ entry, onClose }: { entry: Transaction | null; onClose: () => void }) {
  const router = useRouter();
  const { l, isBengali, formatMoneyPrecise: money } = useLanguage();
  const role = useAuthStore(s => s.actualRole);
  const voidEntry = useSomitiStore(s => s.voidEntry);
  const [reason, setReason] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const reversalId = useRef(uuid());
  if (!entry) return null;
  const staff = ['admin', 'super_admin', 'cashier'].includes(role || '');
  const d = entryDisplay(entry, l, isBengali);
  const reset = () => { setReason(''); setError(''); reversalId.current = uuid(); onClose(); };
  const close = () => { if (!busy) reset(); };
  const run = async (thenEdit: boolean) => {
    if (reason.trim().length < 3) { setError(l('Write a short reason (at least 3 letters).', 'ছোট করে কারণ লিখুন (অন্তত ৩ অক্ষর)।')); return; }
    setBusy(true); setError('');
    try {
      await voidEntry(entry.id, reversalId.current, reason.trim());
      const t = entry; setBusy(false); reset();
      if (!thenEdit) return;
      const date = t.dateISO || '';
      if (t.type === 'deposit') router.push({ pathname: '/(admin)/deposit/new', params: { memberId: t.memberId, amount: String(t.amount), method: t.paymentMethod, date, note: t.note && t.note !== 'জমা' ? t.note : '' } } as any);
      else if (t.type === 'fund') router.push({ pathname: '/(admin)/fund/new', params: { method: t.paymentMethod, amount: String(t.amount) } } as any);
      else router.push({ pathname: '/(admin)/expense/new', params: { amount: String(t.amount), title: d.title } } as any);
    } catch (e: any) { setError(e.message); setBusy(false); }
  };
  return <AppModal visible={!!entry} onClose={close}>
    <View style={s.head}><Text style={s.title}>{d.title}</Text><Pressable accessibilityRole="button" accessibilityLabel={l('Close', 'বন্ধ')} onPress={close}><Ionicons name="close" size={22} color={colors.text} /></Pressable></View>
    <Text style={s.meta}>{d.detail}</Text>
    <Text style={s.meta}>{entry.dateISO ? formatHumanDate(entry.dateISO, isBengali) : entry.date} · {entry.receiptNo}</Text>
    <Text style={[s.amount, entry.voided && { textDecorationLine: 'line-through', color: colors.textSecondary }]}>{money(Math.abs(signedTransactionAmount({ ...entry, voided: false })) || entry.amount)}</Text>
    {entry.voided ? <Text style={s.note}>{l('This entry was cancelled.', 'এই এন্ট্রি বাতিল করা হয়েছে।')}</Text> : null}
    {entry.type === 'deposit' ? <Button variant="outline" title={l('View receipt', 'রশিদ দেখুন')} onPress={() => { close(); router.push(`/(admin)/receipt/${entry.id}` as any); }} /> : null}
    {staff && canCorrect(entry) ? <>
      <Text style={[s.note, { marginTop: 12 }]}>{l('Mistake? Cancel it with a reason. The change is kept in the audit log.', 'ভুল হয়েছে? কারণ লিখে বাতিল করুন। পরিবর্তন অডিট লগে থাকবে।')}</Text>
      <Input label={l('Reason', 'কারণ')} value={reason} onChangeText={v => { setReason(v); setError(''); }} placeholder={l('e.g. wrong amount', 'যেমন: টাকার অঙ্ক ভুল')} />
      {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}
      <View style={s.row}>
        <Button style={{ flex: 1 }} variant="outline" title={l('Cancel entry', 'বাতিল করুন')} loading={busy} onPress={() => run(false)} />
        <Button style={{ flex: 1 }} title={l('Edit', 'এডিট করুন')} disabled={busy} onPress={() => run(true)} />
      </View>
      <Text style={s.small}>{l('Edit cancels this entry and opens the form filled in.', 'এডিট চাপলে এটি বাতিল হয়ে পূরণ করা ফর্ম খুলবে।')}</Text>
    </> : null}
  </AppModal>;
}

/** One khata line: name, what it was, date; amount in or out. Tap for details. */
export function EntryRow({ entry, onPress }: { entry: Transaction; onPress?: () => void }) {
  const { l, isBengali, formatMoneyPrecise: money } = useLanguage();
  const d = entryDisplay(entry, l, isBengali);
  const signed = signedTransactionAmount({ ...entry, voided: false });
  const out = signed < 0;
  return <Pressable accessibilityRole="button" onPress={onPress} style={[s.line, entry.voided && { opacity: 0.55 }]}>
    <View style={[s.icon, { backgroundColor: out ? colors.warningSoft : colors.primarySoft }]}><Text style={{ color: out ? colors.warning : colors.primary, fontFamily: typography.fontFamily.bold }}>{out ? '−' : '+'}</Text></View>
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text style={s.lineTitle} numberOfLines={1}>{d.title}</Text>
      <Text style={s.lineMeta} numberOfLines={2}>{d.detail}{entry.dateISO ? ' · ' + formatHumanDate(entry.dateISO, isBengali) : ''}{entry.voided ? ' · ' + l('cancelled', 'বাতিল') : ''}</Text>
    </View>
    <Text style={[s.lineAmount, { color: out ? colors.warning : colors.primary }, entry.voided && { textDecorationLine: 'line-through' }]}>{out ? '−' : '+'}{money(Math.abs(signed))}</Text>
  </Pressable>;
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  title: { flex: 1, fontFamily: typography.fontFamily.bold, fontSize: 18, color: colors.text },
  meta: { fontFamily: typography.fontFamily.regular, fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  amount: { fontFamily: typography.fontFamily.bold, fontSize: 26, color: colors.primary, marginVertical: 10 },
  note: { fontFamily: typography.fontFamily.regular, fontSize: 14, color: colors.text, marginBottom: 8, lineHeight: 22 },
  small: { fontFamily: typography.fontFamily.regular, fontSize: 12, color: colors.textSecondary, marginTop: 8 },
  error: { fontFamily: typography.fontFamily.regular, fontSize: 13, color: colors.warning, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 10 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  icon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  lineTitle: { fontFamily: typography.fontFamily.semiBold, fontSize: 15, color: colors.text },
  lineMeta: { fontFamily: typography.fontFamily.regular, fontSize: 12.5, color: colors.textSecondary, lineHeight: 19 },
  lineAmount: { fontFamily: typography.fontFamily.bold, fontSize: 15 },
});
