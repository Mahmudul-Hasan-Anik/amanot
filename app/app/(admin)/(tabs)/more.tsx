import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuthStore } from '../../../src/features/auth/authStore';
import { useLanguage } from '../../../src/i18n/useLanguage';
import { useSomitiStore } from '../../../src/store/somitiStore';
import { colors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';

export default function MoreScreen() {
  const router = useRouter();
  const { logout, currentUser } = useAuthStore();
  const { l, formatNum, isBengali } = useLanguage();
  const pendingCount = useSomitiStore(s => s.approvals.length+s.investmentProposals.filter(p=>['submitted','approved'].includes(p.status)).length+s.withdrawalRequests.filter(r=>['submitted','approved'].includes(r.status)).length);

  const role = useAuthStore(st => st.actualRole);
  const admin = role === 'admin' || role === 'super_admin';
  const roleName: Record<string, [string, string]> = { super_admin: ['Super admin', 'সুপার অ্যাডমিন'], admin: ['Admin', 'অ্যাডমিন'], cashier: ['Cashier', 'ক্যাশিয়ার'], field_worker: ['Field worker', 'মাঠকর্মী'], member: ['Member', 'সদস্য'] };
  const userName = currentUser?.name || l('User', 'ব্যবহারকারী');
  const userRole = [currentUser?.role, roleName[role || 'member'] ? l(...roleName[role || 'member']) : ''].filter(Boolean).join(' • ');
  // Four groups: money, member services, reports, society & settings. Approvals live outside the app now.
  const groups: { title: string; items: { icon: keyof typeof Ionicons.glyphMap; title: string; href: string; show?: boolean; badge?: number }[] }[] = [
    { title: l('Accounts & money', 'হিসাব ও টাকা'), items: [
      { icon: 'wallet-outline', title: l('Accounts & balances', 'হিসাব ও ব্যালেন্স'), href: '/(admin)/finance' },
      { icon: 'book-outline', title: l('Khata (all entries)', 'লেনদেনের খাতা'), href: '/(admin)/ledger' },
      { icon: 'add-circle-outline', title: l('Add money to an account', 'হিসাবে টাকা যোগ'), href: '/(admin)/fund/new' },
      { icon: 'alert-circle-outline', title: l('Overdue installments', 'বকেয়া কিস্তি'), href: '/(admin)/due' },
    ] },
    { title: l('Member services', 'সদস্য সেবা'), items: [
      { icon: 'cash-outline', title: l('Savings returned', 'সঞ্চয় ফেরত'), href: '/(admin)/withdrawals' },
      { icon: 'megaphone-outline', title: l('Notices', 'নোটিশ'), href: '/(admin)/notices' },
      { icon: 'paper-plane-outline', title: l('Send statement', 'স্টেটমেন্ট পাঠান'), href: '/(admin)/statement' },
      { icon: 'time-outline', title: l('Older requests to close', 'পুরনো আবেদন'), href: '/(admin)/approvals', show: pendingCount > 0, badge: pendingCount },
    ] },
    { title: l('Reports', 'রিপোর্ট'), items: [
      { icon: 'document-text-outline', title: l('Reports & analysis', 'রিপোর্ট ও বিশ্লেষণ'), href: '/(admin)/reports' },
      { icon: 'pie-chart-outline', title: l('Yearly profit distribution', 'বার্ষিক মুনাফা বণ্টন'), href: '/(admin)/distribution' },
    ] },
    { title: l('Society & settings', 'সমিতি ও সেটিংস'), items: [
      { icon: 'business-outline', title: l('Society details', 'সমিতির তথ্য'), href: '/(admin)/somiti' },
      { icon: 'people-outline', title: l('Users & permissions', 'ইউজার ও অনুমতি'), href: '/(admin)/roles', show: admin },
      { icon: 'settings-outline', title: l('Settings', 'সেটিংস'), href: '/(admin)/settings' },
      { icon: 'shield-checkmark-outline', title: l('Audit log', 'অডিট লগ'), href: '/(admin)/audit', show: admin },
    ] },
  ];
  const userInitial = userName.trim().charAt(0) || (isBengali ? 'আ' : 'A');

  const handleLogout = () => {
    Alert.alert(
      l('Logout', 'লগআউট'),
      l('Do you want to log out from Amanot app?', 'আপনি কি আমানত অ্যাপ থেকে লগআউট করতে চান?'),
      [
        { text: l('Cancel', 'বাতিল'), style: 'cancel' },
        {
          text: l('Yes, Logout', 'হ্যাঁ, লগআউট'),
          style: 'destructive',
          onPress: () => {
            logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      {/* Screen Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{l('More', 'আরও')}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Card */}
        <TouchableOpacity
          style={styles.profileCard}
          activeOpacity={0.8}
          onPress={() => router.push('/(admin)/somiti')}
        >
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{userInitial}</Text>
          </View>
          <View style={styles.profileDetails}>
            <Text style={styles.profileName}>{userName}</Text>
            <Text style={styles.profileRole}>{userRole}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        {groups.map(group => <React.Fragment key={group.title}>
          <Text style={styles.sectionHeader}>{group.title}</Text>
          <View style={styles.menuCard}>
            {group.items.filter(item => item.show !== false).map((item, index) => <React.Fragment key={item.href}>
              {index > 0 && <View style={styles.menuDivider} />}
              <TouchableOpacity style={styles.menuRow} onPress={() => router.push(item.href as any)} activeOpacity={0.7} accessibilityRole="button">
                <View style={styles.iconBox}><Ionicons name={item.icon} size={18} color={colors.primary} /></View>
                <Text style={styles.menuTitle}>{item.title}</Text>
                {item.badge ? <View style={styles.badgeBlack}><Text style={styles.badgeBlackText}>{formatNum(item.badge)}</Text></View> : null}
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </React.Fragment>)}
          </View>
        </React.Fragment>)}

        {/* Centered Logout Button */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.primary} />
          <Text style={styles.logoutText}>{l('Logout', 'লগআউট')}</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xxl,
    lineHeight: typography.lineHeight.xxl,
    color: colors.text,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 14,
    marginBottom: 16,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.avatarPastels[0].bg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xl,
    lineHeight: typography.lineHeight.xl,
    color: colors.avatarPastels[0].text,
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.base,
    lineHeight: typography.lineHeight.base,
    color: colors.text,
  },
  profileRole: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionHeader: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    color: colors.text,
    marginBottom: 8,
    marginLeft: 4,
  },
  menuCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.surfaceMuted,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuTitle: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    color: colors.text,
    flex: 1,
  },
  badgeBlack: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.text,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  badgeBlackText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    color: colors.surface,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
    marginTop: 4,
  },
  logoutText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.primary,
  },
  bottomSpacer: {
    height: 100,
  },
});
