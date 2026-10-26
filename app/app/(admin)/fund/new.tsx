import React, { useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Page, pageStyles as s } from '../../../src/components/Page';
import { Button, Input, DateField } from '../../../src/components';
import { useSomitiStore } from '../../../src/store/somitiStore';
import { useAuthStore } from '../../../src/features/auth/authStore';
import { useLanguage } from '../../../src/i18n/useLanguage';
import { isoToday, parseInvestmentAmount } from '../../../src/lib/investment';
import { uuid, FundCategory } from '../../../src/lib/api';
import { safeBack } from '../../../src/utils/navigation';
import { colors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';

type Method = 'cash' | 'bank' | 'bkash' | 'nagad';

/**
 * Money into an account that is not a member's deposit: the opening balance
 * from the old khata, capital/donations, or other income. Recorded in the
 * ledger and audit log; never counted as anyone's savings.
 */
export default function AddFundScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ method?: string; amount?: string }>();
  const { l, formatMoneyPrecise: money } = useLanguage();
  const accounts = useSomitiStore(st => st.cashAccounts);
  const addFund = useSomitiStore(st => st.addFund);
  const role = useAuthStore(st => st.actualRole);
  const [method, setMethod] = useState<Method>((['cash', 'bank', 'bkash', 'nagad'].includes(params.method || '') ? params.method : 'cash') as Method);
  const [category, setCategory] = useState<FundCategory>('opening');
  const [amount, setAmount] = useState(params.amount || '');
  const [date, setDate] = useState(isoToday());
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [saved, setSaved] = useState('');
  const requestId = useRef(uuid());
  const allowed = ['admin', 'super_admin', 'cashier'].includes(role || '');
  const categories: [FundCategory, string, string][] = [
    ['opening', l('Opening balance', 'প্রারম্ভিক ব্যালেন্স'), l('Money already in the account from the old khata.', 'পুরনো খাতা থেকে যে টাকা আগে থেকেই হিসাবে আছে।')],
    ['capital', l('Capital / donation', 'মূলধন / অনুদান'), l('Money given to the society, not anyone\'s savings.', 'সমিতিকে দেওয়া টাকা, কারও সঞ্চয় নয়।')],
    ['other_income', l('Other income', 'অন্যান্য আয়'), l('Bank interest, fees and similar. Counted in yearly profit.', 'ব্যাংক সুদ, ফি ইত্যাদি। বছরের মুনাফায় ধরা হবে।')],
  ];
  const save = async () => {
    if (busy) return;
    const value = parseInvestmentAmount(amount);
    if (!Number.isFinite(value) || value <= 0) { setError(l('Enter the amount.', 'টাকার পরিমাণ লিখুন।')); return; }
    setBusy(true); setError('');
    try {
      await addFund({ id: requestId.current, amount: value, method, category, date, note: note.trim() });
      setSaved(l(`${money(value)} added.`, `${money(value)} যোগ হয়েছে।`));
      requestId.current = uuid(); setAmount(''); setNote('');
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };
  if (!allowed) return <Page title={l('Add money', 'হিসাবে টাকা যোগ')}><Text style={s.text}>{l('Only an admin or cashier can add money.', 'শুধু admin বা ক্যাশিয়ার টাকা যোগ করতে পারবেন।')}</Text></Page>;
  return <Page title={l('Add money to an account', 'হিসাবে টাকা যোগ')} backTo="/(admin)/finance">
    {saved ? <View style={[s.card, { backgroundColor: colors.primarySoft }]}><Text style={s.title}>{saved}</Text>
      <View style={styles.row}><Button size="sm" title={l('Done', 'ঠিক আছে')} onPress={() => safeBack(router, '/(admin)/finance')} /><Button size="sm" variant="outline" title={l('Another entry', 'আরেকটা এন্ট্রি')} onPress={() => setSaved('')} /></View></View> : null}
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    <Text style={styles.label}>{l('Into account', 'কোন হিসাবে')}</Text>
    <View style={s.chips}>{accounts.filter(a => ['cashier', 'bank', 'bkash', 'nagad'].includes(a.type || '')).map(a => {
      const value = (a.type === 'cashier' ? 'cash' : a.type) as Method;
      return <Pressable key={a.id} accessibilityRole="radio" accessibilityState={{ checked: method === value }} onPress={() => setMethod(value)} style={[styles.chip, method === value && styles.chipOn]}>
        <Text style={[styles.chipText, method === value && styles.chipTextOn]}>{a.name}</Text><Text style={styles.chipSub}>{money(a.amount)}</Text></Pressable>;
    })}</View>
    <Text style={styles.label}>{l('Where the money came from', 'টাকা কোথা থেকে এল')}</Text>
    <View style={{ gap: 8, marginBottom: 16 }}>{categories.map(([value, label, help]) =>
      <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: category === value }} onPress={() => setCategory(value)} style={[styles.option, category === value && styles.chipOn]}>
        <Text style={[styles.chipText, category === value && styles.chipTextOn]}>{label}</Text><Text style={styles.chipSub}>{help}</Text></Pressable>)}</View>
    <Input label={l('Amount ৳', 'টাকা ৳')} value={amount} keyboardType="decimal-pad" onChangeText={v => { setAmount(v); setError(''); }} />
    <DateField label={l('Date', 'তারিখ')} value={date} max={isoToday()} onChange={setDate} />
    <Input label={l('Note (optional)', 'নোট (ঐচ্ছিক)')} value={note} onChangeText={setNote} placeholder={l('e.g. bank balance from the old khata', 'যেমন: পুরনো খাতার ব্যাংক ব্যালেন্স')} />
    <Text style={[s.text, { fontSize: 13, marginBottom: 12 }]}>{l('Kept in the ledger and audit log. Not counted as any member\'s savings.', 'লেনদেনের খাতা ও অডিট লগে থাকবে। কোনো সদস্যের সঞ্চয় হিসেবে ধরা হবে না।')}</Text>
    <Button title={l('Add money', 'টাকা যোগ করুন')} loading={busy} onPress={save} />
  </Page>;
}
const styles = StyleSheet.create({
  label: { fontFamily: typography.fontFamily.medium, fontSize: 14, color: colors.textSecondary, marginBottom: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  option: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  chipText: { fontFamily: typography.fontFamily.semiBold, fontSize: 14, color: colors.text },
  chipTextOn: { color: colors.primary },
  chipSub: { fontFamily: typography.fontFamily.regular, fontSize: 12, color: colors.textSecondary },
  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  error: { fontFamily: typography.fontFamily.regular, color: colors.warning, backgroundColor: colors.warningSoft, padding: 12, borderRadius: 12, marginBottom: 12 },
});
