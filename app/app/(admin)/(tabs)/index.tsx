import React from 'react';
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
import { Card } from '../../../src/components/Card';
import { ProgressRing } from '../../../src/components/ProgressRing';
import { formatBengaliMoney, toBengaliDigits } from '../../../src/lib/money';
import {
  mockSomitiInfo,
  mockTodayFollowups,
  mockPendingApprovals,
} from '../../../src/mocks/mockData';

export default function HomeDashboardScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>স</Text>
          </View>
          <View>
            <Text style={styles.somitiName}>[সমিতির নাম]</Text>
            <Text style={styles.subHeader}>
              সেপ্টেম্বর ২০২৬ · {toBengaliDigits(mockSomitiInfo.totalMembersCount)} জন সদস্য
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.notificationBtn}
          onPress={() => router.push('/(admin)/approvals')}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={22} color={colors.textMain} />
          {mockPendingApprovals.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {toBengaliDigits(mockPendingApprovals.length)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Hero Card: মোট তহবিল (Dark Forest Teal) */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <Text style={styles.heroTitle}>মোট তহবিল</Text>
            <View style={styles.growthBadge}>
              <Ionicons name="arrow-up" size={12} color={colors.primary} />
              <Text style={styles.growthText}>
                {toBengaliDigits(mockSomitiInfo.monthlyFundGrowth)}% এ মাসে
              </Text>
            </View>
          </View>

          <Text style={styles.heroAmount}>
            {formatBengaliMoney(mockSomitiInfo.totalFund)}
          </Text>

          {/* Allocation Bar */}
          <View style={styles.barContainer}>
            <View
              style={[
                styles.barSegment,
                { width: `${mockSomitiInfo.projectInvestedPct}%`, backgroundColor: '#2DD4BF' },
              ]}
            />
            <View
              style={[
                styles.barSegment,
                { width: `${mockSomitiInfo.cashAndBankPct}%`, backgroundColor: '#99F6E4' },
              ]}
            />
          </View>

          {/* Allocation Details */}
          <View style={styles.heroFooter}>
            <View style={styles.heroFooterCol}>
              <Text style={styles.heroFooterLabel}>প্রজেক্টে বিনিয়োগ</Text>
              <Text style={styles.heroFooterValue}>
                {formatBengaliMoney(mockSomitiInfo.projectInvested)} · {toBengaliDigits(mockSomitiInfo.projectInvestedPct)}%
              </Text>
            </View>
            <View style={[styles.heroFooterCol, { alignItems: 'flex-end' }]}>
              <Text style={styles.heroFooterLabel}>হাতে ও ব্যাংকে</Text>
              <Text style={styles.heroFooterValue}>
                {formatBengaliMoney(mockSomitiInfo.cashAndBank)} · {toBengaliDigits(mockSomitiInfo.cashAndBankPct)}%
              </Text>
            </View>
          </View>
        </View>

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
            <Text style={styles.actionLabel}>জমা নিন</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push('/(admin)/expense/new')}
            activeOpacity={0.8}
          >
            <View style={styles.actionCircle}>
              <Ionicons name="receipt-outline" size={22} color={colors.textMain} />
            </View>
            <Text style={styles.actionLabel}>খরচ লিখুন</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push('/(admin)/reminder')}
            activeOpacity={0.8}
          >
            <View style={styles.actionCircle}>
              <Ionicons name="volume-medium-outline" size={22} color={colors.textMain} />
            </View>
            <Text style={styles.actionLabel}>রিমাইন্ডার</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push('/(admin)/reports')}
            activeOpacity={0.8}
          >
            <View style={styles.actionCircle}>
              <Ionicons name="document-text-outline" size={22} color={colors.textMain} />
            </View>
            <Text style={styles.actionLabel}>রিপোর্ট</Text>
          </TouchableOpacity>
        </View>

        {/* 3. এ মাসের আদায় Card */}
        <Card style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>এ মাসের আদায়</Text>
            <Text style={styles.cardSubtitle}>শেষ তারিখ ১০ সেপ্টেম্বর</Text>
          </View>

          <View style={styles.collectionBody}>
            <ProgressRing
              progress={mockSomitiInfo.monthlyCollectedPct}
              size={80}
              strokeWidth={8}
              color={colors.primary}
            />

            <View style={styles.collectionStats}>
              <Text style={styles.collectionAmount}>
                {formatBengaliMoney(mockSomitiInfo.monthlyCollected)}
              </Text>
              <Text style={styles.collectionSub}>
                লক্ষ্য {formatBengaliMoney(mockSomitiInfo.monthlyTarget)} · বাকি {formatBengaliMoney(mockSomitiInfo.monthlyRemaining)}
              </Text>
            </View>
          </View>

          <View style={styles.collectionFooterRow}>
            <Text style={styles.paidText}>
              {toBengaliDigits(mockSomitiInfo.paidCount)} জন জমা দিয়েছেন
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(admin)/(tabs)/collection')}
              style={styles.dueLink}
            >
              <Text style={styles.dueText}>
                {toBengaliDigits(mockSomitiInfo.dueMembersCount)} জন বাকি ›
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

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
                <Text style={styles.halfCardTitle}>বকেয়া</Text>
              </View>
              <Text style={[styles.halfCardAmount, { color: colors.danger }]}>
                {formatBengaliMoney(mockSomitiInfo.totalDueAmount)}
              </Text>
              <Text style={styles.halfCardSub}>
                {toBengaliDigits(mockSomitiInfo.dueMembersCount)} জন · ৩ জন ৩+ মাস
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
                <Text style={styles.halfCardTitle}>চলমান প্রজেক্ট</Text>
              </View>
              <Text style={[styles.halfCardAmount, { color: colors.primary }]}>
                {toBengaliDigits(4)}টি
              </Text>
              <Text style={[styles.halfCardSub, { color: colors.success }]}>
                এ বছর লাভ {formatBengaliMoney(mockSomitiInfo.yearlyProjectProfit, { showPlusSign: true })}
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
                <Text style={styles.colLabel}>এ মাসের আয়</Text>
                <Text style={styles.colValue}>
                  {formatBengaliMoney(mockSomitiInfo.monthlyIncome)}
                </Text>
              </View>
              <View style={styles.colDivider} />
              <View style={styles.statCol}>
                <Text style={styles.colLabel}>এ মাসের ব্যয়</Text>
                <Text style={styles.colValue}>
                  {formatBengaliMoney(mockSomitiInfo.monthlyExpense)}
                </Text>
              </View>
              <View style={styles.colDivider} />
              <View style={styles.statCol}>
                <Text style={styles.colLabel}>নিট</Text>
                <Text style={[styles.colValue, { color: colors.primary }]}>
                  {formatBengaliMoney(mockSomitiInfo.monthlyNet)}
                </Text>
              </View>
            </View>
          </Card>
        </TouchableOpacity>

        {/* 6. আজকের ফলো-আপ */}
        <Card style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>আজকের ফলো-আপ</Text>
            <TouchableOpacity onPress={() => router.push('/(admin)/due')}>
              <Text style={styles.viewLinkText}>সব দেখুন</Text>
            </TouchableOpacity>
          </View>

          {mockTodayFollowups.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.followupRow,
                index === mockTodayFollowups.length - 1 && { borderBottomWidth: 0 },
              ]}
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
                  onPress={() => router.push('/(admin)/reminder')}
                >
                  <Ionicons name="call-outline" size={18} color={colors.textMain} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionIconBtn}
                  onPress={() => router.push('/(admin)/reminder')}
                >
                  <Ionicons name="chatbubble-outline" size={18} color={colors.textMain} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </Card>

        {/* 7. অনুমোদন অপেক্ষমাণ */}
        <Card style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>অনুমোদন অপেক্ষমাণ</Text>
            <TouchableOpacity onPress={() => router.push('/(admin)/approvals')}>
              <Text style={styles.viewLinkText}>সব দেখুন</Text>
            </TouchableOpacity>
          </View>

          {/* Item 1 */}
          <TouchableOpacity
            style={styles.approvalItem}
            onPress={() => router.push('/(admin)/approvals')}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.approvalItemTitle}>ব্যয়: সভার আপ্যায়ন · ৳১২,৫০০</Text>
              <Text style={styles.approvalItemSub}>কোষাধ্যক্ষ · আজ সকাল ১০:২০</Text>
            </View>
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>নতুন</Text>
            </View>
          </TouchableOpacity>

          {/* Item 2 */}
          <TouchableOpacity
            style={styles.approvalItem}
            onPress={() => router.push('/(admin)/approvals')}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.approvalItemTitle}>বিনিয়োগ: সাইট বি · ৳২,০০,০০০</Text>
              <Text style={styles.approvalItemSub}>কোষাধ্যক্ষ · গতকাল</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Item 3 */}
          <TouchableOpacity
            style={[styles.approvalItem, { borderBottomWidth: 0 }]}
            onPress={() => router.push('/(admin)/approvals')}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.approvalItemTitle}>সংশোধন: রসিদ #১০৭১</Text>
              <Text style={styles.approvalItemSub}>সম্পাদক · গতকাল</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
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
        <Text style={styles.fabText}>জমা নিন</Text>
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
