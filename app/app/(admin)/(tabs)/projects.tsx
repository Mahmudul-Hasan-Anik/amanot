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
import { mockProjects } from '../../../src/mocks/mockData';
import { useLanguage } from '../../../src/i18n/useLanguage';
import { AppModal } from '../../../src/components/AppModal';
import { toEnglishDigits } from '../../../src/lib/bengali';
import { colors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';

export default function ProjectsScreen() {
  const router = useRouter();
  const { projects, addProject, cashAccounts, somitiInfo } = useSomitiStore();
  const { l, isBengali, formatMoney, formatNum } = useLanguage();

  const [showNew, setShowNew] = useState(false);
  const [np, setNp] = useState({ name: '', type: '', location: '', manager: '', amount: '', startDate: '', expectedEnd: '' });
  const [npSource, setNpSource] = useState<'bank' | 'cash' | 'bkash'>('bank');
  const setField = (k: keyof typeof np) => (v: string) => setNp((x) => ({ ...x, [k]: v }));

  const displayProjects = useMemo(() => {
    return projects;
  }, [projects]);

  const [filter, setFilter] = useState<'all' | 'ongoing' | 'delayed' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const totalInvested = useMemo(() => {
    return displayProjects.reduce((sum, p) => sum + p.investedAmount, 0);
  }, [displayProjects]);

  const totalProfit = useMemo(() => {
    return displayProjects.reduce((sum, p) => sum + p.netProfit, 0);
  }, [displayProjects]);

  const ongoingCount = useMemo(() => displayProjects.filter((p) => p.status === 'ongoing').length, [displayProjects]);
  const delayedCount = useMemo(() => displayProjects.filter((p) => p.status === 'delayed').length, [displayProjects]);
  const completedCount = useMemo(() => displayProjects.filter((p) => p.status === 'completed').length, [displayProjects]);

  const filteredProjects = useMemo(() => {
    return displayProjects.filter((p) => {
      if (filter !== 'all' && p.status !== filter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        return p.name.toLowerCase().includes(query) || p.type.toLowerCase().includes(query);
      }
      return true;
    });
  }, [displayProjects, filter, searchQuery]);

  const handleCreateProject = async () => {
    try {
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
    await addProject({
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
    } catch(e:any) { Alert.alert(l('Save failed','সংরক্ষণ ব্যর্থ'),e.message); }
  };

  const allocSegments = [
    ...projects.map((p,i)=>({key:p.id,labelBn:p.name,labelEn:p.name,flex:Math.max(0,p.remainingAmount),color:[colors.chart.segment1,colors.chart.segment2,colors.chart.segment3,colors.chart.segment4][i%4]})),
    {key:'idle',labelBn:'নগদ ও ব্যাংক',labelEn:'Cash & bank',flex:cashAccounts.reduce((sum,a)=>sum+a.amount,0),color:colors.chart.idle},
  ].filter(s=>s.flex>0);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      {/* Screen Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{l('Projects', 'প্রজেক্ট')}</Text>
          <Text style={styles.headerSubtitle}>
            {formatNum(displayProjects.length)} {l('projects ·', 'টি প্রজেক্টে')} {formatMoney(totalInvested)}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.searchBtn}
          onPress={() => setShowSearch(!showSearch)}
          activeOpacity={0.7}
        >
          <Ionicons name="search" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Search Input Box */}
      {showSearch && (
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder={l('Search by project name...', 'প্রজেক্টের নাম দিয়ে খুঁজুন...')}
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
        {/* Top Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.topStatsRow}>
            <View>
              <Text style={styles.statLabel}>{l('Total Investment', 'মোট বিনিয়োগ')}</Text>
              <Text style={styles.statAmountInvest}>{formatMoney(totalInvested)}</Text>
            </View>
            <View style={styles.statRightCol}>
              <Text style={styles.statLabel}>{l('This Year Profit', 'এ বছর লাভ')}</Text>
              <Text style={styles.statAmountProfit}>
                {formatMoney(totalProfit, { showPlusSign: true })}
              </Text>
            </View>
          </View>

          <Text style={styles.allocLabel}>{l('Total Fund Allocation', 'মোট তহবিলের বণ্টন')}</Text>

          {/* Allocation Multi-Segment Bar */}
          <View style={styles.allocBar}>
            {allocSegments.map((seg) => (
              <View
                key={seg.key}
                style={[
                  styles.allocSegment,
                  { flex: seg.flex, backgroundColor: seg.color },
                ]}
              />
            ))}
          </View>

          {/* Legend Items */}
          <View style={styles.legendRow}>
            {allocSegments.map((seg) => (
              <View key={seg.key} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: seg.color }]} />
                <Text style={styles.legendText}>
                  {isBengali ? seg.labelBn : seg.labelEn}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Filter Chips */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
            onPress={() => setFilter('all')}
            activeOpacity={0.8}
          >
            {filter === 'all' && <Ionicons name="checkmark" size={14} color={colors.primary} style={styles.filterCheck} />}
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
              {l('All', 'সব')} {formatNum(displayProjects.length)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filter === 'ongoing' && styles.filterChipActive]}
            onPress={() => setFilter('ongoing')}
            activeOpacity={0.8}
          >
            {filter === 'ongoing' && <Ionicons name="checkmark" size={14} color={colors.primary} style={styles.filterCheck} />}
            <Text style={[styles.filterText, filter === 'ongoing' && styles.filterTextActive]}>
              {l('Ongoing', 'চলমান')} {formatNum(ongoingCount)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filter === 'delayed' && styles.filterChipActive]}
            onPress={() => setFilter('delayed')}
            activeOpacity={0.8}
          >
            {filter === 'delayed' && <Ionicons name="checkmark" size={14} color={colors.primary} style={styles.filterCheck} />}
            <Text style={[styles.filterText, filter === 'delayed' && styles.filterTextActive]}>
              {l('Delayed', 'বিলম্বিত')} {formatNum(delayedCount)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filter === 'completed' && styles.filterChipActive]}
            onPress={() => setFilter('completed')}
            activeOpacity={0.8}
          >
            {filter === 'completed' && <Ionicons name="checkmark" size={14} color={colors.primary} style={styles.filterCheck} />}
            <Text style={[styles.filterText, filter === 'completed' && styles.filterTextActive]}>
              {l('Completed', 'সমাপ্ত')} {formatNum(completedCount)}
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

            const projectTitle = isBengali
              ? project.name
              : project.id === 'p1'
              ? 'Site A: Land Project'
              : project.id === 'p2'
              ? 'Shop Rental Project'
              : project.id === 'p3'
              ? 'Poultry Farm'
              : project.id === 'p4'
              ? 'Site B: Construction'
              : project.name;

            const typeLabel =
              project.type === 'জমি'
                ? l('Land', 'জমি')
                : project.type === 'ভাড়া'
                ? l('Rent', 'ভাড়া')
                : project.type === 'কৃষি'
                ? l('Agriculture', 'কৃষি')
                : project.type === 'নির্মাণ'
                ? l('Construction', 'নির্মাণ')
                : project.type;

            const locLabel = project.location === '[স্থান]' ? l('[Location]', '[স্থান]') : project.location;

            return (
              <TouchableOpacity
                key={project.id}
                style={styles.projectCard}
                onPress={() => router.push(`/(admin)/project/${project.id}`)}
                activeOpacity={0.8}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleCol}>
                    <Text style={styles.cardTitle}>{projectTitle}</Text>
                    <Text style={styles.cardSub}>
                      {typeLabel} · {locLabel}
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
                    <View style={styles.completedBadge}>
                      <Text style={styles.completedBadgeText}>{l('Completed', 'সমাপ্ত')}</Text>
                    </View>
                  )}
                </View>

                {/* 3 Metrics Columns */}
                <View style={styles.metricsRow}>
                  <View style={styles.metricCol}>
                    <Text style={styles.metricLabel}>{l('Investment', 'বিনিয়োগ')}</Text>
                    <Text style={styles.metricValue}>{formatMoney(project.investedAmount)}</Text>
                  </View>

                  <View style={styles.metricCol}>
                    <Text style={styles.metricLabel}>{l('Return', 'ফেরত')}</Text>
                    <Text style={styles.metricValue}>{formatMoney(project.returnedAmount)}</Text>
                  </View>

                  <View style={styles.metricColEnd}>
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
            <View style={styles.emptyState}>
              <Ionicons name="briefcase-outline" size={32} color={colors.textSecondary} />
              <Text style={styles.emptyText}>
                {l('No projects found', 'কোনো প্রজেক্ট পাওয়া যায়নি')}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.scrollSpacer} />
      </ScrollView>

      {/* FAB: + নতুন প্রজেক্ট */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowNew(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={20} color={colors.surface} />
        <Text style={styles.fabText}>{l('+ New Project', '+ নতুন প্রজেক্ট')}</Text>
      </TouchableOpacity>

      {/* Create Project Modal */}
      <AppModal visible={showNew} onClose={() => setShowNew(false)}>
        <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.modalTitle}>
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
            <View key={key} style={styles.modalInputGroup}>
              <Text style={styles.modalInputLabel}>{label}</Text>
              <TextInput
                value={(np as any)[key]}
                onChangeText={setField(key as any)}
                placeholder={ph}
                placeholderTextColor={colors.textSecondary}
                keyboardType={key === 'amount' ? 'numeric' : 'default'}
                style={styles.modalInputField}
              />
            </View>
          ))}
          <Text style={styles.modalInputLabel}>
            {l('Payment source', 'টাকা যাবে কোথা থেকে')}
          </Text>
          <View style={styles.sourceButtonsRow}>
            {(['bank', 'cash', 'bkash'] as const).map((src) => (
              <TouchableOpacity
                key={src}
                onPress={() => setNpSource(src)}
                style={[
                  styles.sourceButton,
                  npSource === src && styles.sourceButtonActive,
                ]}
              >
                <Text style={styles.sourceButtonText}>
                  {src === 'bank' ? l('Bank', 'ব্যাংক') : src === 'cash' ? l('Cash', 'হাতে নগদ') : l('bKash', 'বিকাশ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            onPress={handleCreateProject}
            style={styles.createProjectBtn}
          >
            <Text style={styles.createProjectBtnText}>{l('Create Project', 'প্রজেক্ট তৈরি করুন')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </AppModal>
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
    marginTop: 2,
  },
  searchBtn: {
    padding: 6,
  },
  searchContainer: {
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
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    shadowColor: colors.shadowColor,
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
  statRightCol: {
    alignItems: 'flex-end',
  },
  statLabel: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  statAmountInvest: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xl,
    lineHeight: typography.lineHeight.xl,
    color: colors.text,
  },
  statAmountProfit: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xl,
    lineHeight: typography.lineHeight.xl,
    color: colors.primary,
  },
  allocLabel: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: 4,
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
    gap: 5,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.text,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  filterChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primarySoft,
  },
  filterCheck: {
    marginRight: -2,
  },
  filterText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.textSecondary,
  },
  filterTextActive: {
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
  },
  projectsList: {
    gap: 10,
  },
  projectCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardTitleCol: {
    flex: 1,
    marginRight: 8,
  },
  cardTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.base,
    lineHeight: typography.lineHeight.base,
    color: colors.text,
  },
  cardSub: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  ongoingBadge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  ongoingBadgeText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.primary,
  },
  delayedBadge: {
    backgroundColor: colors.warningSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  delayedBadgeText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.warning,
  },
  completedBadge: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  completedBadgeText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.textSecondary,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  metricCol: {
    flex: 1,
  },
  metricColEnd: {
    flex: 1,
    alignItems: 'flex-end',
  },
  metricLabel: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  metricValue: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    color: colors.text,
  },
  profitText: {
    color: colors.primary,
  },
  lossText: {
    color: colors.warning,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginTop: 8,
  },
  scrollSpacer: {
    height: 100,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 28,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
    gap: 6,
  },
  fabText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.surface,
  },
  modalScroll: {
    maxHeight: 520,
  },
  modalTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.title,
    lineHeight: typography.lineHeight.title,
    color: colors.text,
    marginBottom: 12,
  },
  modalInputGroup: {
    marginBottom: 10,
  },
  modalInputLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  modalInputField: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.md,
    color: colors.text,
  },
  sourceButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  sourceButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  sourceButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  sourceButtonText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text,
  },
  createProjectBtn: {
    backgroundColor: colors.primary,
    borderRadius: 28,
    paddingVertical: 12,
    alignItems: 'center',
  },
  createProjectBtnText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.surface,
  },
});
