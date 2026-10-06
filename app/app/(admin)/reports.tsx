import React, { useState, useMemo } from 'react';
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
import { BENGALI_MONTHS_FULL, toBengaliDigits } from '../../src/lib/bengali';
import { useSomitiStore } from '../../src/store/somitiStore';
import { useLanguage } from '../../src/i18n/useLanguage';
import { safeBack } from '../../src/utils/navigation';
import { AppModal } from '../../src/components/AppModal';

interface ReportRow {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  sub: string;
}

export default function ReportsScreen() {
  const router = useRouter();
  const { l, formatMoney, formatNum } = useLanguage();
  const { somitiInfo, members, projects } = useSomitiStore();

  const [autoSummaryCommittee, setAutoSummaryCommittee] = useState(true);
  const [autoMemberBalance, setAutoMemberBalance] = useState(true);
  const [selectedReport, setSelectedReport] = useState<ReportRow | null>(null);

  const _now = new Date();
  const _last = new Date(_now.getFullYear(), _now.getMonth() + 1, 0).getDate();
  const periodEn = `1 – ${_last} ${_now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`;
  const periodBn = `১ – ${toBengaliDigits(_last)} ${BENGALI_MONTHS_FULL[_now.getMonth()]} ${toBengaliDigits(_now.getFullYear())}`;
  const dueMembers = useMemo(() => members.filter((m) => m.dueAmount > 0), [members]);

  const reportsData: ReportRow[] = [
    {
      id: '1',
      icon: 'document-text-outline',
      title: l('Monthly Collection Report', 'মাসিক আদায় রিপোর্ট'),
      sub: `${l('Collected', 'আদায়')} ${formatMoney(somitiInfo.monthlyCollected)} · ${l('Target', 'লক্ষ্য')} ${formatMoney(somitiInfo.monthlyTarget)}`,
    },
    {
      id: '2',
      icon: 'warning-outline',
      title: l('Due List Report', 'বকেয়া তালিকা'),
      sub: `${formatNum(dueMembers.length)} ${l('Members · Total Due', 'জন সদস্য · মোট বকেয়া')} ${formatMoney(dueMembers.reduce((a, m) => a + m.dueAmount, 0))}`,
    },
    {
      id: '3',
      icon: 'trending-up-outline',
      title: l('Income-Expense Report', 'আয়-ব্যয় রিপোর্ট'),
      sub: `${l('Income', 'আয়')} ${formatMoney(somitiInfo.monthlyIncome || 0)} · ${l('Expense', 'ব্যয়')} ${formatMoney(somitiInfo.monthlyExpense)}`,
    },
    {
      id: '4',
      icon: 'person-outline',
      title: l('Member Statement', 'সদস্য স্টেটমেন্ট'),
      sub: `${l('Ledger for all', 'সকল')} ${formatNum(members.length)} ${l('active members', 'জন সক্রিয় সদস্যের খতিয়ান')}`,
    },
    {
      id: '5',
      icon: 'briefcase-outline',
      title: l('Project Report', 'প্রজেক্ট রিপোর্ট'),
      sub: `${formatNum(projects.length)} ${l('Projects · Investment & Profit/Loss', 'টি প্রজেক্ট · বিনিয়োগ ও লাভ-ক্ষতি')}`,
    },
    {
      id: '6',
      icon: 'wallet-outline',
      title: l('Cash & Bank Book', 'নগদ ও ব্যাংক বই'),
      sub: `${l('Total Cash & Bank', 'হাতে ও ব্যাংকে মোট')} ${formatMoney(somitiInfo.cashAndBank)}`,
    },
    {
      id: '7',
      icon: 'people-outline',
      title: l('Field Officer Report', 'মাঠকর্মী রিপোর্ট'),
      sub: l('Field collection and deposit status', 'মাঠ থেকে আদায় ও জমার অবস্থা'),
    },
    {
      id: '8',
      icon: 'pie-chart-outline',
      title: l('Annual Distribution Report', 'বার্ষিক বণ্টন রিপোর্ট'),
      sub: l('Member-wise net profit-loss distribution', 'সদস্যভিত্তিক নিট লাভ-ক্ষতি বণ্টন'),
    },
  ];

  const handleDownload = (title: string, format: 'PDF' | 'Excel') => {
    Alert.alert(
      l('Report Ready', 'রিপোর্ট প্রস্তুত'),
      `${title} (${format}) ${l('is ready. You can share or download it.', 'ফরম্যাটে সফলভাবে প্রস্তুত হয়েছে। শেয়ার বা ডাউনলোড করা যাবে।')}`
    );
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
        <Text style={styles.headerTitle}>{l('Reports', 'রিপোর্ট')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Date Selector Pill */}
        <TouchableOpacity style={styles.datePill} activeOpacity={0.8}>
          <Ionicons name="calendar-outline" size={16} color="#1E293B" />
          <Text style={styles.datePillText}>{l(periodEn, periodBn)}</Text>
          <Ionicons name="chevron-down" size={16} color="#64748B" />
        </TouchableOpacity>

        {/* 8 Reports List */}
        <View style={styles.reportsList}>
          {reportsData.map((item) => (
            <View key={item.id} style={styles.reportCard}>
              <TouchableOpacity
                style={styles.reportInfoTouchable}
                onPress={() => setSelectedReport(item)}
                activeOpacity={0.7}
              >
                <View style={styles.reportIconBox}>
                  <Ionicons name={item.icon} size={20} color="#0F766E" />
                </View>

                <View style={styles.reportInfo}>
                  <Text style={styles.reportTitle}>{item.title}</Text>
                  <Text style={styles.reportSub}>{item.sub}</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.buttonsRow}>
                <TouchableOpacity
                  style={styles.formatBtn}
                  onPress={() => handleDownload(item.title, 'PDF')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.formatBtnText}>PDF</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.formatBtn}
                  onPress={() => handleDownload(item.title, 'Excel')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.formatBtnText}>Excel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Section: স্বয়ংক্রিয় রিপোর্ট */}
        <Text style={styles.sectionTitle}>{l('Automated Report Schedule', 'স্বয়ংক্রিয় রিপোর্ট শিডিউল')}</Text>
        <View style={styles.autoReportCard}>
          {/* Row 1 */}
          <View style={styles.autoRow}>
            <View style={styles.autoTextCol}>
              <Text style={styles.autoTitle}>{l('Monthly Summary to Committee', 'মাসিক সারসংক্ষেপ কমিটিকে')}</Text>
              <Text style={styles.autoSub}>{l('1st of every month via WhatsApp & Email', 'প্রতি মাসের ১ তারিখে হোয়াটসঅ্যাপ ও ইমেইলে')}</Text>
            </View>
            <Switch
              value={autoSummaryCommittee}
              onValueChange={setAutoSummaryCommittee}
              trackColor={{ false: '#CBD5E1', true: '#0F766E' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.autoDivider} />

          {/* Row 2 */}
          <View style={styles.autoRow}>
            <View style={styles.autoTextCol}>
              <Text style={styles.autoTitle}>{l('Member Monthly Balance', 'সদস্যদের মাসিক ব্যালেন্স')}</Text>
              <Text style={styles.autoSub}>{l('1st–5th of every month via SMS & Push notification', 'প্রতি মাসের ১–৫ তারিখে এসএমএস ও পুশ বিজ্ঞপ্তি')}</Text>
            </View>
            <Switch
              value={autoMemberBalance}
              onValueChange={setAutoMemberBalance}
              trackColor={{ false: '#CBD5E1', true: '#0F766E' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Full Data Export Excel Button */}
        <TouchableOpacity
          style={styles.exportAllBtn}
          onPress={() => handleDownload(l('Somiti Complete Ledger & Books', 'সমিতির সম্পূর্ণ খতিয়ান ও হিসাব বই'), 'Excel')}
          activeOpacity={0.8}
        >
          <Ionicons name="download-outline" size={18} color="#1E293B" />
          <Text style={styles.exportAllText}>{l('Full Data Backup & Export (Excel)', 'সম্পূর্ণ ডেটা ব্যাকআপ ও এক্সপোর্ট (Excel)')}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Report Preview Modal */}
      <AppModal
        visible={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        title={selectedReport?.title}
      >
        <View style={styles.previewModalBox}>
          <View style={styles.previewHeaderRow}>
            <View style={styles.previewIconBox}>
              {selectedReport && <Ionicons name={selectedReport.icon} size={24} color="#0F766E" />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.previewModalTitle}>{selectedReport?.title}</Text>
              <Text style={styles.previewModalSub}>{somitiInfo.name} · {somitiInfo.regNo}</Text>
            </View>
          </View>

          <View style={styles.previewDivider} />

          <View style={styles.previewMetaBox}>
            <Text style={styles.previewMetaTitle}>{l('Reporting Period:', 'প্রতিবেদন সময়কাল:')} {l(periodEn, periodBn)}</Text>
            <Text style={styles.previewMetaDesc}>{selectedReport?.sub}</Text>
          </View>

          <View style={styles.previewStatsGrid}>
            <View style={styles.previewStatItem}>
              <Text style={styles.previewStatLabel}>{l('Total Members', 'মোট সদস্য')}</Text>
              <Text style={styles.previewStatVal}>{formatNum(members.length)} {l('persons', 'জন')}</Text>
            </View>
            <View style={styles.previewStatItem}>
              <Text style={styles.previewStatLabel}>{l('Total Fund', 'মোট তহবিল')}</Text>
              <Text style={styles.previewStatVal}>{formatMoney(somitiInfo.totalFund)}</Text>
            </View>
          </View>

          <View style={styles.previewActionsRow}>
            <TouchableOpacity
              style={styles.previewDownloadBtn}
              onPress={() => {
                if (selectedReport) handleDownload(selectedReport.title, 'PDF');
                setSelectedReport(null);
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="document-text-outline" size={16} color="#FFFFFF" />
              <Text style={styles.previewDownloadBtnText}>PDF {l('Download', 'ডাউনলোড')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.previewExcelBtn}
              onPress={() => {
                if (selectedReport) handleDownload(selectedReport.title, 'Excel');
                setSelectedReport(null);
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="grid-outline" size={16} color="#0F766E" />
              <Text style={styles.previewExcelBtnText}>Excel {l('Export', 'এক্সপোর্ট')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </AppModal>
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
  datePill: {
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
  datePillText: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 13,
    color: '#1E293B',
  },
  reportsList: {
    gap: 10,
    marginBottom: 20,
  },
  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  reportIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E6F4F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reportInfo: {
    flex: 1,
  },
  reportTitle: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 14,
    color: '#1E293B',
  },
  reportSub: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  formatBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  formatBtnText: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 12,
    color: '#0F766E',
  },
  sectionTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 15,
    color: '#1E293B',
    marginBottom: 10,
    marginLeft: 4,
  },
  autoReportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  autoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  autoTextCol: {
    flex: 1,
    paddingRight: 10,
  },
  autoTitle: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 14,
    color: '#1E293B',
  },
  autoSub: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  autoDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  exportAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAEBE6',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    marginBottom: 10,
  },
  exportAllText: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 14,
    color: '#1E293B',
  },
  reportInfoTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewModalBox: {
    paddingVertical: 4,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  previewIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewModalTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 16,
    color: '#1E293B',
  },
  previewModalSub: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#64748B',
  },
  previewDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 12,
  },
  previewMetaBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  previewMetaTitle: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 13,
    color: '#0F766E',
    marginBottom: 2,
  },
  previewMetaDesc: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#64748B',
  },
  previewStatsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  previewStatItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  previewStatLabel: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
  },
  previewStatVal: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 15,
    color: '#1E293B',
  },
  previewActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  previewDownloadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F766E',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 6,
  },
  previewDownloadBtnText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  previewExcelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#0F766E',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 6,
  },
  previewExcelBtnText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 13,
    color: '#0F766E',
  },
});
