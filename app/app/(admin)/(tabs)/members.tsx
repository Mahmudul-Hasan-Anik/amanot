import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../src/theme/colors';
import { Card } from '../../../src/components/Card';
import { SearchBar } from '../../../src/components/SearchBar';
import { Member } from '../../../src/mocks/mockData';
import { useSomitiStore } from '../../../src/store/somitiStore';
import { useLanguage } from '../../../src/i18n/useLanguage';

type FilterType = 'all' | 'active' | 'due' | 'inactive';

export default function MembersScreen() {
  const router = useRouter();
  const { members } = useSomitiStore();
  const { l, formatMoney, formatNum } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      if (activeFilter === 'active' && m.status === 'inactive') return false;
      if (activeFilter === 'due' && m.status !== 'due' && m.status !== 'partial') return false;
      if (activeFilter === 'inactive' && m.status !== 'inactive') return false;

      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase().trim();
        return (
          m.name.toLowerCase().includes(query) ||
          m.code.toLowerCase().includes(query) ||
          m.phone.includes(query)
        );
      }
      return true;
    });
  }, [members, searchQuery, activeFilter]);

  const renderMemberItem = ({ item }: { item: Member }) => {
    let tagBg = '#DCFCE7';
    let tagColor = colors.success;
    let tagLabel = l('Paid ✓', 'জমা ✓');

    if (item.status === 'due') {
      if (item.dueMonths >= 3) {
        tagBg = '#FEE2E2';
        tagColor = colors.danger;
        tagLabel = l(`${item.dueMonths} mo due`, `${formatNum(item.dueMonths)} মাস বকেয়া`);
      } else {
        tagBg = '#FEF3C7';
        tagColor = colors.warning;
        tagLabel = l(`${item.dueMonths || 1} mo due`, `${formatNum(item.dueMonths || 1)} মাস বকেয়া`);
      }
    } else if (item.status === 'partial') {
      tagBg = '#FFEDD5';
      tagColor = '#EA580C';
      tagLabel = l('Partial', 'আংশিক');
    } else if (item.status === 'inactive') {
      tagBg = '#F1F5F9';
      tagColor = colors.textMuted;
      tagLabel = l('Inactive', 'নিষ্ক্রিয়');
    }

    return (
      <TouchableOpacity
        onPress={() => router.push(`/(admin)/member/${item.id}`)}
        activeOpacity={0.7}
      >
        <Card style={styles.memberCard}>
          <View style={styles.memberLeft}>
            <View
              style={[
                styles.avatarCircle,
                item.status === 'inactive' && { backgroundColor: '#F1F5F9' },
              ]}
            >
              <Text
                style={[
                  styles.avatarText,
                  item.status === 'inactive' && { color: colors.textMuted },
                ]}
              >
                {item.name.charAt(0)}
              </Text>
            </View>

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
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{l('Members', 'সদস্য')}</Text>
          <Text style={styles.headerSubtitle}>
            {formatNum(members.length)} {l('members ·', 'জন ·')} {formatNum(members.filter((m) => m.status !== 'inactive').length)} {l('active', 'সক্রিয়')}
          </Text>
        </View>

        <TouchableOpacity style={styles.menuBtn} activeOpacity={0.7}>
          <Ionicons name="ellipsis-vertical" size={20} color={colors.textMain} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Search */}
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={l('Name, ID or phone number', 'নাম, আইডি বা ফোন নম্বর')}
        />

        {/* Filter Chips */}
        <View style={styles.filtersRow}>
          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'all' && styles.filterChipActive]}
            onPress={() => setActiveFilter('all')}
          >
            <Text style={[styles.filterText, activeFilter === 'all' && styles.filterTextActive]}>
              {activeFilter === 'all' ? '✓ ' : ''}{l('All', 'সব')} {formatNum(members.length)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'active' && styles.filterChipActive]}
            onPress={() => setActiveFilter('active')}
          >
            <Text style={[styles.filterText, activeFilter === 'active' && styles.filterTextActive]}>
              {l('Active', 'সক্রিয়')} {formatNum(members.filter((m) => m.status !== 'inactive').length)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'due' && styles.filterChipActive]}
            onPress={() => setActiveFilter('due')}
          >
            <Text style={[styles.filterText, activeFilter === 'due' && styles.filterTextActive]}>
              {l('Due', 'বকেয়া')} {formatNum(members.filter((m) => m.status === 'due' || m.status === 'partial').length)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'inactive' && styles.filterChipActive]}
            onPress={() => setActiveFilter('inactive')}
          >
            <Text style={[styles.filterText, activeFilter === 'inactive' && styles.filterTextActive]}>
              {l('Inactive', 'নিষ্ক্রিয়')} {formatNum(members.filter((m) => m.status === 'inactive').length)}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sort & Filter Bar */}
        <View style={styles.sortFilterBar}>
          <Text style={styles.sortText}>{l('Sorted by name', 'নাম অনুযায়ী সাজানো')}</Text>
          <TouchableOpacity style={styles.filterBtn}>
            <Ionicons name="filter-outline" size={14} color={colors.textMuted} />
            <Text style={styles.filterBtnText}>{l('Filter', 'ফিল্টার')}</Text>
          </TouchableOpacity>
        </View>

        {/* Member List */}
        <FlatList
          data={filteredMembers}
          keyExtractor={(item) => item.id}
          renderItem={renderMemberItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />
      </View>

      {/* Floating Action Button: + নতুন সদস্য */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(admin)/member/new')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={20} color="#FFFFFF" />
        <Text style={styles.fabText}>{l('New Member', 'নতুন সদস্য')}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
    backgroundColor: colors.background,
  },
  headerTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 24,
    color: colors.textMain,
  },
  headerSubtitle: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 13,
    color: colors.textMuted,
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
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: '#CCFBF1',
    borderColor: '#99F6E4',
  },
  filterText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 12,
    color: colors.textMain,
  },
  filterTextActive: {
    color: colors.primary,
    fontFamily: 'HindSiliguri-Bold',
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
    fontSize: 12,
    color: colors.textMuted,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  filterBtnText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 12,
    color: colors.textMuted,
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
  },
  memberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 18,
    color: colors.primary,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 15,
    color: colors.textMain,
  },
  memberCodeAndRate: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  statusTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusTagText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 12,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    gap: 6,
  },
  fabText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
});
