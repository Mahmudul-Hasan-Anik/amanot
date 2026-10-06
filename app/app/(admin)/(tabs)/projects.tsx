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
import { Ionicons } from '@expo/vector-icons';
import { useSomitiStore } from '../../../src/store/somitiStore';
import { useLanguage } from '../../../src/i18n/useLanguage';
import { AppModal } from '../../../src/components/AppModal';
import { toEnglishDigits } from '../../../src/lib/bengali';

const ALLOC_COLORS = ['#0F766E', '#14B8A6', '#5EEAD4', '#A7F3D0', '#CBD5E1'];

export default function ProjectsScreen() {
  const router = useRouter();
  const { projects, addProject, cashAccounts } = useSomitiStore();
  const [showNew, setShowNew] = useState(false);
  const [np, setNp] = useState({ name: '', type: '', location: '', manager: '', amount: '', startDate: '', expectedEnd: '' });
  const [npSource, setNpSource] = useState<'bank' | 'cash' | 'bkash'>('bank');
  const setField = (k: keyof typeof np) => (v: string) => setNp((x) => ({ ...x, [k]: v }));

  const handleCreateProject = () => {
    const amt = Number(toEnglishDigits(np.amount).replace(/[^\d]/g, '')) || 0;
    if (!np.name.trim()) {
      Alert.alert(l('Error', 'ত্রুটি'), l('Please enter project name', 'প্রজেক্টের নাম লিখুন'));
      return;
    }
    const accType = npSource === 'cash' ? 'cashier' : npSource;
    const acc = cashAccounts.find((a) => a.type === accType);
    if (amt > 0 && acc && acc.amount < amt) {
      Alert.alert(l('Insufficient balance', 'পর্যাপ্ত ব্যালেন্স নেই'), `${acc.name}: ${formatMoney(acc.amount)}`);
      return;
    }
    addProject({
      name: np.name.trim(),
      type: np.type.trim(),
      location: np.location.trim(),
      manager: np.manager.trim(),
      investedAmount: amt,
      startDate: np.startDate.trim(),
      expectedEnd: np.expectedEnd.trim(),
      paymentSource: npSource,
    });
    setShowNew(false);
    setNp({ name: '', type: '', location: '', manager: '', amount: '', startDate: '', expectedEnd: '' });
  };
  const { l, formatMoney, formatNum } = useLanguage();

  const [filter, setFilter] = useState<'all' | 'ongoing' | 'delayed' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const totalInvested = useMemo(() => {
    return projects.reduce((sum, p) => sum + p.investedAmount, 0);
  }, [projects]);

  const totalProfit = useMemo(() => {
    return projects.reduce((sum, p) => sum + p.netProfit, 0);
  }, [projects]);

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (filter !== 'all' && p.status !== filter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        return p.name.toLowerCase().includes(query) || p.type.toLowerCase().includes(query);
      }
      return true;
    });
  }, [projects, filter, searchQuery]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F7F2" />

      {/* Screen Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{l('Projects', 'প্রজেক্ট')}</Text>
          <Text style={styles.headerSubtitle}>
            {formatNum(projects.length)} {l('projects ·', 'টি প্রজেক্টে')} {formatMoney(totalInvested)}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.searchBtn}
          onPress={() => setShowSearch(!showSearch)}
          activeOpacity={0.7}
        >
          <Ionicons name="search" size={20} color="#1E293B" />
        </TouchableOpacity>
      </View>

      {/* Search Input Box */}
      {showSearch && (
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder={l('Search by project name...', 'প্রজেক্টের নাম দিয়ে খুঁজুন...')}
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
        {/* Top Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.topStatsRow}>
            <View>
              <Text style={styles.statLabel}>{l('Total Investment', 'মোট বিনিয়োগ')}</Text>
              <Text style={styles.statAmountInvest}>{formatMoney(totalInvested)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.statLabel}>{l('Profit This Year', 'এ বছর লাভ')}</Text>
              <Text style={styles.statAmountProfit}>
                {formatMoney(totalProfit, { showPlusSign: true })}
              </Text>
            </View>
          </View>

          <Text style={styles.allocLabel}>{l('Fund Allocation', 'মোট তহবিলের বণ্টন')}</Text>

          {/* Allocation Multi-Segment Bar */}
          <View style={styles.allocBar}>
            {projects.map((p, idx) => {
              const flexVal = totalInvested > 0 ? Math.max(10, Math.round((p.investedAmount / totalInvested) * 100)) : 25;
              return (
                <View
                  key={p.id}
                  style={[
                    styles.allocSegment,
                    { flex: flexVal, backgroundColor: ALLOC_COLORS[idx % ALLOC_COLORS.length] },
                  ]}
                />
              );
            })}
          </View>

          {/* Legend Items */}
          <View style={styles.legendRow}>
            {projects.slice(0, 4).map((p, idx) => (
              <View key={p.id} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: ALLOC_COLORS[idx % ALLOC_COLORS.length] }]} />
                <Text style={styles.legendText}>{p.name.split(':')[0].trim()}</Text>
              </View>
            ))}
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
              {l('All', 'সব')} {formatNum(projects.length)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filter === 'ongoing' && styles.filterChipActive]}
            onPress={() => setFilter('ongoing')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterText, filter === 'ongoing' && styles.filterTextActive]}>
              {l('Ongoing', 'চলমান')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filter === 'delayed' && styles.filterChipActive]}
            onPress={() => setFilter('delayed')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterText, filter === 'delayed' && styles.filterTextActive]}>
              {l('Delayed', 'বিলম্বিত')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filter === 'completed' && styles.filterChipActive]}
            onPress={() => setFilter('completed')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterText, filter === 'completed' && styles.filterTextActive]}>
              {l('Completed', 'সমাপ্ত')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Projects List */}
        <View style={styles.projectsList}>
          {filteredProjects.map((project) => {
            const isProfit = project.netProfit >= 0;
            const profitRoiText = isProfit
              ? `+${formatMoney(project.netProfit)} · ${formatNum(project.roiPct)}%`
              : `−${formatMoney(Math.abs(project.netProfit))} · −${formatNum(Math.abs(project.roiPct))}%`;

            return (
              <TouchableOpacity
                key={project.id}
                style={styles.projectCard}
                onPress={() => router.push(`/(admin)/project/${project.id}`)}
                activeOpacity={0.8}
              >
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{project.name}</Text>
                    <Text style={styles.cardSub}>
                      {project.type} · {project.location} · {l('Manager:', 'দায়িত্বে:')} {project.manager}
                    </Text>
                  </View>

                  {project.status === 'ongoing' ? (
                    <View style={styles.ongoingBadge}>
                      <Text style={styles.ongoingBadgeText}>{l('Ongoing', 'চলমান')}</Text>
                    </View>
                  ) : project.status === 'delayed' ? (
                    <View style={styles.delayedBadge}>
                      <Text style={styles.delayedBadgeText}>{l('Delayed', 'বিলম্বিত')}</Text>
                    </View>
                  ) : (
                    <View style={[styles.ongoingBadge, { backgroundColor: '#E0F2FE' }]}>
                      <Text style={[styles.ongoingBadgeText, { color: '#0369A1' }]}>{l('Completed', 'সমাপ্ত')}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.metricsRow}>
                  <View style={styles.metricCol}>
                    <Text style={styles.metricLabel}>{l('Investment', 'বিনিয়োগ')}</Text>
                    <Text style={styles.metricValue}>{formatMoney(project.investedAmount)}</Text>
                  </View>

                  <View style={styles.metricCol}>
                    <Text style={styles.metricLabel}>{l('Return', 'ফেরত')}</Text>
                    <Text style={styles.metricValue}>{formatMoney(project.returnedAmount)}</Text>
                  </View>

                  <View style={[styles.metricCol, { alignItems: 'flex-end' }]}>
                    <Text style={styles.metricLabel}>{l('P&L · ROI', 'লাভ-ক্ষতি · ROI')}</Text>
                    <Text
                      style={[
                        styles.metricValue,
                        isProfit ? styles.profitText : styles.lossText,
                      ]}
                    >
                      {profitRoiText}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}

          {filteredProjects.length === 0 && (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Ionicons name="briefcase-outline" size={32} color="#94A3B8" />
              <Text style={{ fontFamily: 'HindSiliguri-Regular', color: '#64748B', marginTop: 8 }}>
                {l('No projects found', 'কোনো প্রজেক্ট পাওয়া যায়নি')}
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB: + নতুন প্রজেক্ট */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowNew(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={20} color="#FFFFFF" />
        <Text style={styles.fabText}>{l('New Project', 'নতুন প্রজেক্ট')}</Text>
      </TouchableOpacity>
      <AppModal visible={showNew} onClose={() => setShowNew(false)}>
        <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
          <Text style={{ fontFamily: 'HindSiliguri-Bold', fontSize: 18, color: '#1E293B', marginBottom: 12 }}>
            {l('New Project', 'নতুন প্রজেক্ট')}
          </Text>
          {([
            ['name', l('Project name *', 'প্রজেক্টের নাম *'), l('e.g. Fish farm', 'যেমন: মাছ চাষ')],
            ['type', l('Type', 'ধরন'), l('Land / Rent / Agriculture', 'জমি / ভাড়া / কৃষি')],
            ['location', l('Location', 'অবস্থান'), ''],
            ['manager', l('Manager', 'দায়িত্বপ্রাপ্ত'), ''],
            ['amount', l('Investment amount (৳)', 'বিনিয়োগের পরিমাণ (৳)'), '0'],
            ['startDate', l('Start', 'শুরু'), l('e.g. October 2026', 'যেমন: অক্টোবর ২০২৬')],
            ['expectedEnd', l('Expected end', 'সম্ভাব্য সমাপ্তি'), ''],
          ] as const).map(([key, label, ph]) => (
            <View key={key} style={{ marginBottom: 10 }}>
              <Text style={{ fontFamily: 'HindSiliguri-Medium', fontSize: 13, color: '#64748B', marginBottom: 4 }}>{label}</Text>
              <TextInput
                value={(np as any)[key]}
                onChangeText={setField(key as any)}
                placeholder={ph}
                placeholderTextColor="#94A3B8"
                keyboardType={key === 'amount' ? 'numeric' : 'default'}
                style={{
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 9,
                  fontFamily: 'HindSiliguri-Regular',
                  fontSize: 15,
                  color: '#1E293B',
                }}
              />
            </View>
          ))}
          <Text style={{ fontFamily: 'HindSiliguri-Medium', fontSize: 13, color: '#64748B', marginBottom: 6 }}>
            {l('Money taken from', 'টাকা যাবে কোথা থেকে')}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            {(['bank', 'cash', 'bkash'] as const).map((src) => (
              <TouchableOpacity
                key={src}
                onPress={() => setNpSource(src)}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderRadius: 10,
                  paddingVertical: 8,
                  alignItems: 'center',
                  borderColor: npSource === src ? '#0F766E' : '#E2E8F0',
                  backgroundColor: npSource === src ? '#CCFBF1' : '#FFFFFF',
                }}
              >
                <Text style={{ fontFamily: 'HindSiliguri-SemiBold', fontSize: 13, color: '#1E293B' }}>
                  {src === 'bank' ? l('Bank', 'ব্যাংক') : src === 'cash' ? l('Cash', 'হাতে নগদ') : l('bKash', 'বিকাশ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            onPress={handleCreateProject}
            style={{ backgroundColor: '#0F766E', borderRadius: 999, paddingVertical: 12, alignItems: 'center' }}
          >
            <Text style={{ fontFamily: 'HindSiliguri-SemiBold', fontSize: 15, color: '#FFFFFF' }}>{l('Create Project', 'প্রজেক্ট তৈরি করুন')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </AppModal>
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
  searchContainer: {
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
    marginBottom: 12,
  },
  statLabel: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  statAmountInvest: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 20,
    color: '#1E293B',
  },
  statAmountProfit: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 20,
    color: '#059669',
  },
  allocLabel: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
  },
  allocBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    gap: 2,
    marginBottom: 10,
  },
  allocSegment: {
    height: '100%',
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: '#64748B',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#EAEBE6',
  },
  filterChipActive: {
    backgroundColor: '#1E293B',
  },
  filterText: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 12,
    color: '#64748B',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  projectsList: {
    gap: 10,
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
    marginBottom: 12,
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
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  ongoingBadgeText: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 11,
    color: '#0F766E',
  },
  delayedBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  delayedBadgeText: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 11,
    color: '#DC2626',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
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
