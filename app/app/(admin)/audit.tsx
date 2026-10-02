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
import { Ionicons } from '@expo/vector-icons';
import { useSomitiStore } from '../../src/store/somitiStore';
import { formatBengaliMoney } from '../../src/lib/money';

interface AuditItem {
  id: string;
  header: string;
  title: string;
  sub: string;
  category: 'financial' | 'member' | 'settings';
}

export default function AuditLogScreen() {
  const router = useRouter();
  const { transactions, expenses } = useSomitiStore();
  const [filter, setFilter] = useState<'all' | 'financial' | 'member' | 'settings'>('all');

  const liveAuditLogs = useMemo(() => {
    const list: AuditItem[] = [];

    // Transactions into audit log
    transactions.forEach((tx) => {
      const method = tx.paymentMethod === 'bkash' ? 'বিকাশ' : tx.paymentMethod === 'bank' ? 'ব্যাংক' : 'হাতে নগদ';
      list.push({
        id: `audit-${tx.id}`,
        header: `${tx.date} · কোষাধ্যক্ষ`,
        title: `${tx.type === 'deposit' ? 'জমা এন্ট্রি' : 'ব্যয়'}: ${tx.memberName} ৳${formatBengaliMoney(tx.amount)}`,
        sub: `রসিদ ${tx.receiptNo} · মাধ্যম: ${method}${tx.trxId ? ` · TrxID: ${tx.trxId}` : ''}`,
        category: 'financial',
      });
    });

    // Expenses into audit log
    expenses.forEach((exp) => {
      list.push({
        id: `audit-${exp.id}`,
        header: `${exp.date} · মাহমুদা খাতুন`,
        title: `ব্যয় এন্ট্রি: ${exp.title} ৳${formatBengaliMoney(exp.amount)}`,
        sub: `ভাউচার নং ${exp.voucherNo} · উৎস: ${exp.paymentSource}`,
        category: 'financial',
      });
    });

    // Static system audit items
    list.push(
      {
        id: 'sys-1',
        header: '২৮ সেপ্টে · আনোয়ার হোসেন',
        title: 'সেটিংস: ব্যয় অনুমোদন সীমা',
        sub: '৳৫,০০০ → ৳১০,০০০ · অনুমোদিত',
        category: 'settings',
      },
      {
        id: 'sys-2',
        header: '২৫ সেপ্টে · জাহিদ হাসান',
        title: 'সদস্যের তথ্য: নাসরিন আক্তার',
        sub: 'মোবাইল নম্বর ও নমিনির তথ্য আপডেট',
        category: 'member',
      },
      {
        id: 'sys-3',
        header: '১ জানু · আনোয়ার হোসেন',
        title: 'সেটিংস: রিজার্ভ ১০%, পরিচালক ১০%',
        sub: 'লক করা হয়েছে · অনুমোদন: জাহিদ হাসান',
        category: 'settings',
      }
    );

    return list;
  }, [transactions, expenses]);

  const filteredLogs = useMemo(() => {
    return liveAuditLogs.filter((item) => {
      if (filter === 'all') return true;
      return item.category === filter;
    });
  }, [liveAuditLogs, filter]);

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
        <Text style={styles.headerTitle}>অডিট লগ</Text>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => Alert.alert('ফিল্টার', 'অডিট লগ ফিল্টার করুন')}
          activeOpacity={0.7}
        >
          <Ionicons name="filter-outline" size={20} color="#1E293B" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Guarantee Green Banner */}
        <View style={styles.guaranteeBanner}>
          <Ionicons name="shield-checkmark" size={20} color="#0F766E" style={styles.guaranteeIcon} />
          <Text style={styles.guaranteeText}>
            এই লগ অপরিবর্তনযোগ্য (Immutable Ledger)। সভাপতিসহ কেউই এই হিসাব মুছে ফেলতে বা সংশোধন করতে পারবেন না।
          </Text>
        </View>

        {/* Filter Chips */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
            onPress={() => setFilter('all')}
            activeOpacity={0.8}
          >
            {filter === 'all' && <Ionicons name="checkmark" size={14} color="#0F766E" />}
            <Text style={[styles.filterChipText, filter === 'all' && styles.filterChipTextActive]}>
              সব
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filter === 'financial' && styles.filterChipActive]}
            onPress={() => setFilter('financial')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, filter === 'financial' && styles.filterChipTextActive]}>
              আর্থিক
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filter === 'member' && styles.filterChipActive]}
            onPress={() => setFilter('member')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, filter === 'member' && styles.filterChipTextActive]}>
              সদস্য
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filter === 'settings' && styles.filterChipActive]}
            onPress={() => setFilter('settings')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, filter === 'settings' && styles.filterChipTextActive]}>
              সেটিংস
            </Text>
          </TouchableOpacity>
        </View>

        {/* Timeline Container Card */}
        <View style={styles.timelineCard}>
          {filteredLogs.map((item, index) => {
            const isLast = index === filteredLogs.length - 1;
            return (
              <View key={item.id} style={styles.timelineItem}>
                {/* Left track with ring and connector */}
                <View style={styles.timelineTrack}>
                  <View style={styles.ringDot} />
                  {!isLast && <View style={styles.connectorLine} />}
                </View>

                {/* Right content */}
                <View style={[styles.contentCol, !isLast && { paddingBottom: 24 }]}>
                  <Text style={styles.itemHeader}>{item.header}</Text>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemSub}>{item.sub}</Text>
                </View>
              </View>
            );
          })}

          {filteredLogs.length === 0 && (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Ionicons name="shield-outline" size={32} color="#94A3B8" />
              <Text style={{ fontFamily: 'HindSiliguri-Regular', color: '#64748B', marginTop: 8 }}>
                কোনো অডিট রেকর্ড নেই
              </Text>
            </View>
          )}
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
  guaranteeBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E6F4F2',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    marginBottom: 14,
  },
  guaranteeIcon: {
    marginTop: 2,
  },
  guaranteeText: {
    flex: 1,
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 13,
    color: '#0F766E',
    lineHeight: 18,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#EAEBE6',
  },
  filterChipActive: {
    backgroundColor: '#CCFBF1',
  },
  filterChipText: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 13,
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#0F766E',
  },
  timelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  timelineItem: {
    flexDirection: 'row',
  },
  timelineTrack: {
    alignItems: 'center',
    width: 24,
    marginRight: 10,
  },
  ringDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2.5,
    borderColor: '#0F766E',
    backgroundColor: '#FFFFFF',
    marginTop: 3,
  },
  connectorLine: {
    flex: 1,
    width: 1.5,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  contentCol: {
    flex: 1,
  },
  itemHeader: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
  },
  itemTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#1E293B',
    marginBottom: 2,
  },
  itemSub: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
});
