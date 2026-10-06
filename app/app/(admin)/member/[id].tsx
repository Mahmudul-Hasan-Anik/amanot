import React, { useState } from 'react';
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
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { Card } from '../../../src/components/Card';
import { Button } from '../../../src/components/Button';
import { StickyCTA } from '../../../src/components/StickyCTA';
import { AppModal } from '../../../src/components/AppModal';
import { useSomitiStore } from '../../../src/store/somitiStore';
import { useAuthStore } from '../../../src/features/auth/authStore';
import { useLanguage } from '../../../src/i18n/useLanguage';
import { isSupabaseConfigured } from '../../../src/lib/supabase';
import { BENGALI_MONTHS_FULL } from '../../../src/lib/bengali';
import { ENGLISH_MONTHS } from '../../../src/lib/months';
import { safeBack } from '../../../src/utils/navigation';
import { toEnglishDigits, toBengaliDigits } from '../../../src/lib/bengali';

export default function MemberProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { l, isBengali, formatMoney, formatNum } = useLanguage();
  const { getMemberById, members, updateMember, deleteMember } = useSomitiStore();
  const { resetMemberPin, customPins, actualRole, currentUser } = useAuthStore();
  const isAdminUser = actualRole === 'super_admin' || actualRole === 'admin';

  const member = getMemberById(String(id)) || members.find((m) => m.id === id) || members[0];

  // Edit Member Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState(member?.name || '');
  const [editPhone, setEditPhone] = useState(member?.phone || '');
  const [editAddress, setEditAddress] = useState(member?.address || '');
  const [editMonthlyAmount, setEditMonthlyAmount] = useState(String(member?.monthlyAmount || 2000));
  const [editNomineeName, setEditNomineeName] = useState(member?.nomineeName || '');
  const [editNomineeRelation, setEditNomineeRelation] = useState(member?.nomineeRelation || '');

  // Edit Follow-up Modal State
  const [showFollowupModal, setShowFollowupModal] = useState(false);
  const [followupDate, setFollowupDate] = useState(
    member?.nextFollowup?.date || ''
  );
  const [followupNote, setFollowupNote] = useState(
    member?.nextFollowup?.note || ''
  );

  const openEditModal = () => {
    if (member) {
      setEditName(member.name);
      setEditPhone(toEnglishDigits(member.phone));
      setEditAddress(member.address && member.address !== '[ঠিকানা]' ? member.address : '');
      setEditMonthlyAmount(String(member.monthlyAmount || 2000));
      setEditNomineeName(member.nomineeName || '');
      setEditNomineeRelation(member.nomineeRelation || '');
      setShowEditModal(true);
    }
  };

  const handleSaveEdit = () => {
    if (!editName.trim() || !editPhone.trim()) {
      Alert.alert(l('Error', 'ত্রুটি'), l('Name and phone are required', 'নাম ও মোবাইল নম্বর আবশ্যক'));
      return;
    }

    updateMember(member.id, {
      name: editName.trim(),
      phone: editPhone.trim(),
      address: editAddress.trim() || '[ঠিকানা]',
      monthlyAmount: parseInt(toEnglishDigits(editMonthlyAmount), 10) || 2000,
      nomineeName: editNomineeName.trim(),
      nomineeRelation: editNomineeRelation.trim(),
    });

    setShowEditModal(false);
    Alert.alert(l('Success', 'সফল'), l('Member updated successfully', 'সদস্যের তথ্য সফলভাবে হালনাগাদ হয়েছে'));
  };

  const handleSaveFollowup = () => {
    if (!followupDate.trim()) {
      Alert.alert(l('Error', 'ত্রুটি'), l('Follow-up date is required', 'ফলো-আপ তারিখ আবশ্যক'));
      return;
    }

    updateMember(member.id, {
      nextFollowup: {
        date: followupDate.trim(),
        note: followupNote.trim(),
      },
    });

    setShowFollowupModal(false);
    Alert.alert(l('Success', 'সফল'), l('Follow-up updated successfully', 'ফলো-আপ তথ্য সফলভাবে হালনাগাদ হয়েছে'));
  };

  const handleResetPin = () => {
    Alert.alert(
      l('Reset PIN to 1234?', 'পিন ১২৩৪ এ রিসেট করবেন?'),
      l(
        `Are you sure you want to reset PIN for ${member.name}? The new default PIN will be 1234.`,
        `আপনি কি নিশ্চিত যে ${member.name}-এর পিন ১২৩৪ এ রিসেট করতে চান? সদস্য ১২৩৪ দিয়ে লগইন করতে পারবেন।`
      ),
      [
        { text: l('Cancel', 'বাতিল'), style: 'cancel' },
        {
          text: l('Yes, Reset', 'হ্যাঁ, রিসেট করুন'),
          onPress: () => {
            resetMemberPin(member.id);
            Alert.alert(
              l('PIN Reset Done', 'পিন রিসেট সফল'),
              l(
                `PIN reset to 1234 for ${member.name}. Member can now log in with this PIN.`,
                `${member.name}-এর পিন ১২৩৪ এ সফলভাবে রিসেট করা হয়েছে। সদস্য এখন ১২৩৪ দিয়ে লগইন করতে পারবেন।`
              )
            );
          },
        },
      ]
    );
  };

  const displayName = isBengali ? member.name : (member.nameEn || member.name);
  const displayNominee = isBengali ? member.nomineeName : (member.nomineeNameEn || member.nomineeName);

  const handleCall = () => {
    const raw = toEnglishDigits(member.phone || '').replace(/[^0-9]/g, '');
    if (raw) {
      Linking.openURL(`tel:${raw}`);
    } else {
      Alert.alert(l('Error', 'ত্রুটি'), l('No valid phone number found', 'মোবাইল নম্বর পাওয়া যায়নি'));
    }
  };

  const handleWhatsApp = () => {
    const raw = toEnglishDigits(member.whatsapp || member.phone || '').replace(/[^0-9]/g, '');
    if (!raw) {
      Alert.alert(l('Error', 'ত্রুটি'), l('No valid phone number found', 'মোবাইল নম্বর পাওয়া যায়নি'));
      return;
    }
    const fullPhone = raw.startsWith('88') ? raw : `88${raw}`;
    const greeting = l(`Assalamu Alaikum ${displayName}`, `আসসালামু আলাইকুম ${displayName} ভাই`);
    Linking.openURL(`https://wa.me/${fullPhone}?text=${encodeURIComponent(greeting)}`);
  };

  const handleSMS = () => {
    const raw = toEnglishDigits(member.phone || '').replace(/[^0-9]/g, '');
    if (raw) {
      Linking.openURL(`sms:${raw}`);
    } else {
      Alert.alert(l('Error', 'ত্রুটি'), l('No valid phone number found', 'মোবাইল নম্বর পাওয়া যায়নি'));
    }
  };

  const handleSendWhatsAppLoginInfo = () => {
    const raw = toEnglishDigits(member.whatsapp || member.phone || '').replace(/[^0-9]/g, '');
    if (!raw) {
      Alert.alert(l('Error', 'ত্রুটি'), l('No valid phone number found', 'মোবাইল নম্বর পাওয়া যায়নি'));
      return;
    }
    const fullPhone = raw.startsWith('88') ? raw : `88${raw}`;
    const currPin = isSupabaseConfigured() ? l('(PIN given by admin)', '(অ্যাডমিনের দেওয়া পিন)') : customPins[member.id] || '1234';
    const text = isBengali
      ? `আসসালামু আলাইকুম ${member.name}।\nআমানত সমিতিতে আপনার সদস্য পোর্টাল প্রস্তুত।\n\nআইডি: ${member.code}\nমোবাইল: ${formatNum(member.phone)}\nলগইন পিন: ${formatNum(currPin)}\n\nঅ্যাপে লগইন করে আপনার মাসিক সঞ্চয় ও রসিদ দেখতে পারবেন।`
      : `Assalamu Alaikum ${displayName}.\nYour member portal at Amanot Somiti is ready.\n\nMember ID: ${member.code}\nMobile: ${formatNum(member.phone)}\nLogin PIN: ${formatNum(currPin)}\n\nLog in to the app to view your monthly savings and receipts.`;
    Linking.openURL(`https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`);
  };

  const handleMoreOptions = () => {
    Alert.alert(
      displayName,
      l('Member actions:', 'সদস্যের অ্যাকশন:'),
      [
        {
          text: l('Send Login PIN via WhatsApp', 'হোয়াটসঅ্যাপে লগইন পিন পাঠান'),
          onPress: handleSendWhatsAppLoginInfo,
        },
        {
          text: l('Reset PIN (1234)', 'পিন রিসেট (১২৩৪)'),
          onPress: handleResetPin,
        },
        {
          text: l('Edit Member Info', 'সদস্যের তথ্য সংশোধন'),
          onPress: openEditModal,
        },
        {
          text: l('Update Follow-up', 'ফলো-আপ আপডেট'),
          onPress: () => setShowFollowupModal(true),
        },
        ...(isAdminUser && member.id !== currentUser?.id
          ? [
              {
                text: member.status === 'inactive' ? l('Reactivate member', 'সদস্য সক্রিয় করুন') : l('Mark inactive', 'নিষ্ক্রিয় করুন'),
                onPress: () => updateMember(member.id, { status: member.status === 'inactive' ? 'paid' : 'inactive' }),
              },
              {
                text: l('Remove member', 'সদস্য বাদ দিন'),
                style: 'destructive' as const,
                onPress: () =>
                  Alert.alert(
                    l('Remove member?', 'সদস্য বাদ দেবেন?'),
                    l(
                      `${member.name} will be removed from the list and can no longer log in. Their past transactions stay in the ledger.`,
                      `${member.name} তালিকা থেকে বাদ যাবেন এবং লগইন করতে পারবেন না। আগের লেনদেন হিসাবে থেকে যাবে।`
                    ),
                    [
                      { text: l('Cancel', 'বাতিল'), style: 'cancel' },
                      {
                        text: l('Remove', 'বাদ দিন'),
                        style: 'destructive',
                        onPress: () => {
                          deleteMember(member.id);
                          router.replace('/(admin)/(tabs)/members');
                        },
                      },
                    ]
                  ),
              },
            ]
          : []),
        {
          text: l('Cancel', 'বাতিল'),
          style: 'cancel',
        },
      ]
    );
  };

  const formatJoinDate = (dateStr: string) => {
    if (!dateStr) return '';
    if (isBengali) {
      return toBengaliDigits(
        dateStr
          .replace(/January/i, 'জানুয়ারি')
          .replace(/February/i, 'ফেব্রুয়ারি')
          .replace(/March/i, 'মার্চ')
          .replace(/April/i, 'এপ্রিল')
          .replace(/May/i, 'মে')
          .replace(/June/i, 'জুন')
          .replace(/July/i, 'জুলাই')
          .replace(/August/i, 'আগস্ট')
          .replace(/September/i, 'সেপ্টেম্বর')
          .replace(/October/i, 'অক্টোবর')
          .replace(/November/i, 'নভেম্বর')
          .replace(/December/i, 'ডিসেম্বর')
      );
    }
    return toEnglishDigits(
      dateStr
        .replace(/জানুয়ারি/g, 'January')
        .replace(/ফেব্রুয়ারি/g, 'February')
        .replace(/মার্চ/g, 'March')
        .replace(/এপ্রিল/g, 'April')
        .replace(/মে/g, 'May')
        .replace(/জুন/g, 'June')
        .replace(/জুলাই/g, 'July')
        .replace(/আগস্ট/g, 'August')
        .replace(/সেপ্টেম্বর/g, 'September')
        .replace(/অক্টোবর/g, 'October')
        .replace(/নভেম্বর/g, 'November')
        .replace(/ডিসেম্বর/g, 'December')
    );
  };

  const formatRelation = (relation?: string) => {
    if (!relation) return '';
    const map: Record<string, { en: string; bn: string }> = {
      'স্ত্রী': { en: 'Wife', bn: 'স্ত্রী' },
      'স্বামী': { en: 'Husband', bn: 'স্বামী' },
      'পুত্র': { en: 'Son', bn: 'পুত্র' },
      'কন্যা': { en: 'Daughter', bn: 'কন্যা' },
      'ভাই': { en: 'Brother', bn: 'ভাই' },
      'বোন': { en: 'Sister', bn: 'বোন' },
      'মা': { en: 'Mother', bn: 'মা' },
      'বাবা': { en: 'Father', bn: 'বাবা' },
    };
    if (map[relation]) {
      return l(map[relation].en, map[relation].bn);
    }
    return relation;
  };

  const SHORT_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const SHORT_BN = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];
  const thisYear = new Date().getFullYear();
  const thisMonth = new Date().getMonth();
  const monthsData = SHORT_EN.map((en, i) => ({
    name: l(en, SHORT_BN[i]),
    status: (member?.monthsStatus?.[i] === 'paid' ? 'paid' : member?.monthsStatus?.[i] === 'due' ? 'due' : 'upcoming') as
      | 'paid'
      | 'due'
      | 'upcoming',
  }));
  const paidMonthsCount = monthsData.filter((m) => m.status === 'paid').length;
  const dueMonthIdx = monthsData.map((m, i) => (m.status === 'due' ? i : -1)).filter((i) => i >= 0);
  const dueMonthNames = dueMonthIdx.map((i) => l(ENGLISH_MONTHS[i], BENGALI_MONTHS_FULL[i])).join(', ');
  const joinISO: string | undefined = (member as any)?.joinDateISO;
  const monthsSinceJoin = joinISO
    ? Math.max(
        0,
        (thisYear - Number(joinISO.slice(0, 4))) * 12 + (thisMonth - (Number(joinISO.slice(5, 7)) - 1)) + 1
      )
    : 0;
  const elapsedThisYear = joinISO && Number(joinISO.slice(0, 4)) === thisYear ? thisMonth - (Number(joinISO.slice(5, 7)) - 1) + 1 : thisMonth + 1;

  const recentTransactions = (member?.recentTxns || []).map((t) => ({
    date: t.date,
    title: t.title,
    amount: t.amount,
    receipt: t.receiptNo,
    type: t.type,
  }));

  const infoRows = [
    { label: l('Mobile', 'মোবাইল'), value: formatNum(member.phone) },
    { label: l('WhatsApp', 'হোয়াটসঅ্যাপ'), value: formatNum(member.whatsapp || member.phone) },
    { label: l('National ID (NID)', 'জাতীয় পরিচয়পত্র'), value: member.nid ? formatNum(member.nid) : '—' },
    {
      label: l('Nominee', 'নমিনি'),
      value: member.nomineeRelation ? `${displayNominee} (${formatRelation(member.nomineeRelation)})` : displayNominee || '—',
    },
    {
      label: l('Address', 'ঠিকানা'),
      value:
        member.address && member.address !== '[ঠিকানা]'
          ? isBengali
            ? member.address
            : toEnglishDigits(member.address)
          : l('[Address]', '[ঠিকানা]'),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      {/* App Bar */}
      <View style={styles.appBar}>
        <TouchableOpacity
          testID="member-back-btn"
          onPress={() => safeBack(router, '/(admin)/(tabs)/members')}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.appBarTitle}>{l('Member Profile', 'সদস্য প্রোফাইল')}</Text>
        <View style={styles.appBarRight}>
          <TouchableOpacity
            testID="member-edit-btn"
            style={styles.iconBtn}
            onPress={openEditModal}
            activeOpacity={0.7}
          >
            <Ionicons name="pencil-outline" size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            testID="member-more-btn"
            style={styles.iconBtn}
            onPress={handleMoreOptions}
            activeOpacity={0.7}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header Card */}
        <View style={styles.headerProfileRow}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{displayName.charAt(0)}</Text>
          </View>
          <View style={styles.profileDetailsCol}>
            <Text style={styles.memberName}>{displayName}</Text>
            <Text style={styles.memberSub}>
              {member.code} · {l('Joined', 'যোগদান')} {formatJoinDate(member.joinDate)}
            </Text>

            <View style={styles.badgeRow}>
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>{l('Active', 'সক্রিয়')}</Text>
              </View>
              <View style={styles.dueBadge}>
                <Text style={styles.dueBadgeText}>
                  {member.dueMonths
                    ? `${formatNum(member.dueMonths)} ${l('Months Due', 'মাস বকেয়া')}`
                    : l('No Due', 'কোনো বকেয়া নেই')}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 4 Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            testID="member-call-btn"
            style={styles.actionBtn}
            onPress={handleCall}
            activeOpacity={0.8}
          >
            <Ionicons name="call-outline" size={20} color={colors.text} />
            <Text style={styles.actionBtnText}>{l('Call', 'কল')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="member-whatsapp-btn"
            style={styles.actionBtn}
            onPress={handleWhatsApp}
            activeOpacity={0.8}
          >
            <Ionicons name="chatbubble-outline" size={20} color={colors.text} />
            <Text style={styles.actionBtnText}>{l('WhatsApp', 'হোয়াটসঅ্যাপ')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="member-sms-btn"
            style={styles.actionBtn}
            onPress={handleSMS}
            activeOpacity={0.8}
          >
            <Ionicons name="mail-outline" size={20} color={colors.text} />
            <Text style={styles.actionBtnText}>{l('SMS', 'এসএমএস')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="member-statement-btn"
            style={styles.actionBtn}
            onPress={() => router.push(`/(admin)/statement?memberId=${member.id}`)}
            activeOpacity={0.8}
          >
            <Ionicons name="document-text-outline" size={20} color={colors.text} />
            <Text style={styles.actionBtnText}>{l('Statement', 'স্টেটমেন্ট')}</Text>
          </TouchableOpacity>
        </View>

        {/* Card: মোট জমা */}
        <Card style={styles.card}>
          <Text style={styles.cardSmallTitle}>{l('Total Deposit', 'মোট জমা')}</Text>
          <Text style={styles.cardLargeAmount}>
            {formatMoney(member.totalDeposit)}
          </Text>
          <Text style={styles.cardSubText}>
            {l('Monthly Deposit', 'মাসিক জমা')} {formatMoney(member.monthlyAmount)} · {formatNum(monthsSinceJoin)} {l('Months', 'মাস')}
          </Text>

          {/* Overdue Banner */}
          {member.dueAmount > 0 && (
            <View style={styles.overdueBanner}>
              <View style={{ flex: 1 }}>
                <Text style={styles.overdueTitle}>{l(`Due: ${dueMonthNames}`, `বকেয়া: ${dueMonthNames}`)}</Text>
                <Text style={styles.overdueSub}>
                  {formatNum(member.dueMonths)} {l('month(s) · incl. late fee if any', 'মাস · বিলম্ব ফি থাকলে সহ')}
                </Text>
              </View>
              <Text style={styles.overdueAmount}>{formatMoney(member.dueAmount)}</Text>
            </View>
          )}

          {/* Profit 2-columns */}
          <View style={styles.profitGrid}>
            <View style={styles.profitCol}>
              <Text style={styles.profitLabel}>{l(`${thisYear - 1} Profit`, `${toBengaliDigits(thisYear - 1)} সালের লাভ`)}</Text>
              <Text style={styles.profitVal}>
                +{formatMoney(member.profit2025 || 0)}
              </Text>
            </View>
            <View style={styles.profitCol}>
              <Text style={styles.profitLabel}>{l('This Year (Est.)', 'এ বছর (আনুমানিক)')}</Text>
              <Text style={styles.profitVal}>
                +{formatMoney(member.estimatedProfit2026 || 0)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Card: ২০২৬ সালের জমা (৭/৯ মাস) */}
        <Card style={styles.card}>
          <View style={styles.cardHeaderFlex}>
            <Text style={styles.cardTitle}>{l(`${thisYear} Deposits`, `${toBengaliDigits(thisYear)} সালের জমা`)}</Text>
            <Text style={styles.fractionText}>{`${formatNum(paidMonthsCount)}/${formatNum(Math.max(0, elapsedThisYear))} ${l('Months', 'মাস')}`}</Text>
          </View>

          <View style={styles.monthGrid}>
            {monthsData.map((m, idx) => {
              const isPaid = m.status === 'paid';
              const isDue = m.status === 'due';

              return (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.75}
                  onPress={() => {
                    if (isDue) {
                      router.push(`/(admin)/deposit/new?memberId=${member.id}`);
                    } else if (isPaid) {
                      Alert.alert(
                        l('Paid Month', 'পরিশোধিত মাস'),
                        l(
                          `${m.name} deposit of ${formatMoney(member.monthlyAmount)} was received.`,
                          `${m.name} মাসের জমা ${formatMoney(member.monthlyAmount)} পরিশোধিত হয়েছে।`
                        )
                      );
                    } else {
                      Alert.alert(
                        l('Upcoming Month', 'আসন্ন মাস'),
                        l(`${m.name} deposit is not yet due.`, `${m.name} মাসের জমা এখনো শুরু হয়নি।`)
                      );
                    }
                  }}
                  style={[
                    styles.monthTile,
                    isPaid && styles.monthTilePaid,
                    isDue && styles.monthTileDue,
                    !isPaid && !isDue && styles.monthTileUpcoming,
                  ]}
                >
                  <Text
                    style={[
                      styles.monthTileName,
                      isPaid && styles.monthNamePaid,
                      isDue && styles.monthNameDue,
                      !isPaid && !isDue && styles.monthNameUpcoming,
                    ]}
                  >
                    {m.name}
                  </Text>
                  <Text
                    style={[
                      styles.monthTileStatus,
                      isPaid && styles.monthStatusPaid,
                      isDue && styles.monthStatusDue,
                      !isPaid && !isDue && styles.monthStatusUpcoming,
                    ]}
                  >
                    {isPaid ? l('Paid ✓', 'জমা ✓') : isDue ? l('Due', 'বকেয়া') : l('Upcoming', 'আসন্ন')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* Card: সাম্প্রতিক লেনদেন */}
        <View style={styles.sectionHeaderFlex}>
          <Text style={styles.sectionTitle}>{l('Recent Transactions', 'সাম্প্রতিক লেনদেন')}</Text>
          <TouchableOpacity
            testID="member-view-all-txns"
            onPress={() => router.push(`/(admin)/statement?memberId=${member.id}`)}
            activeOpacity={0.7}
          >
            <Text style={styles.viewAllLink}>{l('View All', 'সব দেখুন')}</Text>
          </TouchableOpacity>
        </View>

        <Card style={styles.card}>
          {recentTransactions.length === 0 && (
            <Text style={[styles.txnMeta, { paddingVertical: 12 }]}>{l('No transactions yet', 'এখনো কোনো লেনদেন নেই')}</Text>
          )}
          {recentTransactions.map((txn, index) => (
            <TouchableOpacity
              key={index}
              activeOpacity={0.7}
              onPress={() => router.push(`/(admin)/statement?memberId=${member.id}`)}
              style={[
                styles.txnRow,
                index === recentTransactions.length - 1 && { borderBottomWidth: 0 },
              ]}
            >
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.txnTitle}>{txn.title}</Text>
                <Text style={styles.txnMeta}>
                  {txn.date} · {txn.type} {txn.receipt ? `· ${l('Receipt', 'রসিদ')} ${txn.receipt}` : ''}
                </Text>
              </View>
              <Text style={styles.txnAmount}>
                +{formatMoney(txn.amount)}
              </Text>
            </TouchableOpacity>
          ))}
        </Card>

        {/* Card: ব্যক্তিগত তথ্য */}
        <Text style={styles.sectionTitleAlone}>{l('Personal Information', 'ব্যক্তিগত তথ্য')}</Text>
        <Card style={styles.card}>
          {infoRows.map((info, idx) => (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.7}
              onPress={openEditModal}
              style={[
                styles.infoRow,
                idx === infoRows.length - 1 && { borderBottomWidth: 0 },
              ]}
            >
              <Text style={styles.infoLabel}>{info.label}</Text>
              <Text style={styles.infoVal}>{info.value}</Text>
            </TouchableOpacity>
          ))}
        </Card>

        {/* Card: পরবর্তী ফলো-আপ */}
        <TouchableOpacity
          testID="member-followup-card"
          activeOpacity={0.8}
          onPress={() => setShowFollowupModal(true)}
        >
          <Card style={styles.followupCard}>
            <View style={styles.followupCardRow}>
              <Ionicons name="calendar-outline" size={22} color={colors.text} />
              <View style={styles.followupContent}>
                <Text style={styles.followupHeader}>
                  {l('Next Follow-up:', 'পরবর্তী ফলো-আপ:')} {followupDate || l('Not set', 'নির্ধারিত নেই')}
                </Text>
                <Text style={styles.followupText}>
                  {followupNote}
                </Text>
              </View>
              <View style={styles.followupEditBtn}>
                <Ionicons name="pencil-outline" size={18} color={colors.textSecondary} />
              </View>
            </View>
          </Card>
        </TouchableOpacity>

        <View style={{ height: 16 }} />
      </ScrollView>

      {/* Sticky Bottom CTA */}
      <StickyCTA backgroundColor={colors.bg} style={styles.stickyCTA}>
        <TouchableOpacity
          testID="member-collect-deposit-btn"
          style={styles.bottomPayBtn}
          onPress={() => router.push(`/(admin)/deposit/new?memberId=${member.id}`)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={20} color={colors.surface} />
          <Text style={styles.bottomPayBtnText}>{l('Collect Deposit', 'জমা নিন')}</Text>
        </TouchableOpacity>
      </StickyCTA>

      {/* Edit Member Modal */}
      <AppModal visible={showEditModal} onClose={() => setShowEditModal(false)}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{l('Edit Member Info', 'সদস্যের তথ্য সংশোধন')}</Text>
          <TouchableOpacity onPress={() => setShowEditModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.modalInputLabel}>{l('Member Name', 'সদস্যের পুরো নাম')}</Text>
        <TextInput
          testID="edit-name-input"
          style={styles.modalInput}
          value={editName}
          onChangeText={setEditName}
          placeholder={l('Name', 'নাম')}
          placeholderTextColor={colors.textSecondary}
        />

        <Text style={styles.modalInputLabel}>{l('Mobile Number', 'মোবাইল নম্বর')}</Text>
        <TextInput
          testID="edit-phone-input"
          style={styles.modalInput}
          value={editPhone}
          onChangeText={(t) => setEditPhone(toEnglishDigits(t))}
          keyboardType="phone-pad"
          placeholderTextColor={colors.textSecondary}
        />

        <Text style={styles.modalInputLabel}>{l('Monthly Deposit Amount (৳)', 'মাসিক জমার পরিমাণ (৳)')}</Text>
        <TextInput
          testID="edit-amount-input"
          style={styles.modalInput}
          value={editMonthlyAmount}
          onChangeText={(t) => setEditMonthlyAmount(toEnglishDigits(t))}
          keyboardType="number-pad"
          placeholderTextColor={colors.textSecondary}
        />

        <Text style={styles.modalInputLabel}>{l('Nominee Name', 'নমিনির নাম')}</Text>
        <TextInput
          testID="edit-nominee-input"
          style={styles.modalInput}
          value={editNomineeName}
          onChangeText={setEditNomineeName}
          placeholderTextColor={colors.textSecondary}
        />

        <Text style={styles.modalInputLabel}>{l('Nominee Relationship', 'সম্পর্ক')}</Text>
        <TextInput
          testID="edit-relation-input"
          style={styles.modalInput}
          value={editNomineeRelation}
          onChangeText={setEditNomineeRelation}
          placeholderTextColor={colors.textSecondary}
        />

        <Text style={styles.modalInputLabel}>{l('Address', 'ঠিকানা')}</Text>
        <TextInput
          testID="edit-address-input"
          style={styles.modalInput}
          value={editAddress}
          onChangeText={setEditAddress}
          placeholderTextColor={colors.textSecondary}
        />

        <Button
          testID="edit-member-save-btn"
          title={l('Save Changes', 'তথ্য সংরক্ষণ করুন')}
          variant="primary"
          onPress={handleSaveEdit}
          style={{ marginTop: 16 }}
        />
      </AppModal>

      {/* Edit Follow-up Modal */}
      <AppModal visible={showFollowupModal} onClose={() => setShowFollowupModal(false)}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{l('Update Follow-up', 'ফলো-আপ আপডেট')}</Text>
          <TouchableOpacity onPress={() => setShowFollowupModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.modalInputLabel}>{l('Follow-up Date', 'ফলো-আপের তারিখ')}</Text>
        <TextInput
          testID="edit-followup-date-input"
          style={styles.modalInput}
          value={followupDate}
          onChangeText={setFollowupDate}
          placeholder={l('e.g. 3 October', 'যেমন: ৩ অক্টোবর')}
          placeholderTextColor={colors.textSecondary}
        />

        <Text style={styles.modalInputLabel}>{l('Follow-up Note', 'নোট / আলোচনা')}</Text>
        <TextInput
          testID="edit-followup-note-input"
          style={[styles.modalInput, { minHeight: 64, textAlignVertical: 'top' }]}
          value={followupNote}
          onChangeText={setFollowupNote}
          multiline
          placeholder={l('Follow-up details...', 'আলোচনার বিবরণ...')}
          placeholderTextColor={colors.textSecondary}
        />

        <Button
          testID="edit-followup-save-btn"
          title={l('Save Follow-up', 'সংরক্ষণ করুন')}
          variant="primary"
          onPress={handleSaveFollowup}
          style={{ marginTop: 16 }}
        />
      </AppModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: colors.bg,
  },
  backBtn: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appBarTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.title,
    color: colors.text,
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
    paddingTop: 8,
  },
  headerProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
    marginTop: 4,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xxl,
    color: colors.primary,
  },
  profileDetailsCol: {
    flex: 1,
  },
  memberName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xl,
    color: colors.text,
  },
  memberSub: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  activeBadge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  activeBadgeText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.xs,
    color: colors.primary,
  },
  dueBadge: {
    backgroundColor: colors.warningSoft,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  dueBadgeText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.xs,
    color: colors.warning,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  actionBtnText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.caption,
    color: colors.text,
  },
  card: {
    padding: 16,
    marginBottom: 14,
    borderRadius: 18,
    backgroundColor: colors.surface,
  },
  cardSmallTitle: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.caption,
    color: colors.textSecondary,
  },
  cardLargeAmount: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.headline,
    color: colors.text,
    marginVertical: 4,
  },
  cardSubText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    color: colors.textSecondary,
    marginBottom: 14,
  },
  overdueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.warningSoft,
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  overdueTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.sm,
    color: colors.warning,
  },
  overdueSub: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.warning,
    marginTop: 2,
  },
  overdueAmount: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.base,
    color: colors.warning,
  },
  profitGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  profitCol: {
    flex: 1,
  },
  profitLabel: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    color: colors.textSecondary,
  },
  profitVal: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    color: colors.primary,
    marginTop: 2,
  },
  cardHeaderFlex: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    color: colors.text,
  },
  fractionText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.caption,
    color: colors.textSecondary,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthTile: {
    flexBasis: '22.8%',
    flexGrow: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTilePaid: {
    backgroundColor: colors.primary,
  },
  monthTileDue: {
    backgroundColor: colors.warningSoft,
    borderWidth: 1.5,
    borderColor: colors.warning,
  },
  monthTileUpcoming: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  monthTileName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.caption,
  },
  monthTileStatus: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.tiny,
    marginTop: 2,
  },
  monthNamePaid: {
    color: colors.surface,
  },
  monthStatusPaid: {
    color: colors.primarySoft,
  },
  monthNameDue: {
    color: colors.warning,
  },
  monthStatusDue: {
    color: colors.warning,
  },
  monthNameUpcoming: {
    color: colors.textSecondary,
  },
  monthStatusUpcoming: {
    color: colors.textSecondary,
  },
  sectionHeaderFlex: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 2,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    color: colors.text,
  },
  sectionTitleAlone: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    color: colors.text,
    marginBottom: 8,
    marginTop: 2,
  },
  viewAllLink: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.caption,
    color: colors.primary,
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
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  txnMeta: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  txnAmount: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.subhead,
    color: colors.primary,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    color: colors.textSecondary,
  },
  infoVal: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  followupCard: {
    padding: 14,
    marginBottom: 10,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  followupCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  followupContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 6,
  },
  followupHeader: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  followupText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  followupEditBtn: {
    padding: 6,
  },
  stickyCTA: {
    borderTopWidth: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    shadowOpacity: 0,
    elevation: 0,
  },
  bottomPayBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 9999,
    gap: 6,
  },
  bottomPayBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.base,
    color: colors.surface,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.base,
    color: colors.text,
  },
  modalInputLabel: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.caption,
    color: colors.text,
    marginTop: 8,
    marginBottom: 4,
  },
  modalInput: {
    fontFamily: typography.fontFamily.regular,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: typography.size.subhead,
    color: colors.text,
    backgroundColor: colors.surfaceMuted,
  },
});
