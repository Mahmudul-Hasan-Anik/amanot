import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AppModal } from './AppModal';
import { Button } from './Button';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { useLanguage } from '../i18n/useLanguage';
import { BENGALI_MONTHS_FULL, toBengaliDigits } from '../lib/bengali';

const EN_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const pad = (n: number) => String(n).padStart(2, '0');
const daysIn = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** Format an ISO date (YYYY-MM-DD) for people: "২৬ অক্টোবর ২০২৬". */
export function formatHumanDate(iso: string, bengali: boolean) {
  const [y, m, d] = (iso || '').split('-').map(Number);
  if (!y || !m || !d) return iso || '';
  return bengali ? `${toBengaliDigits(d)} ${BENGALI_MONTHS_FULL[m - 1]} ${toBengaliDigits(y)}` : `${d} ${EN_MONTHS[m - 1]} ${y}`;
}

/** One date picker for every form: tap to pick day, month, year. No typing. */
export function DateField({ label, value, onChange, max, min, error, testID }: {
  label: string; value: string; onChange: (iso: string) => void; max?: string; min?: string; error?: string; testID?: string;
}) {
  const { l, isBengali } = useLanguage();
  const [open, setOpen] = useState(false);
  const parse = (iso: string) => { const [y, m, d] = (iso || '').split('-').map(Number); const now = new Date(); return { y: y || now.getFullYear(), m: m || now.getMonth() + 1, d: d || now.getDate() }; };
  const [draft, setDraft] = useState(parse(value));
  useEffect(() => { if (open) setDraft(parse(value)); }, [open, value]);
  const day = Math.min(draft.d, daysIn(draft.y, draft.m));
  const iso = `${draft.y}-${pad(draft.m)}-${pad(day)}`;
  const outOfRange = (max && iso > max) || (min && iso < min);
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 8 }, (_, i) => thisYear - 6 + i);
  const n = (v: number) => (isBengali ? toBengaliDigits(v) : String(v));
  const column = (items: { key: number; label: string }[], selected: number, pick: (v: number) => void, flex = 1) => (
    <ScrollView style={[s.col, { flex }]} showsVerticalScrollIndicator={false}>
      {items.map(i => (
        <Pressable key={i.key} accessibilityRole="button" accessibilityState={{ selected: i.key === selected }} onPress={() => pick(i.key)}
          style={[s.item, i.key === selected && s.itemOn]}>
          <Text style={[s.itemText, i.key === selected && s.itemTextOn]}>{i.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
  return (
    <View style={s.wrap}>
      <Text style={s.label}>{label}</Text>
      <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={`${label}: ${formatHumanDate(value, isBengali)}`} onPress={() => setOpen(true)}
        style={[s.field, !!error && { borderColor: colors.warning }]}>
        <Text style={s.value}>{formatHumanDate(value, isBengali) || l('Pick a date', 'তারিখ বাছুন')}</Text>
        <Ionicons name="calendar-outline" size={20} color={colors.primary} />
      </Pressable>
      {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}
      <AppModal visible={open} onClose={() => setOpen(false)}>
        <Text style={s.title}>{label}</Text>
        <Text style={s.preview}>{formatHumanDate(iso, isBengali)}</Text>
        <View style={s.cols}>
          {column(Array.from({ length: daysIn(draft.y, draft.m) }, (_, i) => ({ key: i + 1, label: n(i + 1) })), day, d => setDraft(v => ({ ...v, d })))}
          {column(Array.from({ length: 12 }, (_, i) => ({ key: i + 1, label: isBengali ? BENGALI_MONTHS_FULL[i] : EN_MONTHS[i] })), draft.m, m => setDraft(v => ({ ...v, m })), 1.5)}
          {column(years.map(y => ({ key: y, label: n(y) })), draft.y, y => setDraft(v => ({ ...v, y })))}
        </View>
        {outOfRange ? <Text style={s.error}>{max && iso > max ? l('This date is in the future.', 'এই তারিখ ভবিষ্যতের।') : l('This date is too early.', 'এই তারিখ আগের সীমার আগে।')}</Text> : null}
        <View style={s.quick}>
          <Button size="sm" variant="ghost" title={l('Today', 'আজ')} onPress={() => { const t = new Date(); setDraft({ y: t.getFullYear(), m: t.getMonth() + 1, d: t.getDate() }); }} />
        </View>
        <Button title={l('Use this date', 'এই তারিখ নিন')} disabled={!!outOfRange} onPress={() => { onChange(iso); setOpen(false); }} />
      </AppModal>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginBottom: 16, width: '100%' },
  label: { fontFamily: typography.fontFamily.medium, fontSize: typography.size.subhead, color: colors.textSecondary, marginBottom: 6 },
  field: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface },
  value: { fontFamily: typography.fontFamily.medium, fontSize: 15, color: colors.text },
  error: { fontFamily: typography.fontFamily.regular, fontSize: 13, color: colors.warning, marginTop: 6 },
  title: { fontFamily: typography.fontFamily.bold, fontSize: 18, color: colors.text },
  preview: { fontFamily: typography.fontFamily.semiBold, fontSize: 16, color: colors.primary, marginVertical: 10 },
  cols: { flexDirection: 'row', gap: 8, height: 220, marginBottom: 8 },
  col: { backgroundColor: colors.surfaceMuted, borderRadius: 12 },
  item: { paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  itemOn: { backgroundColor: colors.primary },
  itemText: { fontFamily: typography.fontFamily.medium, fontSize: 15, color: colors.text },
  itemTextOn: { color: '#FFFFFF' },
  quick: { flexDirection: 'row', justifyContent: 'flex-end' },
});
