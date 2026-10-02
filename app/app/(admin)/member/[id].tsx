import React from 'react';
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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../src/theme/colors';
import { Card } from '../../../src/components/Card';
import { useSomitiStore } from '../../../src/store/somitiStore';
import { useLanguage } from '../../../src/i18n/useLanguage';

export default function MemberProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { l, formatMoney, formatNum, language } = useLanguage();
  const { getMemberById, members } = useSomitiStore();

  const member = getMemberById(String(id)) || members.find((m) => m.id === id) || members[0];

  const monthPills = [
    { name: l('Jan', 'জানু'), status: 'paid', label: l('Paid ✓', 'জমা ✓') },
    { name: l('Feb', 'ফেব্রু'), status: 'paid', label: l('Paid ✓', 'জমা ✓') },
    { name: l('Mar', 'মার্চ'), status: 'paid', label: l('Paid ✓', 'জমা ✓') },
    { name: l('Apr', 'এপ্রিল'), status: 'paid', label: l('Paid ✓', 'জমা ✓') },
    { name: l('May', 'মে'), status: 'paid', label: l('Paid ✓', 'জমা ✓') },
    { name: l('Jun', 'জুন'), status: 'paid', label: l('Paid ✓', 'জমা ✓') },
    { name: l('Jul', 'জুলাই'), status: 'paid', label: l('Paid ✓', 'জমা ✓') },
    { name: l('Aug', 'আগস্ট'), status: 'due', label: l('Due', 'বকেয়া') },
    { name: l('Sep', 'সেপ্টে'), status: 'due', label: l('Due', 'বকেয়া') },
    { name: l('Oct', 'অক্টো'), status: 'upcoming', label: l('Upcoming', 'আসন্ন') },
    { name: l('Nov', 'নভে'), status: 'upcoming', label: l('Upcoming', 'আসন্ন') },
    { name: l('Dec', 'ডিসে'), status: 'upcoming', label: l('Upcoming', 'আসন্ন') },
  ];

  const handleCall = () => {
    Linking.openURL(`tel:${member.phone.replace(/[^0-9]/g, '')}`);
  };

  const handleWhatsApp = () => {
    const cleanPhone = (member.whatsapp || member.phone).replace(/[^0-9]/g, '');
    const fullPhone = cleanPhone.startsWith('88') ? cleanPhone : `88${cleanPhone}`;
    Linking.openURL(`whatsapp://send?phone=${fullPhone}&text=আসসালামু আলাইকুম ${member.name} ভাই`);
  };

  const handleSMS = () => {
    Linking.openURL(`sms:${member.phone.replace(/[^0-9]/g, '')}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* App Bar */}
      <View style={styles.appBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textMain} />
        </TouchableOpacity>
        <Text style={styles.appBarTitle}>{l('Member Profile', 'সদস্য প্রোফাইল')}</Text>
        <View style={styles.appBarRight}>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="pencil-outline" size={20} color={colors.textMain} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="ellipsis-vertical" size={20} color={colors.textMain} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{member.name.charAt(0)}</Text>
          </View>
          <Text style={styles.memberName}>{member.name}</Text>
          <Text style={styles.memberSub}>
            {member.code} · {l('Joined', 'যোগদান')} {member.joinDate}
          </Text>

          <View style={styles.badgeRow}>
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>{l('Active', 'সক্রিয়')}</Text>
            </View>
            <View style={styles.dueBadge}>
              <Text style={styles.dueBadgeText}>
                {member.dueMonths ? `${formatNum(member.dueMonths)} ${l('Months Due', 'মাস বকেয়া')}` : l('No Due', 'কোনো বকেয়া নেই')}
              </Text>
            </View>
          </View>
        </View>

        {/* 4 Action Pills */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionPill} onPress={handleCall} activeOpacity={0.8}>
            <Ionicons name="call-outline" size={20} color={colors.textMain} />
            <Text style={styles.actionPillText}>{l('Call', 'কল')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionPill} onPress={handleWhatsApp} activeOpacity={0.8}>
            <Ionicons name="chatbubble-outline" size={20} color={colors.textMain} />
            <Text style={styles.actionPillText}>{l('WhatsApp', 'হোয়াটসঅ্যাপ')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionPill} onPress={handleSMS} activeOpacity={0.8}>
            <Ionicons name="mail-outline" size={20} color={colors.textMain} />
            <Text style={styles.actionPillText}>{l('SMS', 'এসএমএস')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionPill}
            onPress={() => router.push('/(admin)/statement')}
            activeOpacity={0.8}
          >
            <Ionicons name="document-text-outline" size={20} color={colors.textMain} />
            <Text style={styles.actionPillText}>{l('Statement', 'স্টেটমেন্ট')}</Text>
          </TouchableOpacity>
        </View>

        {/* Card: মোট জমা */}
        <Card style={styles.card}>
          <Text style={styles.cardSmallTitle}>{l('Total Deposit', 'মোট জমা')}</Text>
          <Text style={styles.cardLargeAmount}>
            {formatMoney(member.totalDeposit)}
          </Text>
          <Text style={styles.cardSubText}>
            {l('Monthly Deposit', 'মাসিক জমা')} {formatMoney(member.monthlyAmount)} · {formatNum(54)} {l('Months', 'মাস')}
          </Text>

          {/* Overdue Banner */}
          <View style={styles.overdueBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.overdueTitle}>{l('Due: August, September', 'বকেয়া: আগস্ট, সেপ্টেম্বর')}</Text>
              <Text style={styles.overdueSub}>{l('Inc. Late Fee ৳100', 'বিলম্ব ফি ৳১০০ সহ')}</Text>
            </View>
            <Text style={styles.overdueAmount}>{formatMoney(4100)}</Text>
          </View>

          {/* Profit 2-columns */}
          <View style={styles.profitGrid}>
            <View style={styles.profitCol}>
              <Text style={styles.profitLabel}>{l('2025 Profit', '২০২৫ সালের লাভ')}</Text>
              <Text style={[styles.profitVal, { color: colors.success }]}>
                +{formatMoney(member.profit2025 || 7800)}
              </Text>
            </View>
            <View style={styles.profitCol}>
              <Text style={styles.profitLabel}>{l('This Year (Est.)', 'এ বছর (আনুমানিক)')}</Text>
              <Text style={[styles.profitVal, { color: colors.primary }]}>
                +{formatMoney(member.estimatedProfit2026 || 5786)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Card: ২০২৬ সালের জমা (৭/৯ মাস) */}
        <Card style={styles.card}>
          <View style={styles.cardHeaderFlex}>
            <Text style={styles.cardTitle}>{l('2026 Deposits', '২০২৬ সালের জমা')}</Text>
            <Text style={styles.fractionText}>{l('7/9 Months', '৭/৯ মাস')}</Text>
          </View>

          <View style={styles.monthPillsGrid}>
            {monthPills.map((m, idx) => {
              const isPaid = m.status === 'paid';
              const isDue = m.status === 'due';

              return (
                <View
                  key={idx}
                  style={[
                    styles.monthPill,
                    isPaid && styles.monthPillPaid,
                    isDue && styles.monthPillDue,
                    !isPaid && !isDue && styles.monthPillUpcoming,
                  ]}
                >
                  <Text
                    style={[
                      styles.monthPillName,
                      isPaid && { color: '#FFFFFF' },
                      isDue && { color: '#D97706' },
                      !isPaid && !isDue && { color: colors.textMuted },
                    ]}
                  >
                    {m.name}
                  </Text>
                  <Text
                    style={[
                      styles.monthPillStatus,
                      isPaid && { color: '#CCFBF1' },
                      isDue && { color: '#D97706' },
                      !isPaid && !isDue && { color: colors.textMuted },
                    ]}
                  >
                    {m.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </Card>

        {/* Card: সাম্প্রতিক লেনদেন */}
        <Card style={styles.card}>
          <View style={styles.cardHeaderFlex}>
            <Text style={styles.cardTitle}>{l('Recent Transactions', 'সাম্প্রতিক লেনদেন')}</Text>
            <TouchableOpacity onPress={() => Alert.alert(l('Transactions', 'লেনদেন'), l('Full transaction history', 'সকল লেনদেনের ইতিহাস'))}>
              <Text style={styles.linkText}>{l('View All', 'সব দেখুন')}</Text>
            </TouchableOpacity>
          </View>

          {(member.recentTxns || [
            { date: l('8 July', '৮ জুলাই'), title: l('July Deposit', 'জুলাই মাসের জমা'), amount: 2000, receiptNo: '#1042', type: l('bKash', 'বিকাশ') },
            { date: l('9 June', '৯ জুন'), title: l('June Deposit', 'জুন মাসের জমা'), amount: 2000, receiptNo: '#0987', type: l('Cash in Hand', 'হাতে নগদ') },
            { date: l('15 January', '১৫ জানুয়ারি'), title: l('2025 Profit Share', '২০২৫ সালের লাভের অংশ'), amount: 7800, type: l('Annual Distribution', 'বার্ষিক বণ্টন') },
          ]).map((txn: any, index: number) => (
            <View
              key={index}
              style={[
                styles.txnRow,
                index === (member.recentTxns?.length || 3) - 1 && { borderBottomWidth: 0 },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.txnTitle}>{txn.title}</Text>
                <Text style={styles.txnMeta}>
                  {txn.date} · {txn.type} {txn.receiptNo ? `· ${l('Receipt', 'রসিদ')} ${txn.receiptNo}` : ''}
                </Text>
              </View>
              <Text style={styles.txnAmount}>
                +{formatMoney(txn.amount)}
              </Text>
            </View>
          ))}
        </Card>

        {/* Card: ব্যক্তিগত তথ্য */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>{l('Personal Information', 'ব্যক্তিগত তথ্য')}</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{l('Mobile', 'মোবাইল')}</Text>
            <Text style={styles.infoVal}>{member.phone}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{l('WhatsApp', 'হোয়াটসঅ্যাপ')}</Text>
            <Text style={styles.infoVal}>{member.whatsapp || member.phone}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{l('National ID (NID)', 'জাতীয় পরিচয়পত্র')}</Text>
            <Text style={styles.infoVal}>{member.nid || '1985 2612 7449 031'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{l('Nominee', 'নমিনি')}</Text>
            <Text style={styles.infoVal}>{member.nomineeName} ({member.nomineeRelation})</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoLabel}>{l('Address', 'ঠিকানা')}</Text>
            <Text style={styles.infoVal}>{member.address || l('[Address]', '[ঠিকানা]')}</Text>
          </View>
        </Card>

        {/* Card: পরবর্তী ফলো-আপ */}
        <Card style={styles.card}>
          <View style={styles.followupCardRow}>
            <Ionicons name="calendar-outline" size={20} color={colors.textMain} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.followupHeader}>{l('Next Follow-up: 3 October', 'পরবর্তী ফলো-আপ: ৩ অক্টোবর')}</Text>
              <Text style={styles.followupText}>{l('28 Sep call: "Will pay at month start"', '২৮ সেপ্টেম্বর কল: "মাসের শুরুতে দেবেন"')}</Text>
            </View>
            <TouchableOpacity style={styles.iconBtn}>
              <Ionicons name="pencil-outline" size={18} color={colors.textMain} />
            </TouchableOpacity>
          </View>
        </Card>

        {/* Bottom Full-Width Action Button */}
        <TouchableOpacity
          style={styles.bottomPayBtn}
          onPress={() => router.push('/(admin)/deposit/new')}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.bottomPayBtnText}>{l('Collect Deposit', 'জমা নিন')}</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: colors.background,
  },
  backBtn: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appBarTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 18,
    color: colors.textMain,
  },
  appBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  headerCard: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 24,
    color: colors.primary,
  },
  memberName: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 20,
    color: colors.textMain,
  },
  memberSub: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  activeBadge: {
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activeBadgeText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 11,
    color: colors.primary,
  },
  dueBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dueBadgeText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 11,
    color: '#B45309',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 8,
  },
  actionPill: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 4,
  },
  actionPillText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 12,
    color: colors.textMain,
  },
  card: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 16,
  },
  cardSmallTitle: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 12,
    color: colors.textMuted,
  },
  cardLargeAmount: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 28,
    color: colors.textMain,
    marginVertical: 2,
  },
  cardSubText: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 10,
  },
  overdueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  overdueTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 13,
    color: '#92400E',
  },
  overdueSub: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: '#B45309',
  },
  overdueAmount: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 16,
    color: '#92400E',
  },
  profitGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  profitCol: {
    flex: 1,
  },
  profitLabel: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: colors.textMuted,
  },
  profitVal: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 15,
    marginTop: 2,
  },
  cardHeaderFlex: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 15,
    color: colors.textMain,
  },
  fractionText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 12,
    color: colors.textMuted,
  },
  linkText: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 12,
    color: colors.textMuted,
  },
  monthPillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthPill: {
    width: '23%',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  monthPillPaid: {
    backgroundColor: colors.primary,
  },
  monthPillDue: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  monthPillUpcoming: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  monthPillName: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 12,
  },
  monthPillStatus: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 10,
    marginTop: 1,
  },
  txnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  txnTitle: {
    fontFamily: 'HindSiliguri-SemiBold',
    fontSize: 13,
    color: colors.textMain,
  },
  txnMeta: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 11,
    color: colors.textMuted,
  },
  txnAmount: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 14,
    color: colors.textMain,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: colors.textMuted,
  },
  infoVal: {
    fontFamily: 'HindSiliguri-Medium',
    fontSize: 13,
    color: colors.textMain,
  },
  followupCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  followupHeader: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 13,
    color: colors.textMain,
  },
  followupText: {
    fontFamily: 'HindSiliguri-Regular',
    fontSize: 12,
    color: colors.textMuted,
  },
  bottomPayBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 30,
    gap: 6,
    marginTop: 6,
  },
  bottomPayBtnText: {
    fontFamily: 'HindSiliguri-Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },
});
