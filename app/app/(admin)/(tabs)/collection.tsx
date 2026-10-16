import { useRemoteQuery } from '../../../src/hooks/useRemoteQuery';
import { RemoteDataState } from '../../../src/components/RemoteDataState';
import { fetchLedgerSummary } from '../../../src/lib/api';
import { emptyLedgerSummary, monthRange } from '../../../src/lib/ledger';
import { Card } from '../../../src/components/Card';
import { FAB } from '../../../src/components/FAB';
import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, StatusBar, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';

import { SegmentedControl } from '../../../src/components/SegmentedControl';
import { Avatar } from '../../../src/components/Avatar';
import { BENGALI_MONTHS_FULL, toBengaliDigits } from '../../../src/lib/bengali';
import { useSomitiStore, REMOTE } from '../../../src/store/somitiStore';
import { Member } from '../../../src/mocks/mockData';
import { useLanguage } from '../../../src/i18n/useLanguage';
import { recentMonths } from '../../../src/lib/months';
import { SelectModal } from '../../../src/components/SelectModal';

type FilterType = 'all' | 'paid' | 'due';

export default function CollectionScreen() {
  const router = useRouter();
  const members=useSomitiStore(s=>s.members);
  const transactions=useSomitiStore(s=>s.transactions);
  const localSummary=useSomitiStore(s=>s.ledgerSummary);
  const { l, formatMoney, formatNum } = useLanguage();

  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Use store members, fallback to mock members if store is empty
  const displayMembers = useMemo(() => (members), [members]);

  // Month calculations
  const [selectedMonth, setSelectedMonth] = useState(recentMonths(12)[0].key);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const summaryQuery=useRemoteQuery('summary:'+selectedMonth,()=>{const range=monthRange(selectedMonth);return fetchLedgerSummary(range.from,range.to)});
  const ledgerSummary=REMOTE ? summaryQuery.data || emptyLedgerSummary : localSummary;
  const _now = new Date(`${selectedMonth}-01T00:00:00`);
  const curMonth = _now.getMonth();
  const monthLabelEn = _now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const monthLabelBn = `${BENGALI_MONTHS_FULL[curMonth]} ${toBengaliDigits(_now.getFullYear())}`;

  // Member classification
  const activeMembers = useMemo(() => displayMembers.filter((m) => m.status !== 'inactive'), [displayMembers]);
  const memberCollection=(m:Member)=>REMOTE?Number(ledgerSummary.collections[m.id]||0):transactions.filter(t=>t.type==='deposit'&&t.memberId===m.id&&t.dateISO?.startsWith(selectedMonth)).reduce((sum,t)=>sum+t.amount,0);
  const isPaidThisMonth=(m:Member)=>memberCollection(m)>0;

  const paidMembers = activeMembers.filter(isPaidThisMonth);
  const dueMembers = activeMembers.filter((m) => !isPaidThisMonth(m));

  // Design-fidelity metrics matching PDF Page 7
  const collected = REMOTE ? Number(ledgerSummary.months.find(m=>m.month===selectedMonth)?.deposits||0) : transactions.filter(t=>t.type==='deposit' && t.dateISO?.slice(0,7)===selectedMonth).reduce((s,t)=>s+t.amount,0);

  const paidCount = paidMembers.length;
  const dueCount = dueMembers.length;

  // Segmented control tabs
  const tabOptions = useMemo(() => [
    { value: 'all' as FilterType, label: l('All', 'সব') },
    { value: 'paid' as FilterType, label: `${l('Paid', 'জমা')} ${formatNum(paidCount)}` },
    { value: 'due' as FilterType, label: `${l('No deposit', 'জমা নেই')} ${formatNum(dueCount)}` },
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
  }, [activeMembers, filter, searchQuery, selectedMonth, ledgerSummary, transactions]);

  // Subtitle builder for member rows
  const getMemberSubtitle=(m:Member)=>`${m.code} · ${formatMoney(memberCollection(m))}`;

  const handleMonthPress = () => setShowMonthPicker(true);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
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
            onPress={()=>router.push('/(admin)/deposit/new')}
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

      <RemoteDataState query={summaryQuery}><FlatList
        data={filteredMembers}
        keyExtractor={member=>member.id}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={7}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
        ListHeaderComponent={<>        {/* Month Selector Pill */}
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={l('Select Month', 'মাস নির্বাচন করুন')} accessibilityState={{ expanded: showMonthPicker }} style={styles.monthPill} onPress={handleMonthPress} activeOpacity={0.75}>
          <Ionicons name="calendar-outline" size={16} color={colors.text} />
          <Text style={styles.monthPillText}>{l(monthLabelEn, monthLabelBn)}</Text>
          <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Collection Summary Card */}
        <Card variant="surface" style={styles.summaryCard}>
          <View style={styles.summaryTop}>


            <View style={styles.summaryRight}>
              <Text style={styles.summarySubLabel}>{l('Collected', 'আদায় হয়েছে')}</Text>
              <Text style={styles.summaryAmount}>{formatMoney(collected)}</Text>
              
            </View>
          </View>

          {/* 3-Col Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statColLeft}>
              <Text style={styles.statLabel}>{l('Paid', 'জমা দিয়েছেন')}</Text>
              <Text style={styles.statValPrimary}>{formatNum(paidCount)} {l('members', 'জন')}</Text>
            </View>
            
            <View style={styles.statColRight}>
              <Text style={styles.statLabel}>{l('No deposit', 'জমা নেই')}</Text>
              <Text style={styles.statValWarning}>{formatNum(dueCount)} {l('members', 'জন')}</Text>
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

</>}
        renderItem={({item,index})=>{

            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.memberRow,
                  {backgroundColor:colors.surface},
                  index===0 && {borderTopLeftRadius:20,borderTopRightRadius:20},
                  index===filteredMembers.length-1 && {borderBottomLeftRadius:20,borderBottomRightRadius:20},
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
              </TouchableOpacity>
            );

        }}
        ListEmptyComponent={<View style={styles.emptyContainer}><Ionicons name="search-outline" size={32} color={colors.textSecondary}/><Text style={styles.emptyText}>{l('No members found','কোনো সদস্য পাওয়া যায়নি')}</Text></View>}
        ListFooterComponent={<View style={{marginTop:16}}>        <View style={{ height: 100 }} />
</View>}
      /></RemoteDataState>

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
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  statColLeft: {
    alignItems: 'flex-start',
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
});
