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
import { colors } from '../../../src/theme/colors';

type FilterType = 'all' | 'paid' | 'due';

interface CollectionMember {
  id: string;
  name: string;
  initial: string;
  avatarBg: string;
  avatarColor: string;
  subtitle: string;
  isPaid: boolean;
}

const COLLECTION_MEMBERS: CollectionMember[] = [
  {
    id: '1',
    name: 'আনোয়ার হোসেন',
    initial: 'আ',
    avatarBg: '#E0F2FE',
    avatarColor: '#0284C7',
    subtitle: '৳৩,০০০ · ৫ সেপ্টে · ব্যাংক',
    isPaid: true,
  },
  {
    id: '2',
    name: 'করিম উদ্দিন',
    initial: 'ক',
    avatarBg: '#CCFBF1',
    avatarColor: '#0F766E',
    subtitle: '৳২,০০০ + আগস্ট বকেয়া',
    isPaid: false,
  },
  {
    id: '3',
    name: 'জাহিদ হাসান',
    initial: 'জ',
    avatarBg: '#DCFCE7',
    avatarColor: '#16A34A',
    subtitle: '৳২,৫০০ · ৩ সেপ্টে · বিকাশ',
    isPaid: true,
  },
  {
    id: '4',
    name: 'নাসরিন আক্তার',
    initial: 'ন',
    avatarBg: '#FEF3C7',
    avatarColor: '#D97706',
    subtitle: '৳৫০০ জমা · ৳১,০০০ বাকি',
    isPaid: false,
  },
  {
    id: '5',
    name: 'মাহমুদা খাতুন',
    initial: 'ম',
    avatarBg: '#E0F2FE',
    avatarColor: '#0284C7',
    subtitle: '৳২,০০০ · ২ সেপ্টে · হাতে নগদ',
    isPaid: true,
  },
  {
    id: '6',
    name: 'রফিকুল ইসলাম',
    initial: 'র',
    avatarBg: '#FEE2E2',
    avatarColor: '#DC2626',
    subtitle: 'জুলাই থেকে বকেয়া',
    isPaid: false,
  },
  {
    id: '7',
    name: 'শাহানা পারভীন',
    initial: 'শ',
    avatarBg: '#EDE9FE',
    avatarColor: '#7C3AED',
    subtitle: '৳১,০০০ · ৯ সেপ্টে · নগদ',
    isPaid: true,
  },
];

export default function CollectionScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredMembers = useMemo(() => {
    return COLLECTION_MEMBERS.filter((m) => {
      if (filter === 'paid') return m.isPaid;
      if (filter === 'due') return !m.isPaid;
      return true;
    });
  }, [filter]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F7F2" />

      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>মাসিক আদায়</Text>
          <Text style={styles.headerSubtitle}>সেপ্টেম্বর ২০২৬</Text>
        </View>

        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
            <Ionicons name="search" size={20} color="#1E293B" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
            <Ionicons name="ellipsis-vertical" size={20} color="#1E293B" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Month Selector Pill */}
        <TouchableOpacity style={styles.monthPill} activeOpacity={0.8}>
          <Ionicons name="calendar-outline" size={16} color="#1E293B" />
          <Text style={styles.monthPillText}>সেপ্টেম্বর ২০২৬</Text>
          <Ionicons name="chevron-down" size={16} color="#64748B" />
        </TouchableOpacity>

        {/* Progress Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            {/* 78% Circle Ring */}
            <View style={styles.ringOuter}>
              <View style={styles.ringInner}>
                <Text style={styles.ringText}>৭৮%</Text>
              </View>
            </View>

            <View style={styles.summaryRight}>
              <Text style={styles.summarySubLabel}>আদায় হয়েছে</Text>
              <Text style={styles.summaryAmount}>৳১,৬৪,০০০</Text>
              <Text style={styles.summaryTarget}>লক্ষ্য ৳২,১০,০০০</Text>
            </View>
          </View>

          {/* 3-Col Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>জমা দিয়েছেন</Text>
              <Text style={styles.statValDark}>৭৮ জন</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>আংশিক</Text>
              <Text style={styles.statValAmber}>৪ জন</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>বকেয়া</Text>
              <Text style={styles.statValRed}>১৮ জন</Text>
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
              সব
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filter === 'paid' && styles.filterChipActive]}
            onPress={() => setFilter('paid')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterText, filter === 'paid' && styles.filterTextActive]}>
              জমা ৭৮
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filter === 'due' && styles.filterChipActive]}
            onPress={() => setFilter('due')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterText, filter === 'due' && styles.filterTextActive]}>
              বকেয়া ২২
            </Text>
          </TouchableOpacity>
        </View>

        {/* Members Collection List */}
        <View style={styles.membersCard}>
          {filteredMembers.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.memberRow,
                index < filteredMembers.length - 1 && styles.memberRowBorder,
              ]}
            >
              <View
                style={[styles.avatarCircle, { backgroundColor: item.avatarBg }]}
              >
                <Text style={[styles.avatarText, { color: item.avatarColor }]}>
                  {item.initial}
                </Text>
              </View>

              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{item.name}</Text>
                <Text style={styles.memberSub}>{item.subtitle}</Text>
              </View>

              {item.isPaid ? (
                <View style={styles.paidBadge}>
                  <Text style={styles.paidBadgeText}>জমা</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.payBtn}
                  onPress={() => router.push('/(admin)/deposit/new')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.payBtnText}>জমা নিন</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* Reminder Card Button */}
        <TouchableOpacity
          style={styles.reminderCard}
          onPress={() => router.push('/(admin)/reminder')}
          activeOpacity={0.8}
        >
          <Ionicons name="megaphone-outline" size={18} color="#1E293B" />
          <Text style={styles.reminderCardText}>বকেয়া সদস্যদের রিমাইন্ডার পাঠান</Text>
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
        <Text style={styles.fabText}>জমা নিন</Text>
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
    backgroundColor: '#E6F4F1',
  },
  ringInner: {
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 13,
    color: '#64748B',
  },
  summaryAmount: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 26,
    color: '#134E4A',
    lineHeight: 32,
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
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  statLabel: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  statValDark: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 15,
    color: '#1E293B',
  },
  statValAmber: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 15,
    color: '#D97706',
  },
  statValRed: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 15,
    color: '#DC2626',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  filterText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 13,
    color: '#475569',
  },
  filterTextActive: {
    fontFamily: 'HindSiliguri-Bold',
    color: '#1E293B',
  },
  membersCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
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
  },
  memberRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 16,
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
    marginTop: 1,
  },
  paidBadge: {
    backgroundColor: '#E2E8F0',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  paidBadgeText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 12,
    color: '#475569',
  },
  payBtn: {
    backgroundColor: '#CCFBF1',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  payBtnText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 12,
    color: '#0F766E',
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 24,
    paddingVertical: 12,
    gap: 8,
  },
  reminderCardText: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 14,
    color: '#1E293B',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 18,
    backgroundColor: '#134E4A',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 26,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  fabText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
});
