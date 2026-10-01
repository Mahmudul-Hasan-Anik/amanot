import React, { useState } from 'react';
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

interface DueMemberItem {
  id: string;
  name: string;
  initial: string;
  avatarBg: string;
  avatarColor: string;
  monthsText: string;
  isHighRisk?: boolean;
  amount: string;
}

const DUE_MEMBERS: DueMemberItem[] = [
  {
    id: '1',
    name: 'রফিকুল ইসলাম',
    initial: 'র',
    avatarBg: '#E0F2FE',
    avatarColor: '#0284C7',
    monthsText: 'জুলাই–সেপ্টেম্বর · ৩ মাস · উচ্চ ঝুঁকি',
    isHighRisk: true,
    amount: '৳৬,৩০০',
  },
  {
    id: '2',
    name: 'করিম উদ্দিন',
    initial: 'ক',
    avatarBg: '#CCFBF1',
    avatarColor: '#0F766E',
    monthsText: 'আগস্ট–সেপ্টেম্বর · ২ মাস',
    amount: '৳৪,১০০',
  },
  {
    id: '3',
    name: 'তানভীর আহমেদ',
    initial: 'ত',
    avatarBg: '#E0F2FE',
    avatarColor: '#0284C7',
    monthsText: 'জুলাই–সেপ্টেম্বর · ৩ মাস · উচ্চ ঝুঁকি',
    isHighRisk: true,
    amount: '৳৯,৩০০',
  },
  {
    id: '4',
    name: 'নাসরিন আক্তার',
    initial: 'ন',
    avatarBg: '#CCFBF1',
    avatarColor: '#0F766E',
    monthsText: 'সেপ্টেম্বর · আংশিক',
    amount: '৳১,০০০',
  },
  {
    id: '5',
    name: 'ফারুক হোসেন',
    initial: 'ফ',
    avatarBg: '#FCE7F3',
    avatarColor: '#DB2777',
    monthsText: 'আগস্ট–সেপ্টেম্বর · ২ মাস',
    amount: '৳৫,২০০',
  },
  {
    id: '6',
    name: 'লাইলা বেগম',
    initial: 'ল',
    avatarBg: '#EDE9FE',
    avatarColor: '#7C3AED',
    monthsText: 'সেপ্টেম্বর · ১ মাস',
    amount: '৳১,৫০০',
  },
  {
    id: '7',
    name: 'সাইফুল ইসলাম',
    initial: 'স',
    avatarBg: '#EDE9FE',
    avatarColor: '#7C3AED',
    monthsText: 'সেপ্টেম্বর · ১ মাস',
    amount: '৳২,০০০',
  },
];

export default function DueListScreen() {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>(['1', '2', '3', '4', '5']);
  const [activeFilter, setActiveFilter] = useState<'all' | '3plus' | '2month' | '1month'>('all');

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === DUE_MEMBERS.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(DUE_MEMBERS.map((m) => m.id));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F7F2" />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>বকেয়া তালিকা</Text>
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
          <Text style={styles.heroLabel}>মোট বকেয়া</Text>
          <Text style={styles.heroAmount}>৳৫৩,৫০০</Text>
          <Text style={styles.heroSub}>২২ জন সদস্য · বিলম্ব ফি সহ</Text>
        </View>

        {/* Due Aging Card */}
        <View style={styles.agingCard}>
          <Text style={styles.agingTitle}>কত দিনের বকেয়া</Text>

          {/* Segmented Horizontal Bar */}
          <View style={styles.agingBar}>
            <View style={[styles.barSegment, { flex: 12, backgroundColor: '#FDBA74' }]} />
            <View style={[styles.barSegment, { flex: 7, backgroundColor: '#EA580C' }]} />
            <View style={[styles.barSegment, { flex: 3, backgroundColor: '#7C2D12' }]} />
          </View>

          {/* 3 Columns */}
          <View style={styles.agingColsRow}>
            <View style={styles.agingCol}>
              <Text style={styles.colLabel}>১ মাস</Text>
              <Text style={styles.colCount}>১২ জন</Text>
            </View>
            <View style={styles.agingCol}>
              <Text style={styles.colLabel}>২ মাস</Text>
              <Text style={styles.colCount}>৭ জন</Text>
            </View>
            <View style={styles.agingCol}>
              <Text style={styles.colLabel}>৩+ মাস</Text>
              <Text style={styles.colCount}>৩ জন</Text>
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
              সব ২২
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === '3plus' && styles.filterChipActive]}
            onPress={() => setActiveFilter('3plus')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, activeFilter === '3plus' && styles.filterChipTextActive]}>
              ৩+ মাস ৩
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === '2month' && styles.filterChipActive]}
            onPress={() => setActiveFilter('2month')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, activeFilter === '2month' && styles.filterChipTextActive]}>
              ২ মাস ৭
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === '1month' && styles.filterChipActive]}
            onPress={() => setActiveFilter('1month')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, activeFilter === '1month' && styles.filterChipTextActive]}>
              ১ মাস ১২
            </Text>
          </TouchableOpacity>
        </View>

        {/* Select All Checkbox */}
        <TouchableOpacity
          style={styles.selectAllRow}
          onPress={toggleSelectAll}
          activeOpacity={0.8}
        >
          <View style={[styles.checkboxBox, selectedIds.length === DUE_MEMBERS.length && styles.checkboxBoxActive]}>
            {selectedIds.length === DUE_MEMBERS.length && (
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            )}
          </View>
          <Text style={styles.selectAllText}>সব নির্বাচন করুন (২২)</Text>
        </TouchableOpacity>

        {/* Members List Card */}
        <View style={styles.listCard}>
          {DUE_MEMBERS.map((item, index) => {
            const isSelected = selectedIds.includes(item.id);
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.memberRow,
                  index < DUE_MEMBERS.length - 1 && styles.memberRowBorder,
                ]}
                onPress={() => toggleSelect(item.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.checkboxBox, isSelected && styles.checkboxBoxActive]}>
                  {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                </View>

                <View style={[styles.avatarCircle, { backgroundColor: item.avatarBg }]}>
                  <Text style={[styles.avatarText, { color: item.avatarColor }]}>
                    {item.initial}
                  </Text>
                </View>

                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{item.name}</Text>
                  <Text
                    style={[
                      styles.memberSub,
                      item.isHighRisk && styles.highRiskText,
                    ]}
                  >
                    {item.monthsText}
                  </Text>
                </View>

                <Text style={styles.memberAmount}>{item.amount}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Bottom Bar */}
      <View style={styles.bottomDock}>
        <View>
          <Text style={styles.bottomSelectedCount}>৫ জন নির্বাচিত</Text>
          <Text style={styles.bottomSelectedSum}>৳২৫,৯০০</Text>
        </View>

        <TouchableOpacity
          style={styles.reminderBtn}
          onPress={() => router.push('/(admin)/reminder')}
          activeOpacity={0.85}
        >
          <Ionicons name="paper-plane-outline" size={18} color="#FFFFFF" />
          <Text style={styles.reminderBtnText}>রিমাইন্ডার পাঠান</Text>
        </TouchableOpacity>
      </View>
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
  heroCard: {
    backgroundColor: '#FFF7ED',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
  },
  heroLabel: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 13,
    color: '#9A3412',
  },
  heroAmount: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 32,
    color: '#9A3412',
    lineHeight: 38,
    marginVertical: 4,
  },
  heroSub: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 13,
    color: '#9A3412',
  },
  agingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  agingTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#1E293B',
    marginBottom: 10,
  },
  agingBar: {
    height: 10,
    borderRadius: 5,
    flexDirection: 'row',
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
  },
  colCount: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#1E293B',
    marginTop: 2,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#CCFBF1',
    borderWidth: 1,
    borderColor: '#99F6E4',
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
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  selectAllText: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 14,
    color: '#1E293B',
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
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
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxBoxActive: {
    backgroundColor: '#0F766E',
    borderColor: '#0F766E',
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
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
  highRiskText: {
    color: '#DC2626',
    fontFamily: 'HindSiliguri-Medium',
  },
  memberAmount: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 15,
    color: '#1E293B',
  },
  bottomDock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#F6F7F2',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomSelectedCount: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#1E293B',
  },
  bottomSelectedSum: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 12,
    color: '#64748B',
  },
  reminderBtn: {
    backgroundColor: '#134E4A',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    gap: 6,
  },
  reminderBtnText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
});
