import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSomitiStore } from '../../src/store/somitiStore';
import { useLanguage } from '../../src/i18n/useLanguage';
import { safeBack } from '../../src/utils/navigation';
import { toEnglishDigits, toBengaliDigits } from '../../src/lib/bengali';
import { REMOTE } from '../../src/store/somitiStore';
import * as api from '../../src/lib/api';

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

  // Configurable policy percentages (per user request: customizable, if 0% or unset, 100% to members)
  const [reservePercent, setReservePercent] = useState<string>('0');
  const [managementPercent, setManagementPercent] = useState<string>('0');

  // Financial calculations
  const year = new Date().getFullYear();
  const bnYear = toBengaliDigits(year);
  // Server-side numbers (same formula the server uses when distributing)
  const [preview, setPreview] = useState<any>(null);
  const loadPreview = () => {
    if (REMOTE) api.profitPreview(year).then(setPreview).catch(() => {});
  };
  useEffect(loadPreview, []);
  useEffect(() => {
    if (preview?.alreadyDistributed) {
      setIsApproved(true);
      setCurrentStep(4);
    }
  }, [preview?.alreadyDistributed]);

  const totalProjectProfit = useMemo(() => {
    if (preview) return Number(preview.projectProfit) || 0;
    return projects.reduce((acc, p) => acc + Math.max(0, p.netProfit), 0);
  }, [projects, preview]);

  const otherIncome = 0;
  const operatingExpense = preview ? Number(preview.expenses) || 0 : 0;
  const netProfit = totalProjectProfit + otherIncome - operatingExpense;

  const rPct = (parseFloat(toEnglishDigits(reservePercent)) || 0) / 100;
  const mPct = (parseFloat(toEnglishDigits(managementPercent)) || 0) / 100;

  const reserveFund = Math.round(netProfit * rPct);
  const managementShare = Math.round(netProfit * mPct);
  const distributableProfit = Math.max(0, netProfit - reserveFund - managementShare);

  const eligibleMembers = useMemo(() => members.filter((m) => m.status !== 'inactive' && m.totalDeposit > 0), [members]);
  const totalMembersDeposit = useMemo(() => eligibleMembers.reduce((acc, m) => acc + m.totalDeposit, 0), [eligibleMembers]);

  const memberShares = useMemo(() => {
    return eligibleMembers.map((m, idx) => {
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
  }, [eligibleMembers, totalMembersDeposit, distributableProfit]);

  const handleApprove = () => {
    Alert.alert(
      l('Profit Distribution Approval', 'লাভ বণ্টন অনুমোদন'),
      `${l('Confirm distribution of total', `${bnYear} সালের মোট`)} ${formatMoney(distributableProfit)} ${l(`for year ${year}?`, 'বণ্টন নিশ্চিত করতে চান? এটি পরে পরিবর্তন করা যাবে না।')}`,
      [
        { text: l('Cancel', 'বাতিল'), style: 'cancel' },
        {
          text: l('Yes, Approve', 'হ্যাঁ, অনুমোদন দিন'),
          onPress: async () => {
            if (REMOTE) {
              try {
                await api.distributeProfit(year, rPct * 100, mPct * 100);
                await useSomitiStore.getState().syncFromServer();
                loadPreview();
              } catch (e: any) {
                Alert.alert(l('Failed', 'ব্যর্থ'), e?.message || String(e));
                return;
              }
            }
            setIsApproved(true);
            setCurrentStep(4);
            Alert.alert(l('Success', 'সফল'), l(`${year} profit distribution approved. Each member's share is now on their profile.`, `${bnYear} সালের লাভ বণ্টন অনুমোদিত হয়েছে। প্রত্যেক সদস্যের অংশ তাদের প্রোফাইলে দেখা যাবে।`));
          },
        },
      ]
    );
  };

  const handleDownloadDraft = () => {
    Alert.alert(l('Download Draft', 'খসড়া ডাউনলোড'), l('PDF export is coming soon. Use the screen above as the draft.', 'PDF ডাউনলোড শীঘ্রই আসছে। আপাতত উপরের হিসাবটিই খসড়া।'));
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F7F2" />

      {/* Screen Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => safeBack(router, '/(admin)/(tabs)')}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>{l('Annual Profit Distribution', 'বার্ষিক লাভ বণ্টন')}</Text>
          <Text style={styles.headerSubtitle}>{l(`Accounting Year ${year}`, `হিসাব বছর ${bnYear}`)}</Text>
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
            <Text style={styles.calcLabelBold}>{l('Net Profit', 'নিট মোট লাভ')}</Text>
            <Text style={styles.calcValueBold}>{formatMoney(netProfit)}</Text>
          </View>

          <View style={styles.calcDivider} />

          {/* Policy Title & Presets */}
          <Text style={styles.policyTitle}>{l('Distribution Policy Settings', 'মুনাফা বণ্টন নীতি ও অনুপাত')}</Text>

          <View style={styles.presetButtonsRow}>
            <TouchableOpacity
              style={[styles.presetBtn, reservePercent === '0' && managementPercent === '0' && styles.presetBtnActive]}
              onPress={() => {
                setReservePercent('0');
                setManagementPercent('0');
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.presetBtnText, reservePercent === '0' && managementPercent === '0' && styles.presetBtnTextActive]}>
                {l('100% to Members (0% Reserve)', '১০০% সাধারণ সদস্যদের')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.presetBtn, reservePercent === '10' && managementPercent === '0' && styles.presetBtnActive]}
              onPress={() => {
                setReservePercent('10');
                setManagementPercent('0');
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.presetBtnText, reservePercent === '10' && managementPercent === '0' && styles.presetBtnTextActive]}>
                {l('10% Reserve + 90% Members', '১০% রিজার্ভ + ৯০% সদস্য')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.presetBtn, reservePercent === '10' && managementPercent === '10' && styles.presetBtnActive]}
              onPress={() => {
                setReservePercent('10');
                setManagementPercent('10');
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.presetBtnText, reservePercent === '10' && managementPercent === '10' && styles.presetBtnTextActive]}>
                {l('10% Reserve + 10% Mgmt + 80%', '১০% রিজার্ভ + ১০% পরিচালনা')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Configurable Percent Inputs */}
          <View style={styles.percentInputRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.percentInputLabel}>{l('Reserve Fund Ratio (%)', 'সংরক্ষিত তহবিল / রিজার্ভ অনুপাত (%)')}</Text>
              <Text style={styles.percentInputSub}>{l('Deduction:', 'মোট কর্তন:')} −{formatMoney(reserveFund)}</Text>
            </View>
            <View style={styles.percentInputBox}>
              <TextInput
                style={styles.percentTextInput}
                value={reservePercent}
                onChangeText={(t) => setReservePercent(toEnglishDigits(t))}
                keyboardType="numeric"
                maxLength={3}
                placeholder="0"
              />
              <Text style={styles.percentSign}>%</Text>
            </View>
          </View>

          <View style={styles.percentInputRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.percentInputLabel}>{l('Management Committee Ratio (%)', 'ব্যবস্থাপনা / পরিচালনা কমিটি অনুপাত (%)')}</Text>
              <Text style={styles.percentInputSub}>{l('Deduction:', 'মোট কর্তন:')} −{formatMoney(managementShare)}</Text>
            </View>
            <View style={styles.percentInputBox}>
              <TextInput
                style={styles.percentTextInput}
                value={managementPercent}
                onChangeText={(t) => setManagementPercent(toEnglishDigits(t))}
                keyboardType="numeric"
                maxLength={3}
                placeholder="0"
              />
              <Text style={styles.percentSign}>%</Text>
            </View>
          </View>

          {/* Highlighted Distributable Profit Box */}
          <View style={styles.distributableBox}>
            <View style={{ flex: 1 }}>
              <Text style={styles.distributableLabel}>{l('Distributable Profit', 'সদস্যদের বণ্টনযোগ্য নিট লাভ')}</Text>
              <Text style={styles.distributableSub}>
                {reservePercent === '0' && managementPercent === '0'
                  ? l('100% distributed to members proportionally', 'শতভাগ (১০০%) মুনাফা সদস্যদের মধ্যে সঞ্চয় অনুপাতে বণ্টন হবে')
                  : l(`Remaining ${100 - (parseFloat(reservePercent)||0) - (parseFloat(managementPercent)||0)}% distributed`, `অবশিষ্ট ${100 - (parseFloat(reservePercent)||0) - (parseFloat(managementPercent)||0)}% মুনাফা বণ্টন হবে`)}
              </Text>
            </View>
            <Text style={styles.distributableValue}>{formatMoney(distributableProfit)}</Text>
          </View>
        </View>

        {/* Info Note Box */}
        <View style={styles.lockNoticeBox}>
          <Ionicons name="information-circle-outline" size={18} color="#475569" style={styles.lockIcon} />
          <Text style={styles.lockNoticeText}>
            {reservePercent === '0' && managementPercent === '0'
              ? l('Zero reserve selected: 100% of the annual surplus is being allocated directly to members based on total savings.', 'কোনো রিজার্ভ বা পরিচালনা ফি ধার্য করা হয়নি: ১০০% বার্ষিক মুনাফা সরাসরি সদস্যদের সঞ্চয়ের আনুপাতিক হারে বণ্টন হচ্ছে।')
              : l('Custom reserve/management ratios applied per somiti committee decision before distribution.', 'সমিতির পরিচালনা কমিটির সিদ্ধান্ত অনুযায়ী রিজার্ভ ও পরিচালনা অনুপাত কর্তনের পর অবশিষ্ট অংশ বণ্টন হচ্ছে।')}
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
  policyTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 13,
    color: '#0F766E',
    marginTop: 6,
    marginBottom: 8,
  },
  presetButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  presetBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetBtnActive: {
    backgroundColor: '#0F766E',
    borderColor: '#0F766E',
  },
  presetBtnText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 11,
    color: '#475569',
  },
  presetBtnTextActive: {
    color: '#FFFFFF',
    fontFamily: 'HindSiliguri-Bold',
  },
  percentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  percentInputLabel: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 12,
    color: '#334155',
  },
  percentInputSub: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: '#64748B',
  },
  percentInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 64,
    justifyContent: 'center',
  },
  percentTextInput: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#1E293B',
    padding: 0,
    textAlign: 'center',
    minWidth: 28,
  },
  percentSign: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 13,
    color: '#64748B',
    marginLeft: 2,
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
  distributableSub: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: '#0F766E',
    marginTop: 2,
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
