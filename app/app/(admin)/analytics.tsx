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

export default function AnalyticsScreen() {
  const router = useRouter();
  const [period, setPeriod] = useState<'3m' | '6m' | '1y'>('6m');

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
        <Text style={styles.headerTitle}>অ্যানালিটিক্স</Text>
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
              ৩ মাস
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.periodTab, period === '6m' && styles.periodTabActive]}
            onPress={() => setPeriod('6m')}
            activeOpacity={0.8}
          >
            <Text style={[styles.periodText, period === '6m' && styles.periodTextActive]}>
              ৬ মাস
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.periodTab, period === '1y' && styles.periodTabActive]}
            onPress={() => setPeriod('1y')}
            activeOpacity={0.8}
          >
            <Text style={[styles.periodText, period === '1y' && styles.periodTextActive]}>
              ১ বছর
            </Text>
          </TouchableOpacity>
        </View>

        {/* Section: স্মার্ট সতর্কবার্তা */}
        <Text style={styles.sectionTitle}>স্মার্ট সতর্কবার্তা</Text>

        {/* Alert 1 */}
        <View style={styles.idleCashAlert}>
          <Ionicons name="information-circle-outline" size={18} color="#1E293B" style={styles.alertIcon} />
          <Text style={styles.alertText}>
            <Text style={{ fontFamily: 'HindSiliguri-Bold' }}>অলস টাকা: </Text>
            ৳৯,৩০,০০০ গত ৪৫ দিন ধরে হাতে ও ব্যাংকে পড়ে আছে। নতুন বিনিয়োগ বিবেচনা করুন।
          </Text>
        </View>

        {/* Alert 2 */}
        <View style={styles.warningAlert}>
          <Ionicons name="warning-outline" size={18} color="#C2410C" style={styles.alertIcon} />
          <Text style={[styles.alertText, { color: '#9A3412' }]}>
            সাইট বি প্রজেক্টের সম্ভাব্য সমাপ্তির তারিখ পার হয়েছে, এখনো কোনো ফেরত আসেনি।
          </Text>
        </View>

        {/* Alert 3 */}
        <View style={styles.warningAlert}>
          <Ionicons name="warning-outline" size={18} color="#C2410C" style={styles.alertIcon} />
          <Text style={[styles.alertText, { color: '#9A3412' }]}>
            আদায়ের হার এ মাসে ৭৮%, গত ৩ মাসের গড় ৯২% এর চেয়ে কম।
          </Text>
        </View>

        {/* Card: মাসিক আদায়ের হার */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>মাসিক আদায়ের হার</Text>
          <Text style={styles.chartSub}>সময়মতো জমা দেওয়া সদস্যের শতাংশ</Text>

          <View style={styles.verticalBarsContainer}>
            {/* বার ১: এপ্রিল */}
            <View style={styles.barCol}>
              <Text style={styles.barValueText}>৯২%</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { height: '92%', backgroundColor: '#0F766E' }]} />
              </View>
              <Text style={styles.barLabelText}>এপ্রিল</Text>
            </View>

            {/* বার ২: মে */}
            <View style={styles.barCol}>
              <Text style={styles.barValueText}>৮৮%</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { height: '88%', backgroundColor: '#0F766E' }]} />
              </View>
              <Text style={styles.barLabelText}>মে</Text>
            </View>

            {/* বার ৩: জুন */}
            <View style={styles.barCol}>
              <Text style={styles.barValueText}>৯৫%</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { height: '95%', backgroundColor: '#0F766E' }]} />
              </View>
              <Text style={styles.barLabelText}>জুন</Text>
            </View>

            {/* বার ৪: জুলাই */}
            <View style={styles.barCol}>
              <Text style={styles.barValueText}>৯০%</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { height: '90%', backgroundColor: '#0F766E' }]} />
              </View>
              <Text style={styles.barLabelText}>জুলাই</Text>
            </View>

            {/* বার ৫: আগস্ট */}
            <View style={styles.barCol}>
              <Text style={styles.barValueText}>৮৪%</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { height: '84%', backgroundColor: '#0F766E' }]} />
              </View>
              <Text style={styles.barLabelText}>আগস্ট</Text>
            </View>

            {/* বার ৬: সেপ্টে */}
            <View style={styles.barCol}>
              <Text style={[styles.barValueText, { color: '#C2410C' }]}>৭৮%</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { height: '78%', backgroundColor: '#C2410C' }]} />
              </View>
              <Text style={[styles.barLabelText, { color: '#C2410C', fontFamily: 'HindSiliguri-Bold' }]}>সেপ্টে</Text>
            </View>
          </View>
        </View>

        {/* Card: তহবিলের বৃদ্ধি */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>তহবিলের বৃদ্ধি</Text>
          <Text style={styles.chartSub}>মোট তহবিল, লাখ টাকায় · ৬ মাসে +২৭%</Text>

          <View style={styles.verticalBarsContainer}>
            {/* এপ্রিল */}
            <View style={styles.barCol}>
              <Text style={styles.barValueText}>৩৮.২ল</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { height: '70%', backgroundColor: '#0F766E' }]} />
              </View>
              <Text style={styles.barLabelText}>এপ্রিল</Text>
            </View>

            {/* মে */}
            <View style={styles.barCol}>
              <Text style={styles.barValueText}>৪০.১ল</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { height: '75%', backgroundColor: '#0F766E' }]} />
              </View>
              <Text style={styles.barLabelText}>মে</Text>
            </View>

            {/* জুন */}
            <View style={styles.barCol}>
              <Text style={styles.barValueText}>৪২.৩ল</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { height: '80%', backgroundColor: '#0F766E' }]} />
              </View>
              <Text style={styles.barLabelText}>জুন</Text>
            </View>

            {/* জুলাই */}
            <View style={styles.barCol}>
              <Text style={styles.barValueText}>৪৪.০ল</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { height: '85%', backgroundColor: '#0F766E' }]} />
              </View>
              <Text style={styles.barLabelText}>জুলাই</Text>
            </View>

            {/* আগস্ট */}
            <View style={styles.barCol}>
              <Text style={styles.barValueText}>৪৬.৪ল</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { height: '90%', backgroundColor: '#0F766E' }]} />
              </View>
              <Text style={styles.barLabelText}>আগস্ট</Text>
            </View>

            {/* সেপ্টে */}
            <View style={styles.barCol}>
              <Text style={styles.barValueText}>৪৮.৫ল</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { height: '96%', backgroundColor: '#0F766E' }]} />
              </View>
              <Text style={styles.barLabelText}>সেপ্টে</Text>
            </View>
          </View>
        </View>

        {/* Card: সদস্যদের জমার অভ্যাস */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>সদস্যদের জমার অভ্যাস</Text>

          <View style={styles.habitBar}>
            <View style={[styles.habitSegment, { flex: 72, backgroundColor: '#0F766E' }]} />
            <View style={[styles.habitSegment, { flex: 20, backgroundColor: '#EA580C' }]} />
            <View style={[styles.habitSegment, { flex: 8, backgroundColor: '#7C2D12' }]} />
          </View>

          <View style={styles.habitColsRow}>
            <View style={styles.habitCol}>
              <Text style={styles.habitColLabel}>নিয়মিত</Text>
              <Text style={styles.habitColValDark}>৭২ জন</Text>
            </View>

            <View style={styles.habitCol}>
              <Text style={styles.habitColLabel}>মাঝে মাঝে দেরি</Text>
              <Text style={styles.habitColValOrange}>২০ জন</Text>
            </View>

            <View style={styles.habitCol}>
              <Text style={styles.habitColLabel}>প্রায়ই দেরি</Text>
              <Text style={styles.habitColValRust}>৮ জন</Text>
            </View>
          </View>
        </View>

        {/* Card: প্রজেক্টভিত্তিক ROI */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>প্রজেক্টভিত্তিক ROI</Text>

          <View style={styles.roiList}>
            {/* 1 */}
            <View style={styles.roiItem}>
              <View style={styles.roiHeader}>
                <Text style={styles.roiName}>পোল্ট্রি খামার</Text>
                <Text style={styles.roiVal}>১৪%</Text>
              </View>
              <View style={styles.roiTrack}>
                <View style={[styles.roiFill, { width: '85%', backgroundColor: '#0F766E' }]} />
              </View>
            </View>

            {/* 2 */}
            <View style={styles.roiItem}>
              <View style={styles.roiHeader}>
                <Text style={styles.roiName}>সাইট এ: জমি</Text>
                <Text style={styles.roiVal}>১২%</Text>
              </View>
              <View style={styles.roiTrack}>
                <View style={[styles.roiFill, { width: '70%', backgroundColor: '#0F766E' }]} />
              </View>
            </View>

            {/* 3 */}
            <View style={styles.roiItem}>
              <View style={styles.roiHeader}>
                <Text style={styles.roiName}>দোকান ভাড়া</Text>
                <Text style={styles.roiVal}>৬%</Text>
              </View>
              <View style={styles.roiTrack}>
                <View style={[styles.roiFill, { width: '38%', backgroundColor: '#0F766E' }]} />
              </View>
            </View>

            {/* 4 */}
            <View style={styles.roiItem}>
              <View style={styles.roiHeader}>
                <Text style={styles.roiName}>সাইট বি: নির্মাণ</Text>
                <Text style={[styles.roiVal, { color: '#C2410C' }]}>−৭%</Text>
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
            <Text style={styles.ratioLabel}>পরিচালনা ব্যয়ের হার</Text>
            <Text style={styles.ratioVal}>৭%</Text>
            <Text style={styles.ratioSub}>মোট আয়ের তুলনায়</Text>
          </View>

          <View style={styles.ratioCard}>
            <Text style={styles.ratioLabel}>প্রতি ৳১,০০০ জমায় লাভ</Text>
            <Text style={styles.ratioVal}>৳৫৪</Text>
            <Text style={styles.ratioSub}>এ বছর, আনুমানিক</Text>
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
