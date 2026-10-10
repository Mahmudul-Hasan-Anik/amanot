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
import Ionicons from '@expo/vector-icons/Ionicons';
import { REMOTE } from '../../src/store/somitiStore';
import { bnDate } from '../../src/lib/api';
import { useSomitiStore } from '../../src/store/somitiStore';
import { useLanguage } from '../../src/i18n/useLanguage';
import { safeBack } from '../../src/utils/navigation';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';

interface AuditItem {
  id: string;
  header: string;
  title: string;
  sub: string;
  category: 'financial' | 'member' | 'settings';
}

export default function AuditLogScreen() {
  const router = useRouter();
  const { l, isBengali } = useLanguage();
  const { auditLogs } = useSomitiStore();
  const [filter, setFilter] = useState<'all' | 'financial' | 'member' | 'settings'>('all');

  // Baseline sample audit entries from Page 24
  const canonicalLogs: AuditItem[] = [
    {
      id: 'log-1',
      header: isBengali ? 'আজ ১১:৪২ • মাহমুদা খাতুন' : 'Today 11:42 • Mahmuda Khatun',
      title: isBengali ? 'জমা এন্ট্রি: করিম উদ্দিন ৳৪,১০০' : 'Deposit Entry: Karim Uddin ৳4,100',
      sub: isBengali ? 'রসিদ নং ১০৮৮ • Android • Samsung A34' : 'Receipt No. 1088 • Android • Samsung A34',
      category: 'financial',
    },
    {
      id: 'log-2',
      header: isBengali ? 'আজ ১০:২০ • মাহমুদা খাতুন' : 'Today 10:20 • Mahmuda Khatun',
      title: isBengali ? 'ব্যয় এন্ট্রি: সভার আপ্যায়ন ৳১২,৫০০' : 'Expense Entry: Meeting Refreshments ৳12,500',
      sub: isBengali ? 'অনুমোদনের অপেক্ষায়' : 'Pending approval',
      category: 'financial',
    },
    {
      id: 'log-3',
      header: isBengali ? 'গতকাল ৬:৫৫ • জাহিদ হাসান' : 'Yesterday 6:55 • Zahid Hasan',
      title: isBengali ? 'সংশোধন অনুরোধ: রসিদ নং ১০৭১' : 'Correction Request: Receipt No. 1071',
      sub: isBengali ? '৳২,০০০ → ৳১,৫০০ • কারণ: ভুল পরিমাণ' : '৳2,000 → ৳1,500 • Reason: Wrong amount',
      category: 'financial',
    },
    {
      id: 'log-4',
      header: isBengali ? '২৮ সেপ্টে • আনোয়ার হোসেন' : '28 Sep • Anwar Hossain',
      title: isBengali ? 'সেটিংস: ব্যয় অনুমোদন সীমা' : 'Settings: Expense Approval Limit',
      sub: isBengali ? '৳৫,০০০ → ৳১০,০০০' : '৳5,000 → ৳10,000',
      category: 'settings',
    },
    {
      id: 'log-5',
      header: isBengali ? '২৫ সেপ্টে • জাহিদ হাসান' : '25 Sep • Zahid Hasan',
      title: isBengali ? 'সদস্যের তথ্য: নাসরিন আক্তার' : 'Member Info: Nasrin Akhter',
      sub: isBengali ? 'মোবাইল নম্বর পরিবর্তন' : 'Mobile number changed',
      category: 'member',
    },
    {
      id: 'log-6',
      header: isBengali ? '১ জানু • আনোয়ার হোসেন' : '1 Jan • Anwar Hossain',
      title: isBengali ? 'সেটিংস: রিজার্ভ ১০%, পরিচালক ১০%' : 'Settings: Reserve 10%, Director 10%',
      sub: isBengali ? 'লক করা হয়েছে • অনুমোদন: জাহিদ হাসান' : 'Locked • Approved by: Zahid Hasan',
      category: 'settings',
    },
  ];

  const allLogs = useMemo(() => {
    if (REMOTE && auditLogs && auditLogs.length > 0) {
      const ACTIONS: Record<string, { en: string; bn: string; cat: AuditItem['category'] }> = {
        account_created: { en: 'Account activated', bn: 'অ্যাকাউন্ট চালু', cat: 'member' },
        member_added: { en: 'Member added', bn: 'নতুন সদস্য যোগ', cat: 'member' },
        member_updated: { en: 'Member info updated', bn: 'সদস্যের তথ্য হালনাগাদ', cat: 'member' },
        deposit_recorded: { en: 'Deposit', bn: 'জমা এন্ট্রি', cat: 'financial' },
        expense_added: { en: 'Expense', bn: 'ব্যয় এন্ট্রি', cat: 'financial' },
        approval_approved: { en: 'Approval granted', bn: 'অনুমোদন দেওয়া হয়েছে', cat: 'financial' },
        settings_updated: { en: 'Settings updated', bn: 'সেটিংস পরিবর্তন', cat: 'settings' },
      };

      const mapped: AuditItem[] = auditLogs.map((a) => {
        const meta = ACTIONS[a.action] || { en: a.action, bn: a.action, cat: 'settings' as const };
        const d = a.details || {};
        const parts: string[] = [];
        if (d.amount) parts.push(`৳${d.amount}`);
        if (d.receipt) parts.push(`রসিদ #${d.receipt}`);
        if (d.member) parts.push(String(d.member));
        if (d.reason) parts.push(String(d.reason));

        return {
          id: a.id,
          header: `${bnDate(a.createdAt)} • ${a.actor || 'সিস্টেম'}`,
          title: isBengali ? meta.bn : meta.en,
          sub: parts.join(' • ') || (isBengali ? 'সিস্টেম লগ' : 'System log'),
          category: meta.cat,
        };
      });
      return [...canonicalLogs, ...mapped];
    }
    return canonicalLogs;
  }, [auditLogs, isBengali]);

  const filteredLogs = useMemo(() => {
    if (filter === 'all') return allLogs;
    return allLogs.filter((item) => item.category === filter);
  }, [allLogs, filter]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      {/* Screen Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => safeBack(router, '/(admin)/(tabs)/more')}
          style={styles.headerIconBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{l('Audit Log', 'অডিট লগ')}</Text>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() =>
            Alert.alert(
              l('Filter', 'ফিল্টার'),
              l(
                'Audit log is permanently immutable and sorted chronologically.',
                'অডিট লগ সম্পূর্ণ অপরিবর্তনীয় এবং সময়ক্রম অনুসারে সাজানো।'
              )
            )
          }
          activeOpacity={0.7}
        >
          <Ionicons name="filter-outline" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Permanence Security Green Banner */}
        <View style={styles.guaranteeBanner}>
          <Ionicons
            name="checkmark"
            size={18}
            color={colors.primary}
            style={styles.guaranteeIcon}
          />
          <Text style={styles.guaranteeText}>
            {l(
              'This log is permanent. Nobody, including the president, can delete or alter it.',
              'এই লগ স্থায়ী। সভাপতিসহ কেউ এটি মুছতে বা পরিবর্তন করতে পারবেন না।'
            )}
          </Text>
        </View>

        {/* Filter Chips */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
            onPress={() => setFilter('all')}
            activeOpacity={0.8}
          >
            {filter === 'all' && (
              <Ionicons name="checkmark" size={14} color={colors.primary} />
            )}
            <Text
              style={[
                styles.filterChipText,
                filter === 'all' && styles.filterChipTextActive,
              ]}
            >
              {l('All', 'সব')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filter === 'financial' && styles.filterChipActive]}
            onPress={() => setFilter('financial')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterChipText,
                filter === 'financial' && styles.filterChipTextActive,
              ]}
            >
              {l('Financial', 'আর্থিক')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filter === 'member' && styles.filterChipActive]}
            onPress={() => setFilter('member')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterChipText,
                filter === 'member' && styles.filterChipTextActive,
              ]}
            >
              {l('Member', 'সদস্য')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filter === 'settings' && styles.filterChipActive]}
            onPress={() => setFilter('settings')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterChipText,
                filter === 'settings' && styles.filterChipTextActive,
              ]}
            >
              {l('Settings', 'সেটিংস')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Timeline Container Card */}
        <View style={styles.timelineCard}>
          {filteredLogs.map((item, index) => {
            const isLast = index === filteredLogs.length - 1;
            return (
              <View key={item.id} style={styles.timelineItem}>
                {/* Left track with green ring dot and connector line */}
                <View style={styles.timelineTrack}>
                  <View style={styles.ringDot} />
                  {!isLast && <View style={styles.connectorLine} />}
                </View>

                {/* Right content column */}
                <View style={[styles.contentCol, !isLast && styles.contentColBorder]}>
                  <Text style={styles.itemHeader}>{item.header}</Text>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemSub}>{item.sub}</Text>
                </View>
              </View>
            );
          })}

          {filteredLogs.length === 0 && (
            <View style={styles.emptyBox}>
              <Ionicons name="shield-outline" size={32} color={colors.textSecondary} />
              <Text style={styles.emptyText}>
                {l('No audit records found', 'কোনো অডিট রেকর্ড নেই')}
              </Text>
            </View>
          )}
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
  headerIconBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xl,
    lineHeight: typography.lineHeight.xl,
    color: colors.text,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  guaranteeBanner: {
    flexDirection: 'row',
    backgroundColor: colors.primarySoft,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  guaranteeIcon: {
    marginTop: 2,
  },
  guaranteeText: {
    flex: 1,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primarySoft,
  },
  filterChipText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text,
  },
  filterChipTextActive: {
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
  },
  timelineCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingTop: 18,
    paddingBottom: 8,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  timelineItem: {
    flexDirection: 'row',
  },
  timelineTrack: {
    width: 20,
    alignItems: 'center',
    marginRight: 10,
  },
  ringDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    marginTop: 2,
  },
  connectorLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.surfaceMuted,
    marginVertical: 4,
  },
  contentCol: {
    flex: 1,
  },
  contentColBorder: {
    paddingBottom: 22,
  },
  itemHeader: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  itemTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    color: colors.text,
    marginBottom: 2,
  },
  itemSub: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.textSecondary,
  },
  emptyBox: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.textSecondary,
    marginTop: 8,
  },
  bottomSpacer: {
    height: 40,
  },
});
