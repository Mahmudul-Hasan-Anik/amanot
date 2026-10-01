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

interface ProjectItem {
  id: string;
  title: string;
  category: string;
  location: string;
  status: 'ongoing' | 'delayed' | 'completed';
  invested: string;
  returned: string;
  profitRoi: string;
  isProfit: boolean;
}

const PROJECTS: ProjectItem[] = [
  {
    id: '1',
    title: 'সাইট এ: জমি প্রকল্প',
    category: 'জমি',
    location: '[স্থান]',
    status: 'ongoing',
    invested: '৳১৫,০০,০০০',
    returned: '৳৪,২০,০০০',
    profitRoi: '+৳১,৮০,০০০ · ১২%',
    isProfit: true,
  },
  {
    id: '2',
    title: 'দোকান ভাড়া প্রকল্প',
    category: 'ভাড়া',
    location: '[স্থান]',
    status: 'ongoing',
    invested: '৳১০,২০,০০০',
    returned: '৳২,৪০,০০০',
    profitRoi: '+৳৬২,০০০ · ৬%',
    isProfit: true,
  },
  {
    id: '3',
    title: 'পোল্ট্রি খামার',
    category: 'কৃষি',
    location: '[স্থান]',
    status: 'ongoing',
    invested: '৳৮,০০,০০০',
    returned: '৳৫,৬০,০০০',
    profitRoi: '+৳১,১০,০০০ · ১৪%',
    isProfit: true,
  },
  {
    id: '4',
    title: 'সাইট বি: নির্মাণ',
    category: 'নির্মাণ',
    location: '[স্থান]',
    status: 'delayed',
    invested: '৳৬,০০,০০০',
    returned: '৳০',
    profitRoi: '−৳৪০,০০০ · −৭%',
    isProfit: false,
  },
];

export default function ProjectsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'ongoing' | 'delayed' | 'completed'>('all');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F7F2" />

      {/* Screen Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>প্রজেক্ট</Text>
          <Text style={styles.headerSubtitle}>৪টি প্রজেক্টে ৳৩৯,২০,০০০</Text>
        </View>

        <TouchableOpacity style={styles.searchBtn} activeOpacity={0.7}>
          <Ionicons name="search" size={20} color="#1E293B" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Top Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.topStatsRow}>
            <View>
              <Text style={styles.statLabel}>মোট বিনিয়োগ</Text>
              <Text style={styles.statAmountInvest}>৳৩৯,২০,০০০</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.statLabel}>এ বছর লাভ</Text>
              <Text style={styles.statAmountProfit}>+৳৩,১২,০০০</Text>
            </View>
          </View>

          <Text style={styles.allocLabel}>মোট তহবিলের বণ্টন</Text>

          {/* Allocation Multi-Segment Bar */}
          <View style={styles.allocBar}>
            <View style={[styles.allocSegment, { flex: 38, backgroundColor: '#0F766E' }]} />
            <View style={[styles.allocSegment, { flex: 26, backgroundColor: '#14B8A6' }]} />
            <View style={[styles.allocSegment, { flex: 20, backgroundColor: '#5EEAD4' }]} />
            <View style={[styles.allocSegment, { flex: 15, backgroundColor: '#A7F3D0' }]} />
            <View style={[styles.allocSegment, { flex: 19, backgroundColor: '#CBD5E1' }]} />
          </View>

          {/* Legend Items */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#0F766E' }]} />
              <Text style={styles.legendText}>সাইট এ</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#14B8A6' }]} />
              <Text style={styles.legendText}>দোকান</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#5EEAD4' }]} />
              <Text style={styles.legendText}>পোল্ট্রি</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#A7F3D0' }]} />
              <Text style={styles.legendText}>সাইট বি</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#CBD5E1' }]} />
              <Text style={styles.legendText}>অলস টাকা</Text>
            </View>
          </View>
        </View>

        {/* Filter Chips Row */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
            onPress={() => setFilter('all')}
            activeOpacity={0.8}
          >
            {filter === 'all' && <Ionicons name="checkmark" size={14} color="#0F766E" />}
            <Text style={[styles.filterChipText, filter === 'all' && styles.filterChipTextActive]}>
              সব ৪
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filter === 'ongoing' && styles.filterChipActive]}
            onPress={() => setFilter('ongoing')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, filter === 'ongoing' && styles.filterChipTextActive]}>
              চলমান ৩
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filter === 'delayed' && styles.filterChipActive]}
            onPress={() => setFilter('delayed')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, filter === 'delayed' && styles.filterChipTextActive]}>
              বিলম্বিত ১
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filter === 'completed' && styles.filterChipActive]}
            onPress={() => setFilter('completed')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, filter === 'completed' && styles.filterChipTextActive]}>
              সমাপ্ত ০
            </Text>
          </TouchableOpacity>
        </View>

        {/* Project Cards List */}
        <View style={styles.projectsList}>
          {PROJECTS.map((project) => (
            <TouchableOpacity
              key={project.id}
              style={styles.projectCard}
              onPress={() => router.push(`/(admin)/project/${project.id}`)}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardTitle}>{project.title}</Text>
                  <Text style={styles.cardSub}>
                    {project.category} · {project.location}
                  </Text>
                </View>

                {project.status === 'ongoing' ? (
                  <View style={styles.ongoingBadge}>
                    <Text style={styles.ongoingBadgeText}>চলমান</Text>
                  </View>
                ) : (
                  <View style={styles.delayedBadge}>
                    <Text style={styles.delayedBadgeText}>বিলম্বিত</Text>
                  </View>
                )}
              </View>

              <View style={styles.metricsRow}>
                <View style={styles.metricCol}>
                  <Text style={styles.metricLabel}>বিনিয়োগ</Text>
                  <Text style={styles.metricValue}>{project.invested}</Text>
                </View>

                <View style={styles.metricCol}>
                  <Text style={styles.metricLabel}>ফেরত</Text>
                  <Text style={styles.metricValue}>{project.returned}</Text>
                </View>

                <View style={[styles.metricCol, { alignItems: 'flex-end' }]}>
                  <Text style={styles.metricLabel}>লাভ-ক্ষতি · ROI</Text>
                  <Text
                    style={[
                      styles.metricValue,
                      project.isProfit ? styles.profitText : styles.lossText,
                    ]}
                  >
                    {project.profitRoi}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB: + নতুন প্রজেক্ট */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(admin)/project/1')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={20} color="#FFFFFF" />
        <Text style={styles.fabText}>নতুন প্রজেক্ট</Text>
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
  searchBtn: {
    padding: 6,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  summaryCard: {
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
  topStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statLabel: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  statAmountInvest: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 22,
    color: '#1E293B',
  },
  statAmountProfit: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 22,
    color: '#059669',
  },
  allocLabel: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
  },
  allocBar: {
    height: 8,
    borderRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 10,
  },
  allocSegment: {
    height: '100%',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: '#475569',
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
  projectsList: {
    gap: 12,
  },
  projectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  cardTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 16,
    color: '#1E293B',
  },
  cardSub: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  ongoingBadge: {
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ongoingBadgeText: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 11,
    color: '#0F766E',
  },
  delayedBadge: {
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  delayedBadgeText: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 11,
    color: '#C2410C',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    paddingTop: 10,
  },
  metricCol: {
    flex: 1,
  },
  metricLabel: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
  },
  metricValue: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 13,
    color: '#1E293B',
  },
  profitText: {
    color: '#059669',
  },
  lossText: {
    color: '#DC2626',
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
