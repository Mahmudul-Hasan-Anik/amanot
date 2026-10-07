import React, { useState } from 'react';
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
import { useLanguage } from '../../src/i18n/useLanguage';
import { safeBack } from '../../src/utils/navigation';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';

export default function AnalyticsScreen() {
  const router = useRouter();
  const { l, isBengali } = useLanguage();
  const [period, setPeriod] = useState<'3m' | '6m' | '1y'>('6m');

  const collectionRates = [
    { monthEn: 'Apr', monthBn: 'এপ্রিল', pctEn: '92%', pctBn: '৯২%', value: 92, low: false },
    { monthEn: 'May', monthBn: 'মে', pctEn: '88%', pctBn: '৮৮%', value: 88, low: false },
    { monthEn: 'Jun', monthBn: 'জুন', pctEn: '95%', pctBn: '৯৫%', value: 95, low: false },
    { monthEn: 'Jul', monthBn: 'জুলাই', pctEn: '90%', pctBn: '৯০%', value: 90, low: false },
    { monthEn: 'Aug', monthBn: 'আগস্ট', pctEn: '84%', pctBn: '৮৪%', value: 84, low: false },
    { monthEn: 'Sep', monthBn: 'সেপ্টে', pctEn: '78%', pctBn: '৭৮%', value: 78, low: true },
  ];

  const fundGrowthSeries = [
    { monthEn: 'Apr', monthBn: 'এপ্রিল', valEn: '38.2L', valBn: '৩৮.২ল', value: 38.2 },
    { monthEn: 'May', monthBn: 'মে', valEn: '40.1L', valBn: '৪০.১ল', value: 40.1 },
    { monthEn: 'Jun', monthBn: 'জুন', valEn: '42.3L', valBn: '৪২.৩ল', value: 42.3 },
    { monthEn: 'Jul', monthBn: 'জুলাই', valEn: '44.0L', valBn: '৪৪.০ল', value: 44.0 },
    { monthEn: 'Aug', monthBn: 'আগস্ট', valEn: '46.4L', valBn: '৪৬.৪ল', value: 46.4 },
    { monthEn: 'Sep', monthBn: 'সেপ্টে', valEn: '48.5L', valBn: '৪৮.৫ল', value: 48.5 },
  ];

  const projectRois = [
    { nameEn: 'Poultry Farm', nameBn: 'পোল্ট্রি খামার', roiEn: '14%', roiBn: '১৪%', width: '100%', negative: false },
    { nameEn: 'Site A: Land', nameBn: 'সাইট এ: জমি', roiEn: '12%', roiBn: '১২%', width: '85%', negative: false },
    { nameEn: 'Shop Rent', nameBn: 'দোকান ভাড়া', roiEn: '6%', roiBn: '৬%', width: '45%', negative: false },
    { nameEn: 'Site B: Construction', nameBn: 'সাইট বি: নির্মাণ', roiEn: '-7%', roiBn: '-৭%', width: '50%', negative: true },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      {/* Screen Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => safeBack(router, '/(admin)/(tabs)')}
          style={styles.headerBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{l('Analytics', 'অ্যানালিটিক্স')}</Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => Alert.alert(l('Filter', 'ফিল্টার'), l('Analytics filter options', 'অ্যানালিটিক্স ফিল্টার অপশন'))}
          activeOpacity={0.7}
        >
          <Ionicons name="filter-outline" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Period Selector Tabs */}
        <View style={styles.periodSegmentTrack}>
          <TouchableOpacity
            style={[styles.periodBtn, period === '3m' && styles.periodBtnActive]}
            onPress={() => setPeriod('3m')}
            activeOpacity={0.8}
          >
            <Text style={[styles.periodBtnText, period === '3m' && styles.periodBtnTextActive]}>
              {l('3 Months', '৩ মাস')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.periodBtn, period === '6m' && styles.periodBtnActive]}
            onPress={() => setPeriod('6m')}
            activeOpacity={0.8}
          >
            <Text style={[styles.periodBtnText, period === '6m' && styles.periodBtnTextActive]}>
              {l('6 Months', '৬ মাস')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.periodBtn, period === '1y' && styles.periodBtnActive]}
            onPress={() => setPeriod('1y')}
            activeOpacity={0.8}
          >
            <Text style={[styles.periodBtnText, period === '1y' && styles.periodBtnTextActive]}>
              {l('1 Year', '১ বছর')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Smart Alerts Section */}
        <Text style={styles.sectionHeading}>{l('Smart Alerts', 'স্মার্ট সতর্কবার্তা')}</Text>

        {/* Alert 1: Idle Cash */}
        <View style={styles.idleAlertCard}>
          <Ionicons name="information-circle-outline" size={18} color={colors.text} style={styles.alertIcon} />
          <Text style={styles.idleAlertText}>
            <Text style={styles.boldSpan}>
              {l('Idle Cash: ৳9,30,000 ', 'অলস টাকা: ৳৯,৩০,০০০ ')}
            </Text>
            {l(
              'sitting in hand & bank for 45 days. Consider new investments.',
              'গত ৪৫ দিন ধরে হাতে ও ব্যাংকে পড়ে আছে। নতুন বিনিয়োগ বিবেচনা করুন।'
            )}
          </Text>
        </View>

        {/* Alert 2: Site B delayed */}
        <View style={styles.warningAlertCard}>
          <Ionicons name="warning-outline" size={18} color={colors.warning} style={styles.alertIcon} />
          <Text style={styles.warningAlertText}>
            <Text style={styles.boldSpan}>
              {l('Site B ', 'সাইট বি ')}
            </Text>
            {l(
              'project expected completion date passed, no return received yet.',
              'প্রজেক্টের সম্ভাব্য সমাপ্তির তারিখ পার হয়েছে, এখনো কোনো ফেরত আসেনি।'
            )}
          </Text>
        </View>

        {/* Alert 3: Collection Drop */}
        <View style={styles.warningAlertCard}>
          <Ionicons name="warning-outline" size={18} color={colors.warning} style={styles.alertIcon} />
          <Text style={styles.warningAlertText}>
            <Text style={styles.boldSpan}>
              {l('Collection Rate ', 'আদায়ের হার ')}
            </Text>
            {l(
              'is 78% this month, lower than 3-month average of 92%.',
              'এ মাসে ৭৮%, গত ৩ মাসের গড় ৯২% এর চেয়ে কম।'
            )}
          </Text>
        </View>

        {/* Monthly Collection Rate Chart Card */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>{l('Monthly Collection Rate', 'মাসিক আদায়ের হার')}</Text>
          <Text style={styles.chartSub}>
            {l('Percentage of members depositing on time', 'সময়মতো জমা দেওয়া সদস্যের শতাংশ')}
          </Text>

          <View style={styles.barChartContainer}>
            {collectionRates.map((item, idx) => {
              const barHeightPct = Math.round((item.value / 100) * 100);
              return (
                <View key={idx} style={styles.barCol}>
                  <Text style={styles.barTopLabel}>
                    {isBengali ? item.pctBn : item.pctEn}
                  </Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barPill,
                        {
                          height: `${barHeightPct}%`,
                          backgroundColor: item.low ? colors.warning : colors.primary,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.barBottomLabel}>
                    {isBengali ? item.monthBn : item.monthEn}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Fund Growth Chart Card */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>{l('Fund Growth', 'তহবিলের বৃদ্ধি')}</Text>
          <Text style={styles.chartSub}>
            {l('Total fund in Lakh BDT · +27% in 6 months', 'মোট তহবিল, লাখ টাকায় · ৬ মাসে +২৭%')}
          </Text>

          <View style={styles.barChartContainer}>
            {fundGrowthSeries.map((item, idx) => {
              const maxVal = 50;
              const barHeightPct = Math.round((item.value / maxVal) * 100);
              return (
                <View key={idx} style={styles.barCol}>
                  <Text style={styles.barTopLabel}>
                    {isBengali ? item.valBn : item.valEn}
                  </Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barPill,
                        {
                          height: `${barHeightPct}%`,
                          backgroundColor: colors.primary,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.barBottomLabel}>
                    {isBengali ? item.monthBn : item.monthEn}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Member Deposit Habits Card */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>{l('Member Deposit Habits', 'সদস্যদের জমার অভ্যাস')}</Text>

          {/* Segmented Progress Bar */}
          <View style={styles.habitsSegmentBar}>
            <View style={[styles.habitsSegment, { flex: 72, backgroundColor: colors.primary }]} />
            <View style={[styles.habitsSegment, { flex: 20, backgroundColor: colors.aging.month1 }]} />
            <View style={[styles.habitsSegment, { flex: 8, backgroundColor: colors.warning }]} />
          </View>

          {/* 3 Columns Stats */}
          <View style={styles.habitsStatsRow}>
            <View style={styles.habitCol}>
              <Text style={styles.habitLabel}>{l('Regular', 'নিয়মিত')}</Text>
              <Text style={[styles.habitValue, { color: colors.primary }]}>
                {l('72 Members', '৭২ জন')}
              </Text>
            </View>

            <View style={styles.habitCol}>
              <Text style={styles.habitLabel}>{l('Occasional Delay', 'মাঝে মাঝে দেরি')}</Text>
              <Text style={[styles.habitValue, { color: colors.text }]}>
                {l('20 Members', '২০ জন')}
              </Text>
            </View>

            <View style={styles.habitCol}>
              <Text style={styles.habitLabel}>{l('Frequent Delay', 'প্রায়ই দেরি')}</Text>
              <Text style={[styles.habitValue, { color: colors.warning }]}>
                {l('8 Members', '৮ জন')}
              </Text>
            </View>
          </View>
        </View>

        {/* Project ROI Card */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>{l('Project ROI', 'প্রজেক্টভিত্তিক ROI')}</Text>

          <View style={styles.roiList}>
            {projectRois.map((proj, idx) => (
              <View key={idx} style={styles.roiItem}>
                <View style={styles.roiItemHeader}>
                  <Text style={styles.roiItemName}>
                    {isBengali ? proj.nameBn : proj.nameEn}
                  </Text>
                  <Text style={[styles.roiItemVal, proj.negative && { color: colors.warning }]}>
                    {isBengali ? proj.roiBn : proj.roiEn}
                  </Text>
                </View>
                <View style={styles.roiTrack}>
                  <View
                    style={[
                      styles.roiFill,
                      {
                        width: proj.width as any,
                        backgroundColor: proj.negative ? colors.warning : colors.primary,
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Bottom 2 Metrics Grid */}
        <View style={styles.twoMetricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>{l('Operating Expense Ratio', 'পরিচালনা ব্যয়ের হার')}</Text>
            <Text style={styles.metricValue}>{l('7%', '৭%')}</Text>
            <Text style={styles.metricSub}>{l('Compared to total income', 'মোট আয়ের তুলনায়')}</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>{l('Profit per ৳1,000 Deposit', 'প্রতি ৳১,০০০ জমায় লাভ')}</Text>
            <Text style={styles.metricValue}>{l('৳54', '৳৫৪')}</Text>
            <Text style={styles.metricSub}>{l('This year, estimated', 'এ বছর, আনুমানিক')}</Text>
          </View>
        </View>

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
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.title,
    color: colors.text,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 28,
  },
  periodSegmentTrack: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  periodBtnActive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  periodBtnText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  periodBtnTextActive: {
    fontFamily: typography.fontFamily.bold,
    color: colors.text,
  },
  sectionHeading: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.title,
    color: colors.text,
    marginBottom: 12,
  },
  idleAlertCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  warningAlertCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.warningSoft,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.aging.month1,
    gap: 8,
  },
  alertIcon: {
    marginTop: 2,
    flexShrink: 0,
  },
  idleAlertText: {
    flex: 1,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.text,
  },
  warningAlertText: {
    flex: 1,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.warning,
  },
  boldSpan: {
    fontFamily: typography.fontFamily.bold,
  },
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chartTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.base,
    color: colors.text,
    marginBottom: 2,
  },
  chartSub: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  barChartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 140,
    paddingTop: 10,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTopLabel: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xs,
    color: colors.text,
    marginBottom: 6,
  },
  barTrack: {
    width: 28,
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  barPill: {
    width: '100%',
    borderRadius: 4,
  },
  barBottomLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.caption,
    color: colors.textSecondary,
    marginTop: 8,
  },
  habitsSegmentBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
    marginBottom: 14,
    gap: 2,
  },
  habitsSegment: {
    height: '100%',
    borderRadius: 3,
  },
  habitsStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  habitCol: {
    flex: 1,
  },
  habitLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.caption,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  habitValue: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.subhead,
  },
  roiList: {
    gap: 12,
  },
  roiItem: {
    gap: 4,
  },
  roiItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roiItemName: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  roiItemVal: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.sm,
    color: colors.primary,
  },
  roiTrack: {
    height: 8,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 4,
    overflow: 'hidden',
  },
  roiFill: {
    height: '100%',
    borderRadius: 4,
  },
  twoMetricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.caption,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  metricValue: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xl,
    color: colors.primary,
    marginBottom: 4,
  },
  metricSub: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  bottomSpacer: {
    height: 20,
  },
});
