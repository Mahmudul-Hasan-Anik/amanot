import { FAB } from '../../../src/components/FAB';
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { Card } from '../../../src/components/Card';
import { Avatar } from '../../../src/components/Avatar';
import { SearchBar } from '../../../src/components/SearchBar';
import { FilterChip } from '../../../src/components/FilterChip';
import { Member } from '../../../src/mocks/mockData';
import { useSomitiStore } from '../../../src/store/somitiStore';
import { useLanguage } from '../../../src/i18n/useLanguage';
import { SelectModal } from '../../../src/components/SelectModal';
import { toEnglishDigits } from '../../../src/lib/money';

type FilterType = 'all' | 'active' | 'due' | 'inactive';

export default function MembersScreen() {
  const router = useRouter();
  const members = useSomitiStore(s => s.members);
  const { l, formatMoney, formatNum, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [showFilter, setShowFilter] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const sortOptions = [
    { value: 'name', label: l('Name', 'নাম') },
    { value: 'code', label: l('Member ID', 'সদস্য আইডি') },
    { value: 'due', label: l('Highest dues first', 'বেশি বকেয়া আগে') },
  ];

  // Aggregated totals matching Somiti level counts
  const totalCount = members.length;
  const activeCount = members.filter((m) => m.status !== 'inactive').length;
  const dueCount = members.filter((m) => m.dueAmount > 0).length;
  const inactiveCount = members.filter((m) => m.status === 'inactive').length;

  const filteredMembers = useMemo(() => {
    const query = toEnglishDigits(searchQuery).toLowerCase().trim();
    return members.filter((m) => {
      if (activeFilter === 'active' && m.status === 'inactive') return false;
      if (activeFilter === 'due' && m.dueAmount <= 0) return false;
      if (activeFilter === 'inactive' && m.status !== 'inactive') return false;

      if (query.length > 0) {
        return (
          toEnglishDigits(m.name).toLowerCase().includes(query) ||
          toEnglishDigits(m.code).toLowerCase().includes(query) ||
          toEnglishDigits(m.phone).includes(query)
        );
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'due' && a.dueAmount !== b.dueAmount) return b.dueAmount - a.dueAmount;
      if (sortBy === 'code') return a.code.localeCompare(b.code, 'en', { numeric: true });
      return a.name.localeCompare(b.name, language);
    });
  }, [members, searchQuery, activeFilter, sortBy, language]);

  const renderMemberItem = ({ item, index }: { item: Member; index: number }) => {
    let tagBg = colors.primarySoft;
    let tagColor = colors.primary;
    let tagLabel = l('Paid ✓', 'জমা ✓');

    if (item.status === 'due') {
      tagBg = colors.warningSoft;
      tagColor = colors.warning;
      tagLabel = l(`${item.dueMonths || 1} mo due`, `${formatNum(item.dueMonths || 1)} মাস বকেয়া`);
    } else if (item.status === 'partial') {
      tagBg = colors.warningSoft;
      tagColor = colors.warning;
      tagLabel = l('Partial', 'আংশিক');
    } else if (item.status === 'inactive') {
      tagBg = colors.surfaceMuted;
      tagColor = colors.textSecondary;
      tagLabel = l('Inactive', 'নিষ্ক্রিয়');
    }

    return (
      <TouchableOpacity
        onPress={() => router.push(`/(admin)/member/${item.id}`)}
        activeOpacity={0.7}
      >
        <Card style={styles.memberCard}>
          <View style={styles.memberLeft}>
            <Avatar photoUri={item.photoUri} name={item.name} size="md" index={index} />

            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{item.name}</Text>
              <Text style={styles.memberCodeAndRate}>
                {item.code} · {formatMoney(item.monthlyAmount)}
              </Text>
            </View>
          </View>

          <View style={[styles.statusTag, { backgroundColor: tagBg }]}>
            <Text style={[styles.statusTagText, { color: tagColor }]}>
              {tagLabel}
            </Text>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{l('Members', 'সদস্য')}</Text>
          <Text style={styles.headerSubtitle}>
            {formatNum(totalCount)} {l('members ·', 'জন ·')} {formatNum(activeCount)} {l('active', 'সক্রিয়')}
          </Text>
        </View>

        <TouchableOpacity style={styles.menuBtn} accessibilityRole="button" accessibilityLabel={l('Sort members', 'সদস্য সাজান')} onPress={() => setShowSort(true)} activeOpacity={0.7}>
          <Ionicons name="swap-vertical" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Search Bar - Pill in surfaceMuted */}
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={l('Name, ID or phone number', 'নাম, আইডি বা ফোন নম্বর')}
        />

        {/* Filter Chips Horizontal Row */}
        <View style={styles.filtersWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersRow}
          >
            <FilterChip
              label={l('All', 'সব')}
              count={formatNum(totalCount)}
              selected={activeFilter === 'all'}
              onPress={() => setActiveFilter('all')}
            />
            <FilterChip
              label={l('Active', 'সক্রিয়')}
              count={formatNum(activeCount)}
              selected={activeFilter === 'active'}
              onPress={() => setActiveFilter('active')}
            />
            <FilterChip
              label={l('Due', 'বকেয়া')}
              count={formatNum(dueCount)}
              selected={activeFilter === 'due'}
              onPress={() => setActiveFilter('due')}
            />
            <FilterChip
              label={l('Inactive', 'নিষ্ক্রিয়')}
              count={formatNum(inactiveCount)}
              selected={activeFilter === 'inactive'}
              onPress={() => setActiveFilter('inactive')}
            />
          </ScrollView>
        </View>

        {/* Sort & Filter Bar */}
        <View style={styles.sortFilterBar}>
          <TouchableOpacity accessibilityRole="button" onPress={() => setShowSort(true)}>
            <Text style={styles.sortText}>{l('Sort: ', 'সাজানো: ')}{sortOptions.find(option => option.value === sortBy)?.label}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterBtn} accessibilityRole="button" onPress={() => setShowFilter(true)} activeOpacity={0.7}>
            <Ionicons name="funnel-outline" size={13} color={colors.textSecondary} />
            <Text style={styles.filterBtnText}>{l('Filter', 'ফিল্টার')}</Text>
          </TouchableOpacity>
        </View>

        {/* Member List */}
        <FlatList
          data={filteredMembers}
          keyExtractor={(item) => item.id}
          renderItem={renderMemberItem}
          initialNumToRender={10}
          windowSize={7}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<Text style={styles.sortText}>{l('No matching members', 'কোনো সদস্য পাওয়া যায়নি')}</Text>}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />
      </View>

      {/* Floating Action Button: + নতুন সদস্য */}
      <FAB label={l('New Member', 'নতুন সদস্য')} onPress={() => router.push('/(admin)/member/new')} />
      <SelectModal visible={showSort} title={l('Sort members', 'সদস্য সাজান')} value={sortBy} options={sortOptions} onSelect={setSortBy} onClose={() => setShowSort(false)} />
      <SelectModal visible={showFilter} title={l('Filter members', 'সদস্য বাছাই করুন')} value={activeFilter}
        options={[{value:'all',label:l('All','সব')},{value:'active',label:l('Active','সক্রিয়')},{value:'due',label:l('Due','বকেয়া')},{value:'inactive',label:l('Inactive','নিষ্ক্রিয়')}]}
        onSelect={value => setActiveFilter(value as FilterType)} onClose={() => setShowFilter(false)} />
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
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
    backgroundColor: colors.bg,
  },
  headerTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: typography.size.xxl,
    lineHeight: typography.lineHeight.xxl,
    color: colors.text,
  },
  headerSubtitle: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  menuBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  filtersWrapper: {
    marginBottom: 8,
  },
  filtersRow: {
    flexDirection: 'row',
    paddingVertical: 2,
  },
  sortFilterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  sortText: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.textSecondary,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  filterBtnText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.textSecondary,
  },
  listContainer: {
    paddingBottom: 90,
  },
  memberCard: {
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  memberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: typography.size.base,
    lineHeight: typography.lineHeight.base,
    color: colors.text,
  },
  memberCodeAndRate: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusTag: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTagText: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    fontWeight: '600',
  },
});
