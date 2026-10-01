import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function FinanceScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F7F2" />

      {/* Screen Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>আয় ও ব্যয়</Text>
        <TouchableOpacity style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="download-outline" size={22} color="#1E293B" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Month Selector Pill */}
        <TouchableOpacity style={styles.monthPill} activeOpacity={0.8}>
          <Ionicons name="calendar-outline" size={16} color="#1E293B" />
          <Text style={styles.monthPillText}>সেপ্টেম্বর ২০২৬</Text>
          <Ionicons name="chevron-down" size={16} color="#64748B" />
        </TouchableOpacity>

        {/* 3 Metrics Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>আয়</Text>
            <Text style={styles.summaryValue}>৳১,৮২,৪০০</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>ব্যয়</Text>
            <Text style={styles.summaryValue}>৳১২,৮০০</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>নিট</Text>
            <Text style={styles.summaryValue}>৳১,৬৯,৬০০</Text>
          </View>
        </View>

        {/* Section: হিসাবসমূহ */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>হিসাবসমূহ</Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.transferLink}>স্থানান্তর</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.accountsCard}>
          {/* Account 1 */}
          <View style={styles.accountRow}>
            <View style={styles.accountIconBox}>
              <Ionicons name="business-outline" size={20} color="#0F766E" />
            </View>
            <View style={styles.accountDetails}>
              <Text style={styles.accountName}>ব্যাংক হিসাব</Text>
              <Text style={styles.accountSub}>[ব্যাংকের নাম]</Text>
            </View>
            <Text style={styles.accountBalance}>৳৭,৬০,০০০</Text>
          </View>

          <View style={styles.accountDivider} />

          {/* Account 2 */}
          <View style={styles.accountRow}>
            <View style={styles.accountIconBox}>
              <Ionicons name="wallet-outline" size={20} color="#0F766E" />
            </View>
            <View style={styles.accountDetails}>
              <Text style={styles.accountName}>কোষাধ্যক্ষের হাতে</Text>
              <Text style={styles.accountSub}>মাহমুদা খাতুন</Text>
            </View>
            <Text style={styles.accountBalance}>৳১,২০,০০০</Text>
          </View>

          <View style={styles.accountDivider} />

          {/* Account 3 */}
          <View style={styles.accountRow}>
            <View style={styles.accountIconBox}>
              <Ionicons name="phone-portrait-outline" size={20} color="#0F766E" />
            </View>
            <View style={styles.accountDetails}>
              <Text style={styles.accountName}>বিকাশ</Text>
              <Text style={styles.accountSub}>[বিকাশ নম্বর]</Text>
            </View>
            <Text style={styles.accountBalance}>৳৩৮,০০০</Text>
          </View>

          <View style={styles.accountDivider} />

          {/* Account 4 */}
          <View style={styles.accountRow}>
            <View style={styles.accountIconBox}>
              <Ionicons name="people-outline" size={20} color="#0F766E" />
            </View>
            <View style={styles.accountDetails}>
              <Text style={styles.accountName}>মাঠকর্মীর হাতে</Text>
              <Text style={styles.accountSub}>সুমন মিয়া · আজ জমা দিতে হবে</Text>
            </View>
            <Text style={styles.accountBalance}>৳১২,০০০</Text>
          </View>

          <View style={styles.accountDivider} />

          {/* Total Row */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>হাতে ও ব্যাংকে মোট</Text>
            <Text style={styles.totalBalance}>৳৯,৩০,০০০</Text>
          </View>
        </View>

        {/* Section: খাতভিত্তিক ব্যয় */}
        <Text style={[styles.sectionTitle, { marginTop: 16, marginBottom: 8 }]}>
          খাতভিত্তিক ব্যয়
        </Text>
        <View style={styles.categoriesCard}>
          {/* Category 1 */}
          <View style={styles.catItem}>
            <View style={styles.catHeader}>
              <Text style={styles.catName}>সভা ও আপ্যায়ন</Text>
              <Text style={styles.catAmount}>৳৫,২০০</Text>
            </View>
            <View style={styles.catTrack}>
              <View style={[styles.catFill, { width: '85%' }]} />
            </View>
          </View>

          {/* Category 2 */}
          <View style={styles.catItem}>
            <View style={styles.catHeader}>
              <Text style={styles.catName}>যাতায়াত</Text>
              <Text style={styles.catAmount}>৳৩,১০০</Text>
            </View>
            <View style={styles.catTrack}>
              <View style={[styles.catFill, { width: '52%' }]} />
            </View>
          </View>

          {/* Category 3 */}
          <View style={styles.catItem}>
            <View style={styles.catHeader}>
              <Text style={styles.catName}>অন্যান্য</Text>
              <Text style={styles.catAmount}>৳১,৮০০</Text>
            </View>
            <View style={styles.catTrack}>
              <View style={[styles.catFill, { width: '30%' }]} />
            </View>
          </View>

          {/* Category 4 */}
          <View style={styles.catItem}>
            <View style={styles.catHeader}>
              <Text style={styles.catName}>এসএমএস ও অ্যাপ</Text>
              <Text style={styles.catAmount}>৳১,৫০০</Text>
            </View>
            <View style={styles.catTrack}>
              <View style={[styles.catFill, { width: '25%' }]} />
            </View>
          </View>

          {/* Category 5 */}
          <View style={styles.catItem}>
            <View style={styles.catHeader}>
              <Text style={styles.catName}>স্টেশনারি</Text>
              <Text style={styles.catAmount}>৳১,২০০</Text>
            </View>
            <View style={styles.catTrack}>
              <View style={[styles.catFill, { width: '20%' }]} />
            </View>
          </View>
        </View>

        {/* Section: সাম্প্রতিক */}
        <View style={[styles.sectionHeaderRow, { marginTop: 16 }]}>
          <Text style={styles.sectionTitle}>সাম্প্রতিক</Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.seeAllLink}>সব দেখুন</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.recentCard}>
          {/* Item 1 */}
          <View style={styles.recentRow}>
            <View style={styles.recentDetails}>
              <Text style={styles.recentTitle}>খরচ: এসএমএস প্যাকেজ</Text>
              <Text style={styles.recentMeta}>২৮ সেপ্টে · বিকাশ</Text>
            </View>
            <Text style={[styles.recentAmount, { color: '#DC2626' }]}>−৳১,৫০০</Text>
          </View>

          <View style={styles.recentDivider} />

          {/* Item 2 */}
          <View style={styles.recentRow}>
            <View style={styles.recentDetails}>
              <Text style={styles.recentTitle}>আয়: পোল্ট্রি খামার</Text>
              <Text style={styles.recentMeta}>২৫ সেপ্টে · ব্যাংক</Text>
            </View>
            <Text style={[styles.recentAmount, { color: '#059669' }]}>+৳১৮,৪০০</Text>
          </View>

          <View style={styles.recentDivider} />

          {/* Item 3 */}
          <View style={styles.recentRow}>
            <View style={styles.recentDetails}>
              <Text style={styles.recentTitle}>খরচ: সভার যাতায়াত</Text>
              <Text style={styles.recentMeta}>২০ সেপ্টে · হাতে নগদ</Text>
            </View>
            <Text style={[styles.recentAmount, { color: '#DC2626' }]}>−৳১,২০০</Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(admin)/expense/new')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={20} color="#FFFFFF" />
        <Text style={styles.fabText}>খরচ লিখুন</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F7F2',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 20,
    color: '#1E293B',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  monthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    marginBottom: 14,
  },
  monthPillText: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 13,
    color: '#1E293B',
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 10,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E2E8F0',
  },
  summaryLabel: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  summaryValue: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 16,
    color: '#1E293B',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 15,
    color: '#1E293B',
  },
  transferLink: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 13,
    color: '#0F766E',
  },
  seeAllLink: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 13,
    color: '#0F766E',
  },
  accountsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  accountDivider: {
    height: 1,
    backgroundColor: '#F8FAFC',
  },
  accountIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  accountDetails: {
    flex: 1,
  },
  accountName: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 14,
    color: '#1E293B',
  },
  accountSub: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: '#64748B',
  },
  accountBalance: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#1E293B',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  totalLabel: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 13,
    color: '#64748B',
  },
  totalBalance: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#1E293B',
  },
  categoriesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  catItem: {
    gap: 4,
  },
  catHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  catName: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 13,
    color: '#1E293B',
  },
  catAmount: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 13,
    color: '#1E293B',
  },
  catTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  catFill: {
    height: '100%',
    backgroundColor: '#0F766E',
  },
  recentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  recentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  recentDivider: {
    height: 1,
    backgroundColor: '#F8FAFC',
  },
  recentDetails: {
    flex: 1,
  },
  recentTitle: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 13,
    color: '#1E293B',
  },
  recentMeta: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: '#64748B',
  },
  recentAmount: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 18,
    backgroundColor: '#134E4A',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 26,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  fabText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
});
