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
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSomitiStore } from '../../src/store/somitiStore';
import { useLanguage } from '../../src/i18n/useLanguage';
import { safeBack } from '../../src/utils/navigation';
import { toEnglishDigits, toBengaliDigits } from '../../src/lib/bengali';
import { REMOTE } from '../../src/store/somitiStore';
import * as api from '../../src/lib/api';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { exportAndShareReceipt } from '../../src/utils/pdfExport';

export default function ProfitDistributionScreen() {
  const router = useRouter();
  const { l, formatMoney, formatNum, isBengali } = useLanguage();
  const { members, projects, somitiInfo } = useSomitiStore();

  const [currentStep, setCurrentStep] = useState<number>(2); // 1: হিসাব, 2: পর্যালোচনা, 3: অনুমোদন, 4: বিতরণ
  const [isApproved, setIsApproved] = useState(false);

  // Financial calculations
  const year = new Date().getFullYear();
  const [saving, setSaving] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const bnYear = toBengaliDigits(year);
  const [preview, setPreview] = useState<any>(!REMOTE ? (somitiInfo as any).demoProfitDistributions?.[year] || null : null);

  const loadPreview = () => {
    if (REMOTE) api.profitPreview(year).then(v => { setPreview(v); setPreviewError(null); }).catch(e => setPreviewError(e.message));
  };

  useEffect(loadPreview, []);

  useEffect(() => {
    if (preview?.alreadyDistributed) {
      setIsApproved(true);
      setCurrentStep(4);
    }
  }, [preview?.alreadyDistributed]);

  const totalProjectProfit = preview ? Number(preview.projectProfit) : projects.reduce((sum,p) => sum + p.netProfit,0);
  const otherIncome = 0;
  const operatingExpense = preview ? Number(preview.expenses) : Number(somitiInfo.monthlyExpense || 0);
  const netProfit = preview ? Number(preview.netProfit) : totalProjectProfit - operatingExpense;
  const reservePercent = Number(preview?.reservePct ?? 10);
  const directorPercent = Number(preview?.managementPct ?? 10);
  const reserveFund = Math.round(netProfit * reservePercent) / 100;
  const directorFund = Math.round(netProfit * directorPercent) / 100;
  const distributableProfit = Number(preview?.distributed ?? Math.max(0, netProfit-reserveFund-directorFund));
  const eligibleMembers = members.filter(m => m.status !== 'inactive' && m.totalDeposit > 0);
  const totalMembersDeposit = Number(preview?.totalDeposit ?? eligibleMembers.reduce((sum,m)=>sum+m.totalDeposit,0));
  const totalMemberCount = preview?.shares?.length ?? eligibleMembers.length;
  const sampleMembers = (preview?.shares ?? eligibleMembers.map(m=>({memberId:m.id,name:m.name,baseDeposit:m.totalDeposit}))).map((m:any,index:number)=>({
    id:m.memberId,name:m.name,initial:m.name.slice(0,1),totalDeposit:Number(m.baseDeposit),
    profitShare: Number(m.share ?? (totalMembersDeposit>0 ? Math.round(Number(m.baseDeposit)/totalMembersDeposit*distributableProfit*100)/100 : 0)),
    avatarBg:colors.avatarPastels[index%colors.avatarPastels.length].bg,avatarColor:colors.avatarPastels[index%colors.avatarPastels.length].text,
  }));

  const handleApprove = () => {
    if (saving || isApproved || distributableProfit <= 0 || totalMembersDeposit <= 0 || (REMOTE && (!preview || previewError))) return;
    const executeApproval = async () => {
      setSaving(true);
      if (REMOTE) {
        try {
          await api.distributeProfit(year, reservePercent, directorPercent);
          await useSomitiStore.getState().syncFromServer();
          loadPreview();
        } catch (e: any) {
          Alert.alert(l('Failed', 'ব্যর্থ'), e?.message || String(e));
          setSaving(false);
          return;
        }
      } else {
        const state = useSomitiStore.getState();
        if ((state.somitiInfo as any).demoProfitDistributions?.[year]) { setSaving(false); return; }
        let allocated = 0;
        const shares: Array<{memberId:string;name:string;baseDeposit:number;share:number}> = sampleMembers.map((m:any,i:number) => {
          const share = i === sampleMembers.length-1 ? Math.round((distributableProfit-allocated)*100)/100 : m.profitShare;
          allocated += share;
          return {memberId:m.id,name:m.name,baseDeposit:m.totalDeposit,share};
        });
        const snapshot = {alreadyDistributed:true,projectProfit:totalProjectProfit,expenses:operatingExpense,netProfit,
          reservePct:reservePercent,managementPct:directorPercent,distributed:distributableProfit,totalDeposit:totalMembersDeposit,shares};
        useSomitiStore.setState({members:state.members.map(m=>{const share=shares.find(s=>s.memberId===m.id)?.share||0;
          return share ? {...m,totalDeposit:m.totalDeposit+share,profitBalance:(m.profitBalance||0)+share,lastProfitYear:year} : m;}),
          somitiInfo:{...state.somitiInfo,demoProfitDistributions:{...(state.somitiInfo as any).demoProfitDistributions,[year]:snapshot}} as any});
        setPreview(snapshot);
      }
      setSaving(false);
      setIsApproved(true);
      setCurrentStep(4);
      Alert.alert(
        l('Distribution Approved', 'মুনাফা বণ্টন সফলভাবে অনুমোদিত'),
        l(
          `${year} annual profit distribution of ${formatMoney(distributableProfit)} is approved and allocated to all members.`,
          `${isBengali ? bnYear : year} সালের বার্ষিক মোট ${formatMoney(distributableProfit)} লাভ বণ্টন সফলভাবে অনুমোদিত হয়েছে এবং সকল সদস্যের প্রোফাইলে জমা হয়েছে।`
        )
      );
    };

    Alert.alert(
      l('Profit Distribution Approval', 'বার্ষিক লাভ বণ্টন অনুমোদন'),
      `${l('Confirm instant approval of total', `${isBengali ? bnYear : year} সালের মোট`)} ${formatMoney(distributableProfit)} ${l('distributable profit?', 'বণ্টন নিশ্চিত করতে চান? এটি সাথে সাথে কার্যকর হবে।')}`,
      [
        { text: l('Cancel', 'বাতিল'), style: 'cancel' },
        {
          text: l('Approve Now', 'হ্যাঁ, অনুমোদন দিন'),
          onPress: executeApproval,
        },
      ]
    );
  };

  const handleDownloadDraft = () => {
    exportAndShareReceipt({
      receiptNo: `DIST-${year}`,
      memberName: l('All Somiti Members', 'সকল সমিতি সদস্য'),
      memberCode: `${totalMemberCount} জন`,
      amount: distributableProfit,
      date: `হিসাব বছর ${isBengali ? bnYear : year}`,
      paymentMethod: 'ব্যাংক ও সমবায় ফান্ড',
      dueAmount: 0,
      somitiName: somitiInfo.name,
      somitiReg: somitiInfo.regNo,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      {/* Screen Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => safeBack(router, '/(admin)/(tabs)')}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {l('Annual Profit Distribution', 'বার্ষিক লাভ বণ্টন')}
          </Text>
          <Text style={styles.headerSubtitle}>
            {l(`Accounting Year ${year}`, `হিসাব বছর ${isBengali ? bnYear : year}`)}
          </Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {previewError && <TouchableOpacity onPress={loadPreview}><Text style={{color: colors.danger, marginBottom:12}}>{previewError} · {l('Retry','আবার চেষ্টা')}</Text></TouchableOpacity>}
        {REMOTE && !preview && !previewError && <Text>{l('Loading annual accounts…','বার্ষিক হিসাব লোড হচ্ছে…')}</Text>}
        {/* 4-Step Stepper Card */}
        <View style={styles.stepperCard}>
          {/* Step 1: হিসাব */}
          <View style={styles.stepItem}>
            <View style={[styles.stepCircle, styles.stepCircleCompleted]}>
              <Ionicons name="checkmark" size={14} color={colors.surface} />
            </View>
            <Text style={styles.stepLabelActive}>{l('Calculation', 'হিসাব')}</Text>
          </View>

          {/* Step 2: পর্যালোচনা */}
          <View style={styles.stepItem}>
            <View
              style={[
                styles.stepCircle,
                currentStep >= 2 ? styles.stepCircleActive : styles.stepCircleInactive,
              ]}
            >
              {currentStep > 2 && (
                <Ionicons name="checkmark" size={14} color={colors.surface} />
              )}
            </View>
            <Text style={styles.stepLabelActive}>{l('Review', 'পর্যালোচনা')}</Text>
          </View>

          {/* Step 3: অনুমোদন */}
          <View style={styles.stepItem}>
            <View
              style={[
                styles.stepCircle,
                currentStep >= 3 ? styles.stepCircleCompleted : styles.stepCircleInactive,
              ]}
            >
              {currentStep >= 3 && (
                <Ionicons name="checkmark" size={14} color={colors.surface} />
              )}
            </View>
            <Text
              style={
                currentStep >= 3 ? styles.stepLabelActive : styles.stepLabelInactive
              }
            >
              {l('Approval', 'অনুমোদন')}
            </Text>
          </View>

          {/* Step 4: বিতরণ */}
          <View style={styles.stepItem}>
            <View
              style={[
                styles.stepCircle,
                currentStep >= 4 ? styles.stepCircleCompleted : styles.stepCircleInactive,
              ]}
            >
              {currentStep >= 4 && (
                <Ionicons name="checkmark" size={14} color={colors.surface} />
              )}
            </View>
            <Text
              style={
                currentStep >= 4 ? styles.stepLabelActive : styles.stepLabelInactive
              }
            >
              {l('Disbursement', 'বিতরণ')}
            </Text>
          </View>
        </View>

        {/* Calculation Draft Card */}
        <View style={styles.calcCard}>
          <Text style={styles.calcCardTitle}>
            {l('Calculation (Draft)', 'হিসাব (খসড়া)')}
          </Text>

          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>
              {l('Total Project Profit', 'মোট প্রজেক্ট লাভ')}
            </Text>
            <Text style={styles.calcValueBold}>
              +{formatMoney(totalProjectProfit)}
            </Text>
          </View>

          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>{l('Other Income', 'অন্যান্য আয়')}</Text>
            <Text style={styles.calcValueBold}>+{formatMoney(otherIncome)}</Text>
          </View>

          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>
              {l('Operating Expense', 'পরিচালনা ব্যয়')}
            </Text>
            <Text style={styles.calcValueBold}>
              −{formatMoney(operatingExpense)}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.calcRow}>
            <Text style={styles.calcLabelTitle}>{l('Net Profit', 'নিট লাভ')}</Text>
            <Text style={styles.calcValueTitle}>{formatMoney(netProfit)}</Text>
          </View>

          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>
              {l('Reserve Fund (10%)', 'রিজার্ভ ফান্ড (১০%)')}
            </Text>
            <Text style={styles.calcValueBold}>−{formatMoney(reserveFund)}</Text>
          </View>

          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>
              {l('Director Share (10%)', 'পরিচালক অংশ (১০%)')}
            </Text>
            <Text style={styles.calcValueBold}>−{formatMoney(directorFund)}</Text>
          </View>

          {/* Distributable Highlight Box */}
          <View style={styles.distributableBox}>
            <Text style={styles.distributableLabel}>
              {l('Distributable Profit', 'বণ্টনযোগ্য লাভ')}
            </Text>
            <Text style={styles.distributableAmount}>
              {formatMoney(distributableProfit)}
            </Text>
          </View>
        </View>

        {/* Info Note Banner */}
        <View style={styles.infoBanner}>
          <Ionicons
            name="information-circle-outline"
            size={18}
            color={colors.textSecondary}
            style={styles.infoIcon}
          />
          <Text style={styles.infoText}>
            {l(
              'Shares are calculated from the member savings balances at the time of approval.',
              'রিজার্ভ ও পরিচালক শতাংশ পরিচালনা কমিটি নির্ধারণ করেছে এবং জানুয়ারি ২০২৬ থেকে লক করা।'
            )}
          </Text>
        </View>

        {/* Formula Card */}
        <View style={styles.formulaCard}>
          <Text style={styles.formulaTitle}>
            {l('Distribution Formula', 'বণ্টনের সূত্র')}
          </Text>
          <Text style={styles.formulaEquation}>
            {l(
              `Member Share = ${formatMoney(distributableProfit)} × Member Total Deposit ÷ ${formatMoney(totalMembersDeposit)}`,
              `সদস্যের অংশ = ${formatMoney(distributableProfit)} × সদস্যের মোট জমা ÷ ${formatMoney(totalMembersDeposit)}`
            )}
          </Text>
          <Text style={styles.formulaSubtitle}>
            {l(
              `Total members deposit ${formatMoney(totalMembersDeposit)}`,
              `সকল সদস্যের মোট জমা ${formatMoney(totalMembersDeposit)}`
            )}
          </Text>
        </View>

        {/* Member Share Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {l('Member-wise Allocation', 'সদস্যভিত্তিক অংশ')}
          </Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.allMembersLink}>
              {l(`All ${totalMemberCount} Members`, `সব ${isBengali ? toBengaliDigits(totalMemberCount) : totalMemberCount} জন`)}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Member List Card */}
        <View style={styles.membersCard}>
          {sampleMembers.map((item: any, index: number) => (
            <View
              key={item.id}
              style={[
                styles.memberRow,
                index < sampleMembers.length - 1 && styles.memberRowBorder,
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

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Sticky Bottom Actions Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.draftPdfBtn}
          onPress={handleDownloadDraft}
          activeOpacity={0.8}
        >
          <Ionicons name="download-outline" size={16} color={colors.text} />
          <Text style={styles.draftPdfText}>{l('Draft PDF', 'খসড়া PDF')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.approveBtn, isApproved && styles.approveBtnDone]}
          onPress={handleApprove} disabled={saving || isApproved || distributableProfit <= 0 || (REMOTE && !preview)}
          activeOpacity={0.85}
        >
          <Ionicons
            name="checkmark"
            size={16}
            color={isApproved ? colors.primary : colors.surface}
          />
          <Text style={[styles.approveBtnText, isApproved && styles.approveBtnTextDone]}>
            {isApproved
              ? l('Approved', 'অনুমোদিত')
              : l('Give Approval', 'অনুমোদন দিন')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
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
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xl,
    lineHeight: typography.lineHeight.xl,
    color: colors.text,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  stepperCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  stepItem: {
    alignItems: 'center',
    gap: 6,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleCompleted: {
    backgroundColor: colors.primary,
  },
  stepCircleActive: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  stepCircleInactive: {
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  stepLabelActive: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    color: colors.text,
  },
  stepLabelInactive: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    color: colors.textSecondary,
  },
  calcCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  calcCardTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.base,
    lineHeight: typography.lineHeight.base,
    color: colors.text,
    marginBottom: 12,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  calcLabel: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    color: colors.textSecondary,
  },
  calcLabelTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.text,
  },
  calcValueBold: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    color: colors.text,
  },
  calcValueTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.surfaceMuted,
    marginVertical: 8,
  },
  distributableBox: {
    backgroundColor: colors.primarySoft,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  distributableLabel: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.base,
    lineHeight: typography.lineHeight.base,
    color: colors.primary,
  },
  distributableAmount: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xl,
    lineHeight: typography.lineHeight.xl,
    color: colors.primary,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    padding: 12,
    gap: 8,
    marginBottom: 12,
  },
  infoIcon: {
    marginTop: 1,
  },
  infoText: {
    flex: 1,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.text,
  },
  formulaCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  formulaTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    color: colors.text,
    marginBottom: 6,
  },
  formulaEquation: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.text,
  },
  formulaSubtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    color: colors.textSecondary,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.text,
  },
  allMembersLink: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.primary,
  },
  membersCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 16,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  memberRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceMuted,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    color: colors.text,
  },
  memberDeposit: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  memberProfit: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    color: colors.primary,
  },
  bottomSpacer: {
    height: 100,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    paddingVertical: 12,
    gap: 6,
  },
  draftPdfText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    color: colors.text,
  },
  approveBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 24,
    paddingVertical: 12,
    gap: 6,
  },
  approveBtnDone: {
    backgroundColor: colors.primarySoft,
  },
  approveBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    color: colors.surface,
  },
  approveBtnTextDone: {
    color: colors.primary,
  },
});
