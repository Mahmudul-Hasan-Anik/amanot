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

export default function MoreScreen() {
  const router = useRouter();
  const { logout, currentUser, actualRole } = useAuthStore();
  const roleLabel = ({ super_admin: ['Super Admin', 'সুপার অ্যাডমিন'], admin: ['Admin', 'অ্যাডমিন'], cashier: ['Cashier', 'কোষাধ্যক্ষ'], field_worker: ['Field Worker', 'মাঠকর্মী'], member: ['Member', 'সদস্য'] } as Record<string, string[]>)[actualRole] || ['', ''];
  const { l, formatNum } = useLanguage();

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
      <StatusBar barStyle="dark-content" backgroundColor="#F6F7F2" />

      {/* Screen Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{l('More', 'আরও')}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Card */}
        <TouchableOpacity style={styles.profileCard} activeOpacity={0.8}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{(currentUser?.name || 'আ').charAt(0)}</Text>
          </View>
          <View style={styles.profileDetails}>
            <Text style={styles.profileName}>{currentUser?.name || ''}</Text>
            <Text style={styles.profileRole}>{[currentUser?.role, l(roleLabel[0], roleLabel[1])].filter(Boolean).join(' · ')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        </TouchableOpacity>

        {/* Section: হিসাব */}
        <Text style={styles.sectionHeader}>{l('Accounts', 'হিসাব')}</Text>
        <View style={styles.menuCard}>
          {/* আয় ও ব্যয় */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/(admin)/finance')}
            activeOpacity={0.7}
          >
            <View style={styles.iconBox}>
              <Ionicons name="wallet-outline" size={18} color="#0F766E" />
            </View>
            <Text style={styles.menuTitle}>{l('Income & Expense', 'আয় ও ব্যয়')}</Text>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* অনুমোদন */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/(admin)/approvals')}
            activeOpacity={0.7}
          >
            <View style={styles.iconBox}>
              <Ionicons name="checkmark-outline" size={18} color="#0F766E" />
            </View>
            <Text style={styles.menuTitle}>{l('Approvals', 'অনুমোদন')}</Text>
            <View style={styles.badgeBlack}>
              <Text style={styles.badgeBlackText}>{formatNum(3)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* বার্ষিক লাভ বণ্টন */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/(admin)/distribution')}
            activeOpacity={0.7}
          >
            <View style={styles.iconBox}>
              <Ionicons name="pie-chart-outline" size={18} color="#0F766E" />
            </View>
            <Text style={styles.menuTitle}>{l('Annual Profit Distribution', 'বার্ষিক লাভ বণ্টন')}</Text>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Section: রিপোর্ট ও যোগাযোগ */}
        <Text style={styles.sectionHeader}>{l('Reports & Communication', 'রিপোর্ট ও যোগাযোগ')}</Text>
        <View style={styles.menuCard}>
          {/* অ্যানালিটিক্স */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/(admin)/analytics')}
            activeOpacity={0.7}
          >
            <View style={styles.iconBox}>
              <Ionicons name="trending-up-outline" size={18} color="#0F766E" />
            </View>
            <Text style={styles.menuTitle}>{l('Analytics', 'অ্যানালিটিক্স')}</Text>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* রিপোর্ট */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/(admin)/reports')}
            activeOpacity={0.7}
          >
            <View style={styles.iconBox}>
              <Ionicons name="document-text-outline" size={18} color="#0F766E" />
            </View>
            <Text style={styles.menuTitle}>{l('Reports', 'রিপোর্ট')}</Text>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* স্টেটমেন্ট পাঠান */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/(admin)/statement')}
            activeOpacity={0.7}
          >
            <View style={styles.iconBox}>
              <Ionicons name="paper-plane-outline" size={18} color="#0F766E" />
            </View>
            <Text style={styles.menuTitle}>{l('Send Statement', 'স্টেটমেন্ট পাঠান')}</Text>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* বকেয়া তালিকা */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/(admin)/due')}
            activeOpacity={0.7}
          >
            <View style={styles.iconBox}>
              <Ionicons name="warning-outline" size={18} color="#0F766E" />
            </View>
            <Text style={styles.menuTitle}>{l('Due List', 'বকেয়া তালিকা')}</Text>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* রিমাইন্ডার ও টেমপ্লেট */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/(admin)/reminder')}
            activeOpacity={0.7}
          >
            <View style={styles.iconBox}>
              <Ionicons name="megaphone-outline" size={18} color="#0F766E" />
            </View>
            <Text style={styles.menuTitle}>{l('Reminders & Templates', 'রিমাইন্ডার ও টেমপ্লেট')}</Text>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Section: সমিতি */}
        <Text style={styles.sectionHeader}>{l('Society', 'সমিতি')}</Text>
        <View style={styles.menuCard}>
          {/* সমিতির প্রোফাইল */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/(admin)/somiti')}
            activeOpacity={0.7}
          >
            <View style={styles.iconBox}>
              <Ionicons name="business-outline" size={18} color="#0F766E" />
            </View>
            <Text style={styles.menuTitle}>{l('Society Profile', 'সমিতির প্রোফাইল')}</Text>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* সভা ও নোটিশ */}
          <TouchableOpacity style={styles.menuRow} activeOpacity={0.7} onPress={() => router.push('/(admin)/notices')}>
            <View style={styles.iconBox}>
              <Ionicons name="easel-outline" size={18} color="#0F766E" />
            </View>
            <Text style={styles.menuTitle}>{l('Meetings & Notices', 'সভা ও নোটিশ')}</Text>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* ডকুমেন্ট */}
          <TouchableOpacity
            style={styles.menuRow}
            activeOpacity={0.7}
            onPress={() =>
              Alert.alert(
                l('Documents', 'ডকুমেন্ট'),
                l('Document upload is coming soon. Use Somiti Profile for registration info for now.', 'ডকুমেন্ট আপলোড শীঘ্রই আসছে। আপাতত নিবন্ধন তথ্য সমিতির প্রোফাইলে রাখুন।')
              )
            }
          >
            <View style={styles.iconBox}>
              <Ionicons name="folder-outline" size={18} color="#0F766E" />
            </View>
            <Text style={styles.menuTitle}>{l('Documents', 'ডকুমেন্ট')}</Text>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Section: প্রশাসন */}
        <Text style={styles.sectionHeader}>{l('Administration', 'প্রশাসন')}</Text>
        <View style={styles.menuCard}>
          {/* ব্যবহারকারী ও রোল */}
          <TouchableOpacity style={styles.menuRow} activeOpacity={0.7} onPress={() => router.push('/(admin)/roles')}>
            <View style={styles.iconBox}>
              <Ionicons name="key-outline" size={18} color="#0F766E" />
            </View>
            <Text style={styles.menuTitle}>{l('Users & Roles', 'ব্যবহারকারী ও রোল')}</Text>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* অডিট লগ */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/(admin)/audit')}
            activeOpacity={0.7}
          >
            <View style={styles.iconBox}>
              <Ionicons name="time-outline" size={18} color="#0F766E" />
            </View>
            <Text style={styles.menuTitle}>{l('Audit Log', 'অডিট লগ')}</Text>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* সেটিংস */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/(admin)/settings')}
            activeOpacity={0.7}
          >
            <View style={styles.iconBox}>
              <Ionicons name="settings-outline" size={18} color="#0F766E" />
            </View>
            <Text style={styles.menuTitle}>{l('Settings', 'সেটিংস')}</Text>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Logout Link */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={18} color="#0F766E" />
          <Text style={styles.logoutText}>{l('Logout', 'লগআউট')}</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F7F2',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 22,
    color: '#1E293B',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 20,
    color: '#0F766E',
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 16,
    color: '#1E293B',
  },
  profileRole: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  sectionHeader: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#334155',
    marginBottom: 8,
    marginLeft: 4,
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F8FAFC',
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuTitle: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 14,
    color: '#1E293B',
    flex: 1,
  },
  badgeBlack: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  badgeBlackText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 11,
    color: '#FFFFFF',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 6,
    marginTop: 8,
  },
  logoutText: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 15,
    color: '#0F766E',
  },
});
