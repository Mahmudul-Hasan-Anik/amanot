import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuthStore } from '../features/auth/authStore';
import { useLanguage } from '../i18n/useLanguage';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

/** The one door for every entry: what the cashier does every day, three taps at most. */
export function NewEntrySheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { l } = useLanguage();
  const role = useAuthStore(s => s.actualRole);
  const entry = ['admin', 'super_admin', 'cashier'].includes(role || '');
  const items: { icon: keyof typeof Ionicons.glyphMap; title: string; sub: string; href: string; show: boolean }[] = [
    { icon: 'cash-outline', title: l('Take a deposit', 'জমা নিন'), sub: l("Member's savings", 'সদস্যের সঞ্চয়'), href: '/(admin)/deposit/new', show: true },
    { icon: 'arrow-undo-outline', title: l('Give savings back', 'টাকা ফেরত দিন'), sub: l('Savings withdrawal', 'সঞ্চয় উত্তোলন'), href: '/(admin)/withdrawals?new=1', show: entry },
    { icon: 'repeat-outline', title: l('Collect installment', 'কিস্তি নিন'), sub: l('Investment repayment', 'বিনিয়োগের টাকা ফেরত'), href: '/(admin)/collect', show: true },
    { icon: 'remove-circle-outline', title: l('Write an expense', 'খরচ লিখুন'), sub: l('Society expense', 'সমিতির খরচ'), href: '/(admin)/expense/new', show: entry },
    { icon: 'trending-up-outline', title: l('Give an investment', 'বিনিয়োগ দিন'), sub: l('New contract', 'নতুন চুক্তি'), href: '/(admin)/investment/new', show: entry },
    { icon: 'add-circle-outline', title: l('Add money to an account', 'হিসাবে টাকা যোগ'), sub: l('Opening balance, other income', 'প্রারম্ভিক ব্যালেন্স, অন্যান্য আয়'), href: '/(admin)/fund/new', show: entry },
  ];
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable accessibilityRole="button" accessibilityLabel={l('Close', 'বন্ধ')} style={s.shade} onPress={onClose} />
    <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]} accessibilityViewIsModal>
      <Text style={s.title}>{l('New entry', 'নতুন এন্ট্রি')}</Text>
      {items.filter(i => i.show).map(i => <Pressable key={i.href} accessibilityRole="button" onPress={() => { onClose(); router.push(i.href as any); }} style={({ pressed }) => [s.item, pressed && { backgroundColor: colors.surfaceMuted }]}>
        <View style={s.icon}><Ionicons name={i.icon} size={20} color={colors.primary} /></View>
        <View style={{ flex: 1 }}><Text style={s.itemTitle}>{i.title}</Text><Text style={s.itemSub}>{i.sub}</Text></View>
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      </Pressable>)}
    </View>
  </Modal>;
}
const s = StyleSheet.create({
  shade: { flex: 1, backgroundColor: colors.overlay },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 16, paddingTop: 16 },
  title: { fontFamily: typography.fontFamily.bold, fontSize: 18, color: colors.text, marginBottom: 6, paddingHorizontal: 4 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 4, borderRadius: 12 },
  icon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { fontFamily: typography.fontFamily.semiBold, fontSize: 15, color: colors.text },
  itemSub: { fontFamily: typography.fontFamily.regular, fontSize: 12.5, color: colors.textSecondary },
});
