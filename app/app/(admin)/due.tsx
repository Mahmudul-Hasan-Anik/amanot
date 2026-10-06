import React, { useState, useMemo } from 'react';
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
import { useSomitiStore } from '../../src/store/somitiStore';
import { useLanguage } from '../../src/i18n/useLanguage';
import { safeBack } from '../../src/utils/navigation';

export default function DueMembersScreen() {
  const router = useRouter();
  const { l, formatMoney, formatNum } = useLanguage();
  const { members, somitiInfo } = useSomitiStore();

  const [activeFilter, setActiveFilter] = useState<'all' | '3plus' | '2month' | '1month'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Get all members who have due amounts or status due/partial
  const allDueMembers = useMemo(() => {
    return members.filter((m) => m.status === 'due' || m.status === 'partial' || m.dueAmount > 0);
  }, [members]);

  // Aging counts
  const count1Month = useMemo(() => allDueMembers.filter((m) => m.dueMonths === 1).length, [allDueMembers]);
  const count2Month = useMemo(() => allDueMembers.filter((m) => m.dueMonths === 2).length, [allDueMembers]);
  const count3Plus = useMemo(() => allDueMembers.filter((m) => m.dueMonths >= 3).length, [allDueMembers]);

  // Total due sum
  const totalDueSum = useMemo(() => {
    return allDueMembers.reduce((acc, m) => acc + (m.dueAmount || 0), 0);
  }, [allDueMembers]);

  // Filtered members by aging chip
  const filteredDueMembers = useMemo(() => {
    if (activeFilter === '3plus') return allDueMembers.filter((m) => m.dueMonths >= 3);
    if (activeFilter === '2month') return allDueMembers.filter((m) => m.dueMonths === 2);
    if (activeFilter === '1month') return allDueMembers.filter((m) => m.dueMonths === 1);
    return allDueMembers;
  }, [allDueMembers, activeFilter]);

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredDueMembers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredDueMembers.map((m) => m.id));
    }
  };

  const selectedTotalAmount = useMemo(() => {
    return allDueMembers
      .filter((m) => selectedIds.includes(m.id))
      .reduce((acc, m) => acc + (m.dueAmount || 0), 0);
  }, [allDueMembers, selectedIds]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F7F2" />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => safeBack(router, '/(admin)/(tabs)/collection')}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{l('Due List', 'বকেয়া তালিকা')}</Text>
        <TouchableOpacity style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="download-outline" size={22} color="#1E293B" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Total Due Hero Card */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>{l('Total Due', 'মোট বকেয়া')}</Text>
          <Text style={styles.heroAmount}>{formatMoney(totalDueSum)}</Text>
          <Text style={styles.heroSub}>{formatNum(allDueMembers.length)} {l('Members · Inc. Late Fee', 'জন সদস্য · বিলম্ব ফি সহ')}</Text>
        </View>

        {/* Due Aging Card */}
        <View style={styles.agingCard}>
          <Text style={styles.agingTitle}>{l('Due Aging Breakdown', 'কত দিনের বকেয়া')}</Text>

          {/* Segmented Horizontal Bar */}
          <View style={styles.agingBar}>
            <View style={[styles.barSegment, { flex: Math.max(count1Month, 1), backgroundColor: '#FDBA74' }]} />
            <View style={[styles.barSegment, { flex: Math.max(count2Month, 1), backgroundColor: '#EA580C' }]} />
            <View style={[styles.barSegment, { flex: Math.max(count3Plus, 1), backgroundColor: '#7C2D12' }]} />
          </View>

          {/* 3 Columns */}
          <View style={styles.agingColsRow}>
            <View style={styles.agingCol}>
              <Text style={styles.colLabel}>{l('1 Month', '১ মাস')}</Text>
              <Text style={styles.colCount}>{formatNum(count1Month)} {l('Members', 'জন')}</Text>
            </View>
            <View style={styles.agingCol}>
              <Text style={styles.colLabel}>{l('2 Months', '২ মাস')}</Text>
              <Text style={styles.colCount}>{formatNum(count2Month)} {l('Members', 'জন')}</Text>
            </View>
            <View style={styles.agingCol}>
              <Text style={styles.colLabel}>{l('3+ Months', '৩+ মাস')}</Text>
              <Text style={styles.colCount}>{formatNum(count3Plus)} {l('Members', 'জন')}</Text>
            </View>
          </View>
        </View>

        {/* Filter Chips */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'all' && styles.filterChipActive]}
            onPress={() => setActiveFilter('all')}
            activeOpacity={0.8}
          >
            {activeFilter === 'all' && <Ionicons name="checkmark" size={14} color="#0F766E" />}
            <Text style={[styles.filterChipText, activeFilter === 'all' && styles.filterChipTextActive]}>
              {l('All', 'সব')} {formatNum(allDueMembers.length)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === '3plus' && styles.filterChipActive]}
            onPress={() => setActiveFilter('3plus')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, activeFilter === '3plus' && styles.filterChipTextActive]}>
              {l('3+ Months', '৩+ মাস')} {formatNum(count3Plus)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === '2month' && styles.filterChipActive]}
            onPress={() => setActiveFilter('2month')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, activeFilter === '2month' && styles.filterChipTextActive]}>
              {l('2 Months', '২ মাস')} {formatNum(count2Month)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === '1month' && styles.filterChipActive]}
            onPress={() => setActiveFilter('1month')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, activeFilter === '1month' && styles.filterChipTextActive]}>
              {l('1 Month', '১ মাস')} {formatNum(count1Month)}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Select All Checkbox */}
        <TouchableOpacity
          style={styles.selectAllRow}
          onPress={toggleSelectAll}
          activeOpacity={0.8}
        >
          <View style={[styles.checkboxBox, selectedIds.length === filteredDueMembers.length && filteredDueMembers.length > 0 && styles.checkboxBoxActive]}>
            {selectedIds.length === filteredDueMembers.length && filteredDueMembers.length > 0 && (
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            )}
          </View>
          <Text style={styles.selectAllText}>{l('Select All', 'সব নির্বাচন করুন')} ({formatNum(filteredDueMembers.length)})</Text>
        </TouchableOpacity>

        {/* Members List Card */}
        <View style={styles.listCard}>
          {filteredDueMembers.length === 0 ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Ionicons name="checkmark-circle-outline" size={48} color="#0F766E" />
              <Text style={{ fontFamily: 'HindSiliguri-Bold', fontSize: 16, color: '#1E293B', marginTop: 8 }}>
                {l('No Due Found!', 'কোনো বকেয়া নেই!')}
              </Text>
            </View>
          ) : (
            filteredDueMembers.map((item, index) => {
              const isSelected = selectedIds.includes(item.id);
              const isHighRisk = (item.dueMonths || 0) >= 3;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.memberRow,
                    index < filteredDueMembers.length - 1 && styles.memberRowBorder,
                  ]}
                  onPress={() => toggleSelect(item.id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.checkboxBox, isSelected && styles.checkboxBoxActive]}>
                    {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                  </View>

                  <View style={[styles.avatarCircle, isHighRisk && { backgroundColor: '#FEE2E2' }]}>
                    <Text style={[styles.avatarText, isHighRisk && { color: '#DC2626' }]}>
                      {item.name.charAt(0)}
                    </Text>
                  </View>

                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{item.name}</Text>
                    <Text style={styles.monthsText}>
                      {item.code} · {formatNum(item.dueMonths || 1)} {l('Month(s)', 'মাস')}{isHighRisk ? ' · ' + l('High Risk', 'উচ্চ ঝুঁকি') : ''}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.amountText, isHighRisk && { color: '#DC2626' }]}>
                      {formatMoney(item.dueAmount || 0)}
                    </Text>
                    <TouchableOpacity
                      onPress={() => router.push(`/(admin)/deposit/new?memberId=${item.id}`)}
                      style={styles.quickPayBtn}
                    >
                      <Text style={styles.quickPayBtnText}>{l('Collect', 'জমা নিন')}</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      {selectedIds.length > 0 && (
        <View style={styles.bottomBar}>
          <View style={styles.selectedCountRow}>
            <Text style={styles.selectedCountText}>
              {formatNum(selectedIds.length)} {l('Selected', 'জন নির্বাচিত')} · {formatMoney(selectedTotalAmount)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.reminderBtn}
            onPress={() => router.push(`/(admin)/reminder?memberIds=${selectedIds.join(',')}`)}
            activeOpacity={0.85}
          >
            <Ionicons name="volume-medium-outline" size={18} color="#FFFFFF" />
            <Text style={styles.reminderBtnText}>{l('Send Reminder', 'রিমাইন্ডার পাঠান')}</Text>
          </TouchableOpacity>
        </View>
      )}
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
    fontSize: 18,
    color: '#1E293B',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  heroCard: {
    backgroundColor: '#DC2626',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  heroLabel: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 13,
    color: '#FEE2E2',
    marginBottom: 4,
  },
  heroAmount: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 32,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  heroSub: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#FECACA',
  },
  agingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  agingTitle: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 14,
    color: '#334155',
    marginBottom: 12,
  },
  agingBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  barSegment: {
    height: '100%',
  },
  agingColsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  agingCol: {
    flex: 1,
    alignItems: 'center',
  },
  colLabel: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  colCount: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#1E293B',
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterChipActive: {
    borderColor: '#0F766E',
    backgroundColor: '#CCFBF1',
  },
  filterChipText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 12,
    color: '#64748B',
  },
  filterChipTextActive: {
    fontFamily: 'HindSiliguri-Bold',
    color: '#0F766E',
  },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  selectAllText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 13,
    color: '#475569',
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
    marginBottom: 20,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  memberRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxBoxActive: {
    borderColor: '#0F766E',
    backgroundColor: '#0F766E',
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 16,
    color: '#0F766E',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#1E293B',
    marginBottom: 2,
  },
  monthsText: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: '#64748B',
  },
  amountText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#EA580C',
  },
  quickPayBtn: {
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  quickPayBtnText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 11,
    color: '#0F766E',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedCountRow: {
    flex: 1,
  },
  selectedCountText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 13,
    color: '#1E293B',
  },
  reminderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#134E4A',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  reminderBtnText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 13,
    color: '#FFFFFF',
  },
});
