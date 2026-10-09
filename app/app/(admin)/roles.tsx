import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSomitiStore } from '../../src/store/somitiStore';
import { useAuthStore } from '../../src/features/auth/authStore';
import { useLanguage } from '../../src/i18n/useLanguage';
import { safeBack } from '../../src/utils/navigation';
import { AppModal } from '../../src/components/AppModal';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';

const ROLES: { key: string; en: string; bn: string; descEn: string; descBn: string; title: string }[] = [
  { key: 'super_admin', en: 'Super Admin', bn: 'সুপার অ্যাডমিন', descEn: 'Everything, incl. roles', descBn: 'সব কিছু, রোল পরিবর্তনসহ', title: 'সভাপতি · সুপার অ্যাডমিন' },
  { key: 'admin', en: 'Admin', bn: 'অ্যাডমিন', descEn: 'Approve expenses, reset PIN, settings', descBn: 'খরচ অনুমোদন, পিন রিসেট, সেটিংস', title: 'কমিটি সদস্য' },
  { key: 'cashier', en: 'Cashier', bn: 'কোষাধ্যক্ষ', descEn: 'Deposits, expenses (needs approval)', descBn: 'জমা ও খরচ এন্ট্রি (অনুমোদন লাগে)', title: 'কোষাধ্যক্ষ' },
  { key: 'field_worker', en: 'Field Worker', bn: 'মাঠকর্মী', descEn: 'Collect deposits', descBn: 'কিস্তি আদায়', title: 'মাঠকর্মী' },
  { key: 'member', en: 'Member', bn: 'সাধারণ সদস্য', descEn: 'Sees own account only', descBn: 'শুধু নিজের হিসাব দেখবেন', title: 'সাধারণ সদস্য' },
];

export default function RolesScreen() {
  const router = useRouter();
  const { l } = useLanguage();
  const { members, setMemberRole } = useSomitiStore();
  const { actualRole, currentUser } = useAuthStore();
  const isSuper = actualRole === 'super_admin';

  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<any | null>(null);

  const roleOf = (m: any) => (m.appRole as string) || 'member';
  const roleLabel = (key: string) => {
    const r = ROLES.find((x) => x.key === key);
    return r ? l(r.en, r.bn) : key;
  };

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const order = ROLES.map((r) => r.key);
    return members
      .filter((m) => !q || m.name.toLowerCase().includes(q) || m.code.toLowerCase().includes(q) || m.phone.includes(q))
      .sort((a, b) => order.indexOf(roleOf(a)) - order.indexOf(roleOf(b)) || a.code.localeCompare(b.code));
  }, [members, query]);

  const choose = (roleKey: string) => {
    if (!editing) return;
    const m = editing;
    setEditing(null);
    if (roleKey === roleOf(m)) return;
    if (m.id === currentUser?.id && roleKey !== 'super_admin') {
      Alert.alert(l('Not allowed', 'অনুমতি নেই'), l('You cannot remove your own super admin role.', 'নিজের সুপার অ্যাডমিন রোল সরানো যাবে না।'));
      return;
    }
    const r = ROLES.find((x) => x.key === roleKey)!;
    Alert.alert(
      l('Change role?', 'রোল পরিবর্তন করবেন?'),
      `${m.name}: ${roleLabel(roleOf(m))} → ${l(r.en, r.bn)}`,
      [
        { text: l('Cancel', 'বাতিল'), style: 'cancel' },
        { text: l('Yes, change', 'হ্যাঁ, পরিবর্তন করুন'), onPress: async () => {try {await setMemberRole(m.id, roleKey, r.title);}catch(e:any){Alert.alert(l('Change failed','পরিবর্তন ব্যর্থ'),e.message);}} },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => safeBack(router, '/(admin)/(tabs)/more')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{l('Users & Roles', 'ব্যবহারকারী ও রোল')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
          <Text style={styles.infoText}>
            {isSuper
              ? l('Tap a member to change their role. Changes apply on their next app refresh.', 'রোল পরিবর্তন করতে সদস্যের উপর চাপুন। সদস্যের অ্যাপ রিফ্রেশ হলে কার্যকর হবে।')
              : l('Only the super admin can change roles.', 'শুধু সুপার অ্যাডমিন রোল পরিবর্তন করতে পারবেন।')}
          </Text>
        </View>

        <TextInput
          style={styles.search}
          value={query}
          onChangeText={setQuery}
          placeholder={l('Search name, code or phone', 'নাম, আইডি বা মোবাইল দিয়ে খুঁজুন')}
          placeholderTextColor={colors.textSecondary}
        />

        <View style={styles.card}>
          {list.map((m, i) => {
            const rk = roleOf(m);
            const isStaff = rk !== 'member';
            return (
              <TouchableOpacity
                key={m.id}
                style={[styles.row, i < list.length - 1 && styles.rowBorder]}
                onPress={() => isSuper && setEditing(m)}
                activeOpacity={isSuper ? 0.7 : 1}
              >
                <View style={[styles.avatar, isStaff && { backgroundColor: colors.primary }]}>
                  <Text style={[styles.avatarText, isStaff && { color: colors.textWhite }]}>{m.name.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{m.name}</Text>
                  <Text style={styles.sub}>
                    {m.code} · {m.phone}
                    {(m as any).userId ? '' : ` · ${l('not activated', 'অ্যাকাউন্ট চালু হয়নি')}`}
                  </Text>
                </View>
                <View style={[styles.badge, isStaff && styles.badgeStaff]}>
                  <Text style={[styles.badgeText, isStaff && styles.badgeTextStaff]}>{roleLabel(rk)}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
          {list.length === 0 && <Text style={styles.sub}>{l('No members', 'কোনো সদস্য নেই')}</Text>}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>

      <AppModal visible={!!editing} onClose={() => setEditing(null)}>
        <Text style={styles.modalTitle}>{editing?.name}</Text>
        <Text style={styles.modalSub}>{l('Choose a role', 'রোল নির্বাচন করুন')}</Text>
        {ROLES.map((r) => {
          const active = editing && roleOf(editing) === r.key;
          return (
            <TouchableOpacity
              key={r.key}
              style={[styles.roleOption, active && styles.roleOptionActive]}
              onPress={() => choose(r.key)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.roleOptionTitle}>{l(r.en, r.bn)}</Text>
                <Text style={styles.roleOptionDesc}>{l(r.descEn, r.descBn)}</Text>
              </View>
              {active && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
            </TouchableOpacity>
          );
        })}
      </AppModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontFamily: 'HindSiliguri-Bold', fontSize: typography.size.title, color: colors.text },
  scroll: { paddingHorizontal: 16, paddingBottom: 24 },
  infoBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  infoText: { flex: 1, fontFamily: 'HindSiliguri-Regular', fontSize: typography.size.sm, color: colors.text },
  search: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'HindSiliguri-Regular',
    fontSize: typography.size.md,
    color: colors.text,
    marginBottom: 12,
  },
  card: { backgroundColor: colors.surface, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.surfaceMuted },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: 'HindSiliguri-Bold', fontSize: typography.size.base, color: colors.text },
  name: { fontFamily: 'HindSiliguri-SemiBold', fontSize: typography.size.md, color: colors.text },
  sub: { fontFamily: 'HindSiliguri-Regular', fontSize: typography.size.caption, color: colors.textSecondary },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: colors.surfaceMuted },
  badgeStaff: { backgroundColor: colors.primarySoft },
  badgeText: { fontFamily: 'HindSiliguri-Medium', fontSize: typography.size.caption, color: colors.textSecondary },
  badgeTextStaff: { color: colors.primary },
  modalTitle: { fontFamily: 'HindSiliguri-Bold', fontSize: typography.size.title, color: colors.text },
  modalSub: { fontFamily: 'HindSiliguri-Regular', fontSize: typography.size.sm, color: colors.textSecondary, marginBottom: 12 },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  roleOptionActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  roleOptionTitle: { fontFamily: 'HindSiliguri-SemiBold', fontSize: typography.size.md, color: colors.text },
  roleOptionDesc: { fontFamily: 'HindSiliguri-Regular', fontSize: typography.size.caption, color: colors.textSecondary },
});
