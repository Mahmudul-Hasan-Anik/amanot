import React, { useState } from 'react';
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
import { useLanguage } from '../../src/i18n/useLanguage';
import { safeBack } from '../../src/utils/navigation';

export default function AnalyticsScreen() {
  const router = useRouter();
  const { l, formatMoney, formatNum } = useLanguage();
  const [period, setPeriod] = useState<'3m' | '6m' | '1y'>('6m');

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
        <Text style={styles.headerTitle}>{l('Analytics', 'অ্যানালিটিক্স')}</Text>
        <TouchableOpacity style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="filter-outline" size={20} color="#1E293B" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Period Selector Tabs */}
        <View style={styles.periodTabs}>
          <TouchableOpacity
            style={[styles.periodTab, period === '3m' && styles.periodTabActive]}
            onPress={() => setPeriod('3m')}
            activeOpacity={0.8}
          >
            <Text style={[styles.periodText, period === '3m' && styles.periodTextActive]}>
              {l('3 Months', '৩ মাস')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.periodTab, period === '6m' && styles.periodTabActive]}
            onPress={() => setPeriod('6m')}
            activeOpacity={0.8}
          >
            <Text style={[styles.periodText, period === '6m' && styles.periodTextActive]}>
              {l('6 Months', '৬ মাস')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.periodTab, period === '1y' && styles.periodTabActive]}
            onPress={() => setPeriod('1y')}
            activeOpacity={0.8}
          >
            <Text style={[styles.periodText, period === '1y' && styles.periodTextActive]}>
              {l('1 Year', '১ বছর')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Section: স্মার্ট সতর্কবার্তা */}
        <Text style={styles.sectionTitle}>{l('Smart Alerts', 'স্মার্ট সতর্কবার্তা')}</Text>

        {/* Alert 1 */}
        <View style={styles.idleCashAlert}>
          <Ionicons name="information-circle-outline" size={18} color="#1E293B" style={styles.alertIcon} />
          <Text style={styles.alertText}>
            <Text style={{ fontFamily: 'HindSiliguri-Bold' }}>{l('Idle Cash: ', 'অলস টাকা: ')}</Text>
            {formatMoney(930000)} {l('has been idle in hand & bank for 45 days. Consider new investments.', 'গত ৪৫ দিন ধরে হাতে ও ব্যাংকে পড়ে আছে। নতুন বিনিয়োগ বিবেচনা করুন।')}
          </Text>
        </View>

        {/* Alert 2 */}
        <View style={styles.warningAlert}>
          <Ionicons name="warning-outline" size={18} color="#C2410C" style={styles.alertIcon} />
          <Text style={[styles.alertText, { color: '#9A3412' }]}>
            {l('Site B Project expected completion date passed, no returns yet.', 'সাইট বি প্রজেক্টের সম্ভাব্য সমাপ্তির তারিখ পার হয়েছে, এখনো কোনো ফেরত আসেনি।')}
          </Text>
        </View>

        {/* Alert 3 */}
        <View style={styles.warningAlert}>
          <Ionicons name="warning-outline" size={18} color="#C2410C" style={styles.alertIcon} />
          <Text style={[styles.alertText, { color: '#9A3412' }]}>
            {l('Collection rate is 78% this month, lower than 3-month average of 92%.', 'আদায়ের হার এ মাসে ৭৮%, গত ৩ মাসের গড় ৯২% এর চেয়ে কম।')}
          </Text>
        </View>

        {/* Card: মাসিক আদায়ের হার */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>{l('Monthly Collection Rate', 'মাসিক আদায়ের হার')}</Text>
          <Text style={styles.chartSub}>{l('Percentage of members paying on time', 'সময়মতো জমা দেওয়া সদস্যের শতাংশ')}</Text>

          <View style={styles.verticalBarsContainer}>
            {/* বার ১: এপ্রিল */}
            <View style={styles.barCol}>
              <Text style={styles.barValueText}>92%</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { height: '92%', backgroundColor: '#0F766E' }]} />
              </View>
              <Text style={styles.barLabelText}>{l('Apr', 'এপ্রিল')}</Text>
            </View>

            {/* বার ২: মে */}
            <View style={styles.barCol}>
              <Text style={styles.barValueText}>88%</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { height: '88%', backgroundColor: '#0F766E' }]} />
              </View>
              <Text style={styles.barLabelText}>{l('May', 'মে')}</Text>
            </View>

            {/* বার ৩: জুন */}
            <View style={styles.barCol}>
              <Text style={styles.barValueText}>95%</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { height: '95%', backgroundColor: '#0F766E' }]} />
              </View>
              <Text style={styles.barLabelText}>{l('Jun', 'জুন')}</Text>
            </View>

            {/* বার ৪: জুলাই */}
            <View style={styles.barCol}>
              <Text style={styles.barValueText}>90%</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { height: '90%', backgroundColor: '#0F766E' }]} />
              </View>
              <Text style={styles.barLabelText}>{l('Jul', 'জুলাই')}</Text>
            </View>

            {/* বার ৫: আগস্ট */}
            <View style={styles.barCol}>
              <Text style={styles.barValueText}>84%</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { height: '84%', backgroundColor: '#0F766E' }]} />
              </View>
              <Text style={styles.barLabelText}>{l('Aug', 'আগস্ট')}</Text>
            </View>

            {/* বার ৬: সেপ্টে */}
            <View style={styles.barCol}>
              <Text style={[styles.barValueText, { color: '#C2410C' }]}>78%</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { height: '78%', backgroundColor: '#C2410C' }]} />
              </View>
              <Text style={[styles.barLabelText, { color: '#C2410C', fontFamily: 'HindSiliguri-Bold' }]}>{l('Sep', 'সেপ্টে')}</Text>
            </View>
          </View>
        </View>

        {/* Card: তহবিলের বৃদ্ধি */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>{l('Fund Growth', 'তহবিলের বৃদ্ধি')}</Text>
          <Text style={styles.chartSub}>{l('Total fund in Lakhs · +27% in 6 months', 'মোট তহবিল, লাখ টাকায় · ৬ মাসে +২৭%')}</Text>

          <View style={styles.verticalBarsContainer}>
            {/* এপ্রিল */}
            <View style={styles.barCol}>
              <Text style={styles.barValueText}>{l('38.2L', '৩৮.২ল')}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { height: '70%', backgroundColor: '#0F766E' }]} />
              </View>
              <Text style={styles.barLabelText}>{l('Apr', 'এপ্রিল')}</Text>
            </View>

            {/* মে */}
            <View style={styles.barCol}>
              <Text style={styles.barValueText}>{l('40.1L', '৪০.১ল')}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { height: '75%', backgroundColor: '#0F766E' }]} />
              </View>
              <Text style={styles.barLabelText}>{l('May', 'মে')}</Text>
            </View>

            {/* জুন */}
            <View style={styles.barCol}>
              <Text style={styles.barValueText}>{l('42.3L', '৪২.৩ল')}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { height: '80%', backgroundColor: '#0F766E' }]} />
              </View>
              <Text style={styles.barLabelText}>{l('Jun', 'জুন')}</Text>
            </View>

            {/* জুলাই */}
            <View style={styles.barCol}>
              <Text style={styles.barValueText}>{l('44.0L', '৪৪.০ল')}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { height: '85%', backgroundColor: '#0F766E' }]} />
              </View>
              <Text style={styles.barLabelText}>{l('Jul', 'জুলাই')}</Text>
            </View>

            {/* আগস্ট */}
            <View style={styles.barCol}>
              <Text style={styles.barValueText}>{l('46.4L', '৪৬.৪ল')}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { height: '90%', backgroundColor: '#0F766E' }]} />
              </View>
              <Text style={styles.barLabelText}>{l('Aug', 'আগস্ট')}</Text>
            </View>

            {/* সেপ্টে */}
            <View style={styles.barCol}>
              <Text style={styles.barValueText}>{l('48.5L', '৪৮.৫ল')}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { height: '96%', backgroundColor: '#0F766E' }]} />
              </View>
              <Text style={styles.barLabelText}>{l('Sep', 'সেপ্টে')}</Text>
            </View>
          </View>
        </View>

        {/* Card: সদস্যদের জমার অভ্যাস */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>{l('Members Deposit Habit', 'সদস্যদের জমার অভ্যাস')}</Text>

          <View style={styles.habitBar}>
            <View style={[styles.habitSegment, { flex: 72, backgroundColor: '#0F766E' }]} />
            <View style={[styles.habitSegment, { flex: 20, backgroundColor: '#EA580C' }]} />
            <View style={[styles.habitSegment, { flex: 8, backgroundColor: '#7C2D12' }]} />
          </View>

          <View style={styles.habitColsRow}>
            <View style={styles.habitCol}>
              <Text style={styles.habitColLabel}>{l('Regular', 'নিয়মিত')}</Text>
              <Text style={styles.habitColValDark}>{formatNum(72)} {l('Members', 'জন')}</Text>
            </View>

            <View style={styles.habitCol}>
              <Text style={styles.habitColLabel}>{l('Occasional Delay', 'মাঝে মাঝে দেরি')}</Text>
              <Text style={styles.habitColValOrange}>{formatNum(20)} {l('Members', 'জন')}</Text>
            </View>

            <View style={styles.habitCol}>
              <Text style={styles.habitColLabel}>{l('Chronic Delay', 'প্রায়ই দেরি')}</Text>
              <Text style={styles.habitColValRust}>{formatNum(8)} {l('Members', 'জন')}</Text>
            </View>
          </View>
        </View>

        {/* Card: প্রজেক্টভিত্তিক ROI */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>{l('Project-wise ROI', 'প্রজেক্টভিত্তিক ROI')}</Text>

          <View style={styles.roiList}>
            {/* 1 */}
            <View style={styles.roiItem}>
              <View style={styles.roiHeader}>
                <Text style={styles.roiName}>{l('Poultry Farm', 'পোল্ট্রি খামার')}</Text>
                <Text style={styles.roiVal}>14%</Text>
              </View>
              <View style={styles.roiTrack}>
                <View style={[styles.roiFill, { width: '85%', backgroundColor: '#0F766E' }]} />
              </View>
            </View>

            {/* 2 */}
            <View style={styles.roiItem}>
              <View style={styles.roiHeader}>
                <Text style={styles.roiName}>{l('Site A: Land', 'সাইট এ: জমি')}</Text>
                <Text style={styles.roiVal}>12%</Text>
              </View>
              <View style={styles.roiTrack}>
                <View style={[styles.roiFill, { width: '70%', backgroundColor: '#0F766E' }]} />
              </View>
            </View>

            {/* 3 */}
            <View style={styles.roiItem}>
              <View style={styles.roiHeader}>
                <Text style={styles.roiName}>{l('Shop Rent', 'দোকান ভাড়া')}</Text>
                <Text style={styles.roiVal}>6%</Text>
              </View>
              <View style={styles.roiTrack}>
                <View style={[styles.roiFill, { width: '38%', backgroundColor: '#0F766E' }]} />
              </View>
            </View>

            {/* 4 */}
            <View style={styles.roiItem}>
              <View style={styles.roiHeader}>
                <Text style={styles.roiName}>{l('Site B: Construction', 'সাইট বি: নির্মাণ')}</Text>
                <Text style={[styles.roiVal, { color: '#C2410C' }]}>−7%</Text>
              </View>
              <View style={styles.roiTrack}>
                <View style={[styles.roiFill, { width: '42%', backgroundColor: '#C2410C' }]} />
              </View>
            </View>
          </View>
        </View>

        {/* Bottom 2 Ratio Cards Row */}
        <View style={styles.twoRatiosRow}>
          <View style={styles.ratioCard}>
            <Text style={styles.ratioLabel}>{l('Operating Expense Ratio', 'পরিচালনা ব্যয়ের হার')}</Text>
            <Text style={styles.ratioVal}>7%</Text>
            <Text style={styles.ratioSub}>{l('Relative to total income', 'মোট আয়ের তুলনায়')}</Text>
          </View>

          <View style={styles.ratioCard}>
            <Text style={styles.ratioLabel}>{l('Profit per ৳1,000 Deposit', 'প্রতি ৳১,০০০ জমায় লাভ')}</Text>
            <Text style={styles.ratioVal}>{formatMoney(54)}</Text>
            <Text style={styles.ratioSub}>{l('This year, estimated', 'এ বছর, আনুমানিক')}</Text>
          </View>
        </View>

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
  periodTabs: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 24,
    padding: 4,
    marginBottom: 16,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 20,
  },
  periodTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  periodText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 13,
    color: '#64748B',
  },
  periodTextActive: {
    fontFamily: 'HindSiliguri-Bold',
    color: '#1E293B',
  },
  sectionTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 15,
    color: '#1E293B',
    marginBottom: 10,
  },
  idleCashAlert: {
    flexDirection: 'row',
    backgroundColor: '#E8ECE6',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 10,
  },
  warningAlert: {
    flexDirection: 'row',
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 10,
  },
  alertIcon: {
    marginTop: 2,
  },
  alertText: {
    flex: 1,
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
  },
  chartCard: {
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
  chartTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 15,
    color: '#1E293B',
  },
  chartSub: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 14,
  },
  verticalBarsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    paddingTop: 10,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  barValueText: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 11,
    color: '#1E293B',
  },
  barTrack: {
    width: 22,
    height: 80,
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: 4,
  },
  barLabelText: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: '#64748B',
  },
  habitBar: {
    height: 10,
    borderRadius: 5,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 12,
  },
  habitSegment: {
    height: '100%',
  },
  habitColsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  habitCol: {
    flex: 1,
    alignItems: 'flex-start',
  },
  habitColLabel: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: '#64748B',
  },
  habitColValDark: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#0F766E',
    marginTop: 2,
  },
  habitColValOrange: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#EA580C',
    marginTop: 2,
  },
  habitColValRust: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#7C2D12',
    marginTop: 2,
  },
  roiList: {
    gap: 12,
    marginTop: 4,
  },
  roiItem: {
    gap: 4,
  },
  roiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  roiName: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 13,
    color: '#1E293B',
  },
  roiVal: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 13,
    color: '#0F766E',
  },
  roiTrack: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  roiFill: {
    height: '100%',
  },
  twoRatiosRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  ratioCard: {
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
  ratioLabel: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#64748B',
  },
  ratioVal: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 24,
    color: '#1E293B',
    marginVertical: 2,
  },
  ratioSub: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: '#64748B',
  },
});
