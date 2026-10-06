import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Linking,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { Card } from '../../../src/components/Card';
import { Avatar } from '../../../src/components/Avatar';
import { ProgressRing } from '../../../src/components/ProgressRing';
import { BENGALI_MONTHS_FULL, toBengaliDigits } from '../../../src/lib/bengali';
import { useSomitiStore } from '../../../src/store/somitiStore';
import { useLanguage } from '../../../src/i18n/useLanguage';

export default function HomeDashboardScreen() {
  const router = useRouter();
  const {
    somitiInfo,
    approvals,
    members,
    projects,
    cashAccounts,
    expenses,
    approveRequest,
  } = useSomitiStore();
  const { l, isBengali, formatMoney, formatNum, dueDateDay } = useLanguage();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    useSomitiStore.getState().syncFromServer().finally(() => setRefreshing(false));
  }, []);

  // Dynamic financial totals
  const projectInvested = useMemo(() => {
    return projects.length ? projects.reduce((acc, p) => acc + (p.investedAmount || 0), 0) : somitiInfo.projectInvested || 0;
  }, [projects, somitiInfo.projectInvested]);

  const cashAndBank = useMemo(() => {
    return cashAccounts.length ? cashAccounts.reduce((acc, c) => acc + (c.amount || 0), 0) : somitiInfo.cashAndBank || 0;
  }, [cashAccounts, somitiInfo.cashAndBank]);

  const totalFund = useMemo(() => projectInvested + cashAndBank, [projectInvested, cashAndBank]);

  const totalFundCalc = projectInvested + cashAndBank;
  const projectInvestedPct = useMemo(() => {
    return totalFundCalc > 0 ? Math.min(100, Math.round((projectInvested / totalFundCalc) * 100)) : 0;
  }, [projectInvested, totalFundCalc]);

  const cashAndBankPct = useMemo(() => {
    return totalFundCalc > 0 ? Math.max(0, 100 - projectInvestedPct) : 0;
  }, [projectInvestedPct]);

  // Active, Paid and Due members
  const activeMembers = useMemo(() => members.filter((m) => m.status !== 'inactive'), [members]);
  const paidMembers = useMemo(() => members.filter((m) => m.status === 'paid' && m.dueAmount === 0), [members]);
  const dueMembers = useMemo(() => members.filter((m) => m.dueAmount > 0 || m.status === 'due' || m.status === 'partial'), [members]);

  // Monthly collection metrics matching Somiti-level 100-member aggregates
  const monthlyTarget = somitiInfo.monthlyTarget || 0;
  const monthlyCollected = somitiInfo.monthlyCollected || 0;
  const monthlyRemaining = Math.max(0, monthlyTarget - monthlyCollected);
  const monthlyCollectedPct = monthlyTarget > 0 ? Math.min(100, Math.round((monthlyCollected / monthlyTarget) * 100)) : 0;

  const totalMembersCount = members.length || somitiInfo.totalMembersCount || 0;
  const paidCount = paidMembers.length;
  const dueCount = dueMembers.length;
  const totalDueAmount = dueMembers.reduce((s, m) => s + (m.dueAmount || 0), 0);

  const activeProjectsCount = projects.filter((p) => p.status === 'ongoing' || p.status === 'delayed').length;
  const yearlyProjectProfit = somitiInfo.yearlyProjectProfit || 0;

  const monthlyIncome = useMemo(() => somitiInfo.monthlyIncome || 0, [somitiInfo.monthlyIncome]);
  const monthlyExpense = useMemo(() => somitiInfo.monthlyExpense || 0, [somitiInfo.monthlyExpense]);
  const monthlyNet = useMemo(() => monthlyIncome - monthlyExpense, [monthlyIncome, monthlyExpense]);

  // Dynamic Follow-up list based on due members with late fees included
  const followupList = useMemo(() => {
    const activeDue = members.filter((m) => m.dueAmount > 0 || m.status === 'due' || m.status === 'partial');
    if (activeDue.length > 0) {
      const sorted = [...activeDue].sort((a, b) => b.dueAmount - a.dueAmount);

      return sorted.slice(0, 3).map((m) => {
        const noteText = m.status === 'partial'
          ? `${l('Partial', 'আংশিক')} · ${formatMoney(m.dueAmount)} ${l('due', 'বাকি')}`
          : `${formatNum(m.dueMonths)} ${l('months due', 'মাস বকেয়া')} · ${formatMoney(m.dueAmount)}`;
        return {
          id: m.id,
          name: m.name,
          phone: m.phone,
          whatsapp: m.whatsapp || m.phone,
          note: noteText,
        };
      });
    }
    return [];
  }, [members, l, formatNum, formatMoney]);

  // Dynamic Somiti Initial Letter
  const somitiInitial = isBengali
    ? (somitiInfo.name?.trim().charAt(0) || 'আ')
    : (somitiInfo.nameEn?.trim().charAt(0) || 'A');

  // Handlers
  const handleCall = (name: string, phone: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    Alert.alert(
      l('Call Member', 'সদস্যকে কল করুন'),
      `${name}\n${phone}`,
      [
        { text: l('Cancel', 'বাতিল'), style: 'cancel' },
        {
          text: l('Call', 'কল দিন'),
          onPress: () => {
            Linking.openURL(`tel:${cleanPhone}`).catch(() => {
              Alert.alert(l('Notice', 'বিজ্ঞপ্তি'), l('Phone dialer could not be opened', 'ফোন ডায়লার খোলা সম্ভব হয়নি'));
            });
          },
        },
      ]
    );
  };

  const handleMessage = (name: string, phone: string, note: string, memberId: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const fullPhone = cleanPhone.startsWith('88') ? cleanPhone : `88${cleanPhone}`;
    const defaultMsg = `আসসালামু আলাইকুম ${name} ভাই, আপনার সমিতির কিস্তি বকেয়া রয়েছে (${note})। অনুগ্রহ করে দ্রুত পরিশোধ করবেন। ধন্যবাদ - ${somitiInfo.name}`;

    Alert.alert(
      l('Send Reminder', 'রিমাইন্ডার পাঠান'),
      `${name} · ${note}`,
      [
        { text: l('Cancel', 'বাতিল'), style: 'cancel' },
        {
          text: l('WhatsApp', 'হোয়াটসঅ্যাপ'),
          onPress: () => {
            const url = `whatsapp://send?phone=${fullPhone}&text=${encodeURIComponent(defaultMsg)}`;
            Linking.openURL(url).catch(() => {
              Linking.openURL(`https://wa.me/${fullPhone}?text=${encodeURIComponent(defaultMsg)}`).catch(() => {
                Alert.alert(l('Error', 'ত্রুটি'), l('WhatsApp could not be opened', 'হোয়াটসঅ্যাপ খোলা সম্ভব হয়নি'));
              });
            });
          },
        },
        {
          text: l('SMS', 'এসএমএস'),
          onPress: () => {
            Linking.openURL(`sms:${cleanPhone}?body=${encodeURIComponent(defaultMsg)}`).catch(() => {
              Alert.alert(l('Error', 'ত্রুটি'), l('SMS app could not be opened', 'এসএমএস অ্যাপ খোলা সম্ভব হয়নি'));
            });
          },
        },
        {
          text: l('Open Reminder Page', 'রিমাইন্ডার পেজ'),
          onPress: () => router.push('/(admin)/reminder'),
        },
      ]
    );
  };

  const handleFollowupPress = (item: { id: string; name: string }) => {
    Alert.alert(
      item.name,
      l('Choose an action for this member:', 'এই সদস্যের জন্য অ্যাকশন নির্বাচন করুন:'),
      [
        { text: l('Cancel', 'বাতিল'), style: 'cancel' },
        {
          text: l('Record Deposit', 'জমা নিন'),
          onPress: () => router.push(`/(admin)/deposit/new?memberId=${item.id}`),
        },
        {
          text: l('View Profile', 'প্রোফাইল দেখুন'),
          onPress: () => router.push(`/(admin)/member/${item.id}`),
        },
      ]
    );
  };

  const handleQuickApprove = (item: { id: string; title: string; amount: number }) => {
    router.push('/(admin)/approvals');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerLeft}
          onPress={() => router.push('/(admin)/somiti')}
          activeOpacity={0.7}
        >
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>{somitiInitial}</Text>
          </View>
          <View>
            <Text style={styles.somitiName}>
              {l(somitiInfo.nameEn || 'Amanot Samity', somitiInfo.name || 'আমানত সমিতি')}
            </Text>
            <Text style={styles.subHeader}>
              {l(new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }), `${BENGALI_MONTHS_FULL[new Date().getMonth()]} ${toBengaliDigits(new Date().getFullYear())}`)} · {formatNum(totalMembersCount)} {l('Members', 'জন সদস্য')}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.notificationBtn}
          onPress={() => router.push('/(admin)/approvals')}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={20} color={colors.text} />
          {approvals.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {formatNum(approvals.length)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* 1. Hero Card: মোট তহবিল (Deep Green) */}
        <TouchableOpacity
          style={styles.heroCard}
          onPress={() => router.push('/(admin)/finance')}
          activeOpacity={0.9}
        >
          <View style={styles.heroTopRow}>
            <Text style={styles.heroTitle}>{l('Total Fund', 'মোট তহবিল')}</Text>
            <View style={styles.growthBadge}>
              <Ionicons name="arrow-up" size={12} color={colors.primary} />
              <Text style={styles.growthText}>
                {formatNum(somitiInfo.monthlyFundGrowth || 0)}% {l('this month', 'এ মাসে')}
              </Text>
            </View>
          </View>

          <Text style={styles.heroAmount}>
            {formatMoney(totalFund)}
          </Text>

          {/* Allocation Bar - White progress fill on translucent white track */}
          <View style={styles.barContainer}>
            <View
              style={[
                styles.barSegment,
                { width: `${projectInvestedPct}%`, backgroundColor: colors.surface },
              ]}
            />
          </View>

          {/* Allocation Details */}
          <View style={styles.heroFooter}>
            <View style={styles.heroFooterCol}>
              <Text style={styles.heroFooterLabel}>{l('Invested in Projects', 'প্রজেক্টে বিনিয়োগ')}</Text>
              <Text style={styles.heroFooterValue}>
                {formatMoney(projectInvested)} · {formatNum(projectInvestedPct)}%
              </Text>
            </View>
            <View style={[styles.heroFooterCol, { alignItems: 'flex-end' }]}>
              <Text style={styles.heroFooterLabel}>{l('In Hand & Bank', 'হাতে ও ব্যাংকে')}</Text>
              <Text style={styles.heroFooterValue}>
                {formatMoney(cashAndBank)} · {formatNum(cashAndBankPct)}%
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* 2. 4 Quick Action Buttons */}
        <View style={styles.quickActionRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push('/(admin)/deposit/new')}
            activeOpacity={0.8}
          >
            <View style={styles.actionCircle}>
              <Ionicons name="add" size={24} color={colors.text} />
            </View>
            <Text style={styles.actionLabel}>{l('Deposit', 'জমা নিন')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push('/(admin)/expense/new')}
            activeOpacity={0.8}
          >
            <View style={styles.actionCircle}>
              <Ionicons name="receipt-outline" size={22} color={colors.text} />
            </View>
            <Text style={styles.actionLabel}>{l('Expense', 'খরচ লিখুন')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push('/(admin)/reminder')}
            activeOpacity={0.8}
          >
            <View style={styles.actionCircle}>
              <Ionicons name="megaphone-outline" size={22} color={colors.text} />
            </View>
            <Text style={styles.actionLabel}>{l('Reminder', 'রিমাইন্ডার')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push('/(admin)/reports')}
            activeOpacity={0.8}
          >
            <View style={styles.actionCircle}>
              <Ionicons name="document-text-outline" size={22} color={colors.text} />
            </View>
            <Text style={styles.actionLabel}>{l('Reports', 'রিপোর্ট')}</Text>
          </TouchableOpacity>
        </View>

        {/* 3. এ মাসের আদায় Card */}
        <TouchableOpacity
          onPress={() => router.push('/(admin)/(tabs)/collection')}
          activeOpacity={0.9}
        >
          <Card style={styles.sectionCard}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>{l("This Month's Collection", 'এ মাসের আদায়')}</Text>
              <Text style={styles.cardSubtitle}>
                {l(`Due Date ${dueDateDay} September`, `শেষ তারিখ ${formatNum(dueDateDay)} সেপ্টেম্বর`)}
              </Text>
            </View>

            <View style={styles.collectionBody}>
              <ProgressRing
                progress={monthlyCollectedPct}
                size={76}
                strokeWidth={7}
                color={colors.primary}
                backgroundColor={colors.primarySoft}
              />

              <View style={styles.collectionStats}>
                <Text style={styles.collectionAmount}>
                  {formatMoney(monthlyCollected)}
                </Text>
                <Text style={styles.collectionSub}>
                  {l('Target', 'লক্ষ্য')} {formatMoney(monthlyTarget)} · {l('Remaining', 'বাকি')} {formatMoney(monthlyRemaining)}
                </Text>
              </View>
            </View>

            <View style={styles.collectionFooterRow}>
              <Text style={styles.paidText}>
                {formatNum(paidCount)} {l('members paid', 'জন জমা দিয়েছেন')}
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/(admin)/due')}
                style={styles.dueLink}
              >
                <Text style={styles.dueText}>
                  {formatNum(dueCount)} {l('due ›', 'জন বাকি ›')}
                </Text>
              </TouchableOpacity>
            </View>
          </Card>
        </TouchableOpacity>

        {/* 4. Two-Column Cards: বকেয়া & প্রজেক্ট */}
        <View style={styles.twoColumnRow}>
          {/* Due Card (Peach Warning Soft) */}
          <TouchableOpacity
            style={styles.halfCardWrapper}
            onPress={() => router.push('/(admin)/due')}
            activeOpacity={0.8}
          >
            <View style={styles.dueHalfCard}>
              <View style={styles.halfCardHeader}>
                <Ionicons name="warning-outline" size={16} color={colors.warning} />
                <Text style={styles.dueHalfCardTitle}>{l('Due', 'বকেয়া')}</Text>
              </View>
              <Text style={styles.dueHalfCardAmount}>
                {formatMoney(totalDueAmount)}
              </Text>
              <Text style={styles.dueHalfCardSub}>
                {formatNum(dueCount)} {l('members · 3 members 3+ mos', 'জন · ৩ জন ৩+ মাস')}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Projects Card (White Card) */}
          <TouchableOpacity
            style={styles.halfCardWrapper}
            onPress={() => router.push('/(admin)/(tabs)/projects')}
            activeOpacity={0.8}
          >
            <Card style={styles.projectHalfCard}>
              <View style={styles.halfCardHeader}>
                <Ionicons name="briefcase-outline" size={16} color={colors.primary} />
                <Text style={styles.projectHalfCardTitle}>{l('Active Projects', 'চলমান প্রজেক্ট')}</Text>
              </View>
              <Text style={styles.projectHalfCardAmount}>
                {formatNum(activeProjectsCount)}{l(' items', 'টি')}
              </Text>
              <Text style={styles.projectHalfCardSub}>
                {l('Profit this year', 'এ বছর লাভ')} {formatMoney(yearlyProjectProfit, { showPlusSign: true })}
              </Text>
            </Card>
          </TouchableOpacity>
        </View>

        {/* 5. Income & Expense Card */}
        <TouchableOpacity
          onPress={() => router.push('/(admin)/finance')}
          activeOpacity={0.85}
        >
          <Card style={styles.sectionCard}>
            <View style={styles.threeColumnStats}>
              <View style={styles.statCol}>
                <Text style={styles.colLabel}>{l("This Month's Income", 'এ মাসের আয়')}</Text>
                <Text style={styles.colValue}>
                  {formatMoney(monthlyIncome)}
                </Text>
              </View>
              <View style={styles.colDivider} />
              <View style={styles.statCol}>
                <Text style={styles.colLabel}>{l("This Month's Expense", 'এ মাসের ব্যয়')}</Text>
                <Text style={styles.colValue}>
                  {formatMoney(monthlyExpense)}
                </Text>
              </View>
              <View style={styles.colDivider} />
              <View style={styles.statCol}>
                <Text style={styles.colLabel}>{l('Net', 'নিট')}</Text>
                <Text style={[styles.colValue, { color: colors.primary }]}>
                  {formatMoney(monthlyNet)}
                </Text>
              </View>
            </View>
          </Card>
        </TouchableOpacity>

        {/* 6. আজকের ফলো-আপ */}
        <Card style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>{l("Today's Follow-up", 'আজকের ফলো-আপ')}</Text>
            <TouchableOpacity onPress={() => router.push('/(admin)/due')}>
              <Text style={styles.viewLinkText}>{l('View All', 'সব দেখুন')}</Text>
            </TouchableOpacity>
          </View>

          {followupList.length === 0 && (
            <Text style={[styles.followupNote, { paddingVertical: 12 }]}>{l('No dues today', 'আজ কোনো বকেয়া নেই')}</Text>
          )}
          {followupList.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.followupRow,
                index === followupList.length - 1 && { borderBottomWidth: 0 },
              ]}
              onPress={() => handleFollowupPress(item)}
              activeOpacity={0.7}
            >
              <Avatar name={item.name} size="sm" index={index} style={{ marginRight: 12 }} />

              <View style={styles.followupInfo}>
                <Text style={styles.followupName}>{item.name}</Text>
                <Text style={styles.followupNote}>{item.note}</Text>
              </View>

              <View style={styles.followupActions}>
                <TouchableOpacity
                  style={styles.actionIconBtn}
                  onPress={() => handleCall(item.name, item.phone)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="call-outline" size={17} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionIconBtn}
                  onPress={() => handleMessage(item.name, item.phone, item.note, item.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chatbubble-outline" size={17} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </Card>

        {/* 7. অনুমোদন অপেক্ষমাণ */}
        <Card style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>{l('Pending Approvals', 'অনুমোদন অপেক্ষমাণ')}</Text>
            <TouchableOpacity onPress={() => router.push('/(admin)/approvals')}>
              <Text style={styles.viewLinkText}>{l('View All', 'সব দেখুন')}</Text>
            </TouchableOpacity>
          </View>

          {approvals.length === 0 ? (
            <View style={styles.emptyApprovalsContainer}>
              <Text style={styles.emptyApprovalsText}>
                {l('No pending approvals at this time', 'বর্তমানে কোনো অপেক্ষমাণ অনুমোদন নেই')}
              </Text>
            </View>
          ) : (
            approvals.slice(0, 3).map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.approvalItem,
                  index === Math.min(approvals.length, 3) - 1 && { borderBottomWidth: 0 },
                ]}
                onPress={() => handleQuickApprove(item)}
                activeOpacity={0.7}
              >
                <View style={styles.approvalItemInfo}>
                  <Text style={styles.approvalItemTitle}>
                    {item.type === 'correction' ? item.title : `${item.title} · ${formatMoney(item.amount)}`}
                  </Text>
                  <Text style={styles.approvalItemSub}>
                    {item.createdBy.split(' ')[0]} · {item.dateStr}
                  </Text>
                </View>
                {item.isNew ? (
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>{l('New', 'নতুন')}</Text>
                  </View>
                ) : (
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                )}
              </TouchableOpacity>
            ))
          )}
        </Card>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Floating Action Button: + জমা নিন */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(admin)/deposit/new')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={20} color={colors.surface} />
        <Text style={styles.fabText}>{l('Deposit', 'জমা নিন')}</Text>
      </TouchableOpacity>
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
    paddingBottom: 10,
    backgroundColor: colors.bg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: typography.size.xl,
    lineHeight: typography.lineHeight.xl,
    color: colors.surface,
  },
  somitiName: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: typography.size.title,
    lineHeight: typography.lineHeight.title,
    color: colors.text,
  },
  subHeader: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.textSecondary,
  },
  notificationBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 3,
    right: 3,
    backgroundColor: colors.warning,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: typography.size.tiny,
    lineHeight: typography.lineHeight.tiny,
    color: colors.surface,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  heroTitle: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    color: colors.surface,
    opacity: 0.9,
  },
  growthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  growthText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    color: colors.primary,
  },
  heroAmount: {
    ...typography.displayAmount,
    color: colors.surface,
    marginVertical: 10,
  },
  barContainer: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 14,
  },
  barSegment: {
    height: '100%',
  },
  heroFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroFooterCol: {
    flex: 1,
  },
  heroFooterLabel: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    color: colors.surface,
    opacity: 0.8,
    marginBottom: 2,
  },
  heroFooterValue: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.surface,
  },
  quickActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  actionBtn: {
    alignItems: 'center',
    flex: 1,
  },
  actionCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    elevation: 2,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  actionLabel: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.text,
  },
  sectionCard: {
    padding: 16,
    marginBottom: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: typography.size.base,
    lineHeight: typography.lineHeight.base,
    color: colors.text,
  },
  cardSubtitle: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.textSecondary,
  },
  viewLinkText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    color: colors.primary,
  },
  collectionBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginBottom: 14,
  },
  collectionStats: {
    flex: 1,
  },
  collectionAmount: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: typography.size.xxl,
    lineHeight: typography.lineHeight.xxl,
    color: colors.text,
  },
  collectionSub: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
  collectionFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  paidText: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.primary,
  },
  dueLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dueText: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.warning,
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  halfCardWrapper: {
    flex: 1,
  },
  dueHalfCard: {
    backgroundColor: colors.warningSoft,
    borderRadius: 16,
    padding: 14,
    minHeight: 110,
    justifyContent: 'space-between',
  },
  projectHalfCard: {
    padding: 14,
    minHeight: 110,
    justifyContent: 'space-between',
  },
  halfCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dueHalfCardTitle: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.warning,
  },
  projectHalfCardTitle: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text,
  },
  dueHalfCardAmount: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: typography.size.xl,
    lineHeight: typography.lineHeight.xl,
    color: colors.warning,
    marginVertical: 4,
  },
  projectHalfCardAmount: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: typography.size.xl,
    lineHeight: typography.lineHeight.xl,
    color: colors.primary,
    marginVertical: 4,
  },
  dueHalfCardSub: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    color: colors.warning,
  },
  projectHalfCardSub: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    color: colors.primary,
  },
  threeColumnStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  colDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
  },
  colLabel: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  colValue: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.text,
  },
  followupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  followupInfo: {
    flex: 1,
  },
  followupName: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    color: colors.text,
  },
  followupNote: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    color: colors.textSecondary,
  },
  followupActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  approvalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  approvalItemInfo: {
    flex: 1,
  },
  approvalItemTitle: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text,
  },
  approvalItemSub: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    color: colors.textSecondary,
  },
  emptyApprovalsContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyApprovalsText: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.textSecondary,
  },
  newBadge: {
    backgroundColor: colors.text,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newBadgeText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    color: colors.surface,
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
    borderRadius: 9999,
    elevation: 6,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    gap: 6,
  },
  fabText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.surface,
  },
});
