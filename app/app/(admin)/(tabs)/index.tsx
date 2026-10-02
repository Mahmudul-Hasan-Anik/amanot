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
import { Card } from '../../../src/components/Card';
import { ProgressRing } from '../../../src/components/ProgressRing';
import { mockTodayFollowups } from '../../../src/mocks/mockData';
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
  const { l, formatMoney, formatNum, dueDateDay } = useLanguage();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 600);
  }, []);

  // Dynamic financial totals
  const totalFund = useMemo(() => somitiInfo.totalFund, [somitiInfo.totalFund]);

  const projectInvested = useMemo(() => {
    return projects.reduce((acc, p) => acc + (p.investedAmount || 0), 0) || somitiInfo.projectInvested;
  }, [projects, somitiInfo.projectInvested]);

  const cashAndBank = useMemo(() => {
    return cashAccounts.reduce((acc, c) => acc + (c.amount || 0), 0) || somitiInfo.cashAndBank;
  }, [cashAccounts, somitiInfo.cashAndBank]);

  const totalFundCalc = projectInvested + cashAndBank;
  const projectInvestedPct = useMemo(() => {
    return totalFundCalc > 0 ? Math.min(100, Math.round((projectInvested / totalFundCalc) * 100)) : 66;
  }, [projectInvested, totalFundCalc]);

  const cashAndBankPct = useMemo(() => {
    return Math.max(0, 100 - projectInvestedPct);
  }, [projectInvestedPct]);

  // Active, Paid and Due members
  const activeMembers = useMemo(() => members.filter((m) => m.status !== 'inactive'), [members]);
  const paidMembers = useMemo(() => members.filter((m) => m.status === 'paid' && m.dueAmount === 0), [members]);
  const dueMembers = useMemo(() => members.filter((m) => m.dueAmount > 0 || m.status === 'due' || m.status === 'partial'), [members]);

  // Monthly collection metrics
  const monthlyTarget = useMemo(() => {
    return activeMembers.reduce((sum, m) => sum + (m.monthlyAmount || 2000), 0) || somitiInfo.monthlyTarget;
  }, [activeMembers, somitiInfo.monthlyTarget]);

  const monthlyCollected = useMemo(() => {
    return somitiInfo.monthlyCollected;
  }, [somitiInfo.monthlyCollected]);

  const monthlyRemaining = useMemo(() => {
    return Math.max(0, monthlyTarget - monthlyCollected);
  }, [monthlyTarget, monthlyCollected]);

  const monthlyCollectedPct = useMemo(() => {
    return monthlyTarget > 0 ? Math.min(100, Math.round((monthlyCollected / monthlyTarget) * 100)) : 0;
  }, [monthlyCollected, monthlyTarget]);

  const totalDueAmount = useMemo(() => {
    return dueMembers.reduce((sum, m) => sum + (m.dueAmount || 0), 0) || somitiInfo.totalDueAmount;
  }, [dueMembers, somitiInfo.totalDueAmount]);

  const activeProjectsCount = useMemo(() => {
    return projects.filter((p) => p.status === 'ongoing' || p.status === 'delayed').length || projects.length;
  }, [projects]);

  const yearlyProjectProfit = useMemo(() => {
    return projects.reduce((sum, p) => sum + (p.netProfit || 0), 0) || somitiInfo.yearlyProjectProfit;
  }, [projects, somitiInfo.yearlyProjectProfit]);

  const monthlyIncome = useMemo(() => somitiInfo.monthlyIncome || monthlyCollected, [somitiInfo.monthlyIncome, monthlyCollected]);
  const monthlyExpense = useMemo(() => somitiInfo.monthlyExpense, [somitiInfo.monthlyExpense]);
  const monthlyNet = useMemo(() => monthlyIncome - monthlyExpense, [monthlyIncome, monthlyExpense]);

  // Dynamic Follow-up list based on due members
  const followupList = useMemo(() => {
    if (dueMembers.length > 0) {
      return dueMembers.slice(0, 3).map((m) => ({
        id: m.id,
        name: m.name,
        phone: m.phone,
        whatsapp: m.whatsapp || m.phone,
        note: `${m.dueMonths > 0 ? `${formatNum(m.dueMonths)} ${l('months due', 'মাস বকেয়া')} · ` : ''}${formatMoney(m.dueAmount)} ${l('due', 'বাকি')}`,
      }));
    }
    return mockTodayFollowups;
  }, [dueMembers, l, formatNum, formatMoney]);

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
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerLeft}
          onPress={() => router.push('/(admin)/somiti')}
          activeOpacity={0.7}
        >
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>{l('A', 'স')}</Text>
          </View>
          <View>
            <Text style={styles.somitiName}>{l('Uttara Model Samity', somitiInfo.name)}</Text>
            <Text style={styles.subHeader}>
              {l('September 2026', 'সেপ্টেম্বর ২০২৬')} · {formatNum(members.length)} {l('Members', 'জন সদস্য')}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.notificationBtn}
          onPress={() => router.push('/(admin)/approvals')}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={22} color={colors.textMain} />
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
        {/* 1. Hero Card: মোট তহবিল (Dark Forest Teal) */}
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
                {formatNum(somitiInfo.monthlyFundGrowth)}% {l('this month', 'এ মাসে')}
              </Text>
            </View>
          </View>

          <Text style={styles.heroAmount}>
            {formatMoney(totalFund)}
          </Text>

          {/* Allocation Bar */}
          <View style={styles.barContainer}>
            <View
              style={[
                styles.barSegment,
                { width: `${projectInvestedPct}%`, backgroundColor: '#2DD4BF' },
              ]}
            />
            <View
              style={[
                styles.barSegment,
                { width: `${cashAndBankPct}%`, backgroundColor: '#99F6E4' },
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
              <Ionicons name="add" size={24} color={colors.textMain} />
            </View>
            <Text style={styles.actionLabel}>{l('Deposit', 'জমা নিন')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push('/(admin)/expense/new')}
            activeOpacity={0.8}
          >
            <View style={styles.actionCircle}>
              <Ionicons name="receipt-outline" size={22} color={colors.textMain} />
            </View>
            <Text style={styles.actionLabel}>{l('Expense', 'খরচ লিখুন')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push('/(admin)/reminder')}
            activeOpacity={0.8}
          >
            <View style={styles.actionCircle}>
              <Ionicons name="volume-medium-outline" size={22} color={colors.textMain} />
            </View>
            <Text style={styles.actionLabel}>{l('Reminder', 'রিমাইন্ডার')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push('/(admin)/reports')}
            activeOpacity={0.8}
          >
            <View style={styles.actionCircle}>
              <Ionicons name="document-text-outline" size={22} color={colors.textMain} />
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
              <Text style={styles.cardSubtitle}>{l(`Due Date ${dueDateDay} September`, `শেষ তারিখ ${dueDateDay} সেপ্টেম্বর`)}</Text>
            </View>

            <View style={styles.collectionBody}>
              <ProgressRing
                progress={monthlyCollectedPct}
                size={80}
                strokeWidth={8}
                color={colors.primary}
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
                {formatNum(paidMembers.length)} {l('members paid', 'জন জমা দিয়েছেন')}
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/(admin)/due')}
                style={styles.dueLink}
              >
                <Text style={styles.dueText}>
                  {formatNum(dueMembers.length)} {l('due ›', 'জন বাকি ›')}
                </Text>
              </TouchableOpacity>
            </View>
          </Card>
        </TouchableOpacity>

        {/* 4. Two-Column Cards: বকেয়া & প্রজেক্ট */}
        <View style={styles.twoColumnRow}>
          {/* Due Card */}
          <TouchableOpacity
            style={styles.halfCardWrapper}
            onPress={() => router.push('/(admin)/due')}
            activeOpacity={0.8}
          >
            <Card style={styles.halfCard}>
              <View style={styles.halfCardHeader}>
                <Ionicons name="warning-outline" size={16} color={colors.warning} />
                <Text style={styles.halfCardTitle}>{l('Due', 'বকেয়া')}</Text>
              </View>
              <Text style={[styles.halfCardAmount, { color: colors.danger }]}>
                {formatMoney(totalDueAmount)}
              </Text>
              <Text style={styles.halfCardSub}>
                {formatNum(dueMembers.length)} {l('members · 3 members 3+ mos', 'জন · ৩ জন ৩+ মাস')}
              </Text>
            </Card>
          </TouchableOpacity>

          {/* Projects Card */}
          <TouchableOpacity
            style={styles.halfCardWrapper}
            onPress={() => router.push('/(admin)/(tabs)/projects')}
            activeOpacity={0.8}
          >
            <Card style={styles.halfCard}>
              <View style={styles.halfCardHeader}>
                <Ionicons name="briefcase-outline" size={16} color={colors.primary} />
                <Text style={styles.halfCardTitle}>{l('Active Projects', 'চলমান প্রজেক্ট')}</Text>
              </View>
              <Text style={[styles.halfCardAmount, { color: colors.primary }]}>
                {formatNum(activeProjectsCount)}{l(' items', 'টি')}
              </Text>
              <Text style={[styles.halfCardSub, { color: colors.success }]}>
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
              <View style={styles.avatarCircleSmall}>
                <Text style={styles.avatarTextSmall}>{item.name.charAt(0)}</Text>
              </View>

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
                  <Ionicons name="call-outline" size={18} color={colors.textMain} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionIconBtn}
                  onPress={() => handleMessage(item.name, item.phone, item.note, item.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chatbubble-outline" size={18} color={colors.textMain} />
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
            <View style={{ paddingVertical: 16, alignItems: 'center' }}>
              <Text style={{ fontSize: 13, color: colors.textMuted }}>{l('No pending approvals at this time', 'বর্তমানে কোনো অপেক্ষমাণ অনুমোদন নেই')}</Text>
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
                <View style={{ flex: 1 }}>
                  <Text style={styles.approvalItemTitle}>
                    {item.title} · {formatMoney(item.amount)}
                  </Text>
                  <Text style={styles.approvalItemSub}>
                    {item.createdBy} · {item.dateStr}
                  </Text>
                </View>
                {item.isNew ? (
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>{l('New', 'নতুন')}</Text>
                  </View>
                ) : (
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
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
        <Ionicons name="add" size={20} color="#FFFFFF" />
        <Text style={styles.fabText}>{l('Deposit', 'জমা নিন')}</Text>
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
    paddingBottom: 10,
    backgroundColor: colors.background,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 22,
    color: '#FFFFFF',
  },
  somitiName: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 18,
    color: colors.textMain,
    lineHeight: 22,
  },
  subHeader: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: colors.textMuted,
  },
  notificationBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
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
    fontSize: 10,
    color: '#FFFFFF',
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
    marginBottom: 6,
  },
  heroTitle: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 14,
    color: '#CCFBF1',
  },
  growthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  growthText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 11,
    color: colors.primary,
  },
  heroAmount: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 34,
    color: '#FFFFFF',
    marginBottom: 16,
  },
  barContainer: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
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
    fontSize: 11,
    color: '#99F6E4',
    marginBottom: 2,
  },
  heroFooterValue: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 13,
    color: '#FFFFFF',
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
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  actionLabel: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 12,
    color: colors.textMain,
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
    fontSize: 16,
    color: colors.textMain,
  },
  cardSubtitle: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: colors.textMuted,
  },
  viewLinkText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 13,
    color: colors.textMuted,
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
    fontSize: 24,
    color: colors.textMain,
  },
  collectionSub: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
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
    fontSize: 13,
    color: colors.success,
  },
  dueLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dueText: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 13,
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
  halfCard: {
    padding: 14,
    minHeight: 105,
    justifyContent: 'space-between',
  },
  halfCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  halfCardTitle: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 13,
    color: colors.textMain,
  },
  halfCardAmount: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 22,
    marginVertical: 2,
  },
  halfCardSub: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: colors.textMuted,
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
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 2,
  },
  colValue: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 15,
    color: colors.textMain,
  },
  followupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatarCircleSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarTextSmall: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 15,
    color: colors.primary,
  },
  followupInfo: {
    flex: 1,
  },
  followupName: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 14,
    color: colors.textMain,
  },
  followupNote: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: colors.textMuted,
  },
  followupActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
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
  approvalItemTitle: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 13,
    color: colors.textMain,
  },
  approvalItemSub: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: colors.textMuted,
  },
  newBadge: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newBadgeText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 11,
    color: '#FFFFFF',
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
    fontSize: 15,
    color: '#FFFFFF',
  },
});
