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

interface MemberDistRow {
  id: string;
  initial: string;
  avatarBg: string;
  avatarColor: string;
  name: string;
  totalDeposit: string;
  profitShare: string;
}

const MEMBER_DIST_ROWS: MemberDistRow[] = [
  {
    id: '1',
    initial: 'আ',
    avatarBg: '#E0F2FE',
    avatarColor: '#0284C7',
    name: 'আনোয়ার হোসেন',
    totalDeposit: 'মোট জমা ৳১,৪৪,০০০',
    profitShare: '+৳৭,৭১৪',
  },
  {
    id: '2',
    initial: 'ক',
    avatarBg: '#CCFBF1',
    avatarColor: '#0F766E',
    name: 'করিম উদ্দিন',
    totalDeposit: 'মোট জমা ৳১,০৮,০০০',
    profitShare: '+৳৫,৭৮৬',
  },
  {
    id: '3',
    initial: 'র',
    avatarBg: '#E0F2FE',
    avatarColor: '#0284C7',
    name: 'রফিকুল ইসলাম',
    totalDeposit: 'মোট জমা ৳৯৬,০০০',
    profitShare: '+৳৫,১৪৩',
  },
  {
    id: '4',
    initial: 'ন',
    avatarBg: '#CCFBF1',
    avatarColor: '#0F766E',
    name: 'নাসরিন আক্তার',
    totalDeposit: 'মোট জমা ৳৭২,০০০',
    profitShare: '+৳৩,৮৫৭',
  },
];

export default function ProfitDistributionScreen() {
  const router = useRouter();

  const handleApprove = () => {
    Alert.alert('সফল', '২০২৬ সালের বার্ষিক লাভ বণ্টন অনুমোদিত হয়েছে!');
  };

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
        <View>
          <Text style={styles.headerTitle}>বার্ষিক লাভ বণ্টন</Text>
          <Text style={styles.headerSubtitle}>হিসাব বছর ২০২৬</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 4-Step Stepper */}
        <View style={styles.stepperContainer}>
          {/* Step 1: হিসাব */}
          <View style={styles.stepItem}>
            <View style={styles.stepCircleFilled}>
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            </View>
            <Text style={styles.stepTextActive}>হিসাব</Text>
          </View>

          <View style={styles.stepLine} />

          {/* Step 2: পর্যালোচনা */}
          <View style={styles.stepItem}>
            <View style={styles.stepCircleRing}>
              <View style={styles.stepCircleRingInner} />
            </View>
            <Text style={styles.stepTextActive}>পর্যালোচনা</Text>
          </View>

          <View style={styles.stepLine} />

          {/* Step 3: অনুমোদন */}
          <View style={styles.stepItem}>
            <View style={styles.stepCircleInactive} />
            <Text style={styles.stepTextInactive}>অনুমোদন</Text>
          </View>

          <View style={styles.stepLine} />

          {/* Step 4: বিতরণ */}
          <View style={styles.stepItem}>
            <View style={styles.stepCircleInactive} />
            <Text style={styles.stepTextInactive}>বিতরণ</Text>
          </View>
        </View>

        {/* Card: হিসাব (খসড়া) */}
        <View style={styles.calcCard}>
          <Text style={styles.calcCardTitle}>হিসাব (খসড়া)</Text>

          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>মোট প্রজেক্ট লাভ</Text>
            <Text style={[styles.calcValue, { color: '#059669' }]}>+৳৩,৭৫,০০০</Text>
          </View>

          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>অন্যান্য আয়</Text>
            <Text style={[styles.calcValue, { color: '#059669' }]}>+৳২৮,০০০</Text>
          </View>

          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>পরিচালনা ব্যয়</Text>
            <Text style={[styles.calcValue, { color: '#DC2626' }]}>−৳১,০৩,০০০</Text>
          </View>

          <View style={styles.calcDivider} />

          <View style={styles.calcRow}>
            <Text style={styles.calcLabelBold}>নিট লাভ</Text>
            <Text style={styles.calcValueBold}>৳৩,০০,০০০</Text>
          </View>

          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>রিজার্ভ ফান্ড (১০%)</Text>
            <Text style={styles.calcValue}>−৳৩০,০০০</Text>
          </View>

          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>পরিচালক অংশ (১০%)</Text>
            <Text style={styles.calcValue}>−৳৩০,০০০</Text>
          </View>

          {/* Highlighted Distributable Profit Box */}
          <View style={styles.distributableBox}>
            <Text style={styles.distributableLabel}>বণ্টনযোগ্য লাভ</Text>
            <Text style={styles.distributableValue}>৳২,৪০,০০০</Text>
          </View>
        </View>

        {/* Lock Info Box */}
        <View style={styles.lockNoticeBox}>
          <Ionicons name="information-circle-outline" size={18} color="#475569" style={styles.lockIcon} />
          <Text style={styles.lockNoticeText}>
            রিজার্ভ ও পরিচালক শতাংশ পরিচালনা কমিটি নির্ধারণ করেছে এবং জানুয়ারি ২০২৬ থেকে লক করা।
          </Text>
        </View>

        {/* Formula Card */}
        <View style={styles.formulaCard}>
          <Text style={styles.formulaCardTitle}>বণ্টনের সূত্র</Text>
          <Text style={styles.formulaMain}>
            সদস্যের অংশ = ৳২,৪০,০০০ × সদস্যের মোট জমা ÷ ৳৪৪,৮০,০০০
          </Text>
          <Text style={styles.formulaSub}>সকল সদস্যের মোট জমা ৳৪৪,৮০,০০০</Text>
        </View>

        {/* Member Allocation Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>সদস্যভিত্তিক অংশ</Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.allMembersLink}>সব ১০০ জন</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.membersCard}>
          {MEMBER_DIST_ROWS.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.memberRow,
                index < MEMBER_DIST_ROWS.length - 1 && styles.memberRowBorder,
              ]}
            >
              <View style={[styles.avatarCircle, { backgroundColor: item.avatarBg }]}>
                <Text style={[styles.avatarText, { color: item.avatarColor }]}>
                  {item.initial}
                </Text>
              </View>

              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{item.name}</Text>
                <Text style={styles.memberDeposit}>{item.totalDeposit}</Text>
              </View>

              <Text style={styles.memberProfit}>{item.profitShare}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Dual Actions Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.draftPdfBtn} activeOpacity={0.8}>
          <Ionicons name="download-outline" size={16} color="#1E293B" />
          <Text style={styles.draftPdfText}>খসড়া PDF</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.approveBtn}
          onPress={handleApprove}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
          <Text style={styles.approveBtnText}>অনুমোদন দিন</Text>
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
    textAlign: 'center',
  },
  headerSubtitle: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: -2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
  },
  stepCircleFilled: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0F766E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleRing: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#0F766E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleRingInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0F766E',
  },
  stepCircleInactive: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  stepLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 4,
    marginBottom: 18,
  },
  stepTextActive: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 11,
    color: '#0F766E',
  },
  stepTextInactive: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: '#94A3B8',
  },
  calcCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  calcCardTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 15,
    color: '#1E293B',
    marginBottom: 10,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  calcDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 6,
  },
  calcLabel: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 13,
    color: '#475569',
  },
  calcValue: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 13,
    color: '#1E293B',
  },
  calcLabelBold: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#1E293B',
  },
  calcValueBold: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#1E293B',
  },
  distributableBox: {
    backgroundColor: '#CCFBF1',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 10,
  },
  distributableLabel: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#0F766E',
  },
  distributableValue: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 20,
    color: '#0F766E',
  },
  lockNoticeBox: {
    flexDirection: 'row',
    backgroundColor: '#E8ECE6',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  lockIcon: {
    marginTop: 2,
  },
  lockNoticeText: {
    flex: 1,
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
  },
  formulaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  formulaCardTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#1E293B',
    marginBottom: 4,
  },
  formulaMain: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
  },
  formulaSub: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
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
  allMembersLink: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 13,
    color: '#0F766E',
  },
  membersCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  memberRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 16,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 14,
    color: '#1E293B',
  },
  memberDeposit: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  memberProfit: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#059669',
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
  draftPdfBtn: {
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
  draftPdfText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#1E293B',
  },
  approveBtn: {
    flex: 1,
    backgroundColor: '#134E4A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 26,
    gap: 6,
  },
  approveBtnText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
});
