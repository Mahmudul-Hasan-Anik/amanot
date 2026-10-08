import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../src/features/auth/authStore';
import { useLanguage } from '../../../src/i18n/useLanguage';
import { toBengaliDigits } from '../../../src/lib/bengali';
import { colors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';

export default function MoreScreen() {
  const router = useRouter();
  const { logout, currentUser, actualRole } = useAuthStore();
  const { l, formatNum, isBengali } = useLanguage();

  const defaultName = isBengali ? 'আনোয়ার হোসেন' : 'Anwar Hossain';
  const defaultRole = isBengali ? 'সভাপতি • সুপার অ্যাডমিন' : 'President • Super Admin';

  const userName = currentUser?.name || defaultName;
  const userRole = defaultRole;
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
    <SafeAreaView style={styles.container}>
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

        {/* Section 1: হিসাব (Accounts) */}
        <Text style={styles.sectionHeader}>{l('Accounts', 'হিসাব')}</Text>
        <View style={styles.menuCard}>
          {/* আয় ও ব্যয় */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/(admin)/finance')}
            activeOpacity={0.7}
          >
            <View style={styles.iconBox}>
              <Ionicons name="wallet-outline" size={18} color={colors.primary} />
            </View>
            <Text style={styles.menuTitle}>{l('Income & Expense', 'আয় ও ব্যয়')}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* অনুমোদন */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/(admin)/approvals')}
            activeOpacity={0.7}
          >
            <View style={styles.iconBox}>
              <Ionicons name="checkmark-outline" size={18} color={colors.primary} />
            </View>
            <Text style={styles.menuTitle}>{l('Approvals', 'অনুমোদন')}</Text>
            <View style={styles.badgeBlack}>
              <Text style={styles.badgeBlackText}>
                {isBengali ? toBengaliDigits(3) : '3'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* বার্ষিক লাভ বণ্টন */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/(admin)/distribution')}
            activeOpacity={0.7}
          >
            <View style={styles.iconBox}>
              <Ionicons name="pie-chart-outline" size={18} color={colors.primary} />
            </View>
            <Text style={styles.menuTitle}>{l('Annual Profit Distribution', 'বার্ষিক লাভ বণ্টন')}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Section 2: রিপোর্ট ও যোগাযোগ (Reports & Communication) */}
        <Text style={styles.sectionHeader}>{l('Reports & Communication', 'রিপোর্ট ও যোগাযোগ')}</Text>
        <View style={styles.menuCard}>
          {/* অ্যানালিটিক্স */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/(admin)/analytics')}
            activeOpacity={0.7}
          >
            <View style={styles.iconBox}>
              <Ionicons name="trending-up-outline" size={18} color={colors.primary} />
            </View>
            <Text style={styles.menuTitle}>{l('Analytics', 'অ্যানালিটিক্স')}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* রিপোর্ট */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/(admin)/reports')}
            activeOpacity={0.7}
          >
            <View style={styles.iconBox}>
              <Ionicons name="document-text-outline" size={18} color={colors.primary} />
            </View>
            <Text style={styles.menuTitle}>{l('Reports', 'রিপোর্ট')}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* স্টেটমেন্ট পাঠান */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/(admin)/statement')}
            activeOpacity={0.7}
          >
            <View style={styles.iconBox}>
              <Ionicons name="paper-plane-outline" size={18} color={colors.primary} />
            </View>
            <Text style={styles.menuTitle}>{l('Send Statement', 'স্টেটমেন্ট পাঠান')}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* বকেয়া তালিকা */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/(admin)/overdue')}
            activeOpacity={0.7}
          >
            <View style={styles.iconBox}>
              <Ionicons name="warning-outline" size={18} color={colors.primary} />
            </View>
            <Text style={styles.menuTitle}>{l('Due List', 'বকেয়া তালিকা')}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* রিমাইন্ডার ও টেমপ্লেট */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/(admin)/reminder')}
            activeOpacity={0.7}
          >
            <View style={styles.iconBox}>
              <Ionicons name="megaphone-outline" size={18} color={colors.primary} />
            </View>
            <Text style={styles.menuTitle}>{l('Reminders & Templates', 'রিমাইন্ডার ও টেমপ্লেট')}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Section 3: সমিতি (Society) */}
        <Text style={styles.sectionHeader}>{l('Society', 'সমিতি')}</Text>
        <View style={styles.menuCard}>
          {/* সমিতির প্রোফাইল */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/(admin)/somiti')}
            activeOpacity={0.7}
          >
            <View style={styles.iconBox}>
              <Ionicons name="business-outline" size={18} color={colors.primary} />
            </View>
            <Text style={styles.menuTitle}>{l('Society Profile', 'সমিতির প্রোফাইল')}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* সভা ও নোটিশ */}
          <TouchableOpacity
            style={styles.menuRow}
            activeOpacity={0.7}
            onPress={() => router.push('/(admin)/meetings')}
          >
            <View style={styles.iconBox}>
              <Ionicons name="easel-outline" size={18} color={colors.primary} />
            </View>
            <Text style={styles.menuTitle}>{l('Meetings & Notices', 'সভা ও নোটিশ')}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* ডকুমেন্ট */}
          <TouchableOpacity
            style={styles.menuRow}
            activeOpacity={0.7}
            onPress={() => router.push('/(admin)/documents')}
          >
            <View style={styles.iconBox}>
              <Ionicons name="folder-outline" size={18} color={colors.primary} />
            </View>
            <Text style={styles.menuTitle}>{l('Documents', 'ডকুমেন্ট')}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Section 4: প্রশাসন (Administration) */}
        <Text style={styles.sectionHeader}>{l('Administration', 'প্রশাসন')}</Text>
        <View style={styles.menuCard}>
          {/* ব্যবহারকারী ও রোল */}
          <TouchableOpacity
            style={styles.menuRow}
            activeOpacity={0.7}
            onPress={() => router.push('/(admin)/roles')}
          >
            <View style={styles.iconBox}>
              <Ionicons name="key-outline" size={18} color={colors.primary} />
            </View>
            <Text style={styles.menuTitle}>{l('Users & Roles', 'ব্যবহারকারী ও রোল')}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* অডিট লগ */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/(admin)/audit')}
            activeOpacity={0.7}
          >
            <View style={styles.iconBox}>
              <Ionicons name="time-outline" size={18} color={colors.primary} />
            </View>
            <Text style={styles.menuTitle}>{l('Audit Log', 'অডিট লগ')}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* সেটিংস */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/(admin)/settings')}
            activeOpacity={0.7}
          >
            <View style={styles.iconBox}>
              <Ionicons name="settings-outline" size={18} color={colors.primary} />
            </View>
            <Text style={styles.menuTitle}>{l('Settings', 'সেটিংস')}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

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
