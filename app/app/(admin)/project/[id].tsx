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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSomitiStore } from '../../../src/store/somitiStore';
import { useLanguage } from '../../../src/i18n/useLanguage';

export default function ProjectDetailScreen() {
  const router = useRouter();
  const { l, formatMoney, formatNum } = useLanguage();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { projects } = useSomitiStore();

  const project = projects.find(
    (p) => p.id === id || p.id === `p${id}` || p.id.replace('p', '') === id
  ) || projects[0];

  const isProfit = project ? project.netProfit >= 0 : true;

  const handleDocOpen = (name: string) => {
    Alert.alert(l('Document Viewer', 'ডকুমেন্ট ভিউয়ার'), `${project?.name} - ${name} ${l('is loading...', 'লোড হচ্ছে...')}`);
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
        <Text style={styles.headerTitle}>{l('Project Details', 'প্রজেক্টের বিবরণ')}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => Alert.alert(l('Edit', 'সম্পাদনা'), l('Edit project details', 'প্রজেক্টের বিবরণ সম্পাদনা করুন'))}
            activeOpacity={0.7}
          >
            <Ionicons name="pencil-outline" size={20} color="#1E293B" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => Alert.alert(l('Report', 'রিপোর্ট'), l('Full project report will be downloaded', 'প্রজেক্টের পূর্ণাঙ্গ রিপোর্ট ডাউনলোড করা হবে'))}
            activeOpacity={0.7}
          >
            <Ionicons name="download-outline" size={20} color="#1E293B" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Category & Status Tags */}
        <View style={styles.tagsRow}>
          <View style={styles.tagPill}>
            <Text style={styles.tagPillText}>{project.type}</Text>
          </View>
          <View
            style={[
              styles.tagPill,
              project.status === 'delayed' ? { backgroundColor: '#FEE2E2' } : { backgroundColor: '#CCFBF1' },
            ]}
          >
            <Text
              style={[
                styles.tagPillText,
                project.status === 'delayed' ? { color: '#DC2626' } : { color: '#0F766E' },
              ]}
            >
              {project.status === 'delayed' ? l('Delayed', 'বিলম্বিত') : project.status === 'completed' ? l('Completed', 'সমাপ্ত') : l('Running', 'চলমান')}
            </Text>
          </View>
        </View>

        {/* Project Title and Meta */}
        <Text style={styles.projectMainTitle}>{project.name}</Text>
        <Text style={styles.projectMetaLine}>{l('Manager:', 'দায়িত্বে:')} {project.manager} · {project.location}</Text>
        <Text style={styles.projectMetaLine}>
          {l('Started', 'শুরু')} {project.startDate} · {l('Est. Completion', 'সম্ভাব্য শেষ')} {project.expectedEnd}
        </Text>

        {/* 2x2 Metric Cards Grid */}
        <View style={styles.gridContainer}>
          <View style={styles.gridRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricCardLabel}>{l('Total Investment', 'মোট বিনিয়োগ')}</Text>
              <Text style={styles.metricCardVal}>{formatMoney(project.investedAmount)}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricCardLabel}>{l('Total Return', 'মোট ফেরত')}</Text>
              <Text style={styles.metricCardVal}>{formatMoney(project.returnedAmount)}</Text>
            </View>
          </View>

          <View style={styles.gridRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricCardLabel}>{l('Net Profit', 'নিট লাভ')}</Text>
              <Text style={[styles.metricCardVal, { color: isProfit ? '#059669' : '#DC2626' }]}>
                {isProfit ? `+${formatMoney(project.netProfit)}` : `−${formatMoney(Math.abs(project.netProfit))}`}
              </Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricCardLabel}>{l('ROI', 'ROI')}</Text>
              <Text style={[styles.metricCardVal, { color: isProfit ? '#1E293B' : '#DC2626' }]}>
                {formatNum(project.roiPct)}%
              </Text>
            </View>
          </View>
        </View>

        {/* Capital Recovery Progress Card */}
        <View style={styles.recoveryCard}>
          <View style={styles.recoveryHeader}>
            <Text style={styles.recoveryTitle}>{l('Capital Recovery', 'মূলধন ফেরত')}</Text>
            <Text style={styles.recoveryPct}>{formatNum(project.recoveryPct)}%</Text>
          </View>

          <View style={styles.recoveryTrack}>
            <View style={[styles.recoveryFill, { width: `${project.recoveryPct}%` }]} />
          </View>

          <Text style={styles.recoverySub}>
            {l('Remaining in project:', 'প্রজেক্টে এখনো আছে')} {formatMoney(project.remainingAmount)}
          </Text>
        </View>

        {/* Transactions Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{l('Transaction History', 'লেনদেন বিবরণী')}</Text>
          <TouchableOpacity
            onPress={() => router.push('/(admin)/audit')}
            activeOpacity={0.7}
          >
            <Text style={styles.seeAllLink}>{l('View All', 'সব দেখুন')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.transactionsCard}>
          {/* Sample project transactions */}
          <View style={styles.txnRow}>
            <View style={[styles.txnIconCircle, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="arrow-up" size={16} color="#DC2626" />
            </View>
            <View style={styles.txnDetails}>
              <Text style={styles.txnTitle}>{l('Investment Disbursed', 'বিনিয়োগ প্রদান')}</Text>
              <Text style={styles.txnMeta}>{project.startDate} · {l('Bank', 'ব্যাংক')}</Text>
            </View>
            <Text style={[styles.txnAmount, { color: '#DC2626' }]}>
              −{formatMoney(project.investedAmount)}
            </Text>
          </View>

          {project.returnedAmount > 0 && (
            <>
              <View style={styles.txnDivider} />
              <View style={styles.txnRow}>
                <View style={[styles.txnIconCircle, { backgroundColor: '#CCFBF1' }]}>
                  <Ionicons name="arrow-down" size={16} color="#0F766E" />
                </View>
                <View style={styles.txnDetails}>
                  <Text style={styles.txnTitle}>{l('Income / Return Installment', 'আয় / কিস্তি ফেরত')}</Text>
                  <Text style={styles.txnMeta}>{l('Current Year', 'চলতি বছর')} · {l('Bank', 'ব্যাংক')}</Text>
                </View>
                <Text style={[styles.txnAmount, { color: '#059669' }]}>
                  +{formatMoney(project.returnedAmount)}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Documents Section */}
        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>{l('Documents', 'ডকুমেন্ট')}</Text>
        <View style={styles.docsRow}>
          <TouchableOpacity
            style={styles.docCard}
            onPress={() => handleDocOpen(l('Agreement', 'চুক্তিপত্র'))}
            activeOpacity={0.8}
          >
            <Ionicons name="document-text-outline" size={24} color="#0F766E" />
            <Text style={styles.docText}>{l('Agreement', 'চুক্তিপত্র')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.docCard}
            onPress={() => handleDocOpen(l('Audit Report', 'অডিট রিপোর্ট'))}
            activeOpacity={0.8}
          >
            <Ionicons name="shield-checkmark-outline" size={24} color="#0F766E" />
            <Text style={styles.docText}>{l('Audit Report', 'অডিট রিপোর্ট')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.docCard}
            onPress={() => handleDocOpen(l('Bank Voucher', 'ব্যাংক রশিদ'))}
            activeOpacity={0.8}
          >
            <Ionicons name="receipt-outline" size={24} color="#0F766E" />
            <Text style={styles.docText}>{l('Bank Voucher', 'ব্যাংক রশিদ')}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Action Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.returnBtn}
          onPress={() => Alert.alert(l('Add Return / Income', 'আয় যুক্ত করুন'), l('Record income received from project?', 'প্রজেক্ট থেকে প্রাপ্ত আয়ের এন্ট্রি দিতে চান?'))}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.returnBtnText}>{l('Add Project Return / Income', 'প্রজেক্ট থেকে আয় যোগ করুন')}</Text>
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
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    padding: 6,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  tagPill: {
    backgroundColor: '#EAEBE6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagPillText: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 12,
    color: '#1E293B',
  },
  projectMainTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 22,
    color: '#1E293B',
    marginBottom: 4,
  },
  projectMetaLine: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 13,
    color: '#64748B',
    marginBottom: 2,
  },
  gridContainer: {
    marginTop: 14,
    gap: 10,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
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
  metricCardLabel: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  metricCardVal: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 16,
    color: '#1E293B',
  },
  recoveryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  recoveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recoveryTitle: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 14,
    color: '#1E293B',
  },
  recoveryPct: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#0F766E',
  },
  recoveryTrack: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  recoveryFill: {
    height: '100%',
    backgroundColor: '#0F766E',
    borderRadius: 4,
  },
  recoverySub: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#64748B',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 15,
    color: '#1E293B',
  },
  seeAllLink: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 13,
    color: '#64748B',
  },
  transactionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  txnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  txnIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  txnDetails: {
    flex: 1,
  },
  txnTitle: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 14,
    color: '#1E293B',
  },
  txnMeta: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  txnAmount: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
  },
  txnDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  docsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  docCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  docText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 12,
    color: '#1E293B',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  returnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F766E',
    borderRadius: 14,
    paddingVertical: 12,
    gap: 6,
  },
  returnBtnText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },
});
