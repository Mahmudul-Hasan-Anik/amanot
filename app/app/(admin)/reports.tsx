import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../src/i18n/useLanguage';
import { useSomitiStore } from '../../src/store/somitiStore';
import { buildReport, exportReport } from '../../src/utils/reportExport';
import { recentMonths } from '../../src/lib/months';
import { safeBack } from '../../src/utils/navigation';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';

interface ReportItem {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  titleBn: string;
  titleEn: string;
  subBn: string;
  subEn: string;
}

const REPORTS_LIST: ReportItem[] = [
  {
    id: '1',
    icon: 'document-text-outline',
    titleBn: 'মাসিক আদায় রিপোর্ট',
    titleEn: 'Monthly Collection Report',
    subBn: 'কে কত জমা দিয়েছেন, কে দেননি',
    subEn: 'Who deposited and who did not',
  },
  {
    id: '2',
    icon: 'warning-outline',
    titleBn: 'বকেয়া তালিকা',
    titleEn: 'Overdue List',
    subBn: 'সদস্য, মাস, টাকা ও ফোন নম্বর',
    subEn: 'Members, months, amount & phone',
  },
  {
    id: '3',
    icon: 'trending-up-outline',
    titleBn: 'আয়-ব্যয় রিপোর্ট',
    titleEn: 'Income-Expense Report',
    subBn: 'খাতভিত্তিক আয় ও ব্যয়',
    subEn: 'Category-wise income & expenses',
  },
  {
    id: '4',
    icon: 'person-outline',
    titleBn: 'সদস্য স্টেটমেন্ট',
    titleEn: 'Member Statement',
    subBn: 'একজন বা সকল সদস্যের',
    subEn: 'Individual or all members',
  },
  {
    id: '5',
    icon: 'briefcase-outline',
    titleBn: 'প্রজেক্ট রিপোর্ট',
    titleEn: 'Project Report',
    subBn: 'বিনিয়োগ, ফেরত, লাভ-ক্ষতি',
    subEn: 'Investment, return, profit-loss',
  },
  {
    id: '6',
    icon: 'wallet-outline',
    titleBn: 'নগদ ও ব্যাংক বই',
    titleEn: 'Cash & Bank Book',
    subBn: 'হিসাবভিত্তিক জমা-খরচ',
    subEn: 'Account-wise transactions',
  },
  {
    id: '7',
    icon: 'people-outline',
    titleBn: 'মাঠকর্মী রিপোর্ট',
    titleEn: 'Field Officer Report',
    subBn: 'আদায় ও নগদ জমার অবস্থা',
    subEn: 'Collection & cash deposit status',
  },
  {
    id: '8',
    icon: 'pie-chart-outline',
    titleBn: 'বার্ষিক বণ্টন রিপোর্ট',
    titleEn: 'Annual Distribution Report',
    subBn: 'সদস্যভিত্তিক লাভ-ক্ষতি',
    subEn: 'Member-wise profit & loss',
  },
];

export default function ReportsScreen() {
  const router = useRouter();
  const { l, isBengali } = useLanguage();

  const state = useSomitiStore();
  const periods = recentMonths(12);
  const [month,setMonth] = useState(periods[0].key);
  const selectedPeriod = periods.find(p=>p.key===month)!;
  const [exporting,setExporting] = useState(false);
  const handleDownload = async (id:string,format:'PDF'|'CSV') => {
    if(exporting) return;
    setExporting(true);
    try { await exportReport(buildReport(state,id,month),state.somitiInfo.name,month,format); }
    catch(e:any) { Alert.alert(l('Export failed','এক্সপোর্ট ব্যর্থ'),e.message); }
    finally {setExporting(false);}
  };
  const handleExportAll = async () => {
    await handleDownload('4','CSV');
  };
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => safeBack(router, '/(admin)/(tabs)')}
          style={styles.headerBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{l('Reports', 'রিপোর্ট')}</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Date Selector Pill */}
        <TouchableOpacity
          style={styles.dateSelectorPill}
          onPress={() => Alert.alert(l('Select month','মাস নির্বাচন'),'',periods.map(p=>({text:isBengali?p.bn:p.en,onPress:()=>setMonth(p.key)})))}
          activeOpacity={0.8}
        >
          <Ionicons name="calendar-outline" size={16} color={colors.text} style={styles.calIcon} />
          <Text style={styles.dateSelectorText}>
            {isBengali ? selectedPeriod.bn : selectedPeriod.en}
          </Text>
          <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* 8 Reports Single Card */}
        <View style={styles.reportsCard}>
          {REPORTS_LIST.map((item, index) => {
            const isLast = index === REPORTS_LIST.length - 1;
            const title = isBengali ? item.titleBn : item.titleEn;
            const sub = isBengali ? item.subBn : item.subEn;

            return (
              <View
                key={item.id}
                style={[styles.reportRow, !isLast && styles.reportRowBorder]}
              >
                {/* Left Icon */}
                <View style={styles.reportIconBox}>
                  <Ionicons name={item.icon} size={18} color={colors.primary} />
                </View>

                {/* Middle Info */}
                <View style={styles.reportInfo}>
                  <Text style={styles.reportTitle} numberOfLines={1}>
                    {title}
                  </Text>
                  <Text style={styles.reportSub} numberOfLines={1}>
                    {sub}
                  </Text>
                </View>

                {/* Right Action Pills */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={styles.pdfPill}
                    onPress={() => handleDownload(item.id, 'PDF')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.pdfPillText}>PDF</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.excelPill}
                    onPress={() => handleDownload(item.id, 'CSV')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.excelPillText}>CSV</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        {/* Export member balances */}
        <TouchableOpacity
          style={styles.exportAllButton}
          onPress={handleExportAll}
          activeOpacity={0.85}
        >
          <Ionicons name="arrow-down-outline" size={18} color={colors.text} style={styles.downloadIcon} />
          <Text style={styles.exportAllButtonText}>
            {l('Export Member Balances (CSV)', 'সদস্যদের ব্যালেন্স এক্সপোর্ট (CSV)')}
          </Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.title,
    color: colors.text,
  },
  headerRightSpacer: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 28,
  },
  dateSelectorPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginBottom: 16,
  },
  calIcon: {
    marginRight: 6,
  },
  dateSelectorText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.sm,
    color: colors.text,
    marginRight: 6,
  },
  reportsCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 20,
  },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  reportRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceMuted,
  },
  reportIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  reportInfo: {
    flex: 1,
    marginRight: 8,
  },
  reportTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.subhead,
    color: colors.text,
    marginBottom: 2,
  },
  reportSub: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  pdfPill: {
    backgroundColor: colors.primarySoft,
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfPillText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xs,
    color: colors.primary,
  },
  excelPill: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  excelPillText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xs,
    color: colors.text,
  },
  sectionHeading: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.title,
    color: colors.text,
    marginBottom: 12,
  },
  automatedCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 20,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleInfo: {
    flex: 1,
    marginRight: 12,
  },
  toggleTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.subhead,
    color: colors.text,
    marginBottom: 2,
  },
  toggleSub: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    color: colors.textSecondary,
  },
  toggleDivider: {
    height: 1,
    backgroundColor: colors.surfaceMuted,
    marginVertical: 14,
  },
  exportAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 25,
    height: 50,
  },
  downloadIcon: {
    marginRight: 6,
  },
  exportAllButtonText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.subhead,
    color: colors.text,
  },
  bottomSpacer: {
    height: 20,
  },
});
