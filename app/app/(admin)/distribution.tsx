import React, { useState, useMemo } from 'react';
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
import { useSomitiStore } from '../../src/store/somitiStore';
import { useLanguage } from '../../src/i18n/useLanguage';

const AVATAR_COLORS = [
  { bg: '#E0F2FE', text: '#0284C7' },
  { bg: '#CCFBF1', text: '#0F766E' },
  { bg: '#DCFCE7', text: '#16A34A' },
  { bg: '#FEF3C7', text: '#D97706' },
  { bg: '#EDE9FE', text: '#7C3AED' },
];

export default function ProfitDistributionScreen() {
  const router = useRouter();
  const { l, formatMoney, formatNum } = useLanguage();
  const { members, projects, somitiInfo } = useSomitiStore();

  const [currentStep, setCurrentStep] = useState<number>(2); // 1: হিসাব, 2: পর্যালোচনা, 3: অনুমোদন, 4: বিতরণ
  const [isApproved, setIsApproved] = useState(false);

  // Financial calculations
  const totalProjectProfit = useMemo(() => {
    const sum = projects.reduce((acc, p) => acc + p.netProfit, 0);
    return sum > 0 ? sum : 375000;
  }, [projects]);

  const otherIncome = 28000;
  const operatingExpense = 103000;
  const netProfit = totalProjectProfit + otherIncome - operatingExpense;
  const reserveFund = Math.round(netProfit * 0.10);
  const directorShare = Math.round(netProfit * 0.10);
  const distributableProfit = netProfit - reserveFund - directorShare;

  const totalMembersDeposit = useMemo(() => {
    const sum = members.reduce((acc, m) => acc + m.totalDeposit, 0);
    return sum > 0 ? sum : 4480000;
  }, [members]);

  const memberShares = useMemo(() => {
    return members.map((m, idx) => {
      const share = totalMembersDeposit > 0
        ? Math.round((m.totalDeposit / totalMembersDeposit) * distributableProfit)
        : 0;
      const colorTheme = AVATAR_COLORS[idx % AVATAR_COLORS.length];
      const initial = m.name.trim().charAt(0) || 'M';

      return {
        id: m.id,
        name: m.name,
        initial,
        avatarBg: colorTheme.bg,
        avatarColor: colorTheme.text,
        totalDeposit: m.totalDeposit,
        profitShare: share,
      };
    });
  }, [members, totalMembersDeposit, distributableProfit]);

  const handleApprove = () => {
    Alert.alert(
      l('Profit Distribution Approval', 'লাভ বণ্টন অনুমোদন'),
      `${l('Confirm distribution of total', '২০২৬ সালের মোট')} ${formatMoney(distributableProfit)} ${l('for year 2026?', 'বণ্টন নিশ্চিত করতে চান?')}`,
      [
        { text: l('Cancel', 'বাতিল'), style: 'cancel' },
        {
          text: l('Yes, Approve', 'হ্যাঁ, অনুমোদন দিন'),
          onPress: () => {
            setIsApproved(true);
            setCurrentStep(4);
            Alert.alert(l('Success', 'সফল'), l('2026 Annual profit distribution has been approved and prepared!', '২০২৬ সালের বার্ষিক লাভ বণ্টন অনুমোদিত ও প্রস্তুত হয়েছে!'));
          },
        },
      ]
    );
  };

  const handleDownloadDraft = () => {
    Alert.alert(l('Download Draft', 'খসড়া ডাউনলোড'), l('2026 Profit distribution complete statement PDF is preparing.', '২০২৬ সালের লাভ বণ্টনের পূর্ণাঙ্গ স্টেটমেন্ট PDF প্রস্তুত হচ্ছে।'));
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
          <Text style={styles.headerTitle}>{l('Annual Profit Distribution', 'বার্ষিক লাভ বণ্টন')}</Text>
          <Text style={styles.headerSubtitle}>{l('Accounting Year 2026', 'হিসাব বছর ২০২৬')}</Text>
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
            <Text style={styles.stepTextActive}>{l('Calculate', 'হিসাব')}</Text>
          </View>

          <View style={styles.stepLine} />

          {/* Step 2: পর্যালোচনা */}
          <View style={styles.stepItem}>
            <View style={currentStep >= 2 ? styles.stepCircleFilled : styles.stepCircleRing}>
              {currentStep > 2 ? (
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              ) : (
                <View style={styles.stepCircleRingInner} />
              )}
            </View>
            <Text style={styles.stepTextActive}>{l('Review', 'পর্যালোচনা')}</Text>
          </View>

          <View style={styles.stepLine} />

          {/* Step 3: অনুমোদন */}
          <View style={styles.stepItem}>
            <View style={currentStep >= 3 ? styles.stepCircleFilled : styles.stepCircleInactive}>
              {currentStep >= 3 && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
            </View>
            <Text style={currentStep >= 3 ? styles.stepTextActive : styles.stepTextInactive}>
              {l('Approve', 'অনুমোদন')}
            </Text>
          </View>

          <View style={styles.stepLine} />

          {/* Step 4: বিতরণ */}
          <View style={styles.stepItem}>
            <View style={currentStep >= 4 ? styles.stepCircleFilled : styles.stepCircleInactive}>
              {currentStep >= 4 && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
            </View>
            <Text style={currentStep >= 4 ? styles.stepTextActive : styles.stepTextInactive}>
              {l('Disburse', 'বিতরণ')}
            </Text>
          </View>
        </View>

        {/* Card: হিসাব বিবরণী */}
        <View style={styles.calcCard}>
          <Text style={styles.calcCardTitle}>{l('Calculation (Draft)', 'হিসাব (খসড়া)')}</Text>

          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>{l('Total Project Profit', 'মোট প্রজেক্ট লাভ')}</Text>
            <Text style={[styles.calcValue, { color: '#059669' }]}>
              +{formatMoney(totalProjectProfit)}
            </Text>
          </View>

          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>{l('Other Income', 'অন্যান্য আয়')}</Text>
            <Text style={[styles.calcValue, { color: '#059669' }]}>
              +{formatMoney(otherIncome)}
            </Text>
          </View>

          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>{l('Operating Expense', 'পরিচালনা ব্যয়')}</Text>
            <Text style={[styles.calcValue, { color: '#DC2626' }]}>
              −{formatMoney(operatingExpense)}
            </Text>
          </View>

          <View style={styles.calcDivider} />

          <View style={styles.calcRow}>
            <Text style={styles.calcLabelBold}>{l('Net Profit', 'নিট লাভ')}</Text>
            <Text style={styles.calcValueBold}>{formatMoney(netProfit)}</Text>
          </View>

          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>{l('Reserve Fund (10%)', 'রিজার্ভ ফান্ড (১০%)')}</Text>
            <Text style={styles.calcValue}>−{formatMoney(reserveFund)}</Text>
          </View>

          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>{l('Director Share (10%)', 'পরিচালক অংশ (১০%)')}</Text>
            <Text style={styles.calcValue}>−{formatMoney(directorShare)}</Text>
          </View>

          {/* Highlighted Distributable Profit Box */}
          <View style={styles.distributableBox}>
            <Text style={styles.distributableLabel}>{l('Distributable Profit', 'বণ্টনযোগ্য লাভ')}</Text>
            <Text style={styles.distributableValue}>{formatMoney(distributableProfit)}</Text>
          </View>
        </View>

        {/* Lock Info Box */}
        <View style={styles.lockNoticeBox}>
          <Ionicons name="information-circle-outline" size={18} color="#475569" style={styles.lockIcon} />
          <Text style={styles.lockNoticeText}>
            {l('Reserve and director percentages were fixed by managing committee and locked from January 2026.', 'রিজার্ভ ও পরিচালক শতাংশ পরিচালনা কমিটি নির্ধারণ করেছে এবং জানুয়ারি ২০২৬ থেকে লক করা।')}
          </Text>
        </View>

        {/* Formula Card */}
        <View style={styles.formulaCard}>
          <Text style={styles.formulaCardTitle}>{l('Mathematical Formula', 'বণ্টনের গাণিতিক সূত্র')}</Text>
          <Text style={styles.formulaMain}>
            {l('Member Share =', 'সদস্যের অংশ =')} {formatMoney(distributableProfit)} × {l('Member Total Deposit ÷', 'সদস্যের মোট জমা ÷')} {formatMoney(totalMembersDeposit)}
          </Text>
          <Text style={styles.formulaSub}>
            {l('Total members savings:', 'সকল সদস্যের মোট সঞ্চয়')} {formatMoney(totalMembersDeposit)}
          </Text>
        </View>

        {/* Member Allocation Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{l('Member-wise Allocation', 'সদস্যভিত্তিক অংশ')}</Text>
          <Text style={styles.allMembersLink}>{l('All', 'সব')} {formatNum(members.length)} {l('Members', 'জন')}</Text>
        </View>

        <View style={styles.membersCard}>
          {memberShares.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.memberRow,
                index < memberShares.length - 1 && styles.memberRowBorder,
              ]}
            >
              <View style={[styles.avatarCircle, { backgroundColor: item.avatarBg }]}>
                <Text style={[styles.avatarText, { color: item.avatarColor }]}>
                  {item.initial}
                </Text>
              </View>

              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{item.name}</Text>
                <Text style={styles.memberDeposit}>
                  {l('Total Deposit', 'মোট জমা')} {formatMoney(item.totalDeposit)}
                </Text>
              </View>

              <Text style={styles.memberProfit}>+{formatMoney(item.profitShare)}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Dual Actions Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.draftPdfBtn}
          onPress={handleDownloadDraft}
          activeOpacity={0.8}
        >
          <Ionicons name="download-outline" size={16} color="#1E293B" />
          <Text style={styles.draftPdfText}>{l('Draft PDF', 'খসড়া PDF')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.approveBtn, isApproved && { backgroundColor: '#059669' }]}
          onPress={handleApprove}
          activeOpacity={0.85}
          disabled={isApproved}
        >
          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
          <Text style={styles.approveBtnText}>
            {isApproved ? l('Approved', 'অনুমোদিত') : l('Approve Now', 'অনুমোদন দিন')}
          </Text>
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
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
    backgroundColor: '#E2E8F0',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 4,
    marginBottom: 16,
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
    fontSize: 16,
    color: '#1E293B',
    marginBottom: 12,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  calcLabel: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 13,
    color: '#64748B',
  },
  calcValue: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 13,
    color: '#1E293B',
  },
  calcDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 8,
  },
  calcLabelBold: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#1E293B',
  },
  calcValueBold: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 15,
    color: '#1E293B',
  },
  distributableBox: {
    backgroundColor: '#E6F4F2',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  distributableLabel: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#0F766E',
  },
  distributableValue: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 18,
    color: '#0F766E',
  },
  lockNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 12,
  },
  lockIcon: {
    marginTop: 1,
  },
  lockNoticeText: {
    flex: 1,
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  formulaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
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
    marginBottom: 6,
  },
  formulaMain: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 12,
    color: '#0F766E',
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
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 15,
    color: '#1E293B',
  },
  allMembersLink: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 12,
    color: '#64748B',
  },
  membersCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  memberRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
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
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  draftPdfBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 6,
  },
  draftPdfText: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 14,
    color: '#1E293B',
  },
  approveBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F766E',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 6,
  },
  approveBtnText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
});
