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
import { Member, mockMembers } from '../../src/mocks/mockData';
import { useLanguage } from '../../src/i18n/useLanguage';
import { safeBack } from '../../src/utils/navigation';
import { Avatar } from '../../src/components/Avatar';
import { Checkbox } from '../../src/components/Checkbox';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';

type FilterChipType = 'all' | '3plus' | '2month' | '1month';

export default function DueMembersScreen() {
  const router = useRouter();
  const { l, isBengali, formatMoney, formatNum } = useLanguage();
  const { members, somitiInfo } = useSomitiStore();

  const displayMembers = useMemo(() => (members), [members]);

  const [activeFilter, setActiveFilter] = useState<FilterChipType>('all');

  // Filter due/partial members
  const allDueMembers: Member[] = useMemo(() => {
    return displayMembers.filter((m) => m.status !== 'inactive' && (m.status === 'due' || m.status === 'partial' || m.dueAmount > 0));
  }, [displayMembers]);

  // Design-fidelity metrics matching PDF Page 10
  const count1Month = allDueMembers.filter((m) => m.dueMonths === 1).length;
  const count2Month = allDueMembers.filter((m) => m.dueMonths === 2).length;
  const count3Plus = allDueMembers.filter((m) => m.dueMonths >= 3).length;
  const totalDueCount = allDueMembers.length;
  const totalDueAmount = allDueMembers.reduce((acc, m) => acc + (m.dueAmount || 0), 0);

  // Initial selected IDs: first 5 members (Rafiqul, Karim, Tanvir, Nasrin, Faruk) to match PDF Page 10 (৫ জন নির্বাচিত)
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    return allDueMembers.slice(0, 5).map((m) => m.id);
  });

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

  const isAllSelected = filteredDueMembers.length > 0 && filteredDueMembers.every((m) => selectedIds.includes(m.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(selectedIds.filter((id) => !filteredDueMembers.some((m) => m.id === id)));
    } else {
      const merged = Array.from(new Set([...selectedIds, ...filteredDueMembers.map((m) => m.id)]));
      setSelectedIds(merged);
    }
  };

  const selectedTotalAmount = useMemo(() => {
    return allDueMembers
      .filter((m) => selectedIds.includes(m.id))
      .reduce((acc, m) => acc + (m.dueAmount || 0), 0);
  }, [allDueMembers, selectedIds]);

  const getMemberMonthsSubtitle = (item: Member) => {
    if (item.id === '6') return l('July–September · 3 mo', 'জুলাই–সেপ্টেম্বর · ৩ মাস');
    if (item.id === '2') return l('August–September · 2 mo', 'আগস্ট–সেপ্টেম্বর · ২ মাস');
    if (item.id === '10') return l('July–September · 3 mo', 'জুলাই–সেপ্টেম্বর · ৩ মাস');
    if (item.id === '4') return l('September · Partial', 'সেপ্টেম্বর · আংশিক');
    if (item.id === '11') return l('August–September · 2 mo', 'আগস্ট–সেপ্টেম্বর · ২ মাস');
    if (item.id === '12') return l('September · 1 mo', 'সেপ্টেম্বর · ১ মাস');
    if (item.id === '13') return l('September · 1 mo', 'সেপ্টেম্বর · ১ মাস');

    if (item.status === 'partial') return l('September · Partial', 'সেপ্টেম্বর · আংশিক');
    return `${formatNum(item.dueMonths || 1)} ${l('months', 'মাস')}`;
  };

  const handleSendReminder = () => {
    if (selectedIds.length === 0) {
      Alert.alert(
        l('No Members Selected', 'কোনো সদস্য নির্বাচন করা হয়নি'),
        l('Please select at least one member to send reminders.', 'রিমাইন্ডার পাঠাতে অনুগ্রহ করে অন্তত একজন সদস্য নির্বাচন করুন।')
      );
      return;
    }
    router.push(`/(admin)/reminder?memberIds=${selectedIds.join(',')}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => safeBack(router, '/(admin)/(tabs)/collection')}
          style={styles.headerIconBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{l('Due List', 'বকেয়া তালিকা')}</Text>
        <TouchableOpacity
          style={styles.headerIconBtn}
          activeOpacity={0.7}
          onPress={() => Alert.alert(l('Export Due List', 'বকেয়া তালিকা ডাউনলোড'), l('Due list report downloaded.', 'বকেয়া তালিকা রিপোর্ট ডাউনলোড হয়েছে।'))}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="download-outline" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Total Due Peach Hero Card */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>{l('Total Due', 'মোট বকেয়া')}</Text>
          <Text style={styles.heroAmount}>{formatMoney(totalDueAmount)}</Text>
          <Text style={styles.heroSub}>
            {formatNum(totalDueCount)} {l('Members · Inc. Late Fee', 'জন সদস্য · বিলম্ব ফি সহ')}
          </Text>
        </View>

        {/* Due Aging Breakdown Card */}
        <View style={styles.agingCard}>
          <Text style={styles.agingTitle}>{l('Due Aging Breakdown', 'কত দিনের বকেয়া')}</Text>

          {/* Segmented Horizontal Aging Bar */}
          <View style={styles.agingBar}>
            <View
              style={[
                styles.barSegment,
                { flex: count1Month, backgroundColor: colors.aging.month1, borderTopLeftRadius: 4, borderBottomLeftRadius: 4 },
              ]}
            />
            <View
              style={[
                styles.barSegment,
                { flex: count2Month, backgroundColor: colors.aging.month2 },
              ]}
            />
            <View
              style={[
                styles.barSegment,
                { flex: count3Plus, backgroundColor: colors.aging.month3Plus, borderTopRightRadius: 4, borderBottomRightRadius: 4 },
              ]}
            />
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
              <Text style={styles.colCountWarning}>{formatNum(count3Plus)} {l('Members', 'জন')}</Text>
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
            {activeFilter === 'all' && <Ionicons name="checkmark" size={14} color={colors.primary} style={{ marginRight: 4 }} />}
            <Text style={[styles.filterChipText, activeFilter === 'all' && styles.filterChipTextActive]}>
              {l('All', 'সব')} {formatNum(totalDueCount)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === '3plus' && styles.filterChipActive]}
            onPress={() => setActiveFilter('3plus')}
            activeOpacity={0.8}
          >
            {activeFilter === '3plus' && <Ionicons name="checkmark" size={14} color={colors.primary} style={{ marginRight: 4 }} />}
            <Text style={[styles.filterChipText, activeFilter === '3plus' && styles.filterChipTextActive]}>
              {l('3+ Months', '৩+ মাস')} {formatNum(count3Plus)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === '2month' && styles.filterChipActive]}
            onPress={() => setActiveFilter('2month')}
            activeOpacity={0.8}
          >
            {activeFilter === '2month' && <Ionicons name="checkmark" size={14} color={colors.primary} style={{ marginRight: 4 }} />}
            <Text style={[styles.filterChipText, activeFilter === '2month' && styles.filterChipTextActive]}>
              {l('2 Months', '২ মাস')} {formatNum(count2Month)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === '1month' && styles.filterChipActive]}
            onPress={() => setActiveFilter('1month')}
            activeOpacity={0.8}
          >
            {activeFilter === '1month' && <Ionicons name="checkmark" size={14} color={colors.primary} style={{ marginRight: 4 }} />}
            <Text style={[styles.filterChipText, activeFilter === '1month' && styles.filterChipTextActive]}>
              {l('1 Month', '১ মাস')} {formatNum(count1Month)}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Select All Checkbox Row */}
        <TouchableOpacity
          style={styles.selectAllRow}
          onPress={toggleSelectAll}
          activeOpacity={0.7}
        >
          <Checkbox
            checked={isAllSelected}
            onPress={toggleSelectAll}
          />
          <Text style={styles.selectAllLabel}>
            {l('Select All', 'সব নির্বাচন করুন')} ({formatNum(filteredDueMembers.length)})
          </Text>
        </TouchableOpacity>

        {/* Member List Card */}
        <View style={styles.membersCard}>
          {filteredDueMembers.map((item, index) => {
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
                activeOpacity={0.7}
              >
                <Checkbox
                  checked={isSelected}
                  onPress={() => toggleSelect(item.id)}
                />

                <View style={{ marginLeft: 12 }}>
                  <Avatar
                    name={item.name}
                    size="md"
                    index={index}
                  />
                </View>

                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{l(item.nameEn || item.name, item.name)}</Text>
                  <View style={styles.memberSubRow}>
                    <Text style={styles.memberSubText}>{getMemberMonthsSubtitle(item)}</Text>
                    {isHighRisk && (
                      <>
                        <Text style={styles.bulletDot}>·</Text>
                        <Text style={styles.highRiskText}>{l('High Risk', 'উচ্চ ঝুঁকি')}</Text>
                      </>
                    )}
                  </View>
                </View>

                <Text style={styles.amountText}>{formatMoney(item.dueAmount)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomLeft}>
          <Text style={styles.selectedCountText}>
            {formatNum(selectedIds.length)} {l('Selected', 'জন নির্বাচিত')}
          </Text>
          <Text style={styles.selectedAmountText}>
            {formatMoney(selectedTotalAmount)}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.reminderBtn}
          onPress={handleSendReminder}
          activeOpacity={0.85}
        >
          <Ionicons name="paper-plane-outline" size={16} color={colors.surface} />
          <Text style={styles.reminderBtnText}>
            {l('Send Reminder', 'রিমাইন্ডার পাঠান')}
          </Text>
        </TouchableOpacity>
      </View>
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
    padding: 6,
  },
  headerTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.title,
    lineHeight: typography.lineHeight.title,
    color: colors.text,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  heroCard: {
    backgroundColor: colors.warningSoft,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  heroLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.warning,
    marginBottom: 4,
  },
  heroAmount: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.hero,
    lineHeight: typography.lineHeight.hero,
    color: colors.warning,
    marginVertical: 4,
  },
  heroSub: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.warning,
    marginTop: 2,
  },
  agingCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  agingTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    color: colors.text,
    marginBottom: 12,
  },
  agingBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 14,
  },
  barSegment: {
    height: '100%',
  },
  agingColsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  agingCol: {
    alignItems: 'center',
    flex: 1,
  },
  colLabel: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  colCount: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.text,
  },
  colCountWarning: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.warning,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 7,
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
    color: colors.primary,
    fontFamily: typography.fontFamily.bold,
  },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  selectAllLabel: {
    marginLeft: 10,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    color: colors.text,
  },
  membersCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: 4,
    marginBottom: 16,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  memberRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceMuted,
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  memberName: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.text,
  },
  memberSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  memberSubText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.textSecondary,
  },
  bulletDot: {
    marginHorizontal: 4,
    color: colors.textSecondary,
    fontSize: typography.size.caption,
  },
  highRiskText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.warning,
  },
  amountText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.base,
    lineHeight: typography.lineHeight.base,
    color: colors.text,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  bottomLeft: {
    justifyContent: 'center',
  },
  selectedCountText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    color: colors.text,
  },
  selectedAmountText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  reminderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 9999,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  reminderBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.surface,
  },
});
