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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSomitiStore } from '../../../src/store/somitiStore';
import { useLanguage } from '../../../src/i18n/useLanguage';

type FilterType = 'all' | 'paid' | 'due';

const AVATAR_COLORS = [
  { bg: '#E0F2FE', text: '#0284C7' },
  { bg: '#CCFBF1', text: '#0F766E' },
  { bg: '#DCFCE7', text: '#16A34A' },
  { bg: '#FEF3C7', text: '#D97706' },
  { bg: '#EDE9FE', text: '#7C3AED' },
  { bg: '#FEE2E2', text: '#DC2626' },
];

export default function CollectionScreen() {
  const router = useRouter();
  const { members, somitiInfo } = useSomitiStore();
  const { l, formatMoney, formatNum } = useLanguage();

  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Dynamic counts
  const paidMembers = useMemo(() => members.filter((m) => m.dueAmount === 0 || m.status === 'paid'), [members]);
  const dueMembers = useMemo(() => members.filter((m) => m.dueAmount > 0 || m.status === 'due'), [members]);
  const partialMembers = useMemo(() => members.filter((m) => m.status === 'partial'), [members]);

  const target = somitiInfo.monthlyTarget || 210000;
  const collected = somitiInfo.monthlyCollected || 0;
  const percent = Math.min(100, Math.round((collected / (target || 1)) * 100));

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const isPaid = m.dueAmount === 0 || m.status === 'paid';
      if (filter === 'paid' && !isPaid) return false;
      if (filter === 'due' && isPaid) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = m.name.toLowerCase().includes(query);
        const matchesCode = m.code.toLowerCase().includes(query);
        const matchesPhone = m.phone.includes(query);
        return matchesName || matchesCode || matchesPhone;
      }
      return true;
    });
  }, [members, filter, searchQuery]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F7F2" />

      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{l('Monthly Collection', 'মাসিক আদায়')}</Text>
          <Text style={styles.headerSubtitle}>{l('October 2026', 'অক্টোবর ২০২৬')}</Text>
        </View>

        <View style={styles.headerIcons}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setShowSearch(!showSearch)}
            activeOpacity={0.7}
          >
            <Ionicons name="search" size={20} color="#1E293B" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push('/(admin)/reminder')}
            activeOpacity={0.7}
          >
            <Ionicons name="megaphone-outline" size={20} color="#1E293B" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar Toggle */}
      {showSearch && (
        <View style={styles.searchBarContainer}>
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder={l('Search by member name or code...', 'সদস্যের নাম বা কোড দিয়ে খুঁজুন...')}
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Month Selector Pill */}
        <TouchableOpacity style={styles.monthPill} activeOpacity={0.8}>
          <Ionicons name="calendar-outline" size={16} color="#1E293B" />
          <Text style={styles.monthPillText}>{l('October 2026', 'অক্টোবর ২০২৬')}</Text>
          <Ionicons name="chevron-down" size={16} color="#64748B" />
        </TouchableOpacity>

        {/* Progress Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            {/* Dynamic % Circle Ring */}
            <View style={styles.ringOuter}>
              <View style={styles.ringInner}>
                <Text style={styles.ringText}>{formatNum(percent)}%</Text>
              </View>
            </View>

            <View style={styles.summaryRight}>
              <Text style={styles.summarySubLabel}>{l('Collected', 'আদায় হয়েছে')}</Text>
              <Text style={styles.summaryAmount}>{formatMoney(collected)}</Text>
              <Text style={styles.summaryTarget}>{l('Target', 'লক্ষ্য')} {formatMoney(target)}</Text>
            </View>
          </View>

          {/* 3-Col Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>{l('Paid', 'জমা দিয়েছেন')}</Text>
              <Text style={styles.statValDark}>{formatNum(paidMembers.length)} {l('members', 'জন')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>{l('Partial', 'আংশিক')}</Text>
              <Text style={styles.statValAmber}>{formatNum(partialMembers.length)} {l('members', 'জন')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>{l('Due', 'বকেয়া')}</Text>
              <Text style={styles.statValRed}>{formatNum(dueMembers.length)} {l('members', 'জন')}</Text>
            </View>
          </View>
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
            onPress={() => setFilter('all')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
              {l('All', 'সব')} {formatNum(members.length)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filter === 'paid' && styles.filterChipActive]}
            onPress={() => setFilter('paid')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterText, filter === 'paid' && styles.filterTextActive]}>
              {l('Paid', 'জমা')} {formatNum(paidMembers.length)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filter === 'due' && styles.filterChipActive]}
            onPress={() => setFilter('due')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterText, filter === 'due' && styles.filterTextActive]}>
              {l('Due', 'বকেয়া')} {formatNum(dueMembers.length)}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Members Collection List */}
        <View style={styles.membersCard}>
          {filteredMembers.map((item, index) => {
            const isPaid = item.dueAmount === 0 || item.status === 'paid';
            const colorTheme = AVATAR_COLORS[index % AVATAR_COLORS.length];
            const initial = item.name.trim().charAt(0) || 'স';

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
                <View
                  style={[styles.avatarCircle, { backgroundColor: colorTheme.bg }]}
                >
                  <Text style={[styles.avatarText, { color: colorTheme.text }]}>
                    {initial}
                  </Text>
                </View>

                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{item.name}</Text>
                  <Text style={styles.memberSub}>
                    {isPaid
                      ? `${formatMoney(item.monthlyAmount)} · ${l('Regular', 'নিয়মিত')}`
                      : `${formatMoney(item.dueAmount)} ${l('due', 'বাকি')} · ${formatNum(item.dueMonths || 1)} ${l('months', 'মাস')}`}
                  </Text>
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
                    activeOpacity={0.8}
                  >
                    <Text style={styles.payBtnText}>{l('Deposit', 'জমা নিন')}</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          })}

          {filteredMembers.length === 0 && (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Ionicons name="search-outline" size={32} color="#94A3B8" />
              <Text style={{ fontFamily: 'HindSiliguri-Regular', color: '#64748B', marginTop: 8 }}>
                {l('No members found', 'কোনো সদস্য পাওয়া যায়নি')}
              </Text>
            </View>
          )}
        </View>

        {/* Reminder Card Button */}
        <TouchableOpacity
          style={styles.reminderCard}
          onPress={() => router.push('/(admin)/reminder')}
          activeOpacity={0.8}
        >
          <Ionicons name="megaphone-outline" size={18} color="#1E293B" />
          <Text style={styles.reminderCardText}>
            {l(`Send reminder to due members (${dueMembers.length} members)`, `বকেয়া সদস্যদের রিমাইন্ডার পাঠান (${formatNum(dueMembers.length)} জন)`)}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(admin)/deposit/new')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={20} color="#FFFFFF" />
        <Text style={styles.fabText}>{l('Deposit', 'জমা নিন')}</Text>
      </TouchableOpacity>
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 22,
    color: '#1E293B',
  },
  headerSubtitle: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 13,
    color: '#64748B',
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
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 14,
    color: '#1E293B',
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    marginBottom: 14,
  },
  monthPillText: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 13,
    color: '#1E293B',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  ringOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 6,
    borderColor: '#134E4A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringInner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 16,
    color: '#134E4A',
  },
  summaryRight: {
    flex: 1,
  },
  summarySubLabel: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  summaryAmount: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 24,
    color: '#1E293B',
    lineHeight: 30,
  },
  summaryTarget: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
  },
  statValDark: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#1E293B',
  },
  statValAmber: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#D97706',
  },
  statValRed: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#DC2626',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#EAEBE6',
  },
  filterChipActive: {
    backgroundColor: '#1E293B',
  },
  filterText: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 13,
    color: '#64748B',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  membersCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  memberRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 15,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 15,
    color: '#1E293B',
  },
  memberSub: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  paidBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  paidBadgeText: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 12,
    color: '#16A34A',
  },
  payBtn: {
    backgroundColor: '#134E4A',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  payBtnText: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAEBE6',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    marginBottom: 16,
  },
  reminderCardText: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 14,
    color: '#1E293B',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#134E4A',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
    gap: 6,
  },
  fabText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },
});
