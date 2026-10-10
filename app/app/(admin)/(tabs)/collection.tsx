import { Card } from '../../../src/components/Card';
import { FAB } from '../../../src/components/FAB';
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { ProgressRing } from '../../../src/components/ProgressRing';
import { SegmentedControl } from '../../../src/components/SegmentedControl';
import { Avatar } from '../../../src/components/Avatar';
import { BENGALI_MONTHS_FULL, toBengaliDigits } from '../../../src/lib/bengali';
import { useSomitiStore, REMOTE } from '../../../src/store/somitiStore';
import { Member, mockMembers } from '../../../src/mocks/mockData';
import { useLanguage } from '../../../src/i18n/useLanguage';
import { recentMonths } from '../../../src/lib/months';
import { SelectModal } from '../../../src/components/SelectModal';

type FilterType = 'all' | 'paid' | 'due';

export default function CollectionScreen() {
  const router = useRouter();
  const { members, transactions, ledgerSummary } = useSomitiStore();
  const { l, formatMoney, formatNum } = useLanguage();

  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Use store members, fallback to mock members if store is empty
  const displayMembers = useMemo(() => (members), [members]);

  // Month calculations
  const [selectedMonth, setSelectedMonth] = useState(recentMonths(12)[0].key);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const _now = new Date(`${selectedMonth}-01T00:00:00`);
  const curMonth = _now.getMonth();
  const monthLabelEn = _now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const monthLabelBn = `${BENGALI_MONTHS_FULL[curMonth]} ${toBengaliDigits(_now.getFullYear())}`;

  // Member classification
  const activeMembers = useMemo(() => displayMembers.filter((m) => m.status !== 'inactive'), [displayMembers]);
  const isPaidThisMonth = (m: Member) => m.paymentMonths ? m.paymentMonths[selectedMonth] === 'paid' : (_now.getFullYear()===new Date().getFullYear() && m.monthsStatus?.[curMonth] === 'paid');

  const paidMembers = activeMembers.filter(isPaidThisMonth);
  const dueMembers = activeMembers.filter((m) => !isPaidThisMonth(m));
  const partialMembers = useMemo(() => activeMembers.filter((m) => m.status === 'partial'), [activeMembers]);

  // Design-fidelity metrics matching PDF Page 7
  const target = activeMembers.reduce((s,m)=>s+m.monthlyAmount,0);
  const collected = REMOTE ? Number(ledgerSummary.months.find(m=>m.month===selectedMonth)?.deposits||0) : transactions.filter(t=>t.type==='deposit' && t.dateISO?.slice(0,7)===selectedMonth).reduce((s,t)=>s+t.amount,0);
  const percent = target>0 ? Math.min(100, Math.round(collected/target*100)) : 0;

  const paidCount = paidMembers.length;
  const partialCount = dueMembers.filter(m=>Number(m.partialCredit||0)>0 || m.status==='partial').length;
  const unpaidCount = dueMembers.length - partialCount;
  const dueCount = dueMembers.length;

  // Segmented control tabs
  const tabOptions = useMemo(() => [
    { value: 'all' as FilterType, label: l('All', 'সব') },
    { value: 'paid' as FilterType, label: `${l('Paid', 'জমা')} ${formatNum(paidCount)}` },
    { value: 'due' as FilterType, label: `${l('Due', 'বকেয়া')} ${formatNum(dueCount)}` },
  ], [l, formatNum, paidCount, dueCount]);

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return activeMembers.filter((m) => {
      const isPaid = isPaidThisMonth(m);
      if (filter === 'paid' && !isPaid) return false;
      if (filter === 'due' && isPaid) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = (m.name || '').toLowerCase().includes(query) || (m.nameEn || '').toLowerCase().includes(query);
        const matchesCode = (m.code || '').toLowerCase().includes(query);
        const matchesPhone = (m.phone || '').includes(query);
        return matchesName || matchesCode || matchesPhone;
      }
      return true;
    });
  }, [activeMembers, filter, searchQuery, selectedMonth]);

  // Subtitle builder for member rows
  const getMemberSubtitle = (item: Member) => {
    if (isPaidThisMonth(item)) {
      return `${formatMoney(item.monthlyAmount)} · ${l('Paid', 'জমা')}`;
    }
    if (item.status === 'partial') {
      const paidPart = Math.max(0, item.monthlyAmount - (item.dueAmount || 0));
      return `${formatMoney(paidPart)} ${l('Paid', 'জমা')} · ${formatMoney(item.dueAmount || 0)} ${l('Due', 'বাকি')}`;
    }
    if (item.dueMonths > 1) {
      return `${formatMoney(item.monthlyAmount)} + ${formatNum(item.dueMonths - 1)} ${l('months due', 'মাসের বকেয়া')}`;
    }
    return `${formatMoney(item.monthlyAmount)} · ${l('Due', 'বকেয়া')}`;
  };

  const handleMonthPress = () => setShowMonthPicker(true);

  const handleMorePress = () => {
    Alert.alert(
      l('Collection Options', 'আদায় অপশন'),
      undefined,
      [
        { text: l('Send Due Reminders', 'বকেয়া রিমাইন্ডার পাঠান'), onPress: () => router.push('/(admin)/reminder') },
        { text: l('View Due List', 'বকেয়া তালিকা দেখুন'), onPress: () => router.push('/(admin)/due') },
        { text: l('Cancel', 'বাতিল'), style: 'cancel' },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{l('Monthly Collection', 'মাসিক আদায়')}</Text>
          <Text style={styles.headerSubtitle}>{l(monthLabelEn, monthLabelBn)}</Text>
        </View>

        <View style={styles.headerIcons}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setShowSearch(!showSearch)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="search-outline" size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={handleMorePress}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar Toggle */}
      {showSearch && (
        <View style={styles.searchBarContainer}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder={l('Search by member name or code...', 'সদস্যের নাম বা কোড দিয়ে খুঁজুন...')}
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Month Selector Pill */}
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={l('Select Month', 'মাস নির্বাচন করুন')} accessibilityState={{ expanded: showMonthPicker }} style={styles.monthPill} onPress={handleMonthPress} activeOpacity={0.75}>
          <Ionicons name="calendar-outline" size={16} color={colors.text} />
          <Text style={styles.monthPillText}>{l(monthLabelEn, monthLabelBn)}</Text>
          <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Collection Summary Card */}
        <Card variant="surface" style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <ProgressRing
              progress={percent}
              size={80}
              strokeWidth={8}
              color={colors.primary}
              backgroundColor={colors.primarySoft}
            />

            <View style={styles.summaryRight}>
              <Text style={styles.summarySubLabel}>{l('Collected', 'আদায় হয়েছে')}</Text>
              <Text style={styles.summaryAmount}>{formatMoney(collected)}</Text>
              <Text style={styles.summaryTarget}>{l('Target at current member rates', 'বর্তমান সদস্য হারে লক্ষ্য')} {formatMoney(target)}</Text>
            </View>
          </View>

          {/* 3-Col Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statColLeft}>
              <Text style={styles.statLabel}>{l('Paid', 'জমা দিয়েছেন')}</Text>
              <Text style={styles.statValPrimary}>{formatNum(paidCount)} {l('members', 'জন')}</Text>
            </View>
            <View style={styles.statColCenter}>
              <Text style={styles.statLabel}>{l('Partial', 'আংশিক')}</Text>
              <Text style={styles.statValWarning}>{formatNum(partialCount)} {l('members', 'জন')}</Text>
            </View>
            <View style={styles.statColRight}>
              <Text style={styles.statLabel}>{l('Due', 'বকেয়া')}</Text>
              <Text style={styles.statValWarning}>{formatNum(unpaidCount)} {l('members', 'জন')}</Text>
            </View>
          </View>
        </Card>

        {/* Segmented Filter Control */}
        <View style={styles.filterWrapper}>
          <SegmentedControl
            options={tabOptions}
            selectedValue={filter}
            onSelect={(val) => setFilter(val as FilterType)}
          />
        </View>

        {/* Members Collection List Card */}
        <View style={styles.membersCard}>
          {filteredMembers.map((item, index) => {
            const isPaid = isPaidThisMonth(item);

            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.memberRow,
                  index < filteredMembers.length - 1 && styles.memberRowBorder,
                ]}
                onPress={() => router.push(`/(admin)/member/${item.id}`)}
                activeOpacity={0.7}
              >
                <Avatar
                  name={item.name}
                  size="md"
                  index={index}
                />

                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{l(item.nameEn || item.name, item.name)}</Text>
                  <Text style={styles.memberSub}>{getMemberSubtitle(item)}</Text>
                </View>

                {isPaid ? (
                  <View style={styles.paidBadge}>
                    <Text style={styles.paidBadgeText}>{l('Paid', 'জমা')}</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.payBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      router.push(`/(admin)/deposit/new?memberId=${item.id}`);
                    }}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.payBtnText}>{l('Deposit', 'জমা নিন')}</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          })}

          {filteredMembers.length === 0 && (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={32} color={colors.textSecondary} />
              <Text style={styles.emptyText}>
                {l('No members found', 'কোনো সদস্য পাওয়া যায়নি')}
              </Text>
            </View>
          )}
        </View>

        {/* Outlined Reminder Button */}
        <TouchableOpacity
          style={styles.reminderCard}
          onPress={() => router.push('/(admin)/reminder')}
          activeOpacity={0.75}
        >
          <Ionicons name="megaphone-outline" size={18} color={colors.text} />
          <Text style={styles.reminderCardText}>
            {l('Send reminder to due members', 'বকেয়া সদস্যদের রিমাইন্ডার পাঠান')}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Action Button (FAB) */}
      <FAB label={l('Deposit', 'জমা নিন')} onPress={() => router.push('/(admin)/deposit/new')} />
      <SelectModal
        visible={showMonthPicker}
        title={l('Select Month', 'মাস নির্বাচন করুন')}
        value={selectedMonth}
        options={recentMonths(12).map(month => ({ value: month.key, label: l(month.en, month.bn) }))}
        onSelect={setSelectedMonth}
        onClose={() => setShowMonthPicker(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  summaryCard: { borderRadius: 20, padding: 20, marginBottom: 16, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xxl,
    lineHeight: typography.lineHeight.xxl,
    color: colors.text,
  },
  headerSubtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.textSecondary,
    marginTop: -2,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    padding: 6,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.subhead,
    color: colors.text,
    padding: 0,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  monthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 9999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    gap: 8,
    marginBottom: 16,
  },
  monthPillText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  summaryRight: {
    flex: 1,
  },
  summarySubLabel: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  summaryAmount: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.headline,
    lineHeight: typography.lineHeight.headline,
    color: colors.text,
  },
  summaryTarget: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.textSecondary,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  statColLeft: {
    alignItems: 'flex-start',
  },
  statColCenter: {
    alignItems: 'center',
  },
  statColRight: {
    alignItems: 'flex-end',
  },
  statLabel: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  statValPrimary: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.base,
    lineHeight: typography.lineHeight.base,
    color: colors.primary,
  },
  statValWarning: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.base,
    lineHeight: typography.lineHeight.base,
    color: colors.warning,
  },
  filterWrapper: {
    marginBottom: 16,
  },
  membersCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: 6,
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
    marginRight: 10,
  },
  memberName: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.text,
  },
  memberSub: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.textSecondary,
    marginTop: 3,
  },
  paidBadge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paidBadgeText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.primary,
  },
  payBtn: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payBtnText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.primary,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.subhead,
    color: colors.textSecondary,
    marginTop: 8,
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 9999,
    paddingVertical: 14,
    gap: 8,
    marginBottom: 20,
  },
  reminderCardText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    color: colors.text,
  },
});
