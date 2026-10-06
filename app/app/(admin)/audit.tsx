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
import { REMOTE } from '../../src/store/somitiStore';
import { bnDate } from '../../src/lib/api';
import { useSomitiStore } from '../../src/store/somitiStore';
import { useLanguage } from '../../src/i18n/useLanguage';

interface AuditItem {
  id: string;
  header: string;
  title: string;
  sub: string;
  category: 'financial' | 'member' | 'settings';
}

export default function AuditLogScreen() {
  const router = useRouter();
  const { l, formatMoney } = useLanguage();
  const { transactions, auditLogs } = useSomitiStore();
  const [filter, setFilter] = useState<'all' | 'financial' | 'member' | 'settings'>('all');

  const liveAuditLogs = useMemo(() => {
    const ACTIONS: Record<string, { en: string; bn: string; cat: AuditItem['category'] }> = {
      account_created: { en: 'Account activated', bn: 'অ্যাকাউন্ট চালু', cat: 'member' },
      member_added: { en: 'Member added', bn: 'নতুন সদস্য যোগ', cat: 'member' },
      member_updated: { en: 'Member info updated', bn: 'সদস্যের তথ্য হালনাগাদ', cat: 'member' },
      member_deleted: { en: 'Member removed', bn: 'সদস্য বাদ', cat: 'member' },
      role_changed: { en: 'Role changed', bn: 'রোল পরিবর্তন', cat: 'member' },
      pin_reset: { en: 'PIN reset', bn: 'পিন রিসেট', cat: 'member' },
      deposit_recorded: { en: 'Deposit', bn: 'জমা এন্ট্রি', cat: 'financial' },
      expense_added: { en: 'Expense', bn: 'ব্যয় এন্ট্রি', cat: 'financial' },
      approval_approved: { en: 'Approval granted', bn: 'অনুমোদন দেওয়া হয়েছে', cat: 'financial' },
      approval_rejected: { en: 'Approval rejected', bn: 'অনুমোদন প্রত্যাখ্যাত', cat: 'financial' },
      project_saved: { en: 'Project saved', bn: 'প্রজেক্ট সংরক্ষণ', cat: 'financial' },
      project_return: { en: 'Project income', bn: 'প্রজেক্ট আয়', cat: 'financial' },
      cash_transfer: { en: 'Cash transfer', bn: 'হিসাব স্থানান্তর', cat: 'financial' },
      cash_account_saved: { en: 'Cash account saved', bn: 'হিসাব সংরক্ষণ', cat: 'settings' },
      profit_distributed: { en: 'Profit distributed', bn: 'লাভ বণ্টন', cat: 'financial' },
      somiti_updated: { en: 'Somiti settings updated', bn: 'সমিতির সেটিংস হালনাগাদ', cat: 'settings' },
      notice_added: { en: 'Notice posted', bn: 'নোটিশ প্রকাশ', cat: 'settings' },
      notice_deleted: { en: 'Notice deleted', bn: 'নোটিশ মুছে ফেলা', cat: 'settings' },
      dues_accrued: { en: 'Monthly dues added', bn: 'মাসিক বকেয়া যোগ', cat: 'financial' },
    };

    if (REMOTE) {
      return (auditLogs || []).map((a): AuditItem => {
        const meta = ACTIONS[a.action] || { en: a.action, bn: a.action, cat: 'settings' as const };
        const d = a.details || {};
        const parts: string[] = [];
        if (d.amount !== undefined) parts.push(formatMoney(Number(d.amount)));
        if (d.receipt) parts.push(`${l('Receipt', 'রসিদ')} ${d.receipt}`);
        if (d.member || d.code) parts.push(String(d.member || d.code));
        if (d.name) parts.push(String(d.name));
        if (d.title) parts.push(String(d.title));
        if (d.role) parts.push(String(d.role));
        if (d.reason) parts.push(String(d.reason));
        if (Array.isArray(d.fields)) parts.push(d.fields.join(', '));
        if (d.from && d.to) parts.push(`${d.from} → ${d.to}`);
        return {
          id: a.id,
          header: `${bnDate(a.createdAt)} · ${a.actor || l('System', 'সিস্টেম')}`,
          title: l(meta.en, meta.bn),
          sub: parts.join(' · '),
          category: meta.cat,
        };
      });
    }

    const list: AuditItem[] = [];
    transactions.forEach((tx) => {
      const method = tx.paymentMethod === 'bkash' ? l('bKash', 'বিকাশ') : tx.paymentMethod === 'bank' ? l('Bank', 'ব্যাংক') : l('Cash', 'হাতে নগদ');
      list.push({
        id: `audit-${tx.id}`,
        header: `${tx.date}`,
        title: `${tx.type === 'deposit' ? l('Deposit Entry', 'জমা এন্ট্রি') : l('Expense', 'ব্যয়')}: ${tx.memberName} ${formatMoney(tx.amount)}`,
        sub: `${l('Receipt', 'রসিদ')} ${tx.receiptNo} · ${l('Method:', 'মাধ্যম:')} ${method}${tx.trxId ? ` · TrxID: ${tx.trxId}` : ''}`,
        category: 'financial',
      });
    });
    return list;
  }, [transactions, auditLogs, l, formatMoney]);

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
        <Text style={styles.headerTitle}>{l('Audit Log', 'অডিট লগ')}</Text>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => Alert.alert(l('Filter', 'ফিল্টার'), l('Filter audit log', 'অডিট লগ ফিল্টার করুন'))}
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
            {l('This log is an Immutable Ledger. Nobody, including the president, can delete or alter these records.', 'এই লগ অপরিবর্তনযোগ্য (Immutable Ledger)। সভাপতিসহ কেউই এই হিসাব মুছে ফেলতে বা সংশোধন করতে পারবেন না।')}
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
              {l('All', 'সব')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filter === 'financial' && styles.filterChipActive]}
            onPress={() => setFilter('financial')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, filter === 'financial' && styles.filterChipTextActive]}>
              {l('Financial', 'আর্থিক')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filter === 'member' && styles.filterChipActive]}
            onPress={() => setFilter('member')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, filter === 'member' && styles.filterChipTextActive]}>
              {l('Member', 'সদস্য')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filter === 'settings' && styles.filterChipActive]}
            onPress={() => setFilter('settings')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, filter === 'settings' && styles.filterChipTextActive]}>
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
                {l('No audit records found', 'কোনো অডিট রেকর্ড নেই')}
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
