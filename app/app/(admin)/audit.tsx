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

interface AuditItem {
  id: string;
  header: string;
  title: string;
  sub: string;
  category: 'financial' | 'member' | 'settings';
}

const AUDIT_LOGS: AuditItem[] = [
  {
    id: '1',
    header: 'আজ ১১:৪২ · মাহমুদা খাতুন',
    title: 'জমা এন্ট্রি: করিম উদ্দিন ৳৪,১০০',
    sub: 'রসিদ #১০৮৮ · Android · Samsung A34',
    category: 'financial',
  },
  {
    id: '2',
    header: 'আজ ১০:২০ · মাহমুদা খাতুন',
    title: 'ব্যয় এন্ট্রি: সভার আপ্যায়ন ৳১২,৫০০',
    sub: 'অনুমোদনের অপেক্ষায়',
    category: 'financial',
  },
  {
    id: '3',
    header: 'গতকাল ৬:১৫ · জাহিদ হাসান',
    title: 'সংশোধন অনুরোধ: রসিদ #১০৭১',
    sub: '৳২,০০০ → ৳১,৫০০ · কারণ: ভুল পরিমাণ',
    category: 'financial',
  },
  {
    id: '4',
    header: '২৮ সেপ্টে · আনোয়ার হোসেন',
    title: 'সেটিংস: ব্যয় অনুমোদন সীমা',
    sub: '৳৫,০০০ → ৳১০,০০০',
    category: 'settings',
  },
  {
    id: '5',
    header: '২৫ সেপ্টে · জাহিদ হাসান',
    title: 'সদস্যের তথ্য: নাসরিন আক্তার',
    sub: 'মোবাইল নম্বর পরিবর্তন',
    category: 'member',
  },
  {
    id: '6',
    header: '১ জানু · আনোয়ার হোসেন',
    title: 'সেটিংস: রিজার্ভ ১০%, পরিচালক ১০%',
    sub: 'লক করা হয়েছে · অনুমোদন: জাহিদ হাসান',
    category: 'settings',
  },
];

export default function AuditLogScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'financial' | 'member' | 'settings'>('all');

  const filteredLogs = AUDIT_LOGS.filter((item) => {
    if (filter === 'all') return true;
    return item.category === filter;
  });

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
        <Text style={styles.headerTitle}>অডিট লগ</Text>
        <TouchableOpacity style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="filter-outline" size={20} color="#1E293B" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Guarantee Green Banner */}
        <View style={styles.guaranteeBanner}>
          <Ionicons name="checkmark" size={18} color="#0F766E" style={styles.guaranteeIcon} />
          <Text style={styles.guaranteeText}>
            এই লগ স্থায়ী। সভাপতিসহ কেউ এটি মুছতে বা পরিবর্তন করতে পারবেন না।
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
              সব
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filter === 'financial' && styles.filterChipActive]}
            onPress={() => setFilter('financial')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, filter === 'financial' && styles.filterChipTextActive]}>
              আর্থিক
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filter === 'member' && styles.filterChipActive]}
            onPress={() => setFilter('member')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, filter === 'member' && styles.filterChipTextActive]}>
              সদস্য
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filter === 'settings' && styles.filterChipActive]}
            onPress={() => setFilter('settings')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, filter === 'settings' && styles.filterChipTextActive]}>
              সেটিংস
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
    backgroundColor: '#CCFBF1',
    borderRadius: 14,
    padding: 12,
    gap: 8,
    alignItems: 'flex-start',
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
    paddingVertical: 6,
    paddingHorizontal: 16,
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
    fontSize: 13,
    color: '#64748B',
  },
  filterChipTextActive: {
    fontFamily: 'HindSiliguri-Bold',
    color: '#0F766E',
  },
  timelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
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
    width: 24,
    alignItems: 'center',
    marginRight: 10,
  },
  ringDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    borderColor: '#0F766E',
    backgroundColor: '#FFFFFF',
    marginTop: 2,
  },
  connectorLine: {
    flex: 1,
    width: 2,
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
