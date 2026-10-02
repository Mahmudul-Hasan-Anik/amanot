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
import { useSomitiStore } from '../../src/store/somitiStore';
import { formatBengaliMoney, toBengaliDigits } from '../../src/lib/money';

interface ReportRow {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  sub: string;
}

export default function ReportsScreen() {
  const router = useRouter();
  const { somitiInfo, members, projects } = useSomitiStore();

  const [autoSummaryCommittee, setAutoSummaryCommittee] = useState(true);
  const [autoMemberBalance, setAutoMemberBalance] = useState(true);

  const dueMembers = useMemo(() => members.filter((m) => m.dueAmount > 0), [members]);

  const reportsData: ReportRow[] = [
    {
      id: '1',
      icon: 'document-text-outline',
      title: 'মাসিক আদায় রিপোর্ট',
      sub: `আদায় ৳${formatBengaliMoney(somitiInfo.monthlyCollected)} · লক্ষ্য ৳${formatBengaliMoney(somitiInfo.monthlyTarget)}`,
    },
    {
      id: '2',
      icon: 'warning-outline',
      title: 'বকেয়া তালিকা',
      sub: `${toBengaliDigits(dueMembers.length)} জন সদস্য · মোট বকেয়া ৳${formatBengaliMoney(somitiInfo.totalDueAmount)}`,
    },
    {
      id: '3',
      icon: 'trending-up-outline',
      title: 'আয়-ব্যয় রিপোর্ট',
      sub: `আয় ৳${formatBengaliMoney(somitiInfo.monthlyCollected)} · ব্যয় ৳${formatBengaliMoney(somitiInfo.monthlyExpense)}`,
    },
    {
      id: '4',
      icon: 'person-outline',
      title: 'সদস্য স্টেটমেন্ট',
      sub: `সকল ${toBengaliDigits(members.length)} জন সক্রিয় সদস্যের খতিয়ান`,
    },
    {
      id: '5',
      icon: 'briefcase-outline',
      title: 'প্রজেক্ট রিপোর্ট',
      sub: `${toBengaliDigits(projects.length)}টি প্রজেক্ট · বিনিয়োগ ও লাভ-ক্ষতি`,
    },
    {
      id: '6',
      icon: 'wallet-outline',
      title: 'নগদ ও ব্যাংক বই',
      sub: `হাতে ও ব্যাংকে মোট ৳${formatBengaliMoney(somitiInfo.cashAndBank)}`,
    },
    {
      id: '7',
      icon: 'people-outline',
      title: 'মাঠকর্মী রিপোর্ট',
      sub: 'মাঠ থেকে আদায় ও জমার অবস্থা',
    },
    {
      id: '8',
      icon: 'pie-chart-outline',
      title: 'বার্ষিক বণ্টন রিপোর্ট',
      sub: 'সদস্যভিত্তিক নিট লাভ-ক্ষতি বণ্টন',
    },
  ];

  const handleDownload = (title: string, format: 'PDF' | 'Excel') => {
    Alert.alert(
      'রিপোর্ট প্রস্তুত',
      `${title} (${format} ফরম্যাটে) সফলভাবে প্রস্তুত হয়েছে। শেয়ার বা ডাউনলোড করা যাবে।`
    );
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
        <Text style={styles.headerTitle}>রিপোর্ট</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Date Selector Pill */}
        <TouchableOpacity style={styles.datePill} activeOpacity={0.8}>
          <Ionicons name="calendar-outline" size={16} color="#1E293B" />
          <Text style={styles.datePillText}>১ – ৩১ অক্টোবর ২০২৬</Text>
          <Ionicons name="chevron-down" size={16} color="#64748B" />
        </TouchableOpacity>

        {/* 8 Reports List */}
        <View style={styles.reportsList}>
          {reportsData.map((item) => (
            <View key={item.id} style={styles.reportCard}>
              <View style={styles.reportIconBox}>
                <Ionicons name={item.icon} size={20} color="#0F766E" />
              </View>

              <View style={styles.reportInfo}>
                <Text style={styles.reportTitle}>{item.title}</Text>
                <Text style={styles.reportSub}>{item.sub}</Text>
              </View>

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
        <Text style={styles.sectionTitle}>স্বয়ংক্রিয় রিপোর্ট শিডিউল</Text>
        <View style={styles.autoReportCard}>
          {/* Row 1 */}
          <View style={styles.autoRow}>
            <View style={styles.autoTextCol}>
              <Text style={styles.autoTitle}>মাসিক সারসংক্ষেপ কমিটিকে</Text>
              <Text style={styles.autoSub}>প্রতি মাসের ১ তারিখে হোয়াটসঅ্যাপ ও ইমেইলে</Text>
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
              <Text style={styles.autoTitle}>সদস্যদের মাসিক ব্যালেন্স</Text>
              <Text style={styles.autoSub}>প্রতি মাসের ১–৫ তারিখে এসএমএস ও পুশ বিজ্ঞপ্তি</Text>
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
          onPress={() => handleDownload('সমিতির সম্পূর্ণ খতিয়ান ও হিসাব বই', 'Excel')}
          activeOpacity={0.8}
        >
          <Ionicons name="download-outline" size={18} color="#1E293B" />
          <Text style={styles.exportAllText}>সম্পূর্ণ ডেটা ব্যাকআপ ও এক্সপোর্ট (Excel)</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
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
});
