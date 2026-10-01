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

export default function ProjectDetailScreen() {
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
        <Text style={styles.headerTitle}>প্রজেক্ট</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
            <Ionicons name="pencil-outline" size={20} color="#1E293B" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
            <Ionicons name="ellipsis-vertical" size={20} color="#1E293B" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Category & Status Tags */}
        <View style={styles.tagsRow}>
          <View style={styles.tagPill}>
            <Text style={styles.tagPillText}>জমি</Text>
          </View>
          <View style={styles.tagPill}>
            <Text style={styles.tagPillText}>চলমান</Text>
          </View>
        </View>

        {/* Project Title and Meta */}
        <Text style={styles.projectMainTitle}>সাইট এ: জমি প্রকল্প</Text>
        <Text style={styles.projectMetaLine}>দায়িত্বে: জাহিদ হাসান · [স্থান]</Text>
        <Text style={styles.projectMetaLine}>শুরু মার্চ ২০২৫ · সম্ভাব্য শেষ ডিসেম্বর ২০২৬</Text>

        {/* 2x2 Metric Cards Grid */}
        <View style={styles.gridContainer}>
          <View style={styles.gridRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricCardLabel}>মোট বিনিয়োগ</Text>
              <Text style={styles.metricCardVal}>৳১৫,০০,০০০</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricCardLabel}>মোট ফেরত</Text>
              <Text style={styles.metricCardVal}>৳৪,২০,০০০</Text>
            </View>
          </View>

          <View style={styles.gridRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricCardLabel}>নিট লাভ</Text>
              <Text style={[styles.metricCardVal, { color: '#059669' }]}>+৳১,৮০,০০০</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricCardLabel}>ROI</Text>
              <Text style={styles.metricCardVal}>১২%</Text>
            </View>
          </View>
        </View>

        {/* Capital Recovery Progress Card */}
        <View style={styles.recoveryCard}>
          <View style={styles.recoveryHeader}>
            <Text style={styles.recoveryTitle}>মূলধন ফেরত</Text>
            <Text style={styles.recoveryPct}>২৮%</Text>
          </View>

          <View style={styles.recoveryTrack}>
            <View style={[styles.recoveryFill, { width: '28%' }]} />
          </View>

          <Text style={styles.recoverySub}>প্রজেক্টে এখনো আছে ৳১০,৮০,০০০</Text>
        </View>

        {/* Transactions Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>লেনদেন</Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.seeAllLink}>সব দেখুন</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.transactionsCard}>
          {/* Item 1 */}
          <View style={styles.txnRow}>
            <View style={[styles.txnIconCircle, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="arrow-up" size={16} color="#DC2626" />
            </View>
            <View style={styles.txnDetails}>
              <Text style={styles.txnTitle}>বিনিয়োগ প্রদান</Text>
              <Text style={styles.txnMeta}>১০ মার্চ ২০২৫ · ব্যাংক</Text>
            </View>
            <Text style={[styles.txnAmount, { color: '#DC2626' }]}>−৳৫,০০,০০০</Text>
          </View>

          <View style={styles.txnDivider} />

          {/* Item 2 */}
          <View style={styles.txnRow}>
            <View style={[styles.txnIconCircle, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="arrow-up" size={16} color="#DC2626" />
            </View>
            <View style={styles.txnDetails}>
              <Text style={styles.txnTitle}>বিনিয়োগ প্রদান (২য় কিস্তি)</Text>
              <Text style={styles.txnMeta}>১৫ জুন ২০২৫ · ব্যাংক</Text>
            </View>
            <Text style={[styles.txnAmount, { color: '#DC2626' }]}>−৳১০,০০,০০০</Text>
          </View>

          <View style={styles.txnDivider} />

          {/* Item 3 */}
          <View style={styles.txnRow}>
            <View style={[styles.txnIconCircle, { backgroundColor: '#CCFBF1' }]}>
              <Ionicons name="arrow-down" size={16} color="#0F766E" />
            </View>
            <View style={styles.txnDetails}>
              <Text style={styles.txnTitle}>আয়: প্লট বিক্রয় (আংশিক)</Text>
              <Text style={styles.txnMeta}>২০ জানুয়ারি ২০২৬</Text>
            </View>
            <Text style={[styles.txnAmount, { color: '#059669' }]}>+৳২,৪০,০০০</Text>
          </View>

          <View style={styles.txnDivider} />

          {/* Item 4 */}
          <View style={styles.txnRow}>
            <View style={[styles.txnIconCircle, { backgroundColor: '#CCFBF1' }]}>
              <Ionicons name="arrow-down" size={16} color="#0F766E" />
            </View>
            <View style={styles.txnDetails}>
              <Text style={styles.txnTitle}>আয়: প্লট বিক্রয়</Text>
              <Text style={styles.txnMeta}>১২ আগস্ট ২০২৬</Text>
            </View>
            <Text style={[styles.txnAmount, { color: '#059669' }]}>+৳১,৮০,০০০</Text>
          </View>
        </View>

        {/* Documents Section */}
        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>ডকুমেন্ট</Text>
        <View style={styles.docsRow}>
          <TouchableOpacity style={styles.docCard} activeOpacity={0.8}>
            <Ionicons name="document-text-outline" size={24} color="#0F766E" />
            <Text style={styles.docText}>চুক্তিপত্র</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.docCard} activeOpacity={0.8}>
            <Ionicons name="image-outline" size={24} color="#0F766E" />
            <Text style={styles.docText}>সাইটের ছবি (৩)</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.docCard} activeOpacity={0.8}>
            <Ionicons name="receipt-outline" size={24} color="#0F766E" />
            <Text style={styles.docText}>রসিদ (৬)</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Floating Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.expenseBtn}
          onPress={() => router.push('/(admin)/expense/new')}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-up" size={16} color="#1E293B" />
          <Text style={styles.expenseBtnText}>খরচ লিখুন</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.returnBtn}
          onPress={() => router.push('/(admin)/deposit/new')}
          activeOpacity={0.85}
        >
          <Ionicons name="arrow-down" size={16} color="#FFFFFF" />
          <Text style={styles.returnBtnText}>আয়/ফেরত লিখুন</Text>
        </TouchableOpacity>
      </View>
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    padding: 6,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  tagPill: {
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
  },
  tagPillText: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 12,
    color: '#0F766E',
  },
  projectMainTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 22,
    color: '#1E293B',
    marginBottom: 2,
  },
  projectMetaLine: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  gridContainer: {
    gap: 10,
    marginTop: 14,
    marginBottom: 14,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  metricCardLabel: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  metricCardVal: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 18,
    color: '#1E293B',
  },
  recoveryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  recoveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recoveryTitle: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 13,
    color: '#1E293B',
  },
  recoveryPct: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 13,
    color: '#0F766E',
  },
  recoveryTrack: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  recoveryFill: {
    height: '100%',
    backgroundColor: '#0F766E',
  },
  recoverySub: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#64748B',
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
  seeAllLink: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 13,
    color: '#0F766E',
  },
  transactionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  txnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  txnDivider: {
    height: 1,
    backgroundColor: '#F8FAFC',
  },
  txnIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  txnDetails: {
    flex: 1,
  },
  txnTitle: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 13,
    color: '#1E293B',
  },
  txnMeta: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  txnAmount: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 13,
  },
  docsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    marginBottom: 16,
  },
  docCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
    gap: 4,
  },
  docText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 12,
    color: '#1E293B',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#F6F7F2',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 12,
  },
  expenseBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 26,
    gap: 6,
  },
  expenseBtnText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#1E293B',
  },
  returnBtn: {
    flex: 1,
    backgroundColor: '#134E4A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 26,
    gap: 6,
  },
  returnBtnText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
});
